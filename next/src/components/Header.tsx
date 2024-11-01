import clsx from 'clsx';
import Link from 'next/link';

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
    <Link 
      className={clsx(
        'self-center',
        vidaloka.className
      )}
      href='/'
    >
      <span className='text-4xl'>V</span>
      <span className='text-2xl -ml-[0.3rem]'>idemus</span>
    </Link>
  </div>
);

export default Header;

