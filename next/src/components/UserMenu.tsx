'use client'

import { useState } from 'react'
import clsx from 'clsx'
import { Menu, MenuButton, MenuItem, MenuItems } from '@headlessui/react'
import { UserCircleIcon, ArrowRightStartOnRectangleIcon } from '@heroicons/react/24/outline'

import { useAuth } from '@/components/AuthProvider'
import Button from '@/components/Button'
import LoginButton from '@/components/LoginButton'

type UserMenuProps = {
  className?: string
}

const UserMenu: React.FC<UserMenuProps> = ({ className }) => {
  const { user, isLoading } = useAuth()
  const [isLoggingOut, setIsLoggingOut] = useState(false)

  const handleLogout = async () => {
    setIsLoggingOut(true)
    try {
      // プロキシ経由でログアウト
      await fetch('/api/auth/sign-out', {
        method: 'POST',
        credentials: 'include',
      })
      window.location.reload()
    } catch {
      setIsLoggingOut(false)
    }
  }

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
    <Menu as='div' className={clsx('relative', className)}>
      <MenuButton className='flex items-center gap-2'>
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
      </MenuButton>

      <MenuItems
        className={clsx(
          'absolute right-0 mt-2 w-48 origin-top-right',
          'bg-panel rounded-md shadow-lg ring-1 ring-black ring-opacity-5',
          'focus:outline-none z-50'
        )}
      >
        <div className='px-4 py-2 text-sm text-gray-500 border-b border-gray-200'>
          {user.email}
        </div>
        <MenuItem>
          <Button
            onClick={handleLogout}
            disabled={isLoggingOut}
            className={clsx(
              'w-full flex items-center gap-2 px-4 py-2 text-sm',
              'bg-transparent hover:bg-gray-100',
              'data-[focus]:bg-gray-100'
            )}
          >
            <ArrowRightStartOnRectangleIcon className='w-4 h-4' />
            {isLoggingOut ? 'ログアウト中...' : 'ログアウト'}
          </Button>
        </MenuItem>
      </MenuItems>
    </Menu>
  )
}

export default UserMenu
