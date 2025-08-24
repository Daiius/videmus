'use client'

import { useState, useEffect } from 'react'
import clsx from 'clsx'

import { ClipboardDocumentIcon } from '@heroicons/react/24/outline'
import { ClipboardDocumentCheckIcon } from '@heroicons/react/24/solid'
import Button from '@/components/Button'

export type SteamUrlProps = {
  streamUrl: string,
  hideButton?: boolean,
  className?: string,
}

const StreamUrl = ({
  streamUrl,
  hideButton,
  className,
}: SteamUrlProps) => {
  const [isCopied, setIsCopied] = useState<boolean>(false)
  useEffect(() => setIsCopied(false), [hideButton])
  return (
    <div
      className={clsx(
        'flex flex-row gap-2 items-center',
        className,
      )}
    >
      <div className='overflow-ellipsis text-nowrap'>{streamUrl}</div>
      {!hideButton && 
        <Button
          onClick={async () => {
            await navigator.clipboard.writeText(streamUrl)
            setIsCopied(true)
          }}
        >
          {isCopied
            ? <ClipboardDocumentCheckIcon className='size-6' />
            : <ClipboardDocumentIcon className='size-6' />
          }
        </Button>
      }
    </div>
  )
}

export default StreamUrl

