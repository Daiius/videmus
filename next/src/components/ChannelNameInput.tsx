'use client'

import clsx from 'clsx'

import { useDebouncedCallback } from 'use-debounce'

import { Channel } from '@/lib/broadcastIds'
import { updateChannel } from '@/actions/channelActions'

import Input from '@/components/Input'

export type ChannelNameInputProps = {
  channel: Channel,
  className?: string,
}

const ChannelNameInput = ({
  channel,
  className,
}: ChannelNameInputProps)=> {
  const debouncedUpdateChannel = useDebouncedCallback(
    async (newName: string) => 
      await updateChannel(
        channel.broadcastId, 
        channel.id, 
        { name: newName }
      ),
    1_000,
  )

  return (
    <Input 
      className={clsx(className)}
      defaultValue={channel.name}
      onChange={async (e) => 
        await debouncedUpdateChannel(e.target.value)
      }
    />
  )
}

export default ChannelNameInput

