
import { eq } from 'drizzle-orm';
import { db } from 'videmus-database/db';
import { broadcastIds } from 'videmus-database/db/schema';

import { notFound } from 'next/navigation';

import StreamIdChecker from '@/components/StreamIdChecker';

const BroadcasterPage: React.FC<{
  params: Promise<{ broadcastId: string }>
}> = async ({ params }) => {

  const { broadcastId } = await params;

  const validIdEntries = await db.select()
    .from(broadcastIds)
    .where(
      eq(broadcastIds.id, broadcastId)
    );

  if (validIdEntries.length === 0) {
    notFound();
  }

  const validIdEntry = validIdEntries[0];

  return (
    <div>
      <div>あなたの配信用ページ</div>
      <div>あなたの配信用ID : {validIdEntry.id}</div>
      <div>
        配信用IDの有効/無効 : 
        {validIdEntry.isAvailable ? '有効' : '無効'}
      </div>

      <div>
        <div>
          OBS配信URL : 
          {`${process.env.HOST_URL}/api/whip/${validIdEntry.id}`}
        </div>
        <StreamIdChecker broadcastId={broadcastId} />
      </div>
    </div>
  );
};

export default BroadcasterPage;

