import { cookies } from 'next/headers'

const API_URL = process.env.API_URL ?? process.env.NEXT_PUBLIC_API_URL ?? ''

const getCookieHeader = async () => {
  const cookieStore = await cookies()
  return cookieStore
    .getAll()
    .map((c) => `${c.name}=${c.value}`)
    .join('; ')
}

export type Channel = {
  id: string
  broadcastId: string
  name: string
  description: string
  createdTime: string
  requireAuth: boolean
}

export type Broadcast = {
  id: string
  isAvailable: boolean
  currentChannelId: string
  ownerId: string | null
  channels: Channel[]
}

/**
 * 新しい配信IDを無効化状態で作成します
 * 新しいチャンネルも1つデフォルト値で作成します
 * Cookie を転送してセッション認証で API を呼び出します
 */
export const createNewBroadcastId = async () => {
  const cookieHeader = await getCookieHeader()
  const response = await fetch(`${API_URL}/broadcasts`, {
    method: 'POST',
    headers: {
      Cookie: cookieHeader,
    },
  })

  if (!response.ok) {
    throw new Error(
      `新規配信ID作成時にエラーが発生しました: ${response.status} ${response.statusText}`
    )
  }
  return await response.json()
}

/**
 * 指定した配信IDの情報を取得します
 * Cookie を転送してセッション認証で API を呼び出します
 */
export const getBroadcastInfo = async (broadcastId: string): Promise<Broadcast | undefined> => {
  const cookieHeader = await getCookieHeader()
  const response = await fetch(`${API_URL}/broadcasts/${broadcastId}`, {
    headers: {
      Cookie: cookieHeader,
    },
    cache: 'no-store',
  })

  if (!response.ok) {
    if (response.status === 404) {
      return undefined
    }
    throw new Error(
      `配信ステータス取得時にエラーが発生しました ${response.status} ${response.statusText}`
    )
  }

  return await response.json()
}

/**
 * 配信チャンネルを変更します
 * Cookie を転送してセッション認証で API を呼び出します
 */
export const updateCurrentChannel = async (
  broadcastId: string,
  newCurrentChannelId: string,
) => {
  const cookieHeader = await getCookieHeader()
  const response = await fetch(`${API_URL}/broadcasts/${broadcastId}/channels/current`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Cookie: cookieHeader,
    },
    body: JSON.stringify({ newCurrentChannelId }),
  })

  if (!response.ok) {
    throw new Error(
      `配信チャンネル変更時にエラーが発生しました ${response.status} ${response.statusText}`
    )
  }
}

