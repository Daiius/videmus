'use client'

import React from 'react';
import clsx from 'clsx';

import { useRouter } from 'next/navigation';

import { updateCurrentChannel } from '@/actions/idActions';

import Button from '@/components/Button';

const SelectCurrentChannelButton: React.FC<
  React.ComponentProps<typeof Button>
  & {
    broadcastId: string;
    channelId: string;
  }
> = ({
  broadcastId,
  channelId,
  className,
  ...props
}) => {
  const router = useRouter();
  return (
    <Button
      className={clsx(className)}
      onClick={async () => {
        // データベースの現在のチャネルを書き換え
        await updateCurrentChannel(
          broadcastId,
          channelId,
        );
        // 配信中ならリソースのチャンネルIDも書き換え
        // (配信前なら202ステータス)
        await fetch(
          ` ${process.env.NEXT_PUBLIC_API_URL}/api/current-channel/${broadcastId}`, {
            method: 'POST',
            body: JSON.stringify({ channelId, }),
        });
        router.refresh();
      }}
      {...props}
    >
      選択
    </Button>
  )
}

export default SelectCurrentChannelButton;

