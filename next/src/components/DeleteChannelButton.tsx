'use client'

import clsx from 'clsx'

import { useRouter } from 'next/navigation'
import { deleteChannel } from '@/actions/channelActions'
import Button from '@/components/Button'
import { TrashIcon } from '@heroicons/react/24/outline'

export type DeleteChannelButtonProps = {
  broadcastId: string,
  channelId: string,
  className?: string,
}

const DeleteChannelButton = ({
  broadcastId,
  channelId,
  className,
}: DeleteChannelButtonProps) => {
  const router = useRouter()
  return (
    <Button
      className={clsx(className)}
      onClick={async () => {
        await deleteChannel(broadcastId, channelId)
        router.refresh()
      }}
    >
      <TrashIcon className='size-4 text-danger' />
    </Button>
  )
}

export default DeleteChannelButton

