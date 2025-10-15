import * as cdk from 'aws-cdk-lib';
import * as cognito from 'aws-cdk-lib/aws-cognito';
import { Construct } from 'constructs';

export class AuthStack extends cdk.Stack {
  public readonly userPool: cognito.UserPool;
  public readonly userPoolClient: cognito.UserPoolClient;
  public readonly domain: cognito.UserPoolDomain;

  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const domainPrefix = AuthStack.requireEnv('COGNITO_DOMAIN_PREFIX');
    const callbackUrls = AuthStack.requireCsvEnv('COGNITO_CALLBACK_URLS');
    const logoutUrls = AuthStack.requireCsvEnv('COGNITO_LOGOUT_URLS');
    const googleClientId = AuthStack.requireEnv('GOOGLE_CLIENT_ID');
    const googleClientSecret = AuthStack.requireEnv('GOOGLE_CLIENT_SECRET');

    this.userPool = new cognito.UserPool(this, 'UserPool', {
      userPoolName: 'podcast-tracker-user-pool',
      selfSignUpEnabled: false,
      signInAliases: { email: true },
      autoVerify: { email: true },
      accountRecovery: cognito.AccountRecovery.EMAIL_ONLY,
      standardAttributes: {
        email: { required: true, mutable: false }
      },
      removalPolicy: cdk.RemovalPolicy.RETAIN
    });

    new cognito.UserPoolIdentityProviderGoogle(this, 'GoogleIdentityProvider', {
      userPool: this.userPool,
      clientId: googleClientId,
      clientSecret: googleClientSecret,
      scopes: ['openid', 'email', 'profile'],
      attributeMapping: {
        email: cognito.ProviderAttribute.GOOGLE_EMAIL,
        givenName: cognito.ProviderAttribute.GOOGLE_GIVEN_NAME,
        familyName: cognito.ProviderAttribute.GOOGLE_FAMILY_NAME
      }
    });

    this.domain = this.userPool.addDomain('UserPoolDomain', {
      cognitoDomain: { domainPrefix }
    });

    this.userPoolClient = this.userPool.addClient('WebAppClient', {
      userPoolClientName: 'podcast-tracker-web',
      generateSecret: false,
      preventUserExistenceErrors: true,
      authFlows: {
        adminUserPassword: false,
        custom: false,
        userPassword: false,
        userSrp: true
      },
      oAuth: {
        callbackUrls,
        logoutUrls,
        flows: {
          authorizationCodeGrant: true
        },
        scopes: [
          cognito.OAuthScope.OPENID,
          cognito.OAuthScope.EMAIL,
          cognito.OAuthScope.PROFILE
        ]
      },
      supportedIdentityProviders: [
        cognito.UserPoolClientIdentityProvider.GOOGLE
      ]
    });

    new cdk.CfnOutput(this, 'UserPoolId', {
      value: this.userPool.userPoolId
    });

    new cdk.CfnOutput(this, 'UserPoolClientId', {
      value: this.userPoolClient.userPoolClientId
    });

    new cdk.CfnOutput(this, 'UserPoolDomain', {
      value: this.domain.baseUrl()
    });
  }

  private static requireEnv(name: string): string {
    const value = process.env[name];
    if (typeof value === 'string' && value.length > 0) {
      return value;
    }
    throw new Error(`Environment variable ${name} is required but was not provided.`);
  }

  private static requireCsvEnv(name: string): string[] {
    const raw = AuthStack.requireEnv(name);
    return raw
      .split(',')
      .map((entry) => entry.trim())
      .filter((entry) => entry.length > 0);
  }
}
