# JWT の属性を用いた認可

[テナントおよびユーザーの管理](manage-tenant-and-users.md)の裏側では API Gateway 経由でリソースの操作が行われています。
通常、SaaS アプリケーションの内部では必要に応じてコントロールプレーンの API が呼び出されます。デモアプリケーションでは、ユーザーの ID トークンに含まれる属性を用いてきめ細やかな認可を行い、ユーザーの所属するテナントのスコープを指定した上で直接テナントサービスの API を呼び出しています。

![Architecture](/docs/images/architecture.png)

SaaS アプリケーションにおいては、テナントや契約プラン、ユーザーロールなどの複数の要素に基づいてアクセス制御を行う必要がありますデモアプリケーションでは、上記アーキテクチャ図の (6) - (8) で示される通り API Gateway に到達したリクエストは、Lambda Authorizer 経由で　Amazon Verified Permissions で検証され、ユーザーが API を呼び出す権限を持っているかを確認します。Amazon Verified Permissions はユーザーの役割や属性を使用して、ポリシーベースのアクセス制御を定義し、きめ細やかなアクセス制御を行うことができます。

## 1. Lambda Authorizer の呼び出し

API Gateway では Authorizer を利用することで、統合先にリクエストを送信する前に HTTP Header に付与されたトークンなどを元にアクセスを制御することができます。特に Lambda Authorizer を用いることで、リクエストのメソッドやパス、トークン内の属性を元にした認可を実装できます。Authorizer では認可した結果を一定期間キャッシュする機能があります。これにより、リクエストの度に Lambda 関数が呼び出されることを防ぐことができます。キャッシュのキーは Authorizer の ID ソースとして指定することが可能です。

本アプリケーションでは、以下のようにユーザーの属性に応じたアクセス制御を実装していきます。

