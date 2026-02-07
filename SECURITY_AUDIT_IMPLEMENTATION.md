# AIガイド機能 セキュリティ監査 - 実装完了レポート

## 実装日
2026-02-07

## 概要
AIガイド機能のセキュリティ監査で検出された4つの懸念事項を修正しました。すべての修正は `next/src/features/ai-guide/` ディレクトリ内で完了しています。

---

## 実装した修正

### 1. レート制限の追加 [Medium]
**ファイル**: `actions/guideActions.ts`

#### 実装内容
- ユーザーごとのレート制限を追加（1分間に5リクエストまで）
- インメモリストア (`Map<userId, timestamp[]>`) で実装
- Server Action内で動作するため、サーバープロセス全体で共有される

#### 追加したコード
```typescript
const rateLimitStore = new Map<string, number[]>();
const RATE_LIMIT_WINDOW_MS = 60 * 1000; // 1分
const RATE_LIMIT_MAX_REQUESTS = 5;

function checkRateLimit(userId: string): boolean {
  const now = Date.now();
  const userRequests = rateLimitStore.get(userId) || [];
  const recentRequests = userRequests.filter(
    timestamp => now - timestamp < RATE_LIMIT_WINDOW_MS
  );

  if (recentRequests.length >= RATE_LIMIT_MAX_REQUESTS) {
    return true; // レート制限超過
  }

  recentRequests.push(now);
  rateLimitStore.set(userId, recentRequests);
  return false;
}
```

#### エラーレスポンス
```typescript
{
  code: 'RATE_LIMITED',
  message: 'リクエストが多すぎます。しばらく待ってから再度お試しください。'
}
```

---

### 2. エラーメッセージのサニタイズ [Medium]
**ファイル**: `actions/guideActions.ts`

#### 実装内容
- OpenAI SDKなどの内部エラー詳細をクライアントに露出しないよう変更
- エラーの詳細はサーバー側のログにのみ記録
- クライアントには常にジェネリックなエラーメッセージを返す

#### 変更前
```typescript
catch (error) {
  console.error('Error in generateGuide:', error);
  return {
    success: false,
    error: {
      code: 'GENERATION_FAILED',
      message: error instanceof Error ? error.message : 'ガイドの生成中にエラーが発生しました'
    }
  };
}
```

#### 変更後
```typescript
catch (error) {
  // サーバー側のログにのみ詳細を記録
  console.error('Error in generateGuide:', error);

  // クライアントには固定メッセージのみ返す
  return {
    success: false,
    error: {
      code: 'GENERATION_FAILED',
      message: 'ガイドの生成中にエラーが発生しました'
    }
  };
}
```

---

### 3. DOMスナップショットのサイズ検証 [Low]
**ファイル**: `actions/guideActions.ts`

#### 実装内容
- DOMスナップショットのノード数上限: 500ノード
- JSON シリアライズ後のサイズ上限: 100KB
- 構造の妥当性チェック（`nodes` 配列の存在確認）

#### 追加したコード
```typescript
const MAX_DOM_NODES = 500;
const MAX_DOM_SNAPSHOT_SIZE = 100 * 1024; // 100KB

function validateDomSnapshot(
  domSnapshot: AccessibilityTreeSnapshot
): { valid: boolean; error?: string } {
  // nodes配列の存在チェック
  if (!domSnapshot.nodes || !Array.isArray(domSnapshot.nodes)) {
    return { valid: false, error: 'DOMスナップショットの形式が不正です' };
  }

  // 再帰的にノード数をカウント
  function countNodes(nodes: any[]): number {
    let count = nodes.length;
    for (const node of nodes) {
      if (node.children && Array.isArray(node.children)) {
        count += countNodes(node.children);
      }
    }
    return count;
  }

  const totalNodes = countNodes(domSnapshot.nodes);
  if (totalNodes > MAX_DOM_NODES) {
    return { valid: false, error: 'ページの構造が複雑すぎます' };
  }

  // シリアライズサイズチェック
  try {
    const serialized = JSON.stringify(domSnapshot);
    if (serialized.length > MAX_DOM_SNAPSHOT_SIZE) {
      return { valid: false, error: 'DOMスナップショットのサイズが大きすぎます' };
    }
  } catch (error) {
    return { valid: false, error: 'DOMスナップショットのシリアライズに失敗しました' };
  }

  return { valid: true };
}
```

---

### 4. DOMスナップショットの機密情報マスク処理 [Medium]
**ファイル**: `core/utils.ts`

#### 実装内容
- アクセシビリティツリーに含まれるテキストから機密情報を自動検出・マスク
- OpenAI APIに送信される前にクライアント側で処理

#### 追加したマスクパターン
1. **OpenAI APIキー**: `sk-...` → `[MASKED_API_KEY]`
2. **JWTトークン**: `eyJ...` → `[MASKED_TOKEN]`
3. **長い英数字文字列**: 32文字以上でランダム性が高いもの → `[MASKED_TOKEN]`
4. **認証情報フィールド**: `api_key: xxx`, `secret: xxx` など → `[MASKED_CREDENTIAL]`

