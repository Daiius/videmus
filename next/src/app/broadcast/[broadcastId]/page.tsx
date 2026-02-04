import { notFound } from 'next/navigation';

import { getBroadcastInfo } from '@/lib/broadcastIds';

import BroadcastIdPanel from '@/components/BroadcastIdPanel';
import ObsBroadcastUrlPanel from '@/components/ObsBroadcastUrlPanel';
import ChannelsPanel from '@/components/ChannelsPanel';
import BroadcastingStatusPanel from '@/components/BroadcastingStatusPanel';
import HelpPanel from '@/components/HelpPanel';

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
  const broadcastInfo = await getBroadcastInfo(broadcastId);

  if (broadcastInfo == null) {
    notFound()
  }

  const { isAvailable, channels, currentChannelId } = broadcastInfo;
  const obsBroadcastUrl = `${process.env.NEXT_PUBLIC_API_URL}/whip/${broadcastId}`;

  return (
    <article className='flex flex-col gap-2 lg:px-52 md:px-12 w-full'>
      <BroadcastIdPanel 
        broadcastId={broadcastId}
        isAvailable={isAvailable}
      />
      <ObsBroadcastUrlPanel
        obsBroadcastUrl={obsBroadcastUrl}
      />
      <ChannelsPanel 
        broadcastId={broadcastId}
        channels={channels} 
        currentChannelId={currentChannelId}
      />
      <BroadcastingStatusPanel 
        broadcastId={broadcastId}
      />
      <HelpPanel />
    </article>
  );
};

export default BroadcasterPage;

