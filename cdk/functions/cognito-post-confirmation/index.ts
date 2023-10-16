// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0

import { Callback, Context, PostConfirmationTriggerEvent } from "aws-lambda";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, QueryCommand, PutCommand } from "@aws-sdk/lib-dynamodb";

const ddbClient = new DynamoDBClient({});
const ddbDocClient = DynamoDBDocumentClient.from(ddbClient);

const TABLE_NAME = process.env.TABLE_NAME!;

async function queryTenantIdByUserPoolAndAppClientId(userPoolId: string, appClientId: string) {
  const command = new QueryCommand({
    TableName: TABLE_NAME,
    IndexName: "userpool-appclient-index",
    KeyConditionExpression: "userPoolId = :userPoolId AND appClientId = :appClientId",
    ExpressionAttributeValues: {
      ":userPoolId": userPoolId,
      ":appClientId": appClientId,
    },
  });
  const res = await ddbDocClient.send(command);
  return res.Items?.[0]?.pk.split("#")[1]!;
}

async function addMembership(tenantId: string, sub: string, email: string, cognitoUserName: string) {
  const displayName = cognitoUserName.substring(`external-idp-${tenantId}_`.length)
  const command = new PutCommand({
    TableName: TABLE_NAME,
    Item: {
      pk: `tenant#${tenantId}`,
      sk: `membership#${sub}`,
      displayName,
      email,
      role: "member",
      type: "FEDERATION_USER",
      cognitoUserName,
    }
  });

  await ddbDocClient.send(command);
}

export async function handler(event: PostConfirmationTriggerEvent, context: Context, callback: Callback) {
  if (event.triggerSource !== 'PostConfirmation_ConfirmSignUp') {
    return event;
  }
  // 本 Demo ではNative User は AdminCreateUser で作成されるため、サインアップ後の確認が発生しない。
  // https://docs.aws.amazon.com/ja_jp/cognito/latest/developerguide/signing-up-users-in-your-app.html#signup-confirmation-verification-overview
  // Federation User の新規作成時のみ下記呼び出しが行われる。
  // https://docs.aws.amazon.com/ja_jp/cognito/latest/developerguide/cognito-user-identity-pools-working-with-aws-lambda-triggers.html
  const userPoolId = event.userPoolId;
  const appClientId = event.callerContext.clientId;
  // ログインを試みたユーザー
  console.log(event);
  const sub = event.request.userAttributes.sub;
  const email = event.request.userAttributes["custom:emailFromIdp"] ?? "";
  const userName = event.userName;
  try {
    const tenantId = await queryTenantIdByUserPoolAndAppClientId(userPoolId, appClientId);
    await addMembership(tenantId, sub, email, userName);
    return event;
  } catch (e) {
    throw new Error("Failed to add membership");
  }
}