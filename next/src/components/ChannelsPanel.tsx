import clsx from 'clsx';

import { Channel } from '@/lib/broadcastIds';

import Panel from '@/components/Panel';
import DeleteChannelButton from './DeleteChannelButton';
import CreateChannelButton from './CreateChannelButton';
import SelectCurrentChannelButton from './SelectCurrentChannelButton';


const ChannelsPanel: React.FC<
  React.ComponentProps<typeof Panel>
  & {
    broadcastId: string;
    channels: Channel[]
    currentChannelId: string;
  }
> = ({
  broadcastId,
  channels,
  currentChannelId,
  className,
  ...props
}) => (
  <Panel 
    title='配信チャンネル'
    className={clsx(className)}
    {...props}
  >
    <div className={clsx(
      'flex flex-col gap-2',
    )}>
      {channels.map(channel =>
        <Panel 
          key={channel.id}
          title={channel.name}
          className={clsx(
            'bg-primary',
            channel.id === currentChannelId && 'border-2 border-success'
          )}
        >
          <div>{channel.id}</div>
          {channels.length > 1 && 
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
      )}
      {channels.length < 5 &&
        <CreateChannelButton broadcastId={broadcastId} />
      }
    </div>
  </Panel>
);

export default ChannelsPanel;

