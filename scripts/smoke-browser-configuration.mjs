import { randomUUID } from 'node:crypto'
import { loadToolInputs, toolObject } from './tool-inputs.mjs'
import { readBrowserControl } from './browser-control.mjs'
import { browserChannel } from './real-browser-environment.mjs'

export function loadSmokeBrowserConfiguration(root = process.cwd()) {
  const input = loadToolInputs(root).value.browser_smoke ?? {}
  toolObject(input, ['serverMode', 'channel'], 'browser_smoke')
  const control = readBrowserControl(root)
  if (control?.real) throw new Error('浏览器控制文件模式不匹配')
  const serverMode = control?.overrides.serverMode ?? input.serverMode ?? 'dev'
  if (!['dev', 'preview'].includes(serverMode)) throw new Error('serverMode 必须为 dev 或 preview')
  return {
    serverMode,
    channel: browserChannel(input.channel),
    attempt: control?.attempt ?? randomUUID(),
  }
}
