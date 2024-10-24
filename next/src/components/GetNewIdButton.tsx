'use client'

import React from 'react';
import clsx from 'clsx';

import Button from '@/components/Button';
import { createNewId } from '@/actions/idActions';
import { useRouter } from 'next/navigation';

const GetNewIdButton: React.FC<
  React.ComponentProps<typeof Button>
> = ({
  className,
  ...props
}) => {
  const router = useRouter();
  return (
    <Button
      className={clsx(className)}
      onClick={async () => {
        try {
          const newId = await createNewId();
          router.push(`/broadcast/${newId}`);
        } catch (err) {
          console.error(err);
        }
      }}
      {...props}
    >
      新しい配信IDを生成
    </Button>
  )
};

export default GetNewIdButton;

