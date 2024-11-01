import clsx from 'clsx';

const Panel: React.FC<
  React.ComponentProps<'div'>
  & { panelTitle?: React.ReactNode; }
> = ({
  panelTitle,
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
    {panelTitle &&
      <div className={clsx(
        'text-lg font-bold mb-2 -mt-2 -ml-1',
      )}>
        {panelTitle}
      </div>
    }
    {children}
  </div>
);

export default Panel;

