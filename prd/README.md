# PRD: Videmus

> **この PRD は「あるべき設計」を書く正典である。** 現在の実装と食い違う箇所は、
> **実装が追いついていない gap** であって PRD の誤りではない。gap は本文で「gap」と明示し、
> 一覧を [07](./07-roadmap.md) §2 に置く。
>
> **ただし次は現状に忠実であること**（食い違えば PRD の誤り）: ①「実装済み」と書いた記述、
> ②既存の DB 列と API、③設計の意味論（配信 ID・チャンネル ID・視聴用 ID の関係など）。
> 未確定の論点は「要確認」と書く。決定ログは [`_grilling/decisions.md`](./_grilling/decisions.md)。

## 目的

**少人数でゲーム画面を共有するための、低遅延な動画配信サービス。**
OBS から WebRTC（WHIP）で配信し、視聴者はブラウザで URL を開くだけで見られる。

友人とゲーム画面を共有しながら通話して遊ぶ際、既存の配信手段の遅延と画質が不満だったのが発端
（[01](./01-experience.md) §1）。遅延 0.6 秒程度・画質も満足できる水準を実現している。

## スコープ

- **実装済み**: 配信 ID の発行（無効状態で作成）/ 管理者による手動有効化（DB 直接編集）/
  配信者ごとのチャンネル（視聴用 URL）の作成・名前変更・削除・選択（最大 5）/
  OBS からの WHIP 受信 / mediasoup（SFU）による視聴者への転送 / 配信状況と視聴者数の表示（ポーリング）/
  OBS 設定の案内。
- **gap（仕様には含むが未達）**: 配信中のチャンネル切り替えが配信に反映されない /
  再接続時のリソースの片付けと視聴の自動再開 / 視聴人数の上限 / 選択中チャンネルの削除の防止 ほか
  （[07](./07-roadmap.md) §2）。
- **計画中**: 配信者のログイン（認証）/ 管理者による有効化の画面化 / Postgres への移行
  （[07](./07-roadmap.md) §3）。

## アーキ概観

TypeScript の pnpm monorepo。`next`（UI）/ `resource-server`（DB と API の窓口）/
`media-server`（mediasoup）/ `database`（Drizzle のスキーマと DB 操作）の 4 パッケージ
（[02](./02-architecture.md)）。

```
  OBS ──WHIP(HTTP)──> resource-server ──(DB 検証後に転送)──> media-server ──> mediasoup worker
   │                    │  ▲                                    ▲   │
   │                    ▼  │ Hono RPC                           │   │
   │                  MySQL                                     │   │
   └──────────────────── WebRTC（UDP/TCP 44400）────────────────┘   │
                                                                    │
  ブラウザ ──> next (Vercel) ──API_KEY──> resource-server            │
      │                                                             │
      └──── 視聴: mediasoup-client ⇄ resource-server ⇄ media-server  │
            映像・音声は WebRTC で media-server から直接 ◀───────────┘
```

## 索引

| 章 | 内容 |
|---|---|
| [01-experience.md](./01-experience.md) | 動機 / 利用者と利用の流れ / 類似サービスとの違い |
| [02-architecture.md](./02-architecture.md) | パッケージ構成 / 各サーバの役割 / 配置 / 開発環境 / 環境変数 |
| [03-data-model.md](./03-data-model.md) | BroadcastIds / Channels / 相互参照と MySQL での妥協 |
| [04-media.md](./04-media.md) | WHIP 受信 / mediasoup のリソース管理 / 視聴の手順 / コーデック / 再接続 / 上限 |
| [05-api.md](./05-api.md) | resource-server と media-server のエンドポイント |
| [06-auth-and-trust.md](./06-auth-and-trust.md) | 「URL を知っていること」が権限 / 既知の弱点 / 認証の方向性 |
| [07-roadmap.md](./07-roadmap.md) | 位置づけ / gap 一覧 / 今後の方向 |
| [_grilling/decisions.md](./_grilling/decisions.md) | 決定ログ |

## 用語

| 用語 | 意味 |
|---|---|
| **配信 ID**（broadcastId） | 配信者を表す UUID v4。OBS の配信用 URL と管理ページの URL に入る。**配信者の身分証であり秘密**（[06](./06-auth-and-trust.md)） |
| **チャンネル**（channel） | 配信者ごとに持つ視聴用の宛先。ID は nanoid（21 文字）で、視聴用 URL `/stream/<チャンネル ID>` に入る |
| **現在のチャンネル**（current channel） | 配信者が「いまどのチャンネルに配信するか」として選んでいるもの。配信は常にこの 1 つに出る |
| **視聴用 ID**（streamId） | media-server がメモリ上で配信リソースに付けている視聴側のキー。**値は現在のチャンネル ID と同じ**（[04](./04-media.md) §2） |
| **配信者**（broadcaster） / **視聴者**（streamer） | コード上は視聴者を `streamer` と呼ぶ（一般的な英語の用法とは逆なので注意） |
