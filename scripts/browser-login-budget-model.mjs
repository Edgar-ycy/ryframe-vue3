import { createHash, randomUUID } from 'node:crypto'

export const marginMs = 250
export const maximumBuckets = 1024

export function loginBinding({ scope, capacity, windowMs }) {
  if (!/^[a-z0-9][a-z0-9-]{2,63}$/u.test(scope || '')) {
    throw new Error('登录预算必须绑定明确的隔离 scope')
  }
  if (!Number.isSafeInteger(capacity) || capacity < 1 || capacity > 10_000) {
    throw new Error('登录预算容量必须来自有效后端配置')
  }
  if (!Number.isSafeInteger(windowMs) || windowMs < 1 || windowMs > 86_400_000) {
    throw new Error('登录预算窗口必须来自有效后端配置')
  }
  return { scope, capacity, windowMs }
}

function digest(parts) {
  return createHash('sha256').update(JSON.stringify(parts)).digest('hex')
}

export function loginKeys({ tenantId, username }, address) {
  if (!tenantId || !username?.trim() || !/^198\.(18|19)\.\d{1,3}\.\d{1,3}$/u.test(address)) {
    throw new Error('登录预算缺少身份或固定测试客户地址')
  }
  return [
    `principal:${digest([tenantId, username.trim().toLowerCase()])}`,
    `ip:${digest([address])}`,
  ]
}

export function fixedClientAddress(scope, testId) {
  loginBinding({ scope, capacity: 1, windowMs: 1 })
  if (!testId) throw new Error('固定客户地址缺少场景标识')
  const bytes = createHash('sha256')
    .update(JSON.stringify([scope, testId]))
    .digest()
  return `198.18.${bytes[0]}.${bytes[1]}`
}

export function emptyLedger(binding, now) {
  return { version: 1, binding, observedAt: now, buckets: {} }
}

export function validateLedger(state, binding, now) {
  if (
    state?.version !== 1 ||
    JSON.stringify(state.binding) !== JSON.stringify(binding) ||
    !Number.isSafeInteger(state.observedAt) ||
    state.observedAt < 0 ||
    state.observedAt > now ||
    !state.buckets ||
    Array.isArray(state.buckets) ||
    typeof state.buckets !== 'object' ||
    Object.keys(state.buckets).length > maximumBuckets
  ) {
    throw new Error('登录预算账本损坏、时间回退或 scope/限流配置不一致')
  }
  for (const [key, bucket] of Object.entries(state.buckets)) {
    if (
      !/^(principal|ip):[a-f0-9]{64}$/u.test(key) ||
      !/^[a-f0-9-]{36}$/u.test(bucket?.generation || '') ||
      !Number.isSafeInteger(bucket.count) ||
      bucket.count < 1 ||
      bucket.count > binding.capacity ||
      !Number.isSafeInteger(bucket.reservedAt) ||
      bucket.reservedAt < 0 ||
      bucket.reservedAt > now ||
      (bucket.completedAt !== null &&
        (!Number.isSafeInteger(bucket.completedAt) ||
          bucket.completedAt < 0 ||
          bucket.completedAt > now))
    ) {
      throw new Error('登录预算账本包含损坏条目或未来时间')
    }
  }
}

function expiresAt(bucket, binding) {
  return Math.max(bucket.reservedAt, bucket.completedAt ?? 0) + binding.windowMs + marginMs
}

export function reserveLogin(state, binding, keys, now) {
  validateLedger(state, binding, now)
  for (const [key, bucket] of Object.entries(state.buckets)) {
    if (expiresAt(bucket, binding) <= now) delete state.buckets[key]
  }
  state.observedAt = now
  const blocked = keys.map((key) => state.buckets[key]).filter((b) => b?.count >= binding.capacity)
  if (blocked.length) {
    return { waitMs: Math.max(...blocked.map((bucket) => expiresAt(bucket, binding) - now)) }
  }
  if (
    Object.keys(state.buckets).length + keys.filter((key) => !state.buckets[key]).length >
    maximumBuckets
  ) {
    throw new Error('登录预算活跃条目超过上限，拒绝丢弃有效预算')
  }
  const reservation = keys.map((key) => {
    const bucket = state.buckets[key] ?? {
      generation: randomUUID(),
      count: 0,
      reservedAt: now,
      completedAt: null,
    }
    bucket.count += 1
    bucket.reservedAt = now
    state.buckets[key] = bucket
    return { key, generation: bucket.generation }
  })
  return { waitMs: 0, reservation }
}

export function completeLogin(state, binding, reservation, now) {
  validateLedger(state, binding, now)
  for (const { key, generation } of reservation) {
    const bucket = state.buckets[key]
    if (!bucket || bucket.generation !== generation) {
      throw new Error('登录响应超出已预约窗口，不能确认当前预算')
    }
    // 响应接收时间晚于服务端记账；整批按此保守上界释放，失败尝试也不退款。
    bucket.completedAt = now
  }
  state.observedAt = now
}
