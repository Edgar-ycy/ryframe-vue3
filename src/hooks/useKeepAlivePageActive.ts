import { onActivated, onDeactivated, type Ref } from 'vue'

/**
 * 在被 KeepAlive 缓存的页面离开时停用轮询，并在重新激活时刷新一次数据。
 *
 * 页面仍自行将 pageActive 接入查询的 enabled 条件，确保查询策略保持可见。
 */
export function useKeepAlivePageActive(
  pageActive: Ref<boolean>,
  refresh: () => void | Promise<unknown>,
): void {
  onActivated(() => {
    if (pageActive.value) return
    pageActive.value = true
    void refresh()
  })

  onDeactivated(() => {
    pageActive.value = false
  })
}
