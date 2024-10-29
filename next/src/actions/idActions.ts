'use server'

//import { v4 as uuid } from 'uuid';
//import { db } from 'videmus-database/db';
//import { broadcastIds } from 'videmus-database/db/schema';
import { createNewBroadcastId } from '@/lib/broadcastIds';

export const createNewId = async (): Promise<string> => {
  const newId = await createNewBroadcastId();
  return newId;
}

