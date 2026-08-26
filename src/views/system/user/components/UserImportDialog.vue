<template>
  <el-dialog
    v-model="visible"
    :title="t('system.userImport.dialogTitle')"
    width="min(560px, calc(100vw - 32px))"
    :close-on-click-modal="!loading"
    :close-on-press-escape="!loading"
    @open="reset"
    @closed="reset"
  >
    <el-alert :title="t('system.userImport.fileHint')" type="info" show-icon :closable="false" />
    <el-upload
      ref="uploadRef"
      class="import-upload"
      drag
      accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
      :auto-upload="false"
      :limit="1"
      :disabled="loading"
      :on-change="handleFileChange"
      :on-remove="handleFileRemove"
      :on-exceed="handleExceed"
    >
      <el-icon class="el-icon--upload"><UploadFilled /></el-icon>
      <div class="el-upload__text">{{ t('system.userImport.chooseFile') }}</div>
    </el-upload>
    <el-alert
      class="import-hint"
      :title="t('system.userImport.departmentHint')"
      type="info"
      show-icon
      :closable="false"
    />
    <el-alert
      class="import-hint"
      :title="t('system.userImport.duplicateHint')"
      type="warning"
      show-icon
      :closable="false"
    />
    <el-alert
      class="import-hint"
      :title="t('system.userImport.activationHint')"
      type="info"
      show-icon
      :closable="false"
    />
    <template #footer>
      <el-button :disabled="loading" @click="visible = false">{{ t('common.cancel') }}</el-button>
      <el-button type="primary" :loading="loading" :disabled="!selectedFile" @click="submit">
        {{ t('system.userImport.create') }}
      </el-button>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { UploadFilled } from '@element-plus/icons-vue'
import {
  genFileId,
  type UploadFile,
  type UploadFiles,
  type UploadInstance,
  type UploadRawFile,
} from 'element-plus'
import { useI18n } from 'vue-i18n'

const props = defineProps<{ loading: boolean }>()
const emit = defineEmits<{ submit: [file: File] }>()
const visible = defineModel<boolean>({ required: true })
const { t } = useI18n()
const selectedFile = ref<File>()
const uploadRef = ref<UploadInstance>()

function isValidFile(file: File): boolean {
  if (!file.name.toLowerCase().endsWith('.xlsx')) {
    ElMessage.error(t('system.userImport.invalidFile'))
    return false
  }
  if (file.size > 10 * 1024 * 1024) {
    ElMessage.error(t('system.userImport.fileTooLarge'))
    return false
  }
  return file.size > 0
}

function handleFileChange(uploadFile: UploadFile): void {
  const file = uploadFile.raw
  selectedFile.value = file && isValidFile(file) ? file : undefined
  if (!selectedFile.value) uploadRef.value?.clearFiles()
}

function handleFileRemove(): void {
  selectedFile.value = undefined
}

function handleExceed(files: File[], uploadFiles: UploadFiles): void {
  const file = files[0] as UploadRawFile | undefined
  if (file && isValidFile(file)) {
    uploadRef.value?.clearFiles()
    file.uid = genFileId()
    uploadRef.value?.handleStart(file)
    selectedFile.value = file
  } else {
    selectedFile.value = undefined
  }
  if (uploadFiles.length) ElMessage.warning(t('system.userImport.fileHint'))
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
.import-upload {
  margin-top: 16px;
}

.import-upload :deep(.el-upload),
.import-upload :deep(.el-upload-dragger) {
  width: 100%;
}

.import-hint {
  margin-top: 12px;
}
</style>
