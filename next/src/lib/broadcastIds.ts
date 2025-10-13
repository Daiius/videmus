import { clientWithAuth, client } from '@/lib/api'

import { InferResponseType } from 'hono'

const $get = clientWithAuth.broadcasts[':broadcastId'].$get
type Broadcast = InferResponseType<typeof $get>
export type Channel = Broadcast['channels'][number]

/**
 * 新しい配信IDを無効化状態で作成します
 * 新しいチャンネルも1つデフォルト値で作成します
 */
export const createNewBroadcastId = async () => {
  const response = await clientWithAuth.broadcasts.$post()
  if (!response.ok) {
    throw new Error(
      `新規配信ID作成時にエラーが発生しました: ${response.status} ${response.statusText}`
    )
  }
  return await response.json()
}

/**
 * 指定した配信IDの情報を取得します
 * broadcastIdはURLに指定されたものを受け取るので、
 * 存在しない値が入る場合をスムーズに扱うため、
 * その場合undefinedを返します
 *
 * currentChannelIdはデータベース制約上はnullになる可能性がありますが
 * (MySQLでdeferred constraintが使えないため妥協)
 * この関数を経由して取得するようにし、
 * TODO: どうやって強制する？？
 * ここでnullチェックと有効な値のセットを事前に行うようにします
 */
export const getBroadcastInfo = async (broadcastId: string)  => {
  const response = await client.broadcasts[':broadcastId'].$get({ param: { broadcastId } })
  if (!response.ok) {
    throw new Error(
      `配信ステータス取得時にエラーが発生しました ${response.status} ${response.statusText}`
    )
  }

  return await response.json()
}

/**
 * 配信チャンネルを変更します
 */
export const updateCurrentChannel = async (
  broadcastId: string,
  newCurrentChannelId: string,
) => {
  const response = await clientWithAuth.broadcasts[':broadcastId'].channels.current.$post({ 
    param: { broadcastId },
    json: { newCurrentChannelId },
  })
  if (!response.ok) {
    throw new Error(
      `配信チャンネル変更時にエラーが発生しました ${response.status} ${response.statusText}`
    )
  }
};

