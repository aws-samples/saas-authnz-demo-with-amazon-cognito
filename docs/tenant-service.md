# テナントサービス API Reference

テナント自体やテナントのユーザーを管理するための機能を提供するマイクロサービスです。

※ 各サービスの内部では Systems Manager Parameter Store の GetParameter API を呼び出しています。この API の呼び出しはデフォルトでは 40 TPS に制限されています。これを超えるリクエスト数が想定されるワークロードでデモアプリケーションと同様にリクエストの都度パラメーターを取得する必要がある場合、AWS アカウントおよびリージョンレベルで[スループット上限を 10,000 TPS まで引き上げる](https://docs.aws.amazon.com/ja_jp/systems-manager/latest/userguide/parameter-store-throughput.html)ことが可能です。ただし追加費用が発生します。
詳細は[料金ページ](https://aws.amazon.com/jp/systems-manager/pricing/)をご覧ください。

### サービスの一覧

|サービス名|概要|
|---|---|
|[TenantOnboardService](#tenantonboardservice)|新規テナントを追加する際に呼び出されるサービスです。テナント用のアプリケーションクライアントを払い出し、テナントのメタデータをDynamoDBに書き込みます。|
|[TenantDescribeService](#tenantdescribeservice)|指定したテナントの属性を参照するためのサービスです。テナントの情報をDynamoDBに照会します。|
|[TenantUpdateService](#tenantupdateservice)|指定したテナントの属性を更新するためのサービスです。DynamoDB上のテナント情報を更新します。|
|[TenantDeleteService](#tenantdeleteservice)|指定したテナントや関連するユーザーの削除を担うサービスです。テナント用のアプリケーションクライアントや外部 IdP 情報の他、DynamoDB上のテナントに関するレコードを削除します。|
|[TenantAuthConfigService](#tenantauthconfigservice)|指定したテナントの認証設定を提供するためのサービスです。DynamoDB上に保存しているテナントのユーザープール / アプリケーションクライアントの情報を返します。|
|[UserInviteService](#userinviteservice)|指定したテナントに対して、新規ユーザーを招待するサービスです。Cognitoユーザープールにユーザーを作成し、DynamoDB上でテナントと紐づけを行うためのレコードを作成します。|
|[UserListService](#userlistservice)|指定したテナントに所属するユーザーの一覧を取得するサービスです。DynamoDBに対し、テナントに所属するユーザーの属性の一覧を照会します。|
|[UserDescribeService](#userdescribeservice)|指定したテナント内の指定したユーザーの情報を取得するサービスです。DynamoDBに対し、当該ユーザーの属性を照会します。|
|[UserUpdateService](#userupdateservice)|指定したテナント内の指定したユーザーの情報を更新するサービスです。DynamoDB上の当該ユーザーの属性を更新します。|
|[UserDeleteService](#userdeleteservice)|指定したテナント内の指定したユーザーを削除するサービスです。Cognitoユーザープールから当該ユーザーを削除し、DynamoDB上の当該ユーザーのレコードを削除します。|
|[TenantRegisterIdpService](#tenantregisteridpservice)|指定したテナントに外部 IdP を紐づけるサービスです。Cognitoユーザープールにアイデンティティプロバイダーを登録し、テナントのアプリケーションクライアントに紐づけます。|
|[TenantDescribeIdpService](#tenantdescribeidpservice)|指定したテナントに紐づいた外部 IdP 情報を参照するためのサービスです。テナントに紐づけられた外部アイデンティティプロバイダーの詳細な設定値を表示します。|
|[TenantUpdateIdpService](#tenantupdateidpservice)|指定したテナントに紐づいた外部 IdP 情報を更新するためのサービスです。テナントに紐づけられた外部アイデンティティプロバイダーの詳細な設定値を更新します。|
|[TenantDeregisterIdpService](#tenantderegisteridpservice)|指定したテナントに紐づいた外部 IdP 情報を削除するためのサービスです。Cognito ユーザープールからテナントの外部アイデンティティプロバイダーを削除し、アプリケーションクライアントの設定を更新します。|

---
## TenantOnboardService

新規テナントを追加する際に呼び出されるサービスです。利用可能なユーザープールを選択した上で、テナント用のアプリケーションクライアントを払い出し、テナントのメタデータをDynamoDBに書き込みます。利用可能なユーザープールが存在しない場合、新たなユーザープールを作成します。

### Input
```json
{
  "tenantId": <string>,
  "tenantName": <string>,
  "tier": "BASIC" | "PREMIUM"
}
```

* `tenantId` (required) : 新規作成するテナントの識別子を指定します。tenantIdは後から変更できません。
* `tenantName` (required) : テナントのユーザーフレンドリー名を指定します。
* `tier` (required) : テナントのTierを指定します。

### Output
```json
{
  "tenantId": <string>,
  "tenantName": <string>,
  "tier": "BASIC" | "PREMIUM"
}
```

テナントの追加に成功すると、入力値をそのまま返答します。

### Errors
 * *InvalidRequestError* : ユーザーからの入力が許容された値でない場合に発生するエラーです。
 * *TenantAlreadyExistsError* : テナントIDが既に使用されています。別のテナントIDを利用してください。
 * *InternalServerError* : 内部での処理に問題が発生しています。

---
## TenantDescribeService

指定したテナントの属性を参照するためのサービスです。テナントの情報をDynamoDBに照会します。

### Input
```json
{
  "tenantId": <string>
}
```

* `tenantId` (required) : 参照するテナントの識別子を指定します。

### Output
```json
{
  "tenantId": <string>,
  "tenantName": <string>,
  "tier": "BASIC" | "PREMIUM"
}
```

作成されたテナントの属性を返します。
* `tenantId` : テナントの識別子です。tenantIdは後から変更できません。
* `tenantName` : テナントのユーザーフレンドリー名です。
* `tier` : テナントのTierを表す識別子です。

### Errors
 * *InvalidRequestError* : ユーザーからの入力が許容された値でない場合に発生するエラーです。
 * *TenantNotFoundError* : 指定されたテナント ID を持つテナントが存在しません。

---
## TenantUpdateService

指定したテナントの属性を更新するためのサービスです。DynamoDB上のテナント情報を更新します。

### Input
```json
{
  "tenantId": <string>,
  "tenantName": <string>,
  "tier": "BASIC" | "PREMIUM"
}
```

* `tenantId` (required) : 更新するテナントの識別子です。
* `tenantName` (optional) : テナントのユーザーフレンドリー名を変更する場合、指定します。
* `tier` (optional) : テナントの Tier を変更する場合、指定します。

リクエストには `tenantName` と `tier` のいずれか、もしくは両方を含める必要があります。

### Output

```json
{
  "tenantId": <string>,
  "tenantName": <string>,
  "tier": "BASIC" | "PREMIUM"
}
```

更新されたテナントの属性を返します。詳細は[TenantDescribeService](#tenantdescribeservice)の Output をご参照ください。

### Errors
 * *InvalidRequestError* : ユーザーからの入力が許容された値でない場合に発生するエラーです。
 * *TenantNotFoundError* : 指定されたテナント ID を持つテナントが存在しません。
 * *InternalServerError* : 内部での処理に問題が発生しています。

---
## TenantDeleteService

指定したテナントや関連するユーザーの削除を担うサービスです。テナント用のアプリケーションクライアントや外部 IdP 情報の他、DynamoDB上のテナントに関するレコードを削除します。

### Input
```json
{
  "tenantId": <string>
}
```

* `tenantId` (required) : 削除するテナントの識別子です。

### Output
```json
{
  "result": "success"
}
```
テナントの削除に成功した場合、固定されたレスポンスを応答します。

### Errors
 * *InvalidRequestError* : ユーザーからの入力が許容された値でない場合に発生するエラーです。
 * *TenantNotFoundError* : 指定されたテナント ID を持つテナントが存在しません。
 * *InternalServerError* : 内部での処理に問題が発生しています。

---
## TenantAuthConfigService

指定したテナントの認証設定を提供するためのサービスです。DynamoDB上に保存しているテナントのユーザープール / アプリケーションクライアントの情報を返します。

### Input
```json
{
  "tenantId": <string>
}
```

* `tenantId` (required) : 認証設定を取得するテナントの識別子です。

### Output
```json
{
  "tenantId": <string>,
  "userpool": {
    "oauth": {
      "scope": [
        "openid"
      ],
      "responseType": "code",
      "domain": <string>
    },
    "userPoolWebClientId": <string>,
    "region": <string>,
    "userPoolId": <string>
  },
  "flags": {
    "federationEnabled": <boolean>
  },
}
```

* `tenantId` : テナントの識別子です。
* `userpool` : フロントエンドアプリケーション側で Amazon Cognito の API 呼び出しを行う際に必要になるパラメータです。
* `flags` : テナント内で認証オプションが有効になっているかどうかを表すフラグです。

### Errors
 * *InvalidRequestError* : ユーザーからの入力が許容された値でない場合に発生するエラーです。
 * *TenantNotFoundError* : 指定されたテナント ID を持つテナントが存在しません。

---
## UserInviteService

指定したテナントに対して、新規ユーザーを招待するサービスです。Cognitoユーザープールにユーザーを作成し、DynamoDB上でテナントと紐づけを行うためのレコードを作成します。

### Input
```json
{
  "tenantId": <string>,
  "email": <string>,
  "displayName": <string>,
  "role": "admin" | "member"
}
```
* `tenantId` (required) : テナントの識別子です。
* `email` (required) : ユーザーのメールアドレスを指定します。ユーザーの作成後、指定したメールアドレス宛に初期パスワードが記載されたメールが送信されます。アプリケーションへのサインイン時にも入力が求められます。メールアドレスは後から変更はできません。
* `displayName` (required) : ユーザーのユーザーフレンドリー名です。
* `role` (required) : テナント内でのユーザーの役割を表す固定値です。`admin` ユーザーはテナントの情報を管理する権限を持ちます。

### Output
```json
{
  "userId": <string>,
  "tenantId": <string>,
  "email": <string>,
  "displayName": <string>,
  "role": "admin" | "member",
  "type": "NATIVE_USER"
}
```

作成されたユーザーの属性を返します。詳細は[UserDescribeService](#userdescribeservice)の Output をご参照ください。

### Errors
 * *InvalidRequestError* : ユーザーからの入力が許容された値でない場合に発生するエラーです。
 * *TenantNotFoundError* : 指定されたテナント ID を持つテナントが存在しません。
 * *UserExistError* : テナント内に同じユーザーが既に存在します。
 * *InternalServerError* : 内部での処理に問題が発生しています。

---
## UserListService

指定したテナントに所属するユーザーの一覧を取得するサービスです。DynamoDBに対し、テナントに所属するユーザーの属性の一覧を照会します。

### Input
```json
{
  "tenantId": <string>
}
```

* `tenantId` (required) : ユーザーの一覧を取得するテナントの識別子です。

### Output
```json
[
  {
    "tenantId": <string>,
    "userId": <string>,
    "email": <string>,
    "displayName": <string>,
    "role": "admin" | "member",
    "type": "NATIVE_USER" | "FEDERATION_USER"
  },
  ...
]
```

テナントに所属するユーザーの属性をリストで返します。個々の項目の詳細は[UserDescribeService](#userdescribeservice)の Output をご参照ください。

### Errors
 * *InvalidRequestError* : ユーザーからの入力が許容された値でない場合に発生するエラーです。
 * *TenantNotFoundError* : 指定されたテナント ID を持つテナントが存在しません。

---
## UserDescribeService

指定したテナント内の指定したユーザーの情報を取得するサービスです。DynamoDBに対し、当該ユーザーの属性を照会します。

### Input
```json
{
  "tenantId": <string>,
  "userId": <string>
}
```

* `tenantId` (required) : ユーザーが所属するテナントの識別子です。
* `userId` (required) : 情報を取得したいユーザーの識別子です。

### Output
```json
{
  "tenantId": <string>,
  "userId": <string>,
  "email": <string>,
  "displayName": <string>,
  "role": "admin" | "member",
  "type": "NATIVE_USER" | "FEDERATION_USER"
}
```

* `tenantId` : ユーザーが所属するテナントの識別子です。
* `userId` : ユーザーの識別子です。
* `email` : ユーザーのメールアドレスです。
* `displayName` : 画面上に表示されるユーザー名です。
* `role` : テナント内でのユーザーの役割を表す固定値です。`admin` ユーザーはテナントの情報を管理する権限を持ちます。
* `type` : ユーザーのソースを表します。`NATIVE_USER` は `UserInviteService` 経由で招待されたユーザーを、`FEDERATION_USER` は外部 ID から連携されたユーザーを表します。

### Errors
 * *InvalidRequestError* : ユーザーからの入力が許容された値でない場合に発生するエラーです。
 * *UserNotFoundError* : 指定されたテナント ID / ユーザー ID を持つテナントが存在しません。

---
## UserUpdateService

指定したテナント内の指定したユーザーの情報を更新するサービスです。DynamoDB上の当該ユーザーの属性を更新します。

### Input
```json
{
  "tenantId": <string>,
  "userId": <string>,
  "displayName": <string>,
  "role": "admin" | "member"
}
```

* `tenantId` (required) : ユーザーが所属するテナントの識別子です。
* `userId` (required) : 属性を更新したいユーザーの識別子です。
* `displayName` (optional) :  画面上に表示されるユーザー名を変更する場合に指定します。
* `role` (optional) : テナント内でのユーザーの役割を変更する場合に指定します。

### Output
```json
{
  "tenantId": <string>,
  "userId": <string>,
  "email": <string>,
  "displayName": <string>,
  "role": "admin" | "member",
  "type": "NATIVE_USER" | "FEDERATION_USER"
}
```

更新後のユーザーのすべての属性を返します。個々の項目の詳細は[UserDescribeService](#userdescribeservice)の Output をご参照ください。

### Errors
 * *InvalidRequestError* : ユーザーからの入力が許容された値でない場合に発生するエラーです。
 * *UserNotFoundError* : 指定されたテナント ID / ユーザー ID を持つテナントが存在しません。
 * *InternalServerError* : 内部での処理に問題が発生しています。

---
## UserDeleteService

指定したテナント内の指定したユーザーを削除するサービスです。Cognitoユーザープールから当該ユーザーを削除し、DynamoDB上の当該ユーザーのレコードを削除します。

### Input
```json
{
  "tenantId": <string>,
  "userId": <string>
}
```

* `tenantId` (required) : ユーザーが所属するテナントの識別子です。
* `userId` (required) : 削除したいユーザーの識別子です。

### Output
```json
{
  "result": "success"
}
```

テナントの削除に成功した場合、固定されたレスポンスを応答します。

### Errors
 * *InvalidRequestError* : ユーザーからの入力が許容された値でない場合に発生するエラーです。
 * *TenantNotFoundError* : 指定されたテナント ID を持つテナントが存在しません。
 * *UserNotFoundError* : 指定されたテナント ID / ユーザー ID を持つテナントが存在しません。

---
## TenantRegisterIdpService

指定したテナントに外部 IdP を紐づけるサービスです。Cognitoユーザープールにアイデンティティプロバイダーを登録し、テナントのアプリケーションクライアントに紐づけます。

### Input
```json
{
  "tenantId": <string>,
  "providerType": "SAML" | "OIDC",
  "providerDetails": {
    "MetadataURL": <string>,
    "MetadataFile": <string>,
    "oidc_issuer": <string>,
    "client_id": <string>,
    "client_secret": <string>,
    "attributes_request_method": "GET" | "POST",
    "authorize_scopes": <string>
},
  "emailMappingAttribute": <string>
}
```

* `tenantId` (required) : 外部 IdP を紐づける対象のテナントの識別子です。
* `providerType` (required) : 外部 IdP との連携方法を指定します。詳細は Amazon Cognito ドキュメントの [SAML プロバイダーの追加](https://docs.aws.amazon.com/ja_jp/cognito/latest/developerguide/cognito-user-pools-saml-idp.html)および [OIDC プロバイダーの追加](https://docs.aws.amazon.com/ja_jp/cognito/latest/developerguide/cognito-user-pools-oidc-idp.html) をご参照ください。
* `providerDetails` (required) : `providerType` ごとに必要なパラメータを指定します。
  * `providerType == "SAML"` の場合、 SAML での接続に必要なメタデータドキュメントを以下のいずれかのパラメータで指定します。
    * `MetadataFile` (optional) : ID プロバイダの SAML メタデータドキュメントを直接記述します。
    * `MetadataURL` (optional) : ID プロバイダの SAML メタデータドキュメントが配置された URL を指定します。Amazon Cognito は指定した URL からメタデータドキュメントを自動的にダウンロードして利用します。
  * `providerType == "OIDC"` の場合、以下のパラメータを指定します。
    * `oidc_issuer` (required) : OpenID Provider の Issuer Identifier を指定します。ID Token の `iss` クレームで表される値です。認可、トークン、userInfo および JWKS の各種エンドポイントなどの情報は Issuer の `/.well-known/openid-configuration` エンドポイントから取得されます。本デモアプリケーションではサポートしていませんが、Amazon Cognito ではこのエンドポイントを持っていない場合、直接認可エンドポイントやトークンエンドポイントを指定することも可能です。
    * `client_id` (required) : OpenID Provider の発行するクライアント ID を指定します。
    * `client_secret` (required) : OpenID Provider の発行するクライアントシークレットを指定します。
    * `attributes_request_method` (required) : Amazon Cognito が OpenID Provider の userInfo エンドポイントにリクエストを送信する際のメソッドを `GET` もしくは `POST` で指定します。
    * `authorize_scopes` : アプリケーションが OpenID Provider に要求する `scope` をスペース区切りで指定します。`openid` は必須です。
* `emailMappingAttribute` (required) : SAML および OpenID Connect で外部 IdP から連携されるユーザーの属性のうち、ユーザーのメールアドレスを示す属性を指定します。この属性は Amazon Cognito に作成されるユーザーの email 属性、およびアプリケーションのユーザーの email 属性に反映されます。なお、**外部 IdP から連携されたメールアドレスは Amazon Cognito では検証されません。アプリケーション内で認可などのロジックに利用する場合には、アプリケーションの責務でメールを送信して、ユーザーがメールアドレスを所持していることを確認する必要があります。**

### Output
```json
{
  "tenantId": <string>,
  "providerType": "SAML" | "OIDC",
  "providerDetails": {
    "MetadataURL": <string>,
    "MetadataFile": <string>,
    "oidc_issuer": <string>,
    "client_id": <string>,
    "client_secret": <string>,
    "attributes_request_method": "GET" | "POST",
    "authorize_scopes": <string>
},
  "emailMappingAttribute": <string>
}
```

外部 IdP の設定が完了すると、入力したパラメータが応答されます。

### Errors
 * *InvalidRequestError* : ユーザーからの入力が許容された値でない場合に発生するエラーです。
 * *TenantNotFoundError* : 指定されたテナント ID を持つテナントが存在しません。
 * *InternalServerError* : 内部での処理に問題が発生しています。
 * *SettingAlreadyExistsError* : 外部 IdP の設定が既に存在します。一つのテナントに紐付けられる IdP は一つまでです。

### Remarks
センシティブデータがログに出力されないよう、ステートマシンからのログ出力は無効化されています。実行ログが残りませんが意図的なものです。

---
## TenantDescribeIdpService

指定したテナントに紐づいた外部 IdP 情報を参照するためのサービスです。テナントに紐づけられた外部アイデンティティプロバイダーの詳細な設定値を表示します。

### Input
```json
{
  "tenantId": <string>
}
```

* `tenantId` (required) : 外部 IdP 情報を取得するテナントの識別子です。

### Output
```json
{
  "tenantId": <string>,
  "providerType": "SAML" | "OIDC",
  "providerDetails": {
    "MetadataURL": <string>,
    "MetadataFile": <string>,
    "oidc_issuer": <string>,
    "client_id": <string>,
    "client_secret": <string>,
    "attributes_request_method": "GET" | "POST",
    "authorize_scopes": <string>
},
  "emailMappingAttribute": <string>
}
```
外部 IdP に関する設定値を応答します。各パラメータの詳細は [TenantRegisterIdpService](#tenantregisteridpservice) の Input および Output をご参照ください。

### Errors
 * *InvalidRequestError* : ユーザーからの入力が許容された値でない場合に発生するエラーです。
 * *TenantNotFoundError* : 指定されたテナント ID を持つテナントが存在しません。
 * *SettingNotExistsError* : 外部 IdP の設定が存在しません。
 * *InternalServerError* : 内部での処理に問題が発生しています。

### Remarks
センシティブデータがログに出力されないよう、ステートマシンからのログ出力は無効化されています。実行ログが残りませんが意図的なものです。

---
## TenantUpdateIdpService

指定したテナントに紐づいた外部 IdP 情報を更新するためのサービスです。テナントに紐づけられた外部アイデンティティプロバイダーの詳細な設定値を更新します。

### Input
```json
{
  "tenantId": <string>,
  "providerDetails": {
    "MetadataURL": <string>,
    "MetadataFile": <string>,
    "oidc_issuer": <string>,
    "client_id": <string>,
    "client_secret": <string>,
    "attributes_request_method": "GET" | "POST",
    "authorize_scopes": <string>
},
  "emailMappingAttribute": <string>
}
```

* `tenantId` (required)
* `providerDetails` (required)
* `emailMappingAttribute` (required)

更新する外部 IdP の各パラメータを指定します。各パラメータの詳細は [TenantRegisterIdpService](#tenantregisteridpservice) の Input をご参照ください。
TenantUpdateIdpService では`providerType` を変更することはできません。`providerType` を後から変更する場合、一度外部 IdP 設定を削除したのち、再度作成してください。

### Output
```json
{
  "tenantId": <string>,
  "providerType": "SAML" | "OIDC",
  "providerDetails": {
    "MetadataURL": <string>,
    "MetadataFile": <string>,
    "oidc_issuer": <string>,
    "client_id": <string>,
    "client_secret": <string>,
    "attributes_request_method": "GET" | "POST",
    "authorize_scopes": <string>
},
  "emailMappingAttribute": <string>
}
```

更新後の外部 IdP の属性値を応答します。各属性の詳細は [TenantRegisterIdpService](#tenantregisteridpservice) の Output をご参照ください。

### Errors
 * *InvalidRequestError* : ユーザーからの入力が許容された値でない場合に発生するエラーです。
 * *TenantNotFoundError* : 指定されたテナント ID を持つテナントが存在しません。
 * *SettingNotExistsError* : 外部 IdP の設定が存在しません。
 * *InternalServerError* : 内部での処理に問題が発生しています。

### Remarks
センシティブデータがログに出力されないよう、ステートマシンからのログ出力は無効化されています。実行ログが残りませんが意図的なものです。

---
## TenantDeregisterIdpService

指定したテナントに紐づいた外部 IdP 情報を削除するためのサービスです。Cognito ユーザープールからテナントの外部アイデンティティプロバイダーを削除し、アプリケーションクライアントの設定を更新します。

### Input
```json
{
  "tenantId": <string>
}
```

* `tenantId` (required) : 外部 IdP 情報を削除するテナントの識別子です。

### Output
```json
{
  "result": "success"
}
```

外部 IdP 設定の削除が完了すると、固定レスポンスを応答します。

### Errors
 * *InvalidRequestError* : ユーザーからの入力が許容された値でない場合に発生するエラーです。
 * *TenantNotFoundError* : 指定されたテナント ID を持つテナントが存在しません。
 * *SettingNotExistsError* : 外部 IdP の設定が存在しません。
 * *InternalServerError* : 内部での処理に問題が発生しています。
