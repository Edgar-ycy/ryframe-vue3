/** 测试客户端采用滑动窗口预留预算，保守满足服务端的固定窗口限流。 */
export function createRequestBudget({ capacity, windowMs, now = Date.now, sleep }) {
  if (
    !Number.isSafeInteger(capacity) ||
    capacity < 1 ||
    !Number.isSafeInteger(windowMs) ||
    windowMs < 1
  ) {
    throw new Error('真实浏览器请求预算必须使用当前有效限流配置')
  }
  let timestamps = []
  const remaining = () => {
    const cutoff = now() - windowMs - 250
    timestamps = timestamps.filter((time) => time > cutoff)
    return capacity - timestamps.length
  }
  return {
    record() {
      remaining()
      timestamps.push(now())
    },
    async waitForAvailable(required) {
      if (!Number.isSafeInteger(required) || required < 1 || required > capacity) {
        throw new Error('阶段预留请求数必须处于当前限流容量内')
      }
      const deadline = now() + windowMs * 2 + 1000
      while (remaining() < required) {
        if (now() >= deadline) throw new Error('后台请求持续占用限流预算，阶段不能安全开始')
        const releaseIndex = timestamps.length + required - capacity - 1
        await sleep(Math.min(timestamps[releaseIndex] + windowMs + 250 - now(), 1000))
      }
    },
  }
}
