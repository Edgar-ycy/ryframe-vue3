<template>
  <el-dialog
    v-model="visible"
    :title="t('tenantConfigTransfer.uploadTitle')"
    width="min(580px, calc(100vw - 32px))"
    :close-on-click-modal="!loading"
    :close-on-press-escape="!loading"
    @open="reset"
    @closed="reset"
  >
    <el-alert
      :title="t('tenantConfigTransfer.uploadHint')"
      type="info"
      show-icon
      :closable="false"
    />
    <el-upload
      ref="uploadRef"
      class="package-upload"
      drag
      accept=".ryframe-config.zip,application/zip"
      :auto-upload="false"
      :limit="1"
      :disabled="loading"
      :on-change="handleFileChange"
      :on-remove="handleFileRemove"
      :on-exceed="handleExceed"
    >
      <el-icon class="el-icon--upload"><UploadFilled /></el-icon>
      <div class="el-upload__text">{{ t('tenantConfigTransfer.chooseFile') }}</div>
    </el-upload>
    <template #footer>
      <el-button :disabled="loading" @click="visible = false">{{ t('common.cancel') }}</el-button>
      <el-button type="primary" :loading="loading" :disabled="!selectedFile" @click="submit">
        {{ t('tenantConfigTransfer.upload') }}
      </el-button>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { ElMessage } from 'element-plus'
import { UploadFilled } from '@element-plus/icons-vue'
import {
  genFileId,
  type UploadFile,
  type UploadInstance,
  type UploadRawFile,
  type UploadUserFile,
} from 'element-plus'
import { useI18n } from 'vue-i18n'

const props = defineProps<{ loading: boolean }>()
const emit = defineEmits<{ submit: [file: File] }>()
const visible = defineModel<boolean>({ required: true })
const { t } = useI18n()
const selectedFile = ref<File>()
const uploadRef = ref<UploadInstance>()

function validateFile(file: File): boolean {
  if (!file.name.toLocaleLowerCase().endsWith('.ryframe-config.zip')) {
    ElMessage.error(t('tenantConfigTransfer.invalidFile'))
    return false
  }
  if (file.size === 0) {
    ElMessage.error(t('tenantConfigTransfer.emptyFile'))
    return false
  }
  if (file.size > 5 * 1024 * 1024) {
    ElMessage.error(t('tenantConfigTransfer.fileTooLarge'))
    return false
  }
  return true
}

function handleFileChange(uploadFile: UploadFile): void {
  const file = uploadFile.raw
  selectedFile.value = file && validateFile(file) ? file : undefined
  if (!selectedFile.value) uploadRef.value?.clearFiles()
}

function handleFileRemove(): void {
  selectedFile.value = undefined
}

function handleExceed(files: File[], uploadFiles: UploadUserFile[]): void {
  const file = files[0] as UploadRawFile | undefined
  uploadRef.value?.clearFiles()
  if (file && validateFile(file)) {
    file.uid = genFileId()
    uploadRef.value?.handleStart(file)
    selectedFile.value = file
  } else {
    selectedFile.value = undefined
  }
  if (uploadFiles.length) ElMessage.warning(t('tenantConfigTransfer.uploadHint'))
}

function reset(): void {
  if (props.loading) return
  selectedFile.value = undefined
  uploadRef.value?.clearFiles()
}

function submit(): void {
  if (props.loading || !selectedFile.value) return
  emit('submit', selectedFile.value)
}
</script>

<style scoped>
.package-upload {
  margin-top: 16px;
}

.package-upload :deep(.el-upload),
.package-upload :deep(.el-upload-dragger) {
  width: 100%;
}
</style>
