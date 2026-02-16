import clsx from 'clsx';
import { Button as BaseButton } from '@base-ui/react/button';

type ButtonProps = React.ComponentProps<typeof BaseButton>;

const Button = ({
  type = 'button',
  className,
  children,
  ...props
}: ButtonProps) => (
  <BaseButton
    type={type}
    className={clsx(`
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
  </BaseButton>
);

export default Button;
