import type { Ref } from 'vue'

export interface ConfigPackageUploadDialogController {
  resetNow: () => void
}

interface ConfigTransferOverlayState {
  historyVisible: Ref<boolean>
  uploadDialog: Ref<ConfigPackageUploadDialogController | undefined>
  uploadVisible: Ref<boolean>
}

/** 身份或 KeepAlive 页面失效时同步清空所有可跨页面保留的浮层状态。 */
export function resetConfigTransferOverlays(state: ConfigTransferOverlayState): void {
  state.uploadDialog.value?.resetNow()
  state.uploadVisible.value = false
  state.historyVisible.value = false
}

/** 上传文件必须先于浮层关闭同步清空，避免旧文件被新会话继续提交。 */
export function resetConfigPackageUploadSelection(
  selectedFile: Ref<File | undefined>,
  clearFiles: () => void,
): void {
  selectedFile.value = undefined
  clearFiles()
}
