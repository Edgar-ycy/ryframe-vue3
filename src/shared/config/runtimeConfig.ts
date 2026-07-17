function requiredEnv(name: string, value: string | undefined): string {
  const normalized = value?.trim()
  if (!normalized) {
    throw new Error(`缺少必填运行时配置: ${name}`)
  }
  return normalized
}

export const runtimeConfig = Object.freeze({
  apiBaseUrl: requiredEnv('VITE_APP_BASE_API', import.meta.env.VITE_APP_BASE_API),
})
