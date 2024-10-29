'use client'

import clsx from 'clsx';
import useSWR from 'swr';

import { ArrowPathIcon } from '@heroicons/react/24/outline';


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

const StreamIdChecker: React.FC<{
  broadcastId: string
}> = ({
  broadcastId,
}) => {
  const { data, error } = useSWR<{ streamId: string }>(
    `/videmus/api/stream-id/${broadcastId}`,
    fetcher,
    { refreshInterval: 5_000 }
  );

  return (
    <div>
      {data == null
        ? <div className='flex flex-row  gap-1 items-center'>
            <div>配信を開始すると、視聴用URLを表示します...</div>
            <ArrowPathIcon className={clsx(
              'size-4 animate-spin'
            )}/>
          </div>
        : <div>視聴用URL: {`${process.env.NEXT_PUBLIC_HOST_URL}/stream/${data.streamId}`}</div>
      }
      {error &&
        <div>エラー： {error.toString()}</div>
      }
    </div>
  );
};

export default StreamIdChecker;

