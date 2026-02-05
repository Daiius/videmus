import clsx from 'clsx';
import Link from 'next/link';

import { Vidaloka } from 'next/font/google'
import UserMenu from '@/components/UserMenu';

const vidaloka = Vidaloka({
  weight: '400',
  subsets: ['latin']
});

const Header: React.FC = () => (
  <header
    className={clsx(
      'w-full h-12 bg-header flex flex-row items-center',
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
    <div className='flex-1' />
    <UserMenu />
  </header>
);

export default Header;
