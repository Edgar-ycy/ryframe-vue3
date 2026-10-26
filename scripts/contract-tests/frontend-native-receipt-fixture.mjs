import { execFileSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { buildSourceSnapshot } from '../build-source.mjs'
import { receiptPath, writeBuildReceipt } from '../restore-build.mjs'

const frontend = fileURLToPath(new URL('../../', import.meta.url))
const application =
  'api_origin=""\n[server]\nhost="localhost"\nport=5173\n' +
  'proxy_target="http://localhost:8080"\n'
export const observe = () => ({
  node: process.version,
  pnpm: { pinned: '11.20.0', observed: '11.20.0' },
  vite: '7.1.7',
})

export function fixture(t, { environment = 'test', formal = true, localTools = false } = {}) {
  const base = path.join(frontend, '.local-tests/node-unit')
  fs.mkdirSync(base, { recursive: true })
  const root = fs.mkdtempSync(path.join(base, 'native-parity-中文 '))
  t.after(() => fs.rmSync(root, { recursive: true, force: true }))
  const put = (relative, bytes) => {
    const file = path.join(root, relative)
    fs.mkdirSync(path.dirname(file), { recursive: true })
    fs.writeFileSync(file, bytes)
  }
  const json = (relative, value) => put(relative, JSON.stringify(value) + '\n')
  const git = (...args) =>
    execFileSync('git', ['-C', root, ...args], { windowsHide: true, encoding: 'utf8' }).trim()
  put('.gitignore', '/dist/\n/.local-tests/\n/node_modules/\n/.env*\n')
  put('package.json', '{"packageManager":"pnpm@11.20.0"}\n')
  put('src/中文.txt', '产品来源\n')
  put('scripts/tool.txt', '工具来源\n')
  put('README.md', '支持来源\n')
  for (const directory of ['config', '公开 配置']) {
    put(`${directory}/app.toml`, application)
    for (const name of ['dev', 'test', 'prod']) put(`${directory}/app.${name}.toml`, '# 环境\n')
  }
  json('config/tools.json', { application_config_dir: 'config' })
  if (localTools) {
    json('.local-tests/frontend-tools.json', { application_config_dir: '公开 配置' })
  }
  git('init', '--quiet')
  git('config', 'core.autocrlf', 'false')
  git('add', '.')
  git(
    '-c',
    'user.name=Parity',
    '-c',
    'user.email=parity@example.invalid',
    'commit',
    '--quiet',
    '-m',
    'isolated receipt parity fixture',
  )
  const head = git('rev-parse', 'HEAD')
  const commit = formal ? head : 'development'
  json('.local-tests/build/source.json', { format_version: 1, frontend_commit: commit })
  json('dist/build-identity.json', { frontend_commit: commit })
  put('dist/index.html', '<main>独立产物</main>')
  put('dist/.vite/manifest.json', '{}')
  for (const name of ['z', '中文', '😀', '\uE000']) put(`dist/assets/${name}.txt`, name)
  const buildEnvironment = { APP_ENV: environment }
  const before = buildSourceSnapshot(root, buildEnvironment, observe)
  const receipt = writeBuildReceipt(root, before, buildEnvironment, observe)
  return { root, put, json, receipt, head, file: path.join(root, 'dist', receiptPath) }
}
