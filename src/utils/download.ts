/**
 * 文件下载工具
 */

/** 触发浏览器下载 Blob */
export function downloadBlob(blob: Blob, filename: string) {
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

/** 从 URL 下载 */
export function downloadFile(url: string, filename: string) {
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.style.display = 'none'
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
}

/** 从 URL 下载文件，自动解析文件名（跨域可能失败） */
export async function downloadFromUrl(url: string, defaultFilename = 'download') {
  try {
    const res = await fetch(url)
    const blob = await res.blob()
    const disposition = res.headers.get('content-disposition') || ''
    const match = disposition.match(/filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/)
    const filename = match ? decodeURIComponent(match[1].replace(/['"]/g, '')) : defaultFilename
    downloadBlob(blob, filename)
  } catch {
    // fallback: 直接打开
    downloadFile(url, defaultFilename)
  }
}

/** 下载 Base64 内容 */
export function downloadBase64(base64: string, filename: string) {
  const byteChars = atob(base64.split(',')[1] || base64)
  const bytes = new Uint8Array(byteChars.length)
  for (let i = 0; i < byteChars.length; i++) {
    bytes[i] = byteChars.charCodeAt(i)
  }
  const mime = base64.split(',')[0]?.match(/data:([^;]+)/)?.[1] || 'application/octet-stream'
  downloadBlob(new Blob([bytes], { type: mime }), filename)
}
