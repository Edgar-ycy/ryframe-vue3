import { execFileSync } from 'node:child_process'
import { appendFileSync, readFileSync } from 'node:fs'
import process from 'node:process'
import { markdown } from './documentation-markdown.ts'

type PlanMode = 'docs' | 'full'

const documentation = new Set([
  'README.md',
  'README.en.md',
  'ARCHITECTURE.md',
  'ARCHITECTURE.en.md',
  'CHANGELOG.md',
  'CHANGELOG.en.md',
])

const jobIds = ['documentation', 'static', 'unit', 'build', 'browser', 'windows-smoke']

function isSha(value: unknown): value is string {
  return typeof value === 'string' && /^[0-9a-f]{40}$/u.test(value) && !/^0{40}$/u.test(value)
}

function git(...args: string[]): string {
  return execFileSync('git', ['--no-replace-objects', ...args], {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
    windowsHide: true,
  })
}

function property(value: unknown, key: string): unknown {
  return typeof value === 'object' && value !== null
    ? (value as Record<string, unknown>)[key]
    : undefined
}

function eventBase(event: 'push' | 'pull_request', payload: unknown, head: string): unknown {
  if (event === 'pull_request') {
    const base = property(property(payload, 'pull_request'), 'base')
    return property(base, 'sha')
  }
  const ref = property(payload, 'ref')
  if (
    typeof ref === 'string' &&
    /^refs\/heads\/.+$/u.test(ref) &&
    property(payload, 'after') === head &&
    property(payload, 'deleted') !== true
  ) {
    return property(payload, 'before')
  }
  return undefined
}

function technicalContent(revision: string, path: string): string {
  const { blocks, prose } = markdown(git('show', `${revision}:${path}`), {
    preserveShellComments: true,
  })
  const inline = (prose.match(/`[^`\n]+`/gu) ?? []).sort()
  return JSON.stringify([blocks, inline])
}

function onlyDocumentation(diff: string, base: string, head: string): boolean {
  const entries = diff.split('\0')
  if (entries.pop() !== '' || entries.length === 0 || entries.length % 2 !== 0) return false

  // 先核对路径与对象类型，再检查是否改动了命令和代码示例。
  if (
    !entries.every((entry, index) =>
      index % 2 === 0
        ? /^:100644 100644 [0-9a-f]{40} [0-9a-f]{40} M$/u.test(entry)
        : documentation.has(entry),
    )
  )
    return false

  return entries.every(
    (entry, index) =>
      index % 2 === 0 || technicalContent(base, entry) === technicalContent(head, entry),
  )
}

function planMode(env: NodeJS.ProcessEnv): PlanMode {
  const { GITHUB_EVENT_NAME: event, GITHUB_EVENT_PATH: path, GITHUB_SHA: head } = env
  if ((event !== 'push' && event !== 'pull_request') || !path || !isSha(head)) return 'full'

  try {
    const payload: unknown = JSON.parse(readFileSync(path, 'utf8'))
    const base = eventBase(event, payload, head)
    if (!isSha(base) || git('rev-parse', '--verify', 'HEAD^{commit}').trim() !== head) return 'full'
    if (git('rev-parse', '--verify', `${base}^{commit}`).trim() !== base) return 'full'
    git('merge-base', '--is-ancestor', base, head)
    const diff = git(
      'diff',
      '--raw',
      '-z',
      '--no-abbrev',
      '--no-renames',
      '--no-relative',
      '--no-ext-diff',
      '--no-textconv',
      base,
      head,
      '--',
    )
    return onlyDocumentation(diff, base, head) ? 'docs' : 'full'
  } catch {
    return 'full'
  }
}

function verifyRequired(raw: string | undefined): void {
  const needs: unknown = JSON.parse(raw ?? 'null')
  const expectedKeys = ['plan', ...jobIds]
  if (
    !needs ||
    typeof needs !== 'object' ||
    Object.keys(needs).length !== expectedKeys.length ||
    !expectedKeys.every((key) => Object.hasOwn(needs, key))
  ) {
    throw new Error('门禁任务清单不完整或含未知任务')
  }

  const plan = property(needs, 'plan')
  const mode = property(property(plan, 'outputs'), 'mode')
  if (property(plan, 'result') !== 'success' || (mode !== 'docs' && mode !== 'full')) {
    throw new Error('CI 计划未成功生成有效模式')
  }

  for (const job of jobIds) {
    const required = mode === 'docs' ? job === 'documentation' : job !== 'documentation'
    const result = property(property(needs, job), 'result')
    if (result !== 'success' && (required || result !== 'skipped')) {
      throw new Error(`CI 任务 ${job} 的结果无效：${result ?? '缺失'}`)
    }
  }
}

try {
  const [, , command] = process.argv
  if (process.argv.length !== 3) throw new Error('用法 node scripts/ci-plan.ts plan|required')
  if (command === 'plan') {
    const output = process.env.GITHUB_OUTPUT
    if (!output) throw new Error('缺少 GITHUB_OUTPUT')
    appendFileSync(output, `mode=${planMode(process.env)}\n`)
  } else if (command === 'required') {
    verifyRequired(process.env.RYFRAME_CI_NEEDS)
  } else {
    throw new Error('用法 node scripts/ci-plan.ts plan|required')
  }
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error))
  process.exitCode = 1
}
