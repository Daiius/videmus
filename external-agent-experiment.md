# External Agent Experiment: Chrome DevTools MCP による操作予測

## 概要

ソースコードを読まずに、以下の2つの情報源だけで配信開始までの操作手順を構築できるか実験した。

1. `next/src/features/ai-guide/services/prompt-templates.ts` - アプリ内 AI ガイド用のプロンプトテンプレート（ドメイン知識）
2. Chrome DevTools MCP によるページのスナップショット - `data-testid` / `data-guide-hint` 属性の取得

## 調査対象ページ

`/broadcast/d2a70f74-ac78-42d6-95f0-803cc8eccb7c`

## ページから取得した要素情報

| 要素 | data-testid | data-guide-hint | 状態 |
|------|-------------|-----------------|------|
| OBS URL 表示ボタン | `obs-url-show-button` | クリックでモーダルダイアログを開き、OBS配信用URLを表示する。 | enabled |
| トークン名入力 | `token-name-input` | 新しいトークンの名前を入力する欄。作成ボタンと組み合わせて使用する。 | enabled |
| トークン作成ボタン | `token-create-button` | トークン名を入力後、クリックで認証トークンを作成。作成後トークン値が一度だけ表示される。 | **disabled** |
| チャンネル名入力 | `channel-name-input` | 既存チャンネルの名前をインライン編集する。変更は1秒後に自動保存。新規作成の入力欄ではない。 | enabled |
| 認証チェックボックス | `channel-auth-checkbox` | チャンネルの視聴認証をトグル。変更は即座にサーバーに保存される。 | enabled |
| チャンネル追加ボタン | `channel-create-button` | クリックでデフォルト名「新しいチャンネル」のチャンネルを即座に作成。ダイアログは開かない。 | enabled |

## 現在の状態

- ユーザー: Daiji Yamashita（管理者、ログイン済み）
- 承認状態: 「有効」（配信許可済み）
- チャンネル: 1つ存在（視聴URL: `http://localhost:3000/stream/vJ2FkXXHoK9C1jgxI-doR`）
- トークン: 未作成
- 配信ステータス: 0（未配信）

## 予測した操作手順（配信開始まで）

| Step | 操作 | 対象要素 | 根拠 |
|------|------|----------|------|
| 1 | OBS配信用URLを確認 | `[data-testid="obs-url-show-button"]` | hint: モーダルダイアログを開く |
| 2 | ダイアログ内でURLをコピー | `[data-testid="obs-url-copy-button"]`（ダイアログ内） | prompt-templates.ts の Known Elements |
| 3 | トークン名を入力 | `[data-testid="token-name-input"]` | ボタンが disabled → 名前入力が前提条件 |
| 4 | トークンを作成 | `[data-testid="token-create-button"]` | hint: トークン値が一度だけ表示される |
| 5 | OBSで設定 | （外部操作） | WHIP URL + Bearer トークンを設定 |
| 6 | 視聴URLを共有 | テキスト表示済み | チャンネルセクションに既に表示 |

## hint から読み取れた UI パターン

- **disabled 状態の依存関係**: `token-create-button` が disabled → `token-name-input` への入力が前提条件
- **一度だけ表示**: トークン値は作成直後にのみ表示される → コピーが必須
- **即座作成**: `channel-create-button` はダイアログなしで即座に作成される
- **自動保存**: `channel-name-input` は変更後1秒で自動保存（明示的な保存ボタン不要）

## 結論

- `data-testid` + `data-guide-hint` の組み合わせにより、ソースコードを読まなくても操作手順を正確に予測できた
- prompt-templates.ts のドメイン知識（Known Elements リスト）が、ダイアログ内など未表示要素の予測に役立った
- hint の「ダイアログは開かない」「即座に作成」等の記述が、誤ったステップ生成の防止に有効
- 次のステップとして、実際に Chrome DevTools MCP で操作を実行して検証する予定

## 実行実験（第1回: 即座 snapshot）

操作直後に `includeSnapshot: true` で snapshot を取得する方式で実行。

### 実行結果

| Step | 操作 | 結果 |
|------|------|------|
| 1 | OBS URL 表示ボタンクリック | ダイアログ表示成功、URL 確認 |
| 2 | ダイアログ「閉じる」クリック | snapshot 上でダイアログが残存。再クリックはタイムアウト。Escape で対処 |
| 3 | トークン名入力 | 成功。disabled 解除も確認 |
| 4 | トークン作成クリック | snapshot では「トークンがありません」のまま。`wait_for` で別途待機が必要だった |
| 5 | トークン「表示」クリック | トークン値の確認に成功 |

