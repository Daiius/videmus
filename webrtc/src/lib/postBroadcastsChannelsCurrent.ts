
import { eq, and } from 'drizzle-orm'

import { db } from 'videmus-database/db'
import { broadcastIds, channels } from 'videmus-database/db/schema'

type PostBroadcastsChannelsCurrentArgs = {
  broadcastId: string,
  newCurrentChannelId: string,
}

export const postBroadcastsChannelsCurrent = async ({
  broadcastId,
  newCurrentChannelId,
}: PostBroadcastsChannelsCurrentArgs) => {
  const test = await db.query.channels.findFirst({
    where: 
      and(
        eq(broadcastIds.id, broadcastId),
        eq(channels.id, newCurrentChannelId),
      )
  })

  if (test == null) {
    throw new Error(`Cannot find specified channel: ${newCurrentChannelId}`)
  } 

  await db
    .update(broadcastIds)
    .set({ currentChannelId: newCurrentChannelId })
    .where(eq(broadcastIds.id, broadcastId));
}
