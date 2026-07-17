import request, { requestBlob } from '@/shared/http/client'
import type { ApiSchema, OperationQuery } from '@/api/contract'

const BASE = '/common'

export type UploadResult = ApiSchema<'UploadResponse'>

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
export function downloadFile(
  path: OperationQuery<'get_common_file_download'>['path'],
  bucket?: OperationQuery<'get_common_file_download'>['bucket'],
) {
  return requestBlob({
    url: `${BASE}/file/download`,
    method: 'get',
    params: { path, bucket },
  })
}
