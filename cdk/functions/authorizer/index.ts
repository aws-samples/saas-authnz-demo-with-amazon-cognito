// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0

import { APIGatewayRequestAuthorizerEvent, APIGatewayAuthorizerResult } from "aws-lambda";
import { Tracer } from '@aws-lambda-powertools/tracer';
import {
  VerifiedPermissionsClient,
  EntityIdentifier,
  ActionIdentifier,
  IsAuthorizedWithTokenCommand,
  AttributeValue
} from "@aws-sdk/client-verifiedpermissions";
import { decomposeUnverifiedJwt } from "aws-jwt-verify/jwt";

const ACTIONS: {[key: string]: string} = {
  "GET /api/tenantinfo": "DescribeTenantInfo",
  "PUT /api/tenantinfo": "UpdateTenantInfo",
  "POST /api/user": "InviteUser",
  "GET /api/user" : "ListUser",
  "GET /api/user/{userId}": "DescribeUser",
  "PUT /api/user/{userId}/profile": "UpdateUserProfile",
  "PUT /api/user/{userId}/role": "UpdateUserRole",
  "DELETE /api/user/{userId}": "DeleteUser",
  "POST /api/idp-mapping": "CreateIdpMapping",
  "GET /api/idp-mapping": "DescribeIdpMapping",
  "PUT /api/idp-mapping": "UpdateIdpMapping",
  "DELETE /api/idp-mapping": "DeleteIdpMapping",
}
const POLICY_STORE_ID = process.env.POLICY_STORE_ID;

const tracer = new Tracer({ serviceName: 'Authorizer' });
const avpClient = tracer.captureAWSv3Client(new VerifiedPermissionsClient({}));

function entity(entityType: string, entityId: string): EntityIdentifier {
  return {
    entityType: `ApiAccess::${entityType}`,
    entityId
  }
}

function action(actionType: string, actionId: string): ActionIdentifier {
  return { 
    actionType: `ApiAccess::${actionType}`,
    actionId
  }
}
function attribute(obj: {[key: string]: any}) {
  return Object.keys(obj).reduce((state: {[key: string]: AttributeValue}, key: string) => {
    return {
      ...state,
      [key]: {string: obj[key]}
    }
  }, {})
}

async function isAuthorizedWithToken(event: APIGatewayRequestAuthorizerEvent) {
  const token = event.headers?.Authorization?.replace("Bearer ", "");
  const resourceId = entity("Resource", event.resource)
  // Amazon Verified Permissions に ID トークンとアクセス先を渡して検証
  const command = new IsAuthorizedWithTokenCommand({
    policyStoreId: POLICY_STORE_ID,
    identityToken: token,
    action: action("Action", ACTIONS[`${event.httpMethod} ${event.resource}`]),
    resource: resourceId,
    entities: {
      entityList: [{
        identifier: resourceId,
        attributes: {
          pathParameters: {
            record: attribute(event.pathParameters ?? {})
          }
        }
      }]
    }
  });
  const result = await avpClient.send(command);
  if (!result.decision) {
    console.error(result.errors);
    throw Error("Failed to make decision")
  }
  // Amazon Verified Permissions にて検証済みの ID トークンからペイロードを取得
  const payload = decomposeUnverifiedJwt(token).payload;
  const identity = {
    userPoolId: (payload['iss'] as string).split("/").pop() ?? "",
    sub: payload['sub'] as string,
    userRole: payload['userRole'] as string,
    tenantId: payload['tenantId'] as string,
    tenantTier: payload['tenantTier'] as string
  }
  return { identity, decision: result.decision }
}

export async function handler(event: APIGatewayRequestAuthorizerEvent): Promise<APIGatewayAuthorizerResult> {
  // 入力値
  // https://docs.aws.amazon.com/ja_jp/apigateway/latest/developerguide/api-gateway-lambda-authorizer-input.html#w37aac15b9c11c26c29b5
  const token = event.headers?.Authorization?.replace("Bearer ", "");
  if (event.type !== 'REQUEST' || !token) {
    throw new Error('Unauthorized');
  }
  try {
    const { identity, decision } = await isAuthorizedWithToken(event);
    // Lambda Authorizer の出力
    // https://docs.aws.amazon.com/ja_jp/apigateway/latest/developerguide/api-gateway-lambda-authorizer-output.html
    return {
      "principalId": `${identity.tenantId}#${identity.sub}`,
      "policyDocument": {
        "Version": "2012-10-17",
        "Statement": [
          {
            "Action": "execute-api:Invoke",
            "Effect": decision == "ALLOW" ? "Allow" : "Deny",
            "Resource": event.methodArn
          }
        ]
      },
      "context": identity // ID トークンから取得したペイロードを後段処理で参照可能にする
    };
  } catch (err) {
    console.error(err);
    throw new Error("Unauthorized");
  }
}