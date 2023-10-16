// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0

import { Callback, Context, PreTokenGenerationTriggerEvent, PreTokenGenerationTriggerHandler } from "aws-lambda";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, BatchGetCommand, QueryCommand } from "@aws-sdk/lib-dynamodb";

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

async function getUserProperty(tenantId: string, sub: string) {
  const command = new BatchGetCommand({
    RequestItems: {
      [TABLE_NAME]: {
        Keys: [{
          pk: `tenant#${tenantId}`,
          sk: "metadata",
        }, 
        {
          pk: `tenant#${tenantId}`,
          sk: `membership#${sub}`,
        }]
      }
    }
  });
  const res = await ddbDocClient.send(command);
  const items = res.Responses?.[TABLE_NAME];
  if(!items || items.length < 2) throw new Error("User Access Not Allowed");
  const tier = items.find((item: any) => item.sk === "metadata")?.tier;
  const role = items.find((item: any) => item.sk.startsWith("membership"))?.role;
  return { tier, role };
}

export async function handler(event: PreTokenGenerationTriggerEvent, context: Context, callback: Callback) {

  const userPoolId = event.userPoolId;
  const appClientId = event.callerContext.clientId;
  // ログインを試みたユーザー
  const sub = event.request.userAttributes.sub;
  console.log(userPoolId, appClientId, sub);
  try {
    const tenantId = await queryTenantIdByUserPoolAndAppClientId(userPoolId, appClientId);
    if (!tenantId) throw new Error("Tenant Not Found");
    const { tier, role } = await getUserProperty(tenantId, sub);
    // ID トークンへの属性の付与
    event.response = {
      claimsOverrideDetails: {
        claimsToAddOrOverride: {
          'tenantId': tenantId,
          'tenantTier': tier,
          'userRole': role,
        }
      }
    }
    return event


  } catch (e) {
    console.error(e);
    throw new Error("User Access Not Allowed");
  }
}