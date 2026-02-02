import clsx from 'clsx';

import Panel from '@/components/Panel';

import Image from 'next/image';

export type HelpPanelProps = {
  className?: string,
}

const HelpPanel = ({
  className,
}: HelpPanelProps) => (
  <Panel
    className={clsx(
      'bg-primary',
      className
    )}
    //panelTitle={<div className='p-2'>OBS設定方法</div>}
  >
    <details className='py-1 px-2'>
      <summary className='text-lg font-bold cursor-pointer'>
        OBS設定方法
      </summary>
      <Image
        src="/obs-settings-00.png"
        alt='OBS設定説明画像1'
        width={1054}
        height={815}
      />
      <Image
        src="/obs-settings-01.png"
        alt='OBS設定説明画像2'
        width={1054}
        height={815}
      />
    </details>
  </Panel>
);

export default HelpPanel;

