import {
  onScopeDispose,
  readonly,
  ref,
  toValue,
  watch,
  type MaybeRefOrGetter,
} from 'vue'
import { downloadFile } from '@/api/modules/common'
import { parseProtectedFileUrl } from '@/shared/media/protectedFile'

/** Resolve private object locators through the authenticated HTTP client. */
export function useAuthenticatedImage(source: MaybeRefOrGetter<string | null | undefined>) {
  const imageSrc = ref('')
  const loading = ref(false)
  let activeObjectUrl: string | null = null
  let loadVersion = 0

  function releaseObjectUrl(): void {
    if (!activeObjectUrl) return
    URL.revokeObjectURL(activeObjectUrl)
    activeObjectUrl = null
  }

  watch(
    () => toValue(source)?.trim() ?? '',
    async (value) => {
      const version = ++loadVersion
      const location = parseProtectedFileUrl(value)

      if (!location) {
        releaseObjectUrl()
        imageSrc.value = value
        loading.value = false
        return
      }

      loading.value = true
      try {
        const blob = await downloadFile(location.path, location.bucket)
        if (version !== loadVersion) return

        const nextObjectUrl = URL.createObjectURL(blob)
        releaseObjectUrl()
        activeObjectUrl = nextObjectUrl
        imageSrc.value = nextObjectUrl
      }
      catch {
        if (version === loadVersion && !activeObjectUrl) imageSrc.value = ''
      }
      finally {
        if (version === loadVersion) loading.value = false
      }
    },
    { immediate: true },
  )

  onScopeDispose(() => {
    loadVersion += 1
    releaseObjectUrl()
  })

  return {
    imageSrc: readonly(imageSrc),
    loading: readonly(loading),
  }
}
