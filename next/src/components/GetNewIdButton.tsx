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
      const newId = await createNewId()
      router.push(`/broadcast/${newId}`)
    } catch (err) {
      console.error(err)
    }
  }
  return (
    <Button
      className={clsx(className)}
      onClick={handleClick}
    >
      新規配信IDを生成
    </Button>
  )
}

export default GetNewIdButton

