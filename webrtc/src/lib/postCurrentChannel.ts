
import { broadcastIds } from 'videmus-database/db/schema';
import { db } from 'videmus-database/db';
import { eq } from 'drizzle-orm';
import type { VidemusResult } from '../types'
import { resourcesDict } from '../resources'

type PostCurrentChannelArgs = {
  broadcastId: string,
  newChannelId: string,
}

type PostCurrentChannelResult = {
  statusCode?: 200 | 202,
}

/**
 * 配信IDに関連付けられている配信チャンネルを変更します
 * TODO
 * 配信前は変更できない？あまり直感的ではないかも
 */
export const postCurrentChannel = async ({
  broadcastId,
  newChannelId,
}: PostCurrentChannelArgs): Promise<VidemusResult<PostCurrentChannelResult>> => {
  const broadcast = await db.query.broadcastIds.findFirst({
    where: eq(broadcastIds.id, broadcastId)
  });
  if (!broadcast) {
    return {
      success: false,
      error: {
        type: 'ResourceNotFound',
        message: `specified broadcast id is not registered`,
      },
    };
  }

  // TODO 
  // 配信開始前にはリソースが存在しないがどうするか？
  const broadcasterResources = resourcesDict[broadcastId]
  if (!broadcasterResources) {
    return {
      success: true,
      data: { statusCode: 202 }
    };
  } 
  broadcasterResources.streamId = newChannelId;

  return {
    success: true,
    data: { statusCode: 200 },
  }
}
