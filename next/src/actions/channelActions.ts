'use server'

import {
  updateChannel as updateChannelInternal,
  createChannel as createChannelInternal,
  deleteChannel as deleteChannelInternal,
  UpdateChannelParameter,
  CreateChannelParameter,
} from '@/lib/channels';

export const updateChannel = async (
  broadcastId: string,
  channelId: string,
  params: UpdateChannelParameter,
) => await updateChannelInternal(broadcastId, channelId, params);

export const createChannel = async (
  broadcastId: string,
  params: CreateChannelParameter,
) => await createChannelInternal(broadcastId, params);

export const deleteChannel = async (
  broadcastId: string,
  channelId: string,
) => await deleteChannelInternal(broadcastId, channelId);

