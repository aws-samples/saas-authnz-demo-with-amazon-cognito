# Amazon Cognito でのマルチテナンシー

Amazon Cognito で複数のテナントを取り扱う場合、テナントごとに認証要件のカスタマイズをどこまで許容するかという観点と、認可側のロジックをどのように取り扱うかという観点を検討する必要があります。また、想定されるテナント数なども加味して複数の方法を組み合わせることも検討する場合があります。

## テナントごとの認証要件のカスタマイズ

Amazon Cognito でテナントごとに認証の要件をカスタマイズしようとすると、テナントごとにユーザープールを分割する方法やアプリケーションクライアントを分割する方法などが存在します。

### ユーザープールベースのマルチテナンシー

ユーザープールを分割する方法は最もテナントごとに柔軟な設定を提供できる選択肢です。テナントごとにパスワードポリシーやMFA設定をカスタマイズする必要があったり、テナントごとにカスタマイズされたHosted UIを用いて認証する場合に有効です。この方法を用いる場合、テナントが新規に追加されるたびにオンボーディングプロセスの中でユーザープールを作成する必要があります。加えて、認証時にはテナントごとにどのユーザープールを利用するのかを特定する必要があります。

### アプリケーションクライアントベースのマルチテナンシー

通常、複数のWebアプリケーションやモバイルアプリケーションで同じ Cognito ユーザープールを用いる場合、各アプリケーションごとにアプリケーションクライアントを作成します。アプリケーションクライアントごとに利用するアイデンティティプロバイダーや、認証フロー、トークンの有効期限を設定することができます。これをマルチテナントに応用したのがアプリケーションクライアントベースのマルチテナンシーです。

この方法は、テナントごとに個別の外部アイデンティティプロバイダーを利用したい場合や、一つのCognitoユーザーを複数のテナントにマッピングしたい場合などに有効です。ユーザープールベースのマルチテナンシー同様に、テナントが新規に追加されるたびにオンボーディングプロセスの中でアプリケーションクライアントを作成する必要がある他、認証時にはテナントごとにどのアプリケーションクライアントを利用するのかを特定する必要があります。加えて、サインインしたユーザーとテナントをマッピングする機構も別途必要となります。

本デモアプリケーションではアプリケーションクライアントベースのマルチテナンシーをベースにカスタマイズの実装例を示します。

アプリケーションの要件として、上記のようなテナントごとのカスタマイズが必要ない場合は、一つのユーザープール、アプリケーションクライアントを共有するケースもあります。この場合も、認可やテナントごとのモニタリングを目的に、下記のカスタム属性などを用いてトークンをカスタマイズし、ユーザーがどのテナントに所属するかを識別できるようにします。

## トークンのカスタマイズ

SaaS アプリケーションにおいて、リクエストがどのユーザーのものなのか、という情報に加えて、どのテナントとして送信されているかという情報は、アクセス制御だけでなく、テナントごとのモニタリングやメータリング（課金のための利用量集計）、テナント分離（他のテナントとの境界線の実装）などでも必要となります。

このどのテナントとして送信されているか、という情報ををあらかじめトークン（JSON Web Token）に入れておき、リクエストをアプリケーション全体に伝播することで、認証後のアプリケーション側でのアクセス制御のロジックをシンプルに実装することができます。Amazon Cognito においては JWT をカスタマイズする場合、カスタム属性を用いる方法、Lambda Trigger を用いる方法がありますが、本サンプルアプリケーションでは Lambda Trigger を利用する例を紹介しています。

詳細については詳細は[こちらの記事](https://aws.amazon.com/jp/builders-flash/202301/cognito-multi-tenant-saas/)や[ドキュメント](https://docs.aws.amazon.com/ja_jp/cognito/latest/developerguide/multi-tenant-application-best-practices.html)をご覧ください。