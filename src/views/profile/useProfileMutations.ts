import { ElMessage } from 'element-plus'
import {
  changePassword,
  updateAvatar,
  updateProfile,
  type PasswordChangeParams,
  type ProfileUpdateParams,
} from '@/api/modules/auth'
import { terminateSession } from '@/app/session/sessionCoordinator'
import { HttpError } from '@/shared/http/client'
import { getServerStateScope, isServerStateScopeCurrent } from '@/shared/query/client'
import type { ActiveServerStateScope } from '@/shared/query/scope'
import { useServerStateMutation } from '@/shared/query/useServerStateMutation'

type Translate = (key: string) => string
type MaybePromise<T> = T | Promise<T>

export const PASSWORD_SIGN_OUT_DELAY_MS = 1500

interface PasswordChangeCommand {
  password: PasswordChangeParams
  scope: ActiveServerStateScope
}

function capturePasswordChangeScope(): ActiveServerStateScope {
  const scope = getServerStateScope()
  if (!scope || scope.signal.aborted) {
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

export function useProfileDetailsMutation(
  t: Translate,
  onSaved: (profile: ProfileUpdateParams) => MaybePromise<void>,
) {
  const mutation = useServerStateMutation<void, ProfileUpdateParams>('profile', {
    mutationFn: async (profile) => {
      await updateProfile(profile)
    },
    onSuccess: async (_data, profile) => {
      ElMessage.success(t('profile.saveSuccess'))
      await onSaved(profile)
    },
  })

  async function saveProfile(profile: ProfileUpdateParams): Promise<void> {
    if (mutation.pending.value) return
    await mutation.mutateAsync(profile)
  }

  return { saveProfile, submitting: mutation.pending }
}

export function useProfilePasswordMutation(
  t: Translate,
  onPasswordChanged: () => MaybePromise<void>,
) {
  const mutation = useServerStateMutation<void, PasswordChangeCommand>('profile-password', {
    mutationFn: async (command, { signal }) => {
      await changePassword(command.password, signal)
    },
    onSuccess: async (_data, command) => {
      if (!isServerStateScopeCurrent(command.scope)) return
      ElMessage.success(t('account.passwordChangedSignInAgain'))
      await onPasswordChanged()
      if (!isServerStateScopeCurrent(command.scope)) return
      if (!(await waitForPasswordSignOut(command.scope))) return
      if (!isServerStateScopeCurrent(command.scope)) return
      await terminateSession()
    },
  })

  async function savePassword(password: PasswordChangeParams): Promise<void> {
    if (mutation.pending.value) return
    await mutation.mutateAsync({ password, scope: capturePasswordChangeScope() })
  }

  return { savePassword, submitting: mutation.pending }
}

export function useProfileAvatarMutation(
  t: Translate,
  onUpdated: (avatarUrl: string) => MaybePromise<void>,
) {
  const mutation = useServerStateMutation<string, FormData>('profile', {
    mutationFn: async (formData) => {
      const response = await updateAvatar(formData)
      const avatarUrl = response.data?.avatar_url
      if (!avatarUrl) throw new Error(t('account.avatarResponseMissing'))
      return avatarUrl
    },
    onSuccess: async (avatarUrl) => {
      await onUpdated(avatarUrl)
      ElMessage.success(t('account.avatarUpdated'))
    },
  })

  async function uploadAvatar(formData: FormData): Promise<void> {
    if (mutation.pending.value) return
    await mutation.mutateAsync(formData)
  }

  return { uploading: mutation.pending, uploadAvatar }
}
