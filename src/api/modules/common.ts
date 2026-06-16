import request from '@/api/request'

const BASE = '/common'

export interface UploadResult {
  file_id: number | string
  file_url: string
  file_info: {
    original_name: string
    storage_name: string
    file_path: string
    file_size: number
    content_type: string
    upload_time: string
  }
}

/** 通用文件上传（后端返回数组，通常取第一个） */
export function uploadFile(data: FormData) {
  return request<UploadResult[]>({
    url: `${BASE}/upload`,
    method: 'post',
    data,
  })
}

/** 图片上传（后端返回数组，通常取第一个） */
export function uploadImage(data: FormData) {
  return request<UploadResult[]>({
    url: `${BASE}/upload/image`,
    method: 'post',
    data,
  })
}

/** 头像上传（固定 avatar bucket） */
export function uploadAvatar(data: FormData) {
  return request<UploadResult[]>({
    url: `${BASE}/upload/avatar`,
    method: 'post',
    data,
  })
}

/** 文件下载 */
export function downloadFile(path: string, bucket?: string) {
  return request({
    url: `${BASE}/file/download`,
    method: 'get',
    params: { path, bucket },
    responseType: 'blob',
  })
}
