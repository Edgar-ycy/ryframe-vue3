import { execFileSync } from 'node:child_process'
import {
  closeSync,
  constants,
  fstatSync,
  lstatSync,
  openSync,
  readFileSync,
  realpathSync,
} from 'node:fs'
import path from 'node:path'
import process from 'node:process'
import { TextDecoder } from 'node:util'

const ownershipPath = 'src/api/generated/ownership.json'
const ownershipGenerator = 'scripts/generate-api-artifacts.mjs'
const sharedOpenapi = new Set([
  'src/shared/config/apiPrefix.generated.json',
  'src/shared/markdown/noticePolicy.generated.json',
  'src/shared/security/passwordPolicy.generated.json',
])
const declarationPlugins = new Map([
  ['src/auto-imports.d.ts', ['AutoImport', 'unplugin-auto-import']],
  ['src/components.d.ts', ['Components', 'unplugin-vue-components']],
])
const oldScanExcluded = new Set([
  '.git',
  '.github',
  '.local-tests',
  'coverage',
  'dist',
  'node_modules',
  'openapi',
])
const typescript = /\.(?:tsx?|mts|cts)$/i
const newline = /\r\n|\r|\n/u
const utf8 = new TextDecoder('utf-8', { fatal: true, ignoreBOM: true })
const gitEnvironment = { ...process.env }
for (const key of ['GIT_DIR', 'GIT_COMMON_DIR', 'GIT_WORK_TREE', 'GIT_INDEX_FILE']) {
  delete gitEnvironment[key]
}

function git(root, ...args) {
  return execFileSync('git', ['--no-optional-locks', '-C', root, ...args], {
    env: gitEnvironment,
    windowsHide: true,
    stdio: ['ignore', 'pipe', 'pipe'],
  })
}

function samePath(left, right) {
  return process.platform === 'win32' ? left.toLowerCase() === right.toLowerCase() : left === right
}

function safePart(part) {
  return Boolean(part) && part !== '.' && part !== '..' && !/[\\:\p{Cc}]/u.test(part)
}

function inspect(file, directory, label) {
  const stat = lstatSync(file, { bigint: true })
  if (
    stat.isSymbolicLink() ||
    (directory ? !stat.isDirectory() : !stat.isFile() || stat.nlink !== 1n) ||
    !samePath(realpathSync.native(file), file)
  ) {
    throw new Error(`源码路径必须是原位置的普通${directory ? '目录' : '文件'}：${label}`)
  }
  return stat
}

function gitRoot(raw) {
  if (!raw || !path.isAbsolute(raw) || /[\p{Cc}]/u.test(raw)) {
    throw new Error('用法：node scripts/devex-source-size.mjs --root <绝对前端 Git 根>')
  }
  const { root: anchor } = path.parse(raw)
  const parts = raw
    .slice(anchor.length)
    .split(process.platform === 'win32' ? /[\\/]/u : '/')
    .filter(Boolean)
  if (!parts.every(safePart)) throw new Error('前端 Git 根包含无效路径分量')
  let current = path.normalize(anchor)
  inspect(current, true, current)
  for (const part of parts) {
    current = path.join(current, part)
    inspect(current, true, current)
  }
  const top = utf8.decode(git(current, 'rev-parse', '--show-toplevel')).replace(/\r?\n$/u, '')
  if (!samePath(path.normalize(top), current)) throw new Error('必须指定实际的前端 Git 根目录')
  return current
}

function trackedPaths(root) {
  const records = utf8.decode(git(root, 'ls-files', '--stage', '-z')).split('\0')
  if (records.pop() !== '') throw new Error('Git 源码清单缺少结束标记')
  const keys = new Set()
  return new Set(
    records.map((record) => {
      const match = /^(100644|100755) [0-9a-f]+ 0\t(.+)$/u.exec(record)
      const relative = match?.[2]
      if (!relative || !relative.split('/').every(safePart)) {
        throw new Error(
          `Git 源码清单包含无效路径、链接或未合并文件：${record.split('\t')[1] ?? ''}`,
        )
      }
      const key = process.platform === 'win32' ? relative.toLowerCase() : relative
      if (keys.has(key)) throw new Error(`Git 源码清单包含重复路径：${relative}`)
      keys.add(key)
      return relative
    }),
  )
}

function readSource(root, relative) {
  const parts = relative.split('/')
  let current = root
  for (const part of parts.slice(0, -1)) {
    current = path.join(current, part)
    inspect(current, true, relative)
  }
  const file = path.join(current, parts.at(-1))
  const before = inspect(file, false, relative)
  const descriptor = openSync(file, constants.O_RDONLY | (constants.O_NOFOLLOW ?? 0))
  try {
    const opened = fstatSync(descriptor, { bigint: true })
    if (opened.dev !== before.dev || opened.ino !== before.ino || opened.nlink !== 1n) {
      throw new Error(`源码文件在读取前发生替换：${relative}`)
    }
    return utf8.decode(readFileSync(descriptor))
  } finally {
    closeSync(descriptor)
  }
}

