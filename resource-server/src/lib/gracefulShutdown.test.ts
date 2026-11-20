// gracefulShutdown.ts の試験。resource-server と media-server に同じ内容のファイルを置いている（直すときは両方）。
import assert from 'node:assert/strict'
import http, { type Server, type ServerResponse } from 'node:http'
import net, { type AddressInfo } from 'node:net'
import { afterEach, describe, it, mock, type Mock } from 'node:test'
import { serve } from '@hono/node-server'
import { Hono } from 'hono'
import {
  createGracefulShutdown,
  type GracefulShutdownOptions,
  SETTLE_MS,
} from './gracefulShutdown'

// 固定の待ち時間に頼らない: 「ハンドラが始まった」を Promise で待ってから手順を起動し、解放はテストから行う。
// 例外は「まだ進んでいない」ことを見る箇所だけ（落ち着きの時間を越えるまで待つ。`sleep`）

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

function deferred<T = void>() {
  let resolve!: (value: T) => void
  const promise = new Promise<T>((r) => (resolve = r))
  return { promise, resolve }
}

const BIG = 8 * 1024 * 1024

/** 1 件ごとの上限（node:test の既定は無制限） */
const TEST = { timeout: 5_000 }

// 呼び出しの記録だけを見るので、関数の型は問わない
type AnyMock = Mock<(...args: any[]) => any>

const callCount = (fn: AnyMock) => fn.mock.callCount()
/** ちょうど 1 回、この引数で呼ばれた */
const assertCalledOnceWith = (fn: AnyMock, ...args: unknown[]) =>
  assert.deepEqual(
    fn.mock.calls.map((c) => c.arguments),
    [args],
  )

/**
 * 本物の serve() をランダムなポートで起こし、終了の手順を組み立てる（合図・exit・ログは差し替え）。
 * `/held` は始まったことを `started` で知らせ、`release()` されるまで返さない。
 * `/save` は接続が切れても保存を続けるハンドラの代わり（`saving` で始まりを知らせ、`finishSave()` まで終わらない）
 */
async function setup(extra: Partial<GracefulShutdownOptions> = {}) {
  const started = deferred()
  const gate = deferred()
  const saving = deferred()
  const saveGate = deferred()
  const app = new Hono()
    .get('/held', async (c) => {
      started.resolve()
      await gate.promise
      return c.text('held done')
    })
    .get('/big', (c) => c.body(new Uint8Array(BIG).fill(97)))
    .get('/save', async (c) => {
      saving.resolve()
      await saveGate.promise
      return c.text('saved')
    })
    .get('/fast', (c) => c.text('fast'))

  const handlers = new Map<string, () => void>()
  const exit = mock.fn<(code: number) => void>()
  const logs: string[] = []
  const graceful = createGracefulShutdown({
    ...extra,
    onSignal: (signal, handler) => handlers.set(signal, handler),
    exit,
    log: (m) => logs.push(m),
  })
  const server = await new Promise<Server>((resolve) => {
    const s = serve({ fetch: graceful.track(app.fetch), port: 0 }, () => resolve(s as Server))
  })
  current = {
    server,
    release: () => {
      gate.resolve()
      saveGate.resolve()
    },
  }
  const { shutdown } = graceful.install(server)
  return {
    server,
    port: (server.address() as AddressInfo).port,
    started: started.promise,
    release: () => gate.resolve(),
    saving: saving.promise,
    finishSave: () => saveGate.resolve(),
    handlers,
    /** 登録された合図のハンドラを呼ぶ（登録されていなければ失敗させる） */
    signal: (name: NodeJS.Signals) => {
      const handler = handlers.get(name)
      if (!handler) throw new Error(`${name} のハンドラが登録されていない`)
      handler()
    },
    exit,
    logs,
    shutdown,
  }
}

interface Result {
  status?: number
  body?: string
  error?: string
}

function get(port: number, path: string, agent: http.Agent | false = false): Promise<Result> {
  return new Promise((resolve) => {
    const req = http.get({ port, path, agent }, (res) => {
      let body = ''
      res.on('data', (chunk) => (body += chunk))
      res.on('end', () => resolve({ status: res.statusCode, body }))
      res.on('error', (e: NodeJS.ErrnoException) => resolve({ error: e.code ?? e.message }))
    })
    req.on('error', (e: NodeJS.ErrnoException) => resolve({ error: e.code ?? e.message }))
  })
}

