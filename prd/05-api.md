# 05. API

ルートの定義は `resource-server/src/app.ts` と `media-server/src/app.ts`。
「認証」列の Bearer は `Authorization: Bearer <API_KEY>`（[06](./06-auth-and-trust.md) §1）。

## 1. resource-server（外向き）

### 1.1 配信（OBS から）

| メソッド・パス | 認証 | 内容 |
|---|---|---|
| `POST /whip/:id` | なし（配信 ID が秘密） | WHIP の受信口。DB で配信 ID を検証し、`X-Current-Channel-Id` を付けて media-server に転送する。404（ID が無い・現在のチャンネルが無い）/ 403（無効）/ 201（成功。[04](./04-media.md) §1） |
| `DELETE /whip/test-broadcast/:id` | なし（配信 ID が秘密） | 配信停止。media-server に中継する |

### 1.2 配信の状況

| メソッド・パス | 認証 | 内容 |
|---|---|---|
| `GET /broadcasting-status/:broadcastId` | なし（配信 ID が秘密） | 配信者向け。`{ isBroadcasting, streamingCount }`。ID が無ければ 404、無効なら 202（中身は配信なし・0 人） |
| `GET /streaming-status/:channelId` | なし | 視聴者向け。`{ isBroadcasting, streamingCount }`。そのチャンネルで配信していなければ 404 |

### 1.3 チャンネルの切り替え（配信中の反映）

| メソッド・パス | 認証 | 内容 |
|---|---|---|
| `POST /current-channel/:broadcastId` | Bearer | body `{ currentChannelId }`。media-server の視聴用 ID を書き換える。配信中でなければ 202（反映先が無い）、反映できれば 200。**DB は書き換えない**（DB は §1.5 の `channels/current`） |

**gap**: 呼び出し元の UI が壊れている（[04](./04-media.md) §2.3）。

### 1.4 視聴（mediasoup-client から）

いずれも認証なしで、media-server に中継する。手順は [04](./04-media.md) §3。

| メソッド・パス | 内容 |
|---|---|
| `GET /mediasoup/router-rtp-capabilities/:id` | Router の RTP capabilities |
| `GET /mediasoup/streamer-transport-parameters/:id` | 視聴者用 Transport を作り、そのパラメータを返す |
| `POST /mediasoup/client-connect/:streamId/:transportId` | body は DTLS パラメータ。Transport を接続する |
| `POST /mediasoup/consumer-parameters/:streamId/:transportId` | body はブラウザの RTP capabilities。一時停止の Consumer を作って返す |
| `POST /mediasoup/resume-consumer/:streamId/:transportId` | Consumer の再生を始める |

`:id` / `:streamId` は視聴用 ID（＝チャンネル ID）。

### 1.5 DB の CRUD（next のサーバ側から）

すべて Bearer。

| メソッド・パス | 内容 |
|---|---|
| `POST /broadcasts` | 配信 ID を無効の状態で作り、既定のチャンネルを 1 つ付ける。`{ newBroadcastId }` |
| `GET /broadcasts/:broadcastId` | 配信 ID・有効か・現在のチャンネル・チャンネル一覧（作成順）。現在のチャンネルが null なら補う（[03](./03-data-model.md) §2） |
| `POST /broadcasts/:broadcastId/channels` | body `{ name, description }`（254 / 1024 文字まで）。チャンネルを追加する |
| `PATCH /broadcasts/:broadcastId/channels/:channelId` | body `{ name?, description? }`。チャンネルを更新する |
| `DELETE /broadcasts/:broadcastId/channels/:channelId` | チャンネルを削除する |
| `POST /broadcasts/:broadcastId/channels/current` | body `{ newCurrentChannelId }`。DB の現在のチャンネルを書き換える。その配信 ID のチャンネルでなければ例外 |

**gap**: チャンネルの追加は 5 つを超えても通る（[03](./03-data-model.md) §1.2）。
選択中のチャンネルの削除も通る（[03](./03-data-model.md) §2.1）。

### 1.6 CORS

`CORS_ORIGINS`（カンマ区切り）を許可する。メソッドは GET / POST / DELETE / PATCH、
ヘッダは `Content-Type` / `Authorization`。

## 2. media-server（内部）

resource-server からだけ呼ばれる想定で、認証は持たない。**外から直接届かないように配置する**（[06](./06-auth-and-trust.md) §2）。

| メソッド・パス | 内容 |
|---|---|
| `POST /whip/:id` | `X-Current-Channel-Id` 必須（無ければ 400）。配信リソースを作り SDP answer を返す |
| `DELETE /whip/test-broadcast/:id` | 配信リソースを解放する。無ければ 404 |
| `GET /streaming-status/:channelId` | 視聴用 ID で配信を探し、視聴者数を返す |
| `GET /mediasoup/*` / `POST /mediasoup/*` | §1.4 と同じ 5 つ |
| `GET /internal/viewer-count/:broadcastId` | `{ count, exists }`。配信 ID で引く |
| `POST /internal/update-stream-id/:broadcastId` | body `{ newStreamId }`。視聴用 ID を書き換える。配信中でなければ 404 `{ updated: false }` |

## 3. エラーの形

両サーバとも結果を `{ success, data } | { success: false, error: { type, message } }` で受け渡し、
`type` で HTTP ステータスに変える。`ResourceNotFound` は 404、`NotAvailable` は 403、`Unexpected` は 500。
エラーの本文は平文の `message`。
