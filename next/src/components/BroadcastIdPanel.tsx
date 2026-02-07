import clsx from 'clsx';

import { CheckCircleIcon } from '@heroicons/react/24/outline';
import { XCircleIcon } from '@heroicons/react/24/outline';

import Panel from '@/components/Panel';

export type BroadcastIdPanelProps = {
  broadcastId: string,
  isApproved: boolean,
  className?: string,
}

const BroadcastIdPanel = ({
  broadcastId,
  isApproved,
  className,
}: BroadcastIdPanelProps) => (
  <Panel
    panelTitle='ID'
    inline
    className={clsx(className)}
  >
    <div className='flex gap-1 items-center min-w-0'>
      <p className='overflow-ellipsis overflow-hidden whitespace-nowrap min-w-0'>
        {broadcastId}
      </p>
      {isApproved
        ? <CheckCircleIcon className='size-4 text-green-400' aria-hidden='true' />
        : <XCircleIcon className='size-4 text-amber-400' aria-hidden='true' />
      }
      <p>{isApproved ? '有効' : '承認待ち' }</p>
    </div>
    {!isApproved &&
      <div className={clsx(
        'ml-4',
        'p-2',
        'border border-amber-400 rounded-md',
      )}>
        <p>管理者の承認をお待ちください</p>
        <p>承認されると配信が有効になります</p>
      </div>
    }
  </Panel>
);

export default BroadcastIdPanel;
