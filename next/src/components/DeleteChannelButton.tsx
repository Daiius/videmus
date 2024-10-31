'use client'

import React from 'react';
import clsx from 'clsx';

import { useRouter } from 'next/navigation';

import { deleteChannel } from '@/actions/channelActions';

import Button from '@/components/Button';
import { TrashIcon } from '@heroicons/react/24/outline';

const DeleteChannelButton: React.FC<
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
        await deleteChannel(broadcastId, channelId);
        router.refresh();
      }}
      {...props}
    >
      <TrashIcon className='size-4 text-danger' />
    </Button>
  );
};

export default DeleteChannelButton;

