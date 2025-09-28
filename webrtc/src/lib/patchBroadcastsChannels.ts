
import { eq, and } from 'drizzle-orm'

import { db } from 'videmus-database/db'
import { channels } from 'videmus-database/db/schema'

type PatchBroadcastsChannelsArgs = {
  broadcastId: string,
  channelId: string,
  params: { name?: string, description?: string, },
}

/**
 * 既存配信チャンネルのデータを更新します
 */
export const patchBroadcastsChannels = async ({
  broadcastId,
  channelId,
  params,
}: PatchBroadcastsChannelsArgs) => {
  await db
    .update(channels)
    .set(params)
    .where(
      and(
        eq(channels.id, channelId),
        eq(channels.broadcastId, broadcastId)
      )
    )
}
