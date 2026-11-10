import { spawnSync } from 'node:child_process'
import path from 'node:path'
import { parseArgs } from 'node:util'
import { readConsumerContext } from '../consumer-context.mjs'
import { checkApplicationPath } from '../application-config-paths.mjs'
import { toolProcessEnvironment } from '../tool-inputs.mjs'

const limit = 16 * 1024 * 1024

/** 正式消费证明只接受父协调器生成的唯一上下文，不猜测工具或重新生成绑定。 */
export function receiptBinding(args = process.argv.slice(2)) {
  let values
  try {
    ;({ values } = parseArgs({
      args,
      options: { 'consumer-context': { type: 'string' } },
    }))
  } catch {
    throw new Error('原生构建证明参数无效；请传唯一 --consumer-context 文件')
  }
  if (
    args.filter(
      (value) => value === '--consumer-context' || value.startsWith('--consumer-context='),
    ).length !== 1 ||
    !values['consumer-context']
  ) {
    throw new Error('原生构建证明必须显式指定唯一 --consumer-context 文件')
  }
  const consumer = readConsumerContext(values['consumer-context'])
  const verifyUnchanged = consumer.verifyUnchanged
  const executable = consumer.originTool.executable
  const invoke = (frontend, inventories, execute = spawnSync) => {
    verifyUnchanged()
    if (
      typeof frontend !== 'string' ||
      !path.isAbsolute(frontend) ||
      frontend.split(/[\\/]/u).includes('..')
    ) {
      throw new Error('原生构建证明前端目录必须为不含 ParentDir 的绝对路径')
    }
    checkApplicationPath(frontend, { directory: true, label: '原生构建证明前端目录' })
    const input = JSON.stringify(inventories)
    if (Buffer.byteLength(input) > limit) throw new Error('原生构建证明输入超过 16 MiB')
    try {
      const result = execute(
        executable,
        ['__frontend-build-contract', '--frontend-dir', frontend],
        {
          cwd: consumer.context.backend_root,
          input,
          encoding: 'utf8',
          windowsHide: true,
          timeout: 60_000,
          maxBuffer: 4 * 1024 * 1024,
          env: {
            ...toolProcessEnvironment(),
            APP_ENV: 'INVALID-SHELL',
            VITE_APP_API_ORIGIN: 'PRIVATE-PARITY-SENTINEL',
          },
        },
      )
      if (result.error?.code === 'ETIMEDOUT') {
        throw new Error('原生构建证明等待超过 60 秒；不采信部分输出，请保留现场核对')
      }
      if (result.error?.code === 'ENOBUFS') {
        throw new Error('原生构建证明输出超过 4 MiB；不采信部分输出，请保留现场核对')
      }
      if (result.error || result.signal || result.status === null) {
        throw new Error('原生构建证明进程传输失败；不采信部分输出，请保留现场核对')
      }
      return result
    } finally {
      verifyUnchanged()
    }
  }
  return { executable, invoke, verifyUnchanged }
}
