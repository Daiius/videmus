
import { eq, asc } from 'drizzle-orm'
import { nanoid } from 'nanoid'

import { db } from 'videmus-database/db'
import { broadcastIds, channels } from 'videmus-database/db/schema'

type GetBroadcastsByIdArgs = {
  broadcastId: string,
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
export const getBroadcastsById = async ({
  broadcastId
}: GetBroadcastsByIdArgs) => await db.transaction(async (tx) => {

  const rawBroadcastInfo = await tx.query.broadcastIds.findFirst({
    where: eq(broadcastIds.id, broadcastId)
  });

  if (rawBroadcastInfo == null) {
    return undefined;
  }

  const relatedChannels = await tx.query.channels.findMany({
    where: eq(channels.broadcastId, broadcastId),
    orderBy: asc(channels.createdTime),
  });

  if (rawBroadcastInfo.currentChannelId != null) {
    return {
      ...rawBroadcastInfo,
      channels: relatedChannels,
      currentChannelId: rawBroadcastInfo.currentChannelId,
    };
  }

  if (relatedChannels.length > 0) {
    // チャンネルが存在すれば、最後のものを現在のチャンネルに指定
    await tx
      .update(broadcastIds)
      .set({ currentChannelId: relatedChannels[0]?.id })
      .where(eq(broadcastIds.id, broadcastId));
  } else {
    // チャンネルが存在しない!?デフォルト値を追加して
    // broadcastIdsテーブルを更新
    const newChannelId = nanoid();
    await tx
      .insert(channels)
      .values({
        id: newChannelId,
        broadcastId: broadcastId,
      });
    await tx
      .update(broadcastIds)
      .set({ currentChannelId: newChannelId })
      .where(eq(broadcastIds.id, broadcastId));
  }
  
  const retriedBroadcstInfo = await tx.query.broadcastIds.findFirst({
    where: eq(broadcastIds.id, broadcastId)
  })
  const retriedRelatedChannels = await tx.query.channels.findMany({
    where: eq(channels.broadcastId, broadcastId),
    orderBy: asc(channels.createdTime),
  })

  if (retriedBroadcstInfo?.currentChannelId == null) {
    // もしこの期に及んでcurrentChannelIdがnullなら諦める
    throw new Error(
      `failed to set or create current channel of broadcastInfo (${broadcastId})`
    );
  }

  return {
    ...retriedBroadcstInfo,
    channels: retriedRelatedChannels,
    currentChannelId: retriedBroadcstInfo.currentChannelId,
  }
});

