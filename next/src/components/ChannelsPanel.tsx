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
    panelTitle='配信チャンネル'
    className={clsx(className)}
  >
    <ul className='flex flex-col gap-2 px-2 pb-2'>
      {channels.map(channel =>
        <li key={channel.id}>
          <ChannelPanel 
            channel={channel} 
            currentChannelId={currentChannelId}
            canDelete={channels.length > 1}
          />
        </li>
      )}
      {channels.length < 5
        ? <li>
            <div className='opacity-20 my-2 border-b'/>
            <CreateChannelButton broadcastId={broadcastId} />
          </li>
        : <li>(チャンネルの最大数は 5 です)</li>
      }
    </ul>
  </Panel>
);

export default ChannelsPanel;

