import clsx from 'clsx';

import { Channel } from '@/lib/broadcastIds';

import Panel from '@/components/Panel';
import CreateChannelButton from './CreateChannelButton';
import ChannelPanel from './ChannelPanel';


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
    panelTitle='配信チャンネル'
    className={clsx(className)}
    {...props}
  >
    <div className={clsx(
      'flex flex-col gap-2',
    )}>
      {channels.map(channel =>
        <ChannelPanel 
          channel={channel} 
          currentChannelId={currentChannelId}
          canDelete={channels.length > 1}
        />
      )}
      {channels.length < 5 &&
        <CreateChannelButton broadcastId={broadcastId} />
      }
    </div>
  </Panel>
);

export default ChannelsPanel;

