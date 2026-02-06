'use client'

import clsx from 'clsx'

import Button from '@/components/Button'
import { createNewId } from '@/actions/idActions'
import { useRouter } from 'next/navigation'

export type GetNewIdButtonProps = {
  className?: string,
}

const GetNewIdButton = ({
  className,
}: GetNewIdButtonProps) => {
  const router = useRouter()
  const handleClick = async () => {
    try {
      const { newBroadcastId } = await createNewId()
      router.push(`/broadcast/${newBroadcastId}`)
    } catch (err) {
      console.error(err)
    }
  }
  return (
    <Button
      className={clsx(className)}
      onClick={handleClick}
      data-testid="broadcast-id-create-button"
      aria-label="新規配信IDを生成"
    >
      新規配信IDを生成
    </Button>
  )
}

export default GetNewIdButton

