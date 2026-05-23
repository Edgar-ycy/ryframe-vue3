import request from '@/api/request'

const BASE = '/system/configs'

export interface ConfigQuery {
  [key: string]: any
  page_num?: number
  page_size?: number
  config_name?: string
  config_key?: string
  config_type?: string
}

export interface ConfigForm {
  [key: string]: any
  config_name: string
  config_key: string
  config_value: string
  config_type: string
  remark?: string
}

export function listConfig(params: ConfigQuery) { return request({ url: `${BASE}/list`, method: 'get', params }) }
export function getConfig(id: number)      { return request({ url: `${BASE}/${id}`, method: 'get' }) }
export function createConfig(data: ConfigForm) { return request({ url: BASE, method: 'post', data }) }
export function updateConfig(id: number, data: Partial<ConfigForm>) { return request({ url: `${BASE}/${id}`, method: 'put', data }) }
export function deleteConfig(id: number) { return request({ url: `${BASE}/${id}`, method: 'delete' }) }
