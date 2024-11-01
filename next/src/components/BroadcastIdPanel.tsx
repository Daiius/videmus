import clsx from 'clsx';

import { CheckCircleIcon } from '@heroicons/react/24/outline';
import { XCircleIcon } from '@heroicons/react/24/outline';

import Panel from '@/components/Panel';

const BroadcastIdPanel: React.FC<
  React.ComponentProps<typeof Panel>
  & { 
    broadcastId: string;
    isAvailable: boolean;
  }
> = ({
  broadcastId,
  isAvailable,
  className,
  ...props
}) => (
  <Panel 
    panelTitle='ID'
    className={clsx(className)}
    {...props}
  >
    <div className='flex flex-row gap-1 items-center'>
      <div>{broadcastId}</div>
      {isAvailable
        ? <CheckCircleIcon className='size-4 text-green-400' /> 
        : <XCircleIcon className='size-4 text-red-400' />
      }
      {isAvailable
        ? <div>有効</div>
        : <div>無効</div>
      }
    </div>
    {!isAvailable &&
      <div className={clsx(
        'ml-4',
        'p-2',
        'border border-red-400 rounded-md',
      )}>
        <div>管理者にID（左から5-6文字程度でも可）を伝えて下さい</div>
        <div>手動で有効化するので、お待ち下さい....</div>
      </div>
    }
  </Panel>
);

export default BroadcastIdPanel;

