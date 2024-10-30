'use client'

import React from 'react';
import clsx from 'clsx';

import useSWR from 'swr';

import { 
  ArrowPathIcon, 
  ClipboardDocumentIcon,
} from '@heroicons/react/24/outline';
import { ClipboardDocumentCheckIcon } from '@heroicons/react/24/solid';

import Panel from '@/components/Panel';
import Button from '@/components/Button';

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


const StreamIdPanel: React.FC<
  React.ComponentProps<typeof Panel>
  & {
    broadcastId: string;
  }
> = ({
  broadcastId,
  className,
  ...props
}) => {
  const { data, error } = useSWR<{ streamId: string }>(
    `/videmus/api/stream-id/${broadcastId}`,
    fetcher,
    { refreshInterval: 5_000 }
  );

  const [isCopied, setIsCopied] = React.useState<boolean>(false);

  // 視聴用URLが変化する度にisCopiedをfalseにする
  React.useEffect(() => {
    setIsCopied(false);
  }, [data]);

  const streamUrl: string|undefined = data != null
    ? `${process.env.NEXT_PUBLIC_HOST_URL}/stream/${data.streamId}`
    : undefined;

  return (
    <Panel
      title='視聴用URL'
      className={clsx(className)}
      {...props}
    >
      {streamUrl == null
        ? <div className='flex flex-row  gap-1 items-center'>
            <div className='text-foreground/50'>配信を待機中...</div>
            <ArrowPathIcon className={clsx(
              'size-4 animate-spin'
            )}/>
          </div>
        : <div className='flex flex-row gap-1 items-center'>
            <div>{streamUrl}</div>
            <Button
              onClick={async () => {
                await navigator.clipboard.writeText(streamUrl);
                setIsCopied(true);
              }}
            >
              {isCopied
                ? <ClipboardDocumentCheckIcon className='size-6' />
                : <ClipboardDocumentIcon className='size-6' />
              }
            </Button>
          </div>
      }
      {error &&
        <div>エラー： {error.toString()}</div>
      }
    </Panel>
  );
};

export default StreamIdPanel;

