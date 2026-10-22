import path from 'node:path'
import { parseArgs } from 'node:util'
import { checkApplicationPath } from '../application-config-paths.mjs'
import { readConsumerContext } from '../consumer-context.mjs'
import { capturePythonProgram } from '../consumer-context-python.mjs'
import { isDeepStrictEqual } from 'node:util'

function requiredPath(value, label, directory = false) {
  if (
    typeof value !== 'string' ||
    !path.isAbsolute(value) ||
    path.normalize(path.parse(value).root) !== path.parse(path.resolve(value)).root ||
    value.split(/[\\/]/u).includes('..')
  )
    throw new Error(`${label} 必须为不含 ParentDir 的显式绝对路径`)
  return checkApplicationPath(value, { directory, label })
}

/** 跨语言证明仅由显式 contract task 或手动完整参数启动。 */
export function receiptBinding(args = process.argv.slice(2)) {
  let values
  try {
    ;({ values } = parseArgs({
      args,
      options: {
        python: { type: 'string' },
        'backend-root': { type: 'string' },
        'consumer-context': { type: 'string' },
      },
    }))
  } catch {
    throw new Error('跨语言证明参数无效；请传 --consumer-context 或 --python/--backend-root')
  }
  if (
    args.filter(
      (value) => value === '--consumer-context' || value.startsWith('--consumer-context='),
    ).length > 1
  ) {
    throw new Error('--consumer-context 不能重复')
  }
  let python
  let backend
  let consumer
  if (Object.hasOwn(values, 'consumer-context')) {
    if (Object.keys(values).length !== 1) {
      throw new Error('--consumer-context 不能与 --python/--backend-root 混用')
    }
    consumer = readConsumerContext(values['consumer-context'])
    python = consumer.context.python_program
    backend = consumer.context.backend_root
  } else {
    python = values.python
    capturePythonProgram(python)
    backend = requiredPath(values['backend-root'], '--backend-root', true)
  }
  const validator = requiredPath(
    path.join(backend, 'tools/python/source_domain_contract.py'),
    '后端 source_domain_contract.py',
  )
  consumer?.verifyUnchanged()
  const before = capturePythonProgram(python)
  const verifyUnchanged = () => {
    consumer?.verifyUnchanged()
    if (!isDeepStrictEqual(before, capturePythonProgram(python))) {
      throw new Error('Python 入口或目标身份/摘要漂移；请稳定所选解释器后重试')
    }
  }
  return { python, validator, verifyUnchanged }
}
