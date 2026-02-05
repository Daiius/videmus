'use client'

import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'

/**
 * クライアントサイドからのセッション取得はプロキシ経由で行う
 * /auth/session は Next.js API Route で /api/auth/session にプロキシされる
 *
 * 注: 通常は SSR でセッションを取得して initialUser として渡すため、
 * このフェッチは実行されないことが多い
 */

export type SessionUser = {
  id: string
  name: string
  email: string
  image?: string | null
  isAdmin: boolean
}

type AuthContextType = {
  user: SessionUser | null
  isLoading: boolean
  refetch: () => Promise<void>
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  isLoading: true,
  refetch: async () => {},
})

export const useAuth = () => useContext(AuthContext)

type AuthProviderProps = {
  children: ReactNode
  initialUser?: SessionUser | null
}

export const AuthProvider: React.FC<AuthProviderProps> = ({
  children,
  initialUser = null,
}) => {
  const [user, setUser] = useState<SessionUser | null>(initialUser)
  const [isLoading, setIsLoading] = useState(!initialUser)

  const fetchSession = async () => {
    try {
      // プロキシ経由でセッション取得（/api/auth/session → Hono /api/auth/session）
      const res = await fetch('/api/auth/session', {
        credentials: 'include',
      })
      if (res.ok) {
        const data = await res.json()
        setUser(data.user)
      } else {
        setUser(null)
      }
    } catch {
      setUser(null)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    if (!initialUser) {
      fetchSession()
    }
  }, [initialUser])

  return (
    <AuthContext.Provider value={{ user, isLoading, refetch: fetchSession }}>
      {children}
    </AuthContext.Provider>
  )
}

export default AuthProvider
