import { cookies } from 'next/headers'

const AUTH_URL = process.env.AUTH_URL ?? process.env.NEXT_PUBLIC_AUTH_URL ?? ''

export type SessionUser = {
  id: string
  name: string
  email: string
  image?: string | null
  isAdmin: boolean
  isApproved: boolean
}

export type Session = {
  user: SessionUser | null
  session: {
    id: string
    expiresAt: string
    token: string
  } | null
}

/**
 * サーバーサイドでセッション情報を取得します
 * Next.js の SSR 時に使用
 */
export const getSession = async (): Promise<Session> => {
  try {
    const cookieStore = await cookies()
    const cookieHeader = cookieStore
      .getAll()
      .map((c) => `${c.name}=${c.value}`)
      .join('; ')

    const res = await fetch(`${AUTH_URL}/auth/session`, {
      headers: {
        Cookie: cookieHeader,
      },
      cache: 'no-store',
    })

    if (!res.ok) {
      return { user: null, session: null }
    }

    return await res.json()
  } catch {
    return { user: null, session: null }
  }
}

/**
 * 管理者が存在するかチェックします
 */
export const checkAdminExists = async (): Promise<boolean> => {
  try {
    const res = await fetch(`${AUTH_URL}/auth/check-setup`, {
      cache: 'no-store',
    })
    const data = await res.json()
    return data.adminExists
  } catch {
    return false
  }
}

export type ChannelInfo = {
  id: string
  name: string
  requireAuth: boolean
}

/**
 * チャンネル情報を取得します
 */
export const getChannelInfo = async (channelId: string): Promise<ChannelInfo | null> => {
  try {
    const res = await fetch(`${AUTH_URL}/channels/${channelId}`, {
      cache: 'no-store',
    })
    if (!res.ok) {
      return null
    }
    return await res.json()
  } catch {
    return null
  }
}
