'use client'
// 配信用URLは管理者以外には秘密にしてほしいので、
// 最初は隠しておいて、ダイアログで表示します
// HeadlessUIのダイアログはclient componentで動作するため、
// 本コンポーネントもclient componentにします

import clsx from 'clsx'
import { useState } from 'react'

import Panel from '@/components/Panel'
import Button from '@/components/Button'
import { ClipboardDocumentIcon, XMarkIcon } from '@heroicons/react/24/outline'
import { ClipboardDocumentCheckIcon } from '@heroicons/react/24/solid'

export type ObsBroadcastUrlPanel = {
  obsBroadcastUrl: string,
  className?: string,
}

const CopyObsUrlButton = ({
  obsBroadcastUrl,
}: {
  obsBroadcastUrl: string,
}) => {
  const [isCopied, setIsCopied] = useState<boolean>(false);
  return (
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
  );
};

const ObsBroadcastUrlPanel = ({
  obsBroadcastUrl,
  className,
}: ObsBroadcastUrlPanel) => {
  const modalId = 'obs-broadcast-url-modal';
  return (
    <Panel
      panelTitle={<div className='p-2'>OBS配信用URL</div>}
      inline
      className={clsx(className)}
    >
      <label
        htmlFor={modalId}
        className={clsx(
          'btn',
          'bg-primary rounded-md',
          'hover:bg-primary-hover',
          'focus:border focus:border-primary-highlight',
          'active:border active:border-primary-highlight',
          'px-2 py-1'
        )}
      >
        表示
      </label>
      <input type='checkbox' id={modalId} className='modal-toggle' />
      <div className='modal'>
        <div className='modal-box max-w-lg space-y-4 bg-panel p-4 rounded-md'>
          <div className={clsx(
            'font-bold',
            'flex flex-row'
          )}>
            <div>OBS配信用URL</div>
            <label
              htmlFor={modalId}
              className='btn btn-ghost bg-transparent ms-auto'
            >
              <XMarkIcon className='size-6' />
            </label>
          </div>
          <div>
            誤って視聴者に送信しないようご注意下さい！
          </div>
          <div className='flex flex-row gap-2 items-center'>
            <div>{obsBroadcastUrl}</div>
            <CopyObsUrlButton obsBroadcastUrl={obsBroadcastUrl} />
          </div>
        </div>
        <label className='modal-backdrop' htmlFor={modalId}>Close</label>
      </div>
    </Panel>
  );
};

export default ObsBroadcastUrlPanel;
