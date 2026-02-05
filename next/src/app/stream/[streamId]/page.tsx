import { notFound } from 'next/navigation';
import clsx from 'clsx';

import { getSession, getChannelInfo } from '@/lib/session';
import WebRtcVideo from '@/components/WebRtcVideo';
import StreamingStatusPanel from '@/components/StreamingStatusPanel';
import Panel from '@/components/Panel';
import LoginButton from '@/components/LoginButton';

const StreamPage: React.FC<{
  params: Promise<{
    streamId: string
  }>
}> = async ({ params }) => {

  const { streamId } = await params;

  // チャンネル情報を取得
  const channelInfo = await getChannelInfo(streamId);

  if (!channelInfo) {
    notFound();
  }

  // 認証が必要なチャンネルの場合、セッションを確認
  if (channelInfo.requireAuth) {
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
            <p>このチャンネルは視聴にログインが必要です。</p>
            <div className='mt-4'>
              <LoginButton />
            </div>
          </Panel>
        </article>
      );
    }
  }

  return (
    <article className='flex flex-col gap-2'>
      <WebRtcVideo streamId={streamId} />
      <StreamingStatusPanel channelId={streamId} />
    </article>
  );
};

export default StreamPage;
