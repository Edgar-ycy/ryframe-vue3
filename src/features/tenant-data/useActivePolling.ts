import { computed, onActivated, onBeforeUnmount, onDeactivated, ref, watch } from 'vue'

/** 只在当前视图活跃且确有进行中任务时轮询，并避免请求重叠。 */
export function useActivePolling(
  active: () => boolean,
  shouldPoll: () => boolean,
  poll: () => Promise<unknown>,
  intervalMs = 5_000,
): void {
  let timer: ReturnType<typeof setInterval> | undefined
  let requestRunning = false
  const deactivated = ref(false)

  const enabled = computed(() => !deactivated.value && active() && shouldPoll())

  function stop(): void {
    if (timer !== undefined) clearInterval(timer)
    timer = undefined
  }

  function sync(): void {
    stop()
    if (!enabled.value) return
    timer = setInterval(() => {
      if (requestRunning || !enabled.value) return
      requestRunning = true
      void poll().finally(() => { requestRunning = false })
    }, intervalMs)
  }

  watch(enabled, sync, { immediate: true })
  onDeactivated(() => {
    deactivated.value = true
    stop()
  })
  onActivated(() => {
    deactivated.value = false
    sync()
  })
  onBeforeUnmount(stop)
}
