import { formatLocalizedDate } from '@/i18n'

export function messageSeverityType(severity: string): 'success' | 'warning' | 'danger' | 'info' {
  if (severity === 'success') return 'success'
  if (severity === 'warning' || severity === 'warn') return 'warning'
  if (severity === 'error' || severity === 'danger' || severity === 'critical') return 'danger'
  return 'info'
}

export function formatMessageTime(value: string): string {
  return formatLocalizedDate(value)
}
