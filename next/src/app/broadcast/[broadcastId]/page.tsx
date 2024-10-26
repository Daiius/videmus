
import { notFound } from 'next/navigation';
import { getBroadcastIdStatus } from '@/lib/broadcastIds';

import StreamIdChecker from '@/components/StreamIdChecker';

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
    <div>
      <div>あなたの配信用ページ</div>
      <div>あなたの配信用ID : {broadcastId}</div>
      <div>
        配信用IDの有効/無効 : 
        {isAvailable ? '有効' : '無効'}
      </div>

      <div>
        <div>
          OBS配信URL : 
          {`${process.env.HOST_URL}/api/whip/${broadcastId}`}
        </div>
        <StreamIdChecker broadcastId={broadcastId} />
      </div>
    </div>
  );
};

export default BroadcasterPage;

