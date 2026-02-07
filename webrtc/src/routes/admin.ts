import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { z } from 'zod/v4'

import { listUsers, setUserApproval } from 'videmus-database/admin'
import { sessionAuth, adminOnly } from '../middlewares'

export const adminApp = new Hono()

/**
 * ユーザー一覧取得（管理者のみ）
 */
adminApp.get(
  '/admin/users',
  sessionAuth,
  adminOnly,
  async (c) => {
    const users = await listUsers()
    return c.json(users)
  },
)

/**
 * ユーザー承認状態の切替（管理者のみ）
 */
adminApp.patch(
  '/admin/users/:userId/approval',
  sessionAuth,
  adminOnly,
  zValidator(
    'json',
    z.object({
      isApproved: z.boolean(),
    }),
  ),
  async (c) => {
    const userId = c.req.param('userId')
    const { isApproved } = c.req.valid('json')

    await setUserApproval(userId, isApproved)

    return c.json({ success: true, userId, isApproved })
  },
)
