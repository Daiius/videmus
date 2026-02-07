import { serverClient } from './api'

export type AdminUser = {
  id: string
  name: string
  email: string
  image: string | null
  isAdmin: boolean
  isApproved: boolean
  createdAt: string
  broadcastId: string | null
}

/**
 * ユーザー一覧を取得します（管理者のみ）
 */
export const getUsers = async (): Promise<AdminUser[]> => {
  const client = await serverClient()
  const response = await client.admin.users.$get()

  if (!response.ok) {
    throw new Error(
      `ユーザー一覧取得時にエラーが発生しました: ${response.status} ${response.statusText}`
    )
  }
  return await response.json()
}

/**
 * ユーザーの承認状態を更新します（管理者のみ）
 */
export const setUserApproval = async (userId: string, isApproved: boolean): Promise<void> => {
  const client = await serverClient()
  const response = await client.admin.users[':userId'].approval.$patch({
    param: { userId },
    json: { isApproved },
  })

  if (!response.ok) {
    throw new Error(
      `ユーザー承認状態更新時にエラーが発生しました: ${response.status} ${response.statusText}`
    )
  }
}
