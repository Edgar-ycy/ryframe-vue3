import path from 'node:path'
import { readManagedJson, unchangedManagedJson } from './application-config-files.mjs'

const inputs = ['config/tools.json', '.local-tests/frontend-tools.json']
const fields = new Set(['application_config_dir', 'api_contract', 'real_browser', 'browser_smoke'])

export function bundledCorepackPath(
  nodeExecutable = process.execPath,
  platform = process.platform,
) {
  const windows = platform === 'win32'
  const paths = windows ? path.win32 : path.posix
  return paths.join(
    paths.dirname(nodeExecutable),
    windows ? 'node_modules' : '../lib/node_modules',
    'corepack/dist/corepack.js',
  )
}

export function loadToolInputs(root) {
  const before = inputs.map((file) => readManagedJson(root, file, `前端工具配置 ${file}`))
  const value = {}
  for (const input of before.filter(Boolean)) {
    if (
      !input.value ||
      typeof input.value !== 'object' ||
      Array.isArray(input.value) ||
      Object.keys(input.value).some((key) => !fields.has(key))
    ) {
      throw new Error('前端工具配置字段无效；请核对工具配置结构')
    }
    Object.assign(value, input.value)
  }
  inputs.forEach((file, index) =>
    unchangedManagedJson(root, file, before[index], `前端工具配置 ${file}`),
  )
  return { value, files: before.filter(Boolean).map((input) => input.source) }
}

export function toolObject(value, allowed, label) {
  if (
    !value ||
    typeof value !== 'object' ||
    Array.isArray(value) ||
    Object.keys(value).some((key) => !allowed.includes(key))
  ) {
    throw new Error(`${label}字段无效；请核对配置结构`)
  }
  return value
}

export function toolProcessEnvironment(environment = process.env) {
  return Object.fromEntries(
    Object.entries(environment).filter(([name]) => {
      const key = name.toUpperCase()
      return (
        key === 'APP_ENV' ||
        (!key.startsWith('RYFRAME_') && !key.startsWith('APP_') && key !== 'PLAYWRIGHT_CHANNEL')
      )
    }),
  )
}
