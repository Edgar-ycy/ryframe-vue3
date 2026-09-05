import { reactive, isProxy } from 'vue'
import { describe, expect, it } from 'vitest'
import { snapshotCapabilityOverrides } from '@/views/platform/tenant/components/tenantProductChangeCommands'

describe('租户套餐提交快照', () => {
  it('接受响应式能力表单，隔离嵌套编辑并只提交输入字段', () => {
    const form = reactive([
      {
        capability_code: 'test-capability',
        enabled: false,
        variant_code: 'basic',
        schema_version: 1,
        config: { limits: { count: 0 }, options: [false, null] },
        created_at: '不应提交的服务端元数据',
      },
    ])
    const snapshot = snapshotCapabilityOverrides(form)
    form[0]!.enabled = true
    form[0]!.config.limits.count = 12
    form[0]!.config.options[0] = true
    expect(snapshot).toEqual([
      {
        capability_code: 'test-capability',
        enabled: false,
        variant_code: 'basic',
        schema_version: 1,
        config: { limits: { count: 0 }, options: [false, null] },
      },
    ])
    expect(isProxy(snapshot[0]!.config)).toBe(false)
  })

  it('空能力目录形成合法空快照', () => {
    expect(snapshotCapabilityOverrides(reactive([]))).toEqual([])
  })
})
