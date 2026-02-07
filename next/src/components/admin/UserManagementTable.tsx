'use client'

import clsx from 'clsx'
import useSWR from 'swr'

import type { AdminUser } from '@/lib/admin'

const fetcher = (url: string) => fetch(url, { credentials: 'include' }).then(res => res.json())

const UserManagementTable: React.FC = () => {
  const { data: users, mutate, isLoading } = useSWR<AdminUser[]>(
    '/api/admin/users',
    fetcher,
  )

  const handleToggleApproval = async (userId: string, currentApproval: boolean) => {
    const newApproval = !currentApproval
    await fetch(`/api/admin/users/${userId}/approval`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ isApproved: newApproval }),
    })
    mutate()
  }

  if (isLoading) {
    return <p className='text-sm text-gray-400'>読み込み中...</p>
  }

  if (!users || users.length === 0) {
    return <p className='text-sm text-gray-400'>ユーザーが見つかりません</p>
  }

  return (
    <div className='overflow-x-auto'>
      <table className='w-full text-sm'>
        <thead>
          <tr className='border-b border-gray-600'>
            <th className='text-left py-2 px-2'>ユーザー</th>
            <th className='text-left py-2 px-2'>メール</th>
            <th className='text-left py-2 px-2'>登録日</th>
            <th className='text-center py-2 px-2'>承認状態</th>
          </tr>
        </thead>
        <tbody>
          {users.map((user) => (
            <tr key={user.id} className='border-b border-gray-700'>
              <td className='py-2 px-2'>
                <div className='flex items-center gap-2'>
                  {user.image ? (
                    <img
                      src={user.image}
                      alt={user.name}
                      className='w-6 h-6 rounded-full'
                    />
                  ) : (
                    <div className='w-6 h-6 rounded-full bg-gray-500' />
                  )}
                  <span>{user.name}</span>
                  {user.isAdmin && (
                    <span className='text-xs bg-primary px-1 rounded'>管理者</span>
                  )}
                </div>
              </td>
              <td className='py-2 px-2 text-gray-400'>{user.email}</td>
              <td className='py-2 px-2 text-gray-400'>
                {new Date(user.createdAt).toLocaleDateString('ja-JP')}
              </td>
              <td className='py-2 px-2 text-center'>
                {user.isAdmin ? (
                  <span className='text-xs text-green-400'>常に承認済み</span>
                ) : (
                  <button
                    data-testid={`user-approval-toggle-${user.id}`}
                    onClick={() => handleToggleApproval(user.id, user.isApproved)}
                    className={clsx(
                      'px-3 py-1 rounded text-xs font-medium transition-colors',
                      user.isApproved
                        ? 'bg-green-600 hover:bg-green-700 text-white'
                        : 'bg-gray-600 hover:bg-gray-500 text-gray-200'
                    )}
                  >
                    {user.isApproved ? '承認済み' : '未承認'}
                  </button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export default UserManagementTable
