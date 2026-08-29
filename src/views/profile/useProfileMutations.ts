import {
  changePassword,
  updateAvatar,
  updateProfile,
  type PasswordChangeParams,
  type ProfileUpdateParams,
} from '@/api/modules/auth'
import { terminateSession } from '@/app/session/sessionCoordinator'
import { HttpError } from '@/shared/http/client'
import {
  assertServerStateScopeCurrent,
  getServerStateScope,
  isServerStateScopeCurrent,
} from '@/shared/query/client'
import type { ActiveServerStateScope, ServerStateScope } from '@/shared/query/scope'
import { useServerStateMutation } from '@/shared/query/useServerStateMutation'

type Translate = (key: string) => string
type MaybePromise<T> = T | Promise<T>

export const PASSWORD_SIGN_OUT_DELAY_MS = 1500

interface PasswordChangeCommand {
  password: PasswordChangeParams
  scope: ActiveServerStateScope
}

interface ProfileUpdateCommand {
  profile: ProfileUpdateParams
  scope: ServerStateScope
}

interface AvatarUpdateCommand {
  formData: FormData
  scope: ServerStateScope
}

function capturePasswordChangeScope(expectedScope: ServerStateScope): ActiveServerStateScope {
  const scope = getServerStateScope()
  if (!scope || scope.signal.aborted || !isServerStateScopeCurrent(expectedScope)) {
    throw new HttpError('会话已切换，改密操作已取消', { status: 401, kind: 'cancelled' })
  }
  return scope
}

/** 延时与改密发起时的会话信号绑定，旧会话撤销时立即结束等待。 */
function waitForPasswordSignOut(scope: ActiveServerStateScope): Promise<boolean> {
  if (scope.signal.aborted || !isServerStateScopeCurrent(scope)) return Promise.resolve(false)
  return new Promise((resolve) => {
    let settled = false
    const finish = (current: boolean) => {
      if (settled) return
      settled = true
      clearTimeout(timer)
      scope.signal.removeEventListener('abort', handleAbort)
      resolve(current)
    }
    const handleAbort = () => finish(false)
    const timer = setTimeout(
      () => finish(isServerStateScopeCurrent(scope)),
      PASSWORD_SIGN_OUT_DELAY_MS,
    )
    scope.signal.addEventListener('abort', handleAbort, { once: true })
    if (scope.signal.aborted) handleAbort()
  })
}

export function useProfileDetailsMutation() {
  const mutation = useServerStateMutation<void, ProfileUpdateCommand>('profile', {
    mutationFn: async (command) => {
      // Mutation 观察器可能已随身份切到新 scope，变量中的旧 scope 仍须在 HTTP 前拒绝。
      assertServerStateScopeCurrent(command.scope)
      await updateProfile(command.profile)
    },
  })

  async function saveProfile(
    profile: ProfileUpdateParams,
    expectedScope: ServerStateScope,
  ): Promise<void> {
    if (mutation.pending.value) return
    await mutation.mutateAsync({ profile, scope: expectedScope })
  }

  return { saveProfile, submitting: mutation.pending }
}

export function useProfilePasswordMutation() {
  const mutation = useServerStateMutation<void, PasswordChangeCommand>('profile-password', {
    mutationFn: async (command, { signal }) => {
      assertServerStateScopeCurrent(command.scope)
      await changePassword(command.password, signal)
    },
  })

  async function savePassword(
    password: PasswordChangeParams,
    expectedScope: ServerStateScope,
    onPasswordChanged: () => MaybePromise<void>,
  ): Promise<void> {
    if (mutation.pending.value) return
    const scope = capturePasswordChangeScope(expectedScope)
    await mutation.mutateAsync({ password, scope })
    if (!isServerStateScopeCurrent(scope)) return
    await onPasswordChanged()
    if (!isServerStateScopeCurrent(scope)) return
    if (!(await waitForPasswordSignOut(scope))) return
    if (isServerStateScopeCurrent(scope)) await terminateSession()
  }

  return { savePassword, submitting: mutation.pending }
}

export function useProfileAvatarMutation(t: Translate) {
  const mutation = useServerStateMutation<string, AvatarUpdateCommand>('profile', {
    mutationFn: async (command) => {
      assertServerStateScopeCurrent(command.scope)
      const response = await updateAvatar(command.formData)
      const avatarUrl = response.data?.avatar_url
      if (!avatarUrl) throw new Error(t('account.avatarResponseMissing'))
      return avatarUrl
    },
  })

  async function uploadAvatar(
    formData: FormData,
    expectedScope: ServerStateScope,
  ): Promise<string> {
    if (mutation.pending.value) {
      throw new HttpError('头像上传正在进行', { status: 409, kind: 'http' })
    }
    return mutation.mutateAsync({ formData, scope: expectedScope })
  }

  return { uploading: mutation.pending, uploadAvatar }
}
