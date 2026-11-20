import type { Server } from 'node:http'
import { serve } from '@hono/node-server'
import { app } from './app'
import { createGracefulShutdown } from './lib/gracefulShutdown'
import { resourcesDict, worker } from './resources'

const port = Number(process.env.PORT ?? 4001)

// 停止の合図で、処理中の HTTP のリクエスト（ハンドラと応答の書き出し）を終えてから mediasoup を閉じて終了する。
// **進行中の配信・視聴は切れる**（待たない。配信のリソースはメモリにだけある。prd/04 §2）。
//
// mediasoup の性質（3.31 の node/lib/Worker.js で確かめた）:
// - `worker.close()` は同期。Node の側で、その worker の Router（→ その下の Transport・Producer・Consumer）と
//   WebRtcServer を閉じ、子プロセスに終了を知らせて通信路を閉じる。子プロセスの終了は待たない
//   （終わると 'subprocessclose' が来る）。2 回目以降の呼び出しは何もしない
// - 自分で閉じた後の子プロセスの終了では 'died' は来ない（'died' は閉じる前に子プロセスが落ちたときだけ）。
//   このリポジトリは 'died' を購読していない
// - mediasoup の Worker は、作られたときに自分で SIGTERM / SIGINT を購読し、合図の時点で `worker.close()` を呼ぶ。
//   そのため実際には、worker は HTTP を待つ前に閉じ、mediasoup に触る処理中のリクエストは WorkerClosedError で
//   すぐに失敗して返る。下の closer は、その後始末の確認（閉じていなければ閉じる）と `resourcesDict` の片付け
const shutdown = createGracefulShutdown({
  closers: [
    {
      name: 'mediasoup',
      close: () =>
        new Promise<void>((resolve) => {
          for (const id of Object.keys(resourcesDict)) delete resourcesDict[id]
          // 子プロセスの終了まで待つ（上限は closer 1 つの 0.5 秒。過ぎても終了は進み、子プロセスは通信路が閉じて自分で終わる）
          if (worker.subprocessClosed) return resolve()
          worker.once('subprocessclose', () => resolve())
          worker.close()
        }),
    },
  ],
})

// `createServer` を渡していないので node:http の Server（戻り値の型は http2 との合併なので絞る）
const server = serve({
  fetch: shutdown.track(app.fetch),
  port,
}, (info) => {
  console.log(`Media Server is running on http://localhost:${info.port}`)
}) as Server
shutdown.install(server)
