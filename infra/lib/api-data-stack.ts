import * as cdk from 'aws-cdk-lib';
import * as appsync from 'aws-cdk-lib/aws-appsync';
import * as cognito from 'aws-cdk-lib/aws-cognito';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import { Construct } from 'constructs';
import * as path from 'path';

export interface ApiDataStackProps extends cdk.StackProps {
  readonly userPool: cognito.IUserPool;
  readonly userPoolClient: cognito.IUserPoolClient;
}

export class ApiDataStack extends cdk.Stack {
  public readonly table: dynamodb.Table;
  public readonly api: appsync.GraphqlApi;

  constructor(scope: Construct, id: string, props: ApiDataStackProps) {
    super(scope, id, props);

    this.table = new dynamodb.Table(this, 'PodcastTrackerTable', {
      tableName: 'podcast-tracker',
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      partitionKey: { name: 'pk', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'sk', type: dynamodb.AttributeType.STRING },
      removalPolicy: cdk.RemovalPolicy.RETAIN,
      pointInTimeRecovery: true,
      encryption: dynamodb.TableEncryption.AWS_MANAGED,
      timeToLiveAttribute: 'expiresAt'
    });

    this.api = new appsync.GraphqlApi(this, 'PodcastTrackerApi', {
      name: 'PodcastTrackerApi',
      definition: appsync.Definition.fromFile(
        path.join(__dirname, '..', '..', '..', 'apps', 'api', 'schema', 'schema.graphql')
      ),
      authorizationConfig: {
        defaultAuthorization: {
          authorizationType: appsync.AuthorizationType.USER_POOL,
          userPoolConfig: {
            userPool: props.userPool,
            appIdClientRegex: props.userPoolClient.userPoolClientId
          }
        },
        additionalAuthorizationModes: [
          {
            authorizationType: appsync.AuthorizationType.IAM
          }
        ]
      },
      xrayEnabled: true
    });

    new cdk.CfnOutput(this, 'TableName', {
      value: this.table.tableName
    });

    new cdk.CfnOutput(this, 'TableArn', {
      value: this.table.tableArn
    });

    new cdk.CfnOutput(this, 'GraphQlApiId', {
      value: this.api.apiId
    });

    new cdk.CfnOutput(this, 'GraphQlApiUrl', {
      value: this.api.graphqlUrl
    });
  }
}
