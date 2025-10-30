import * as cdk from "aws-cdk-lib";
import * as cloudfront from "aws-cdk-lib/aws-cloudfront";
import * as iam from "aws-cdk-lib/aws-iam";
import * as route53 from "aws-cdk-lib/aws-route53";
import * as route53Targets from "aws-cdk-lib/aws-route53-targets";
import * as s3 from "aws-cdk-lib/aws-s3";
import { Construct } from "constructs";

export interface EdgeStackProps extends cdk.StackProps {
  /**
   * ACM certificate ARN to attach to the CloudFront distribution.
   * Must be issued in us-east-1.
   */
  readonly certificateArn: string;

  /**
   * Fully-qualified domain name the distribution should respond to.
   */
  readonly siteDomain: string;

  /**
   * Hosted zone domain that owns the siteDomain.
   */
  readonly hostedZoneDomain: string;
}

export class EdgeStack extends cdk.Stack {
  public readonly siteBucket: s3.Bucket;
  public readonly distribution: cloudfront.CfnDistribution;

  constructor(scope: Construct, id: string, props: EdgeStackProps) {
    super(scope, id, props);

    if (!props.certificateArn) {
      throw new Error(
        "certificateArn is required to configure the CloudFront distribution."
      );
    }

    if (!props.siteDomain) {
      throw new Error(
        "siteDomain is required so the distribution can be addressed via a custom domain."
      );
    }

    if (!props.hostedZoneDomain) {
      throw new Error(
        "hostedZoneDomain is required to create Route 53 alias records."
      );
    }

    this.siteBucket = new s3.Bucket(this, "SiteBucket", {
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      enforceSSL: true,
      versioned: false,
      encryption: s3.BucketEncryption.S3_MANAGED,
      removalPolicy: cdk.RemovalPolicy.RETAIN,
      autoDeleteObjects: false,
    });

    const directoryIndexFunction = new cloudfront.Function(
      this,
      "DirectoryIndexFunction",
      {
        functionName: `${this.stackName}-directory-index`,
        code: cloudfront.FunctionCode.fromInline(
          [
            "function handler(event) {",
            "  var request = event.request;",
            "  var uri = request.uri;",
            "",
            "  if (uri.endsWith('/')) {",
            "    request.uri = uri + 'index.html';",
            "  } else if (!uri.includes('.')) {",
            "    request.uri = uri + '/index.html';",
            "  }",
            "",
            "  return request;",
            "}",
          ].join("\n")
        ),
      }
    );

    const originAccessControl = new cloudfront.CfnOriginAccessControl(
      this,
      "SiteBucketOAC",
      {
        originAccessControlConfig: {
          name: `${this.stackName}-oac`,
          originAccessControlOriginType: "s3",
          signingBehavior: "always",
          signingProtocol: "sigv4",
        },
      }
    );

    const originId = "SiteBucketOrigin";

    const contentSecurityPolicy =
      "default-src 'self'; connect-src 'self' https:; img-src 'self' data: https:; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' data: https://fonts.gstatic.com; frame-ancestors 'self'; base-uri 'self'; form-action 'self'; upgrade-insecure-requests";

    const securityHeadersPolicy = new cloudfront.ResponseHeadersPolicy(
      this,
      "SecurityHeadersPolicy",
      {
        comment: "Podcast Tracker security headers",
        securityHeadersBehavior: {
          contentSecurityPolicy: {
            contentSecurityPolicy,
            override: true,
          },
          strictTransportSecurity: {
            accessControlMaxAge: cdk.Duration.days(365 * 2),
            includeSubdomains: true,
            preload: true,
            override: true,
          },
          contentTypeOptions: { override: true },
          frameOptions: {
            frameOption: cloudfront.HeadersFrameOption.DENY,
            override: true,
          },
          referrerPolicy: {
            referrerPolicy: cloudfront.HeadersReferrerPolicy.NO_REFERRER,
            override: true,
          },
          xssProtection: {
            protection: true,
            modeBlock: true,
            override: true,
          },
        },
        customHeadersBehavior: {
          customHeaders: [
            {
              header: "Permissions-Policy",
              value: "geolocation=(), microphone=(), camera=()",
              override: true,
            },
          ],
        },
      }
    );

    this.distribution = new cloudfront.CfnDistribution(
      this,
      "SiteDistribution",
      {
        distributionConfig: {
          enabled: true,
          comment: "Podcast Tracker static assets distribution",
          aliases: [props.siteDomain],
          defaultRootObject: "index.html",
          origins: [
            {
              id: originId,
              domainName: this.siteBucket.bucketRegionalDomainName,
              s3OriginConfig: {
                originAccessIdentity: "",
              },
              originAccessControlId: originAccessControl.attrId,
            },
          ],
          defaultCacheBehavior: {
            allowedMethods: ["GET", "HEAD", "OPTIONS"],
            cachedMethods: ["GET", "HEAD"],
            compress: true,
            targetOriginId: originId,
            functionAssociations: [
              {
                eventType: "viewer-request",
                functionArn: directoryIndexFunction.functionArn,
              },
            ],
            responseHeadersPolicyId:
              securityHeadersPolicy.responseHeadersPolicyId,
            viewerProtocolPolicy: "redirect-to-https",
            cachePolicyId:
              cloudfront.CachePolicy.CACHING_OPTIMIZED.cachePolicyId,
            originRequestPolicyId:
              cloudfront.OriginRequestPolicy.CORS_S3_ORIGIN
                .originRequestPolicyId,
          },
          customErrorResponses: [
            {
              errorCode: 403,
              responseCode: 200,
              responsePagePath: "/index.html",
            },
            {
              errorCode: 404,
              responseCode: 200,
              responsePagePath: "/index.html",
            },
          ],
          priceClass: "PriceClass_100",
          viewerCertificate: {
            acmCertificateArn: props.certificateArn,
            sslSupportMethod: "sni-only",
            minimumProtocolVersion: "TLSv1.2_2021",
          },
          httpVersion: "http2and3",
        },
      }
    );

    const distributionRef = cloudfront.Distribution.fromDistributionAttributes(
      this,
      "DistributionRef",
      {
        distributionId: this.distribution.attrId,
        domainName: this.distribution.attrDomainName,
      }
    );

    const hostedZone = route53.HostedZone.fromLookup(this, "HostedZone", {
      domainName: props.hostedZoneDomain,
    });

    const aliasTarget = route53.RecordTarget.fromAlias(
      new route53Targets.CloudFrontTarget(distributionRef)
    );

    new route53.ARecord(this, "SiteAliasRecord", {
      zone: hostedZone,
      recordName: props.siteDomain,
      target: aliasTarget,
    });

    new route53.AaaaRecord(this, "SiteAliasRecordAAAA", {
      zone: hostedZone,
      recordName: props.siteDomain,
      target: aliasTarget,
    });

    this.siteBucket.addToResourcePolicy(
      new iam.PolicyStatement({
        sid: "AllowCloudFrontServicePrincipal",
        actions: ["s3:GetObject"],
        resources: [this.siteBucket.arnForObjects("*")],
        principals: [new iam.ServicePrincipal("cloudfront.amazonaws.com")],
        conditions: {
          StringEquals: {
            "AWS:SourceArn": cdk.Stack.of(this).formatArn({
              service: "cloudfront",
              region: "",
              resource: "distribution",
              resourceName: this.distribution.attrId,
            }),
          },
        },
      })
    );

    new cdk.CfnOutput(this, "SiteBucketName", {
      value: this.siteBucket.bucketName,
    });

    new cdk.CfnOutput(this, "CloudFrontDistributionId", {
      value: this.distribution.attrId,
    });

    new cdk.CfnOutput(this, "CloudFrontDomainName", {
      value: this.distribution.attrDomainName,
    });
  }
}
