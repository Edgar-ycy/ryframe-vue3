import request from '@/api/request'

const BASE = '/system/notices'

export interface NoticeQuery {
  [key: string]: any
  page?: number
  pageSize?: number
  title?: string
  notice_type?: string
  status?: string
}

export interface NoticeForm {
  [key: string]: any
  title: string
  notice_type: string
  content: string
  status?: string
  remark?: string
}

export function listNotice(params: NoticeQuery) { return request({ url: `${BASE}/list`, method: 'get', params }) }
export function listNoticeNoPage(params?: NoticeQuery) { return request({ url: `${BASE}/listNoPage`, method: 'get', params }) }
export function getNotice(id: number) { return request({ url: `${BASE}/${id}`, method: 'get' }) }
export function createNotice(data: NoticeForm) { return request({ url: BASE, method: 'post', data }) }
export function updateNotice(id: number, data: Partial<NoticeForm>) { return request({ url: `${BASE}/${id}`, method: 'put', data }) }
export function deleteNotice(id: number) { return request({ url: `${BASE}/${id}`, method: 'delete' }) }
