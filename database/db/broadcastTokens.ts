import { eq } from 'drizzle-orm'
import { v4 as uuid } from 'uuid'
import crypto from 'crypto'

import { db } from './index'
import { broadcastTokens, broadcastIds } from './schema'

/**
 * ランダムなトークン文字列を生成します
 */
const generateToken = (): string => {
  return crypto.randomBytes(32).toString('hex')
}

export type CreateBroadcastTokenArgs = {
  broadcastId: string
  name?: string
}

/**
 * 新しい配信トークンを作成します
 */
export const createBroadcastToken = async ({
  broadcastId,
  name = 'デフォルトトークン',
}: CreateBroadcastTokenArgs) => {
  const id = uuid()
  const token = generateToken()

  await db.insert(broadcastTokens).values({
    id,
    broadcastId,
    token,
    name,
  })

  return { id, token, name }
}

/**
 * 配信IDに関連付けられたトークン一覧を取得します
 */
export const getBroadcastTokens = async (broadcastId: string) => {
  return await db.query.broadcastTokens.findMany({
    where: { broadcastId },
    orderBy: { createdAt: 'desc' },
  })
}

/**
 * トークンを削除します
 */
export const deleteBroadcastToken = async (tokenId: string) => {
  await db.delete(broadcastTokens).where(eq(broadcastTokens.id, tokenId))
}

/**
 * トークンから配信IDを検証し取得します
 * 有効なトークンの場合は配信IDを返し、lastUsedAt を更新します
 * 無効なトークンの場合は null を返します
 */
export const validateBroadcastToken = async (
  token: string
): Promise<string | null> => {
  const tokenRecord = await db.query.broadcastTokens.findFirst({
    where: { token },
  })

  if (!tokenRecord) {
    return null
  }

  // lastUsedAt を更新
  await db
    .update(broadcastTokens)
    .set({ lastUsedAt: new Date() })
    .where(eq(broadcastTokens.id, tokenRecord.id))

  return tokenRecord.broadcastId
}

/**
 * 配信IDの所有者とトークンの配信IDが一致するか検証します
 */
export const validateTokenOwnership = async (
  tokenId: string,
  userId: string
): Promise<boolean> => {
  const tokenRecord = await db.query.broadcastTokens.findFirst({
    where: { id: tokenId },
  })

  if (!tokenRecord) {
    return false
  }

  const broadcast = await db.query.broadcastIds.findFirst({
    where: { id: tokenRecord.broadcastId },
  })

  return broadcast?.ownerId === userId
}
