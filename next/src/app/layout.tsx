import type { Metadata } from 'next';
import './globals.css';

import clsx from 'clsx';
import Header from '@/components/Header';
import { AuthProvider } from '@/components/AuthProvider';
import { getSession } from '@/lib/session';

export const metadata: Metadata = {
  title: 'Videmus Broadcast',
  description: '小規模・低遅延動画配信サーバ',
};


export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = await getSession();

  return (
    <html lang='ja'>
      <body
        className={clsx(
          'bg-background antialiased w-full min-h-dvh',
          'text-foreground',
        )}
      >
        <AuthProvider initialUser={session.user}>
          <Header user={session.user} />
          <main className={clsx(
            'p-2 flex flex-col w-full items-center',
          )}>
            {children}
          </main>
        </AuthProvider>
      </body>
    </html>
  );
}
