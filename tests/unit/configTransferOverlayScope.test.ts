import { ref } from 'vue'
import { describe, expect, it, vi } from 'vitest'
import {
  resetConfigPackageUploadSelection,
  resetConfigTransferOverlays,
} from '@/views/platform/config-transfer/configTransferOverlayState'

describe('配置迁移浮层会话范围', () => {
  it('重置时同步清空上传文件与控件并关闭全部浮层', () => {
    const historyVisible = ref(true)
    const uploadVisible = ref(true)
    const selectedFile = ref<File | undefined>(new File(['old-scope'], 'tenant-a.zip'))
    const clearFiles = vi.fn()
    const resetNow = vi.fn(() => resetConfigPackageUploadSelection(selectedFile, clearFiles))
    const uploadDialog = ref({ resetNow })

    resetConfigTransferOverlays({ historyVisible, uploadDialog, uploadVisible })

    expect(resetNow).toHaveBeenCalledOnce()
    expect(clearFiles).toHaveBeenCalledOnce()
    expect(selectedFile.value).toBeUndefined()
    expect(uploadVisible.value).toBe(false)
    expect(historyVisible.value).toBe(false)
  })
})
