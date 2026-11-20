# 02. アーキテクチャ

## 1. 技術スタック

フルスタックを 1 人で開発するため、**TypeScript に統一**し、フロントエンドとバックエンドの両方を
カバーするメジャーなオープンソースのものを選ぶ。

| 層 | 採用 |
|---|---|
| UI | Next.js 16（App Router・Server Components・Server Actions）+ React 19 + Tailwind CSS 4 + Headless UI / SWR（ポーリング） |
| API | Hono（resource-server / media-server とも）+ `@hono/node-server`、パッケージ間は Hono RPC で型を共有 |
| メディア | mediasoup 3（サーバ側 SFU）/ mediasoup-client（視聴側、および WHIP の SDP 処理にも流用）/ sdp-transform |
| DB | MySQL 8.4 + Drizzle ORM 1.0（beta 追従）/ mysql2 |
| ID | 配信 ID は UUID v4、チャンネル ID は nanoid |

Next.js を選んだ理由と限界: Next.js はリクエストをまたぐ状態を持てない（サーバーレス前提で、
複数起動・停止されうる）。OBS からの配信を受け続け、視聴者に送り続ける処理は Next.js では書けないので、
**常駐するサーバを別に持つ**。mediasoup のオブジェクトはこの常駐サーバのメモリに置く。

## 2. パッケージ構成

pnpm workspace の monorepo。

| パッケージ | 役割 |
|---|---|
| `next` | 配信者の管理ページと視聴ページ。DB には直接触らず、resource-server を API_KEY 付きで呼ぶ（Server Components / Server Actions から） |
| `resource-server` | **外向きの API の窓口**。DB の CRUD と、WHIP・視聴用 API の media-server への中継を受け持つ（ポート 4000） |
| `media-server` | **mediasoup を持つ常駐サーバ**。配信リソースをメモリに保持する。DB には触らない（ポート 4001、WebRTC は 44400） |
| `database` | Drizzle のスキーマと DB 操作の関数。resource-server から import される |

### 2.1 resource-server と media-server を分けている理由

DB と認証の関心事を resource-server に、メディアの関心事を media-server に分ける
（2026-03 の分割。それまでは 1 つの WebRTC サーバだった）。

- media-server は DB を知らない。WHIP を受けたときに必要な「現在のチャンネル ID」は、
  resource-server が DB で検証したうえで `X-Current-Channel-Id` ヘッダに載せて渡す（[04](./04-media.md) §1）。
- resource-server から media-server への呼び出しは Hono RPC（`hc<MediaAppType>`）で型付けしている。
- media-server の内部 API（`/internal/*`）は resource-server からだけ呼ばれる想定（[05](./05-api.md) §2）。

## 3. 配置

- **next**: Vercel にデプロイする（root ディレクトリは `next/`）。
  `next/Dockerfile.nextjs.prod` も残っているが本番では使っていない（[07](./07-roadmap.md) §2 の片付け）。
- **resource-server / media-server**: VPS 上の docker compose で動かす。イメージは GitHub Actions
  （`.github/workflows/build-push-images.yml`。main への push と手動起動）でビルドし、
  `ghcr.io/daiius/videmus-{resource-server,media-server}` に `:<commit sha>` で push する。
  `:latest`（本番が追いかけるタグ）は、同じ workflow の job「promote」だけが動かす（§3.1）。
  手元からは `scripts/push-images.sh` で作れる（Actions が使えないとき・枝のイメージを作るとき）。
  付けるのは `:<commit sha>` だけで、**`:latest` は手元から push しない**（追従は有効なので、push した版がそのまま本番に出る）。
  - ビルドのときに版（コミットの SHA・ビルド日時・dirty か）をビルド引数で渡す。イメージはそれを ENV に持ち、
    `GET /version` で返す（[05](./05-api.md) §4）。
  - **本番の compose はこのリポジトリの外で管理している。** リポジトリの `docker-compose.prod.yml` は
    image・build・volumes・develop しか上書きしないので、開発用 compose の `command`（`pnpm --filter ... dev`）が
    そのまま引き継がれる。distroless のイメージには pnpm もシェルも無く、この組み合わせでは起動できない。
    本番の配置手順としては使えない（[07](./07-roadmap.md) §2.1 の片付け）。
  - media-server の mediasoup-worker は、**実行先（本番）のカーネル 6 向けのビルド済みバイナリ**を取得する。
    mediasoup の postinstall はビルドするホストのカーネルで選ぶため、それに任せるとカーネル 7 のホストでは
    kernel7 版が入り、本番とずれる（`media-server/Dockerfile.media-server.prod`）。
  - 本番イメージは distroless（`gcr.io/distroless/nodejs24-debian13:debug`）上で、esbuild でバンドルした `server.js` を動かす。
