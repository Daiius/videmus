import clsx from 'clsx';

const Button: React.FC<
  React.ComponentProps<'button'>
> = ({
  className,
  children,
  ...props
}) => (
  <button
    type='button'
    className={clsx(`
       btn
       bg-primary rounded-md
       hover:bg-primary-hover
       focus:border focus:border-primary-highlight
       active:border active:border-primary-highlight
       px-2 py-1`,
      className
    )}
    {...props}
  >
    {children}
  </button>
);

export default Button;
