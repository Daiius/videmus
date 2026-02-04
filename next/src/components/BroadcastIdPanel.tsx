import clsx from 'clsx';

import { CheckCircleIcon } from '@heroicons/react/24/outline';
import { XCircleIcon } from '@heroicons/react/24/outline';

import Panel from '@/components/Panel';

export type BroadcastIdPanelProps = {
  broadcastId: string,
  isAvailable: boolean,
  className?: string,
}

const BroadcastIdPanel = ({
  broadcastId,
  isAvailable,
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
      {isAvailable
        ? <CheckCircleIcon className='size-4 text-green-400' aria-hidden='true' />
        : <XCircleIcon className='size-4 text-red-400' aria-hidden='true' />
      }
      <p>{isAvailable ? '有効' : '無効' }</p>
    </div>
    {!isAvailable &&
      <div className={clsx(
        'ml-4',
        'p-2',
        'border border-red-400 rounded-md',
      )}>
        <p>管理者にID（左から5-6文字程度でも可）を伝えて下さい</p>
        <p>手動で有効化するので、お待ち下さい....</p>
      </div>
    }
  </Panel>
);

export default BroadcastIdPanel;

