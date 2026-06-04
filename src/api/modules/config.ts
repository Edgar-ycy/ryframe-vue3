import request from '@/api/request'

const BASE = '/system/configs'

export interface ConfigQuery {
  [key: string]: any
  page?: number
  pageSize?: number
}

export interface ConfigForm {
  [key: string]: any
  name: string
  key: string
  value: string
  remark?: string
}

export function listConfig(params: ConfigQuery) { return request({ url: `${BASE}/list`, method: 'get', params }) }
export function listConfigNoPage(params?: ConfigQuery) { return request({ url: `${BASE}/listNoPage`, method: 'get', params }) }
export function exportConfig(params?: any) { return request({ url: `${BASE}/export`, method: 'get', params, responseType: 'blob' }) }
export function getConfig(id: number)      { return request({ url: `${BASE}/${id}`, method: 'get' }) }

/** 按 Key 查询参数值 */
export function getConfigByKey(key: string) {
  return request({ url: `${BASE}/configKey/${key}`, method: 'get' })
}

export function createConfig(data: ConfigForm) { return request({ url: BASE, method: 'post', data }) }
export function updateConfig(id: number, data: Partial<ConfigForm>) { return request({ url: `${BASE}/${id}`, method: 'put', data }) }
export function deleteConfig(id: number) { return request({ url: `${BASE}/${id}`, method: 'delete' }) }

/** 刷新参数缓存 */
export function refreshConfigCache() { return request({ url: `${BASE}/refreshCache`, method: 'delete' }) }
