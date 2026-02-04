
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
  <section 
    className={clsx(
      'bg-panel rounded-sm',
      inline && 'flex items-center gap-4', 
      className,
    )}
  >
    {panelTitle &&
      <h2 className='text-lg font-bold p-2'>
        {panelTitle}
      </h2>
    }
    {children}
  </section>
);

export default Panel;

