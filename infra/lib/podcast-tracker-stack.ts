import * as cdk from 'aws-cdk-lib';
import * as cloudfront from 'aws-cdk-lib/aws-cloudfront';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as s3 from 'aws-cdk-lib/aws-s3';
import { Construct } from 'constructs';

export interface PodcastTrackerStackProps extends cdk.StackProps {
  readonly certificateArn?: string;
}

export class PodcastTrackerStack extends cdk.Stack {
  public readonly siteBucket: s3.Bucket;
  public readonly distribution: cloudfront.CfnDistribution;

  constructor(scope: Construct, id: string, props: PodcastTrackerStackProps = {}) {
    super(scope, id, props);

    if (!props.certificateArn) {
      throw new Error('certificateArn is required to configure the CloudFront distribution.');
    }

    const siteDomain = 'podcast.casperkristiansson.com';

    this.siteBucket = new s3.Bucket(this, 'SiteBucket', {
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      enforceSSL: true,
      versioned: false,
      encryption: s3.BucketEncryption.S3_MANAGED,
      removalPolicy: cdk.RemovalPolicy.RETAIN,
      autoDeleteObjects: false
    });

    const originAccessControl = new cloudfront.CfnOriginAccessControl(this, 'SiteBucketOAC', {
      originAccessControlConfig: {
        name: `${this.stackName}-oac`,
        originAccessControlOriginType: 's3',
        signingBehavior: 'always',
        signingProtocol: 'sigv4'
      }
    });

    const originId = 'SiteBucketOrigin';

    this.distribution = new cloudfront.CfnDistribution(this, 'SiteDistribution', {
      distributionConfig: {
        enabled: true,
        comment: 'Podcast Tracker static assets distribution',
        aliases: [siteDomain],
        defaultRootObject: 'index.html',
        origins: [
          {
            id: originId,
            domainName: this.siteBucket.bucketRegionalDomainName,
            s3OriginConfig: {
              originAccessIdentity: ''
            },
            originAccessControlId: originAccessControl.attrId
          }
        ],
        defaultCacheBehavior: {
          allowedMethods: ['GET', 'HEAD', 'OPTIONS'],
          cachedMethods: ['GET', 'HEAD'],
          compress: true,
          targetOriginId: originId,
          viewerProtocolPolicy: 'redirect-to-https',
          cachePolicyId: cloudfront.CachePolicy.CACHING_OPTIMIZED.cachePolicyId,
          originRequestPolicyId: cloudfront.OriginRequestPolicy.CORS_S3_ORIGIN.originRequestPolicyId
        },
        customErrorResponses: [
          {
            errorCode: 403,
            responseCode: 200,
            responsePagePath: '/index.html'
          },
          {
            errorCode: 404,
            responseCode: 200,
            responsePagePath: '/index.html'
          }
        ],
        priceClass: 'PriceClass_100',
        viewerCertificate: {
          acmCertificateArn: props.certificateArn,
          sslSupportMethod: 'sni-only',
          minimumProtocolVersion: 'TLSv1.2_2021'
        },
        httpVersion: 'http2and3'
      }
    });

    this.siteBucket.addToResourcePolicy(
      new iam.PolicyStatement({
        sid: 'AllowCloudFrontServicePrincipal',
        actions: ['s3:GetObject'],
        resources: [this.siteBucket.arnForObjects('*')],
        principals: [new iam.ServicePrincipal('cloudfront.amazonaws.com')],
        conditions: {
          StringEquals: {
            'AWS:SourceArn': cdk.Stack.of(this).formatArn({
              service: 'cloudfront',
              region: '',
              resource: 'distribution',
              resourceName: this.distribution.attrId
            })
          }
        }
      })
    );

    new cdk.CfnOutput(this, 'SiteBucketName', {
      value: this.siteBucket.bucketName
    });

    new cdk.CfnOutput(this, 'CloudFrontDistributionId', {
      value: this.distribution.attrId
    });

    new cdk.CfnOutput(this, 'CloudFrontDomainName', {
      value: this.distribution.attrDomainName
    });
  }
}
