'use server'

// server actionsを定義するファイルからは
// async functionしかエクスポートできない制約が有るので
// 無駄っぽくても他の.tsファイルに本体の処理を書いておきます
// （引数や戻り値の型をエクスポートしたくなった時とか）

import { createNewBroadcastId } from '@/lib/broadcastIds';

export const createNewId = async (): Promise<string> =>
  await createNewBroadcastId();

