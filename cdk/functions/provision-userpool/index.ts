// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0

import {
  CognitoIdentityProviderClient,
  CreateUserPoolCommand,
  SetUserPoolMfaConfigCommand,
  CreateUserPoolDomainCommand
} from "@aws-sdk/client-cognito-identity-provider";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, PutCommand } from "@aws-sdk/lib-dynamodb";
import { CreateIdentitySourceCommand, VerifiedPermissionsClient } from "@aws-sdk/client-verifiedpermissions";
import * as uuid from "uuid";

const cognitoClient = new CognitoIdentityProviderClient({});
const ddbClient = new DynamoDBClient({});
const ddbDocClient = DynamoDBDocumentClient.from(ddbClient);
const avpClient = new VerifiedPermissionsClient({});

const SIGN_IN_URL = `${process.env.URL}/login`;
const POST_CONFIRMAITON_LAMBDA = process.env.POST_CONFIRMAITON_LAMBDA;
const PRE_TOKEN_GENERATION_LAMBDA = process.env.PRE_TOKEN_GENERATION_LAMBDA;
const POLICY_STORE_ID = process.env.POLICY_STORE_ID;
const TABLE_NAME = process.env.TABLE_NAME!;

const userNamePlaceHolder = "{username}";
const passwordPlaceHolder = "{####}";
const emailTemplate = `<h1>デモアプリケーションへようこそ！</h1>
<a href=\"${SIGN_IN_URL}/${userNamePlaceHolder}\">こちら</a>よりサインインしてパスワードを設定してください。<br>
初期パスワード : ${passwordPlaceHolder}`;

async function createUserPool(): Promise<{
  userPoolArn: string,
  userPoolId: string,
  domain: string
}> {
  const userPoolName = `saasdemo-${uuid.v4()}`;
  const command = new CreateUserPoolCommand({
    PoolName: userPoolName,
    AccountRecoverySetting: {
      RecoveryMechanisms: [
        {Name: "verified_email", Priority: 1}
      ]
    },
    AdminCreateUserConfig: {
      AllowAdminCreateUserOnly: true,
      InviteMessageTemplate: {
        EmailSubject: "デモアプリケーションへようこそ！",
        EmailMessage: emailTemplate,
      }
    },
    UserPoolAddOns: {
      AdvancedSecurityMode: "ENFORCED"
    },
    LambdaConfig: {
      PostConfirmation: POST_CONFIRMAITON_LAMBDA,
      PreTokenGeneration: PRE_TOKEN_GENERATION_LAMBDA,
    },
    Schema: [{
      "Name": "emailFromIdp",
      "AttributeDataType": "String",
      "DeveloperOnlyAttribute": false,
      "Mutable": true,
      "Required": false
    }]
  });
  const res = await cognitoClient.send(command);
  if(!res.UserPool || !res.UserPool.Id) throw Error("Failed to create userpool");
  const userPoolId = res.UserPool.Id;
  try {
    const createDomain = cognitoClient.send(new CreateUserPoolDomainCommand({
      UserPoolId: userPoolId,
      Domain: userPoolName
    }));
    const setMfaConfig = cognitoClient.send(new SetUserPoolMfaConfigCommand({
      UserPoolId: userPoolId,
      MfaConfiguration: "OPTIONAL",
      SoftwareTokenMfaConfiguration: {
        Enabled: true
      }
    }));
    await Promise.all([createDomain, setMfaConfig]);
  } catch(e) {
    throw Error("Failed to setup Userpool")
  }
  return {
    userPoolArn: res.UserPool.Arn!,
    userPoolId,
    domain: userPoolName
  };
}

async function createIdentitySourceToAVP(userPoolArn: string) {
  const command = new CreateIdentitySourceCommand({
    policyStoreId: POLICY_STORE_ID,
    principalEntityType: "ApiAccess::User",
    configuration: {
      cognitoUserPoolConfiguration: {
        userPoolArn
      }
    }
  });
  const res = await avpClient.send(command);
  if(!res.identitySourceId) throw Error("failed to create Identity Source")
}

async function addUserPoolRecordToDdb(userPoolId: string, domain: string) {
  const command = new PutCommand({
    TableName: TABLE_NAME,
    Item: {
      pk: "userpool",
      sk: userPoolId,
      domain,
      numClients: 0
    }
  });
  await ddbDocClient.send(command);
}

export async function handler() {
    const {userPoolArn, userPoolId, domain} = await createUserPool();
    await createIdentitySourceToAVP(userPoolArn);
    await addUserPoolRecordToDdb(userPoolId, domain);

    return {
      Id: userPoolId,
      Domain: domain
    }
}