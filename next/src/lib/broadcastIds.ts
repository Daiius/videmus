import { v4 as uuid } from 'uuid';
import { db } from 'videmus-database/db';
import { 
  broadcastIds,
  channels,
} from 'videmus-database/db/schema';
import { nanoid } from 'nanoid';
import { eq, desc, asc } from 'drizzle-orm';

type NonNullables<T> = {
  [K in keyof T]: NonNullable<T[K]>;
}

export type Channel = typeof channels.$inferSelect;
export type BroadcastInfo = NonNullables<
  typeof broadcastIds.$inferSelect
>;

/**
 * 新しい配信IDを無効化状態で作成します
 * 新しいチャンネルも1つデフォルト値で作成します
 */
export const createNewBroadcastId = async (): Promise<string> => {
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

  return newBroadcastId;
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
export const getBroadcastInfo = async (broadcastId: string): Promise<{
  isAvailable: boolean;
  channels: Channel[];
  currentChannelId: string;
} | undefined> => await db.transaction(async (tx) => {

  const rawBroadcastInfos = await tx.select()
    .from(broadcastIds)
    .where(eq(broadcastIds.id, broadcastId));
  if (rawBroadcastInfos.length === 0) {
    return undefined;
  }
  const [rawBroadcastInfo] = rawBroadcastInfos;

  const relatedChannels = await tx.select()
    .from(channels)
    .where(eq(channels.broadcastId, broadcastId))
    .orderBy(asc(channels.createdTime));

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
      .set({ currentChannelId: relatedChannels[0].id })
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
  
  const [retriedBroadcstInfo] = await tx.select()
    .from(broadcastIds)
    .where(eq(broadcastIds.id, broadcastId));
  const retriedRelatedChannels = await tx.select()
    .from(channels)
    .where(eq(channels.broadcastId, broadcastId))
    .orderBy(asc(channels.createdTime));

  if (retriedBroadcstInfo.currentChannelId == null) {
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

export const updateCurrentChannel = async (
  broadcastId: string,
  newCurrentChannelId: string,
) => {
  await db
    .update(broadcastIds)
    .set({ currentChannelId: newCurrentChannelId })
    .where(eq(broadcastIds.id, broadcastId));
};

