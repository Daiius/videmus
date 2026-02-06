import clsx from 'clsx';
import Link from 'next/link';

import { Vidaloka } from 'next/font/google'
import UserMenu from '@/components/UserMenu';
import { AIGuideSearchBar } from '@/features/ai-guide/components/AIGuideSearchBar';
import type { SessionUser } from '@/lib/session';

const vidaloka = Vidaloka({
  weight: '400',
  subsets: ['latin']
});

type HeaderProps = {
  user: SessionUser | null;
};

const Header: React.FC<HeaderProps> = ({ user }) => (
  <header
    className={clsx(
      'w-full h-12 bg-header flex flex-row items-center',
      'px-2 gap-4',
    )}
  >
    {/* Logo */}
    <Link
      className={clsx(
        'self-center flex-shrink-0',
        vidaloka.className
      )}
      href='/'
    >
      <span className='text-4xl'>V</span>
      <span className='text-2xl -ml-[0.3rem]'>idemus</span>
    </Link>

    {/* AI Guide Search Bar (center) - only for authenticated users */}
    <div className='flex-1 flex justify-center'>
      {user && <AIGuideSearchBar />}
    </div>

    {/* User Menu (right) */}
    <UserMenu className="flex-shrink-0" />
  </header>
);

export default Header;
