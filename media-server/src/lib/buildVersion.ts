// 動いているサーバがどのコミットから作られたか（prd/05 §4）。`GET /version` が返す。
//
// 値はイメージのビルド引数（GIT_COMMIT / BUILD_TIME / GIT_DIRTY）を Dockerfile の最終ステージで
// ENV に入れたもの。`.dockerignore` が `.git` を除くので、イメージの中では git から取れない。
// 未指定・読めない値は `unknown`（開発用の Dockerfile.dev と compose は何も渡さない）。
// process.env には触らない純粋な関数にして、テストが env を差し替えずに検査できるようにする。
//
// ⚠ 同じ内容を resource-server と media-server の両方に置いている（共有パッケージを持たず、
//   本番イメージは互いのソースを含めずにビルドするため）。直すときは両方を直す。

export const unknownVersion = 'unknown'

export type BuildVersion = {
  /** コミットの SHA（40 桁・小文字）。分からなければ `unknown` */
  commit: string
  /** ビルド日時（ISO 8601・UTC）。分からなければ `unknown` */
  builtAt: string
  /** 追跡しているファイルに未コミットの変更がある状態でビルドしたか */
  dirty: boolean
}

type Env = Record<string, string | undefined>

/** `GET /version` が読む ENV。ビルド引数から最終ステージの ENV へ渡す（Dockerfile.*.prod）。 */
export const versionEnvNames = ['GIT_COMMIT', 'BUILD_TIME', 'GIT_DIRTY'] as const

/** 40 桁の SHA なら小文字にして返す。短縮形や空は `unknown`（どのコミットか言い切れないため）。 */
export function normalizeCommit(value: string | undefined): string {
  const v = value?.trim().toLowerCase() ?? ''
  return /^[0-9a-f]{40}$/.test(v) ? v : unknownVersion
}

/** 日時として読めれば ISO 8601（UTC）に揃える。読めなければ `unknown`。 */
export function normalizeBuiltAt(value: string | undefined): string {
  const v = value?.trim() ?? ''
  if (v === '') return unknownVersion
  const t = Date.parse(v)
  return Number.isNaN(t) ? unknownVersion : new Date(t).toISOString()
}

/** `true` / `1` だけを dirty とみなす。 */
export function parseDirty(value: string | undefined): boolean {
  const v = value?.trim().toLowerCase()
  return v === 'true' || v === '1'
}

export function buildVersionFromEnv(env: Env): BuildVersion {
  return {
    commit: normalizeCommit(env.GIT_COMMIT),
    builtAt: normalizeBuiltAt(env.BUILD_TIME),
    dirty: parseDirty(env.GIT_DIRTY),
  }
}

/**
 * Dockerfile の最終ステージで `ARG <名前>` と `<名前>=$<名前>` の ENV が揃っていない名前を返す。
 * 渡し忘れてもビルドは通り、`/version` が黙って `unknown` を返すだけになるので、テストで照合する。
 */
export function missingVersionEnv(dockerfile: string): string[] {
  const lines = dockerfile.split('\n').map((l) => l.trim())
  const lastFrom = lines.findLastIndex((l) => /^FROM\s/i.test(l))
  const stage = lines.slice(lastFrom + 1)
  return versionEnvNames.filter((name) => {
    const hasArg = stage.some((l) => new RegExp(`^ARG\\s+${name}(=|\\s*$)`, 'i').test(l))
    const hasEnv = stage.some((l) => /^ENV\s/i.test(l) && l.includes(`${name}=$${name}`))
    return !(hasArg && hasEnv)
  })
}
