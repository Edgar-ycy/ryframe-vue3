import { ref } from 'vue'
import { ElMessage } from 'element-plus'

interface DownloadOptions {
  /** 下载后自动生成的文件名 */
  filename?: string
  /** 进度回调 */
  onProgress?: (percent: number) => void
}

/**
 * 文件下载 Hook
 * 
 * @example
 * const { downloading, progress, downloadBlob, downloadUrl } = useDownload()
 * await downloadBlob(() => exportApi(), { filename: '数据.xlsx' })
 */
export function useDownload() {
  const downloading = ref(false)
  const progress = ref(0)

  /** 下载 Blob */
  async function downloadBlob(
    fetchFn: () => Promise<any>,
    options: DownloadOptions = {},
  ) {
    downloading.value = true
    progress.value = 0
    try {
      const res = await fetchFn()
      const blob = res instanceof Blob ? res : new Blob([res.data || res], { type: res?.type || 'application/octet-stream' })
      
      // 尝试从响应头获取文件名
      let filename = options.filename || 'download'
      const disposition = res?.headers?.['content-disposition'] || ''
      const match = disposition.match(/filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/)
      if (match) {
        filename = decodeURIComponent(match[1].replace(/['"]/g, ''))
      }

      downloadBlobDirect(blob, filename)
      progress.value = 100
      ElMessage.success('下载成功')
    } catch {
      ElMessage.error('下载失败')
    } finally {
      downloading.value = false
    }
  }

  /** 通过 URL 下载 */
  function downloadUrl(url: string, filename = 'download') {
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

/** 纯函数：将 Blob 触发浏览器下载 */
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
