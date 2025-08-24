'use client'
// 配信用URLは管理者以外には秘密にしてほしいので、
// 最初は隠しておいて、ダイアログで表示します
// HeadlessUIのダイアログはclient componentで動作するため、
// 本コンポーネントもclient componentにします

import clsx from 'clsx'
import { useState } from 'react'

import {
  Description,
  Dialog,
  DialogBackdrop,
  DialogPanel,
  DialogTitle
} from '@headlessui/react'

import Panel from '@/components/Panel'
import Button from '@/components/Button'
import { ClipboardDocumentIcon, XMarkIcon } from '@heroicons/react/24/outline'
import { ClipboardDocumentCheckIcon } from '@heroicons/react/24/solid'

export type ObsBroadcastUrlPanel = {
  obsBroadcastUrl: string,
  className?: string,
}

const ObsBroadcastUrlPanel = ({
  obsBroadcastUrl,
  className,
}: ObsBroadcastUrlPanel) => {
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [isCopied, setIsCopied] = useState<boolean>(false);
  return (
    <Panel
      panelTitle={<div className='p-2'>OBS配信用URL</div>}
      inline
      className={clsx(className)}
    >
      <Button onClick={() => setIsOpen(true)}>
        表示
      </Button>
      <Dialog
        open={isOpen} 
        onClose={() => setIsOpen(false)}
        className={clsx(
          'relative z-50',
          'transition duration-200 ease-in-out data-[closed]:opacity-0',
        )}
        transition
      >
        <DialogBackdrop className='fixed inset-0 bg-black/30'/>
        <div
          className={clsx(
            'fixed inset-0 flex w-screen', 
            'items-center justify-center p-4',
          )}
        >
          <DialogPanel
            className={clsx(
              'max-w-lg space-y-4 bg-panel p-4 rounded-md'
            )}
          >
            <DialogTitle className={clsx(
              'font-bold',
              'flex flex-row'
            )}>
              <div>OBS配信用URL</div>
              <Button 
                className='bg-transparent ms-auto'
                onClick={() => setIsOpen(false)}
              >
                <XMarkIcon className='size-6' />
              </Button>
            </DialogTitle>
            <Description>
              誤って視聴者に送信しないようご注意下さい！
            </Description>
            <div className='flex flex-row gap-2 items-center'>
              <div>{obsBroadcastUrl}</div>
              <Button
                onClick={async () => {
                  await navigator.clipboard.writeText(obsBroadcastUrl);
                  setIsCopied(true);
                }}
              >
                {isCopied
                  ? <ClipboardDocumentCheckIcon className='size-6' />
                  : <ClipboardDocumentIcon className='size-6' />
                }
              </Button>
            </div>
          </DialogPanel>
        </div>
      </Dialog>
    </Panel>
  );
};

export default ObsBroadcastUrlPanel;

