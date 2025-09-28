
import { broadcastIds } from 'videmus-database/db/schema';
import { db } from 'videmus-database/db';
import { eq } from 'drizzle-orm';

import type { VidemusResult } from '../types'
import { resourcesDict } from '../resources'

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
 */
export const getBroadcastingStatus = async ({
  broadcastId,
}: GetBroadcastingStatusArgs): Promise<VidemusResult<GetBroadcastingStatusResult>> => {

  const searchedEntry = await db.query.broadcastIds.findFirst({
    where: eq(broadcastIds.id, broadcastId)
  });

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

  const streamerResources =
    resourcesDict[broadcastId]?.streamerResources
  if (!streamerResources) {
    return {
      success: true,
      data: {
        isBroadcasting: false,
        streamingCount: 0,
      }
    }
  }

  const streamingCount = streamerResources.length;

  return {
    success: true,
    data: {
      isBroadcasting: true,
      streamingCount,
    },
  }
}

