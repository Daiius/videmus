import { eq, and } from 'drizzle-orm'

import { db } from './index'
import { channels, broadcastIds } from './schema'
import { nanoid } from 'nanoid'
import { v4 as uuid } from 'uuid'

export type DeleteBroadcastsChannelsArgs = {
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

export const getBroadcastingStatus = async (broadcastId: string ) =>
  await db.query.broadcastIds.findFirst({
    where: { id: broadcastId }
  });

/**
 * チャンネルIDからチャンネル情報を取得します
 */
export const getChannelById = async (channelId: string) =>
  await db.query.channels.findFirst({
    where: { id: channelId }
  });

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
export const getBroadcastsById = async (broadcastId: string) =>
  await db.transaction(async (tx) => {

    const rawBroadcastInfo = await tx.query.broadcastIds.findFirst({
      where: { id: broadcastId }
    });

    if (rawBroadcastInfo == null) {
      return undefined;
    }

    const relatedChannels = await tx.query.channels.findMany({
      where: { broadcastId },
      orderBy: { createdTime: "asc" },
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
      where: { id: broadcastId }
    })
    const retriedRelatedChannels = await tx.query.channels.findMany({
      where: { broadcastId },
      orderBy: { createdTime: "asc" },
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

export const updateBroadcastsChannelsCurrent = async (
  broadcastId: string, 
  newCurrentChannelId: string,
) => {
  const test = await db.query.channels.findFirst({
    where: { 
      AND: [
        { broadcastId },
        { id: newCurrentChannelId },
      ]
    }
  })

  if (test == null) {
    throw new Error(`Cannot find specified channel: ${newCurrentChannelId}`)
  } 

  await db
    .update(broadcastIds)
    .set({ currentChannelId: newCurrentChannelId })
    .where(eq(broadcastIds.id, broadcastId));
}

/**
 * ユーザーの配信IDを取得、なければ作成して返す
 */
export const getOrCreateBroadcastForUser = async (ownerId: string) => {
  const existing = await db.query.broadcastIds.findFirst({
    where: { ownerId },
  });

  if (existing) {
    return { broadcastId: existing.id };
  }

  const result = await createBroadcast({ ownerId });
  return { broadcastId: result.newBroadcastId };
};

export type CreateBroadcastArgs = {
  ownerId?: string;
};

export const createBroadcast = async (args?: CreateBroadcastArgs) => {
  const newBroadcastId = uuid();
  const newChannelId = nanoid();

  console.log('newBroadcastId: ', newBroadcastId);
  console.log('newChannelId: ', newChannelId);

  await db.transaction(async (tx) => {

    await tx.insert(broadcastIds)
      .values({
        id: newBroadcastId,
        currentChannelId: undefined,
        ownerId: args?.ownerId,
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

type UpdateBroadcastsChannelsArgs = {
  broadcastId: string,
  params: { name: string, description: string },
}

export const updateBroadcastsChannels = async ({
  broadcastId,
  params,
}: UpdateBroadcastsChannelsArgs) => {
  await db.insert(channels).values({
    broadcastId,
    id: nanoid(),
    ...params
  });
}

export type PatchBroadcastsChannelsArgs = {
  broadcastId: string,
  channelId: string,
  params: { name?: string, description?: string, requireAuth?: boolean },
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
