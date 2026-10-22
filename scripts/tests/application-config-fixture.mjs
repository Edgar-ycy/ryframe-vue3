import { stringify } from 'smol-toml'
import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'

const repository = fileURLToPath(new URL('../..', import.meta.url))
const loader = new URL('../application-config.mjs', import.meta.url).href
export const defaults = {
  api_origin: '',
  server: { host: 'localhost', port: 5173, proxy_target: 'http://localhost:8080' },
}
export const hash = (bytes) => createHash('sha256').update(bytes).digest('hex')
export const toml = (value) => stringify(value)
export const json = (value) => JSON.stringify(value, null, 2) + '\n'

export function fixture(t) {
  const parent = path.join(repository, '.local-tests/application-config-tests')
  fs.mkdirSync(parent, { recursive: true })
  const root = fs.mkdtempSync(path.join(parent, '公开 配置-'))
  fs.mkdirSync(path.join(root, 'config'))
  t.after(() => fs.rmSync(root, { recursive: true, force: true }))
  const write = (name, value) =>
    fs.writeFileSync(path.join(root, name), name.endsWith('.toml') ? toml(value) : json(value))
  write('config/app.toml', defaults)
  for (const environment of ['dev', 'test', 'prod']) write(`config/app.${environment}.toml`, {})
  return { root, write }
}

export function child(root, environment) {
  const script = [
    'const {loadApplicationConfig}=await import(process.argv[1])',
    'console.log(JSON.stringify(loadApplicationConfig(process.argv[2])))',
  ].join(';')
  const result = spawnSync(process.execPath, ['--input-type=module', '-e', script, loader, root], {
    env: environment,
    encoding: 'utf8',
    windowsHide: true,
  })
  assert.equal(result.status, 0, result.stderr)
  return JSON.parse(result.stdout)
}

export function snapshot(directory) {
  return fs
    .readdirSync(directory)
    .sort()
    .map((name) => [name, fs.readFileSync(path.join(directory, name))])
}
