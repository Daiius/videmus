# AGENTS.md

OBS から WebRTC（WHIP）で受けた配信を、少人数の視聴者にブラウザで低遅延に届けるサービス。
**仕様の正典は [`prd/`](./prd/README.md)**（下表）。実装のレビューと仕様の判断はここを基準に行う。

## 仕様（PRD）

| 章 | 内容 |
|---|---|
| [prd/README.md](./prd/README.md) | 目的 / スコープ / アーキ概観 / 用語 / 索引 |
| [prd/01-experience.md](./prd/01-experience.md) | 動機 / 利用者と利用の流れ / 類似サービスとの違い |
| [prd/02-architecture.md](./prd/02-architecture.md) | パッケージ構成 / 各サーバの役割 / 配置 / 開発環境 / 環境変数 |
| [prd/03-data-model.md](./prd/03-data-model.md) | BroadcastIds / Channels / 相互参照と MySQL での妥協 |
| [prd/04-media.md](./prd/04-media.md) | WHIP 受信 / mediasoup のリソース管理 / 視聴の手順 / コーデック / 再接続 / 上限 |
| [prd/05-api.md](./prd/05-api.md) | resource-server と media-server のエンドポイント |
| [prd/06-auth-and-trust.md](./prd/06-auth-and-trust.md) | 「URL を知っていること」が権限 / 既知の弱点 / 認証の方向性 |
| [prd/07-roadmap.md](./prd/07-roadmap.md) | 位置づけ / gap 一覧 / 今後の方向 |

> **PRD は「あるべき設計」を書く。** 実装との差は gap として [prd/07](./prd/07-roadmap.md) §2 に載せる。
> 仕様が変わる PR は、該当する章の更新を同じ PR に含める。
> PRD が実装より古い・誤っていると分かったら PRD を直す（実装を黙って正とみなさない）。
> 決定の経緯は [`prd/_grilling/decisions.md`](./prd/_grilling/decisions.md)。

## 構成

- `next/` — 配信者の管理ページと視聴ページ（Next.js 16。Vercel に配置）
- `resource-server/` — 外向きの API。DB の CRUD と、WHIP・視聴用 API の media-server への中継（Hono）
- `media-server/` — mediasoup を持つ常駐サーバ。配信リソースはメモリに持つ（Hono）
- `database/` — Drizzle のスキーマ（MySQL）と DB 操作

## 開発

- `docker compose up --build --watch` で DB の準備から各サーバの起動までが走る（[prd/02](./prd/02-architecture.md) §4）。
  依存はモノレポ全体を入れたイメージ（`Dockerfile.dev`）に持ち、ソースは compose watch で同期する。
  ホストに `node_modules` は置かない。DB のデータは起動のたびに消える。
- 環境変数は `.env.*`（gitignore 対象・コミットしない）。一覧は [prd/02](./prd/02-architecture.md) §5。
- サーバのイメージは `./scripts/push-images.sh` で ghcr に push する（[prd/02](./prd/02-architecture.md) §3）。
  media-server の mediasoup-worker は本番のカーネル 6 向けを固定で取得する。ビルドするホストのカーネルに任せない。

## 気をつけること

- **配信 ID は配信者の身分証**。ログ・PR・ドキュメントに実際の配信 ID を書かない（[prd/06](./prd/06-auth-and-trust.md)）。
- コード上の `streamer` は**視聴者**、`streamId` は**視聴用 ID（＝現在のチャンネル ID）**を指す
  （[prd/README](./prd/README.md) §用語）。
- media-server の HTTP は外から直接届かないように置く。外に出すのは resource-server と WebRTC のポートだけ。

## コミット・PR

- public リポジトリ。シークレット・本番インフラの具体（ホスト名・接続先など）はコミットに含めない。
- マージは merge commit で行う（これまでの履歴に合わせる）。