let current: { server: Server; release: () => void } | undefined

describe('createGracefulShutdown', () => {
  afterEach(() => {
    current?.release()
    current?.server.closeAllConnections()
    current?.server.close()
    current = undefined
  })

  it('処理中のリクエストを 200 で返し終えてから closer を順に閉じ、exit(0) する', TEST, async () => {
    const order: string[] = []
    const t = await setup({
      closers: [
        { name: 'a', close: async () => void order.push('a') },
        { name: 'b', close: () => void order.push('b') },
      ],
    })
    assert.deepEqual([...t.handlers.keys()], ['SIGTERM', 'SIGINT'])

    const held = get(t.port, '/held')
    await t.started
    t.signal('SIGTERM')
    // 停止の途中の新しい接続は拒まれる
    assert.deepEqual(await get(t.port, '/fast'), { error: 'ECONNREFUSED' })
    assert.deepEqual(order, [])

    t.release()
    assert.deepEqual(await held, { status: 200, body: 'held done' })
    await t.shutdown('test')
    assert.deepEqual(order, ['a', 'b'])
    assertCalledOnceWith(t.exit, 0)
  })

  it('大きな応答は、読むのが遅い相手にも書き終えてから exit する', TEST, async () => {
    const closed = mock.fn()
    const t = await setup({ closers: [{ name: 'db', close: closed }] })
    const ended = deferred<ServerResponse>()
    // 同期で返す応答はアプリのハンドラの中で end まで進むので、それより前に耳を付ける
    t.server.prependListener('request', (_req, res) =>
      res.once('prefinish', () => ended.resolve(res)),
    )
    let finishedAtExit: boolean | undefined
    t.exit.mock.mockImplementation(() => {
      finishedAtExit = res.writableFinished
    })

    const socket = net.connect(t.port)
    let received = 0
    const all = deferred()
    socket.on('data', (chunk: Buffer) => {
      received += chunk.length
      if (received > BIG) all.resolve() // ヘッダー + 本文
    })
    socket.pause() // 読まない相手
    socket.write('GET /big HTTP/1.1\r\nHost: x\r\n\r\n')

    const res = await ended.promise
    // end() は済んだが、本文はまだ送信のバッファに残っている
    assert.equal(res.writableFinished, false)
    const done = t.shutdown('test')
    // 落ち着きの時間を越えても、書き出しが終わっていない間は先へ進まない（`end()` で数から外すと、ここで進む）
    await sleep(SETTLE_MS * 3)
    assert.equal(res.writableFinished, false)
    assert.equal(callCount(closed), 0)
    assert.equal(callCount(t.exit), 0)
    socket.resume()
    await all.promise
    await done
    assert.equal(finishedAtExit, true)
    assertCalledOnceWith(t.exit, 0)
    socket.destroy()
  })

  it('応答の前に接続が切れても、ハンドラが終わるまで closer と exit に進まない', TEST, async () => {
    const closed = mock.fn()
    const t = await setup({ closers: [{ name: 'db', close: closed }] })
    const responseClosed = deferred()
    t.server.on('request', (_req, res) => res.once('close', () => responseClosed.resolve()))

    const req = http.get({ port: t.port, path: '/save', agent: false })
    req.on('error', () => {})
    await t.saving
    const done = t.shutdown('test')
    req.destroy() // 利用者が応答を待たずに離れた（前段のプロキシが上流の接続を閉じた）
    await responseClosed.promise
    // 応答の書き出しは数から外れたが、ハンドラ（保存）はまだ動いている
    await sleep(SETTLE_MS * 3)
    assert.equal(callCount(closed), 0)
    assert.equal(callCount(t.exit), 0)

    t.finishSave()
    await done
    assert.equal(callCount(closed), 1)
    assertCalledOnceWith(t.exit, 0)
    assert.equal(
      t.logs.some((m) => m.includes('warn')),
      false,
    )
  })

  it('落ち着きの時間の中で始まったリクエストも返す', TEST, async () => {
    const t = await setup({ settleMs: 2_000 })
    const agent = new http.Agent({ keepAlive: true, maxSockets: 1 })
    assert.equal((await get(t.port, '/fast', agent)).status, 200)

    const done = t.shutdown('test')
    // 処理中は 0。既存の keep-alive の接続で、落ち着きの時間のうちに次のリクエストが始まる
    const held = get(t.port, '/held', agent)
    await t.started
    assert.equal(callCount(t.exit), 0) // 処理中が 0 になった瞬間に先へ進んでいない
    t.release()
    assert.deepEqual(await held, { status: 200, body: 'held done' })
    await done
    assertCalledOnceWith(t.exit, 0)
    agent.destroy()
  })

  it('アイドルの keep-alive の接続が残っていても、上限を待たずに終わる', TEST, async () => {
    const t = await setup() // 上限は既定の 7.5 秒。待てばテストの上限（5 秒）で落ちる
    const agent = new http.Agent({ keepAlive: true })
    assert.equal((await get(t.port, '/fast', agent)).status, 200)

    await t.shutdown('test')
    assertCalledOnceWith(t.exit, 0)
    assert.equal(
      t.logs.some((m) => m.includes('warn')),
      false,
    )
    agent.destroy()
  })

  it('上限を過ぎても終わらないリクエストは待つのをやめて先へ進む', TEST, async () => {
    const closed = mock.fn()
    const t = await setup({
      timeoutMs: 100,
      closers: [{ name: 'db', close: closed }],
    })

    void get(t.port, '/held')
    await t.started
    await t.shutdown('test')
    assert.equal(callCount(closed), 1)
    assertCalledOnceWith(t.exit, 0)
    assert.equal(
      t.logs.some((m) => m.includes('warn') && m.includes('100ms')),
      true,
    )
  })

  it('closer が失敗・固まっても、残りの closer と exit は動く', TEST, async () => {
    const last = mock.fn()
    const t = await setup({
      closerTimeoutMs: 50,
      closers: [
        {
          name: 'throws',
          close: () => {
            throw new Error('boom')
          },
        },
        { name: 'rejects', close: () => Promise.reject(new Error('nope')) },
        { name: 'hangs', close: () => new Promise<void>(() => {}) },
        { name: 'last', close: last },
      ],
    })

    await t.shutdown('test')
    assert.equal(callCount(last), 1)
    assertCalledOnceWith(t.exit, 0)
    const warns = t.logs.filter((m) => m.includes('warn'))
    assert.equal(warns.length, 3)
    assert.match(warns.join('\n'), /throws.*boom[\s\S]*rejects.*nope[\s\S]*hangs.*時間切れ/)
  })

  it('closer を始めた後に既存の接続から届いたリクエストは、アプリに渡さず 503 で断る', TEST, async () => {
    const closing = deferred()
    const finish = deferred()
    const t = await setup({
      closerTimeoutMs: 5_000,
      closers: [
        {
          name: 'db',
          close: () => {
            closing.resolve()
            return finish.promise
          },
        },
      ],
    })
    let appCalled = false
    void t.started.then(() => (appCalled = true))
    const agent = new http.Agent({ keepAlive: true, maxSockets: 1 })
    assert.equal((await get(t.port, '/fast', agent)).status, 200)

    const done = t.shutdown('test')
    await closing.promise
    assert.deepEqual(await get(t.port, '/held', agent), {
      status: 503,
      body: 'shutting down',
    })
    assert.equal(appCalled, false)
    finish.resolve()
    await done
    assertCalledOnceWith(t.exit, 0)
    agent.destroy()
  })

  it('合図が 2 回来ても、手順は 1 回だけ動く', TEST, async () => {
    const closer = mock.fn()
    const t = await setup({ closers: [{ name: 'db', close: closer }] })

    t.signal('SIGTERM')
    t.signal('SIGINT')
    t.signal('SIGTERM')
    await t.shutdown('test')
    assert.equal(callCount(closer), 1)
    assertCalledOnceWith(t.exit, 0)
  })
})
