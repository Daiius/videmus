import { serve } from '@hono/node-server'
import { app } from './app'

const port = Number(process.env.PORT ?? 4001)

serve({
  fetch: app.fetch,
  port,
}, (info) => {
  console.log(`Media Server is running on http://localhost:${info.port}`)
})
