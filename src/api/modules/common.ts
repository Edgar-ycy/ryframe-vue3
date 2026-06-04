import request from '@/api/request'

const BASE = '/common'

/** 通用文件上传 */
export function uploadFile(data: FormData) {
  return request<{
    file_url: string
    file_info: {
      original_name: string
      storage_name: string
      file_path: string
      file_size: number
      content_type: string
      upload_time: string
    }
  }>({
    url: `${BASE}/upload`,
    method: 'post',
    data,
    headers: { 'Content-Type': 'multipart/form-data' },
  })
}

/** 图片上传 */
export function uploadImage(data: FormData) {
  return request<{
    file_url: string
    file_info: {
      original_name: string
      storage_name: string
      file_path: string
      file_size: number
      content_type: string
      upload_time: string
    }
  }>({
    url: `${BASE}/upload/image`,
    method: 'post',
    data,
    headers: { 'Content-Type': 'multipart/form-data' },
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
