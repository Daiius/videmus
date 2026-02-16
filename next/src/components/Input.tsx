import clsx from 'clsx';

type InputProps = React.ComponentProps<'input'>;

const Input = ({
  className,
  ...props
}: InputProps) => (
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

