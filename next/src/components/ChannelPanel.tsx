'use client'

import clsx from 'clsx'

import { Channel } from '@/lib/broadcastIds'

import Panel from '@/components/Panel'
import ChannelNameInput from './ChannelNameInput'
import SelectCurrentChannelButton from './SelectCurrentChannelButton'
import DeleteChannelButton from './DeleteChannelButton'
import StreamUrl from '@/components/StreamUrl'
import ChannelAuthCheckbox from './ChannelAuthCheckbox'

export type ChannelPanelProps = {
  channel: Channel,
  currentChannelId: string,
  canDelete: boolean,
  className?: string,
}

const ChannelPanel = ({
  channel,
  currentChannelId,
  canDelete,
  className,
}: ChannelPanelProps) => {

  const streamUrl = `${process.env.NEXT_PUBLIC_HOST_URL}/stream/${channel.id}`

  return (
    <Panel
      key={channel.id}
      className={clsx(
        'bg-primary',
        channel.id === currentChannelId && 'border-2 border-success',
        'flex flex-col',
        'p-1',
        className,
      )}
      panelTitle={
        <div className='flex flex-row gap-4'>
          <ChannelNameInput className='w-full' channel={channel} />
          {canDelete &&
            <DeleteChannelButton
              className='ms-auto'
              broadcastId={channel.broadcastId}
              channelId={channel.id}
            />
          }
        </div>
      }
    >
      <StreamUrl
        className='ml-2'
        streamUrl={streamUrl}
        hideButton={channel.id !== currentChannelId}
      />
      <div className='ml-2 mt-2'>
        <ChannelAuthCheckbox
          broadcastId={channel.broadcastId}
          channelId={channel.id}
          initialRequireAuth={channel.requireAuth ?? false}
        />
      </div>
      {channel.id !== currentChannelId &&
        <SelectCurrentChannelButton
          broadcastId={channel.broadcastId}
          channelId={channel.id}
        />
      }
    </Panel>
  )
}

export default ChannelPanel
