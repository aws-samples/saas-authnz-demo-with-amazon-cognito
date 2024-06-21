# 外部 IdP を用いたフェデレーションサインインの詳細

[フェデレーションによるサインイン](/docs/manage-tenant-and-users.md#3-フェデレーションによるサインイン) では IAM Identity Center を IdP としてアプリケーションにログインできることを確認しました。この裏側ではテナントサービスがユーザープール内にテナント用の外部 IdP の設定を作成しています。本ドキュメントではその内容を解説します。

## 1. テナントへの外部 IdP の登録

[外部 IdP の設定](/docs/manage-tenant-and-users.md#31-外部-idp-の設定)では SAML で接続するため、IdP である IAM Identity Center のメタデータ URL をアプリケーションに登録しました。

![](/docs/images/idp-management.png)

この時、裏側では `/api/idp-mapping` に `POST` リクエストが行われています。[こちら](/docs/authorize.md#1-lambda-authorizer-の呼び出し)に記載の通り、この API 呼び出しの結果、テナントサービスの一部である [TenantRegisterIdpService](/docs/tenant-service.md#tenantregisteridpservice) が呼び出されます。

`TenantRegisterIdpService` の内部ではユーザープールに外部 IdP を登録するため、 [CreateIdentityProvider](https://docs.aws.amazon.com/cognito-user-identity-pools/latest/APIReference/API_CreateIdentityProvider.html) API を呼び出しています。この際、外部 IdP 名は `external-idp-<テナントID>` という命名規則に従って付与しています。

IdP の登録時には外部 IdP 側で保有している値をユーザープールにマッピングすることができます。本デモアプリケーションでは、`email属性マッピング` のパラメータで指定した属性（SAML Assersion / OIDC Claims）をユーザープールの `custom:emailFromIdp` にマッピングしています。

マッピングをするためにはアプリケーションクライアントでそのユーザー属性に対して書き込み権限を設定する必要があります。ただし、本デモアプリケーションでは、[オンボーディング](/docs/onboarding.md#22-ユーザープールの確認)で説明した通り、ユーザーに [UpdateUserAttiributes](https://docs.aws.amazon.com/cognito-user-identity-pools/latest/APIReference/API_UpdateUserAttributes.html) API などによるメールアドレスの変更を行わせないため、アプリケーションクライアント側で `email` 属性への書き込みを禁止しています。このため、外部 IdP 側からマッピングされる属性には専用の属性を利用しています。

![](/docs/images/tenant-register-idp-service.png)

外部 IdP の登録が完了すると、テナント用のアプリケーションクライアントで上記の IdP を利用するように設定します。これにより、各アプリケーションクライアントが[フェデレーションエンドポイント](https://docs.aws.amazon.com/cognito/latest/developerguide/federation-endpoints.html)を利用して外部 IdP によるサインインを実現できるようになります。Amazon Cognito ではアプリクライアント単位でどの外部 IdP を利用するかを指定することができますが、ここでは、`tenant-a` の外部 IdP とアプリクライアントを 1 対 1 で対応させています。これにより、テナント管理者や IdP に対する管理権限を持ったユーザーであっても、そのテナント内でしかサインインすることができないように制御を行なっています。

最後に `TenantRegisterIdpService` は DynamoDB 上の `authconfig` レコードの `federationEnabled` の値を更新します。この値はデモアプリケーションのフロントエンド側で `外部IDでログイン` のボタンを表示させるだけに利用しています。


## 2. フェデレーションサインイン時の挙動

テナントごとのログインページにアクセスすると、[通常サインインと同様に](/docs/sign-in.md#3-サインイン)、 `/api/authconfig/<tenantId>` エンドポイントにユーザープールやアプリケーションクライアントの ID を問い合わせます。この際、前述の `federationEnabled` の値が Boolean で取得できるので、これを元に [外部 ID でログイン] ボタンを描画します。

[Login.tsx](/web/src/page/Login.tsx#87)
```typescript
...
<Button variation="primary" onClick={() => signInWithRedirect({provider: {custom: `external-idp-${tenantId}`}})}>
  <Trans
    i18nKey="sign-in-page.general.federatedSignIn"
  />
</Button>
...
```
[外部 ID でログイン] ボタンがクリックされると、`signInWithRedirect()` が呼び出され、Cognito の[認可エンドポイント](https://docs.aws.amazon.com/ja_jp/cognito/latest/developerguide/authorization-endpoint.html)にリダイレクトされます。この際、`provider.custom`で指定した IdP 名が `identity_provider` パラメーターとして渡され、そのまま IdP のサインインページにリダイレクトされます。

なお、Cognito の認可エンドポイントは `Amplify.configure()` で指定した Cognito のドメインにホストされています。Amplify.configure() にはバックエンドから取得された値を元に以下のような設定が行われています。

```tsx
{
  Auth: {
    Cognito: {
      userPoolId: USER_POOL_ID,
      userPoolClientId: APP_CLIENT_ID,
      loginWith: {
        oauth: {
          domain: OAUTH_ENDPOINT,
          scopes: ['openid'],
          redirectSignIn: [`${CURRENT_DOMAIN}/login/${tenantId}`],
          redirectSignOut: [`${CURRENT_DOMAIN}/logout`],
          responseType: 'code',
        },
      }
    }
}
```

外部 IdP の画面上での認証が成功すると再度 Amazon Cognito にリダイレクトされます。その後、[ユーザープール内に新たなユーザープロファイルが作成](https://docs.aws.amazon.com/ja_jp/cognito/latest/developerguide/cognito-user-pools-saml-idp-authentication.html)されたのち、アプリケーションのログイン画面にリダイレクトされます。詳細はデベロッパーガイドの[SAML ユーザープール IDP 認証フロー](https://docs.aws.amazon.com/ja_jp/cognito/latest/developerguide/cognito-user-pools-saml-idp-authentication.html)および [OIDC ユーザープール IDP 認証フロー](https://docs.aws.amazon.com/ja_jp/cognito/latest/developerguide/cognito-user-pools-oidc-flow.html) をご覧ください。

アプリケーションのログイン画面には、Amazon Cognito の発行した認可コード（URL末尾の `code=XXXXX`）が付与された状態でリダイレクトされます。Amplify Library は `Amplify.configure()` が呼び出されると、自動的に認可コードを利用して Amazon Cognito のトークンエンドポイントにリクエストを行い、アクセストークン、ID トークンおよびリフレッシュトークンを取得します。

なお、[サインイン後画面](/docs/sign-in.md#4-サインイン後画面) でも触れた通り、DynamoDB 上にテナントとユーザーの対応づけがない場合、[トークン生成前の Lambda トリガー](/src/cdk/functions/cognito-pre-token-generation/index.ts)の実行中にエラーが発生し、アプリケーションのサインインが失敗してしまいます。そこで、[ユーザー確認後の Lambda トリガー](/src/cdk/functions/cognito-post-confirmation/index.ts)を用いて外部 IdP のユーザーが最初に Cognito ユーザープール上に作成されたタイミングで DynamoDB 上でもテナントに紐付けをおこなっています。
