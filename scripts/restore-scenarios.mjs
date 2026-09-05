import path from 'node:path'
import { sha256 } from './restore-build.mjs'
import { restoreProofBindings } from './restore-proof.mjs'
import { evidenceDirectory, evidenceFile } from './restore-verification.mjs'

export const restoreSpecs = ['full-stack', 'session', 'notice', 'schedule', 'restore-existing'].map(
  (name) => `**/${name}.spec.ts`,
)

function verifyRestoreSpecs(root) {
  const checkout = evidenceDirectory(root, '前端源码目录')
  for (const pattern of restoreSpecs) {
    const name = pattern.slice(3)
    try {
      evidenceFile(path.join(checkout, 'tests', 'browser-real', name), `恢复业务场景 ${name}`)
    } catch (error) {
      throw new Error(`恢复业务场景不存在或不是普通文件：${name}`, { cause: error })
    }
  }
}

export function realTestSelection(bindings, fixture, root = process.cwd()) {
  const receipt = typeof bindings === 'string' ? bindings.trim() : ''
  if (!receipt) {
    if (typeof bindings === 'string' && bindings.length > 0)
      throw new Error('恢复绑定收据路径不能只包含空白')
    return {
      selection: { testIgnore: ['**/restore-existing.spec.ts'] },
      reporter: undefined,
    }
  }
  if (bindings !== receipt) throw new Error('恢复绑定收据路径不能包含首尾空白')
  if (fixture !== 'core') throw new Error('恢复业务证明必须使用完整 core 业务套件')
  let binding
  try {
    binding = evidenceFile(receipt, '恢复绑定收据')
    restoreProofBindings(binding.bytes)
  } catch (error) {
    const message = error instanceof Error ? error.message : '未知错误'
    throw new Error(`恢复绑定收据无效：${message}`, { cause: error })
  }
  const bindingSha256 = sha256(binding.bytes)
  verifyRestoreSpecs(path.resolve(root))
  const bindingAfter = evidenceFile(binding.path, '恢复绑定收据')
  if (sha256(bindingAfter.bytes) !== bindingSha256)
    throw new Error('恢复绑定收据在配置预检期间发生变化')
  return {
    selection: { testMatch: [...restoreSpecs] },
    reporter: { bindingPath: binding.path, bindingSha256 },
  }
}
