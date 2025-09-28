import { serve } from '@hono/node-server'
import { app } from './app'

import { debug } from './logger';

import { db } from 'videmus-database/db';

const test = await db.query.broadcastIds.findMany()
debug(test)

const port = Number(process.env.PORT ?? 4000)

serve({
  fetch: app.fetch,
  port,
}, (info) => {
  console.log(`Server is running on http://localhost:${info.port}`)
})

