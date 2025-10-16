import * as cdk from "aws-cdk-lib";
import * as ssm from "aws-cdk-lib/aws-ssm";
import * as cr from "aws-cdk-lib/custom-resources";
import { Construct } from "constructs";

export class ConfigStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const basePath = "/podcast/prod";

    const spotifyClientId = ConfigStack.requireEnv("SPOTIFY_CLIENT_ID");
    const spotifyClientSecret = ConfigStack.requireEnv("SPOTIFY_CLIENT_SECRET");
    const spotifyRedirectUri = ConfigStack.requireEnv("SPOTIFY_REDIRECT_URI");

    const clientIdParam = new ssm.StringParameter(
      this,
      "SpotifyClientIdParameter",
      {
        parameterName: `${basePath}/spotify/client_id`,
        stringValue: spotifyClientId,
        dataType: ssm.ParameterDataType.TEXT,
        tier: ssm.ParameterTier.STANDARD,
        simpleName: false,
      }
    );

    const clientSecretParamName = `${basePath}/spotify/client_secret`;
    new cr.AwsCustomResource(this, "SpotifyClientSecretParameter", {
      installLatestAwsSdk: false,
      onCreate: {
        service: "SSM",
        action: "putParameter",
        parameters: {
          Name: clientSecretParamName,
          Value: spotifyClientSecret,
          Type: "SecureString",
          Overwrite: true,
          Tier: "Standard",
        },
        physicalResourceId: cr.PhysicalResourceId.of(clientSecretParamName),
      },
      onUpdate: {
        service: "SSM",
        action: "putParameter",
        parameters: {
          Name: clientSecretParamName,
          Value: spotifyClientSecret,
          Type: "SecureString",
          Overwrite: true,
          Tier: "Standard",
        },
        physicalResourceId: cr.PhysicalResourceId.of(clientSecretParamName),
      },
      onDelete: {
        service: "SSM",
        action: "deleteParameter",
        parameters: {
          Name: clientSecretParamName,
        },
      },
      policy: cr.AwsCustomResourcePolicy.fromSdkCalls({
        resources: cr.AwsCustomResourcePolicy.ANY_RESOURCE,
      }),
    });

    const redirectUriParam = new ssm.StringParameter(
      this,
      "SpotifyRedirectUriParameter",
      {
        parameterName: `${basePath}/spotify/redirect_uri`,
        stringValue: spotifyRedirectUri,
        dataType: ssm.ParameterDataType.TEXT,
        tier: ssm.ParameterTier.STANDARD,
        simpleName: false,
      }
    );

    new cdk.CfnOutput(this, "SpotifyClientIdParameterName", {
      value: clientIdParam.parameterName,
    });

    new cdk.CfnOutput(this, "SpotifyClientSecretParameterName", {
      value: clientSecretParamName,
    });

    new cdk.CfnOutput(this, "SpotifyRedirectUriParameterName", {
      value: redirectUriParam.parameterName,
    });
  }

  private static requireEnv(name: string): string {
    const value = process.env[name];
    if (typeof value === "string" && value.length > 0) {
      return value;
    }

    throw new Error(
      `Environment variable ${name} is required but was not provided.`
    );
  }
}
