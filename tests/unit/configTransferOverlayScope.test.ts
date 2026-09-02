import { ref } from 'vue'
import { describe, expect, it, vi } from 'vitest'
import {
  resetConfigPackageUploadSelection,
  resetConfigTransferOverlays,
} from '@/views/system/config-transfer/configTransferOverlayState'

describe('配置迁移浮层会话范围', () => {
  it.each(['同租户主体切换', 'KeepAlive 页面失活'])('%s 时同步关闭浮层并清空旧文件', () => {
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

  it('旧文件被同步清除后不能再由延迟 submit 读取', () => {
    const selectedFile = ref<File | undefined>(new File(['old-scope'], 'tenant-a.zip'))
    resetConfigPackageUploadSelection(selectedFile, vi.fn())

    const submit = vi.fn()
    if (selectedFile.value) submit(selectedFile.value)

    expect(submit).not.toHaveBeenCalled()
  })
})
