// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0

import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as cloudfront from 'aws-cdk-lib/aws-cloudfront';
import * as cforigins from 'aws-cdk-lib/aws-cloudfront-origins';
import * as s3 from 'aws-cdk-lib/aws-s3'
import * as s3deploy from 'aws-cdk-lib/aws-s3-deployment';
import * as logs from 'aws-cdk-lib/aws-logs';
import * as apigw from 'aws-cdk-lib/aws-apigateway';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as nodelambda from 'aws-cdk-lib/aws-lambda-nodejs';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as ssm from 'aws-cdk-lib/aws-ssm';
import * as sfn from 'aws-cdk-lib/aws-stepfunctions';
import * as verifiedpermissions from 'aws-cdk-lib/aws-verifiedpermissions';
import * as TenantOnboardServiceDef from '../statemachines/tenant-onboard.asl.json';
import * as TenantDescribeServiceDef from '../statemachines/tenant-describe.asl.json';
import * as TenantUpdateServiceDef from '../statemachines/tenant-update.asl.json';
import * as TenantDeleteServiceDef from '../statemachines/tenant-delete.asl.json';
import * as TenantAuthConfigServiceDef from '../statemachines/tenant-authconfig.asl.json';
import * as TenantRegisterIdPServiceDef from '../statemachines/tenant-register-idp.asl.json';
import * as TenantDescribeIdpServiceDef from '../statemachines/tenant-describe-idp.asl.json';
import * as TenantUpdateIdpServiceDef from '../statemachines/tenant-update-idp.asl.json';
import * as TenantDeregisterIdPServiceDef from '../statemachines/tenant-deregister-idp.asl.json';
import * as UserInviteServiceDef from '../statemachines/user-invite.asl.json';
import * as UserDescribeServiceDef from '../statemachines/user-describe.asl.json';
import * as UserListServiceDef from '../statemachines/user-list.asl.json';
import * as UserDeleteServiceDef from '../statemachines/user-delete.asl.json';
import * as UserUpdateServiceDef from '../statemachines/user-update.asl.json';
import { SfnStateMachine } from './sfn-statemachine';
import { readFileSync } from 'fs';

