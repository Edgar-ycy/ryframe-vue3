import { effectScope, nextTick, ref, type EffectScope } from 'vue'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useAuthenticatedImage } from './useAuthenticatedImage'

const commonApi = vi.hoisted(() => ({ downloadFile: vi.fn() }))

vi.mock('@/api/modules/common', () => commonApi)

async function flushWatch(): Promise<void> {
  await nextTick()
  await Promise.resolve()
  await Promise.resolve()
}

function mountAuthenticatedImage(source: ReturnType<typeof ref<string>>) {
  const scope = effectScope()
  let result: ReturnType<typeof useAuthenticatedImage> | undefined
  scope.run(() => {
    result = useAuthenticatedImage(source)
  })
  if (!result) throw new Error('受保护图片 Hook 初始化失败')
  return { ...result, scope }
}

describe('受保护图片加载', () => {
  let createObjectURL: ReturnType<typeof vi.spyOn>
  let revokeObjectURL: ReturnType<typeof vi.spyOn>
  const scopes: EffectScope[] = []

  beforeEach(() => {
    commonApi.downloadFile.mockReset()
    createObjectURL = vi.spyOn(URL, 'createObjectURL')
    revokeObjectURL = vi.spyOn(URL, 'revokeObjectURL')
  })

  afterEach(() => {
    scopes.splice(0).forEach(scope => scope.stop())
    vi.restoreAllMocks()
  })

  function mount(source: ReturnType<typeof ref<string>>) {
    const mounted = mountAuthenticatedImage(source)
    scopes.push(mounted.scope)
    return mounted
  }

  it('公开地址直接使用且不发起鉴权请求', async () => {
    const source = ref('  https://cdn.example.com/avatar.png  ')
    const { imageSrc, loading } = mount(source)

    await flushWatch()

    expect(imageSrc.value).toBe('https://cdn.example.com/avatar.png')
    expect(loading.value).toBe(false)
    expect(commonApi.downloadFile).not.toHaveBeenCalled()
    expect(createObjectURL).not.toHaveBeenCalled()
  })

  it('通过鉴权客户端下载对象并在替换、销毁时释放地址', async () => {
    const firstBlob = new Blob(['first'])
    const secondBlob = new Blob(['second'])
    commonApi.downloadFile
      .mockResolvedValueOnce(firstBlob)
      .mockResolvedValueOnce(secondBlob)
    createObjectURL
      .mockReturnValueOnce('blob:avatar-first')
      .mockReturnValueOnce('blob:avatar-second')
    const source = ref('/api/v1/common/file/download?path=avatars%2Ffirst.png&bucket=private')
    const { imageSrc, loading, scope } = mount(source)

    await flushWatch()
    expect(commonApi.downloadFile).toHaveBeenNthCalledWith(1, 'avatars/first.png', 'private')
    expect(createObjectURL).toHaveBeenCalledWith(firstBlob)
    expect(imageSrc.value).toBe('blob:avatar-first')
    expect(loading.value).toBe(false)

    source.value = '/common/file/download?path=avatars%2Fsecond.png'
    await flushWatch()
    expect(commonApi.downloadFile).toHaveBeenNthCalledWith(2, 'avatars/second.png', undefined)
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:avatar-first')
    expect(imageSrc.value).toBe('blob:avatar-second')

    scope.stop()
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:avatar-second')
  })

  it('忽略来自旧请求的延迟响应', async () => {
    let resolveDownload: ((blob: Blob) => void) | undefined
    commonApi.downloadFile.mockReturnValueOnce(new Promise<Blob>((resolve) => {
      resolveDownload = resolve
    }))
    const source = ref('/common/file/download?path=avatars%2Fslow.png')
    const { imageSrc, loading } = mount(source)
    expect(loading.value).toBe(true)

    source.value = 'https://cdn.example.com/current.png'
    await flushWatch()
    resolveDownload?.(new Blob(['stale']))
    await flushWatch()

    expect(imageSrc.value).toBe('https://cdn.example.com/current.png')
    expect(loading.value).toBe(false)
    expect(createObjectURL).not.toHaveBeenCalled()
  })

  it('首次鉴权加载失败时保持空地址', async () => {
    commonApi.downloadFile.mockRejectedValueOnce(new Error('unauthorized'))
    const source = ref('/common/file/download?path=avatars%2Fmissing.png')
    const { imageSrc, loading } = mount(source)

    await flushWatch()

    expect(imageSrc.value).toBe('')
    expect(loading.value).toBe(false)
    expect(createObjectURL).not.toHaveBeenCalled()
  })

  it('更新失败时保留上一个可用图片', async () => {
    commonApi.downloadFile
      .mockResolvedValueOnce(new Blob(['available']))
      .mockRejectedValueOnce(new Error('temporary failure'))
    createObjectURL.mockReturnValueOnce('blob:available-avatar')
    const source = ref('/common/file/download?path=avatars%2Favailable.png')
    const { imageSrc, loading } = mount(source)

    await flushWatch()
    source.value = '/common/file/download?path=avatars%2Freplacement.png'
    await flushWatch()

    expect(imageSrc.value).toBe('blob:available-avatar')
    expect(loading.value).toBe(false)
    expect(revokeObjectURL).not.toHaveBeenCalled()
  })
})
