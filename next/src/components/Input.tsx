import clsx from 'clsx';
//import { Input as HeadlessInput } from '@headlessui/react';

const Input: React.FC<
  React.ComponentProps<'input'>
> = ({
  className,
  ...props
}) => (
  <input
    className={clsx(
      'rounded-md',
      'bg-primary border border-primary',
      'outline-none',
      'transition ease-in-out duration-300 hover:bg-panel',
      'focus:border-active focus:bg-panel',
      'p-1',
      className,
    )}
    {...props}
  />
);

export default Input;