- **DB**: MySQL。本番のホスト・ポートの公開方法・TLS などの具体は公開リポジトリに書かない。
- **WebRTC のポート**: media-server は UDP/TCP の 1 ポート（既定 44400、`WEBRTC_PORT`）で全配信・全視聴者を受ける
  （mediasoup の `WebRtcServer`）。`ANNOUNCED_IP` に外から届く IP を設定する。
- **要確認**: 本番 DB へのスキーマの適用手順。dev は `drizzle-kit push` で、マイグレーションファイルは持っていない。

### 3.1 resource-server / media-server は main に入ると本番に出る（タグの追従）

**状態: workflow は実装済み・本番の追従は有効（2026-11-19 に有効化）。** 本番の VPS の側の設定は所有者が行った。
有効化の直後に、本番が main のイメージへ入れ替わったことを確かめてある（resource-server は `/version` の `commit` が main のコミット）。

**main にマージされた resource-server / media-server の変更は、数分で本番に出る。**

- 流れ: main への push → `build-push-images.yml` がイメージを作って `:<コミットの SHA>` で push し、そのあとの job が
  イメージごとに main に突き合わせて `:latest` を動かす → 本番の VPS がレジストリの `:latest` を数分おきに見て、
  変わっていれば入れ替える → VPS の側で疎通と版（`/version` の `commit` がイメージの `GIT_COMMIT` と一致するか）を確かめ、
  駄目なら前のイメージに自動で戻す。動いているが挙動がおかしいときは、所有者が VPS で手で戻す（エージェントは VPS に触らない）。
  デプロイの仕組みの設計は、所有者の非公開のリポジトリにある。
- ⚠ **media-server を入れ替えると、配信・視聴が切れる**（配信のリソースはメモリにだけある。[04](./04-media.md) §2）。
  そのため videmus の PR は、マイグレーションなどの有無に関わらず、マージの可否とタイミングを所有者が判断する。エージェントは勝手にマージしない。
- **`paths` はイメージごとに分けてある**（workflow の起動条件の印 `media-server-paths`・`resource-server-paths` の間。
  起動の条件は 2 つの和）。片方だけに効く変更では、もう片方は作り直さず、`:latest` も動かない（入れ替わらない）。
  - media-server: 根の `package.json` / `pnpm-lock.yaml` / `pnpm-workspace.yaml`・`media-server` の `src/**`・`package.json`・
    `tsconfig.json`・`esbuild.config.ts`・`Dockerfile.media-server.prod`・根の `.dockerignore`・workflow 自身
  - resource-server: 根の 3 つ・`resource-server` の `src/**`・`package.json`・`tsconfig.json`・`esbuild.config.ts`・
    `Dockerfile.resource-server.prod`・`database/package.json`・`database/db/**`（バンドルに入る DB 操作とスキーマ）・根の `.dockerignore`・workflow 自身
  - 根の 3 つ・`.dockerignore`・workflow 自身は両方に効く（たとえば next の依存だけを上げても `pnpm-lock.yaml` が変わるので、両方が入れ替わる）。
    next・文書・`scripts/`・`Dockerfile.dev`・compose の変更では、本番は入れ替わらない。`src/` の中のテストだけの変更では作り直す（分けられない）
- ビルドの job は、main への push の回は**その push で入ったコミットがそのイメージの `paths` に当たるときだけ**作る
  （push の前の main からの first-parent の履歴で見る）。もう片方だけに効く push で作ると、そのイメージの T のビルドが
  失敗している間や、T のビルドより先に終わったときに、下の job がそれに `:latest` を向け、入力の同じ版で入れ替えが起きるため。
  手で起動した回・push の前のコミットを読めない回は、両方作る。
