import { createMiddleware } from 'hono/factory'
import { HTTPException } from 'hono/http-exception'
import { auth, type Session } from './lib/auth'
import { validateBroadcastToken } from './lib/validateBroadcastToken'
import { db } from 'videmus-database'

// コンテキストにセッション情報を追加するための型拡張
declare module 'hono' {
  interface ContextVariableMap {
    session: Session | null
    validatedBroadcastId: string | null
  }
}

/**
 * API KEY による Bearer 認証（既存の認証方式）
 */
export const bearerAuth = createMiddleware(async (c, next) => {
  const authorization = c.req.header('Authorization')

  if (!authorization) {
    throw new HTTPException(401, { message: 'Authorization header is required' })
  }

  const token = authorization.replace(/^Bearer\s+/, '')

  if (!token) {
    throw new HTTPException(401, { message: 'Bearer token is required' })
  }

  if (token !== process.env.API_KEY) {
    throw new HTTPException(401, { message: 'Invalid token' })
  }

  await next()
})

/**
 * セッションベースの認証ミドルウェア
 * Cookie または Authorization ヘッダーからセッションを取得
 */
export const sessionAuth = createMiddleware(async (c, next) => {
  const session = await auth.api.getSession({ headers: c.req.raw.headers })

  if (!session) {
    throw new HTTPException(401, { message: 'Authentication required' })
  }

  c.set('session', session)
  await next()
})

/**
 * 管理者のみアクセス可能なミドルウェア
 * sessionAuth の後に使用すること
 * BetterAuth の JWE キャッシュには isAdmin が含まれない場合があるため、
 * DB から直接確認する
 */
export const adminOnly = createMiddleware(async (c, next) => {
  const session = c.get('session')

  if (!session?.user) {
    throw new HTTPException(401, { message: 'Authentication required' })
  }

  const userRecord = await db.query.user.findFirst({
    where: { id: session.user.id },
  })

  if (!userRecord?.isAdmin) {
    throw new HTTPException(403, { message: 'Admin access required' })
  }

  await next()
})

/**
 * 配信用トークン認証ミドルウェア
 * Bearer トークンを検証し、有効な場合は配信IDをコンテキストに設定
 * WHIP エンドポイントで使用
 */
export const broadcastTokenAuth = createMiddleware(async (c, next) => {
  const authorization = c.req.header('Authorization')

  if (!authorization) {
    throw new HTTPException(401, { message: 'Authorization header is required' })
  }

  const token = authorization.replace(/^Bearer\s+/, '')

  if (!token) {
    throw new HTTPException(401, { message: 'Bearer token is required' })
  }

  const broadcastId = await validateBroadcastToken(token)

  if (!broadcastId) {
    throw new HTTPException(401, { message: 'Invalid broadcast token' })
  }

  c.set('validatedBroadcastId', broadcastId)
  await next()
})
