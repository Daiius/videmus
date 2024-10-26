import { v4 as uuid } from 'uuid';
import { db } from 'videmus-database/db';
import { broadcastIds } from 'videmus-database/db/schema';
import { eq } from 'drizzle-orm';

export const createNewBroadcastId = async (): Promise<string> => {
  const newId = uuid();
  console.log('newId: ', newId);
  await db.insert(broadcastIds).values({
    id: newId, isAvailable: false
  });
  return newId;
}

export const getBroadcastIdStatus = async (broadcastId: string): Promise<{
  isAvailable: boolean;
} | undefined> => {
  
  const validIdEntries = await db.select()
    .from(broadcastIds)
    .where(
      eq(broadcastIds.id, broadcastId)
    );

  if (validIdEntries.length === 0) {
    return undefined;
  }

  const { isAvailable } = validIdEntries[0];

  return { isAvailable };
}

