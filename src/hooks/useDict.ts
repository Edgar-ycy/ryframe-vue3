import { ref, type Ref } from 'vue'
import { getDictData } from '@/api/modules/dict'

interface DictOption {
  label: string
  value: string
}

// 模块级缓存
const dictCache: Record<string, DictOption[]> = {}

export function useDict(typeCode: string): { options: Ref<DictOption[]>; loading: Ref<boolean> } {
  const options = ref<DictOption[]>([])
  const loading = ref(false)

  if (dictCache[typeCode]) {
    options.value = dictCache[typeCode]
  } else {
    loading.value = true
    getDictData(typeCode).then((res: any) => {
      const data = res.rows || res.data || res
      const list = Array.isArray(data) ? data : []
      options.value = list.map((d: any) => ({ label: d.label, value: d.value }))
      dictCache[typeCode] = options.value
    }).finally(() => {
      loading.value = false
    })
  }

  return { options, loading }
}
