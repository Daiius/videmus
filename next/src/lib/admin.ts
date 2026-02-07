import { cookies } from 'next/headers'

const API_URL = process.env.API_URL ?? process.env.NEXT_PUBLIC_API_URL ?? ''

const getCookieHeader = async () => {
  const cookieStore = await cookies()
  return cookieStore
    .getAll()
    .map((c) => `${c.name}=${c.value}`)
    .join('; ')
}

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
  const cookieHeader = await getCookieHeader()
  const response = await fetch(`${API_URL}/admin/users`, {
    headers: {
      Cookie: cookieHeader,
    },
    cache: 'no-store',
  })

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
  const cookieHeader = await getCookieHeader()
  const response = await fetch(`${API_URL}/admin/users/${userId}/approval`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Cookie: cookieHeader,
    },
    body: JSON.stringify({ isApproved }),
  })

  if (!response.ok) {
    throw new Error(
      `ユーザー承認状態更新時にエラーが発生しました: ${response.status} ${response.statusText}`
    )
  }
}
