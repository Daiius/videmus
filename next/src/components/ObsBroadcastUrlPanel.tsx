'use client'
// 配信用URLは管理者以外には秘密にしてほしいので、
// 最初は隠しておいて、ダイアログで表示します
// Base UIのダイアログはclient componentで動作するため、
// 本コンポーネントもclient componentにします

import clsx from 'clsx'
import { useState } from 'react'

import { Dialog } from '@base-ui/react/dialog'

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
      panelTitle='OBS配信用URL'
      inline
      className={clsx(className)}
    >
      <Button
        onClick={() => setIsOpen(true)}
        data-testid="obs-url-show-button"
        aria-label="OBS配信用URLを表示"
        data-guide-hint="クリックでモーダルダイアログを開き、OBS配信用URLを表示する。"
      >
        表示
      </Button>
      <Dialog.Root open={isOpen} onOpenChange={setIsOpen}>
        <Dialog.Portal>
          <Dialog.Backdrop
            className={clsx(
              'fixed inset-0 bg-black/30',
              'transition duration-200 ease-in-out',
              'data-[starting-style]:opacity-0 data-[ending-style]:opacity-0',
            )}
          />
          <div
            className={clsx(
              'fixed inset-0 flex w-screen',
              'items-center justify-center p-4',
              'z-50',
            )}
          >
            <Dialog.Popup
              className={clsx(
                'max-w-lg space-y-4 bg-panel p-4 rounded-md',
                'transition duration-200 ease-in-out',
                'data-[starting-style]:opacity-0 data-[ending-style]:opacity-0',
              )}
              data-videmus-dialog="obs-broadcast-url"
            >
              <Dialog.Title className={clsx(
                'font-bold',
                'flex flex-row'
              )}>
                <p>OBS配信用URL</p>
                <Dialog.Close
                  render={<Button className='bg-transparent ms-auto' aria-label='閉じる' />}
                >
                  <XMarkIcon className='size-6' aria-hidden='true' />
                </Dialog.Close>
              </Dialog.Title>
              <Dialog.Description>
                誤って視聴者に送信しないようご注意下さい！
              </Dialog.Description>
              <div className='flex flex-row gap-2 items-center'>
                <p>{obsBroadcastUrl}</p>
                <Button
                  onClick={async () => {
                    await navigator.clipboard.writeText(obsBroadcastUrl);
                    setIsCopied(true);
                  }}
                  data-testid="obs-url-copy-button"
                  aria-label={isCopied ? 'コピー済み' : 'URLをコピー'}
                  data-guide-hint="OBS配信用URLをクリップボードにコピーする。"
                >
                  {isCopied
                    ? <ClipboardDocumentCheckIcon className='size-6' aria-hidden='true' />
                    : <ClipboardDocumentIcon className='size-6' aria-hidden='true' />
                  }
                </Button>
              </div>
            </Dialog.Popup>
          </div>
        </Dialog.Portal>
      </Dialog.Root>
    </Panel>
  );
};

export default ObsBroadcastUrlPanel;
