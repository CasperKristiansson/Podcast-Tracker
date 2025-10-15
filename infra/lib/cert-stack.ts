import * as cdk from 'aws-cdk-lib';
import * as acm from 'aws-cdk-lib/aws-certificatemanager';
import * as route53 from 'aws-cdk-lib/aws-route53';
import { Construct } from 'constructs';

export class CertificateStack extends cdk.Stack {
  public readonly certificateArn: string;

  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const rootDomain = 'casperkristiansson.com';
    const domainName = `podcast.${rootDomain}`;

    const hostedZone = route53.HostedZone.fromLookup(this, 'HostedZone', {
      domainName: rootDomain
    });

    const certificate = new acm.Certificate(this, 'CloudFrontCertificate', {
      domainName,
      validation: acm.CertificateValidation.fromDns(hostedZone)
    });

    this.certificateArn = certificate.certificateArn;

    new cdk.CfnOutput(this, 'CertificateArn', {
      value: this.certificateArn,
      exportName: 'PodcastTrackerCertificateArn'
    });
  }
}
