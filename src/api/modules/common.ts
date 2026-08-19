import { requestBlobOperation, requestMultipartOperation } from '@/api/operationRequest'
import {
  get_common_file_download,
  post_common_upload,
  post_common_upload_avatar,
  post_common_upload_image,
} from '@/api/generated/operations'
import type { ApiSchema, OperationQuery } from '@/api/contract'

export type UploadResult = ApiSchema<'UploadResponse'>

/** 通用文件上传（后端返回数组，通常取第一个） */
export function uploadFile(data: FormData) {
  return requestMultipartOperation(post_common_upload, {
    data,
    timeout: 120000,
  })
}

/** 图片上传（后端返回数组，通常取第一个） */
export function uploadImage(data: FormData) {
  return requestMultipartOperation(post_common_upload_image, {
    data,
    timeout: 120000,
  })
}

/** 头像上传（固定头像存储桶） */
export function uploadAvatar(data: FormData) {
  return requestMultipartOperation(post_common_upload_avatar, {
    data,
    timeout: 120000,
  })
}

/** 文件下载 */
export function downloadFile(
  path: OperationQuery<'get_common_file_download'>['path'],
  bucket?: OperationQuery<'get_common_file_download'>['bucket'],
) {
  return requestBlobOperation(get_common_file_download, {
    params: { path, bucket },
  })
}
