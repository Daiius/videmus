import { Hono } from 'hono'
import { auth } from '../lib/auth'

export const authApp = new Hono({ strict: false }).basePath('/api')

authApp.on(['GET', 'POST'], '/auth/*', (c) => {
  console.log('[BetterAuth] Request received:', c.req.method, c.req.url)
  return auth.handler(c.req.raw)
})
