import { describe, expect, it, vi } from 'vitest'
import { effectScope, nextTick, ref } from 'vue'
import { useLoginTenants } from '@/views/login/useLoginTenants'
import { useLoginCaptcha } from '@/views/login/useLoginCaptcha'
import { createInitialLoginForm } from '@/views/login/loginState'
import { getCaptchaConfig, getLoginTenants } from '@/api/modules/auth'

vi.mock('vue', async (original) => ({
  ...(await original<typeof import('vue')>()),
  onBeforeUnmount: vi.fn(),
}))
vi.mock('@/api/modules/auth', () => ({
  getLoginTenants: vi.fn(),
  getCaptchaConfig: vi.fn(),
  getCaptcha: vi.fn(),
}))

function deferred<T>() {
  let resolve!: (value: T) => void
  const promise = new Promise<T>((done) => {
    resolve = done
  })
  return { promise, resolve }
}

describe('登录租户请求隔离', () => {
  it('搜索切换取消旧请求，旧名称列表不能覆盖新列表', async () => {
    const stale = deferred<Awaited<ReturnType<typeof getLoginTenants>>>()
    vi.mocked(getLoginTenants)
      .mockReturnValueOnce(stale.promise)
      .mockResolvedValueOnce({
        code: 200,
        message: '',
        request_id: '',
        data: {
          items: [{ tenant_id: 'tenant-b', name: '乙租户' }],
          has_more: false,
        },
      })
    const scope = effectScope()
    const choices = scope.run(() =>
      useLoginTenants(ref(createInitialLoginForm('tenant-a', false))),
    )!
    const first = choices.search('甲')
    const firstSignal = vi.mocked(getLoginTenants).mock.calls[0]![1]!
    await choices.search('乙')
    expect(firstSignal.aborted).toBe(true)
    stale.resolve({
      code: 200,
      message: '',
      request_id: '',
      data: {
        items: [{ tenant_id: 'tenant-a', name: '甲租户' }],
        has_more: true,
      },
    })
    await first
    expect(choices.options.value).toEqual([{ tenant_id: 'tenant-b', name: '乙租户' }])
    expect(choices.hasMore.value).toBe(false)
    scope.stop()
  })

  it('选项加载失败清空不可验证选择，并允许重试', async () => {
    vi.mocked(getLoginTenants)
      .mockRejectedValueOnce(new Error('网络故障'))
      .mockResolvedValueOnce({
        code: 200,
        message: '',
        request_id: '',
        data: {
          items: [{ tenant_id: 'system', name: '系统租户' }],
          has_more: false,
        },
      })
    const form = ref(createInitialLoginForm('system', false))
    const scope = effectScope()
    const choices = scope.run(() => useLoginTenants(form))!
    await choices.search('')
    expect(form.value.tenant_id).toBe('')
    expect(choices.failed.value).toBe(true)
    await choices.search('')
    expect(choices.failed.value).toBe(false)
    expect(choices.options.value).toHaveLength(1)
    scope.stop()
  })

  it('切换租户中止旧验证码，旧成功结果不改变新租户验证码开关', async () => {
    const stale = deferred<Awaited<ReturnType<typeof getCaptchaConfig>>>()
    vi.mocked(getCaptchaConfig)
      .mockReturnValueOnce(stale.promise)
      .mockResolvedValueOnce({
        code: 200,
        message: '',
        request_id: '',
        data: { captcha_enabled: false },
      })
    const form = ref(createInitialLoginForm('tenant-a', false))
    const scope = effectScope()
    const captcha = scope.run(() =>
      useLoginCaptcha(
        form,
        () => form.value.tenant_id,
        (key) => key,
      ),
    )!
    const first = captcha.syncCaptchaForTenant()
    const signal = vi.mocked(getCaptchaConfig).mock.calls[0]![1]!
    form.value.tenant_id = 'tenant-b'
    await nextTick()
    await nextTick()
    expect(signal.aborted).toBe(true)
    stale.resolve({ code: 200, message: '', request_id: '', data: { captcha_enabled: true } })
    await first
    expect(captcha.captchaTenantId.value).toBe('tenant-b')
    expect(captcha.captchaEnabled.value).toBe(false)
    scope.stop()
  })
})
