import { serve } from '@hono/node-server'
import { app } from './app'

import { debug } from './logger';

import { db } from 'videmus-database/db';
import { broadcastIds } from 'videmus-database/db/schema';

const test = await db.select().from(broadcastIds);
debug(test);

const port = Number(process.env.PORT ?? 4000)

serve({
  fetch: app.fetch,
  port,
}, (info) => {
  console.log(`Server is running on http://localhost:${info.port}`)
})

