import clsx from 'clsx';

import { Button as HeadlessButton } from '@headlessui/react';

const Button: React.FC<
  React.ComponentProps<typeof HeadlessButton>
> = ({
  className,
  children,
  ...props
}) => (
  <HeadlessButton
    className={clsx(
      'border border-slate-500 rounded-md',
      'text-slate-500',
      'hover:bg-slate-500/10',
      'p-2',
      className
    )}
    {...props}
  >
    {children}
  </HeadlessButton>
);

export default Button;

