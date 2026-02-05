'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import clsx from 'clsx'

import Panel from '@/components/Panel'
import Button from '@/components/Button'
import Input from '@/components/Input'
import { signIn } from '@/lib/auth-client'

/**
 * Hono サーバーの URL（OAuth コールバック用）
 * セットアップ完了後のコールバックは Hono サーバーで処理するため直接指定
 */
const AUTH_URL = process.env.NEXT_PUBLIC_AUTH_URL ?? ''

type Provider = 'github' | 'google'

const SetupPage: React.FC = () => {
  const router = useRouter()
  const [setupId, setSetupId] = useState('')
  const [setupPassword, setSetupPassword] = useState('')
  const [isVerified, setIsVerified] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [providers, setProviders] = useState<Provider[]>([])
  const [checkingAdmin, setCheckingAdmin] = useState(true)

  useEffect(() => {
    const checkAdminExists = async () => {
      try {
        // プロキシ経由でチェック
        const res = await fetch('/api/setup/check-setup', {
          credentials: 'include',
        })
        const data = await res.json()
        if (data.adminExists) {
          router.replace('/broadcast')
        }
      } catch {
        setError('サーバーに接続できません')
      } finally {
        setCheckingAdmin(false)
      }
    }

    const fetchProviders = async () => {
      try {
        // プロキシ経由で取得
        const res = await fetch('/api/setup/providers', {
          credentials: 'include',
        })
        const data = await res.json()
        setProviders(data.providers)
      } catch {
        // ignore
      }
    }

    checkAdminExists()
    fetchProviders()
  }, [router])

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError(null)

    try {
      // プロキシ経由で検証
      const res = await fetch('/api/setup/setup/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ setupId, setupPassword }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || '認証に失敗しました')
      }

      setIsVerified(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : '認証に失敗しました')
    } finally {
      setIsLoading(false)
    }
  }

  const handleOAuthLogin = async (provider: Provider) => {
    // OAuth コールバックは Hono サーバーで処理するため直接指定
    const callbackUrl = `${AUTH_URL}/auth/setup/callback`
    await signIn.social({
      provider,
      callbackURL: callbackUrl,
    })
  }

  if (checkingAdmin) {
    return (
      <article className={clsx('flex flex-col gap-2 items-center', 'lg:px-52 md:px-12')}>
        <Panel className='w-full p-4' panelTitle='読み込み中...'>
          <p>管理者の確認中...</p>
        </Panel>
      </article>
    )
  }

  return (
    <article className={clsx('flex flex-col gap-2 items-center', 'lg:px-52 md:px-12')}>
      <Panel className='w-full p-4' panelTitle='初回セットアップ'>
        {!isVerified ? (
          <form onSubmit={handleVerify} className='flex flex-col gap-4'>
            <p>管理者の初回セットアップを行います。</p>
            <p>環境変数で設定したセットアップID・パスワードを入力してください。</p>

            <div className='flex flex-col gap-2'>
              <label htmlFor='setupId'>セットアップID</label>
              <Input
                id='setupId'
                type='text'
                value={setupId}
                onChange={(e) => setSetupId(e.target.value)}
                required
              />
            </div>

            <div className='flex flex-col gap-2'>
              <label htmlFor='setupPassword'>パスワード</label>
              <Input
                id='setupPassword'
                type='password'
                value={setupPassword}
                onChange={(e) => setSetupPassword(e.target.value)}
                required
              />
            </div>

            {error && <p className='text-danger'>{error}</p>}

            <Button type='submit' disabled={isLoading}>
              {isLoading ? '認証中...' : '認証する'}
            </Button>
          </form>
        ) : (
          <div className='flex flex-col gap-4'>
            <p className='text-success'>認証成功!</p>
            <p>
              続いてOAuth認証を行います。下記のボタンからログインしてください。
              ログインしたアカウントが管理者として登録されます。
            </p>

            <div className='flex flex-col gap-2'>
              {providers.includes('github') && (
                <Button onClick={() => handleOAuthLogin('github')}>
                  GitHub でログイン
                </Button>
              )}
              {providers.includes('google') && (
                <Button onClick={() => handleOAuthLogin('google')}>
                  Google でログイン
                </Button>
              )}
              {providers.length === 0 && (
                <p className='text-danger'>
                  利用可能なOAuthプロバイダーがありません。
                  環境変数を確認してください。
                </p>
              )}
            </div>
          </div>
        )}
      </Panel>
    </article>
  )
}

export default SetupPage
