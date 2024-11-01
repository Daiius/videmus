'use client'

import React from 'react';
import clsx from 'clsx';


import { Channel } from '@/lib/broadcastIds';

import Button from '@/components/Button';
import Panel from '@/components/Panel';
import ChannelNameInput from './ChannelNameInput';
import SelectCurrentChannelButton from './SelectCurrentChannelButton';
import DeleteChannelButton from './DeleteChannelButton';
import StreamUrl from '@/components/StreamUrl';

const ChannelPanel: React.FC<
  React.ComponentProps<typeof Panel>
  & { 
    channel: Channel; 
    currentChannelId: string;
    canDelete: boolean;
  }
> = ({
  channel,
  currentChannelId,
  canDelete,
  className,
  ...props
}) => {

  const streamUrl = `${process.env.NEXT_PUBLIC_HOST_URL}/stream/${channel.id}`

  return (
    <Panel 
      key={channel.id}
      panelTitle={
        <ChannelNameInput 
          className='w-full'
          channel={channel} 
        />
      }
      className={clsx(
        'bg-primary',
        channel.id === currentChannelId && 'border-2 border-success',
        className,
      )}
      {...props}
    >
      <StreamUrl 
        streamUrl={streamUrl} 
        hideButton={channel.id !== currentChannelId}
      />
      {canDelete && 
        <DeleteChannelButton
          broadcastId={channel.broadcastId}
          channelId={channel.id}
        />
      }
      {channel.id !== currentChannelId &&
        <SelectCurrentChannelButton
          broadcastId={channel.broadcastId}
          channelId={channel.id}
        />
      }
    </Panel>
  );
}

export default ChannelPanel;

