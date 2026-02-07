import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { z } from 'zod/v4'
import { setCookie, getCookie } from 'hono/cookie'
import { db } from 'videmus-database'
import { user } from 'videmus-database/schema'
import { eq } from 'drizzle-orm'

import { hasAdmin, verifySetupCredentials } from '../lib/setup'
import { auth } from '../lib/auth'

export const setupApp = new Hono()

/**
 * 管理者が存在するかチェック
 */
setupApp.get('/auth/check-setup', async (c) => {
  const adminExists = await hasAdmin()
  return c.json({ adminExists })
})

/**
 * セットアップ認証情報を検証
 * 成功すると、一時的なセットアップトークンをCookieにセット
 */
setupApp.post(
  '/auth/setup/verify',
  zValidator(
    'json',
    z.object({
      setupId: z.string(),
      setupPassword: z.string(),
    })
  ),
  async (c) => {
    const adminExists = await hasAdmin()
    if (adminExists) {
      return c.json({ error: 'Admin already exists' }, 403)
    }

    const { setupId, setupPassword } = c.req.valid('json')

    if (!verifySetupCredentials(setupId, setupPassword)) {
      return c.json({ error: 'Invalid credentials' }, 401)
    }

    // セットアップトークンをCookieにセット（OAuth後に管理者として登録するため）
    const setupToken = crypto.randomUUID()
    setCookie(c, 'setup_token', setupToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 10, // 10分間有効
      path: '/',
    })

    return c.json({ success: true })
  }
)

/**
 * 利用可能なOAuthプロバイダーを返す
 */
setupApp.get('/auth/providers', async (c) => {
  const providers: string[] = []

  if (process.env.GITHUB_CLIENT_ID && process.env.GITHUB_CLIENT_SECRET) {
    providers.push('github')
  }
  if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
    providers.push('google')
  }

  return c.json({ providers })
})

/**
 * OAuth完了後のコールバック処理（セットアップ用）
 * セットアップトークンがあれば、ユーザーを管理者に設定
 */
setupApp.get('/auth/setup/callback', async (c) => {
  const setupToken = getCookie(c, 'setup_token')
  const redirectUrl = process.env.AUTH_REDIRECT_URL ?? '/'

  if (!setupToken) {
    return c.redirect(redirectUrl)
  }

  // BetterAuthのセッションからユーザーIDを取得
  const session = await auth.api.getSession({ headers: c.req.raw.headers })

  if (!session?.user?.id) {
    return c.redirect(`${redirectUrl}?error=no_session`)
  }

  // ユーザーを管理者に設定（管理者は自動承認）
  await db
    .update(user)
    .set({ isAdmin: true, isApproved: true })
    .where(eq(user.id, session.user.id))

  // セットアップトークンを削除
  setCookie(c, 'setup_token', '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 0,
    path: '/',
  })

  return c.redirect(`${redirectUrl}/broadcast?setup=complete`)
}
)

/**
 * セッション情報を取得
 * Next.jsからセッション検証に使用
 */
setupApp.get('/auth/session', async (c) => {
  const session = await auth.api.getSession({ headers: c.req.raw.headers })

  if (!session) {
    return c.json({ user: null, session: null })
  }

  // isAdminフィールドを含めて返す
  const userWithAdmin = await db.query.user.findFirst({
    where: { id: session.user.id },
  })

  return c.json({
    user: {
      ...session.user,
      isAdmin: userWithAdmin?.isAdmin ?? false,
      isApproved: userWithAdmin?.isApproved ?? false,
    },
    session: session.session,
  })
})
