import request from '@/api/request'

const BASE = '/common'

/** 通用文件上传（后端返回数组，通常取第一个） */
export function uploadFile(data: FormData) {
  return request<Array<{
    file_id: number
    file_url: string
    file_info: {
      original_name: string
      storage_name: string
      file_path: string
      file_size: number
      content_type: string
      upload_time: string
    }
  }>>({
    url: `${BASE}/upload`,
    method: 'post',
    data,
    headers: { 'Content-Type': undefined as any },
  })
}

/** 图片上传（后端返回数组，通常取第一个） */
export function uploadImage(data: FormData) {
  return request<Array<{
    file_id: number
    file_url: string
    file_info: {
      original_name: string
      storage_name: string
      file_path: string
      file_size: number
      content_type: string
      upload_time: string
    }
  }>>({
    url: `${BASE}/upload/image`,
    method: 'post',
    data,
    headers: { 'Content-Type': undefined as any },
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
