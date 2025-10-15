import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as nodejs from 'aws-cdk-lib/aws-lambda-nodejs';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as ssm from 'aws-cdk-lib/aws-ssm';
import * as path from 'path';
import { Construct } from 'constructs';

export type NodeLambdaProps = Omit<nodejs.NodejsFunctionProps, 'runtime'>;

export class NodeLambda extends nodejs.NodejsFunction {
  constructor(scope: Construct, id: string, props: NodeLambdaProps) {
    const { bundling, environment, depsLockFilePath, ...rest } = props;

    super(scope, id, {
      runtime: lambda.Runtime.NODEJS_22_X,
      bundling: {
        externalModules: ['aws-sdk'],
        format: nodejs.OutputFormat.ESM,
        minify: true,
        sourceMap: true,
        sourcesContent: false,
        target: 'es2022',
        ...bundling
      },
      environment: {
        NODE_OPTIONS: '--enable-source-maps',
        ...environment
      },
      depsLockFilePath:
        depsLockFilePath ?? path.join(__dirname, '..', '..', '..', 'package-lock.json'),
      ...rest
    });
  }
}

export function grantTableReadWrite(fn: lambda.IFunction, table: dynamodb.ITable): void {
  table.grantReadWriteData(fn);
}

export function grantParameterRead(fn: lambda.IFunction, parameters: ssm.IParameter[]): void {
  for (const parameter of parameters) {
    parameter.grantRead(fn);
  }
}

export function resolveLambdaEntry(...segments: string[]): string {
  const resolvedPath: string = path.join(
    __dirname,
    '..',
    '..',
    '..',
    'packages',
    'lambdas',
    ...segments
  );
  return resolvedPath;
}
