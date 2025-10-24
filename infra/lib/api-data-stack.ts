import * as cdk from "aws-cdk-lib";
import * as appsync from "aws-cdk-lib/aws-appsync";
import * as cognito from "aws-cdk-lib/aws-cognito";
import * as dynamodb from "aws-cdk-lib/aws-dynamodb";
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as ssm from "aws-cdk-lib/aws-ssm";
import * as events from "aws-cdk-lib/aws-events";
import * as targets from "aws-cdk-lib/aws-events-targets";
import { Construct } from "constructs";
import * as path from "node:path";
import { fileURLToPath } from "node:url";
import {
  NodeLambda,
  grantParameterRead,
  grantTableReadWrite,
  resolveLambdaEntry,
} from "./constructs/node-lambda.js";

export interface ApiDataStackProps extends cdk.StackProps {
  readonly userPool: cognito.IUserPool;
  readonly userPoolClient: cognito.IUserPoolClient;
}

export class ApiDataStack extends cdk.Stack {
  public readonly table: dynamodb.Table;
  public readonly api: appsync.GraphqlApi;
  public readonly spotifyProxyLambda: lambda.IFunction;
  public readonly refreshSubscriptionsLambda: lambda.IFunction;
  public readonly profileLambda: lambda.IFunction;

  constructor(scope: Construct, id: string, props: ApiDataStackProps) {
    super(scope, id, props);

    this.table = new dynamodb.Table(this, "PodcastTrackerTable", {
      tableName: "podcast-tracker",
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      partitionKey: { name: "pk", type: dynamodb.AttributeType.STRING },
      sortKey: { name: "sk", type: dynamodb.AttributeType.STRING },
      removalPolicy: cdk.RemovalPolicy.RETAIN,
      pointInTimeRecoverySpecification: {
        pointInTimeRecoveryEnabled: true,
      },
      encryption: dynamodb.TableEncryption.AWS_MANAGED,
      timeToLiveAttribute: "expiresAt",
    });

    const currentDir = path.dirname(fileURLToPath(import.meta.url));
    const schemaDir = path.join(
      currentDir,
      "..",
      "..",
      "..",
      "apps",
      "api",
      "schema"
    );
    const resolverDir = path.join(
      currentDir,
      "..",
      "..",
      "..",
      "apps",
      "api",
      "resolvers"
    );

    this.api = new appsync.GraphqlApi(this, "PodcastTrackerApi", {
      name: "PodcastTrackerApi",
      definition: appsync.Definition.fromFile(
        path.join(schemaDir, "schema.graphql")
      ),
      authorizationConfig: {
        defaultAuthorization: {
          authorizationType: appsync.AuthorizationType.USER_POOL,
          userPoolConfig: {
            userPool: props.userPool,
            appIdClientRegex: props.userPoolClient.userPoolClientId,
          },
        },
        additionalAuthorizationModes: [
          {
            authorizationType: appsync.AuthorizationType.IAM,
          },
        ],
      },
      xrayEnabled: true,
    });

    const tableDataSource = this.api.addDynamoDbDataSource(
      "TableDataSource",
      this.table
    );
    const noneDataSource = this.api.addNoneDataSource("NoneDataSource");

    const spotifyClientIdParameter =
      ssm.StringParameter.fromStringParameterName(
        this,
        "SpotifyClientIdParameter",
        "/podcast/prod/spotify/client_id"
      );

    const spotifyClientSecretParameter =
      ssm.StringParameter.fromSecureStringParameterAttributes(
        this,
        "SpotifyClientSecretParameter",
        {
          parameterName: "/podcast/prod/spotify/client_secret",
        }
      );

    const spotifyEnv = {
      TABLE_NAME: this.table.tableName,
      SPOTIFY_CLIENT_ID_PARAM: spotifyClientIdParameter.parameterName,
      SPOTIFY_CLIENT_SECRET_PARAM: spotifyClientSecretParameter.parameterName,
      SPOTIFY_MARKET: this.node.tryGetContext("spotifyMarket") ?? "US",
    };

    this.spotifyProxyLambda = new NodeLambda(this, "SpotifyProxyLambda", {
      entry: resolveLambdaEntry("spotifyProxy", "src", "index.ts"),
      handler: "handler",
      environment: { ...spotifyEnv },
      timeout: cdk.Duration.seconds(10),
    });

    grantTableReadWrite(this.spotifyProxyLambda, this.table);
    grantParameterRead(this.spotifyProxyLambda, [
      spotifyClientIdParameter,
      spotifyClientSecretParameter,
    ]);

    this.refreshSubscriptionsLambda = new NodeLambda(
      this,
      "RefreshSubscriptionsLambda",
      {
        entry: resolveLambdaEntry("refreshSubscriptions", "src", "index.ts"),
        handler: "handler",
        environment: { ...spotifyEnv },
        timeout: cdk.Duration.minutes(5),
      }
    );

    grantTableReadWrite(this.refreshSubscriptionsLambda, this.table);
    grantParameterRead(this.refreshSubscriptionsLambda, [
      spotifyClientIdParameter,
      spotifyClientSecretParameter,
    ]);

    this.profileLambda = new NodeLambda(this, "ProfileLambda", {
      entry: resolveLambdaEntry("profile", "src", "index.ts"),
      handler: "handler",
      environment: {
        TABLE_NAME: this.table.tableName,
      },
      timeout: cdk.Duration.seconds(5),
    });

    this.table.grantReadData(this.profileLambda);

    new events.Rule(this, "RefreshSubscriptionsSchedule", {
      schedule: events.Schedule.cron({ minute: "0", hour: "3" }),
      description:
        "Refreshes Spotify show metadata and total episodes for user subscriptions daily",
      targets: [new targets.LambdaFunction(this.refreshSubscriptionsLambda)],
    });

    const spotifyLambdaDataSource = this.api.addLambdaDataSource(
      "SpotifyProxyDataSource",
      this.spotifyProxyLambda
    );

    noneDataSource.createResolver("HealthResolver", {
      typeName: "Query",
      fieldName: "health",
      requestMappingTemplate: appsync.MappingTemplate.fromFile(
        path.join(resolverDir, "Query.health.request.vtl")
      ),
      responseMappingTemplate: appsync.MappingTemplate.fromFile(
        path.join(resolverDir, "Query.health.response.vtl")
      ),
    });

    spotifyLambdaDataSource.createResolver("SearchResolver", {
      typeName: "Query",
      fieldName: "search",
      requestMappingTemplate: appsync.MappingTemplate.lambdaRequest(),
      responseMappingTemplate: appsync.MappingTemplate.lambdaResult(),
    });

    spotifyLambdaDataSource.createResolver("ShowResolver", {
      typeName: "Query",
      fieldName: "show",
      requestMappingTemplate: appsync.MappingTemplate.lambdaRequest(),
      responseMappingTemplate: appsync.MappingTemplate.lambdaResult(),
    });

    tableDataSource.createResolver("MySubscriptionsResolver", {
      typeName: "Query",
      fieldName: "mySubscriptions",
      requestMappingTemplate: appsync.MappingTemplate.fromFile(
        path.join(resolverDir, "Query.mySubscriptions.request.vtl")
      ),
      responseMappingTemplate: appsync.MappingTemplate.fromFile(
        path.join(resolverDir, "Query.mySubscriptions.response.vtl")
      ),
    });

    tableDataSource.createResolver("MySubscriptionResolver", {
      typeName: "Query",
      fieldName: "mySubscription",
      requestMappingTemplate: appsync.MappingTemplate.fromFile(
        path.join(resolverDir, "Query.mySubscription.request.vtl")
      ),
      responseMappingTemplate: appsync.MappingTemplate.fromFile(
        path.join(resolverDir, "Query.mySubscription.response.vtl")
      ),
    });

    spotifyLambdaDataSource.createResolver("EpisodesResolver", {
      typeName: "Query",
      fieldName: "episodes",
      requestMappingTemplate: appsync.MappingTemplate.lambdaRequest(),
      responseMappingTemplate: appsync.MappingTemplate.lambdaResult(),
    });

    spotifyLambdaDataSource.createResolver("EpisodeResolver", {
      typeName: "Query",
      fieldName: "episode",
      requestMappingTemplate: appsync.MappingTemplate.lambdaRequest(),
      responseMappingTemplate: appsync.MappingTemplate.lambdaResult(),
    });

    const profileDataSource = this.api.addLambdaDataSource(
      "ProfileDataSource",
      this.profileLambda
    );

    profileDataSource.createResolver("MyProfileResolver", {
      typeName: "Query",
      fieldName: "myProfile",
      requestMappingTemplate: appsync.MappingTemplate.lambdaRequest(),
      responseMappingTemplate: appsync.MappingTemplate.lambdaResult(),
    });

    tableDataSource.createResolver("EpisodeProgressResolver", {
      typeName: "Query",
      fieldName: "episodeProgress",
      requestMappingTemplate: appsync.MappingTemplate.fromFile(
        path.join(resolverDir, "Query.episodeProgress.request.vtl")
      ),
      responseMappingTemplate: appsync.MappingTemplate.fromFile(
        path.join(resolverDir, "Query.episodeProgress.response.vtl")
      ),
    });

    tableDataSource.createResolver("SubscribeResolver", {
      typeName: "Mutation",
      fieldName: "subscribe",
      requestMappingTemplate: appsync.MappingTemplate.fromFile(
        path.join(resolverDir, "Mutation.subscribe.request.vtl")
      ),
      responseMappingTemplate: appsync.MappingTemplate.fromFile(
        path.join(resolverDir, "Mutation.subscribe.response.vtl")
      ),
    });

    tableDataSource.createResolver("UnsubscribeResolver", {
      typeName: "Mutation",
      fieldName: "unsubscribe",
      requestMappingTemplate: appsync.MappingTemplate.fromFile(
        path.join(resolverDir, "Mutation.unsubscribe.request.vtl")
      ),
      responseMappingTemplate: appsync.MappingTemplate.fromFile(
        path.join(resolverDir, "Mutation.unsubscribe.response.vtl")
      ),
    });

    tableDataSource.createResolver("RateShowResolver", {
      typeName: "Mutation",
      fieldName: "rateShow",
      requestMappingTemplate: appsync.MappingTemplate.fromFile(
        path.join(resolverDir, "Mutation.rateShow.request.vtl")
      ),
      responseMappingTemplate: appsync.MappingTemplate.fromFile(
        path.join(resolverDir, "Mutation.rateShow.response.vtl")
      ),
    });

    tableDataSource.createResolver("MarkProgressResolver", {
      typeName: "Mutation",
      fieldName: "markProgress",
      requestMappingTemplate: appsync.MappingTemplate.fromFile(
        path.join(resolverDir, "Mutation.markProgress.request.vtl")
      ),
      responseMappingTemplate: appsync.MappingTemplate.fromFile(
        path.join(resolverDir, "Mutation.markProgress.response.vtl")
      ),
    });

    noneDataSource.createResolver("PublishProgressResolver", {
      typeName: "Mutation",
      fieldName: "publishProgress",
      requestMappingTemplate: appsync.MappingTemplate.fromFile(
        path.join(resolverDir, "Mutation.publishProgress.request.vtl")
      ),
      responseMappingTemplate: appsync.MappingTemplate.fromFile(
        path.join(resolverDir, "Mutation.publishProgress.response.vtl")
      ),
    });

    noneDataSource.createResolver("OnProgressResolver", {
      typeName: "Subscription",
      fieldName: "onProgress",
      requestMappingTemplate: appsync.MappingTemplate.fromFile(
        path.join(resolverDir, "Subscription.onProgress.request.vtl")
      ),
      responseMappingTemplate: appsync.MappingTemplate.fromFile(
        path.join(resolverDir, "Subscription.onProgress.response.vtl")
      ),
    });

    const legacyTableNameExport = new cdk.CfnOutput(
      this,
      "LegacyTableNameExport",
      {
        value: this.table.tableName,
        exportName:
          "PodcastTrackerApiDataStack:ExportsOutputRefPodcastTrackerTable03301A6B02AF9905",
      }
    );
    legacyTableNameExport.overrideLogicalId(
      "ExportsOutputRefPodcastTrackerTable03301A6B02AF9905"
    );

    const legacyTableArnExport = new cdk.CfnOutput(
      this,
      "LegacyTableArnExport",
      {
        value: this.table.tableArn,
        exportName:
          "PodcastTrackerApiDataStack:ExportsOutputFnGetAttPodcastTrackerTable03301A6BArnF51E623B",
      }
    );
    legacyTableArnExport.overrideLogicalId(
      "ExportsOutputFnGetAttPodcastTrackerTable03301A6BArnF51E623B"
    );

    new cdk.CfnOutput(this, "TableName", {
      value: this.table.tableName,
    });

    new cdk.CfnOutput(this, "TableArn", {
      value: this.table.tableArn,
    });

    new cdk.CfnOutput(this, "GraphQlApiId", {
      value: this.api.apiId,
    });

    new cdk.CfnOutput(this, "GraphQlApiUrl", {
      value: this.api.graphqlUrl,
    });
  }
}
