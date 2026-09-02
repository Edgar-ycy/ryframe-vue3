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
      args: ['/d', '/s', '/c', `corepack pnpm run ${script}`],
      command: options.comSpec ?? process.env.ComSpec ?? 'cmd.exe',
    }
  }

  return {
    args: ['pnpm', 'run', script],
    command: 'corepack',
  }
}

export function createPackageBinaryInvocation(binary, args, options = {}) {
  if (!SCRIPT_NAME_PATTERN.test(binary)) throw new Error(`非法的包二进制名称：${binary}`)
  if (!args.every((argument) => typeof argument === 'string')) {
    throw new Error('包二进制参数必须全部是字符串')
  }

  const execPath = options.execPath ?? process.execPath
  const npmExecPath = options.npmExecPath ?? process.env.npm_execpath
  if (!npmExecPath) {
    throw new Error('包二进制只能从 Corepack/pnpm 脚本上下文执行')
  }
  return {
    args: [npmExecPath, 'exec', binary, ...args],
    command: execPath,
  }
}
