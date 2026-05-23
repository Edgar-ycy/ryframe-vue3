/**
 * 通用校验规则
 */

/** 手机号 */
export function isValidPhone(val: string): boolean {
  return /^1[3-9]\d{9}$/.test(val)
}

/** 邮箱 */
export function isValidEmail(val: string): boolean {
  return /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(val)
}

/** URL */
export function isValidUrl(val: string): boolean {
  return /^https?:\/\/[^\s/$.?#].[^\s]*$/i.test(val)
}

/** 身份证号 */
export function isValidIdCard(val: string): boolean {
  return /^\d{17}[\dXx]$/.test(val)
}

/** 正整数 */
export function isPositiveInteger(val: string): boolean {
  return /^[1-9]\d*$/.test(val)
}

/** 纯数字 */
export function isNumeric(val: string): boolean {
  return /^\d+$/.test(val)
}

/** 大陆固话 */
export function isValidLandline(val: string): boolean {
  return /^\d{3,4}-\d{7,8}(-\d{3,4})?$/.test(val)
}

/** 密码强度：8-20位，至少含字母+数字 */
export function isStrongPassword(val: string): boolean {
  return /^(?=.*[a-zA-Z])(?=.*\d).{8,20}$/.test(val)
}

// ---- 可复用的 Element Plus Form Rules ----

export const phoneRule = {
  pattern: /^1[3-9]\d{9}$/,
  message: '请输入正确的手机号',
  trigger: 'blur',
}

export const emailRule = {
  type: 'email' as const,
  message: '请输入正确的邮箱地址',
  trigger: 'blur',
}

export const requiredRule = (message = '此项不能为空') => ({
  required: true,
  message,
  trigger: 'blur',
})

export const maxLengthRule = (max: number, message?: string) => ({
  max,
  message: message || `长度不能超过${max}个字符`,
  trigger: 'blur',
})
