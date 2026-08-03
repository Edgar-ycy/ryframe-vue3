import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { downloadBlobDirect, useDownload } from './useDownload'

const message = vi.hoisted(() => ({
  error: vi.fn(),
  success: vi.fn(),
}))

vi.mock('element-plus', () => ({ ElMessage: message }))
vi.mock('@/i18n', () => ({
  translate: (key: string) => ({
    'shell.download.defaultFilename': '下载文件',
    'shell.download.failed': '下载失败',
    'shell.download.success': '下载成功',
  })[key] ?? key,
}))

describe('文件下载', () => {
  const appendChild = vi.fn()
  const removeChild = vi.fn()
  const click = vi.fn()
  const createElement = vi.fn()
  const createObjectURL = vi.fn()
  const revokeObjectURL = vi.fn()

  beforeEach(() => {
    const anchor = {
      click,
      download: '',
      href: '',
      style: { display: '' },
    }
    appendChild.mockReset()
    removeChild.mockReset()
    click.mockReset()
    createElement.mockReset()
    createElement.mockReturnValue(anchor)
    createObjectURL.mockReset()
    createObjectURL.mockReturnValue('blob:download-object')
    revokeObjectURL.mockReset()
    message.error.mockReset()
    message.success.mockReset()

    vi.stubGlobal('document', {
      body: { appendChild, removeChild },
      createElement,
    })
    vi.stubGlobal('URL', { createObjectURL, revokeObjectURL })
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('下载二进制数据并在成功后释放临时地址', async () => {
    let resolveBlob: ((blob: Blob) => void) | undefined
    const blob = new Blob(['report'])
    const { downloading, progress, downloadBlob } = useDownload()

    const task = downloadBlob(
      () => new Promise<Blob>((resolve) => { resolveBlob = resolve }),
      { filename: '报表.xlsx' },
    )
    expect(downloading.value).toBe(true)
    expect(progress.value).toBe(0)

    resolveBlob?.(blob)
    await task

    const anchor = createElement.mock.results[0]?.value
    expect(createObjectURL).toHaveBeenCalledWith(blob)
    expect(anchor).toMatchObject({
      href: 'blob:download-object',
      download: '报表.xlsx',
      style: { display: 'none' },
    })
    expect(appendChild).toHaveBeenCalledWith(anchor)
    expect(click).toHaveBeenCalledOnce()
    expect(removeChild).toHaveBeenCalledWith(anchor)
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:download-object')
    expect(progress.value).toBe(100)
    expect(downloading.value).toBe(false)
    expect(message.success).toHaveBeenCalledWith('下载成功')
  })

  it('下载失败时恢复状态且不创建空文件', async () => {
    const { downloading, progress, downloadBlob } = useDownload()

    await downloadBlob(async () => {
      throw new Error('network unavailable')
    })

    expect(downloading.value).toBe(false)
    expect(progress.value).toBe(0)
    expect(createElement).not.toHaveBeenCalled()
    expect(message.error).toHaveBeenCalledWith('下载失败')
    expect(message.success).not.toHaveBeenCalled()
  })

  it('支持默认文件名和显式文件名的链接下载', () => {
    const { downloadUrl } = useDownload()

    downloadUrl('/files/latest')
    expect(createElement.mock.results[0]?.value).toMatchObject({
      href: '/files/latest',
      download: '下载文件',
    })

    downloadUrl('/files/audit', '审计.csv')
    expect(createElement.mock.results[1]?.value).toMatchObject({
      href: '/files/audit',
      download: '审计.csv',
    })
    expect(click).toHaveBeenCalledTimes(2)
  })

  it('可直接下载已获取的 Blob', () => {
    const blob = new Blob(['direct'])

    downloadBlobDirect(blob, '直接下载.txt')

    expect(createObjectURL).toHaveBeenCalledWith(blob)
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:download-object')
    expect(createElement.mock.results[0]?.value.download).toBe('直接下载.txt')
  })
})
