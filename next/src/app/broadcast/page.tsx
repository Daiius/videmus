
import clsx from 'clsx';

import Panel from '@/components/Panel';
import GetNewIdButton from '@/components/GetNewIdButton';

const BroadcastPage: React.FC = () => (
  <article className={clsx(
    'flex flex-col gap-2 items-center',
    'lg:px-52 md:px-12',
  )}>
    <Panel 
      className='w-full p-2' 
      panelTitle='最初の配信準備'
    >
      <p>配信IDはあなた専用です、管理者以外には教えないで下さい</p>
      <p>その代わり、同じIDで何度でも配信できます！</p>
      <GetNewIdButton className="mt-4"/>
    </Panel>
  </article>
);

export default BroadcastPage;

