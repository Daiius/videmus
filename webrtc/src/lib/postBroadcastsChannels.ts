
import { nanoid } from 'nanoid'
import { db } from 'videmus-database/db'
import { channels } from 'videmus-database/db/schema'

type PostBroadcastsChannelsArgs = {
  broadcastId: string,
  params: { name: string, description: string },
}

export const postBroadcastsChannels = async ({
  broadcastId,
  params,
}: PostBroadcastsChannelsArgs) => {
  await db.insert(channels).values({
    broadcastId,
    id: nanoid(),
    ...params
  });
}
