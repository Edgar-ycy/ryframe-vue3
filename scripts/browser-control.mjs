import fs from 'node:fs'
import path from 'node:path'
import { randomUUID } from 'node:crypto'
import { readManagedJson } from './application-config-files.mjs'
import { checkApplicationPath } from './application-config-paths.mjs'
import { loadToolInputs, toolObject } from './tool-inputs.mjs'

const relative = '.local-tests/browser-control.json'

export function readBrowserControl(root) {
  const input = readManagedJson(root, relative, '浏览器运行控制文件')
  if (!input) return undefined
  const value = toolObject(
    input.value,
    ['owner', 'real', 'attempt', 'overrides', 'tools'],
    '浏览器运行控制文件',
  )
  if (
    !Number.isSafeInteger(value.owner) ||
    value.owner < 1 ||
    typeof value.real !== 'boolean' ||
    !/^[a-f0-9-]{36}$/u.test(value.attempt)
  )
    throw new Error('浏览器运行控制文件无效')
  toolObject(value.overrides, ['fixture', 'serverMode', 'gateEndpoint'], '浏览器运行参数')
  if (JSON.stringify(value.tools) !== JSON.stringify(loadToolInputs(root).files))
    throw new Error('浏览器工具配置在运行期间漂移')
  try {
    process.kill(value.owner, 0)
  } catch {
    throw new Error('浏览器运行控制器已退出；请核查遗留控制文件')
  }
  return value
}

/** 固定运行目录单控制器；独占创建，失败或退出仅清理本次文件。 */
export function createBrowserControl(root, options) {
  const selected = loadToolInputs(root)
  checkApplicationPath(root, { directory: true, label: '前端根目录' })
  const directory = path.join(root, '.local-tests')
  fs.mkdirSync(directory, { recursive: true })
  checkApplicationPath(directory, { directory: true, label: '浏览器运行目录' })
  const attempt = randomUUID()
  const overrides = {
    ...(options.fixture ? { fixture: options.fixture } : {}),
    ...(options.server ? { serverMode: options.server } : {}),
  }
  if (
    options.real &&
    !selected.value.real_browser?.baseURL &&
    !selected.value.real_browser?.gateEndpoint
  )
    overrides.gateEndpoint =
      process.platform === 'win32'
        ? `\\\\.\\pipe\\ryframe-browser-${attempt}`
        : path.join(directory, `browser-${attempt}.sock`)
  const file = path.join(root, relative)
  const tools = selected.files
  const bytes = JSON.stringify({
    tools,
    owner: process.pid,
    real: Boolean(options.real),
    attempt,
    overrides,
  })
  try {
    fs.writeFileSync(file, bytes, { flag: 'wx', mode: 0o600 })
  } catch {
    throw new Error('无法独占创建浏览器运行控制文件；请核查已有任务与路径')
  }
  return () => {
    const current = readManagedJson(root, relative, '浏览器运行控制文件')
    if (!current || current.bytes.toString() !== bytes)
      throw new Error('浏览器运行控制文件发生变化，拒绝清理')
    fs.unlinkSync(file)
  }
}
