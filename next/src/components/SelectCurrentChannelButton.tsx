'use client'

import clsx from 'clsx'

import { useRouter } from 'next/navigation'

import { updateCurrentChannel } from '@/actions/idActions'

import Button from '@/components/Button'

export type SelectCurrentChannelButtonProps = {
  broadcastId: string,
  channelId: string,
  className?: string,
}

const SelectCurrentChannelButton = ({
  broadcastId,
  channelId,
  className,
}: SelectCurrentChannelButtonProps) => {
  const router = useRouter()

  const handleClick = async () => {
    // データベースの現在のチャネルを書き換え
    await updateCurrentChannel(
      broadcastId,
      channelId,
    )
    // 配信中ならリソースのチャンネルIDも書き換え
    // (配信前なら202ステータス)
    await fetch(
      ` ${process.env.NEXT_PUBLIC_API_URL}/api/current-channel/${broadcastId}`, {
        method: 'POST',
        body: JSON.stringify({ channelId, }),
    })
    router.refresh()
  }

  return (
    <Button 
      className={clsx(
        'border border-white',
        className,
      )} 
      onClick={handleClick}
    >
      選択
    </Button>
  )
}

export default SelectCurrentChannelButton;

