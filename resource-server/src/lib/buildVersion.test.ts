// `pnpm --filter videmus-resource-server test`（tsx --test。Node 標準の node:test で、依存は増やさない）。
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { describe, it } from 'node:test'

import {
  buildVersionFromEnv,
  missingVersionEnv,
  normalizeBuiltAt,
  normalizeCommit,
  parseDirty,
} from './buildVersion'

const dockerfileName = 'Dockerfile.resource-server.prod'
const sha = 'aa0922b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f7'

describe('buildVersionFromEnv', () => {
  it('ビルド引数が揃っていればそのまま返す', () => {
    assert.deepEqual(
      buildVersionFromEnv({
        GIT_COMMIT: sha,
        BUILD_TIME: '2026-10-30T01:02:03Z',
        GIT_DIRTY: 'false',
      }),
      { commit: sha, builtAt: '2026-10-30T01:02:03.000Z', dirty: false },
    )
  })

  it('未指定なら unknown（開発環境は何も渡さない）', () => {
    assert.deepEqual(buildVersionFromEnv({}), {
      commit: 'unknown',
      builtAt: 'unknown',
      dirty: false,
    })
  })
})

describe('normalizeCommit', () => {
  it('大文字・前後の空白を揃える', () => {
    assert.equal(normalizeCommit(` ${sha.toUpperCase()}\n`), sha)
  })

  it('短縮形・空・SHA でないものは unknown', () => {
    assert.equal(normalizeCommit('aa0922b'), 'unknown')
    assert.equal(normalizeCommit(''), 'unknown')
    assert.equal(normalizeCommit('unknown'), 'unknown')
    assert.equal(normalizeCommit(`${sha}0`), 'unknown')
  })
})

describe('normalizeBuiltAt', () => {
  it('オフセット付きの日時を UTC に揃える', () => {
    assert.equal(normalizeBuiltAt('2026-10-30T10:00:00+09:00'), '2026-10-30T01:00:00.000Z')
  })

  it('読めない値は unknown', () => {
    assert.equal(normalizeBuiltAt('yesterday'), 'unknown')
    assert.equal(normalizeBuiltAt(undefined), 'unknown')
    assert.equal(normalizeBuiltAt('unknown'), 'unknown')
  })
})

describe('parseDirty', () => {
  it('true / 1 だけを dirty とみなす', () => {
    assert.equal(parseDirty('true'), true)
    assert.equal(parseDirty('TRUE'), true)
    assert.equal(parseDirty('1'), true)
    assert.equal(parseDirty('false'), false)
    assert.equal(parseDirty(''), false)
    assert.equal(parseDirty(undefined), false)
  })
})

describe('missingVersionEnv', () => {
  it('本番の Dockerfile の最終ステージがビルドの版をビルド引数から ENV へ渡す', () => {
    const dockerfile = readFileSync(new URL(`../../${dockerfileName}`, import.meta.url), 'utf8')
    assert.deepEqual(missingVersionEnv(dockerfile), [])
  })

  it('ビルドステージだけにあっても渡したとみなさない', () => {
    assert.deepEqual(
      missingVersionEnv('FROM a AS build\nARG GIT_COMMIT\nENV GIT_COMMIT=$GIT_COMMIT\nFROM b\n'),
      ['GIT_COMMIT', 'BUILD_TIME', 'GIT_DIRTY'],
    )
  })

  it('ARG と ENV が揃っていれば足りている', () => {
    assert.deepEqual(
      missingVersionEnv(
        'FROM b\nARG GIT_COMMIT=unknown\nARG BUILD_TIME\nARG GIT_DIRTY=false\n' +
          'ENV GIT_COMMIT=$GIT_COMMIT BUILD_TIME=$BUILD_TIME\nENV GIT_DIRTY=$GIT_DIRTY\n',
      ),
      [],
    )
  })
})
