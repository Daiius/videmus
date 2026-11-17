// `GET /version`（prd/05 §4）: 認証なし・DB に触れずに、イメージの ENV から入れた版を返す。
//
// app.ts は import した時点の env で版を読むので、import の前に env を入れる（import は 1 回だけ）。
// DB の接続先は何も設定しない。mysql2 の pool は問い合わせるまで繋がないので、
// ここで応答が返ること自体が「DB に触れていない」ことの確認になる。
import assert from 'node:assert/strict'
import { it } from 'node:test'

const sha = 'aa0922b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f7'

it('GET /version はビルド引数の値を認証なしで返す', async () => {
  process.env.GIT_COMMIT = sha
  process.env.BUILD_TIME = '2026-10-30T01:02:03Z'
  process.env.GIT_DIRTY = 'false'
  const { app } = await import('./app')

  const res = await app.request('/version')
  assert.equal(res.status, 200)
  assert.deepEqual(await res.json(), {
    commit: sha,
    builtAt: '2026-10-30T01:02:03.000Z',
    dirty: false,
  })
})
