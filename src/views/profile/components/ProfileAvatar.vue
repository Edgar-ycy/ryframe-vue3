<template>
  <el-card shadow="never">
    <template #header>
      <span>{{ t('account.avatar') }}</span>
    </template>
    <div v-loading="uploading" class="avatar-panel">
      <el-upload
        class="avatar-uploader"
        :show-file-list="false"
        :before-upload="beforeUpload"
        :http-request="upload"
        :disabled="uploading"
        accept="image/png,image/jpeg,image/gif,image/webp"
      >
        <el-avatar :size="80" :src="imageSrc" class="avatar-preview">
          <el-icon :size="40">
            <UserFilled />
          </el-icon>
        </el-avatar>
        <div class="avatar-mask">
          <el-icon :size="20">
            <Camera />
          </el-icon>
          <span>{{ t('account.changeAvatar') }}</span>
        </div>
      </el-upload>
    </div>
  </el-card>
</template>

<script setup lang="ts">
import { Camera, UserFilled } from '@element-plus/icons-vue'
import type { UploadRequestOptions } from 'element-plus'
import { useI18n } from 'vue-i18n'
import { useAuthenticatedImage } from '@/hooks/useAuthenticatedImage'
import { useProfileAvatarMutation } from '../useProfileMutations'

const props = defineProps<{
  src: string
}>()

const emit = defineEmits<{
  updated: [avatarUrl: string]
}>()

const { t } = useI18n()
const { imageSrc } = useAuthenticatedImage(() => props.src)
const { uploadAvatar, uploading } = useProfileAvatarMutation(t, avatarUrl => {
  emit('updated', avatarUrl)
})
const acceptedTypes = new Set(['image/png', 'image/jpeg', 'image/gif', 'image/webp'])
const maxAvatarBytes = 5 * 1024 * 1024

function beforeUpload(file: File): boolean {
  if (!acceptedTypes.has(file.type)) {
    ElMessage.error(t('account.avatarUnsupportedType'))
    return false
  }
  if (file.size > maxAvatarBytes) {
    ElMessage.error(t('account.avatarTooLarge'))
    return false
  }
  return true
}

async function upload(options: UploadRequestOptions): Promise<void> {
  if (uploading.value) return
  const formData = new FormData()
  formData.append('file', options.file)
  await uploadAvatar(formData)
}
</script>

<style scoped>
.avatar-panel {
  padding: 16px 0;
  text-align: center;
}

.avatar-uploader {
  position: relative;
  display: inline-block;
  cursor: pointer;
}

.avatar-preview {
  transition: opacity 0.3s;
}

.avatar-mask {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  gap: 4px;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  color: #fff;
  font-size: 12px;
  background: rgb(0 0 0 / 45%);
  opacity: 0;
  transition: opacity 0.3s;
}

.avatar-uploader:hover .avatar-mask {
  opacity: 1;
}
</style>