function openapiOwnership(root, tracked) {
  if (!tracked.has(ownershipPath)) throw new Error(`缺少 Git 管理的 OpenAPI 归属：${ownershipPath}`)
  const value = JSON.parse(readSource(root, ownershipPath))
  if (
    !value ||
    Object.keys(value).sort().join() !== 'files,generator,version' ||
    value.version !== 1 ||
    value.generator !== ownershipGenerator ||
    !Array.isArray(value.files) ||
    !value.files.includes(ownershipPath) ||
    new Set(value.files).size !== value.files.length ||
    !value.files.every(
      (file) =>
        typeof file === 'string' &&
        tracked.has(file) &&
        ((file.startsWith('src/api/generated/') && typescript.test(file)) ||
          file === ownershipPath ||
          sharedOpenapi.has(file)),
    )
  ) {
    throw new Error(`OpenAPI 归属清单无效：${ownershipPath}`)
  }
  return new Set(value.files)
}

function viteDeclarations(config) {
  const text = config.replace(/\r\n|\r/gu, '\n')
  const lines = new Set(text.split('\n'))
  const blocks = [...text.matchAll(/^([ ]+)(AutoImport|Components)\(\{\n([\s\S]*?)^\1\}\),?$/gmu)]
  return new Map(
    [...declarationPlugins].filter(([file, [plugin, module]]) => {
      const imported = `import ${plugin} from '${module}/vite'`
      return (
        lines.has(imported) &&
        blocks.some(
          ([, , name, fields]) =>
            name === plugin && fields.split('\n').some((line) => line.trim() === `dts: '${file}',`),
        )
      )
    }),
  )
}

function generatedResource(file, [header, nameLine, sourceLine]) {
  if (file === 'src/generated/resources/index.ts') {
    return /^\/\/ @generated by RyFrame \S+$/u.test(header)
  }
  const resource =
    /^src\/generated\/resources\/(post|notice)\/(api\.ts|fields\.ts|index\.ts|page\.vue|registration\.ts)$/u.exec(
      file,
    )
  if (!resource) return false
  const [, name, leaf] = resource
  const source = `catalog/resources/${name}.toml`
  return leaf === 'page.vue'
    ? /^<!-- @generated by RyFrame \S+ /u.test(header) &&
        header.endsWith(` | resource: ${name} | source: ${source} -->`)
    : /^\/\/ @generated by RyFrame \S+$/u.test(header) &&
        nameLine === `// resource: ${name}` &&
        sourceLine === `// source: ${source}`
}

function groupFor(file) {
  if (typescript.test(file)) return 'typescript'
  const extension = path.posix.extname(file).toLowerCase()
  if (extension === '.vue') return 'vue'
  if (extension === '.scss') return 'scss'
  if (
    file
      .split('/')
      .slice(0, -1)
      .some((part) => oldScanExcluded.has(part))
  )
    return undefined
  if (extension === '.mjs') return 'mjs'
  if (extension === '.md') return 'markdown'
}

function updateSummary(summary, file, lines) {
  summary.files += 1
  if (lines > summary.max_lines) {
    summary.max_lines = lines
    summary.max_paths = []
  }
  if (lines === summary.max_lines) summary.max_paths.push(file)
}

function scan(root) {
  const tracked = trackedPaths(root)
  const openapi = openapiOwnership(root, tracked)
  const vite = viteDeclarations(
    tracked.has('vite.config.ts') ? readSource(root, 'vite.config.ts') : '',
  )
  const limits = { vue: 600, typescript: 300, scss: 300 }
  const groups = Object.fromEntries(
    ['vue', 'typescript', 'scss', 'mjs', 'markdown'].map((group) => [
      group,
      { files: 0, max_lines: 0, max_paths: [] },
    ]),
  )
  const excluded = {
    openapi_typescript: 0,
    vite_typescript: 0,
    resource_typescript: 0,
    resource_vue: 0,
  }
  const violations = []
  for (const file of tracked) {
    const group = groupFor(file)
    if (!group) continue
    const source = readSource(root, file)
    const lines = source ? source.split(newline) : []
    if (lines.at(-1) === '') lines.pop()
    if (
      group === 'typescript' &&
      openapi.has(file) &&
      lines[1] === ' * 此文件由 OpenAPI 契约自动生成。'
    ) {
      excluded.openapi_typescript += 1
    } else if (
      vite.has(file) &&
      lines.slice(0, 10).includes(`// Generated by ${vite.get(file)[1]}`)
    ) {
      excluded.vite_typescript += 1
    } else if (generatedResource(file, lines)) {
      excluded[group === 'vue' ? 'resource_vue' : 'resource_typescript'] += 1
    } else {
      updateSummary(groups[group], file, lines.length)
      const limit = limits[group]
      if (limit !== undefined && lines.length > limit) {
        violations.push({ path: file, lines: lines.length, limit })
      }
    }
  }
  return { groups, excluded, violations }
}

try {
  const [, , option, raw, ...extra] = process.argv
  if (option !== '--root' || extra.length)
    throw new Error('用法：node scripts/devex-source-size.mjs --root <绝对前端 Git 根>')
  const result = scan(gitRoot(raw))
  process.stdout.write(`${JSON.stringify(result)}\n`)
  if (result.violations.length) process.exitCode = 1
} catch (error) {
  process.stderr.write(`DevEx 前端源码规模检查失败：${error.message}\n`)
  process.exitCode = 1
}
