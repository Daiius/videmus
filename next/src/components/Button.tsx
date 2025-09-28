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
      'bg-primary rounded-md',
      'hover:bg-primary-hover',
      'focus:outline focus:outline-primary-highlight',
      'active:outline active:outline-primary-highlight',
      'px-2 py-1',
      className
    )}
    {...props}
  >
    {children}
  </HeadlessButton>
);

export default Button;

