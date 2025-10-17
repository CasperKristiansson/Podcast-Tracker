import { GetParameterCommand, SSMClient } from "@aws-sdk/client-ssm";
import {
  DynamoDBDocumentClient,
  GetCommand,
  PutCommand,
} from "@aws-sdk/lib-dynamodb";
import { mockClient } from "aws-sdk-client-mock";
import type { AwsClientStub } from "aws-sdk-client-mock";

const dynamoMock: AwsClientStub<DynamoDBDocumentClient> = mockClient(
  DynamoDBDocumentClient
);
const ssmMock: AwsClientStub<SSMClient> = mockClient(SSMClient);

export function getDynamoMock(): AwsClientStub<DynamoDBDocumentClient> {
  return dynamoMock;
}

export function getSsmMock(): AwsClientStub<SSMClient> {
  return ssmMock;
}

export function resetAwsMocks(): void {
  dynamoMock.reset();
  ssmMock.reset();
}

export function mockCachedValue(options: {
  key: { pk: string; sk: string };
  tableName?: string;
  item?: Record<string, unknown> | null;
}): void {
  const { key, tableName = process.env.TABLE_NAME, item } = options;
  if (!tableName) {
    throw new Error("mockCachedValue requires TABLE_NAME");
  }

  dynamoMock
    .on(GetCommand, { TableName: tableName, Key: key })
    .resolves(item ? { Item: item } : {});
}

export function mockPutCachedValue(tableName?: string): void {
  const resolvedTableName = tableName ?? process.env.TABLE_NAME;
  dynamoMock
    .on(PutCommand, {
      TableName: resolvedTableName,
    })
    .resolves({});
}

export function mockParameter(options: { name: string; value?: string }): void {
  const { name, value } = options;
  const stub = ssmMock.on(GetParameterCommand, {
    Name: name,
    WithDecryption: true,
  });

  if (typeof value === "string") {
    stub.resolves({
      Parameter: { Value: value },
    });
    return;
  }

  stub.rejects(new Error(`Parameter ${name} not found`));
}
