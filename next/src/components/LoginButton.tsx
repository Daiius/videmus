'use client'

import clsx from 'clsx'
import Button from '@/components/Button'

const AUTH_URL = process.env.NEXT_PUBLIC_AUTH_URL ?? ''

type LoginButtonProps = {
  provider?: 'github' | 'google'
  callbackUrl?: string
  className?: string
  children?: React.ReactNode
}

const LoginButton: React.FC<LoginButtonProps> = ({
  provider = 'github',
  callbackUrl,
  className,
  children,
}) => {
  const handleLogin = () => {
    const callback = callbackUrl ?? window.location.href
    window.location.href = `${AUTH_URL}/api/auth/signin/${provider}?callbackURL=${encodeURIComponent(callback)}`
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
