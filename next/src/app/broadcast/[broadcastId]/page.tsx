import clsx from 'clsx';

import { notFound } from 'next/navigation';

import { CheckCircleIcon } from '@heroicons/react/24/outline';
import { XCircleIcon } from '@heroicons/react/24/outline';

import { getBroadcastIdStatus } from '@/lib/broadcastIds';
import StreamIdChecker from '@/components/StreamIdChecker';

import Panel from '@/components/Panel';

const BroadcasterPage: React.FC<{
  params: Promise<{ broadcastId: string }>
}> = async ({ params }) => {

  const { broadcastId } = await params;
  const broadcastIdStatus = await getBroadcastIdStatus(broadcastId);

  if (broadcastIdStatus == null) {
    notFound()
  }

  const { isAvailable } = broadcastIdStatus;

  return (
    <div className={clsx(
      'flex flex-col gap-2',
      'lg:px-52 md:px-12',
    )}>
      <Panel title='ID'>
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

      <div>
        <Panel
          title='OBS配信用URL'
        >
          {`${process.env.HOST_URL}/api/whip/${broadcastId}`}
        </Panel>
        <StreamIdChecker broadcastId={broadcastId} />
      </div>
    </div>
  );
};

export default BroadcasterPage;

