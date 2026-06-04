import { defineStore } from 'pinia'
import { getDictData } from '@/api/modules/dict'

interface DictOption {
  label: string
  value: string
}

interface DictCacheEntry {
  data: DictOption[]
  loadedAt: number
}

interface DictState {
  /** 字典缓存：typeCode → { data, loadedAt } */
  cache: Record<string, DictCacheEntry>
  /** 正在加载中的 typeCode 集合（防重复请求） */
  loadingSet: string[]
}

/** 缓存有效期：30 分钟 */
const CACHE_TTL = 30 * 60 * 1000

export const useDictStore = defineStore('dict', {
  state: (): DictState => ({
    cache: {},
    loadingSet: [],
  }),

  getters: {
    /** 根据 typeCode 获取已缓存的字典数据 */
    getOptions: (state) => (typeCode: string): DictOption[] => {
      const entry = state.cache[typeCode]
      if (!entry) return []
      // 检查是否过期
      if (Date.now() - entry.loadedAt > CACHE_TTL) return []
      return entry.data
    },

    /** 获取多个字典的数据 */
    getMultiOptions: (state) => (typeCodes: string[]): Record<string, DictOption[]> => {
      const result: Record<string, DictOption[]> = {}
      for (const code of typeCodes) {
        const entry = state.cache[code]
        if (entry && Date.now() - entry.loadedAt <= CACHE_TTL) {
          result[code] = entry.data
        } else {
          result[code] = []
        }
      }
      return result
    },
  },

  actions: {
    /** 加载并缓存字典数据（同一 typeCode 并发请求自动合并） */
    async loadDict(typeCode: string): Promise<DictOption[]> {
      // 缓存命中且未过期
      const cached = this.cache[typeCode]
      if (cached && Date.now() - cached.loadedAt <= CACHE_TTL) {
        return cached.data
      }

      // 正在加载中则等待
      if (this.loadingSet.includes(typeCode)) {
        return new Promise((resolve) => {
          const unwatch = watch(
            () => this.cache[typeCode],
            (entry) => {
              if (entry) {
                unwatch()
                resolve(entry.data)
              }
            },
          )
        })
      }

      this.loadingSet.push(typeCode)
      try {
        const res: any = await getDictData(typeCode)
        const data = res.rows || res.data || res
        const list: DictOption[] = Array.isArray(data)
          ? data.map((d: any) => ({ label: d.dictLabel ?? d.label, value: d.dictValue ?? d.value }))
          : []
        this.cache[typeCode] = { data: list, loadedAt: Date.now() }
        return list
      } finally {
        this.loadingSet = this.loadingSet.filter(c => c !== typeCode)
      }
    },

    /** 批量加载字典 */
    async loadDicts(typeCodes: string[]): Promise<void> {
      await Promise.all(typeCodes.map(c => this.loadDict(c)))
    },

    /** 清除所有缓存 */
    clearCache() {
      this.cache = {}
      this.loadingSet = []
    },

    /** 刷新指定字典 */
    async refreshDict(typeCode: string): Promise<DictOption[]> {
      delete this.cache[typeCode]
      return this.loadDict(typeCode)
    },
  },
})
