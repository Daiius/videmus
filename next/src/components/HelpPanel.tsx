import clsx from 'clsx';

import Panel from '@/components/Panel';

import Image from 'next/image';

const HelpPanel: React.FC<
  React.ComponentProps<typeof Panel>
> = ({
  className,
  ...props
}) => (
  <Panel
    className={clsx(
      'bg-primary',
      className
    )}
    panelTitle='OBS設定方法'
    {...props}
  >
    <div className='flex flex-col gap-2 items-center'>
      <Image 
        src={`${process.env.NEXT_PUBLIC_HOST_URL}/obs-settings-00.png`}
        alt='OBS設定説明画像1'
        width={1054}
        height={815}
      />
      <Image 
        src={`${process.env.NEXT_PUBLIC_HOST_URL}/obs-settings-01.png`} 
        alt='OBS設定説明画像2'
        width={1054}
        height={815}
      />
    </div>
  </Panel>
);

export default HelpPanel;

