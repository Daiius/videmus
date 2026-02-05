'use server'

import { cookies } from 'next/headers'
import { getSession } from '@/lib/session'
import { revalidatePath } from 'next/cache'

const AUTH_URL = process.env.AUTH_URL ?? process.env.NEXT_PUBLIC_AUTH_URL ?? ''

const getCookieHeader = async () => {
  const cookieStore = await cookies()
  return cookieStore
    .getAll()
    .map((c) => `${c.name}=${c.value}`)
    .join('; ')
}

export type BroadcastToken = {
  id: string
  token: string
  name: string
  createdAt: string
  lastUsedAt: string | null
}

/**
 * 配信IDに関連付けられたトークン一覧を取得します
 */
export const getBroadcastTokens = async (
  broadcastId: string
): Promise<BroadcastToken[]> => {
  const session = await getSession()

  if (!session.user) {
    throw new Error('Authentication required')
  }

  const cookieHeader = await getCookieHeader()
  const res = await fetch(`${AUTH_URL}/broadcasts/${broadcastId}/tokens`, {
    headers: {
      Cookie: cookieHeader,
    },
    cache: 'no-store',
  })

  if (!res.ok) {
    throw new Error('Failed to fetch tokens')
  }

  return await res.json()
}

/**
 * 新しい配信トークンを作成します
 */
export const createBroadcastToken = async (
  broadcastId: string,
  name: string
): Promise<BroadcastToken> => {
  const session = await getSession()

  if (!session.user) {
    throw new Error('Authentication required')
  }

  const cookieHeader = await getCookieHeader()
  const res = await fetch(`${AUTH_URL}/broadcasts/${broadcastId}/tokens`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Cookie: cookieHeader,
    },
    body: JSON.stringify({ name }),
  })

  if (!res.ok) {
    throw new Error('Failed to create token')
  }

  revalidatePath(`/broadcast/${broadcastId}`)
  return await res.json()
}

/**
 * 配信トークンを削除します
 */
export const deleteBroadcastToken = async (
  broadcastId: string,
  tokenId: string
): Promise<void> => {
  const session = await getSession()

  if (!session.user) {
    throw new Error('Authentication required')
  }

  const cookieHeader = await getCookieHeader()
  const res = await fetch(
    `${AUTH_URL}/broadcasts/${broadcastId}/tokens/${tokenId}`,
    {
      method: 'DELETE',
      headers: {
        Cookie: cookieHeader,
      },
    }
  )

  if (!res.ok) {
    throw new Error('Failed to delete token')
  }

  revalidatePath(`/broadcast/${broadcastId}`)
}
