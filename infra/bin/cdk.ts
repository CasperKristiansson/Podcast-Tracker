#!/usr/bin/env node
import 'source-map-support/register';
import 'dotenv/config';
import * as cdk from 'aws-cdk-lib';
import { CertificateStack } from '../lib/cert-stack.js';
import { ApiDataStack } from '../lib/api-data-stack.js';
import { AuthStack } from '../lib/auth-stack.js';
import { EdgeStack } from '../lib/edge-stack.js';
import { ConfigStack } from '../lib/config-stack.js';

const app = new cdk.App();

const account = process.env.AWS_ACCOUNT_ID;
if (!account) {
  throw new Error('AWS account not resolved. Ensure AWS_ACCOUNT_ID is set.');
}

const primaryRegion = 'eu-north-1';
const certificateRegion = 'us-east-1';

const certificateStack = new CertificateStack(app, 'PodcastTrackerCertificateStack', {
  env: { account, region: certificateRegion }
});

new ConfigStack(app, 'PodcastTrackerConfigStack', {
  env: { account, region: primaryRegion }
});

const authStack = new AuthStack(app, 'PodcastTrackerAuthStack', {
  env: { account, region: primaryRegion }
});

new ApiDataStack(app, 'PodcastTrackerApiDataStack', {
  env: { account, region: primaryRegion },
  userPool: authStack.userPool,
  userPoolClient: authStack.userPoolClient
});

new EdgeStack(app, 'PodcastTrackerEdgeStack', {
  env: { account, region: primaryRegion },
  certificateArn: certificateStack.certificateArn,
  siteDomain: 'podcast.casperkristiansson.com',
  hostedZoneDomain: 'casperkristiansson.com'
});
