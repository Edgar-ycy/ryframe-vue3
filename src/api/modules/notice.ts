import request from '@/api/request'

const BASE = '/system/notices'

export interface NoticeQuery {
  [key: string]: any
  page_num?: number
  page_size?: number
  notice_title?: string
  notice_type?: string
  status?: string
}

export interface NoticeForm {
  [key: string]: any
  notice_title: string
  notice_type: string
  notice_content: string
  status: string
  remark?: string
}

export function listNotice(params: NoticeQuery) { return request({ url: `${BASE}/list`, method: 'get', params }) }
export function getNotice(id: number) { return request({ url: `${BASE}/${id}`, method: 'get' }) }
export function createNotice(data: NoticeForm) { return request({ url: BASE, method: 'post', data }) }
export function updateNotice(id: number, data: Partial<NoticeForm>) { return request({ url: `${BASE}/${id}`, method: 'put', data }) }
export function deleteNotice(id: number) { return request({ url: `${BASE}/${id}`, method: 'delete' }) }