- `:latest` は、ビルドの job とは別の job「promote」がイメージごとに動かす。この job は**その回のコミットに依らず、その時点の main に突き合わせる**:
  - main を取り直し、main の先頭の workflow からそのイメージの `paths` の一覧を読み、main の first-parent の履歴で `paths` に当たる
    最後のコミット T を求める（merge commit なら、それ自身が T）。`:latest` のイメージの `GIT_COMMIT` は、ふつう T（ビルドの入力が変わった最後のコミット）になる
  - T の SHA のタグのイメージがあれば、`:latest` をそれに向ける（push 済みのイメージにあとから付ける。作り直さない。既に同じなら何もしない）。
    効く変更と文書を 1 回で push したときは先頭のコミットでしかビルドされないので、T のイメージが無ければ、T から先頭までのコミット
    （入力は T と同じ）のうちイメージのあるものに向ける（打ち切らずに全部を調べる。調べる順は回に依らず新しい方からで、どの回の job も同じ答えになる）
  - どのイメージも無ければ（T のビルドがまだ終わっていない・失敗した）何もしない。T の回が終われば、その回の job が付ける。
    T のビルドが失敗していれば `:latest` は前の版のままで、Summary に「T のイメージがまだ無い」と出る。T の回を再実行すれば付く
  - 突き合わせられないとき（main を取れない・履歴が浅い・`paths` の一覧を読めない・レジストリを確かめられない）は、動かさずに失敗で終わる
  - この job はイメージごとの固定の group で直列に走る（判定と付与の間に、別の回の付与が割り込まない）。どの回のこの job も同じ突き合わせをするので、
    古い回の再実行でも `:latest` は戻らず、待っていた回が取り消されても、生き残った回がより新しい main で同じ突き合わせをする。
    片方のイメージのビルドが失敗しても、もう片方の job は走る。main 以外の枝の回では、この job は走らない
- 🔒 **順序を守るのは、マージする人とエージェント。** 仕組みの側に、スキーマの変更や配信中かどうかで止める関所は無い。
  - DB のスキーマの変更・環境変数の追加・手作業を伴う PR は、マージの前に所有者と段取りを決める。
  - スキーマの変更は**古い resource-server でも動く形（足すだけ）**にし、**先に本番 DB に反映してからマージする**（反映の手順は上の「要確認」。どう反映するかは所有者と決める）。
    マージの前にイメージが要るときの手段の 1 つ: PR の枝で workflow を手で起動すれば、`:latest` を動かさずに `:<コミットの SHA>` のイメージができる。
  - ⚠ 切り戻しで resource-server を戻しても、スキーマは戻らない。戻した resource-server が新しいスキーマで動けることが前提になる。
- 🔒 **`:latest` を動かすのは workflow の job「promote」だけ。** 手元から `:latest` を push しない（`scripts/push-images.sh` も付けない）。
- next（Vercel）はこの仕組みの外。

### 3.2 サーバの停止（処理中のリクエストを返し切ってから終了する）

入れ替えのたびにサーバは停止の合図を受けるので、処理中のリクエストを途中で切らないようにしている
（各サーバの `src/lib/gracefulShutdown.ts`。両方が import できる共通のパッケージが無いので、2 つのサーバに同じ内容を置く。手順・前提・対象外の理由は同じファイルの JSDoc）。

- SIGTERM / SIGINT を受けると、**受け付けたまま**、リクエストの**ハンドラと応答の書き出しの両方**が終わるのを**最大 7.5 秒**待つ
  （待つあいだに届いたリクエストも処理し、それも待つ。応答の前に接続が切れても、ハンドラは終わるまで待つ）。
  処理中が 0 になって 150ms 新しく始まらなければ（または上限で）受け付けを止め、資源を閉じて終了する（終了コード 0。2 回目の合図は無視）。
  合図の時点で止めないのは、待つあいだ前段のプロキシが閉じた受け口へ繋ぎに行き、新しいリクエストが 502 になるため。
  閉じる資源は、resource-server では DB のプール、media-server では mediasoup の worker（とその下の Router・Transport・WebRtcServer）と `resourcesDict`。
  受け付けを止めた後に既存の接続から届いたリクエストは、アプリに渡さず 503（`Retry-After: 1`）で断る。
- 待つ上限と資源を閉じる上限（0.5 秒）・ログの書き出し（0.5 秒）を足して 8.5 秒で、**コンテナの停止の猶予（docker の既定 10 秒）より短く**保つ。
  猶予を縮める・閉じる資源を足すときは `SHUTDOWN_TIMEOUT_MS` を見直す。本番のイメージは distroless の node で、node が PID 1 として合図を直接受ける（`CMD ["server.js"]`）ことが前提。
