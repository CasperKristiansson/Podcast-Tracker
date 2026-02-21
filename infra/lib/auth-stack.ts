import * as cdk from "aws-cdk-lib";
import * as cognito from "aws-cdk-lib/aws-cognito";
import * as iam from "aws-cdk-lib/aws-iam";
import { Construct } from "constructs";
import { NodeLambda, resolveLambdaEntry } from "./constructs/node-lambda.js";

export class AuthStack extends cdk.Stack {
  public readonly userPool: cognito.UserPool;
  public readonly userPoolClient: cognito.UserPoolClient;
  public readonly domain: cognito.UserPoolDomain;

  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const domainPrefix = AuthStack.requireEnv("COGNITO_DOMAIN_PREFIX");
    const callbackUrls = AuthStack.withCliLoopbackDefaults(
      AuthStack.requireCsvEnv("COGNITO_CALLBACK_URLS"),
      "COGNITO_CLI_CALLBACK_URLS",
      ["http://127.0.0.1:54545/callback"]
    );
    const logoutUrls = AuthStack.withCliLoopbackDefaults(
      AuthStack.requireCsvEnv("COGNITO_LOGOUT_URLS"),
      "COGNITO_CLI_LOGOUT_URLS",
      ["http://127.0.0.1:54545/logout"]
    );
    const googleClientId = AuthStack.requireEnv("GOOGLE_CLIENT_ID");
    const googleClientSecret = AuthStack.requireEnv("GOOGLE_CLIENT_SECRET");

    this.userPool = new cognito.UserPool(this, "UserPool", {
      userPoolName: "podcast-tracker-user-pool",
      selfSignUpEnabled: false,
      signInAliases: { email: true },
      autoVerify: { email: true },
      accountRecovery: cognito.AccountRecovery.EMAIL_ONLY,
      standardAttributes: {
        email: { required: true, mutable: true },
      },
      customAttributes: {
        approved: new cognito.BooleanAttribute({ mutable: true }),
      },
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    const approvalLambda = new NodeLambda(this, "PreTokenApprovalLambda", {
      entry: resolveLambdaEntry("cognitoPreTokenApproval", "src", "index.ts"),
      handler: "handler",
      environment: {
        APPROVAL_ATTRIBUTE: "custom:approved",
      },
      timeout: cdk.Duration.seconds(5),
    });

    approvalLambda.addToRolePolicy(
      new iam.PolicyStatement({
        actions: ["cognito-idp:AdminUpdateUserAttributes"],
        resources: [
          cdk.Stack.of(this).formatArn({
            service: "cognito-idp",
            resource: "userpool",
            resourceName: "*",
          }),
        ],
      })
    );

    this.userPool.addTrigger(
      cognito.UserPoolOperation.PRE_TOKEN_GENERATION,
      approvalLambda
    );

    const googleIdentityProvider = new cognito.UserPoolIdentityProviderGoogle(
      this,
      "GoogleIdentityProvider",
      {
        userPool: this.userPool,
        clientId: googleClientId,
        clientSecretValue: cdk.SecretValue.unsafePlainText(googleClientSecret),
        scopes: ["openid", "email", "profile"],
        attributeMapping: {
          email: cognito.ProviderAttribute.GOOGLE_EMAIL,
          givenName: cognito.ProviderAttribute.GOOGLE_GIVEN_NAME,
          familyName: cognito.ProviderAttribute.GOOGLE_FAMILY_NAME,
        },
      }
    );

    this.domain = this.userPool.addDomain("UserPoolDomain", {
      cognitoDomain: { domainPrefix },
    });

    const clientReadAttributes = new cognito.ClientAttributes()
      .withStandardAttributes({
        email: true,
        givenName: true,
        familyName: true,
      })
      .withCustomAttributes("approved");

    const clientWriteAttributes =
      new cognito.ClientAttributes().withStandardAttributes({
        email: true,
        givenName: true,
        familyName: true,
      });

    this.userPoolClient = this.userPool.addClient("WebAppClient", {
      userPoolClientName: "podcast-tracker-web",
      generateSecret: false,
      preventUserExistenceErrors: true,
      authFlows: {
        adminUserPassword: false,
        custom: false,
        userPassword: false,
        userSrp: true,
      },
      oAuth: {
        callbackUrls,
        logoutUrls,
        flows: {
          authorizationCodeGrant: true,
        },
        scopes: [
          cognito.OAuthScope.OPENID,
          cognito.OAuthScope.EMAIL,
          cognito.OAuthScope.PROFILE,
        ],
      },
      supportedIdentityProviders: [
        cognito.UserPoolClientIdentityProvider.GOOGLE,
      ],
      readAttributes: clientReadAttributes,
      writeAttributes: clientWriteAttributes,
    });

    this.userPoolClient.node.addDependency(googleIdentityProvider);

    new cdk.CfnOutput(this, "UserPoolId", {
      value: this.userPool.userPoolId,
    });

    new cdk.CfnOutput(this, "UserPoolClientId", {
      value: this.userPoolClient.userPoolClientId,
    });

    new cdk.CfnOutput(this, "UserPoolDomain", {
      value: this.domain.baseUrl(),
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

  private static requireCsvEnv(name: string): string[] {
    const raw = AuthStack.requireEnv(name);
    return raw
      .split(",")
      .map((entry) => entry.trim())
      .filter((entry) => entry.length > 0);
  }

  private static optionalCsvEnv(name: string): string[] {
    const raw = process.env[name];
    if (!raw) {
      return [];
    }
    return raw
      .split(",")
      .map((entry) => entry.trim())
      .filter((entry) => entry.length > 0);
  }

  private static withCliLoopbackDefaults(
    values: string[],
    envName: string,
    defaults: string[]
  ): string[] {
    const set = new Set<string>(values);
    for (const value of defaults) {
      set.add(value);
    }
    for (const value of AuthStack.optionalCsvEnv(envName)) {
      set.add(value);
    }
    return Array.from(set);
  }
}
