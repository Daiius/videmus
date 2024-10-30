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
    <html lang='jp'>
      <body
        className={clsx(
          'bg-background antialiased w-full min-h-screen',
          'text-foreground',
        )}
      >
        <Header />
        <div className={clsx(
          'p-2',
        )}>
          {children}
        </div>
      </body>
    </html>
  );
}