|Action|Method|Resource Path|統合されるサービス|アクセス可能なユーザー|
|---|---|---|---|---|
|DescribeTenantInfo|GET|/api/tenantinfo|[TenantDescribeService](/docs/tenant-service.md#tenantdescribeservice)|全ユーザー|
|UpdateTenantInfo|PUT|/api/tenantinfo|[TenantUpdateService](/docs/tenant-service.md#tenantupdateservice)|`admin` ユーザーのみ|
|InviteUser|POST|/api/user|[UserInviteService](/docs/tenant-service.md#userinviteservice)|`admin` ユーザーのみ|
|ListUser|GET|/api/user|[UserListService](/docs/tenant-service.md#userlistservice)|全ユーザー|
|DescribeUser|GET|/api/user/{userId}|[UserDescribeService](/docs/tenant-service.md#userdescribeservice)|全ユーザー|
|UpdateUserProfile|PUT|/api/user/{userId}/profile|[UserUpdateService](/docs/tenant-service.md#userupdateservice)|* userId == sub の場合：全ユーザー<br>* userId != sub の場合：`admin` ユーザー|
|UpdateUserRole|PUT|/api/user/{userId}/role|[UserUpdateService](/docs/tenant-service.md#userupdateservice)|* userId == sub の場合：**全ユーザーアクセス不可**<br>* userId != sub の場合：`admin` ユーザーのみ|
|DeleteUser|DELETE|/api/user/{userId}|[UserDeleteService](/docs/tenant-service.md#userdeleteservice)|* userId == sub の場合：**全ユーザーアクセス不可**<br>* userId != sub の場合：`admin` ユーザーのみ|
|CreateIdpMapping|POST|/api/idp-mapping|[TenantRegisterIdpService](/docs/tenant-service.md#tenantregisteridpservice)|`PREMIUM` Tier かつ<br>`admin` ユーザーのみ|
|DescribeIdpMapping|GET|/api/idp-mapping|[TenantDescribeIdpService](/docs/tenant-service.md#tenantdescribeidpservice)|`admin` ユーザーのみ|
|UpdateIdpMapping|PUT|/api/idp-mapping|[TenantUpdateIdpService](/docs/tenant-service.md#tenantupdateidpservice)|`PREMIUM` Tier かつ<br>`admin` ユーザーのみ|
|DeleteIdpMapping|DELETE|/api/idp-mapping|[TenantDeregisterIdpService](/docs/tenant-service.md#tenantderegisteridpservice)|`admin` ユーザーのみ|

Lambda Authorizer の中でプログラムコードとして ID トークンの検証やリクエストに応じた認可を `if` 文による分岐を用いて実装することも可能ですが、将来的に上記以外にも新たな条件が追加される可能性が考えられます。ユーザーが MFA を利用していない場合に特定のアクションを拒否する必要が出てくるかもしれません。また、新たな機能やテナントの契約プラン（Tier）が追加されることもありえます。
Amazon Verified Permissions はこれらの認可ロジックをポリシーという単位で見通しよく管理することを可能にします。認可の判断を Amazon Verified Permissions に任せることで、将来的な機能の追加にも柔軟に対応していくことができます。

## 2. Amazon Verified Permissions でのトークンの検証

Amazon Verified Permissions は Amazon Cognito と統合されており、[isAuthorizedWithToken](https://docs.aws.amazon.com/verifiedpermissions/latest/apireference/API_IsAuthorizedWithToken.html) を呼び出すことで、あらかじめ `ID ソース`として指定したユーザープールのトークンを検証し、そのトークンに含まれる属性を元にアクセス制御を行うことが可能です。

[Amazon Verified Permissions コンソール](https://console.aws.amazon.com/verifiedpermissions/)にアクセスし、CloudFormation によってデプロイされたポリシーストアを選択します。
左側のメニューから ID ソースを選択すると、[オンボーディング](/docs/onboarding.md#22-ユーザープールの確認)時に確認したユーザープールが登録されていることを確認できます。

![Identity Source](/docs/images/avp-id-source.png)

続いて、左側メニューからスキーマを選択すると、エンティティタイプとして `Resource` と `User` が存在します。`User` をクリックし、先ほどのユーザープールがマッピングされた `User` エンティティタイプの中身を確認します。エンティティ属性として `sub` / `userRole` / `tenantTier` / `tenantId` が設定されています。これらのエンティティ属性はポリシーの中で利用できる変数で、`isAuthorizedWithToken` API に対してID トークンを渡すことで、ID トークンの同じ名前のクレーム名から値を取り出し、ポリシー内で参照することが可能です。

![Schema](/docs/images/avp-schema.png)

次に、ポリシーを確認していきます。Amazon Verified Permissions では Cedar と呼ばれるポリシーを定義することで、アクセスを制御します。コンソールの左側メニューからポリシーを選ぶと定義されたポリシーが参照できます。説明に `admin users can manage tenant, idp and users` と書かれたポリシーのラジオボタンを選択して以下のようなポリシーが表示されるのを確認します。

```
permit (
    principal,
    action in [
        ApiAccess::Action::"UpdateTenantInfo",
        ApiAccess::Action::"InviteUser",
        ApiAccess::Action::"UpdateUserProfile",
        ApiAccess::Action::"UpdateUserRole",
        ApiAccess::Action::"DeleteUser",
        ApiAccess::Action::"CreateIdpMapping",
        ApiAccess::Action::"UpdateIdpMapping",
        ApiAccess::Action::"DescribeIdpMapping",
        ApiAccess::Action::"DeleteIdpMapping"
    ],
    resource
)
when {
    principal.userRole == "admin"
};
```

このポリシーでは `userRole == admin` の役割を持ったユーザーテナントの情報、ユーザー、そして IdP の情報を操作できることを示しています。続いて、`prevent users from deleting themselves or changing their own priviledges` と書かれたポリシーを確認します。

```
forbid (
    principal,
    action in [
        ApiAccess::Action::"UpdateUserRole",
        ApiAccess::Action::"DeleteUser"
    ],
    resource
)
when {
    resource.pathParameters has userId &&
    resource.pathParameters.userId == principal.sub
};
```

このポリシーでは上記の表の `userId == sub の場合：全ユーザーアクセス不可` の条件を満たすロジックを表現しています。

ここでは一部のみ紹介していますが、上記のように、Amazon Verified Permissions ではポリシーを用いてスケールする形でアプリケーションのアクセス制御を管理していただけます。詳細は [SaaS AuthN/Z Workshop](https://catalog.us-east-1.prod.workshops.aws/workshops/9180bbda-7747-4b8f-ac05-14e7f258fcea/ja-JP/50-lab3/53-verified-permissions) をご覧ください。

## 3. Lambda Authorizer の出力の利用

API Gateway では Authorizer の出力を後段のアプリケーションに渡すことが可能です。例えば Lambda Authorizer で出力した tenantId の値を、API Gateway のマッピングテンプレートという機能を使ってバックエンドに渡すデータを変換したり、ヘッダーに付与したり、API Gateway のアクセスログに記録したりということができます。詳細は[こちら](https://docs.aws.amazon.com/ja_jp/apigateway/latest/developerguide/api-gateway-mapping-template-reference.html)をご参照ください。

本デモアプリケーションでは API Gateway からバックエンドであるテナントサービスを直接呼び出していますが、この際に Lambda Authorizer から出力した `tenantId` をパラメーターとして渡しています。例えば、`POST /api/user` API では [UserInviteService](/docs/tenant-service.md#userinviteservice) を呼び出す際のパラメーターには `$context.authorizer.tenantId` からの値を取得するようになっています。

```json
#set($root = $input.path('$'))
#set($root.REQUEST_DATA = {})
#set($requestData = $root.REQUEST_DATA)
#set($requestData.tenantId = "$context.authorizer.tenantId")
#set($requestData.displayName = $input.path('$.displayName'))
#set($requestData.email = $input.path('$.email'))
#set($requestData.role = $input.path('$.role'))
{
  "stateMachineArn": "arn:aws:states:<region>:<account-id>:stateMachine:UserInviteServiceXXXXXXXX",
  "input": "$util.escapeJavaScript($input.json('$.REQUEST_DATA')).replaceAll("\\'","'")"
}
```

これにより、アプリケーションからは、JWT に含まれるテナント ID にスコープを絞った形で Tenant Service の機能を利用できるようにしています。