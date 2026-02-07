import { redirect } from 'next/navigation';
import clsx from 'clsx';

import { getSession, checkAdminExists } from '@/lib/session';
import { getMyBroadcast } from '@/lib/broadcastIds';
import Panel from '@/components/Panel';
import LoginButton from '@/components/LoginButton';

const BroadcastPage: React.FC = async () => {
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

  // ログイン済み: 配信IDを自動取得（なければ作成）してリダイレクト
  const { broadcastId } = await getMyBroadcast();
  redirect(`/broadcast/${broadcastId}`);
};

export default BroadcastPage;
