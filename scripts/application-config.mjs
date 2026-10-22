import { createHash } from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'
import process from 'node:process'
import { normalizeApiOrigin } from '../src/shared/config/apiEndpoint.ts'
import { parseApplicationToml } from './application-config-toml.mjs'
import { applicationDirectory, checkApplicationPath } from './application-config-paths.mjs'

const environments = ['dev', 'test', 'prod']
const own = (value, key) => Object.hasOwn(value, key)
const digest = (bytes) => createHash('sha256').update(bytes).digest('hex')
const normalizedPath = (value) => value.replaceAll('\\', '/')

function failure(stage, file, reason) {
  return new Error(`公开配置${stage}失败：${file}；${reason}；请修正所选公开 TOML 配置`)
}

function ioFailure(file, error) {
  const repair =
    error.code === 'ENOENT' ? '请创建所选环境文件或修正配置目录' : '请检查文件及访问权限'
  return failure('读取', file, `IO ${error.code ?? error.name ?? 'UNKNOWN'}，${repair}`)
}

function sourceName(root, file) {
  const relative = path.relative(root, file)
  return normalizedPath(
    relative &&
      relative !== '..' &&
      !relative.startsWith('..' + path.sep) &&
      !path.isAbsolute(relative)
      ? relative
      : file,
  )
}

function readInputs(root, directory, environment) {
  return ['app.toml', `app.${environment}.toml`].flatMap((name, index) => {
    const raw = `${directory}${path.sep}${name}`
    const label = `${normalizedPath(raw)} (APP_ENV=${environment})`
    const file = checkApplicationPath(raw, { optional: index === 0, label })
    if (file === undefined) return []
    let bytes
    try {
      bytes = fs.readFileSync(file)
    } catch (error) {
      throw ioFailure(label, error)
    }
    return [{ path: sourceName(root, file), bytes, label }]
  })
}

function parseDocument(input) {
  let source
  try {
    source = new TextDecoder('utf-8', { fatal: true, ignoreBOM: true }).decode(input.bytes)
  } catch {
    throw failure('解码', input.label, '文件必须为合法 UTF-8')
  }
  return parseApplicationToml(source, input.label)
}

function object(value, keys, label, field) {
  if (
    !value ||
    typeof value !== 'object' ||
    Array.isArray(value) ||
    ![null, Object.prototype].includes(Object.getPrototypeOf(value))
  ) {
    throw failure('字段校验', label, `${field} 必须为 table 对象，禁止数组及日期时间`)
  }
  if (Object.keys(value).some((key) => !keys.includes(key))) {
    throw failure('字段校验', label, `${field} 包含未知字段；禁止凭据及测试、恢复、契约工具配置`)
  }
}

function origin(value, label, field, emptyAllowed) {
  if (typeof value !== 'string' || (!emptyAllowed && !value.trim())) {
    throw failure('字段校验', label, `${field} 必须为${emptyAllowed ? '' : '非空'}字符串 origin`)
  }
  if (emptyAllowed && !value.trim()) return ''
  try {
    return normalizeApiOrigin(value, '')
  } catch {
    throw failure('字段校验', label, `${field} 必须为 HTTP(S) origin，禁止凭据、路径、查询及片段`)
  }
}

function validate(document, label, complete = false) {
  object(document, ['api_origin', 'server'], label, 'root')
  if (own(document, 'api_origin')) origin(document.api_origin, label, 'api_origin', true)
  if (own(document, 'server')) {
    const server = document.server
    object(server, ['host', 'port', 'proxy_target'], label, 'server')
    if (
      own(server, 'host') &&
      (typeof server.host !== 'string' || !server.host.trim() || /\p{Cc}/u.test(server.host))
    ) {
      throw failure('字段校验', label, 'server.host 必须非空且不含控制字符')
    }
    if (
      own(server, 'port') &&
      (!Number.isInteger(server.port) || server.port < 1 || server.port > 65535)
    ) {
      throw failure('字段校验', label, 'server.port 必须为 1 到 65535 的整数')
    }
    if (own(server, 'proxy_target')) {
      origin(server.proxy_target, label, 'server.proxy_target', false)
    }
  }
  if (
    complete &&
    (!own(document, 'api_origin') ||
      !own(document, 'server') ||
      ['host', 'port', 'proxy_target'].some((key) => !own(document.server, key)))
  ) {
    throw failure('字段校验', label, '缺少 api_origin 或 server.host/port/proxy_target 必需字段')
  }
}

export function loadApplicationConfig(
  root,
  { environment = process.env.APP_ENV ?? 'dev', directory } = {},
) {
  if (
    typeof root !== 'string' ||
    !root ||
    /[\0\r\n]/u.test(root) ||
    (directory !== undefined &&
      (typeof directory !== 'string' || !directory || /[\0\r\n]/u.test(directory)))
  ) {
    throw new Error('公开配置目录必须为非空路径且不含 NUL、CR 或 LF')
  }
  if (!environments.includes(environment)) {
    throw new Error('公开配置 APP_ENV 仅允许精确 dev/test/prod；请修正环境选择')
  }
  const selectedDirectory = applicationDirectory(root, directory, environment)
  const absoluteRoot = path.resolve(root)
  const before = readInputs(absoluteRoot, selectedDirectory, environment)
  let merged = {}
  for (const input of before) {
    const document = parseDocument(input)
    validate(document, input.label)
    merged = { ...merged, ...document, server: { ...merged.server, ...document.server } }
  }
  const label = `${sourceName(absoluteRoot, selectedDirectory)} (APP_ENV=${environment})`
  validate(merged, label, true)
  const after = readInputs(absoluteRoot, selectedDirectory, environment)
  if (
    before.length !== after.length ||
    before.some(
      (input, index) => input.path !== after[index].path || !input.bytes.equals(after[index].bytes),
    )
  ) {
    throw failure('来源核对', label, '读取期间配置字节或所选文件集合发生漂移；请稳定文件后重试')
  }
  return {
    environment,
    publicConfig: { apiOrigin: origin(merged.api_origin, label, 'api_origin', true) },
    server: {
      host: merged.server.host,
      port: merged.server.port,
      proxyTarget: origin(merged.server.proxy_target, label, 'server.proxy_target', false),
    },
    files: before.map((input) => ({ path: input.path, sha256: digest(input.bytes) })),
  }
}
