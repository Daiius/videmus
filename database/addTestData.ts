import { 
  broadcastIds,
  channels,
} from './db/schema';
import { db, client } from './db';
import { eq } from 'drizzle-orm';

if ( process.env.TEST_BROADCAST_ID == null
  || process.env.TEST_CHANNEL_ID == null
) {
  throw new Error('both TEST_BROADCAST_ID and TEST_CHANNEL_ID should be specified!');
}

await db.transaction(async (tx) => {

  await tx.insert(broadcastIds)
    .values({
      id: process.env.TEST_BROADCAST_ID!,
      currentChannelId: undefined,
    });

  await tx.insert(channels)
    .values({
      id: process.env.TEST_CHANNEL_ID!,
      broadcastId: process.env.TEST_BROADCAST_ID!,
      name: 'テスト用',
      description: '動作テスト用のチャンネルです',
    });

  await tx.update(broadcastIds)
    .set({
      currentChannelId: process.env.TEST_CHANNEL_ID,
    })
    .where(eq(broadcastIds.id, process.env.TEST_BROADCAST_ID!));

});

await client.end();