export class SaaSAuthDemoStack extends cdk.Stack {
  static ALLOWED_TIERS: string[] = ['BASIC', 'PREMIUM'];
  static ALLOWED_ROLES: string[] = ['admin', 'member'];

  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const mainTable = new dynamodb.Table(this, 'MainTable', {
      partitionKey: { name: 'pk', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'sk', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });
    const gsi = mainTable.addGlobalSecondaryIndex({
      indexName: 'userpool-appclient-index',
      partitionKey: {
        name: 'userPoolId',
        type: dynamodb.AttributeType.STRING,
      },
      sortKey: {
        name: 'appClientId',
        type: dynamodb.AttributeType.STRING,
      },
      projectionType: dynamodb.ProjectionType.ALL,
    });

    const cognitoPostConfirmationFunction = new nodelambda.NodejsFunction(this, 'CognitoPostConfirmationFunction', {
      entry: 'functions/cognito-post-confirmation/index.ts',
      environment: {
        'TABLE_NAME': mainTable.tableName,
      },
      tracing: lambda.Tracing.PASS_THROUGH,
    });
    mainTable.grantReadWriteData(cognitoPostConfirmationFunction);
    cognitoPostConfirmationFunction.addPermission('CognitoPermission', {
      principal: new iam.ServicePrincipal('cognito-idp.amazonaws.com'),
      sourceArn: `arn:aws:cognito-idp:ap-northeast-1:${cdk.Stack.of(this).account}:userpool/*`
    })

    const cognitoPreTokenGenerationFunction = new nodelambda.NodejsFunction(this, 'CognitoPreTokenGenerationFunction', {
      entry: 'functions/cognito-pre-token-generation/index.ts',
      environment: {
        'TABLE_NAME': mainTable.tableName,
      },
      tracing: lambda.Tracing.PASS_THROUGH,
    });
    mainTable.grantReadData(cognitoPreTokenGenerationFunction);
    cognitoPreTokenGenerationFunction.addPermission('CognitoPermission', {
      principal: new iam.ServicePrincipal('cognito-idp.amazonaws.com'),
      sourceArn: `arn:aws:cognito-idp:ap-northeast-1:${cdk.Stack.of(this).account}:userpool/*`
    })

    const policySchemaString = readFileSync("./verifiedpermissions/cedarschema.json").toString();
    const policyStore = new verifiedpermissions.CfnPolicyStore(this, 'PolicyStore', {
      validationSettings: {
        mode: "STRICT",
      },
      schema: {
        cedarJson: policySchemaString
      }
    });
    const policyStoreId = policyStore.attrPolicyStoreId;

    function loadPolicyFile(filename: string): string {
      const policy =  readFileSync(`./verifiedpermissions/${filename}`).toString();
      return policy;
    }
    new verifiedpermissions.CfnPolicy(this, 'BaselinePermission', {
      definition: {
        static: {
          statement: loadPolicyFile("baseline-permission.cedar"),
          description: 'allow users to describe tenantinfo and tenant users',
        }
      },
      policyStoreId,
    });
    new verifiedpermissions.CfnPolicy(this, 'BaselineUpdateProfilePermission', {
      definition: {
        static: {
          statement: loadPolicyFile("baseline-update-profile-permission.cedar"),
          description: 'allow users to update their profile',
        }
      },
      policyStoreId,
    });
    new verifiedpermissions.CfnPolicy(this, 'AdminPermission', {
      definition: {
        static: {
          statement: loadPolicyFile("admin-permission.cedar"),
          description: 'admin users can manage tenant, idp and users',
        }
      },
      policyStoreId,
    });
    new verifiedpermissions.CfnPolicy(this, 'UserManagementGuardPermission', {
      definition: {
        static: {
          statement: loadPolicyFile("user-management-guard.cedar"),
          description: 'prevent users from deleting themselves or changing their own priviledges',
        }
      },
      policyStoreId,
    });
    new verifiedpermissions.CfnPolicy(this, 'IdpManagementGuardPermission', {
      definition: {
        static: {
          statement: loadPolicyFile("idp-management-guard.cedar"),
          description: 'prevent non-PREMIUM tenant from create/update idp-mapping',
        }
      },
      policyStoreId,
    });
    const authorizerFunction = new nodelambda.NodejsFunction(this, 'AuthorizerFunction', {
      entry: 'functions/authorizer/index.ts',
      environment: {
        'TABLE_NAME': mainTable.tableName,
        'POLICY_STORE_ID': policyStoreId,
      },
      timeout: cdk.Duration.seconds(10),
      tracing: lambda.Tracing.PASS_THROUGH,
      memorySize: 512
    });
    mainTable.grantReadData(authorizerFunction);
    authorizerFunction.addToRolePolicy(new iam.PolicyStatement({
      actions: ['verifiedpermissions:IsAuthorizedWithToken',],
      resources: [
        `arn:aws:verifiedpermissions::${cdk.Stack.of(this).account}:policy-store/${policyStoreId}`
      ]
    }));
    const authorizer = new apigw.RequestAuthorizer(this, 'Authorizer', {
      handler: authorizerFunction,
      identitySources: [
        apigw.IdentitySource.header('Authorization'),
        apigw.IdentitySource.context('path'),
        apigw.IdentitySource.context('httpMethod')
      ]
    })

    const apiAccessLogGroup = new logs.LogGroup(this, "ApiAccessLog");
    apigw.AccessLogFormat.custom

    const restApi = new apigw.RestApi(this, 'ManagementApi', {
      endpointTypes: [apigw.EndpointType.REGIONAL],
      disableExecuteApiEndpoint: false,
      cloudWatchRole: true,
      deployOptions: {
        loggingLevel: apigw.MethodLoggingLevel.ERROR,
        tracingEnabled: true,
        accessLogDestination: new apigw.LogGroupLogDestination(apiAccessLogGroup),
        accessLogFormat: apigw.AccessLogFormat.custom(JSON.stringify({
          requestId: apigw.AccessLogField.contextRequestId(),
          ip: apigw.AccessLogField.contextIdentitySourceIp(),
          tenantId: apigw.AccessLogField.contextAuthorizer("tenantId"),
          userId: apigw.AccessLogField.contextAuthorizer("sub"),
          tenantTier: apigw.AccessLogField.contextAuthorizer("tenantTier"),
          userRole: apigw.AccessLogField.contextAuthorizer("userRole"),
          requestTime: apigw.AccessLogField.contextRequestTime(),
          httpMethod: apigw.AccessLogField.contextHttpMethod(),
          resourcePath: apigw.AccessLogField.contextResourcePath(),
          status: apigw.AccessLogField.contextStatus(),
          protocol: apigw.AccessLogField.contextProtocol(),
          responseLength: apigw.AccessLogField.contextResponseLength(),
          responseLatency: apigw.AccessLogField.contextResponseLatency(),
          traceId: apigw.AccessLogField.contextXrayTraceId(),
        })),
      },
    });
    const apiResource = restApi.root.addResource('api');

    const accessLogBucket = new s3.Bucket(this, 'AccessLogBucket', {
      removalPolicy: cdk.RemovalPolicy.RETAIN,
      encryption: s3.BucketEncryption.S3_MANAGED,
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      enforceSSL: true,
    })
    // Frontend Application
    const webBucket = new s3.Bucket(this, 'WebBucket', {
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      autoDeleteObjects: true,
      encryption: s3.BucketEncryption.S3_MANAGED,
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      serverAccessLogsBucket: accessLogBucket,
      serverAccessLogsPrefix: 's3/',
      enforceSSL: true,
    }); 
    const cfSpaRedirectFunction = new cloudfront.Function(this, 'CfSpaRedirectFunction', {
      code: cloudfront.FunctionCode.fromFile({
        filePath: 'functions/cf-spa-redirect/index.js',
      }),
    });
    const webDistribution = new cloudfront.Distribution(this, 'WebDistribution', {
      defaultBehavior: {
        origin: new cforigins.S3Origin(webBucket),
        functionAssociations: [{
          function: cfSpaRedirectFunction,
          eventType: cloudfront.FunctionEventType.VIEWER_REQUEST,
        }],
        cachePolicy: cloudfront.CachePolicy.CACHING_OPTIMIZED,
      },
      additionalBehaviors: {
        '/api/*': {
          origin: new cforigins.RestApiOrigin(restApi),
          cachePolicy: cloudfront.CachePolicy.CACHING_DISABLED,
          originRequestPolicy: cloudfront.OriginRequestPolicy.ALL_VIEWER_EXCEPT_HOST_HEADER,
          viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.ALLOW_ALL,
          allowedMethods: cloudfront.AllowedMethods.ALLOW_ALL,
        }
      },
      defaultRootObject: '/index.html',
      enableLogging: true,
      logBucket: accessLogBucket,
      logFilePrefix: "cloudfront/",
      minimumProtocolVersion: cloudfront.SecurityPolicyProtocol.TLS_V1_2_2021,
    });

    // https://aws.amazon.com/jp/blogs/devops/building-apps-with-aws-cdk/
    new s3deploy.BucketDeployment(this, 'WebDeploy', {
      sources: [s3deploy.Source.asset('../web', {
        bundling: {
          image: cdk.DockerImage.fromRegistry('node:18.1-slim'),
          environment: {
            npm_config_cache: "/tmp/npm_cache",
            npm_config_update_notifier: "false",
          },
          bundlingFileAccess: cdk.BundlingFileAccess.VOLUME_COPY,
          command: [
            'sh', '-c', [
              'cd /asset-input',
              'rm -rf dist',
              'npm ci',
              'npm run build',
              'cp -r dist/* /asset-output'
            ].join(" && ")
          ],
        }
      })],
      destinationBucket: webBucket,
      distribution: webDistribution,
      destinationKeyPrefix: '/',
      distributionPaths: ['/*'],
      retainOnDelete: false,
    });

    /*
      TENANT SERVICES
    */

    const provisionUserPoolFunction = new nodelambda.NodejsFunction(this, 'ProvisionUserPoolFunction', {
      entry: 'functions/provision-userpool/index.ts',
      environment: {
        'URL': `https://${webDistribution.domainName}`,
        'PRE_TOKEN_GENERATION_LAMBDA': cognitoPreTokenGenerationFunction.functionArn,
        'POST_CONFIRMAITON_LAMBDA': cognitoPostConfirmationFunction.functionArn,
        'TABLE_NAME': mainTable.tableName,
        'POLICY_STORE_ID': policyStoreId,
      },
      timeout: cdk.Duration.seconds(30),
      retryAttempts: 0,
      tracing: lambda.Tracing.PASS_THROUGH,
    });
    mainTable.grantWriteData(provisionUserPoolFunction);
    provisionUserPoolFunction.addToRolePolicy(new iam.PolicyStatement({
      actions: ['verifiedpermissions:CreateIdentitySource',],
      resources: [
        `arn:aws:verifiedpermissions::${cdk.Stack.of(this).account}:policy-store/${policyStoreId}`
      ]
    }));
    provisionUserPoolFunction.addToRolePolicy(new iam.PolicyStatement({
      actions: [
        'cognito-idp:CreateUserPool',
        'cognito-idp:DescribeUserPool',
        'cognito-idp:SetUserPoolMfaConfig',
        'cognito-idp:CreateUserPoolDomain',
      ],
      // see here : https://docs.aws.amazon.com/ja_jp/step-functions/latest/dg/service-integration-iam-templates.html#connect-iam-dynamic-static
      resources: ['*']
    }));

    new ssm.StringParameter(this, 'ControlPlaneParameter', {
      parameterName: '/saas-auth-demo/params',
      stringValue: cdk.Stack.of(this).toJsonString({
        "Region": cdk.Stack.of(this).region,
        "DDBTable": mainTable.tableName,
        "ProvisionUserPoolLambda": provisionUserPoolFunction.functionArn,
        "AllowedRoles": SaaSAuthDemoStack.ALLOWED_ROLES,
        "AllowedTiers": SaaSAuthDemoStack.ALLOWED_TIERS,
        "URL": `https://${webDistribution.domainName}`
      })
    });
    const ssmControlPlaneParam = ssm.StringListParameter.fromStringListParameterName(this, 'ControlPlaneParameterRef', '/saas-auth-demo/params');

    const tenantOnboardService = new SfnStateMachine(this, 'TenantOnboardService', {
      definition: TenantOnboardServiceDef,
      type: sfn.StateMachineType.STANDARD,
      logLevel: sfn.LogLevel.ALL,
    });
    ssmControlPlaneParam.grantRead(tenantOnboardService.role);
    mainTable.grantReadWriteData(tenantOnboardService.role);
    provisionUserPoolFunction.grantInvoke(tenantOnboardService.role);
    tenantOnboardService.role.addToPolicy(new iam.PolicyStatement({
      actions: [
        'cognito-idp:CreateUserPoolClient',
        'cognito-idp:DeleteUserPoolClient',
      ],
      // see here : https://docs.aws.amazon.com/ja_jp/step-functions/latest/dg/service-integration-iam-templates.html#connect-iam-dynamic-static
      resources: ['*']
    }));

    const tenantDescribeService = new SfnStateMachine(this, 'TenantDescribeService', {
      definition: TenantDescribeServiceDef,
      type: sfn.StateMachineType.EXPRESS,
      logLevel: sfn.LogLevel.ALL,
    });
    ssmControlPlaneParam.grantRead(tenantDescribeService.role);
    mainTable.grantReadData(tenantDescribeService.role);

    const tenantUpdateService = new SfnStateMachine(this, 'TenantUpdateService', {
      definition: TenantUpdateServiceDef,
      type: sfn.StateMachineType.EXPRESS,
      logLevel: sfn.LogLevel.ALL,
    });
    ssmControlPlaneParam.grantRead(tenantUpdateService.role);
    mainTable.grantReadWriteData(tenantUpdateService.role);

    const tenantDeleteService = new SfnStateMachine(this, 'TenantDeleteService', {
      definition: TenantDeleteServiceDef,
      type: sfn.StateMachineType.STANDARD,
      logLevel: sfn.LogLevel.ALL,
    });
    ssmControlPlaneParam.grantRead(tenantDeleteService.role);
    mainTable.grantReadWriteData(tenantDeleteService.role);
    tenantDeleteService.role.addToPolicy(new iam.PolicyStatement({
      actions: [
        'cognito-idp:AdminDeleteUser',
        'cognito-idp:DeleteIdentityProvider',
        'cognito-idp:DeleteUserPoolClient',
      ],
      // see here : https://docs.aws.amazon.com/ja_jp/step-functions/latest/dg/service-integration-iam-templates.html#connect-iam-dynamic-static
      resources: ['*']
    }));

    const tenantAuthConfigService = new SfnStateMachine(this, 'TenantAuthConfigService', {
      definition: TenantAuthConfigServiceDef,
      type: sfn.StateMachineType.EXPRESS,
      logLevel: sfn.LogLevel.ALL,
    });
    ssmControlPlaneParam.grantRead(tenantAuthConfigService.role);
    mainTable.grantReadData(tenantAuthConfigService.role);

    const tenantRegisterIdpService = new SfnStateMachine(this, 'TenantRegisterIdpService', {
      definition: TenantRegisterIdPServiceDef,
      type: sfn.StateMachineType.EXPRESS,
      // log may contains client secret, so turn off logging
      logLevel: sfn.LogLevel.OFF,
    });
    ssmControlPlaneParam.grantRead(tenantRegisterIdpService.role);
    mainTable.grantReadWriteData(tenantRegisterIdpService.role);
    tenantRegisterIdpService.role.addToPolicy(new iam.PolicyStatement({
      actions: [
        'cognito-idp:CreateIdentityProvider',
        'cognito-idp:DeleteIdentityProvider',
        'cognito-idp:UpdateUserPoolClient',
      ],
      // see here : https://docs.aws.amazon.com/ja_jp/step-functions/latest/dg/service-integration-iam-templates.html#connect-iam-dynamic-static
      resources: ['*']
    }));

    const tenantDescribeIdpService = new SfnStateMachine(this, 'TenantDescribeIdpService', {
      definition: TenantDescribeIdpServiceDef,
      type: sfn.StateMachineType.EXPRESS,
      // log may contains client secret, so turn off logging
      logLevel: sfn.LogLevel.OFF,
    });
    ssmControlPlaneParam.grantRead(tenantDescribeIdpService.role);
    mainTable.grantReadData(tenantDescribeIdpService.role);
    tenantDescribeIdpService.role.addToPolicy(new iam.PolicyStatement({
      actions: [
        'cognito-idp:DescribeIdentityProvider',
      ],
      // see here : https://docs.aws.amazon.com/ja_jp/step-functions/latest/dg/service-integration-iam-templates.html#connect-iam-dynamic-static
      resources: ['*']
    }));

    const tenantUpdateIdpService = new SfnStateMachine(this, 'TenantUpdateIdpService', {
      definition: TenantUpdateIdpServiceDef,
      type: sfn.StateMachineType.EXPRESS,
      // log may contains client secret, so turn off logging
      logLevel: sfn.LogLevel.OFF,
    });
    ssmControlPlaneParam.grantRead(tenantUpdateIdpService.role);
    mainTable.grantReadWriteData(tenantUpdateIdpService.role);
    tenantUpdateIdpService.role.addToPolicy(new iam.PolicyStatement({
      actions: [
        'cognito-idp:DescribeIdentityProvider',
        'cognito-idp:UpdateIdentityProvider',
      ],
      // see here : https://docs.aws.amazon.com/ja_jp/step-functions/latest/dg/service-integration-iam-templates.html#connect-iam-dynamic-static
      resources: ['*']
    }));

    const tenantDeregisterIdpService = new SfnStateMachine(this, 'TenantDeregisterIdpService', {
      definition: TenantDeregisterIdPServiceDef,
      type: sfn.StateMachineType.EXPRESS,
      logLevel: sfn.LogLevel.ALL,
    });
    ssmControlPlaneParam.grantRead(tenantDeregisterIdpService.role);
    mainTable.grantReadWriteData(tenantDeregisterIdpService.role);
    tenantDeregisterIdpService.role.addToPolicy(new iam.PolicyStatement({
      actions: [
        'cognito-idp:DeleteIdentityProvider',
        'cognito-idp:UpdateUserPoolClient',
      ],
      // see here : https://docs.aws.amazon.com/ja_jp/step-functions/latest/dg/service-integration-iam-templates.html#connect-iam-dynamic-static
      resources: ['*']
    }));

    const userInviteService = new SfnStateMachine(this, 'UserInviteService', {
      definition: UserInviteServiceDef,
      type: sfn.StateMachineType.EXPRESS,
      logLevel: sfn.LogLevel.ALL,
    });
    ssmControlPlaneParam.grantRead(userInviteService.role);
    mainTable.grantReadWriteData(userInviteService.role);
    userInviteService.role.addToPolicy(new iam.PolicyStatement({
      actions: [
        'cognito-idp:AdminCreateUser',
        'cognito-idp:AdminDeleteUser'
      ],
      // see here : https://docs.aws.amazon.com/ja_jp/step-functions/latest/dg/service-integration-iam-templates.html#connect-iam-dynamic-static
      resources: ['*']
    }))

    const userDescribeService = new SfnStateMachine(this, 'UserDescribeService', {
      definition: UserDescribeServiceDef,
      type: sfn.StateMachineType.EXPRESS,
      logLevel: sfn.LogLevel.ALL,
    });
    ssmControlPlaneParam.grantRead(userDescribeService.role);
    mainTable.grantReadData(userDescribeService.role);

    const userListService = new SfnStateMachine(this, 'UserListService', {
      definition: UserListServiceDef,
      type: sfn.StateMachineType.EXPRESS,
      logLevel: sfn.LogLevel.ALL,
    });
    ssmControlPlaneParam.grantRead(userListService.role);
    mainTable.grantReadData(userListService.role);

    const userUpdateService = new SfnStateMachine(this, 'UserUpdateService', {
      definition: UserUpdateServiceDef,
      type: sfn.StateMachineType.EXPRESS,
      logLevel: sfn.LogLevel.ALL,
    });
    ssmControlPlaneParam.grantRead(userUpdateService.role);
    mainTable.grantReadWriteData(userUpdateService.role);

    const userDeleteService = new SfnStateMachine(this, 'UserDeleteService', {
      definition: UserDeleteServiceDef,
      type: sfn.StateMachineType.EXPRESS,
      logLevel: sfn.LogLevel.ALL,
    });
    ssmControlPlaneParam.grantRead(userDeleteService.role);
    mainTable.grantReadWriteData(userDeleteService.role);
    userDeleteService.role.addToPolicy(new iam.PolicyStatement({
      actions: [
        'cognito-idp:AdminDeleteUser'
      ],
      // see here : https://docs.aws.amazon.com/ja_jp/step-functions/latest/dg/service-integration-iam-templates.html#connect-iam-dynamic-static
      resources: ['*']
    }));

    const requestValidator = new apigw.RequestValidator(this, 'RequestValidator', {
      restApi,
      validateRequestBody: true,
      validateRequestParameters: true,
    })

    const updateTenantInfoRequestBody = restApi.addModel('UpdateTenantInfoRequestBody', {
      contentType: 'application/json',
      modelName: 'UpdateTenantInfoRequestBody',
      schema: {
        schema: apigw.JsonSchemaVersion.DRAFT4,
        type: apigw.JsonSchemaType.OBJECT,
        properties: {
          tenantName: { type: apigw.JsonSchemaType.STRING, minLength: 3 },
          tier: { type: apigw.JsonSchemaType.STRING, enum: SaaSAuthDemoStack.ALLOWED_TIERS }
        }
      }
    });
    const inviteUserRequestBody = restApi.addModel('InviteUserRequestBody', {
      contentType: 'application/json',
      modelName: 'InviteUserRequestBody',
      schema: {
        schema: apigw.JsonSchemaVersion.DRAFT4,
        type: apigw.JsonSchemaType.OBJECT,
        properties: {
          email: { type: apigw.JsonSchemaType.STRING, minLength: 3 },
          displayName: { type: apigw.JsonSchemaType.STRING, minLength: 2 },
          role: { type: apigw.JsonSchemaType.STRING, enum: SaaSAuthDemoStack.ALLOWED_ROLES }
        },
        required: ["email", "displayName", "role"]
      }
    })

    const updateUserProfileRequestBody = restApi.addModel('UpdateUserProfileRequestBody', {
      contentType: 'application/json',
      modelName: 'UpdateUserProfileRequestBody',
      schema: {
        schema: apigw.JsonSchemaVersion.DRAFT4,
        type: apigw.JsonSchemaType.OBJECT,
        properties: {
          displayName: { type: apigw.JsonSchemaType.STRING, minLength: 2 },
        },
        required: ["displayName"]
      }
    })

    const updateUserRoleRequestBody = restApi.addModel('UpdateUserRoleRequestBody', {
      contentType: 'application/json',
      modelName: 'UpdateUserRoleRequestBody',
      schema: {
        schema: apigw.JsonSchemaVersion.DRAFT4,
        type: apigw.JsonSchemaType.OBJECT,
        properties: {
          role: { type: apigw.JsonSchemaType.STRING, enum: SaaSAuthDemoStack.ALLOWED_ROLES }
        },
        required: ["role"]
      }
    })

    const createIdpMappingRequestBody = restApi.addModel('CreateIdpMappingRequestBody', {
      contentType: 'application/json',
      modelName: 'CreateIdpMappingRequestBody',
      schema: {
        schema: apigw.JsonSchemaVersion.DRAFT4,
        type: apigw.JsonSchemaType.OBJECT,
        properties: {
          providerType: { type: apigw.JsonSchemaType.STRING, enum: ["SAML", "OIDC"] },
          providerDetails: {
            type: apigw.JsonSchemaType.OBJECT,
            properties: {
              MetadataURL: { type: apigw.JsonSchemaType.STRING },
              MetadataFile: { type: apigw.JsonSchemaType.STRING },
              oidc_issuer: { type: apigw.JsonSchemaType.STRING },
              client_id: { type: apigw.JsonSchemaType.STRING },
              client_secret: { type: apigw.JsonSchemaType.STRING },
              attributes_request_method: { type: apigw.JsonSchemaType.STRING, enum: ["GET", "POST"] },
              authorize_scopes: { type: apigw.JsonSchemaType.STRING }
            }
          },
          emailMappingAttribute: { type: apigw.JsonSchemaType.STRING }
        },
        required: ["providerDetails", "emailMappingAttribute"]
      }
    })

    const updateIdpMappingRequestBody = restApi.addModel('UpdateIdpMappingRequestBody', {
      contentType: 'application/json',
      modelName: 'UpdateIdpMappingRequestBody',
      schema: {
        schema: apigw.JsonSchemaVersion.DRAFT4,
        type: apigw.JsonSchemaType.OBJECT,
        properties: {
          providerDetails: {
            type: apigw.JsonSchemaType.OBJECT,
            properties: {
              MetadataURL: { type: apigw.JsonSchemaType.STRING },
              MetadataFile: { type: apigw.JsonSchemaType.STRING },
              oidc_issuer: { type: apigw.JsonSchemaType.STRING },
              client_id: { type: apigw.JsonSchemaType.STRING },
              client_secret: { type: apigw.JsonSchemaType.STRING },
              attributes_request_method: { type: apigw.JsonSchemaType.STRING, enum: ["GET", "POST"] },
              authorize_scopes: { type: apigw.JsonSchemaType.STRING }
            }
          },
          emailMappingAttribute: { type: apigw.JsonSchemaType.STRING }
        },
        required: ["providerDetails", "emailMappingAttribute"]
      }
    })

    function sfnIntegration(stateMachine: sfn.IStateMachine, params: {[key: string]: string}, clientErrors: string[]) {
      return apigw.StepFunctionsIntegration.startExecution(stateMachine, {
        requestTemplates: {
          "application/json": `
#set($root = $input.path('$'))
#set($root.REQUEST_DATA = {})
#set($requestData = $root.REQUEST_DATA)
${Object.keys(params).map((key: string) => {
  return `#set($requestData.${key} = ${params[key]})`
}).join("\n")}
{
  "stateMachineArn": "${stateMachine.stateMachineArn}",
  "input": "$util.escapeJavaScript($input.json('$.REQUEST_DATA')).replaceAll(\"\\\\'\",\"'\")"
}`.trim()
        },
        integrationResponses: [{
          statusCode: '200',
          responseTemplates: {
            "application/json": `
#set($inputRoot = $input.path('$'))
#set($clientErrors = ${JSON.stringify(clientErrors)})
#if($input.path('$.status').toString().equals("SUCCEEDED"))
$input.path('$.output')
#else
#if($clientErrors.contains($input.path('$.error').toString()))
#set($context.responseOverride.status = 400)
{"error": "$input.path('$.error')", "cause": "$input.path('$.cause')"}
#else
#set($context.responseOverride.status = 500)
{"error": "Internal server error", "cause": "Internal server error"}
#end
#end`.trim()
          }
        }]
      });
    }
    const mapFromParams = (key: string) => `\"$util.escapeJavaScript($input.params('${key}'))\"`;
    const mapFromAuthorizer = (key: string) => `\"$context.authorizer.${key}\"`;
    const mapFromJsonPath = (key: string) => `$input.path('${key}')`;

    // DescribeAuthConfig
    const authConfigResource = apiResource.addResource('authconfig').addResource('{tenantId}');
    authConfigResource.addMethod('GET', sfnIntegration(tenantAuthConfigService.stateMachine, {
      tenantId: mapFromParams("tenantId"),
    }, ["InvalidRequestError", "TenantNotFoundError"]));

    
    // DescribeTenantInfo
    const tenantInfoResource = apiResource.addResource('tenantinfo');
    tenantInfoResource.addMethod('GET', sfnIntegration(tenantDescribeService.stateMachine, {
      tenantId: mapFromAuthorizer("tenantId"),
    }, ["InvalidRequestError", "TenantNotFoundError"]), { authorizer });

    // UpdateTenantInfo
    tenantInfoResource.addMethod('PUT', sfnIntegration(tenantUpdateService.stateMachine, {
      tenantId: mapFromAuthorizer("tenantId"),
      tenantName: mapFromJsonPath("$.tenantName"),
      tier: mapFromJsonPath("$.tier"),
    }, ["InvalidRequestError", "TenantNotFoundError"]), {
      authorizer,
      requestModels: { "application/json": updateTenantInfoRequestBody },
      requestValidator
    });

    const tenantUserResource = apiResource.addResource('user');
    // InviteUser
    tenantUserResource.addMethod('POST', sfnIntegration(userInviteService.stateMachine, {
      tenantId: mapFromAuthorizer("tenantId"),
      displayName: mapFromJsonPath("$.displayName"),
      email: mapFromJsonPath("$.email"),
      role: mapFromJsonPath("$.role"),
    }, ["InvalidRequestError", "TenantNotFoundError", "UserExistError", ""]), {
      authorizer,
      requestModels: { "application/json": inviteUserRequestBody },
      requestValidator
    });

    // ListUser
    tenantUserResource.addMethod('GET', sfnIntegration(userListService.stateMachine, {
      tenantId: mapFromAuthorizer("tenantId"),
    }, ["InvalidRequestError"]), { authorizer });

    const tenantUserDetailResource = tenantUserResource.addResource('{userId}')
    // DescribeUser
    tenantUserDetailResource.addMethod('GET', sfnIntegration(userDescribeService.stateMachine, {
      tenantId: mapFromAuthorizer("tenantId"),
      userId: mapFromParams("userId")
    }, ["InvalidRequestError", "UserNotFoundError"]), { authorizer });

    // UpdateUserProfile
    tenantUserDetailResource.addResource('profile').addMethod('PUT', sfnIntegration(userUpdateService.stateMachine, {
      tenantId: mapFromAuthorizer("tenantId"),
      userId: mapFromParams("userId"),
      displayName: mapFromJsonPath("$.displayName"),
    }, ["InvalidRequestError", "UserNotFoundError"]), {
      authorizer,
      requestModels: { "application/json": updateUserProfileRequestBody },
      requestValidator
    })

    // UpdateUserRole
    tenantUserDetailResource.addResource('role').addMethod('PUT', sfnIntegration(userUpdateService.stateMachine, {
      tenantId: mapFromAuthorizer("tenantId"),
      userId: mapFromParams("userId"),
      role: mapFromJsonPath("$.role")
    }, ["InvalidRequestError", "UserNotFoundError"]), {
      authorizer,
      requestModels: { "application/json": updateUserRoleRequestBody },
      requestValidator
    })
    
    // DeleteUser
    tenantUserDetailResource.addMethod('DELETE', sfnIntegration(userDeleteService.stateMachine, {
      tenantId: mapFromAuthorizer("tenantId"),
      userId: mapFromParams("userId")
    }, ["InvalidRequestError", "TenantNotFoundError"]), { authorizer });

    const tenantIdpResource = apiResource.addResource('idp-mapping');
    // CreateIdpMapping
    tenantIdpResource.addMethod('POST', sfnIntegration(tenantRegisterIdpService.stateMachine, {
      tenantId: mapFromAuthorizer("tenantId"),
      providerType: mapFromJsonPath("$.providerType"),
      // use JSON object as input
      providerDetails: mapFromJsonPath("$.providerDetails"),
      emailMappingAttribute: mapFromJsonPath("$.emailMappingAttribute"),
    }, ["InvalidRequestError", "TenantNotFoundError", "SettingAlreadyExistsError"]), {
      authorizer,
      requestModels: { "application/json": createIdpMappingRequestBody },
      requestValidator
    });

    // DescribeIdpMapping
    tenantIdpResource.addMethod('GET', sfnIntegration(tenantDescribeIdpService.stateMachine, {
      tenantId: mapFromAuthorizer("tenantId"),
    }, ["InvalidRequestError", "TenantNotFoundError", "SettingNotExistsError"]), { authorizer });

    // UpdateIdpMapping
    tenantIdpResource.addMethod('PUT', sfnIntegration(tenantUpdateIdpService.stateMachine, {
      tenantId: mapFromAuthorizer("tenantId"),
      // use JSON object as input
      providerDetails: mapFromJsonPath("$.providerDetails"),
      emailMappingAttribute: mapFromJsonPath("$.emailMappingAttribute")
    }, ["InvalidRequestError", "TenantNotFoundError", "SettingNotExistsError"]), {
      authorizer,
      requestModels: { "application/json": updateIdpMappingRequestBody },
      requestValidator
    });

    // DeleteIdpMapping
    tenantIdpResource.addMethod('DELETE', sfnIntegration(tenantDeregisterIdpService.stateMachine, {
      tenantId: mapFromAuthorizer("tenantId"),
    }, ["InvalidRequestError", "TenantNotFoundError"]), { authorizer });

    /*
      OUTPUT
    */
    new cdk.CfnOutput(this, 'URL', {
      value: `https://${webDistribution.domainName}`,
    });
    new cdk.CfnOutput(this, 'TenantOnboardServiceArn', {
      value: tenantOnboardService.stateMachine.stateMachineArn,
    });
    new cdk.CfnOutput(this, 'UserInviteServiceArn', {
      value: userInviteService.stateMachine.stateMachineArn,
    });
  }
}
