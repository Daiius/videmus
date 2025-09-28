
import { eq, and } from 'drizzle-orm'

import { db } from 'videmus-database/db'
import { channels } from 'videmus-database/db/schema'

type DeleteBroadcastsChannelsArgs = {
  broadcastId: string,
  channelId: string,
}

export const deleteBroadcastsChannels = async ({
  broadcastId,
  channelId,
}: DeleteBroadcastsChannelsArgs) => {
  await db
    .delete(channels)
    .where(
      and(
        eq(channels.id, channelId),
        eq(channels.broadcastId, broadcastId)
      )
    )
}
