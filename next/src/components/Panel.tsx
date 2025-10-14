
import clsx from 'clsx'
import { ReactNode } from 'react'

export type PanelProps = {
  panelTitle?: ReactNode,
  inline?: boolean,
  className?: string,
  children: ReactNode,
}

const Panel = ({
  panelTitle,
  inline,
  children,
  className,
}: PanelProps) => (
  <div 
    className={clsx(
      'bg-panel rounded-sm',
      inline && 'flex items-center gap-4', 
      className,
    )}
  >
    {panelTitle &&
      <div className={clsx(
        'text-lg font-bold', 
      )}>
        {panelTitle}
      </div>
    }
    {children}
  </div>
);

export default Panel;

