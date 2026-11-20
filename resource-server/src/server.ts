import type { Server } from 'node:http'
import { serve } from '@hono/node-server'
import { client } from 'videmus-database/db/index'
import { app } from './app'
import { createGracefulShutdown } from './lib/gracefulShutdown'

const port = Number(process.env.PORT ?? 4000)

// 停止の合図で、処理中のリクエスト（ハンドラと応答の書き出し）を終えてから DB のプールを閉じて終了する。
// `client` は mysql2/promise の Pool で、`end()` は Promise を返す
const shutdown = createGracefulShutdown({
  closers: [{ name: 'db', close: () => client.end() }],
})

// `createServer` を渡していないので node:http の Server（戻り値の型は http2 との合併なので絞る）
const server = serve({
  fetch: shutdown.track(app.fetch),
  port,
}, (info) => {
  console.log(`Resource Server is running on http://localhost:${info.port}`)
}) as Server
shutdown.install(server)
