'use client'

import React from 'react';
import clsx from 'clsx';

import useSWR from 'swr';

import { UsersIcon } from '@heroicons/react/24/outline';

import Panel from '@/components/Panel';

const fetcher = async (url: string ) => {
  const res = await fetch(url);
  if (res.status === 202) {
    return undefined;
  }
  if (!res.ok) {
    throw new Error('Failed to fetch data');
  }
  return res.json();
}


const StreamingStatusPanel: React.FC<
  React.ComponentProps<typeof Panel>
  & {
    channelId: string;
  }
> = ({
  channelId,
  className,
  ...props
}) => {
  type BroadcastingStatus = {
    streamingCount: number;
    isBroadcasting: boolean;
  };
  const { data, error } = useSWR<BroadcastingStatus>(
    `/videmus/api/streaming-status/${channelId}`,
    fetcher,
    { refreshInterval: 5_000 }
  );

  return (
    <Panel
      panelTitle='配信ステータス'
      className={clsx(className)}
      {...props}
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
  );
};

export default StreamingStatusPanel;

