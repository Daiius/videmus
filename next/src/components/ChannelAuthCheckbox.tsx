'use client'

import { useState, useTransition } from 'react'
import clsx from 'clsx'

import { updateChannel } from '@/actions/channelActions'

type ChannelAuthCheckboxProps = {
  broadcastId: string
  channelId: string
  initialRequireAuth: boolean
  className?: string
}

const ChannelAuthCheckbox: React.FC<ChannelAuthCheckboxProps> = ({
  broadcastId,
  channelId,
  initialRequireAuth,
  className,
}) => {
  const [requireAuth, setRequireAuth] = useState(initialRequireAuth)
  const [isPending, startTransition] = useTransition()

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.checked
    setRequireAuth(newValue)

    startTransition(async () => {
      try {
        await updateChannel(broadcastId, channelId, { requireAuth: newValue })
      } catch {
        // エラー時は元に戻す
        setRequireAuth(!newValue)
      }
    })
  }

  return (
    <label
      className={clsx(
        'flex items-center gap-2 cursor-pointer',
        isPending && 'opacity-50',
        className
      )}
    >
      <input
        type='checkbox'
        checked={requireAuth}
        onChange={handleChange}
        disabled={isPending}
        className='w-4 h-4'
      />
      <span className='text-sm'>視聴に認証が必要</span>
    </label>
  )
}

export default ChannelAuthCheckbox
