import { describe, expect, it } from 'vitest'
import {
  buildConfigCreateInput,
  buildConfigUpdateInput,
  createEmptyConfigForm,
  isShellSettingKey,
} from '@/views/system/config/formModel'

describe('系统配置表单模型', () => {
  it('分别构造新增与更新请求', () => {
    const form = {
      ...createEmptyConfigForm(),
      name: '首页主题',
      key: 'sys.index.skinName',
      value: 'blue',
      portable: true,
    }

    expect(buildConfigCreateInput(form)).toEqual({
      name: '首页主题',
      key: 'sys.index.skinName',
      value: 'blue',
      remark: undefined,
      portable: true,
    })
    expect(buildConfigUpdateInput(form)).toEqual({ value: 'blue', portable: true })
  })

  it('仅将外壳主题键识别为即时刷新配置', () => {
    expect(isShellSettingKey('sys.index.skinName')).toBe(true)
    expect(isShellSettingKey('sys.index.sideTheme')).toBe(true)
    expect(isShellSettingKey('sys.index.other')).toBe(false)
  })
})
