import { Hono } from 'hono'
import { auth } from '../lib/auth'

export const authApp = new Hono()

authApp.on(['GET', 'POST'], '/api/auth/*', async (c) => {
  return auth.handler(c.req.raw)
})
