'use client'

import { useState } from 'react'
import clsx from 'clsx'

import { 
  ClipboardDocumentIcon,
  ClipboardDocumentCheckIcon,
} from '@heroicons/react/24/outline'

import Button from '@/components/Button'

export type GetIdButtonProps = {
  className?: string,
}

const GetIdButton = ({
  className,
}: GetIdButtonProps) => {

  const [errorMessage, setErrorMessage] = useState<string|undefined>()
  const [id, setId] = useState<string|undefined>()

  const obsUrl = `${process.env.NEXT_PUBLIC_API_URL}/whip/${id}`
  const [isObsUrlCopied, setIsObsUrlCopied] = useState<boolean>(false)

  const streamUrl = `${process.env.NEXT_PUBLIC_HOST_URL}/stream/${id}`
  const [isStreamUrlCopied, setIsStreamUrlCopied] = useState<boolean>(false)

  const handleClick = async () => {
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL}/id`, {
      method: 'POST',
    })
    if (response.ok) {
      const idInfo = await response.json()
      setId(idInfo.id)
      console.log(idInfo.id)
    } else {
      const errorMessage = await response.text()
      setErrorMessage(errorMessage)
    }
  }

  return (
    <>
      {id == null && errorMessage == null &&
        <Button
          className={clsx(className)}
          onClick={handleClick}
        >
          配信IDの取得
        </Button>
      }
      {id && errorMessage == null &&
        <div>
          <div>配信用ID: {id}</div>
          <div className={clsx(
            'flex flex-row gap-2 self-center'
          )}>
            <div>
              OBS配信用URL : {obsUrl}
            </div>
            <Button
              onClick={async () => { 
                await navigator.clipboard.writeText(obsUrl);
                setIsObsUrlCopied(true);
              }}
            >
              {isObsUrlCopied
                ? <ClipboardDocumentCheckIcon className='size-4' />
                : <ClipboardDocumentIcon className='size-4' />
              }
            </Button>
          </div>
          <div className={clsx(
            'flex flex-row gap-2 self-center'
          )}>
            <div>
              視聴用URL : {streamUrl}
            </div>
            <Button
              onClick={async () => { 
                await navigator.clipboard.writeText(streamUrl);
                setIsStreamUrlCopied(true);
              }}
            >
              {isStreamUrlCopied
                ? <ClipboardDocumentCheckIcon className='size-4' />
                : <ClipboardDocumentIcon className='size-4' />
              }
            </Button>
          </div>
        </div>
      }
      {errorMessage != null &&
        <div>エラー: {errorMessage}</div>
      }
    </>
  )
}

export default GetIdButton

