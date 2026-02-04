import clsx from 'clsx';

import Link from 'next/link';

import Panel from '@/components/Panel';
import Button from '@/components/Button';

export default function Home() {
  return (
    <article className={clsx(
      'flex flex-col gap-2',
      'lg:px-52 md:px-12',
    )}>
      {/* Videmus 説明 */}
      <Panel panelTitle='Videmusについて'>
        <p>小規模・低遅延の動画配信Webアプリケーションです</p>
        <p>OBSのWHIPサービスから動画配信を行えます</p>
      </Panel>
      {/* 新規配信ID発行 & 視聴方法 */}
      <div className={clsx(
        'flex flex-col',
        'md:grid md:grid-cols-2 gap-2'
      )}>
        <Panel panelTitle='配信する'>
          <Link href='/broadcast'>
            <Button>
              新規配信ページへ
            </Button>
          </Link>
        </Panel>
        <Panel panelTitle='視聴する'>
          <p>配信者から視聴用URLを教えてもらってアクセスしましょう</p>
        </Panel>
      </div>
    </article>
  );
}
