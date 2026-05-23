import axios, { type AxiosResponse, type InternalAxiosRequestConfig } from 'axios'
import { ElMessage } from 'element-plus'
import { getToken, removeToken } from '@/utils/auth'

// 后端统一响应结构
export interface ApiResponse<T = any> {
  code: number
  data: T
  message: string
  rows?: any[]
  total?: number
}

// 创建 Axios 实例
const service = axios.create({
  baseURL: import.meta.env.VITE_APP_BASE_API,  // /api/v1
  timeout: 15000,                                // 15 秒超时
  headers: { 'Content-Type': 'application/json' },
})

// ========== 请求拦截器 ==========
service.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = getToken()
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => Promise.reject(error),
)

// ========== 响应拦截器 ==========
service.interceptors.response.use(
  (response: AxiosResponse<ApiResponse>) => {
    const { data } = response

    // 文件下载（blob 类型）直接返回
    if (response.config.responseType === 'blob') {
      return response as any
    }

    // 业务成功
    if (data.code === 200) {
      return data as any
    }

    // 业务错误（400 / 409 等）
    ElMessage.error(data.message || '请求失败')
    return Promise.reject(new Error(data.message || 'Error'))
  },
  (error) => {
    // HTTP 错误（无 response 对象）
    if (!error.response) {
      ElMessage.error('网络异常，请检查连接')
      return Promise.reject(error)
    }

    const { status, data } = error.response

    switch (status) {
      case 400:
        ElMessage.error(data?.message || '请求参数错误')
        break
      case 401:
        // Token 过期 / 无效
        ElMessage.error('登录已过期，请重新登录')
        removeToken()
        // 使用 window.location 避免循环依赖
        window.location.href = '/login'
        break
      case 403:
        ElMessage.error('没有操作权限')
        break
      case 404:
        ElMessage.error('请求的资源不存在')
        break
      case 500:
        ElMessage.error('服务器内部错误')
        break
      default:
        ElMessage.error(data?.message || `请求失败 (${status})`)
    }

    return Promise.reject(error)
  },
)

export default service