- 前段のリバースプロキシが 1 リクエストごとに接続し、リクエストと応答をバッファリングする構成が前提。直接つないだ keep-alive・
  パイプラインの次のリクエストや、受け付けを止める時点で受信途中だったリクエストは取りこぼし得る（対象外）。
  古いプロセスが受け付けを止めてから新しいプロセスが待ち受けるまでの隙間のリクエストは前段で 502 になり、この手順では無くせない。
  リクエストが途切れずに来続けると、上限まで待つ。メモリの上の状態は保存しない。
- ⚠ **media-server では、進行中の配信・視聴は終了で切れる**（待つのは HTTP のリクエストだけ。[04](./04-media.md) §2）。
  なお mediasoup の worker は自分でも SIGTERM / SIGINT を購読していて、合図の時点で閉じる。そのため合図から受け付けを止めるまで
  （ふつうは約 150ms、最大 7.5 秒）は「HTTP は受け付けたまま・中継はもう閉じている」。そのあいだに届いたリクエストの多くは、
  mediasoup の呼び出しがすぐ失敗して 500 で返る。ただし待たずに呼んでいる箇所（consumer の再開）は、成功の応答を返したあと裏で失敗することがある。
  配信の状況・router の RTP の能力の問い合わせは、閉じた配信を「配信中」として答える（`media-server/src/server.ts` のコメント）。

## 4. 開発環境

`docker compose up --build --watch` で次が起動する（`docker-compose.yml`）。
全サービスがモノレポ全体を入れた 1 つのイメージ（`Dockerfile.dev`）を使い、依存（`node_modules`）はイメージに持つ。
ホストに `node_modules` は置かない。ソースの変更は compose watch の `sync` でコンテナに反映し、
`tsx watch` と `next dev` がそれぞれ読み直す。`pnpm-lock.yaml` が変わったときはイメージを作り直す（`rebuild`）。

`Dockerfile.dev` は Debian 13 ベース（`node:24-trixie-slim`）にする。イメージのビルドで mediasoup の postinstall が
ビルドするホストのカーネル向けの mediasoup-worker を取得する。カーネル 7 向けは glibc 2.38 以上を要求するので、
Debian 12 ベース（`node:24-slim` など）ではこれが動かず、ソースビルドに落ちて失敗する（イメージに Python が無い）。

| サービス | 内容 |
|---|---|
| `database` | MySQL 8.4。データは tmpfs で、**起動のたびに消える** |
| `database-preparation` | `drizzle-kit push` でスキーマを作り、`addTestData.ts` で試験用の配信 ID とチャンネルを有効状態で入れる（`TEST_BROADCAST_ID` / `TEST_CHANNEL_ID`）。終わると止まる |
| `videmus-nextjs` | `next dev`（3000） |
| `videmus-resource-server` | `tsx watch`（4000） |
| `videmus-media-server` | `tsx watch`（4001、WebRTC 44400）。DTLS の証明書と鍵を `media-server/dtls-*.pem` から読む |

## 5. 環境変数

値は `.env.*`（gitignore 対象）に置く。

| 変数 | 使う側 | 意味 |
|---|---|---|
| `NEXT_PUBLIC_API_URL` | next（ブラウザ） | ブラウザから見た resource-server の URL。OBS 配信用 URL の組み立てにも使う |
| `NEXT_PUBLIC_HOST_URL` | next（ブラウザ） | 視聴用 URL の組み立てに使う、next 自身の公開 URL |
| `API_URL` | next（サーバ側） | サーバ側から resource-server を呼ぶ URL |
| `API_URL` | media-server | WHIP の応答の `Location` に入れる **resource-server の公開 URL** |
| `API_KEY` | next / resource-server | next → resource-server の Bearer トークン |
| `CORS_ORIGINS` | resource-server | 許可するオリジン（カンマ区切り）。未設定なら空＝どこも許可しない |
| `MEDIA_SERVER_URL` | resource-server | media-server の内部 URL |
| `DB_HOST` / `MYSQL_USER` / `MYSQL_PASSWORD` / `MYSQL_DATABASE` | database | MySQL の接続先 |
| `ANNOUNCED_IP` / `WEBRTC_PORT` | media-server | WebRTC の公開 IP とポート |
| `DTLS_CERT` / `DTLS_KEY` | media-server | DTLS の証明書と秘密鍵のパス |
| `PORT` | resource-server / media-server | HTTP の待ち受けポート（既定 4000 / 4001） |
| `TEST_BROADCAST_ID` / `TEST_CHANNEL_ID` | database（dev） | 試験データ |
