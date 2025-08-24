'use client'

import clsx from 'clsx'
import useSWR from 'swr'
import { UsersIcon } from '@heroicons/react/24/outline'
import Panel from '@/components/Panel'

const fetcher = async (url: string ) => {
  const res = await fetch(url)
  if (res.status === 202) {
    return undefined
  }
  if (!res.ok) {
    throw new Error('Failed to fetch data')
  }
  return res.json()
}

export type StreamingStatusPanelProps = {
  channelId: string,
  className?: string,
}

const StreamingStatusPanel = ({
  channelId,
  className,
}: StreamingStatusPanelProps) => {
  type BroadcastingStatus = {
    streamingCount: number,
    isBroadcasting: boolean,
  }
  const { data, error } = useSWR<BroadcastingStatus>(
    `${process.env.NEXT_PUBLIC_API_URL}/streaming-status/${channelId}`,
    fetcher,
    { refreshInterval: 5_000 }
  )

  return (
    <Panel
      panelTitle='配信ステータス'
      className={clsx(className)}
    >
      <div className='flex flex-row gap-2 items-center'>
        <UsersIcon className='size-6' />
        {data != null
          ? <div>{data.streamingCount}</div>
          : <div>...</div>
        }
      </div>
      {error &&
        <div>エラー： {error.toString()}</div>
      }
    </Panel>
  )
}

export default StreamingStatusPanel

