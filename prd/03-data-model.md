# 03. データモデル

永続化するのは **配信 ID とチャンネル**だけ。配信中の状態（mediasoup のリソース、視聴者数）は
media-server のメモリにだけあり、DB には書かない（[04](./04-media.md) §2）。
スキーマは `database/db/schema.ts`、操作は `database/db/lib.ts`。

## 1. テーブル

### 1.1 `BroadcastIds`（配信 ID）

| 列 | 型 | 制約 | 意味 |
|---|---|---|---|
| `id` | varchar(36) | PK, not null | 配信 ID（UUID v4） |
| `is_available` | boolean | not null | 有効か。作成時は false、管理者が true にする |
| `current_channel_id` | varchar(21) | **nullable、外部キーなし** | 現在のチャンネル（§2） |

### 1.2 `Channels`（チャンネル）

| 列 | 型 | 制約 | 意味 |
|---|---|---|---|
| `id` | varchar(21) | PK, not null | チャンネル ID（nanoid）。視聴用 URL に入る |
| `broadcast_id` | varchar(36) | not null, FK → `BroadcastIds.id`（update / delete とも cascade） | 持ち主の配信 ID |
| `name` | varchar(256) | not null, 既定 `'チャンネル名'` | 表示名。API は 254 文字までに制限する |
| `description` | varchar(1024) | not null, 既定 `''` | 説明（UI では今は編集できない） |
| `created_time` | timestamp | not null, 既定 now | 作成日時。並び順と既定のチャンネルの決定に使う |

- 1 配信 ID あたりのチャンネルは **最大 5**。**gap**: UI でしか制限しておらず、API は検査しない。
- 1 配信 ID には**常に 1 つ以上**のチャンネルがある。UI は残り 1 つのときに削除ボタンを出さない。
- 検討時の理想形では `name` を一意にしていたが、実装では一意制約を付けていない。

## 2. 相互参照と MySQL での妥協

理想は「配信 ID は必ず現在のチャンネルを 1 つ持つ（`current_channel_id` が not null で、
`Channels` を参照する外部キー）」。ただし `BroadcastIds` と `Channels` が互いを参照するので、
新しい配信 ID を作るときに両方を同時に入れる必要があり、**deferred constraint（コミット時に制約を検査する）が要る**。
MySQL にはこれが無いので、次のように妥協している。

- `current_channel_id` は nullable にし、外部キーも付けない（スキーマではコメントアウトしている）。
- 作成時は 1 トランザクションで「`current_channel_id = NULL` で配信 ID を入れる → チャンネルを 1 つ入れる →
  `current_channel_id` をそのチャンネルにする」の順に行う（`createBroadcast`）。
- 読むときは必ず `getBroadcastsById` を通し、`current_channel_id` が null なら補う。
  チャンネルがあれば**最も古いもの**を現在のチャンネルにし、1 つも無ければ既定のチャンネルを作って設定する。
  この関数を通すことを型や構造で強制する手段は今のところ無い。

### 2.1 選択中のチャンネルの削除（gap）

**選択中のチャンネルは削除できないこと**（あるべき姿）。
**gap**: 現状は削除できてしまう。削除すると `current_channel_id` が存在しないチャンネルを指したまま残り、
null ではないので §2 の補完も働かない。外部キーが無いので DB も止めない。
次に配信すると、削除したチャンネルの ID がそのまま視聴用 ID になる。
管理ページからはそのチャンネル（視聴用 URL）が消えるが、視聴ページも media-server も DB を見ずに視聴用 ID だけで配信を探すので、
**削除前の URL を知っている人はその配信を見られる**。

### 2.2 チャンネルの削除で視聴用 URL が失効しない（gap）

**チャンネルを削除したら、その視聴用 URL では見られなくなること**（あるべき姿）。
「URL を知っていること」が権限なので（[06](./06-auth-and-trust.md) §1）、チャンネルの削除は URL の失効の手段でもある。
**gap**: 視聴の可否は media-server のメモリ上の視聴用 ID だけで決まり、DB のチャンネルの有無を見ない。
選択中のチャンネルを削除した場合（§2.1）に加えて、配信中に選択中のチャンネルを削除した場合も、配信が続くあいだは見られる。
§2.1 で選択中のチャンネルを削除させなければ、選択中でないチャンネルは視聴用 ID にならないので、削除した URL では見られなくなる。

### 2.3 Postgres への移行（計画）

Postgres には deferred constraint があるので、相互参照を DB 側で担保できる（`current_channel_id` を
not null の外部キーにし、`DEFERRABLE INITIALLY DEFERRED` で作成時の順序問題を避ける）。
当面は MySQL のままアプリ側で直し、移行は近い将来に検討する（[07](./07-roadmap.md) §3）。
