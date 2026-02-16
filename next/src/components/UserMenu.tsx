'use client'

import clsx from 'clsx'
import { Menu } from '@base-ui/react/menu'
import { UserCircleIcon, ArrowRightStartOnRectangleIcon, ShieldCheckIcon } from '@heroicons/react/24/outline'

import { useAuth } from '@/components/AuthProvider'
import LoginButton from '@/components/LoginButton'

type UserMenuProps = {
  className?: string
}

const UserMenu: React.FC<UserMenuProps> = ({ className }) => {
  const { user, isLoading } = useAuth()

  if (isLoading) {
    return (
      <div className={clsx('animate-pulse', className)}>
        <div className='w-8 h-8 bg-gray-300 rounded-full' />
      </div>
    )
  }

  if (!user) {
    return <LoginButton className={className} />
  }

  return (
    <div className={clsx('relative', className)}>
      <Menu.Root>
        <Menu.Trigger className='flex items-center gap-2'>
          {user.image ? (
            <img
              src={user.image}
              alt={user.name}
              className='w-8 h-8 rounded-full'
            />
          ) : (
            <UserCircleIcon className='w-8 h-8' />
          )}
          <span className='text-sm hidden sm:inline'>{user.name}</span>
          {user.isAdmin && (
            <span className='text-xs bg-primary px-1 rounded hidden sm:inline'>
              管理者
            </span>
          )}
        </Menu.Trigger>

        <Menu.Portal>
          <Menu.Positioner side="bottom" align="end" sideOffset={8}>
            <Menu.Popup
              className={clsx(
                'w-48',
                'bg-panel rounded-md shadow-lg ring-1 ring-black ring-opacity-5',
                'focus:outline-none z-50'
              )}
            >
              <div className='px-4 py-2 text-sm text-gray-500 border-b border-gray-200'>
                {user.email}
              </div>
              {user.isAdmin && (
                <Menu.Item
                  render={<a href="/admin" />}
                  className={clsx(
                    'w-full flex items-center gap-2 px-4 py-2 text-sm',
                    'bg-transparent hover:bg-gray-100',
                    'data-[highlighted]:bg-gray-100',
                    'no-underline text-inherit'
                  )}
                >
                  <ShieldCheckIcon className='w-4 h-4' />
                  ユーザー管理
                </Menu.Item>
              )}
              <Menu.Item
                render={<a href="/auth/cleanup" />}
                className={clsx(
                  'w-full flex items-center gap-2 px-4 py-2 text-sm',
                  'bg-transparent hover:bg-gray-100',
                  'data-[highlighted]:bg-gray-100',
                  'no-underline text-inherit'
                )}
              >
                <ArrowRightStartOnRectangleIcon className='w-4 h-4' />
                ログアウト
              </Menu.Item>
            </Menu.Popup>
          </Menu.Positioner>
        </Menu.Portal>
      </Menu.Root>
    </div>
  )
}

export default UserMenu
