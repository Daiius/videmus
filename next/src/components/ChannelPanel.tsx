'use client'

import clsx from 'clsx'

import { useRouter } from 'next/navigation'

import { Channel } from '@/lib/broadcastIds'

import { uploadThumbnail } from '@/actions/channelActions'

import Panel from '@/components/Panel'
import ChannelNameInput from './ChannelNameInput'
import SelectCurrentChannelButton from './SelectCurrentChannelButton'
import DeleteChannelButton from './DeleteChannelButton'
import StreamUrl from '@/components/StreamUrl'

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

  const router = useRouter()

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

      <div>
        <form
          onSubmit={async e => {
            e.preventDefault()
            const formData = new FormData(e.currentTarget)
            const file = formData.get('thumbnail-file') as File | null

            if (!file) return

            await uploadThumbnail(channel.broadcastId, channel.id, file)
            router.refresh()

          }}
        >
          <input type="file" name="thumbnail-file" accept="image/png,image/jpeg,image/webp" />
          <button type="submit">アップロード</button>
          <img src={channel.thumbnailUrl ?? ''} />
        </form>
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

