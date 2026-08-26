import type { ConfigCreateInput, ConfigUpdateInput } from '@/api/modules/config'

export type ConfigFormModel = {
  name: string
  key: string
  value: string
  remark: string
  portable: boolean
}

export function createEmptyConfigForm(): ConfigFormModel {
  return { name: '', key: '', value: '', remark: '', portable: false }
}

export function buildConfigCreateInput(form: ConfigFormModel): ConfigCreateInput {
  return {
    name: form.name,
    key: form.key,
    value: form.value,
    remark: form.remark || undefined,
    portable: form.portable,
  }
}

export function buildConfigUpdateInput(form: ConfigFormModel): ConfigUpdateInput {
  return { value: form.value, portable: form.portable }
}

export function isShellSettingKey(key: string): boolean {
  return key === 'sys.index.skinName' || key === 'sys.index.sideTheme'
}
