import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';

export class PodcastTrackerStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // Infrastructure resources will be defined in subsequent tasks.
  }
}
