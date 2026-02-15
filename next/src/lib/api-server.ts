import { hc } from 'hono/client'
import { cookies } from 'next/headers'
import type { AppType } from 'videmus-webrtc'

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
