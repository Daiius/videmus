import clsx from 'clsx';
import { Vidaloka } from 'next/font/google'

const vidaloka = Vidaloka({ 
  weight: '400',
  subsets: ['latin']
});

const Header: React.FC = () => (
  <div
    className={clsx(
      'w-full h-12 bg-header flex flex-row',
      'px-2',
    )}
  >
    <div className={clsx(
      'self-center',
      vidaloka.className
    )}>
      <span className='text-4xl'>V</span>
      <span className='text-2xl -ml-[0.3rem]'>idemus</span>
    </div>
  </div>
);

export default Header;

