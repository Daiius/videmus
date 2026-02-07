'use server'

import {
  updateCurrentChannel as updateCurrentChannelInternal,
} from '@/lib/broadcastIds';

export const updateCurrentChannel = async (
  broadcastId: string,
  newCurrentChannelId: string,
) => await updateCurrentChannelInternal(
  broadcastId,
  newCurrentChannelId
);
