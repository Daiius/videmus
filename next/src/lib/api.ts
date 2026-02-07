import { hc } from 'hono/client'
import { cookies } from 'next/headers'
import type { AppType } from 'videmus-webrtc'

const fetchWithAuth: typeof fetch = async (
  input: RequestInfo | URL,
  init?: RequestInit,
) => {
  const headers = new Headers(init?.headers)
  headers.set('Authorization', `Bearer ${process.env.API_KEY}`)
  return await fetch(input, { ...init, headers })
}

export const clientWithAuth = hc<AppType>(
  process.env.API_URL ?? '', 
  { fetch: fetchWithAuth },
)

export const client = hc<AppType>(process.env.NEXT_PUBLIC_API_URL ?? '')

export const serverClient = async () => {
  const cookieStore = await cookies()
  const cookieHeader = cookieStore
    .getAll()
    .map((c) => `${c.name}=${c.value}`)
    .join('; ')

  return hc<AppType>(process.env.API_URL ?? '', {
    headers: { Cookie: cookieHeader },
  })
}
