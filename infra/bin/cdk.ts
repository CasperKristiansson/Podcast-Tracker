#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { PodcastTrackerStack } from '../lib/podcast-tracker-stack';

const app = new cdk.App();

const defaultRegion = 'eu-north-1';
const env: cdk.Environment = {
  account: process.env.CDK_DEFAULT_ACCOUNT ?? process.env.AWS_ACCOUNT_ID,
  region: process.env.CDK_DEFAULT_REGION ?? defaultRegion
};

new PodcastTrackerStack(app, 'PodcastTrackerStack', {
  env
});
