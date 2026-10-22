import fs from 'node:fs'
import { createRequire } from 'node:module'
import path from 'node:path'
import process from 'node:process'

const require = createRequire(import.meta.url)
const attributeSignature = 'uint32_t __stdcall GetFileAttributesW(str16 path)'
const errorSignature = 'uint32_t __stdcall GetLastError()'
const uint32 = (value) => Number.isInteger(value) && value >= 0 && value <= 0xffffffff

function failure(label, reason) {
  return new Error(`公开配置路径校验失败：${label}；${reason}；请检查路径、文件类型及权限`)
}

/** 同步调用后立即取得系统错误码；原生错误原文不进入配置错误。 */
export function createWindowsAttributeCheck(load = () => require('koffi').load('kernel32.dll')) {
  let api
  return (file, label) => {
    if (!api) {
      try {
        const library = load()
        api = {
          library,
          attributes: library.func(attributeSignature),
          lastError: library.func(errorSignature),
        }
      } catch {
        throw failure(label, 'Windows 属性接口加载失败；请通过 Corepack 按锁文件安装 koffi 3.3.2')
      }
    }
    let attributes
    let code
    try {
      attributes = api.attributes(file)
      if (attributes === 0xffffffff) code = api.lastError()
    } catch {
      throw failure(label, 'Windows 属性调用失败；原生调用未完成，禁止降级读取')
    }
    if (!uint32(attributes)) throw failure(label, 'Windows 属性接口返回无效 uint32 状态')
    if (attributes === 0xffffffff) {
      const reason = uint32(code) ? `Win32 error code ${code}` : 'Win32 错误码协议无效'
      throw failure(label, `GetFileAttributesW 失败：${reason}；路径或链接状态未知，禁止降级读取`)
    }
    if (attributes & 0x400) {
      throw failure(label, '禁止重解析点或链接（FILE_ATTRIBUTE_REPARSE_POINT）')
    }
  }
}

const windowsAttributes = createWindowsAttributeCheck()

function inspect(file, directory, optional, label, attributes) {
  let stat
  try {
    stat = fs.lstatSync(file)
  } catch (error) {
    if (optional && error.code === 'ENOENT') return false
    throw failure(label, `IO ${error.code ?? error.name}；请创建必需文件或修正目录及权限`)
  }
  attributes?.(file, label)
  if (stat.isSymbolicLink()) throw failure(label, '文件及祖先禁止符号链接或重解析链接')
  if (directory ? !stat.isDirectory() : !stat.isFile()) {
    throw failure(label, directory ? '祖先必须是普通目录' : '必须是普通文件')
  }
  let actual
  try {
    actual = fs.realpathSync.native(file)
  } catch (error) {
    throw failure(label, `IO ${error.code ?? error.name}；无法确认实际文件来源`)
  }
  const comparable = (value) => (process.platform === 'win32' ? value.toLowerCase() : value)
  if (comparable(actual) !== comparable(file)) {
    throw failure(label, '禁止重解析或指向其他来源的路径')
  }
  return true
}

/** 保留原始分量；只有确认前一个目录后，才允许处理后续的 ..。 */
export function checkApplicationPath(
  raw,
  {
    directory = false,
    optional = false,
    label = '公开配置文件',
    attributes = process.platform === 'win32' ? windowsAttributes : undefined,
  } = {},
) {
  if (typeof raw !== 'string' || !raw || /[\0\r\n]/u.test(raw)) {
    throw failure(label, '路径必须非空且不含 NUL、CR 或 LF')
  }
  if (process.platform === 'win32' && /^[a-z]:[^\\/]/iu.test(raw)) {
    throw failure(label, '禁止依赖隐式盘符工作目录的相对路径')
  }
  const absolute = path.isAbsolute(raw) ? raw : `${process.cwd()}${path.sep}${raw}`
  const anchor = path.parse(absolute).root
  let current = path.resolve(anchor)
  const parts = absolute
    .slice(anchor.length)
    .split(process.platform === 'win32' ? /[\\/]/u : '/')
    .filter((part) => part && part !== '.')
  inspect(current, true, false, label, attributes)
  for (let index = 0; index < parts.length; index += 1) {
    const part = parts[index]
    current =
      part === '..'
        ? path.dirname(current)
        : `${current}${current.endsWith(path.sep) ? '' : path.sep}${part}`
    const leaf = index === parts.length - 1
    if (!inspect(current, !leaf || directory, leaf && optional && !directory, label, attributes)) {
      return undefined
    }
  }
  if (!parts.length && !directory) throw failure(label, '必须是普通文件')
  return current
}

export function applicationDirectory(root, directory, environment) {
  checkApplicationPath(root, { directory: true, label: `公开配置 root ${root}` })
  const raw =
    directory === undefined
      ? `${root}${path.sep}config`
      : path.isAbsolute(directory)
        ? directory
        : `${root}${path.sep}${directory}`
  checkApplicationPath(raw, { directory: true, label: `${raw} (APP_ENV=${environment})` })
  return raw
}
