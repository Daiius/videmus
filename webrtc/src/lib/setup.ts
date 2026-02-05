import { db } from 'videmus-database'
import { user } from 'videmus-database/schema'
import { count, eq } from 'drizzle-orm'

/**
 * 管理者が存在するかチェックします
 */
export const hasAdmin = async (): Promise<boolean> => {
  const result = await db
    .select({ count: count() })
    .from(user)
    .where(eq(user.isAdmin, true))

  return (result[0]?.count ?? 0) > 0
}

/**
 * セットアップ認証情報を検証します
 */
export const verifySetupCredentials = (
  setupId: string,
  setupPassword: string
): boolean => {
  const adminSetupId = process.env.ADMIN_SETUP_ID
  const adminSetupPassword = process.env.ADMIN_SETUP_PASSWORD

  if (!adminSetupId || !adminSetupPassword) {
    return false
  }

  return setupId === adminSetupId && setupPassword === adminSetupPassword
}
