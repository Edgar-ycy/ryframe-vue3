import { ElMessage } from 'element-plus'
import {
  changePassword,
  updateAvatar,
  updateProfile,
  type PasswordChangeParams,
  type ProfileUpdateParams,
} from '@/api/modules/auth'
import { terminateSession } from '@/app/session/sessionCoordinator'
import { useServerStateMutation } from '@/shared/query/useServerStateMutation'

type Translate = (key: string) => string
type MaybePromise<T> = T | Promise<T>

export const PASSWORD_SIGN_OUT_DELAY_MS = 1500

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
  const mutation = useServerStateMutation<void, PasswordChangeParams>('profile-password', {
    mutationFn: async (password) => {
      await changePassword(password)
    },
    onSuccess: async () => {
      ElMessage.success(t('account.passwordChangedSignInAgain'))
      await onPasswordChanged()
      await new Promise((resolve) => setTimeout(resolve, PASSWORD_SIGN_OUT_DELAY_MS))
      await terminateSession()
    },
  })

  async function savePassword(password: PasswordChangeParams): Promise<void> {
    if (mutation.pending.value) return
    await mutation.mutateAsync(password)
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
