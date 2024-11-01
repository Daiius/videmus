'use client'

import React from 'react';
import clsx from 'clsx';

import { useDebouncedCallback } from 'use-debounce';

import { Channel } from '@/lib/broadcastIds';
import { updateChannel } from '@/actions/channelActions';

import Input from '@/components/Input';


const ChannelNameInput: React.FC<
  React.ComponentProps<typeof Input>
  & { channel: Channel; }
> = ({
  channel,
  className,
  ...props
})=> {
  const debouncedUpdateChannel = useDebouncedCallback(
    async (newName: string) => 
      await updateChannel(
        channel.broadcastId, 
        channel.id, 
        { name: newName }
      ),
    1_000,
  );

  return (
    <Input 
      className={clsx(className)}
      defaultValue={channel.name}
      onChange={async (e) => 
        await debouncedUpdateChannel(e.target.value)
      }
      {...props}
    />
  );
}

export default ChannelNameInput;

