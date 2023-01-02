const { awscdk } = require('projen');
const { NpmAccess } = require('projen/lib/javascript');

const project = new awscdk.AwsCdkConstructLibrary({
  author: 'Jesse Grabowski',
  authorAddress: 'npm@jessegrabowski.com',
  cdkVersion: '2.1.0',
  defaultReleaseBranch: 'main',
  name: '@npm-jessegrabowski/aws-cdk-pattern-spa',
  repositoryUrl: 'git@github.com:jesse-grabowski-devops/aws-cdk-pattern-spa.git',
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