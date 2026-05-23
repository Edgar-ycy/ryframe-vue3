import request from '@/api/request'

const BASE = '/system/posts'

export interface PostQuery {
  [key: string]: any
  page_num?: number
  page_size?: number
  post_code?: string
  post_name?: string
  status?: string
}

export interface PostForm {
  [key: string]: any
  post_code: string
  post_name: string
  post_sort?: number
  status: string
  remark?: string
}

export function listPost(params: PostQuery)  { return request({ url: `${BASE}/list`, method: 'get', params }) }
export function getPost(id: number)           { return request({ url: `${BASE}/${id}`, method: 'get' }) }
export function createPost(data: PostForm)    { return request({ url: BASE, method: 'post', data }) }
export function updatePost(id: number, data: Partial<PostForm>) { return request({ url: `${BASE}/${id}`, method: 'put', data }) }
export function deletePost(id: number)        { return request({ url: `${BASE}/${id}`, method: 'delete' }) }
