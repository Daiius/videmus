'use client'

import clsx from 'clsx'
import Button from '@/components/Button'
import { signIn } from '@/lib/auth-client'

type LoginButtonProps = {
  provider?: 'github' | 'google'
  callbackUrl?: string
  className?: string
  children?: React.ReactNode
}

const LoginButton = ({
  provider = 'github',
  callbackUrl,
  className,
  children,
}: LoginButtonProps) => {
  const handleLogin = async () => {
    const callback = callbackUrl ?? window.location.href
    await signIn.social({
      provider,
      callbackURL: callback,
    })
  }

  const providerLabels: Record<string, string> = {
    github: 'GitHub',
    google: 'Google',
  }

  return (
    <Button
      onClick={handleLogin}
      className={clsx(className)}
    >
      {children ?? `${providerLabels[provider]} でログイン`}
    </Button>
  )
}

export default LoginButton
