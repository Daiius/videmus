# 04. メディア（WHIP 受信・mediasoup・視聴）

media-server が mediasoup で配信を受け、視聴者に転送する。
**映像を変換（トランスコード）しない SFU** なので、サーバの負荷は主に転送の帯域で決まる。

## 1. 配信の受信（WHIP）

OBS の WHIP サービスに **OBS 配信用 URL `<resource-server の公開 URL>/whip/<配信 ID>`** を設定する。

1. OBS が `POST /whip/<配信 ID>` に SDP offer を送る。
2. **resource-server** が DB で検証する。配信 ID が無ければ 404、無効なら 403、
   現在のチャンネルが取れなければ 404。通れば `X-Current-Channel-Id` ヘッダに現在のチャンネル ID を載せ、
   リクエストをそのまま media-server の `/whip/<配信 ID>` に転送する。
3. **media-server** が配信 ID をキーに配信リソースを作り（§2）、SDP offer から SDP answer を組み立てる。
   mediasoup にはサーバ側で SDP を扱う仕組みが無いので、mediasoup-client の SDP 処理（`ortc`・`RemoteSdp` など）を
   サーバ側で流用している（`media-server/src/lib/postWhip.ts`）。
4. offer の映像・音声の各メディアセクションごとに Producer を作る。片方にしか対応できない場合でも、
   対応できる方は作る（意図。挙動は未検証）。
5. `201 Created` で SDP answer を返す。`Location` には配信停止用の URL
   `<API_URL>/whip/test-broadcast/<配信 ID>` を入れる。
   - **gap**: 応答の `Content-Type` が `application/json` になっている。WHIP の仕様では `application/sdp`。
     OBS は受け付けているが、仕様に合わせる。
   - パスの `test-broadcast` は開発初期の名残。
6. OBS の配信停止で `DELETE <Location>` が届く。配信開始直後のエラーのときにも OBS はこれを呼ぶ。
   media-server は配信者側の Transport と全視聴者の Transport を close し、配信リソースを消す。

## 2. 配信リソース（メモリ上）

media-server は `resourcesDict: Record<配信 ID, Resources>` に配信ごとのリソースを持つ
（`media-server/src/resources.ts`）。**DB には書かないので、media-server を再起動すると配信中の全リソースが消える。**

| 要素 | 内容 |
|---|---|
| `router` | 配信ごとに 1 つの mediasoup Router（§4 のコーデックで作る） |
| `streamId`（視聴用 ID） | **現在のチャンネル ID と同じ値**。視聴者はこの値（＝視聴用 URL のチャンネル ID）で配信を探す |
| `broadcasterResources` | 配信者からの WebRtcTransport 1 つと、その Producer（今は映像・音声の 2 つ） |
| `streamerResources` | 視聴者ごとの WebRtcTransport と、その Consumer（今は映像・音声の 2 つ） |

- worker は **1 つ**、`WebRtcServer` も 1 つで、全配信・全視聴者が 1 ポートを共有する。
- 視聴側の API は視聴用 ID で `resourcesDict` を線形に探す。想定規模（§6）では問題にならない。

### 2.1 配信の状況

- 配信中かどうか ＝ `resourcesDict` にその配信 ID があるかどうか。
- 視聴者数 ＝ `streamerResources` の数。視聴者の Transport の ICE が `disconnected` になったら、
  その視聴者の Consumer を close して数から外す。

### 2.2 視聴用 ID の決まり方

配信を開始した時点（WHIP を受けた時点）の現在のチャンネル ID が、そのまま視聴用 ID になる。
配信前にチャンネルを選び直しておけば、次の配信はそのチャンネルに出る。

### 2.3 配信中のチャンネル切り替え

**あるべき姿**: 配信中に管理ページで別のチャンネルを選ぶと、DB の現在のチャンネルを書き換えたうえで、
media-server の視聴用 ID も新しいチャンネル ID に書き換える（`POST /internal/update-stream-id/<配信 ID>`）。
視聴用 ID は視聴者が接続を確立するときの探索キーにすぎないので、**すでに見ている視聴者はそのまま見続けられる**。
新しく開く視聴者は新しいチャンネルの URL で見る。

