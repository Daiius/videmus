# AI-Powered Contextual UI Guide

Videmus の AI ガイド機能の実装です。ユーザーの目的を理解し、ページの状態を解析して動的にステップバイステップのガイドを生成・表示します。

## 概要

### 機能

- **LLM による意図理解**: ユーザーが「配信を開始したい」と入力するだけで、適切な操作手順を生成
- **動的ガイド生成**: 現在のページ状態を解析し、利用可能な要素に基づいてガイドを作成
- **ビジュアルハイライト**: Driver.js によるインタラクティブなステップバイステップガイド
- **セマンティック情報の活用**: data-testid、ARIA 属性を使用した安定したセレクタ

### アーキテクチャ

```
┌─────────────────────────────────────┐
│  Presentation Layer (Client)        │
│  - AIGuideButton                    │
│  - AIGuideChatPanel                 │
│  - GuidanceRenderer (Driver.js)     │
└─────────────┬───────────────────────┘
              │
┌─────────────▼───────────────────────┐
│  Application Layer                   │
│  - useAIGuide Hook                  │
│  - Server Actions                   │
└─────────────┬───────────────────────┘
              │
┌─────────────▼───────────────────────┐
│  Service Layer                       │
│  - AIGuideEngine (LLM統合)          │
│  - DOMAnalyzer (DOM解析)            │
└─────────────────────────────────────┘
```

## セットアップ

### 1. 依存関係のインストール

既にインストール済みです:
- `ai` - Vercel AI SDK
- `@ai-sdk/openai` - OpenAI プロバイダー
- `driver.js` - ビジュアルガイド

### 2. 環境変数の設定

`.env.next` ファイルに以下を追加してください:

```bash
OPENAI_API_KEY=sk-...
```

OpenAI API キーは https://platform.openai.com/api-keys から取得できます。

### 3. 使用方法

ユーザーがログインしている場合、画面右下に青い丸いボタンが表示されます。
このボタンをクリックすると AI ガイドのチャットパネルが開きます。

## ディレクトリ構造

```
next/src/features/ai-guide/
├── core/                     # フレームワーク非依存のコア機能
│   ├── types.ts              # 型定義
│   ├── dom-analyzer.ts       # DOM 解析エンジン
│   └── utils.ts              # ユーティリティ関数
├── services/                 # LLM 統合
│   ├── ai-guide-engine.ts    # LLM Tool Calling
│   └── prompt-templates.ts   # プロンプト管理
├── actions/                  # Server Actions
│   └── guideActions.ts       # generateGuide など
├── hooks/                    # React Hooks
│   └── useAIGuide.ts         # 状態管理
├── components/               # UI Components
│   ├── AIGuideButton.tsx     # エントリーポイント
│   ├── AIGuideChatPanel.tsx  # 入力 UI
│   └── GuidanceRenderer.tsx  # Driver.js 統合
├── index.ts                  # 公開 API
└── README.md                 # このファイル
```

## 技術スタック

| 項目 | 選択 | 理由 |
|------|------|------|
| **LLM SDK** | Vercel AI SDK | Next.js との親和性、型安全性 |
| **LLM** | OpenAI GPT-4o-mini | コスト効率、速度、十分な品質 |
| **ビジュアルガイド** | Driver.js v2 | 軽量、TypeScript サポート |
| **セマンティック情報** | data-testid + ARIA | 安定性と可読性 |

## コンポーネント

### AIGuideButton

画面右下に表示される浮動アクションボタン。クリックするとモーダルダイアログが開きます。

**Props**: なし (認証状態は自動的に判定)

### AIGuideChatPanel

ユーザー入力とガイド結果を表示するチャットパネル。

**Props**:
- `isLoading`: ガイド生成中かどうか
- `error`: エラーメッセージ
- `guide`: 生成されたガイド
- `onRequestGuide`: ガイド生成をリクエスト
- `onStartGuide`: ガイドを開始
- `onClose`: パネルを閉じる

