import clsx from 'clsx';

const Panel: React.FC<
  React.ComponentProps<'div'>
  & { title?: string; }
> = ({
  title,
  children,
  className,
  ...props
}) => (
  <div 
    className={clsx(
      'bg-panel p-2 rounded-sm',
      className,
    )}
    {...props}
  >
    {title &&
      <div className={clsx(
        'text-sm font-bold mb-2 -mt-2 -ml-1',
      )}>
        {title}
      </div>
    }
    {children}
  </div>
);

export default Panel;

