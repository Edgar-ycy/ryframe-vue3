import { ref } from 'vue'
import { ElMessage } from 'element-plus'
import { translate } from '@/i18n'

interface DownloadOptions {
  /** 下载后自动生成的文件名 */
  filename?: string
  /** 进度回调 */
  onProgress?: (percent: number) => void
}

/**
 * 文件下载钩子
 *
 * @example
 * const { downloading, progress, downloadBlob, downloadUrl } = useDownload()
 * await downloadBlob(() => exportApi(), { filename: '数据.xlsx' })
 */
export function useDownload() {
  const downloading = ref(false)
  const progress = ref(0)

  /** 下载二进制数据 */
  async function downloadBlob(fetchFn: () => Promise<Blob>, options: DownloadOptions = {}) {
    downloading.value = true
    progress.value = 0
    try {
      const blob = await fetchFn()
      downloadBlobDirect(blob, options.filename || translate('shell.download.defaultFilename'))
      progress.value = 100
      ElMessage.success(translate('shell.download.success'))
    } catch {
      ElMessage.error(translate('shell.download.failed'))
    } finally {
      downloading.value = false
    }
  }

  /** 通过链接下载 */
  function downloadUrl(url: string, filename = translate('shell.download.defaultFilename')) {
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    a.style.display = 'none'
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
  }

  return {
    downloading,
    progress,
    downloadBlob,
    downloadUrl,
  }
}

/** 纯函数：触发浏览器下载二进制数据 */
export function downloadBlobDirect(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.style.display = 'none'
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}
