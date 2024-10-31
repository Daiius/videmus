'use client'

import React from 'react';
import clsx from 'clsx';

import { useRouter } from 'next/navigation';

import { createChannel } from '@/actions/channelActions';

import Button from '@/components/Button';
import { PlusIcon } from '@heroicons/react/24/outline';

const CreateChannelButton: React.FC<
  React.ComponentProps<typeof Button>
  & { broadcastId: string }
> = ({
  broadcastId,
  className,
  ...props
}) => {
  const router = useRouter();
  return (
    <>
      <Button
        className={clsx(className)}
        onClick={async () => {
          await createChannel(
            broadcastId, { 
              name: '新しいチャンネル',
              description: 'これはテストです',
            }
          );
          router.refresh();
        }}
        {...props}
      >
        <PlusIcon className='size-5' />
      </Button>
    </>
  );
};

export default CreateChannelButton;

