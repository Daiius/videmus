import clsx from 'clsx';

import { notFound } from 'next/navigation';

import { getBroadcastIdStatus } from '@/lib/broadcastIds';
import StreamIdChecker from '@/components/StreamIdChecker';

import Panel from '@/components/Panel';
import BroadcastIdPanel from '@/components/BroadcastIdPanel';
import ObsBroadcastUrlPanel from '@/components/ObsBroadcastUrlPanel';
import StreamIdPanel from '@/components/StreamIdPanel';

/**
 * IDを発行した配信者用のページ
 * 
 * ID、有効無効、配信中なら視聴用URLを表示します
 * 
 * 有効/無効はサーバサイドで取得・表示します
 * リアルタイム性が有りませんが、管理者と連絡して有効化しますから
 * 再読み込みしないと表示内容が変化しない方法で良いと考えました
 *
 * 視聴用URLは配信状況に応じてリアルタイムに変化しますので、
 * クライアントサイドでポーリングする方法をとります
 */
const BroadcasterPage: React.FC<{
  params: Promise<{ broadcastId: string }>
}> = async ({ params }) => {

  const { broadcastId } = await params;
  const broadcastIdStatus = await getBroadcastIdStatus(broadcastId);

  if (broadcastIdStatus == null) {
    notFound()
  }

  const { isAvailable } = broadcastIdStatus;
  const obsBroadcastUrl = `${process.env.HOST_URL}/api/whip/${broadcastId}`;

  return (
    <div className={clsx(
      'flex flex-col gap-2',
      'lg:px-52 md:px-12',
    )}>
      <BroadcastIdPanel 
        broadcastId={broadcastId}
        isAvailable={isAvailable}
      />
      <ObsBroadcastUrlPanel
        obsBroadcastUrl={obsBroadcastUrl}
      />
      <StreamIdPanel broadcastId={broadcastId} />
    </div>
  );
};

export default BroadcasterPage;

