import { serverClient } from './api'

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
  isApproved: boolean
  currentChannelId: string
  ownerId: string | null
  channels: Channel[]
}

/**
 * ログインユーザーの配信IDを取得（なければ自動作成）
 * Cookie を転送してセッション認証で API を呼び出します
 */
export const getMyBroadcast = async (): Promise<{ broadcastId: string }> => {
  const client = await serverClient()
  const response = await client.broadcasts.mine.$get()

  if (!response.ok) {
    throw new Error(
      `配信ID取得時にエラーが発生しました: ${response.status} ${response.statusText}`
    )
  }
  return await response.json()
}

/**
 * 指定した配信IDの情報を取得します
 * Cookie を転送してセッション認証で API を呼び出します
 */
export const getBroadcastInfo = async (broadcastId: string): Promise<Broadcast | undefined> => {
  const client = await serverClient()
  const response = await client.broadcasts[':broadcastId'].$get({
    param: { broadcastId },
  })

  // Type assertion to allow 404 check before response.ok check
  if ((response as Response).status === 404) {
    return undefined
  }

  if (!response.ok) {
    throw new Error(
      `配信ステータス取得時にエラーが発生しました ${response.status} ${response.statusText}`
    )
  }

  const data = await response.json()
  // Handle null response case
  return data ?? undefined
}

/**
 * 配信チャンネルを変更します
 * Cookie を転送してセッション認証で API を呼び出します
 */
export const updateCurrentChannel = async (
  broadcastId: string,
  newCurrentChannelId: string,
) => {
  const client = await serverClient()
  const response = await client.broadcasts[':broadcastId'].channels.current.$post({
    param: { broadcastId },
    json: { newCurrentChannelId },
  })

  if (!response.ok) {
    throw new Error(
      `配信チャンネル変更時にエラーが発生しました ${response.status} ${response.statusText}`
    )
  }
}
