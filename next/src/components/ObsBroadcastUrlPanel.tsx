'use client'
// 配信用URLは管理者以外には秘密にしてほしいので、
// 最初は隠しておいて、ダイアログで表示します
// HeadlessUIのダイアログはclient componentで動作するため、
// 本コンポーネントもclient componentにします

import clsx from 'clsx'
import { useState } from 'react'

import Panel from '@/components/Panel'
import { ClipboardDocumentIcon } from '@heroicons/react/24/outline'
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
    <button
      type='button'
      className='btn btn-square'
      onClick={async () => {
        await navigator.clipboard.writeText(obsBroadcastUrl);
        setIsCopied(true);
      }}
    >
      {isCopied
        ? <ClipboardDocumentCheckIcon className='size-6' />
        : <ClipboardDocumentIcon className='size-6' />
      }
    </button>
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
        className='btn'
      >
        表示
      </label>
      <input type='checkbox' id={modalId} className='modal-toggle' />
      <div className='modal'>
        <div className='modal-box bg-panel'>
          <h3 className='font-bold text-lg'>OBS配信用URL</h3>
          <p className='py-4'>誤って視聴者に送信しないようご注意下さい！</p>
          <div className='flex flex-row gap-2 items-center'>
            <div>{obsBroadcastUrl}</div>
            <CopyObsUrlButton obsBroadcastUrl={obsBroadcastUrl} />
          </div>
          <div className='modal-action'>
            <label htmlFor={modalId} className='btn'>
              閉じる
            </label>
          </div>
        </div>
        <label className='modal-backdrop' htmlFor={modalId}>Close</label>
      </div>
    </Panel>
  );
};

export default ObsBroadcastUrlPanel;
