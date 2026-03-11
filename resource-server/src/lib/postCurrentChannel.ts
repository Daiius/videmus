import type { VidemusResult } from '../types'
import { getBroadcastsById } from './getBroadcastsById'
import { mediaClient } from './mediaClient'

type PostCurrentChannelArgs = {
  broadcastId: string,
  newChannelId: string,
}

type PostCurrentChannelResult = {
  statusCode?: 200 | 202,
}

/**
 * 配信IDに関連付けられている配信チャンネルを変更します
 *
 * DB確認後、Media Server の /internal/update-stream-id を呼びます
 *
 * TODO
 * 配信前は変更できない？あまり直感的ではないかも
 */
export const postCurrentChannel = async ({
  broadcastId,
  newChannelId,
}: PostCurrentChannelArgs): Promise<VidemusResult<PostCurrentChannelResult>> => {
  const broadcast = await getBroadcastsById(broadcastId)
  if (!broadcast) {
    return {
      success: false,
      error: {
        type: 'ResourceNotFound',
        message: `specified broadcast id is not registered`,
      },
    };
  }

  // Media Server にストリームID更新を依頼 (RPC)
  const res = await mediaClient.internal['update-stream-id'][':broadcastId'].$post({
    param: { broadcastId },
    json: { newStreamId: newChannelId },
  })
  const { updated } = await res.json()

  if (!updated) {
    // 配信開始前にはリソースが存在しない
    return {
      success: true,
      data: { statusCode: 202 }
    };
  }

  return {
    success: true,
    data: { statusCode: 200 },
  }
}
