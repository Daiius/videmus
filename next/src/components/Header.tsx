import clsx from 'clsx';
import { Vidaloka } from 'next/font/google'

const vidaloka = Vidaloka({ 
  weight: '400',
  subsets: ['latin']
});

const Header: React.FC = () => (
  <div
    className={clsx(
      'w-full h-12 bg-gray-800 flex flex-row',
      'px-2',
    )}
  >
    <div className={clsx(
      'self-center text-2xl',
      vidaloka.className
    )}>
      Videmus
    </div>
  </div>
);

export default Header;

