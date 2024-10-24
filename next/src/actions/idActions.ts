'use server'

import { v4 as uuid } from 'uuid';
import { db } from 'videmus-database/db';
import { broadcastIds } from 'videmus-database/db/schema';

export const createNewId = async (): Promise<string> => {
  const newId = uuid();
  console.log('newId: ', newId);
  await db.insert(broadcastIds).values({
    id: newId, isAvailable: false
  });
  return newId;
}

