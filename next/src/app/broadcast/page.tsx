
import clsx from 'clsx';

import Panel from '@/components/Panel';
import GetNewIdButton from '@/components/GetNewIdButton';

const BroadcastPage: React.FC = () => (
  <div className={clsx(
    'flex flex-col gap-2 items-center',
    'lg:px-52 md:px-12',
  )}>
    <Panel 
      className='w-full' 
      title='最初の配信準備'
    >
      <div>
        配信IDはあなた専用です、管理者以外には教えないで下さい
      </div>
      <div>
        その代わり、同じIDで何度でも配信できます！
      </div>
      <GetNewIdButton />
    </Panel>
  </div>
);

export default BroadcastPage;

