import { z } from 'zod'
import { cookies } from 'next/headers'

const API_URL = process.env.API_URL ?? process.env.NEXT_PUBLIC_API_URL ?? ''

const getCookieHeader = async () => {
  const cookieStore = await cookies()
  return cookieStore
    .getAll()
    .map((c) => `${c.name}=${c.value}`)
    .join('; ')
}

const updateChannelParameterSchema = z.object({
  name: z.string().max(254, 'channel name is too long!').optional(),
  description: z.string().max(1024, 'description is too long!').optional(),
  requireAuth: z.boolean().optional(),
})

export type UpdateChannelParameter = z.infer<typeof updateChannelParameterSchema>

export const updateChannel = async (
  broadcastId: string,
  channelId: string,
  params: UpdateChannelParameter,
) => {
  const cookieHeader = await getCookieHeader()
  const response = await fetch(
    `${API_URL}/broadcasts/${broadcastId}/channels/${channelId}`,
    {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Cookie: cookieHeader,
      },
      body: JSON.stringify(params),
    }
  )

  if (!response.ok) {
    throw new Error(
      `チャンネル情報の更新に失敗しました: ${response.status} ${response.statusText}`
    )
  }
}

const createChannelParameterSchema = z.object({
  name: z.string().max(254, 'channel name is too long!'),
  description: z.string().max(1024, 'description is too long!'),
})

export type CreateChannelParameter = z.infer<typeof createChannelParameterSchema>

export const createChannel = async (
  broadcastId: string,
  params: CreateChannelParameter
) => {
  const cookieHeader = await getCookieHeader()
  const response = await fetch(
    `${API_URL}/broadcasts/${broadcastId}/channels`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: cookieHeader,
      },
      body: JSON.stringify(params),
    }
  )

  if (!response.ok) {
    throw new Error(
      `チャンネルの新規作成に失敗しました ${response.status} ${response.statusText}`
    )
  }
}

export const deleteChannel = async (
  broadcastId: string,
  channelId: string,
) => {
  const cookieHeader = await getCookieHeader()
  const response = await fetch(
    `${API_URL}/broadcasts/${broadcastId}/channels/${channelId}`,
    {
      method: 'DELETE',
      headers: {
        Cookie: cookieHeader,
      },
    }
  )

  if (!response.ok) {
    throw new Error(
      `チャンネルの削除に失敗しました ${response.status} ${response.statusText}`
    )
  }
}

