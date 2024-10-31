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
        await updateCurrentChannel(
          broadcastId,
          channelId,
        );
        router.refresh();
      }}
      {...props}
    >
      選択
    </Button>
  )
}

export default SelectCurrentChannelButton;

