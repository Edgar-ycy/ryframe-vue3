import request from '@/api/request'

const BASE = '/system/posts'

export interface PostQuery {
  [key: string]: any
  page?: number
  pageSize?: number
  code?: string
  name?: string
  status?: string
}

export interface PostForm {
  [key: string]: any
  code: string
  name: string
  sort?: number
  status?: string
  remark?: string
}

export function listPost(params: PostQuery)  { return request({ url: `${BASE}/list`, method: 'get', params }) }
export function listPostNoPage(params?: PostQuery) { return request({ url: `${BASE}/listNoPage`, method: 'get', params }) }
export function exportPost(params?: any) { return request({ url: `${BASE}/export`, method: 'get', params, responseType: 'blob' }) }
export function getPost(id: number | string)           { return request({ url: `${BASE}/${id}`, method: 'get' }) }
export function createPost(data: PostForm)    { return request({ url: BASE, method: 'post', data }) }
export function updatePost(id: number | string, data: Partial<PostForm>) { return request({ url: `${BASE}/${id}`, method: 'put', data }) }
export function deletePost(id: number | string)        { return request({ url: `${BASE}/${id}`, method: 'delete' }) }
