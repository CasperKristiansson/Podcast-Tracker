#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { CertificateStack } from '../lib/cert-stack.js';
import { PodcastTrackerStack } from '../lib/podcast-tracker-stack.js';

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

new PodcastTrackerStack(app, 'PodcastTrackerStack', {
  env: { account, region: primaryRegion },
  certificateArn: certificateStack.certificateArn
});
