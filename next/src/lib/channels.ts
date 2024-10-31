import { db } from 'videmus-database/db';
import { 
  broadcastIds,
  channels,
} from 'videmus-database/db/schema';
import { eq, and } from 'drizzle-orm';
import { createSelectSchema } from 'drizzle-zod';

import { nanoid } from 'nanoid';

import { z } from 'zod';

const updateChannelParameterSchema = createSelectSchema(channels, {
  name: (schema) => schema.name
    .max(256, 'channel name is too long!')
    .optional(),
  description: (schema) => schema.description
    .max(1024, 'description is too long!')
    .optional(),
}).pick({ name: true, description: true, })

export type UpdateChannelParameter = 
  z.infer<typeof updateChannelParameterSchema>;

export const updateChannel = async (
  broadcastId: string,
  channelId: string,
  params: UpdateChannelParameter,
) => {
  const parsedParams = updateChannelParameterSchema.parse(params);
  await db
    .update(channels)
    .set(parsedParams)
    .where(
      and(
        eq(channels.id, channelId),
        eq(channels.broadcastId, broadcastId)
      )
    );
}

const createChannelParameterSchema = createSelectSchema(channels)
  .pick({ name: true, description: true });
export type CreateChannelParameter = 
  z.infer<typeof createChannelParameterSchema>;

export const createChannel = async (
  broadcastId: string,
  params: CreateChannelParameter
) => {
  await db.insert(channels).values({
    broadcastId,
    id: nanoid(),
    ...params
  });
};

export const deleteChannel = async (
  broadcastId: string,
  channelId: string,
) => {
  const relatedChannels = await db.select()
    .from(channels)
    .where(
      eq(channels.broadcastId, broadcastId),
    );
  if (relatedChannels.length < 2) {
    throw new Error('you cannot delete all channels');
  }
  await db
    .delete(channels)
    .where(
      and(
        eq(channels.id, channelId),
        eq(channels.broadcastId, broadcastId)
      )
    );
};
