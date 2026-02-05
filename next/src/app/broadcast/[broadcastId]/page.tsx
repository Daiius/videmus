import { notFound, redirect } from 'next/navigation';
import clsx from 'clsx';

import { getSession, checkAdminExists } from '@/lib/session';
import { getBroadcastInfo } from '@/lib/broadcastIds';

import Panel from '@/components/Panel';
import LoginButton from '@/components/LoginButton';
import BroadcastIdPanel from '@/components/BroadcastIdPanel';
import ObsBroadcastUrlPanel from '@/components/ObsBroadcastUrlPanel';
import ChannelsPanel from '@/components/ChannelsPanel';
import BroadcastingStatusPanel from '@/components/BroadcastingStatusPanel';
import BroadcastTokenPanel from '@/components/BroadcastTokenPanel';
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
  const adminExists = await checkAdminExists();

  if (!adminExists) {
    redirect('/setup');
  }

  const session = await getSession();

  if (!session.user) {
    return (
      <article className={clsx(
        'flex flex-col gap-2 items-center',
        'lg:px-52 md:px-12',
      )}>
        <Panel
          className='w-full p-2'
          panelTitle='ログインが必要です'
        >
          <p>配信管理画面にアクセスするにはログインが必要です。</p>
          <div className='mt-4'>
            <LoginButton />
          </div>
        </Panel>
      </article>
    );
  }

  const { broadcastId } = await params;
  const broadcastInfo = await getBroadcastInfo(broadcastId);

  if (broadcastInfo == null) {
    notFound();
  }

  // 所有者または管理者のみアクセス可能
  const isOwner = broadcastInfo.ownerId === session.user.id;
  const isAdmin = session.user.isAdmin;

  if (!isOwner && !isAdmin) {
    return (
      <article className={clsx(
        'flex flex-col gap-2 items-center',
        'lg:px-52 md:px-12',
      )}>
        <Panel
          className='w-full p-2'
          panelTitle='アクセス権限がありません'
        >
          <p>この配信IDへのアクセス権限がありません。</p>
          <p>配信IDの所有者または管理者のみがアクセスできます。</p>
        </Panel>
      </article>
    );
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
      <BroadcastTokenPanel
        broadcastId={broadcastId}
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
