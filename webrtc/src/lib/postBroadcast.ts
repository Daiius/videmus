import { nanoid } from 'nanoid'
import { v4 as uuid } from 'uuid'

import { db } from 'videmus-database/db'
import { broadcastIds, channels } from 'videmus-database/db/schema'
import { eq } from 'drizzle-orm'

export type PostBroadcastResult = {
  newBroadcastId: string;
}

/**
 * 新しい配信IDを無効化状態で作成します
 * 新しいチャンネルも1つデフォルト値で作成します
 */
export const postBroadcast = async (): Promise<PostBroadcastResult> => {
  const newBroadcastId = uuid();
  const newChannelId = nanoid();

  console.log('newBroadcastId: ', newBroadcastId);
  console.log('newChannelId: ', newChannelId);

  await db.transaction(async (tx) => {

    await tx.insert(broadcastIds)
      .values({
        id: newBroadcastId, 
        isAvailable: false,
        currentChannelId: undefined,
      });
      
    await tx.insert(channels)
      .values({
        id: newChannelId,
        broadcastId: newBroadcastId,
      });

    await tx.update(broadcastIds)
      .set({ currentChannelId: newChannelId })
      .where(
        eq(broadcastIds.id, newBroadcastId)
      );

  });

  return { newBroadcastId };
}

