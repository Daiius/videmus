# AGENTS.md

OBS から WebRTC（WHIP）で受けた配信を、少人数の視聴者にブラウザで低遅延に届けるサービス。
**仕様の正典は [`prd/`](./prd/README.md)**（下表）。実装のレビューと仕様の判断はここを基準に行う。

## ⚠ main に入ると resource-server / media-server は数分で本番に出る（マージの前に必ず読む）

> **状態: workflow は実装済み・本番の追従は有効（2026-11-19 に有効化）。** 本番の VPS の側の設定は所有者が行った。
> 有効化の直後に、本番が main のイメージへ入れ替わったことを確かめてある。以下は、その決まり。

- **resource-server と media-server は、main にマージされると数分で本番に出る。** main への push でイメージが作られ
  （[`build-push-images.yml`](./.github/workflows/build-push-images.yml)。イメージごとの `paths` に当たる変更のとき。
  片方だけに効く変更では、もう片方は作り直さず、入れ替わらない）、本番の VPS がレジストリの `latest` を数分おきに見て、
  変わっていれば自動で入れ替える。**「マージしても本番には出ない」と考えない。** 出したくない変更は main に入れない。
- 対象は resource-server と media-server だけ。**next は Vercel** で、この仕組みの外。
- ⚠ **media-server は、入れ替えると配信・視聴が切れる**（配信のリソースはメモリにだけある。[prd/04](./prd/04-media.md) §2）。
- 🔒 **videmus の PR は、マイグレーションなどの有無に関わらず、マージの可否とタイミングを所有者が判断する。エージェントは勝手にマージしない。**
  とくに次の PR は、マージの前に所有者と段取りを決める:
  - DB のスキーマ（`database/db/schema.ts`）の変更を伴う（マイグレーションのファイルは持たない。本番 DB への適用の手順は未確定。[prd/02](./prd/02-architecture.md) §3）
  - 環境変数の追加・変更を伴う（本番の env は所有者が置く）
  - デプロイの前後に手作業が要る
- スキーマの変更は**古い resource-server でも動く形（足すだけ）**にし、**先に本番 DB に反映してからマージする**。
  マージすると新しい resource-server が先に出るため、順序が逆だと新しい resource-server が古いスキーマの上で動く。
  切り戻したときも、戻した resource-server が新しいスキーマの上で動けるようにしておく。
  マージの前にイメージが要るときの手段の 1 つ: PR の枝で workflow を手で起動すれば、`latest` を動かさずに `:<コミットの SHA>` のイメージができる。
- 🔒 **手元から `latest` を push しない**（追従は有効なので、push した瞬間に本番に出る）。`latest` を動かすのは workflow の job「promote」だけ。
  `scripts/push-images.sh` も `:<コミットの SHA>` のタグだけを付ける。
- 本番の版は `GET /version` の `commit` で確かめる（[prd/05](./prd/05-api.md) §4）。
  **おかしいときの戻し方（VPS での切り戻し）は所有者の作業。エージェントは VPS に触らない。**
- 詳細は [prd/02](./prd/02-architecture.md) §3.1。デプロイの仕組みの設計は、所有者の非公開のリポジトリにある。

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
- pnpm は `package.json` の `packageManager` の版（12 系）を使う。公開から 1 日たっていない版は
  pnpm の既定（`minimumReleaseAge`）で入らないので、依存を上げるときはその手前の版に解決する。
- 環境変数は `.env.*`（gitignore 対象・コミットしない）。一覧は [prd/02](./prd/02-architecture.md) §5。
- サーバのイメージは、main への push で `.github/workflows/build-push-images.yml` が作り ghcr に push する（[prd/02](./prd/02-architecture.md) §3・§3.1）。
  手元からは `./scripts/push-images.sh` で作れる（`:<コミットの SHA>` のタグだけ。`latest` は付けない）。
  media-server の mediasoup-worker は本番のカーネル 6 向けを固定で取得する。ビルドするホストのカーネルに任せない。
- PR と main への push で CI（`.github/workflows/ci.yml`）が走る。各パッケージの型検査（`tsc --noEmit`）と、
  media-server / resource-server / next の本番ビルド。lint は入れていない（`next lint` が今は動かない）。

## 気をつけること

- **配信 ID は配信者の身分証**。ログ・PR・ドキュメントに実際の配信 ID を書かない（[prd/06](./prd/06-auth-and-trust.md)）。
- コード上の `streamer` は**視聴者**、`streamId` は**視聴用 ID（＝現在のチャンネル ID）**を指す
  （[prd/README](./prd/README.md) §用語）。
- media-server の HTTP は外から直接届かないように置く。外に出すのは resource-server と WebRTC のポートだけ。

## コミット・PR

- public リポジトリ。シークレット・本番インフラの具体（ホスト名・接続先など）はコミットに含めない。
- マージは merge commit で行う（これまでの履歴に合わせる）。
- 見た目に効く変更（スタイル・UI ライブラリの更新など）は、事前の画面確認を必須にしない。
  本番（Vercel）に反映したあとで、所有者が画面を確認する。
