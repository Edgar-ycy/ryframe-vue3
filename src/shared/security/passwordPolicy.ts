import policy from './passwordPolicy.generated.json'

export const PASSWORD_POLICY = Object.freeze(policy)

export function newPasswordValidationMessage(password: string): string | null {
  if (password.length < PASSWORD_POLICY.min_length) {
    return `密码长度不能少于 ${PASSWORD_POLICY.min_length} 个字符`
  }
  if (password.length > PASSWORD_POLICY.max_length) {
    return `密码长度不能超过 ${PASSWORD_POLICY.max_length} 个字符`
  }
  if (!/^[!-~]+$/.test(password)) {
    return '密码只能包含可见 ASCII 字符且不能包含空格'
  }

  for (const requiredClass of PASSWORD_POLICY.required_classes) {
    if (requiredClass === 'uppercase' && !/[A-Z]/.test(password)) {
      return '密码必须包含至少一个大写字母'
    }
    if (requiredClass === 'lowercase' && !/[a-z]/.test(password)) {
      return '密码必须包含至少一个小写字母'
    }
    if (requiredClass === 'digit' && !/[0-9]/.test(password)) {
      return '密码必须包含至少一个数字'
    }
    if (requiredClass === 'special' && !/[^A-Za-z0-9]/.test(password)) {
      return '密码必须包含至少一个特殊字符'
    }
  }

  return null
}
