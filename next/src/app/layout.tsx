import type { Metadata } from 'next';
import './globals.css';

import clsx from 'clsx';
import Header from '@/components/Header';

export const metadata: Metadata = {
  title: 'Videmus Broadcast',
  description: '小規模・低遅延動画配信サーバ',
};


export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang='jp'
      className={clsx(
        'bg-background w-screen',
      )}
    >
      <body
        className={clsx(
          'bg-background antialiased w-screen min-h-dvh',
          'text-foreground',
        )}
      >
        <Header />
        <div className={clsx(
          'p-2 flex flex-col w-full items-center',
        )}>
          {children}
        </div>
      </body>
    </html>
  );
}
