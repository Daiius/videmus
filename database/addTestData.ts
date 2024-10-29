import { broadcastIds } from './db/schema';
import { db, connection } from './db';

await db.insert(broadcastIds).values({
  id: process.env.TEST_BROADCAST_ID!,
  isAvailable: true,
});

await connection.end();

