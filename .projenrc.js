const { awscdk } = require('projen');
const { NpmAccess } = require('projen/lib/javascript');

const cdkVersion = '2.58.1';

const project = new awscdk.AwsCdkConstructLibrary({
  author: 'Jesse Grabowski',
  authorAddress: 'npm@jessegrabowski.com',
  cdkVersion,
  defaultReleaseBranch: 'main',
  name: '@npm-jessegrabowski/aws-cdk-pattern-spa',
  repositoryUrl: 'git@github.com:jesse-grabowski-devops/aws-cdk-pattern-spa.git',
  description: 'A CDK construct for deploying a single page application (SPA) to AWS.',
  npmAccess: NpmAccess.PUBLIC,
  gitignore: [
    '.idea',
  ],
  // deps: [],                /* Runtime dependencies of this module. */
  // description: undefined,  /* The description is just a string that helps people understand the purpose of the package. */
  // devDeps: [],             /* Build dependencies for this module. */
  // packageName: undefined,  /* The "name" in package.json. */
});
project.synth();