### GuidanceRenderer

Driver.js を使用してビジュアルガイドを表示。

**Props**:
- `guide`: 表示するガイド
- `currentStepIndex`: 現在のステップインデックス
- `onNextStep`: 次のステップに進む
- `onPreviousStep`: 前のステップに戻る
- `onComplete`: ガイド完了時

## Server Actions

### generateGuide

ユーザーの目的と DOM スナップショットからガイドを生成します。

```typescript
const result = await generateGuide(userGoal, domSnapshot);

if (result.success) {
  console.log(result.guide);
} else {
  console.error(result.error);
}
```

**認証**: ログインユーザーのみ使用可能
**入力検証**: ユーザー入力は自動的にサニタイゼーションされます

## DOM 解析

### DOMAnalyzer

ページの Accessibility Tree を解析し、セマンティック情報を抽出します。

```typescript
import { analyzePage } from '@/features/ai-guide/core/dom-analyzer';

const snapshot = analyzePage();
console.log(snapshot.nodes);
```

**制限**:
- 最大深さ: 10 階層
- 最大ノード数: 500
- 最大テキスト長: 100 文字

## セマンティック情報

### data-testid 属性

以下のコンポーネントに data-testid が追加されています:

| コンポーネント | data-testid | 用途 |
|---------------|-------------|------|
| GetNewIdButton | `broadcast-id-create-button` | 配信 ID 生成 |
| ObsBroadcastUrlPanel | `obs-url-show-button` | OBS URL 表示 |
| ObsBroadcastUrlPanel | `obs-url-copy-button` | OBS URL コピー |
| BroadcastTokenPanel | `token-name-input` | トークン名入力 |
| BroadcastTokenPanel | `token-create-button` | トークン作成 |
| CreateChannelButton | `channel-create-button` | チャンネル作成 |
| ChannelNameInput | `channel-name-input` | チャンネル名入力 |
| ChannelAuthCheckbox | `channel-auth-checkbox` | 認証要求設定 |

### セレクタの優先順位

1. `data-testid` (最優先)
2. `id`
3. ユニークな `class`
4. `tag + nth-child`

## デモシナリオ

### シナリオ 1: 配信を開始したい

1. ログイン後、`/broadcast` にアクセス
2. AI ガイドボタンをクリック
3. 「配信を開始したい」と入力
4. 生成されたガイドを確認
5. 「ガイドを開始」をクリック
6. ステップバイステップで操作

**期待されるステップ**:
1. 新規配信 ID を生成
2. チャンネルを作成
3. OBS URL を取得

### シナリオ 2: 視聴 URL を取得したい

1. 既存の配信 ID で `/broadcast/[id]` にアクセス
2. 「視聴 URL を取得したい」と入力
3. 視聴 URL の場所がハイライトされる

## トラブルシューティング

### ガイドが生成されない

1. `OPENAI_API_KEY` が設定されているか確認
2. ログインしているか確認
3. ブラウザのコンソールでエラーをチェック

### 要素が見つからない

1. `data-testid` が正しく設定されているか確認
2. DOM 解析の深さ制限 (10 階層) を超えていないか確認
3. 要素が `aria-hidden="true"` になっていないか確認

### LLM のレスポンスが遅い

GPT-4o-mini は通常 1-3 秒でレスポンスを返します。
それ以上かかる場合は、ネットワーク接続を確認してください。

## コスト試算

**GPT-4o-mini**:
- Input: $0.15/1M tokens
- Output: $0.60/1M tokens

**1 リクエストあたり**:
- 約 3000 tokens ≈ $0.002/リクエスト

**月間想定**:
- 1000 リクエスト → 約 $2/月

## 将来の拡張

### Phase 2: 自動操作機能

- MCP (Model Context Protocol) 統合
- Playwright による実際の操作
- セキュアな権限管理

現在の `GuideStep` 型は Phase 2 でもそのまま使用可能です。

## ライセンス

このプロジェクトのライセンスに準拠します。
