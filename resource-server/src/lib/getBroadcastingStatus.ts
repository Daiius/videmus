import { getBroadcastingStatus as getBroadcastingStatusDb } from 'videmus-database/db/lib';

import type { VidemusResult } from '../types'
import { mediaClient } from './mediaClient'

type GetBroadcastingStatusArgs = {
  broadcastId: string,
}

type GetBroadcastingStatusResult = {
  streamingCount: number,
  isBroadcasting: boolean,
  statusCode?: 200 | 202,
}

/**
 * 配信の状況（開始・停止）と視聴者数の目安を返します
 * 配信者IDを引数にとる、つまり配信者向けのAPIエンドポイントです
 *
 * DB確認後、Media Server の /internal/viewer-count を呼びます
 */
export const getBroadcastingStatus = async ({
  broadcastId,
}: GetBroadcastingStatusArgs): Promise<VidemusResult<GetBroadcastingStatusResult>> => {

  const searchedEntry = await getBroadcastingStatusDb(broadcastId)
  if (searchedEntry == null) {
    return {
      success: false,
      error: {
        type: 'ResourceNotFound',
        message: `resoures with id ${broadcastId} doesn't exist`,
      }
    };
  }

  if (!searchedEntry.isAvailable) {
    return {
      success: true,
      data: {
        statusCode: 202,
        isBroadcasting: false,
        streamingCount: 0,
      },
    };
  }

  // Media Server に視聴者数を問い合わせ (RPC)
  const res = await mediaClient.internal['viewer-count'][':broadcastId'].$get({
    param: { broadcastId },
  })
  const { count, exists } = await res.json()

  if (!exists) {
    return {
      success: true,
      data: {
        isBroadcasting: false,
        streamingCount: 0,
      }
    }
  }

  return {
    success: true,
    data: {
      isBroadcasting: true,
      streamingCount: count,
    },
  }
}