### 取得した配信情報

| 項目 | 値 |
|------|-----|
| OBS配信用URL | `http://localhost:4000/whip/d2a70f74-ac78-42d6-95f0-803cc8eccb7c` |
| トークン | `df2b1ebce6da3aeab357483537bb9e8dd0d774abf20967cf7dc3e8f08072e5e8` |
| 視聴URL | `http://localhost:3000/stream/vJ2FkXXHoK9C1jgxI-doR` |

### 問題点

1. **ダイアログ閉じ後の snapshot にダイアログが残存** - アニメーション中のタイミングで取得されたと思われる
2. **トークン作成後の非同期更新が反映されない** - API 呼び出し完了前に snapshot を取得していた
3. **confirm ダイアログの予測不可** - トークン削除時に `window.confirm` が出現するが、`data-guide-hint` にも prompt-templates.ts にも記載がない
4. **MCP 接続の不安定さ** - ダイアログ処理中にタイムアウトが発生するケースがあった

## 実行実験（第2回: 1秒待機後 snapshot）

ユーザーの提案により、操作後に1秒待機してから snapshot を取得する方式で再実験。
待機は `evaluate_script` で `setTimeout` の Promise を実行する形で実現。

### 実行結果

| Step | 操作 | 結果 |
|------|------|------|
| 1 | OBS URL 表示ボタンクリック → 1秒待機 | ダイアログ表示成功（前回と同等） |
| 2 | Escape → 1秒待機 | ダイアログが完全に消えた snapshot を取得 |
| 3 | トークン名入力 → 1秒待機 | 成功。disabled 解除も確認 |
| 4 | トークン作成クリック → 1秒待機 | **トークン名・マスク値・表示/コピー/削除ボタンが全て反映済み** |

### 第1回との比較

| 操作 | 第1回（即座 snapshot） | 第2回（1秒待機） |
|------|----------------------|-----------------|
| ダイアログ閉じ後 | ダイアログが a11y tree に残存 → 再クリック失敗 → Escape で対処 | きれいに消えている |
| トークン作成後 | 「トークンがありません」のまま → `wait_for` で別途待機が必要 | 作成結果が全て反映済み |
| 予測外の対処 | 2回必要 | **0回** |

### 結論

- **1秒待機だけで非同期 UI 更新の問題がほぼ解消された**
- 第1回で報告した「hint の精度問題」「ダイアログの閉じ方問題」は、実は snapshot タイミングの問題だった
- 残る本質的な課題:
  1. **a11y tree に `data-testid` が見えない** - MCP / ブラウザの構造的制約。`evaluate_script` で別途取得が必要
  2. **confirm ダイアログの予測** - `data-guide-hint` に記載がない操作の副作用
  3. **MCP 接続の不安定さ** - ダイアログ処理中のタイムアウト等

## エージェント向け情報提供の設計検討

### 情報源の評価

| 情報の種類 | 提供方法 | 備考 |
|------------|----------|------|
| ドメイン知識（概念・ワークフロー） | 外部エンドポイント or 静的ファイル | llms.txt とは用途が異なる。操作向け専用の形式が必要 |
| 要素の操作説明（人間にも有益） | `aria-description` | a11y tree snapshot に出る。evaluate_script 不要 |
| エージェント専用メタデータ（状態遷移等） | `data-agent-hint` | a11y tree に出ない。evaluate_script で取得 |
| 要素の安定セレクタ | `data-testid` | a11y tree に出ない。evaluate_script で取得 |

### 推奨: 2層構造

```html
<button
  aria-description="OBS配信用URLをモーダルダイアログで表示します"
  data-agent-hint="opens-dialog; async:false"
  data-testid="obs-url-show-button"
>表示</button>
```

- `aria-description`: 人間にもエージェントにも有益 → snapshot で即取得可能
- `data-agent-hint`: エージェント専用制御情報 → evaluate_script で1回取得
- `data-testid`: セレクタ用 → evaluate_script で1回取得

### 成功した操作パターン

1. 静的コンテキスト（prompt-templates.ts 相当）でドメイン知識を与える
2. `data-testid` + `data-guide-hint` を evaluate_script で取得して操作計画
3. 操作後 **1秒待機** してから snapshot を再取得（非同期 UI 更新の反映待ち）

この3点の組み合わせで、ソースコード不要・予測外の対処0回で配信準備操作を完遂できた。
