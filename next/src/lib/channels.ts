import { hc } from 'videmus-webrtc'
import type { AppType } from 'videmus-webrtc'

import { z } from 'zod';

const client = hc<AppType>(process.env.NEXT_PUBLIC_API_URL ?? "")

// NOTE: 注意！最新版だとどこか齟齬が出るのか、create*Schema系がエラーになる
// 手動で対応するが、矛盾しないように注意
const updateChannelParameterSchema = 
z.object({
  name: 
    z.string()
    .max(254, 'channel name is too long!')
    .optional(),
  description:
    z.string()
    .max(1024, 'description is too long!')
    .optional(),
});

export type UpdateChannelParameter = 
  z.infer<typeof updateChannelParameterSchema>;

export const updateChannel = async (
  broadcastId: string,
  channelId: string,
  params: UpdateChannelParameter,
) => {
  const response = await client.broadcasts[':broadcastId'].channels[':channelId'].$patch({
    param: { broadcastId, channelId },
    json: params,
  })
  if (!response.ok) {
    throw new Error(
      `チャンネル情報の更新に失敗しました: ${response.status} ${response.statusText}`
    )
  }

  return await response.json()
}

// NOTE: 注意！最新版だとどこか齟齬が出るのか、create*Schema系がエラーになる
// 手動で対応するが、矛盾しないように注意
const createChannelParameterSchema = z.object({
  name: 
    z.string()
    .max(254, 'channel name is too long!'),
  description:
    z.string()
    .max(1024, 'description is too long!'),
});
//  createSelectSchema(channels)
//  .pick({ name: true, description: true });
export type CreateChannelParameter = 
  z.infer<typeof createChannelParameterSchema>;

export const createChannel = async (
  broadcastId: string,
  params: CreateChannelParameter
) => {
  const response = await client.broadcasts[':broadcastId'].channels.$post({
    param: { broadcastId },
    json: params,
  })
  if (!response.ok) {
    throw new Error(
      `チャンネルの新規作成に失敗しました ${response.status} ${response.statusText}`
    )
  }
  //return await response.json()
};

export const deleteChannel = async (
  broadcastId: string,
  channelId: string,
) => {
  const response = await client.broadcasts[':broadcastId'].channels[':channelId'].$delete({
    param: { broadcastId, channelId },
  })
  if (!response.ok) {
    throw new Error(
      `チャンネルの削除に失敗しました ${response.status} ${response.statusText}`
    )
  }
  //return await response.json()
}

