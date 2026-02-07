import { eq } from 'drizzle-orm'

import { db } from './index'
import { user, broadcastIds } from './schema'

/**
 * 全ユーザー一覧を取得（配信ID情報付き）
 */
export const listUsers = async () => {
  const users = await db.query.user.findMany({
    orderBy: { createdAt: 'desc' },
  })

  const broadcasts = await db.query.broadcastIds.findMany()

  return users.map((u) => {
    const broadcast = broadcasts.find((b) => b.ownerId === u.id)
    return {
      id: u.id,
      name: u.name,
      email: u.email,
      image: u.image,
      isAdmin: u.isAdmin,
      isApproved: u.isApproved,
      createdAt: u.createdAt,
      broadcastId: broadcast?.id ?? null,
    }
  })
}

/**
 * ユーザーの承認状態を更新
 */
export const setUserApproval = async (userId: string, isApproved: boolean) => {
  await db
    .update(user)
    .set({ isApproved })
    .where(eq(user.id, userId))
}

/**
 * ユーザーIDからユーザー情報を取得
 */
export const getUserById = async (userId: string) => {
  return await db.query.user.findFirst({
    where: { id: userId },
  })
}
