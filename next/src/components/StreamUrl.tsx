'use client'

import React from 'react';
import clsx from 'clsx';

import { ClipboardDocumentIcon } from '@heroicons/react/24/outline';
import { ClipboardDocumentCheckIcon } from '@heroicons/react/24/solid';
import Button from '@/components/Button';

const StreamUrl: React.FC<
  React.ComponentProps<'div'>
  & {
    streamUrl: string;
    hideButton?: boolean;
  }
> = ({
  streamUrl,
  hideButton,
  className,
  ...props
}) => {
  const [isCopied, setIsCopied] = React.useState<boolean>(false);
  React.useEffect(() => setIsCopied(false), [hideButton]);
  return (
    <div
      className={clsx(
        'flex flex-row gap-2 items-center',
        className,
      )}
      {...props}
    >
      <div>{streamUrl}</div>
      {!hideButton && 
        <Button
          onClick={async () => {
            await navigator.clipboard.writeText(streamUrl);
            setIsCopied(true);
          }}
        >
          {isCopied
            ? <ClipboardDocumentCheckIcon className='size-6' />
            : <ClipboardDocumentIcon className='size-6' />
          }
        </Button>
      }
    </div>
  );
}

export default StreamUrl;

