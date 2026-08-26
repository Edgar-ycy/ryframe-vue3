const SCRIPT_NAME_PATTERN = /^[a-z0-9:_-]+$/i

export function createPackageManagerInvocation(script, options = {}) {
  if (!SCRIPT_NAME_PATTERN.test(script)) throw new Error(`非法的包脚本名称：${script}`)

  const platform = options.platform ?? process.platform
  const execPath = options.execPath ?? process.execPath
  const npmExecPath = options.npmExecPath ?? process.env.npm_execpath

  if (npmExecPath) {
    return {
      args: [npmExecPath, 'run', script],
      command: execPath,
    }
  }

  if (platform === 'win32') {
    return {
      args: ['/d', '/s', '/c', `pnpm run ${script}`],
      command: options.comSpec ?? process.env.ComSpec ?? 'cmd.exe',
    }
  }

  return {
    args: ['run', script],
    command: 'pnpm',
  }
}
