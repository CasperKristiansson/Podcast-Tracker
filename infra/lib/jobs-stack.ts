import * as cdk from "aws-cdk-lib";
import * as dynamodb from "aws-cdk-lib/aws-dynamodb";
import * as iam from "aws-cdk-lib/aws-iam";
import * as scheduler from "aws-cdk-lib/aws-scheduler";
import * as ssm from "aws-cdk-lib/aws-ssm";
import { Construct } from "constructs";
import {
  NodeLambda,
  grantParameterRead,
  grantTableReadWrite,
  resolveLambdaEntry,
} from "./constructs/node-lambda.js";

export interface JobsStackProps extends cdk.StackProps {
  readonly table: dynamodb.ITable;
}

export class JobsStack extends cdk.Stack {
  public readonly refreshLambda: NodeLambda;

  constructor(scope: Construct, id: string, props: JobsStackProps) {
    super(scope, id, props);

    const spotifyClientIdParameter =
      ssm.StringParameter.fromStringParameterName(
        this,
        "SpotifyClientIdParameter",
        "/podcast/prod/spotify/client_id"
      );

    const spotifyClientSecretParameter =
      ssm.StringParameter.fromStringParameterName(
        this,
        "SpotifyClientSecretParameter",
        "/podcast/prod/spotify/client_secret"
      );

    this.refreshLambda = new NodeLambda(this, "RefreshSubscribedShowsLambda", {
      entry: resolveLambdaEntry("refreshSubscribedShows", "src", "index.ts"),
      handler: "handler",
      timeout: cdk.Duration.minutes(5),
      memorySize: 768,
      environment: {
        TABLE_NAME: props.table.tableName,
        SPOTIFY_CLIENT_ID_PARAM: spotifyClientIdParameter.parameterName,
        SPOTIFY_CLIENT_SECRET_PARAM: spotifyClientSecretParameter.parameterName,
        SPOTIFY_MARKET: this.node.tryGetContext("spotifyMarket") ?? "US",
      },
    });

    grantTableReadWrite(this.refreshLambda, props.table);
    grantParameterRead(this.refreshLambda, [
      spotifyClientIdParameter,
      spotifyClientSecretParameter,
    ]);

    const scheduleRole = new iam.Role(this, "RefreshScheduleRole", {
      assumedBy: new iam.ServicePrincipal("scheduler.amazonaws.com"),
    });

    this.refreshLambda.grantInvoke(scheduleRole);

    new scheduler.CfnSchedule(this, "NightlyRefreshSchedule", {
      flexibleTimeWindow: { mode: "OFF" },
      scheduleExpression: "cron(0 3 * * ? *)",
      target: {
        arn: this.refreshLambda.functionArn,
        roleArn: scheduleRole.roleArn,
        input: JSON.stringify({ reason: "Nightly refresh" }),
      },
      scheduleExpressionTimezone: "UTC",
    });

    new cdk.CfnOutput(this, "RefreshLambdaName", {
      value: this.refreshLambda.functionName,
    });
  }
}
