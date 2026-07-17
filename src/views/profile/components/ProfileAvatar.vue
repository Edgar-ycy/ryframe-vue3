<template>
  <el-card shadow="never">
    <template #header>
      <span>头像</span>
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
        <el-avatar :size="80" :src="src" class="avatar-preview">
          <el-icon :size="40">
            <UserFilled />
          </el-icon>
        </el-avatar>
        <div class="avatar-mask">
          <el-icon :size="20">
            <Camera />
          </el-icon>
          <span>更换头像</span>
        </div>
      </el-upload>
    </div>
  </el-card>
</template>

<script setup lang="ts">
import { Camera, UserFilled } from '@element-plus/icons-vue'
import type { UploadRequestOptions } from 'element-plus'
import { updateAvatar } from '@/api/modules/auth'

defineProps<{
  src: string
}>()

const emit = defineEmits<{
  updated: [avatarUrl: string]
}>()

const uploading = ref(false)
const acceptedTypes = new Set(['image/png', 'image/jpeg', 'image/gif', 'image/webp'])
const maxAvatarBytes = 2 * 1024 * 1024

function beforeUpload(file: File): boolean {
  if (!acceptedTypes.has(file.type)) {
    ElMessage.error('头像仅支持 PNG / JPEG / GIF / WebP 格式')
    return false
  }
  if (file.size > maxAvatarBytes) {
    ElMessage.error('头像文件大小不能超过 2MB')
    return false
  }
  return true
}

async function upload(options: UploadRequestOptions): Promise<void> {
  uploading.value = true
  try {
    const formData = new FormData()
    formData.append('file', options.file)
    const response = await updateAvatar(formData)
    const avatarUrl = response.data?.avatar_url
    if (!avatarUrl) throw new Error('头像更新响应缺少数据')
    emit('updated', avatarUrl)
    ElMessage.success('头像更新成功')
  }
  finally {
    uploading.value = false
  }
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
