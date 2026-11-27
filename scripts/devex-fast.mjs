import { execFileSync, spawn } from 'node:child_process'
import { lstatSync, realpathSync } from 'node:fs'
import { lstat, mkdir } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { toolProcessEnvironment } from './tool-inputs.mjs'

const sizeCheck = fileURLToPath(new URL('./devex-source-size.mjs', import.meta.url))
const takesValue = new Set(['--root', '--arm', '--cache-root', '--pnpm-cache-dir'])
const frozenImports = 'scripts/check-import-boundaries.mjs'
const currentImports = 'scripts/check-import-boundaries.ts'

export function parseDevexFastArguments(argv) {
  const options = new Map()
  for (let index = 0; index < argv.length; index += 1) {
    const name = argv[index]
    if (options.has(name)) throw new Error(`重复参数 ${name}`)
    if (name === '--plan') {
      options.set(name, true)
      continue
    }
    if (!takesValue.has(name)) throw new Error(`未知 DevEx 参数 ${name}`)
    const value = argv[index + 1]
    index += 1
    if (!value || value.startsWith('--')) throw new Error(`缺少 ${name} 的值`)
    options.set(name, value)
  }
  const root = absoluteOption(options, '--root')
  const cacheRoot = absoluteOption(options, '--cache-root')
  const cacheParent = path.join(root, '.local-tests')
  const cacheRelative = path.relative(cacheParent, cacheRoot)
  if (
    !cacheRelative ||
    cacheRelative.split(path.sep)[0] === '..' ||
    path.isAbsolute(cacheRelative)
  ) {
    throw new Error('DevEx 缓存目录须位于测量工作树的 .local-tests 子目录')
  }
  const arm = options.get('--arm')
  if (arm !== 'b0' && arm !== 'b1') throw new Error('DevEx --arm 须选择 b0 或 b1')
  return {
    root,
    cacheRoot,
    arm,
    pnpmCache: options.has('--pnpm-cache-dir')
      ? absoluteOption(options, '--pnpm-cache-dir')
      : undefined,
    plan: options.has('--plan'),
  }
}

function absoluteOption(options, name) {
  const value = options.get(name)
  if (!value || !path.isAbsolute(value)) throw new Error(`DevEx ${name} 须使用绝对路径`)
  return path.resolve(value)
}

function importBoundaryEntry(root, arm) {
  const env = Object.fromEntries(
    Object.entries(process.env).filter(([name]) => !name.toUpperCase().startsWith('GIT_')),
  )
  const git = (...args) =>
    execFileSync('git', ['--no-optional-locks', '--no-replace-objects', '-C', root, ...args], {
      encoding: 'utf8',
      env,
      stdio: ['ignore', 'pipe', 'pipe'],
      windowsHide: true,
    })
  const actualRoot = realpathSync.native(root)
  const repository = realpathSync.native(git('rev-parse', '--show-toplevel').trim())
  if (actualRoot !== repository) throw new Error('DevEx 导入检查须指定实际前端 Git 根目录')

  // 两代源码各自使用 Git HEAD 登记的入口。B0 固定使用原入口。
  const records = git('ls-tree', '-z', 'HEAD', '--', frozenImports, currentImports).split('\0')
  const match =
    records.length === 2 && records[1] === ''
      ? /^100(?:644|755) blob ([0-9a-f]{40}|[0-9a-f]{64})\t(.+)$/u.exec(records[0])
      : null
  const entry = match?.[2]
  if (!match || (entry !== frozenImports && entry !== currentImports)) {
    throw new Error('DevEx Git HEAD 须登记唯一的普通导入检查入口')
  }
  if (arm === 'b0' && entry !== frozenImports) {
    throw new Error('DevEx B0 须使用原导入检查入口')
  }
  const filename = path.join(actualRoot, entry)
  const other = path.join(actualRoot, entry === frozenImports ? currentImports : frozenImports)
  const status = lstatSync(filename, { throwIfNoEntry: false })
  if (
    !status?.isFile() ||
    lstatSync(other, { throwIfNoEntry: false }) ||
    realpathSync.native(filename) !== filename ||
    git('hash-object', '--no-filters', '--', filename).trim() !== match[1]
  ) {
    throw new Error(`DevEx 导入检查入口与 Git HEAD 不一致：${entry}`)
  }
  return entry
}

