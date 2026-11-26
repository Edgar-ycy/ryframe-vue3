import { execFileSync } from 'node:child_process'
import { appendFileSync, readFileSync } from 'node:fs'
import process from 'node:process'
import { markdown } from './documentation-markdown.mjs'

const documentation = new Set([
  'README.md',
  'README.en.md',
  'ARCHITECTURE.md',
  'ARCHITECTURE.en.md',
  'CHANGELOG.md',
  'CHANGELOG.en.md',
])

const jobIds = ['documentation', 'static', 'unit', 'build', 'browser', 'windows-smoke']

function isSha(value) {
  return typeof value === 'string' && /^[0-9a-f]{40}$/u.test(value) && !/^0{40}$/u.test(value)
}

function git(...args) {
  return execFileSync('git', ['--no-replace-objects', ...args], {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
    windowsHide: true,
  })
}

function eventBase(event, payload, head) {
  if (event === 'pull_request') return payload?.pull_request?.base?.sha
  if (
    event === 'push' &&
    typeof payload?.ref === 'string' &&
    /^refs\/heads\/.+$/u.test(payload.ref) &&
    payload.after === head &&
    payload.deleted !== true
  ) {
    return payload.before
  }
  return undefined
}

const listMarker = /^(?:[-+*]|\d{1,9}[.)])[ \t]+/u

function indentation(whitespace) {
  let column = 0
  for (const character of whitespace) {
    column += character === '\t' ? 4 - (column % 4) : 1
  }
  return column
}

function exampleContainer(line, marker) {
  let quotes = 0
  let margin = 0
  for (let match = marker.exec(line); match; match = marker.exec(line)) {
    const prefix = match[0]
    if (prefix.trimStart().startsWith('>')) {
      quotes += 1
      margin = 0
    } else {
      margin += indentation(prefix)
    }
    line = line.slice(prefix.length)
  }
  return { line, quotes, margin }
}

function normalizeExampleFences(source) {
  const lines = []
  let fence
  for (const line of source.split(/\r?\n/u)) {
    const quote = exampleContainer(line, /^[ \t]*>[ \t]?/u)
    const text = quote.line.trimStart()
    const column = indentation(quote.line.slice(0, quote.line.length - text.length))
    if (fence && (quote.quotes < fence.quotes || (text && column < fence.margin))) {
      // 引用或列表结束时，所包含的围栏也随之结束。
      lines.push(fence.marker, '')
      fence = undefined
    }
    if (fence) {
      if (
        quote.quotes === fence.quotes &&
        text.startsWith(fence.marker) &&
        text.replaceAll(fence.marker[0], '').trim() === ''
      ) {
        lines.push(text, '')
        fence = undefined
        continue
      }
    } else {
      const container = exampleContainer(line, /^[ \t]*(?:>[ \t]?|(?:[-+*]|\d{1,9}[.)])[ \t]+)/u)
      const opening = container.line.trimStart()
      const marker = /^(`{3,}|~{3,})/u.exec(opening)?.[0]
      if (marker) {
        fence = { marker, quotes: container.quotes, margin: container.margin }
        lines.push(opening)
        continue
      }
    }
    lines.push(line)
  }
  return lines.join('\n')
}

function indentedExamples(prose) {
  const blocks = []
  let margins = []
  let depth = 0
  let boundary = true
  let block
  let gap = 0
  for (const line of prose.split('\n')) {
    const quote = exampleContainer(line, /^ {0,3}>[ \t]?/u)
    if (quote.quotes !== depth) {
      margins = []
      depth = quote.quotes
      boundary = true
      block = undefined
    }
    const text = quote.line.trimStart()
    if (!text) {
      boundary = true
      gap += 1
      continue
    }
    const column = indentation(quote.line.slice(0, quote.line.length - text.length))
    while (margins.length && column < margins.at(-1)) margins.pop()
    const margin = margins.at(-1) ?? 0
    if (column >= margin + 4 && (boundary || block)) {
      if (!block) {
        block = []
        blocks.push(block)
      } else if (gap) {
        block.push(...Array(gap).fill(''))
      }
      block.push(line)
    } else {
      block = undefined
      const marker = listMarker.exec(text)?.[0]
      if (marker) margins.push(column + indentation(marker))
    }
    boundary = !block && /^(?:#{1,6}(?:[ \t]|$)|(?:=+|-{3,})[ \t]*$)/u.test(text)
    gap = 0
  }
  return blocks
}

function technicalContent(revision, path) {
  const source = normalizeExampleFences(git('show', `${revision}:${path}`))
  const { blocks, prose } = markdown(source, {
    preserveShellComments: true,
  })
  const inline = (prose.match(/`[^`\n]+`/gu) ?? []).sort()
  return JSON.stringify([blocks, indentedExamples(prose), inline])
}

function onlyDocumentation(diff, base, head) {
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

function planMode(env) {
  const { GITHUB_EVENT_NAME: event, GITHUB_EVENT_PATH: path, GITHUB_SHA: head } = env
  if ((event !== 'push' && event !== 'pull_request') || !path || !isSha(head)) return 'full'

  try {
    const base = eventBase(event, JSON.parse(readFileSync(path, 'utf8')), head)
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

function verifyRequired(raw) {
  const needs = JSON.parse(raw ?? 'null')
  const expectedKeys = ['plan', ...jobIds]
  if (
    !needs ||
    typeof needs !== 'object' ||
    Object.keys(needs).length !== expectedKeys.length ||
    !expectedKeys.every((key) => Object.hasOwn(needs, key))
  ) {
    throw new Error('门禁任务清单不完整或含未知任务')
  }

  const mode = needs.plan?.outputs?.mode
  if (needs.plan?.result !== 'success' || (mode !== 'docs' && mode !== 'full')) {
    throw new Error('CI 计划未成功生成有效模式')
  }

  for (const job of jobIds) {
    const required = mode === 'docs' ? job === 'documentation' : job !== 'documentation'
    const result = needs[job]?.result
    if (result !== 'success' && (required || result !== 'skipped')) {
      throw new Error(`CI 任务 ${job} 的结果无效：${result ?? '缺失'}`)
    }
  }
}

try {
  const [, , command] = process.argv
  if (process.argv.length !== 3) throw new Error('用法 node scripts/ci-plan.mjs plan|required')
  if (command === 'plan') {
    const output = process.env.GITHUB_OUTPUT
    if (!output) throw new Error('缺少 GITHUB_OUTPUT')
    appendFileSync(output, `mode=${planMode(process.env)}\n`)
  } else if (command === 'required') {
    verifyRequired(process.env.RYFRAME_CI_NEEDS)
  } else {
    throw new Error('用法 node scripts/ci-plan.mjs plan|required')
  }
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error))
  process.exitCode = 1
}
