# 07. ロードマップ

## 1. このリポジトリの位置づけ

**今も使っていて、小さく直し続ける。** 友人とゲーム画面を共有する用途で本番が動いている。
大きく育てる予定は無いが、不具合の修正と、作りかけになっている部分（チャンネル周りなど）の仕上げは行う。
依存の更新とセキュリティ対応も続ける。

## 2. gap（仕様には含むが未達）

| # | gap | 正典 |
|---|---|---|
| G1 | 配信中のチャンネル切り替えが media-server に届かない（UI からの呼び出しが壊れている） | [04](./04-media.md) §2.3 |
| G2 | OBS の再接続で古い Router / Transport が残る。視聴者が自動で再開しない | [04](./04-media.md) §5 |
| G3 | 視聴人数の上限が無い（環境変数で変えられる固定値にする） | [04](./04-media.md) §6 |
| G4 | 選択中のチャンネルを削除できてしまい、`current_channel_id` が存在しないチャンネルを指す | [03](./03-data-model.md) §2.1 |
| G5 | チャンネルの上限（5）を API が検査しない | [03](./03-data-model.md) §1.2 |
| G6 | WHIP の応答の `Content-Type` が `application/json`（仕様は `application/sdp`） | [04](./04-media.md) §1 |
| G7 | 視聴ページで、配信していないチャンネルの配信ステータスがエラー表示になる（404 をそのまま出す） | [04](./04-media.md) §3 |
| G8 | チャンネルを削除しても、その視聴用 URL が失効しない（視聴の可否が DB のチャンネルの有無を見ない） | [03](./03-data-model.md) §2.2 |

### 2.1 片付け

- 使われていないコード: `next/src/components/GetIdButton.tsx`（存在しない `POST /id` を呼ぶ旧版）、
  `next/src/hooks/useWebRtcStream.ts`（`lib/webRtcClient.ts` の旧版）。
- 本番で使っていない `next/Dockerfile.nextjs.prod`（next は Vercel に置いている）。
- 現行の本番イメージでは起動できない `docker-compose.prod.yml`（本番の compose はリポジトリ外。[02](./02-architecture.md) §3）。
- 配信停止のパス名 `test-broadcast`（開発初期の名残。OBS は `Location` に従うので、変えても OBS の設定は要らない）。
- media-server の調査用ログ（全リクエストのヘッダ、DTLS パラメータ、SDP の一部を `console.log` で出している）。
  視聴側にも ICE の統計を 5 秒・15 秒後に出す調査用ログがある。
- 要確認: 本番 DB へのスキーマの適用手順（[02](./02-architecture.md) §3）。

## 3. 今後の方向

| 項目 | 内容 | 正典 |
|---|---|---|
| 配信者のログイン | 配信 ID・管理ページ・チャンネル操作をアカウントに紐付ける。近い将来に入れる | [06](./06-auth-and-trust.md) §4 |
| 管理者による有効化の画面化 | DB の直接編集をやめる。配信者のログインとあわせて行う | [06](./06-auth-and-trust.md) §4 |
| 視聴者のログイン | 検討中（パスキーなど） | [06](./06-auth-and-trust.md) §4 |
| Postgres への移行 | deferred constraint で配信 ID とチャンネルの相互参照を DB 側で担保する。近い将来に検討 | [03](./03-data-model.md) §2.3 |
