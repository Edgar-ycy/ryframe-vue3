import { VueQueryPlugin } from '@tanstack/vue-query'
import { createPinia } from 'pinia'
import { createApp, effectScope, nextTick, type EffectScope } from 'vue'
import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  configureServerStateErrorReporter,
  deactivateServerStateScope,
  queryClient,
  transitionServerStateScope,
} from '@/shared/query/client'
import { useUserStore } from '@/stores/user'

const dependencies = vi.hoisted(() => ({
  getShellSettings: vi.fn(),
  applyServerSettings: vi.fn(),
}))

vi.mock('@/api/modules/common', () => ({ getShellSettings: dependencies.getShellSettings }))
vi.mock('@/app/settings/coordinator', () => ({
  applyServerSettings: dependencies.applyServerSettings,
}))

import { useShellSettingsQuery } from '@/app/settings/shellSettingsQuery'

const scopes: EffectScope[] = []

afterEach(() => {
  for (const scope of scopes.splice(0)) scope.stop()
  deactivateServerStateScope()
  configureServerStateErrorReporter(undefined)
})

function activate(tenantId: string, subjectId: string, authorizationFingerprint: string) {
  transitionServerStateScope({ tenantId, subjectId, authorizationFingerprint }, () => {
    useUserStore().$patch({ sessionStatus: 'authenticated' })
  })
}

describe('Shell 设置完整会话隔离', () => {
  it.each([
    ['同租户切换用户', 'tenant-a', 'user-b', 'a'],
    ['同用户切换租户', 'tenant-b', 'user-a', 'a'],
    ['同用户权限变更', 'tenant-a', 'user-a', 'reduced'],
  ])('%s 后迟到的主题不覆盖新范围', async (_label, tenant, subject, authorization) => {
    let resolveOld!: (value: { data: { side_theme: string; skin_name: string } }) => void
    const oldResponse = new Promise<{ data: { side_theme: string; skin_name: string } }>(
      (resolve) => (resolveOld = resolve),
    )
    dependencies.getShellSettings.mockReturnValueOnce(oldResponse).mockResolvedValue({
      data: { side_theme: 'theme-light', skin_name: 'skin-green' },
    })
    const reporter = vi.fn()
    configureServerStateErrorReporter(reporter)
    const app = createApp({ render: () => null })
    app.use(createPinia())
    app.use(VueQueryPlugin, { queryClient })
    activate('tenant-a', 'user-a', 'a')
    const scope = effectScope()
    scopes.push(scope)
    app.runWithContext(() => scope.run(() => useShellSettingsQuery()))
    await vi.waitFor(() => expect(dependencies.getShellSettings).toHaveBeenCalledOnce())
    const requestSignal: AbortSignal = dependencies.getShellSettings.mock.calls[0]![0]

    activate(tenant, subject, authorization)
    expect(requestSignal.aborted).toBe(true)
    await vi.waitFor(() =>
      expect(dependencies.applyServerSettings).toHaveBeenCalledExactlyOnceWith({
        sideTheme: 'theme-light',
        skinName: 'skin-green',
      }),
    )
    resolveOld({ data: { side_theme: 'theme-dark', skin_name: 'skin-red' } })
    await oldResponse
    await nextTick()

    expect(dependencies.applyServerSettings).toHaveBeenCalledTimes(1)
    expect(reporter).not.toHaveBeenCalled()
  })
})