#### 追加したコード
```typescript
export function maskSensitiveData(text: string): string {
  if (!text) return text;

  let masked = text;

  // OpenAI API keys (sk-...)
  masked = masked.replace(/sk-[a-zA-Z0-9]{20,}/g, '[MASKED_API_KEY]');

  // JWT tokens
  masked = masked.replace(
    /eyJ[a-zA-Z0-9_-]{20,}\.[a-zA-Z0-9_-]{20,}\.[a-zA-Z0-9_-]{20,}/g,
    '[MASKED_TOKEN]'
  );

  // Generic long alphanumeric strings (potential tokens)
  masked = masked.replace(/\b[a-zA-Z0-9]{32,}\b/g, (match) => {
    const hasLetters = /[a-zA-Z]/.test(match);
    const hasNumbers = /[0-9]/.test(match);
    if (hasLetters && hasNumbers) {
      return '[MASKED_TOKEN]';
    }
    return match;
  });

  // Common secret prefixes
  masked = masked.replace(
    /\b(api[_-]?key|secret|token|password|auth)[:\s=]+[a-zA-Z0-9_-]{16,}/gi,
    '[MASKED_CREDENTIAL]'
  );

  return masked;
}
```

#### 適用箇所
`extractAccessibleName()` 関数で、すべてのテキスト抽出時にマスク処理を適用:
- aria-label
- aria-labelledby
- textContent
- placeholder
- label要素のテキスト

---

## 処理フロー

### generateGuide() の処理順序
1. **認証チェック**: ログインユーザーのみ許可
2. **レート制限チェック**: 1分間に5リクエストまで（新規追加）
3. **DOMスナップショット検証**: サイズ・構造のバリデーション（新規追加）
4. **入力検証**: ユーザー目的のサニタイズ（既存）
5. **API Key検証**: 環境変数の確認（既存）
6. **ガイド生成**: OpenAI API呼び出し（既存）
7. **結果検証**: Zodスキーマで構造検証（既存）

### エラーハンドリング
- すべての内部エラーは `console.error()` でサーバー側にのみ記録
- クライアントには常に安全なエラーメッセージのみ返す

---

## 変更したファイル

| ファイル | 変更内容 | 行数変更 |
|---------|---------|---------|
| `actions/guideActions.ts` | レート制限、DOMバリデーション、エラーサニタイズ | +約80行 |
| `core/utils.ts` | 機密情報マスク関数追加、extractAccessibleName修正 | +約50行 |

---

## セキュリティレベル向上

### Before
- ✗ レート制限なし → DoS攻撃・コスト爆発のリスク
- ✗ エラーメッセージに内部情報が含まれる可能性
- ✗ DOMスナップショットのサイズ無制限
- ✗ 機密情報がOpenAI APIに送信される可能性

### After
- ✓ ユーザーごとに1分間5リクエストまでの制限
- ✓ クライアントには常にジェネリックなエラーメッセージ
- ✓ DOMスナップショットは500ノード・100KB以内に制限
- ✓ トークン・APIキーなどを自動でマスク処理

---

## 既存のセキュリティ機能（変更なし）

以下の機能は既に正しく実装されており、変更していません:

1. **API Key隔離**: Server Action (`'use server'`) でのみアクセス
2. **認証チェック**: `getSession()` でログイン済みユーザーのみ許可
3. **入力サニタイズ**: `sanitizeInput()` でHTMLタグ除去 + 500文字制限
4. **Zodスキーマ検証**: LLMレスポンスの構造検証
5. **環境変数管理**: `.env` ファイルはgit未追跡

---

## 検証方法

### 1. レート制限テスト
```javascript
// ブラウザコンソールで実行
for (let i = 0; i < 10; i++) {
  await generateGuide('テスト', domSnapshot);
}
// 6回目以降でエラーが返ることを確認
```

### 2. エラーメッセージ確認
```bash
# .envファイルでOpenAI API Keyを無効化
OPENAI_API_KEY=invalid_key

# ガイド生成を実行し、クライアントに返るエラーメッセージを確認
# → "ガイドの生成中にエラーが発生しました" のみが表示されることを確認
```

### 3. DOMスナップショット検証
```javascript
// 巨大なDOMスナップショットを送信
const largeSnapshot = {
  nodes: Array(1000).fill({ /* ... */ })
};
await generateGuide('テスト', largeSnapshot);
// → "ページの構造が複雑すぎます" エラーが返ることを確認
```

### 4. マスク処理確認
```javascript
// トークンを含むページでガイドを生成
// サーバーログを確認し、プロンプトにトークンが含まれないことを確認
console.log(extractAccessibleName(tokenElement));
// → "[MASKED_TOKEN]" が表示されることを確認
```

---

## 注意事項

### レート制限の制約
- インメモリストアのため、サーバー再起動で履歴がリセットされる
- 水平スケーリング（複数サーバーインスタンス）では各インスタンスで独立
- 本番環境では Redis などの共有ストアを推奨

### マスク処理の限界
- 正規表現ベースのヒューリスティック検出
- 未知のトークン形式には対応できない可能性
- 過検知（正常な文字列もマスク）の可能性あり

---

## 今後の改善案

1. **レート制限の永続化**: Redis/Memcachedを使用
2. **より高度な機密情報検出**: エントロピー解析、機械学習ベースの検出
3. **監査ログ**: レート制限違反やバリデーションエラーの記録
4. **メトリクス**: OpenAI APIの使用量・コスト追跡

---

## まとめ

すべてのセキュリティ懸念事項を修正し、AIガイド機能のセキュリティレベルを大幅に向上させました。特に、レート制限と機密情報マスク処理の追加により、コスト爆発と情報漏洩のリスクを効果的に低減しています。

実装はTypeScriptの型安全性を維持しつつ、既存のコードベースに自然に統合されています。
