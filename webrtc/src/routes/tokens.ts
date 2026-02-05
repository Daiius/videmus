import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { z } from 'zod/v4'
import { db } from 'videmus-database'
import { eq } from 'drizzle-orm'

import { sessionAuth } from '../middlewares'
import {
  createBroadcastToken,
  getBroadcastTokens,
  deleteBroadcastToken,
} from 'videmus-database/broadcastTokens'

export const tokensApp = new Hono()

/**
 * 配信IDに関連付けられたトークン一覧を取得
 */
tokensApp.get(
  '/broadcasts/:broadcastId/tokens',
  sessionAuth,
  async (c) => {
    const broadcastId = c.req.param('broadcastId')
    const session = c.get('session')

    if (!session?.user) {
      return c.json({ error: 'Authentication required' }, 401)
    }

    // 所有者または管理者のみアクセス可能
    const broadcast = await db.query.broadcastIds.findFirst({
      where: { id: broadcastId },
    })

    if (!broadcast) {
      return c.json({ error: 'Broadcast not found' }, 404)
    }

    const user = session.user as { id: string; isAdmin?: boolean }
    const isOwner = broadcast.ownerId === user.id
    const isAdmin = user.isAdmin

    if (!isOwner && !isAdmin) {
      return c.json({ error: 'Access denied' }, 403)
    }

    const tokens = await getBroadcastTokens(broadcastId)

    // トークン値は一覧では返さない（セキュリティ上の理由）
    const safeTokens = tokens.map((t) => ({
      id: t.id,
      name: t.name,
      createdAt: t.createdAt,
      lastUsedAt: t.lastUsedAt,
    }))

    return c.json(safeTokens)
  }
)

/**
 * 新しい配信トークンを作成
 */
tokensApp.post(
  '/broadcasts/:broadcastId/tokens',
  sessionAuth,
  zValidator(
    'json',
    z.object({
      name: z.string().max(255).optional(),
    })
  ),
  async (c) => {
    const broadcastId = c.req.param('broadcastId')
    const session = c.get('session')
    const { name } = c.req.valid('json')

    if (!session?.user) {
      return c.json({ error: 'Authentication required' }, 401)
    }

    // 所有者または管理者のみアクセス可能
    const broadcast = await db.query.broadcastIds.findFirst({
      where: { id: broadcastId },
    })

    if (!broadcast) {
      return c.json({ error: 'Broadcast not found' }, 404)
    }

    const user = session.user as { id: string; isAdmin?: boolean }
    const isOwner = broadcast.ownerId === user.id
    const isAdmin = user.isAdmin

    if (!isOwner && !isAdmin) {
      return c.json({ error: 'Access denied' }, 403)
    }

    const token = await createBroadcastToken({
      broadcastId,
      name: name ?? 'デフォルトトークン',
    })

    // 新規作成時のみトークン値を返す
    return c.json({
      id: token.id,
      token: token.token,
      name: token.name,
    })
  }
)

/**
 * 配信トークンを削除
 */
tokensApp.delete(
  '/broadcasts/:broadcastId/tokens/:tokenId',
  sessionAuth,
  async (c) => {
    const broadcastId = c.req.param('broadcastId')
    const tokenId = c.req.param('tokenId')
    const session = c.get('session')

    if (!session?.user) {
      return c.json({ error: 'Authentication required' }, 401)
    }

    // 所有者または管理者のみアクセス可能
    const broadcast = await db.query.broadcastIds.findFirst({
      where: { id: broadcastId },
    })

    if (!broadcast) {
      return c.json({ error: 'Broadcast not found' }, 404)
    }

    const user = session.user as { id: string; isAdmin?: boolean }
    const isOwner = broadcast.ownerId === user.id
    const isAdmin = user.isAdmin

    if (!isOwner && !isAdmin) {
      return c.json({ error: 'Access denied' }, 403)
    }

    await deleteBroadcastToken(tokenId)

    return c.body(null, 204)
  }
)
