import * as cdk from 'aws-cdk-lib';
import {
  aws_certificatemanager,
  aws_cloudfront,
  aws_cloudfront_origins,
  aws_iam,
  aws_route53,
  aws_route53_patterns,
  aws_route53_targets,
  aws_s3, aws_s3_deployment,
} from 'aws-cdk-lib';
import { IDistribution } from 'aws-cdk-lib/aws-cloudfront';
import { IBucket } from 'aws-cdk-lib/aws-s3';
import { Construct } from 'constructs';

export interface SinglePageApplicationProperties {
  readonly application: SinglePageApplicationSiteProperties;
  readonly domain: SinglePageApplicationDNSProperties;
  readonly removalPolicy?: cdk.RemovalPolicy;
}

export interface SinglePageApplicationSiteProperties {
  readonly name: string;
  readonly version: string;
}

export interface SinglePageApplicationDNSProperties {
  readonly apex: string;
  readonly subdomain?: string;
  readonly redirectApex?: boolean;
}

export interface SinglePageApplicationOutputs {
  readonly domainName: string;
  readonly siteBucket: IBucket;
  readonly distribution: IDistribution;
}

export class SinglePageApplication extends Construct {
  public readonly output: SinglePageApplicationOutputs;
  public readonly props: SinglePageApplicationProperties;

  constructor(scope: Construct, id: string, props: SinglePageApplicationProperties) {
    super(scope, id);
    this.props = props;

    const hostedZone = aws_route53.HostedZone.fromLookup(this, 'hostedZone', {
      domainName: props.domain.apex,
    });

    const hasSubdomain = typeof props.domain.subdomain !== 'undefined';
    const hasApexRedirect = hasSubdomain && (props.domain.redirectApex ?? (props.domain.subdomain === 'www'));
    const domainName = hasSubdomain ? `${props.domain.subdomain}.${props.domain.apex}` : props.domain.apex;
    const subjectAlternativeNames = hasApexRedirect ? [props.domain.apex, domainName] : [domainName];

    const certificate = new aws_certificatemanager.Certificate(this, 'certificate', {
      domainName,
      subjectAlternativeNames,
      validation: aws_certificatemanager.CertificateValidation.fromDns(hostedZone),
    });

    const siteBucket = new aws_s3.Bucket(this, 'staticContent', {
      encryption: cdk.aws_s3.BucketEncryption.S3_MANAGED,
      removalPolicy: props.removalPolicy,
      autoDeleteObjects: true,
      blockPublicAccess: cdk.aws_s3.BlockPublicAccess.BLOCK_ALL,
    });

    const originAccessIdentity = new aws_cloudfront.OriginAccessIdentity(this, 'originAccessIdentity');
    siteBucket.addToResourcePolicy(new aws_iam.PolicyStatement({
      actions: ['s3:GetObject'],
      resources: [siteBucket.arnForObjects('*')],
      principals: [new aws_iam.CanonicalUserPrincipal(originAccessIdentity.cloudFrontOriginAccessIdentityS3CanonicalUserId)],
    }));

    const distribution = new aws_cloudfront.Distribution(this, 'distribution', {
      defaultBehavior: {
        origin: new aws_cloudfront_origins.S3Origin(siteBucket, {
          originAccessIdentity: originAccessIdentity,
        }),
        compress: true,
        allowedMethods: cdk.aws_cloudfront.AllowedMethods.ALLOW_GET_HEAD_OPTIONS,
        viewerProtocolPolicy: cdk.aws_cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
      },
      domainNames: [domainName],
      certificate: certificate,
      defaultRootObject: 'index.html',
    });

    const aRecord = new aws_route53.ARecord(this, 'aRecord', {
      zone: hostedZone,
      recordName: domainName,
      target: aws_route53.RecordTarget.fromAlias(new aws_route53_targets.CloudFrontTarget(distribution)),
    });
    const aaaaRecord = new aws_route53.AaaaRecord(this, 'aaaaRecord', {
      zone: hostedZone,
      recordName: domainName,
      target: cdk.aws_route53.RecordTarget.fromAlias(new aws_route53_targets.CloudFrontTarget(distribution)),
    });

    if (hasApexRedirect) {
      new aws_route53_patterns.HttpsRedirect(this, 'httpsRedirect', {
        recordNames: [props.domain.apex],
        targetDomain: domainName,
        zone: hostedZone,
        certificate,
      });
    }

    this.output = {
      domainName,
      siteBucket,
      distribution,
    };
  }

  deploy(artifactBucket: IBucket, environment?: any) {
    const sources = [aws_s3_deployment.Source.bucket(artifactBucket, `${this.props.application.name}-${this.props.application.version}.zip`)];
    if (typeof environment !== 'undefined') {
      sources.push(cdk.aws_s3_deployment.Source.jsonData('environment.json', environment));
    }
    new aws_s3_deployment.BucketDeployment(this, 'deployment', {
      destinationBucket: this.output.siteBucket,
      distribution: this.output.distribution,
      sources,
    });
  }
}