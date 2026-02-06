'use client'

import clsx from 'clsx'

import { useRouter } from 'next/navigation'

import { createChannel } from '@/actions/channelActions'

import Button from '@/components/Button'
import { PlusIcon } from '@heroicons/react/24/outline'

export type CreateChannelButtonProps = {
  broadcastId: string,
  className?: string,
}

const CreateChannelButton = ({
  broadcastId,
  className,
}: CreateChannelButtonProps) => {
  const router = useRouter()

  const handleClick = async () => {
    await createChannel(
      broadcastId, { 
        name: '新しいチャンネル',
        description: 'これはテストです',
      }
    )
    router.refresh()
  }

  return (
    <Button
      className={clsx(
        'flex flex-row gap-4 items-center text-white/70',
        className,
      )}
      onClick={handleClick}
      data-testid="channel-create-button"
      aria-label="チャンネルを追加"
    >
      <PlusIcon className='size-5' />
      チャンネルの追加
    </Button>
  )
}

export default CreateChannelButton

