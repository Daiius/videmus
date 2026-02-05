'use client'

import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'

const AUTH_URL = process.env.NEXT_PUBLIC_AUTH_URL ?? ''

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
      const res = await fetch(`${AUTH_URL}/auth/session`, {
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
