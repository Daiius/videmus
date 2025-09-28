'use server'

// server actionsを定義するファイルからは
// async functionしかエクスポートできない制約が有るので
// 無駄っぽくても他の.tsファイルに本体の処理を書いておきます
// （引数や戻り値の型をエクスポートしたくなった時とか）

import { 
  createNewBroadcastId,
  updateCurrentChannel as updateCurrentChannelInternal,
} from '@/lib/broadcastIds';

export const createNewId = async () => await createNewBroadcastId()

export const updateCurrentChannel = async (
  broadcastId: string,
  newCurrentChannelId: string,
) => await updateCurrentChannelInternal(
  broadcastId, 
  newCurrentChannelId
);

