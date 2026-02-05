import { createAuthClient } from 'better-auth/react'

/**
 * BetterAuth クライアント
 *
 * Next.js と Hono サーバーが別サーバーの場合、Cookie の転送問題を解決するため、
 * Next.js の API Route プロキシ経由で認証リクエストを送信します。
 *
 * - ブラウザからは NEXT_PUBLIC_HOST_URL（localhost:3000）の /api/auth/* にリクエスト
 * - Next.js API Route が Hono サーバー（localhost:4000）の /api/auth/* に転送
 * - Cookie は localhost:3000 ドメインで統一されるため、転送問題が解決される
 */
export const authClient = createAuthClient({
  baseURL: process.env.NEXT_PUBLIC_HOST_URL ?? 'http://localhost:3000',
})

export const {
  signIn,
  signOut,
  useSession,
} = authClient