export function devexFastTasks({ root, arm, cacheRoot }) {
  const cache = (name) => ['--cache', '--cache-location', path.join(cacheRoot, name, 'cache')]
  return [
    {
      id: 'format',
      covers: ['format'],
      pnpm: [
        'exec',
        'prettier',
        '--check',
        '.',
        ...cache('prettier'),
        '--cache-strategy',
        'content',
      ],
    },
    { id: 'source-size', covers: ['source-size'], node: [sizeCheck, '--root', root] },
    {
      id: 'imports',
      covers: arm === 'b0' ? ['imports'] : ['imports', 'api-operation-policy'],
      node: [importBoundaryEntry(root, arm)],
    },
    ...(arm === 'b0'
      ? [
          {
            id: 'api-operation-policy',
            covers: ['api-operation-policy'],
            node: ['scripts/check-api-operation-usage.mjs'],
          },
        ]
      : []),
    {
      id: 'api-artifacts',
      covers: ['api-artifacts'],
      node: ['scripts/generate-api-artifacts.mjs', '--check'],
    },
    {
      id: 'eslint',
      covers: ['eslint'],
      pnpm: ['exec', 'eslint', '.', '--max-warnings=0', ...cache('eslint')],
    },
    {
      id: 'stylelint',
      covers: ['stylelint'],
      pnpm: [
        'exec',
        'stylelint',
        'src/**/*.{css,scss,vue}',
        '--max-warnings=0',
        ...cache('stylelint'),
      ],
    },
    {
      id: 'typecheck-app',
      covers: ['typecheck-app'],
      pnpm: ['exec', 'vue-tsc', '-p', 'tsconfig.app.json', '--noEmit'],
    },
    {
      id: 'unit',
      covers: ['unit'],
      pnpm: ['exec', 'vitest', 'run', '--config', 'vitest.config.ts'],
    },
  ]
}

async function ensureCache(root, destination) {
  let directory = root
  for (const component of path.relative(root, destination).split(path.sep)) {
    directory = path.join(directory, component)
    try {
      await mkdir(directory)
    } catch (error) {
      if (error.code !== 'EEXIST') throw error
    }
    const state = await lstat(directory)
    if (!state.isDirectory() || state.isSymbolicLink()) {
      throw new Error(`DevEx 缓存路径须为普通目录 ${directory}`)
    }
  }
}

function runTask(task, { root, pnpmCache }) {
  const windows = process.platform === 'win32'
  const corepack = path.join(
    path.dirname(process.execPath),
    'node_modules/corepack/dist/corepack.js',
  )
  const command = windows || task.node ? process.execPath : 'corepack'
  const pnpmArguments = pnpmCache ? [`--config.cacheDir=${pnpmCache}`] : []
  const args = task.node ?? [...(windows ? [corepack] : []), 'pnpm', ...pnpmArguments, ...task.pnpm]
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd: root,
      env: { ...toolProcessEnvironment(), FORCE_COLOR: '0', NO_COLOR: '1' },
      stdio: 'inherit',
      windowsHide: true,
    })
    child.once('error', reject)
    child.once('close', (code, signal) => {
      if (signal || code !== 0) reject(new Error(`失败 ${signal ?? code}`))
      else resolve()
    })
  })
}

async function main(args) {
  const options = parseDevexFastArguments(args)
  const tasks = devexFastTasks(options)
  if (options.plan) {
    console.log(JSON.stringify({ arm: options.arm, tasks }, null, 2))
    return
  }
  for (const name of ['prettier', 'eslint', 'stylelint']) {
    await ensureCache(options.root, path.join(options.cacheRoot, name))
  }
  const results = await Promise.allSettled(tasks.map((task) => runTask(task, options)))
  const failures = results.flatMap((result, index) =>
    result.status === 'rejected' ? [`${tasks[index].id} ${result.reason.message}`] : [],
  )
  if (failures.length > 0) throw new Error(failures.join('\n'))
}

if (process.argv[1] && pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url) {
  try {
    await main(process.argv.slice(2))
  } catch (error) {
    console.error(error.message)
    process.exitCode = 1
  }
}
