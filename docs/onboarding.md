# オンボーディング

テナントサービスの API を呼び出して、新規テナントおよびユーザーをプロビジョニングします。


## 1. テナントとユーザーの作成

### 1.1 GUI を利用する場合 (Option 1)

[AWS Step Functions](https://console.aws.amazon.com/states/home#/statemachines) にアクセスし、 `TenantOnboardService` から始まるステートマシンを選択後、[実行を開始] を押下します。

`入力` に以下の内容を記入後、[実行を開始] をクリックします。
```json
{
  "tenantId": "tenant-a",
  "tenantName": "テナントA株式会社",
  "tier": "PREMIUM"
}
```

![](/docs/images/sfn-execute.png)

実行ステータスが「成功」と表示され、テナントが作成されていることを確認します。

`TenantOnboardingService` は新たなテナントの情報を Amazon DynamoDB に登録し、Cognito ユーザープール内に新たなアプリケーションクライアントを作成します。`TenantOnboardingService` はユーザープールあたりのテナント数を管理し、利用可能なユーザープールが存在しない場合、ユーザープールの作成を試みます。

**備考 :** Amazon Cognito にはクォータが存在し、例えば、ユーザープールあたりのアプリケーションクライアント数については制限があります。詳細については [Amazon Cognito でのマルチテナンシー](/docs/cognito-multi-tenancy.md)をご参照ください。

同様に、以下の入力を元に別のテナントを登録します。
```json
{
  "tenantId": "tenant-b",
  "tenantName": "テナントB株式会社",
  "tier": "BASIC"
}
```

同様に `UserInviteService` から始まるステートマシンを実行し、以下の入力を元にユーザーを作成します。

***user-a***
```json
{
  "tenantId": "tenant-a",
  "displayName": "user-a",
  "email": "<YOUR EMAIL>",
  "role": "admin"
}
```

***user-b***
```json
{
  "tenantId": "tenant-b",
  "displayName": "user-b",
  "email": "<YOUR EMAIL>",
  "role": "admin"
}
```

`UserInviteService` は Cognito ユーザープールと DynamoDB テーブルにユーザーの情報を登録します。テナントおよびユーザーが正しく作成されたことを確認できたら、[2. 作成されたテナント・ユーザーの確認](#2-作成されたテナント・ユーザーの確認)に移ります。

## 1.2 CLI を利用する場合 (Option 2)

CloudFormation Stack の出力から Step Functions ステートマシン名を取得し、実行します。
```bash
TenantOnboardService=$(aws cloudformation describe-stacks --stack-name SaaSAuthDemoStack --output text --query "Stacks[*].Outputs[?OutputKey=='TenantOnboardServiceArn'].OutputValue")
UserInviteService=$(aws cloudformation describe-stacks --stack-name SaaSAuthDemoStack --output text --query "Stacks[*].Outputs[?OutputKey=='UserInviteServiceArn'].OutputValue")
```

tenant-a の作成
```bash
INPUT="{\"tenantId\": \"tenant-a\", \"tenantName\": \"テナントA株式会社\", \"tier\": \"PREMIUM\"}"
aws stepfunctions start-execution --state-machine-arn $TenantOnboardService --input $INPUT
```
tenant-b の作成
```bash
INPUT="{\"tenantId\": \"tenant-b\", \"tenantName\": \"テナントB株式会社\", \"tier\": \"BASIC\"}"
aws stepfunctions start-execution --state-machine-arn $TenantOnboardService --input $INPUT
```
user-a の作成（`<YOUR EMAIL>` にはご自身のメールアドレスを入力してください。）
```bash
INPUT="{\"tenantId\": \"tenant-a\", \"displayName\": \"user-a\", \"role\": \"admin\", \"email\": \"<YOUR EMAIL>\"}"
aws stepfunctions start-execution --state-machine-arn $UserInviteService --input $INPUT
```
user-b の作成（`<YOUR EMAIL>` にはご自身のメールアドレスを入力してください。）
```bash
INPUT="{\"tenantId\": \"tenant-b\", \"displayName\": \"user-b\", \"role\": \"admin\", \"email\": \"<YOUR EMAIL>\"}"
aws stepfunctions start-execution --state-machine-arn $UserInviteService --input $INPUT
```

コマンド実行後、作成されたテナント・ユーザーの確認に移ります。

## 2. 作成されたテナント・ユーザーの確認

### 2.1 DynamoDB 上のレコードの確認
[Amazon DynamoDB コンソール](https://console.aws.amazon.com/dynamodbv2/home#tables)にアクセスし、**SaaSAuthDemoStack-MainTable** から始まるテーブルのレコードを確認します。

![](/docs/images/ddb-table.png)

作成された UserPool に関するレコードのほか、テナントに関するレコードが 2 件ずつ、ユーザーに関するレコードが 1 件ずつ登録されていることが確認できます。

### 2.2 ユーザープールの確認
[Amazon Cognito コンソール](console.aws.amazon.com/cognito/v2/idp/user-pools)にアクセスし、`saasdemo-` から始まるユーザープールを確認します。
作成したユーザー、およびテナント用のアプリケーションクライアントが存在することを確認します。

![ユーザー一覧](/docs/images/users.png)
![アプリケーションクライアント一覧](/docs/images/app-client.png)

本デモアプリケーションでは、各ユーザー`<tenantId>#<email>`という名前で作成されています。これは、複数のテナントに対し、同じメールアドレスでユーザーを登録した場合にユーザー名の重複が発生しないように意図的にテナントIDを付与しているためです。実際のサインインの際には画面上での処理にてユーザーが意識せずにテナントIDを付与する実装としています。

**備考 :** B2B SaaS アプリケーションにおいては、管理者によってユーザーが招待された後に、ユーザーが自らのメールアドレスをフリーメールアドレス等に変更することを禁止したい場合があります。今回のアプリケーションにおいてもユーザーによるメールアドレスの変更を想定していません。

以上でテナントとユーザーの作成は完了です。