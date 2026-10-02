import { onBeforeUnmount, ref, type Ref } from 'vue'
import { getLoginTenants } from '@/api/modules/auth'
import type { OperationData } from '@/api/contract'
import type { LoginFormModel } from './loginState'

type TenantOption = OperationData<'get_auth_tenants'>['items'][number]

/** 匿名名称搜索不进入已认证会话缓存，旧搜索只能被丢弃。 */
export function useLoginTenants(form: Ref<LoginFormModel>) {
  const options = ref<TenantOption[]>([])
  const loading = ref(false)
  const failed = ref(false)
  const hasMore = ref(false)
  let controller: AbortController | undefined
  let revision = 0
  let keyword = ''
  let page = 1

  async function load(append: boolean) {
    controller?.abort()
    controller = new AbortController()
    const current = ++revision
    loading.value = true
    failed.value = false
    try {
      const response = await getLoginTenants(
        { search: keyword, page, page_size: 20 },
        controller.signal,
      )
      if (current !== revision) return
      const result = response.data
      if (!result) throw new Error('租户选项响应缺少数据')
      options.value = append ? [...options.value, ...result.items] : result.items
      hasMore.value = result.has_more
      if (!append && !options.value.some((item) => item.tenant_id === form.value.tenant_id)) {
        form.value.tenant_id = ''
      }
    } catch {
      if (current !== revision) return
      failed.value = true
      if (append) page -= 1
      else {
        options.value = []
        form.value.tenant_id = ''
        hasMore.value = false
      }
    } finally {
      if (current === revision) loading.value = false
    }
  }

  async function search(value: string) {
    keyword = value
    page = 1
    await load(false)
  }

  async function loadMore() {
    if (loading.value || !hasMore.value) return
    page += 1
    await load(true)
  }

  onBeforeUnmount(() => {
    revision += 1
    controller?.abort()
  })
  return { options, loading, failed, hasMore, search, loadMore }
}
