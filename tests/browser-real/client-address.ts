import type { BrowserContext } from '@playwright/test'

const addresses = new WeakMap<BrowserContext, string>()

export function registerClientAddress(context: BrowserContext, address: string): void {
  addresses.set(context, address)
}

export function clientAddress(context: BrowserContext): string {
  const address = addresses.get(context)
  if (!address) throw new Error('真实登录必须使用已登记的固定测试客户地址')
  return address
}
