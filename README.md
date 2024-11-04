# 小規模・低遅延動画配信サーバ/クライアント videmus

[mediasoup](https://mediasoup.org/) を用いた、
少人数でのゲーム画面配信を目的とした
動画配信・視聴Webアプリケーションです。

## 使用方法
videmusが`https://videmus.example.com`に配置されているとして
使用方法を説明します

基本的にトップページ
`https://videmus.example.com` にアクセスすれば
簡易的な説明付きで案内されますので、それに従って配信・視聴できます

### 配信方法
#### 配信ID発行
`https://videmus.example.com/broadcast` は、新しい配信者として
登録するための画面です
![Videmus top page screen shot](docs/videmus-top-page.png)


「新規配信IDを生成」ボタンを押すと配信用IDが無効状態で発行され、
配信管理用ページに遷移します
![Videmus broadcast page screen shot](docs/videmus-broadcast-page.png)

> [!IMPORTANT]
> 配信用IDは管理者を除く他の人には秘密にするか、
> 少人数のグループ内でのみ共有するようにして下さい
>
> これはあなた自身のVidemusにおける身分証の様なもので、
> 有効化されたIDが第三者に知られた場合、配信の乗っ取りや操作を容易に
> 行われてしまいます

#### 配信管理用ページ
配信管理用ページは `https://videmus.example.com/broadcast/<配信用ID>`
というURLにあります。
ここでは配信・視聴状況の確認と設定を行うことが出来ます。
![Videmus broadcast control page screen shot](docs/videmus-broadcast-id-page.png)


配信を行うために、管理者と連絡を取って配信IDを伝え
（全文字でなく、最初の5~6文字でも十分識別できるでしょう）
有効化してもらえる様に伝えて下さい。

管理者は（現在のところは直接データベース内の該当行を編集することで）
伝えられたIDにしたがって、`BroadcastIds` テーブルの `is_available` 列を
`0` から `1` に書き換えて有効化します

OBS配信設定もこのページに一緒に示されています。

スクリーンショットの設定に従ってOBSで配信を開始しましょう。

配信管理用ページで視聴用URLがコピーできますので、
それを視聴者に伝えれば、配信者の準備は完了です。

### 視聴方法
配信者から伝えられた視聴用URLにアクセスすれば、
動画を見ることができます。


## テスト環境起動方法
1. Gitリポジトリをクローンしたら、プロジェクトディレクトリ内で
   `pnpm install` を実行し、依存パッケージをインストールします
2. 以下の環境変数ファイルをテスト環境に合わせて記述します
   - ```env:.env.database
     DB_HOST=database
     MYSQL_USER=<任意のデータベースユーザ名>
     MYSQL_PASSWORD=<任意のデータベースパスワード>
     MYSQL_DATABASE=<任意のvidemusデータベース名>
     MYSQL_ROOT_PASSWORD=<任意のMySQLルートパスワード>
     TEST_BROADCAST_ID=<試験用に初めから有効にする配信用ID文字列>
     TEST_CHANNEL_ID=<試験用に初めから有効にするチャンネルID文字列>
     ```
   - ```env:.env.next
     NEXT_PUBLIC_HOST_URL=<テスト環境のVidemus Next.jsページURL>
     HOST_URL=<テスト環境のVidemus Next.jsページURL（同じでOK）>
     ```
   - ```env:.env.webrtc
     ANNOUNCED_IP=<テスト環境のIPアドレス>
     HOST_URL=<テスト環境のVidemus Next.jsページURL>
     ```
3. `docker compose up` コマンドを実行すると、
   一連のコンテナが立ち上がり開発環境で動作確認が出来ます

## 配置方法
### Videmus 本番環境Dockerイメージのビルド
次のコマンドでVidemus Next.jsイメージと
Videmus WebRTCサーバイメージをビルドします

`docker build -e NEXT\_PUBLIC\_HOST\_URL=<本番環境のVidemus Next.jsのURL> -t <任意のVidemus Next.jsイメージ名> -f ./next/Dockerfile.nextjs.prod .`
> [!IMPORTANT]
> Next.jsはNEXT_PUBLIC_から始まる環境変数の値をビルド時に
> 埋め込みますので、この時点で指定する必要があります
> 他の環境変数は本番環境のdocker-compose.ymlファイルなどで指定できます

`docker build -t <任意のVidemus WebRTCサーバイメージ名> -f ./webrtc/Dockerfile.webrtc.prod .`


> アプリケーションの数だけデータベースのコンテナも用意すると
> メモリ消費が多すぎて実用的でないと判断しました
>
> 本番環境は他のアプリケーションとも共用のデータベースコンテナが
> すでに存在すると仮定します
>
> そのため、データベースコンテナのビルド用設定は含まれません

これらのイメージを一度プライベートDocker Hubレジストリ等に
`docker push`する等して送信し、本番環境で使用する準備をします

本番環境用にdocker-compose.ymlを作成し、
`docker compose up -d`コマンドなどで実行できます