**gap**: 管理ページの「選択」ボタンは DB の書き換えまでは行う。ところが media-server への反映
（resource-server の `POST /current-channel/<配信 ID>`）の呼び出しが壊れていて届かない。
URL の先頭に空白が入り、存在しない `/api/` を前に付けている。Bearer トークンが無い（ブラウザは API_KEY を持たない）。
body のキーが `channelId` で、サーバの読む `currentChannelId` と合わない。
そのため、配信中に切り替えると、配信をやり直すまで新しいチャンネルの URL では見られない。
直すときは、DB の書き換えと同じく Server Action から呼ぶ。

## 3. 視聴の手順

視聴ページ `/stream/<チャンネル ID>` で、mediasoup-client が resource-server 経由で media-server と次の順にやりとりする
（`next/src/lib/webRtcClient.ts`）。

1. `GET /mediasoup/router-rtp-capabilities/<視聴用 ID>` — Router の対応コーデックを取り、`Device` を初期化する。
   配信が無ければ 404（`channel <ID> seems to be closed.` と表示）。
2. `GET /mediasoup/streamer-transport-parameters/<視聴用 ID>` — サーバ側で視聴者用の Transport を作り、
   その ICE / DTLS のパラメータを受け取って、受信用の Transport を作る。
3. Transport の `connect` で `POST /mediasoup/client-connect/<視聴用 ID>/<Transport ID>` — DTLS のパラメータを渡して接続する。
4. `POST /mediasoup/consumer-parameters/<視聴用 ID>/<Transport ID>` — ブラウザの対応コーデックを送る。
   サーバは Producer ごとに消費できるか調べ、できるものの Consumer を**一時停止の状態で**作って返す。
5. `POST /mediasoup/resume-consumer/<視聴用 ID>/<Transport ID>` — ブラウザの受信準備が整ってから再生を始めさせる。

映像は `<video autoPlay controls muted playsInline>` で再生する。自動再生の制約のため**ミュートで始まる**。

視聴ページには配信ステータス（視聴者数）も出し、`GET /streaming-status/<チャンネル ID>` を 5 秒ごとに取る。
配信していないチャンネルでは 404 が返り、エラーとして表示される。

## 4. コーデック

Router のコーデック（`media-server/src/codecs.ts`）:

| 種類 | コーデック | パラメータ |
|---|---|---|
| 音声 | Opus 48kHz 2ch | — |
| 映像 | H.264 | packetization-mode 1、profile-level-id 42e01f（Constrained Baseline）、level-asymmetry-allowed 1 |
| 映像 | VP8 | — |

OBS の WHIP 出力（H.264 / Opus）を変換なしで中継する。

## 5. 切断と再接続

**あるべき姿**:
- **サーバ**: 同じ配信 ID で WHIP が来たら（OBS の再接続）、**古い Router と Transport を close してから**作り直す。
- **視聴者**: 配信が途切れたら、配信の状況を見ながら自動で再接続を試み続ける。配信が戻れば、
  視聴者が何もしなくても再生が再開する。チャンネル（視聴用 URL）は再接続しても変わらないので、
  同じ URL のまま戻れる（[01](./01-experience.md) §3.2）。

**gap**:
- `postWhip` は `resourcesDict[配信 ID]` を新しいリソースで上書きするだけで、古い Router と Transport を close しない。
  古いリソースは media-server を再起動するまで残る。
- 視聴側は Transport が `disconnected` になると 2 秒後に再接続を試みるが、`failed` のときは何もしない。
  視聴者の Consumer は古い Router に属しているので、OBS が再接続しても自動では戻らず、ページの再読み込みが要る。

## 6. 規模と上限

- **想定規模**: 同時に配信するのは数本、1 配信あたりの視聴者は 10 人程度まで（[01](./01-experience.md) §2）。
  上限を決めているのは、今 videmus を動かしているホストの性能（とくに上りの帯域）。
  一方通行の配信なので、mediasoup の資料に照らすと worker 1 つにはまだ余裕がある。
- **視聴人数の上限**（あるべき姿）: 1 配信あたりの視聴者数に上限を設け、超えたら新しい視聴を断る。
  上限はホストの環境で変わるので、コードに直書きせず**環境変数で変えられる固定値**にする。
  断る場所は視聴者用の Transport を作る `streamer-transport-parameters`（今 TODO がある箇所）。
  **gap**: 未実装。
- worker の数・ポートの範囲（`rtcMinPort` 44400〜`rtcMaxPort` 44410）は、規模が変わったときに見直す。
