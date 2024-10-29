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
    type='button'
    className={clsx(
      'border border-white rounded-md',
      'hover:bg-white/10',
      'p-2',
      className
    )}
    {...props}
  >
    {children}
  </HeadlessButton>
);

export default Button;

