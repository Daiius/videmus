# 02. アーキテクチャ

## 1. 技術スタック

フルスタックを 1 人で開発するため、**TypeScript に統一**し、フロントエンドとバックエンドの両方を
カバーするメジャーなオープンソースのものを選ぶ。

| 層 | 採用 |
|---|---|
| UI | Next.js 16（App Router・Server Components・Server Actions）+ React 19 + Tailwind CSS 3 + Headless UI / SWR（ポーリング） |
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
- **resource-server / media-server**: VPS 上の docker compose で動かす。イメージはこのリポジトリの
  `scripts/push-images.sh` でビルドし、`ghcr.io/daiius/videmus-{resource-server,media-server}` に push する
  （`:latest` と `:<commit sha>`）。
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
