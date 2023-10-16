// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0

import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as sfn from 'aws-cdk-lib/aws-stepfunctions';
import * as logs from 'aws-cdk-lib/aws-logs';
import * as iam from 'aws-cdk-lib/aws-iam';

type SfnStateMachineProps = {
  definition: any,
  type: sfn.StateMachineType,
  logLevel: sfn.LogLevel
}

export class SfnStateMachine extends Construct {
  stateMachine: sfn.IStateMachine
  role: iam.Role

  constructor(scope: Construct, id: string, props: SfnStateMachineProps) {
    super(scope, id);
    const { account, region } = cdk.Stack.of(this);
    // https://docs.aws.amazon.com/step-functions/latest/dg/procedure-create-iam-role.html#prevent-cross-service-confused-deputy
    this.role = new iam.Role(this, 'Role', {
      assumedBy: new iam.ServicePrincipal('states.amazonaws.com')
      /* X-Ray daemon cannnot assume role when condition is declared
        .withConditions({
          "ArnLike": {
            "aws:SourceArn": `arn:aws:states:${region}:${account}:stateMachine:*`
          },
          "StringEquals": {
            "aws:SourceAccount": account
          }
        }),
      */
    });
    const sfnLogGroup = new logs.LogGroup(this, 'LogGroup', {
      logGroupName: `/aws/vendedlogs/states/cdk-${cdk.Names.uniqueId(this)}`,
      removalPolicy: cdk.RemovalPolicy.DESTROY
    });
    // https://docs.aws.amazon.com/ja_jp/step-functions/latest/dg/xray-iam.html
    // https://docs.aws.amazon.com/ja_jp/step-functions/latest/dg/cw-logs.html
    this.role.addToPolicy(new iam.PolicyStatement({
      actions: [
        "xray:PutTraceSegments",
        "xray:PutTelemetryRecords",
        "xray:GetSamplingRules",
        "xray:GetSamplingTargets",
        "logs:CreateLogDelivery",
        "logs:GetLogDelivery",
        "logs:UpdateLogDelivery",
        "logs:DeleteLogDelivery",
        "logs:ListLogDeliveries",
        "logs:PutLogEvents",
        "logs:PutResourcePolicy",
        "logs:DescribeResourcePolicies",
        "logs:DescribeLogGroups"
      ],
      resources: ["*"]
    }));
    const stateMachine = new sfn.CfnStateMachine(this, 'CfnStateMachine', {
      definitionString: JSON.stringify(props.definition),
      stateMachineType: props.type,
      roleArn: this.role.roleArn,
      loggingConfiguration: {
        destinations: [{ 
          cloudWatchLogsLogGroup: {
            logGroupArn: sfnLogGroup.logGroupArn
          }
        }],
        level: props.logLevel,
        includeExecutionData: true,
      },
      tracingConfiguration: {
        enabled: true
      },
    })
    stateMachine.node.addDependency(this.role);
    stateMachine.node.addDependency(sfnLogGroup);
    this.stateMachine = sfn.StateMachine.fromStateMachineArn(this, 'StateMachine', stateMachine.attrArn);
  }
}
