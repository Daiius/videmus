import clsx from 'clsx';

import { Channel } from '@/lib/broadcastIds';

import Panel from '@/components/Panel';
import CreateChannelButton from './CreateChannelButton';
import ChannelPanel from './ChannelPanel';

export type ChannelsPanelProps = {
  broadcastId: string,
  channels: Channel[],
  currentChannelId: string,
  className?: string,
}

const ChannelsPanel = ({
  broadcastId,
  channels,
  currentChannelId,
  className,
}: ChannelsPanelProps) => (
  <Panel 
    panelTitle={<div className='p-2'>配信チャンネル</div>}
    className={clsx(className)}
  >
    <div className={clsx(
      'flex flex-col gap-2 px-2 pb-2',
    )}>
      {channels.map(channel =>
        <ChannelPanel 
          key={channel.id}
          channel={channel} 
          currentChannelId={currentChannelId}
          canDelete={channels.length > 1}
        />
      )}
      {channels.length < 5
        ? <>
            <hr className='opacity-20 my-2'/>
            <CreateChannelButton broadcastId={broadcastId} />
          </>
        : <div>(チャンネルの最大数は 5 です)</div>
      }
    </div>
  </Panel>
);

export default ChannelsPanel;

