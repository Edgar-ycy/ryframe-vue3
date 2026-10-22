import path from 'node:path'
import { isDeepStrictEqual } from 'node:util'
import { exactObject, hex } from './build-source-inventory.mjs'

function sourcePath(value) {
  return (
    typeof value === 'string' &&
    Boolean(value) &&
    !/[\0\r\n\\:]/u.test(value) &&
    !value.split('/').some((part) => part === '.' || part === '..' || part === '')
  )
}

function pathValue(value) {
  return (
    sourcePath(value) ||
    (typeof value === 'string' &&
      path.isAbsolute(value) &&
      value === path.normalize(value).replaceAll('\\', '/') &&
      !/[\0\r\n\\]/u.test(value))
  )
}

function descriptors(files) {
  if (!Array.isArray(files)) throw new Error('前端构建配置文件集合无效')
  for (const file of files) {
    exactObject(file, ['path', 'sha256'], '前端构建配置来源字段无效')
    if (!pathValue(file.path) || !hex(file.sha256, 64)) {
      throw new Error('前端构建配置来源路径或摘要无效')
    }
  }
  if (new Set(files.map((file) => file.path)).size !== files.length) {
    throw new Error('前端构建配置来源重复')
  }
}

export function validateBuildContext(value) {
  exactObject(
    value,
    ['command', 'mode', 'target', 'toolchain', 'configuration', 'identity'],
    '前端构建上下文字段无效',
  )
  exactObject(value.toolchain, ['node', 'pnpm', 'vite'], '前端构建工具链字段无效')
  exactObject(value.toolchain.pnpm, ['pinned', 'observed'], '前端 pnpm 工具链字段无效')
  const configuration = value.configuration
  exactObject(configuration, ['environment', 'directory', 'files', 'tools'], '前端构建配置字段无效')
  if (
    !isDeepStrictEqual(value.command, ['vite', 'build']) ||
    value.mode !== 'production' ||
    value.target !== 'vite-default' ||
    typeof value.toolchain.node !== 'string' ||
    !value.toolchain.node ||
    typeof value.toolchain.vite !== 'string' ||
    !value.toolchain.vite ||
    typeof value.toolchain.pnpm.pinned !== 'string' ||
    !value.toolchain.pnpm.pinned ||
    value.toolchain.pnpm.observed !== value.toolchain.pnpm.pinned ||
    !['dev', 'test', 'prod'].includes(configuration.environment) ||
    (configuration.directory !== '.' && !pathValue(configuration.directory))
  ) {
    throw new Error('前端构建命令、工具链或配置选择无效')
  }
  descriptors(configuration.files)
  descriptors(configuration.tools)
  const prefix =
    configuration.directory === '.' ? '' : configuration.directory.replace(/\/$/u, '') + '/'
  const selected = prefix + `app.${configuration.environment}.toml`
  const names = configuration.files.map((file) => file.path)
  if (
    !isDeepStrictEqual(names, [selected]) &&
    !isDeepStrictEqual(names, [prefix + 'app.toml', selected])
  ) {
    throw new Error('前端构建配置必须按公共、所选环境顺序绑定实际来源')
  }
  const toolNames = configuration.tools.map((file) => file.path)
  const expectedTools = ['config/tools.json', '.local-tests/frontend-tools.json'].filter((name) =>
    toolNames.includes(name),
  )
  if (!isDeepStrictEqual(toolNames, expectedTools)) {
    throw new Error('前端构建工具配置来源或优先序无效')
  }
  exactObject(value.identity, ['frontend_commit', 'source_file'], '前端构建身份字段无效')
  if (
    value.identity.frontend_commit !== 'development' &&
    !hex(value.identity.frontend_commit, 40)
  ) {
    throw new Error('前端构建身份提交无效')
  }
  if (value.identity.source_file === null) {
    if (value.identity.frontend_commit !== 'development') throw new Error('正式构建缺少身份文件')
  } else {
    descriptors([value.identity.source_file])
    if (value.identity.source_file.path !== '.local-tests/build/source.json') {
      throw new Error('前端构建身份来源不是受管文件')
    }
  }
  return value
}
