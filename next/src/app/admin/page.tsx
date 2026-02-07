import { redirect } from 'next/navigation';
import clsx from 'clsx';

import { getSession, checkAdminExists } from '@/lib/session';
import Panel from '@/components/Panel';
import LoginButton from '@/components/LoginButton';
import UserManagementTable from '@/components/admin/UserManagementTable';

const AdminPage: React.FC = async () => {
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
          <p>管理画面にアクセスするにはログインが必要です。</p>
          <div className='mt-4'>
            <LoginButton />
          </div>
        </Panel>
      </article>
    );
  }

  if (!session.user.isAdmin) {
    return (
      <article className={clsx(
        'flex flex-col gap-2 items-center',
        'lg:px-52 md:px-12',
      )}>
        <Panel
          className='w-full p-2'
          panelTitle='アクセス権限がありません'
        >
          <p>この画面は管理者のみアクセスできます。</p>
        </Panel>
      </article>
    );
  }

  return (
    <article className='flex flex-col gap-2 lg:px-52 md:px-12 w-full'>
      <Panel
        className='w-full p-2'
        panelTitle='ユーザー管理'
      >
        <UserManagementTable />
      </Panel>
    </article>
  );
};

export default AdminPage;
