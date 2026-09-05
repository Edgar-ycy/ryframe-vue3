const validId = (value) =>
  typeof value === 'string' &&
  /^[1-9][0-9]{0,18}$/u.test(value) &&
  BigInt(value) <= 9223372036854775807n

/** 只接受本次真实创建响应中的 ID；未知提交不查名称、不接管、不重放。 */
export async function createSessionResources({ scopeId, testId, tenantId, save }) {
  if (!/^[a-z0-9][a-z0-9-]{2,63}$/u.test(scopeId || '') || !testId || !tenantId) {
    throw new Error('会话身份收据必须绑定明确 scope、测试和租户')
  }
  const receipt = {
    format_version: 1,
    scope_id: scopeId,
    test_id: testId,
    tenant_id: tenantId,
    status: 'active',
    resources: [],
  }
  const pending = new Set()
  let closing = false
  const persist = () => save(structuredClone(receipt))
  await persist()
  return {
    snapshot: () => structuredClone(receipt),
    create(kind, name, run) {
      if (
        closing ||
        !['user', 'role'].includes(kind) ||
        !name ||
        receipt.resources.some((item) => item.kind === kind && item.name === name)
      ) {
        throw new Error('身份创建阶段或资源登记重复')
      }
      const entry = { kind, name, phase: 'creating' }
      receipt.resources.push(entry)
      const operation = (async () => {
        try {
          await persist()
          const result = await run()
          entry.http_status = result.status
          if (result.status >= 400 && result.status < 500) {
            entry.phase = 'create-rejected'
            throw new Error(`身份创建请求被拒绝：HTTP ${result.status}`)
          }
          if (
            !Number.isInteger(result.status) ||
            result.status < 200 ||
            result.status >= 300 ||
            !validId(result.id) ||
            receipt.resources.some(
              (item) => item !== entry && item.kind === kind && item.id === result.id,
            )
          ) {
            throw new Error('身份创建结果缺少可核验的成功响应和唯一 ID')
          }
          entry.id = result.id
          entry.phase = 'created'
          await persist()
          return result
        } catch (error) {
          if (entry.phase === 'creating') entry.phase = 'needs-reconciliation'
          await persist()
          throw error
        }
      })()
      pending.add(operation)
      void operation.then(
        () => pending.delete(operation),
        () => pending.delete(operation),
      )
      return operation
    },
    async cleanup(remove) {
      if (closing) throw new Error('身份清理不能重复执行')
      closing = true
      await Promise.allSettled([...pending])
      const failures = []
      for (const kind of ['user', 'role']) {
        const blocked =
          kind === 'role' &&
          receipt.resources.some(
            (item) => item.kind === 'user' && !['deleted', 'create-rejected'].includes(item.phase),
          )
        for (const entry of receipt.resources.filter(
          (item) => item.kind === kind && item.phase === 'created',
        )) {
          if (blocked) {
            entry.phase = 'cleanup-blocked'
            continue
          }
          entry.phase = 'deleting'
          try {
            await persist()
            const result = await remove({ kind: entry.kind, name: entry.name, id: entry.id })
            entry.delete_status = result.status
            if (!Number.isInteger(result.status) || result.status < 200 || result.status >= 300)
              throw new Error(`身份清理失败：HTTP ${result.status}`)
            entry.phase = 'deleted'
          } catch (error) {
            entry.phase = 'cleanup-failed'
            failures.push(error)
          }
          await persist()
        }
      }
      const unknown = receipt.resources.some((item) => item.phase === 'needs-reconciliation')
      receipt.status = unknown
        ? 'needs-reconciliation'
        : failures.length
          ? 'cleanup-failed'
          : 'cleaned'
      await persist()
      if (unknown)
        failures.push(new Error('存在未知身份提交，需要依据本次收据人工核对；禁止按名称清理'))
      if (failures.length) throw new AggregateError(failures, '本测试身份资源未完整清理')
    },
  }
}
