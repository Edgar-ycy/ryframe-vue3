import { ref, type Ref } from 'vue'
import type { ApiResponse } from '@/api/types'

interface PaginationParams {
  page: number
  pageSize: number
  [key: string]: any
}

interface PageChangeParams {
  page: number
  pageSize: number
}

export function useTable<T = any>(
  fetchApi: (params: any) => Promise<ApiResponse<any>>,
  defaultParams: Record<string, any> = {},
) {
  const loading = ref(false)
  const tableData = ref<T[]>([]) as Ref<T[]>
  const total = ref(0)
  const queryParams = ref<PaginationParams>({
    page: 1,
    pageSize: 10,
    ...defaultParams,
  })

  const fetchData = async () => {
    loading.value = true
    try {
      const res = await fetchApi(queryParams.value)
      tableData.value = res.rows || []
      total.value = res.total || 0
    } finally {
      loading.value = false
    }
  }

  const handlePageChange = ({ page, pageSize }: PageChangeParams) => {
    queryParams.value.page = page
    queryParams.value.pageSize = pageSize
    fetchData()
  }

  const handleSearch = (params: Record<string, any>) => {
    Object.assign(queryParams.value, params, { page: 1 })
    fetchData()
  }

  const handleReset = () => {
    Object.assign(queryParams.value, defaultParams, { page: 1, pageSize: 10 })
    fetchData()
  }

  return {
    loading,
    tableData,
    total,
    queryParams,
    fetchData,
    handlePageChange,
    handleSearch,
    handleReset,
  }
}
