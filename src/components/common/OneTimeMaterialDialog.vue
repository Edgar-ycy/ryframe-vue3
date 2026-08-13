<template>
  <el-dialog
    v-model="visible"
    :title="title"
    width="min(560px, calc(100vw - 24px))"
    append-to-body
    destroy-on-close
    :close-on-click-modal="false"
    :close-on-press-escape="false"
    :show-close="false"
    @open="captureMaterial"
    @close="clearNow"
    @closed="clearMaterial"
  >
    <div class="one-time-material" aria-live="polite">
      <template v-if="displayedMaterial">
        <el-alert
          :title="description || t('oneTimeMaterial.warning')"
          type="warning"
          show-icon
          :closable="false"
        />

        <label class="one-time-material__label" :for="materialInputId">
          {{ materialLabel }}
        </label>
        <div class="one-time-material__value-row">
          <el-input
            :id="materialInputId"
            :model-value="displayedMaterial"
            type="textarea"
            :autosize="{ minRows: 2, maxRows: 5 }"
            readonly
            spellcheck="false"
            autocomplete="off"
            :aria-describedby="materialHintId"
          />
          <el-button
            class="one-time-material__copy"
            :aria-label="t('oneTimeMaterial.copy')"
            @click="copyMaterial"
          >
            {{ t('oneTimeMaterial.copy') }}
          </el-button>
        </div>
        <p :id="materialHintId" class="one-time-material__hint">
          {{ t('oneTimeMaterial.memoryOnly') }}
        </p>

        <el-checkbox v-model="saved" class="one-time-material__acknowledgement">
          {{ t('oneTimeMaterial.savedConfirmation') }}
        </el-checkbox>
      </template>

      <el-alert
        v-else
        :title="t('oneTimeMaterial.replayUnavailable')"
        type="info"
        show-icon
        :closable="false"
      />
    </div>

    <template #footer>
      <el-button
        type="primary"
        :disabled="Boolean(displayedMaterial) && !saved"
        @click="closeDialog"
      >
        {{ displayedMaterial ? t('oneTimeMaterial.closeAfterSaved') : t('oneTimeMaterial.close') }}
      </el-button>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { useI18n } from 'vue-i18n'

const props = defineProps<{
  title: string
  materialLabel: string
  material: string | null
  description?: string
}>()

const emit = defineEmits<{
  cleared: []
}>()

const visible = defineModel<boolean>({ required: true })
const { t } = useI18n()
const componentId = useId()
const materialInputId = `${componentId}-material`
const materialHintId = `${componentId}-hint`
const displayedMaterial = ref<string | null>(null)
const saved = ref(false)

async function captureMaterial(): Promise<void> {
  await nextTick()
  displayedMaterial.value = props.material
  saved.value = false
}

function clearMaterial(): void {
  clearNow()
  emit('cleared')
}

function clearNow(): void {
  displayedMaterial.value = null
  saved.value = false
}

async function copyMaterial(): Promise<void> {
  const value = displayedMaterial.value
  if (!value) return
  if (!navigator.clipboard?.writeText) {
    ElMessage.warning(t('oneTimeMaterial.copyUnavailable'))
    return
  }
  try {
    await navigator.clipboard.writeText(value)
    ElMessage.success(t('oneTimeMaterial.copied'))
  }
  catch {
    ElMessage.warning(t('oneTimeMaterial.copyUnavailable'))
  }
}

function closeDialog(): void {
  if (displayedMaterial.value && !saved.value) return
  visible.value = false
}

onBeforeUnmount(clearMaterial)

defineExpose({ clearNow })
</script>

<style scoped>
.one-time-material {
  display: grid;
  gap: 16px;
}

.one-time-material__label {
  color: var(--el-text-color-primary);
  font-weight: 600;
}

.one-time-material__value-row {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 8px;
  align-items: start;
}

.one-time-material__value-row :deep(textarea) {
  font-family: var(--el-font-family-monospace, ui-monospace, SFMono-Regular, Consolas, monospace);
  overflow-wrap: anywhere;
}

.one-time-material__copy {
  min-height: 40px;
}

.one-time-material__hint {
  margin: -8px 0 0;
  color: var(--el-text-color-secondary);
  font-size: 13px;
  line-height: 1.55;
}

.one-time-material__acknowledgement {
  min-height: 36px;
  white-space: normal;
}

@media (width < 480px) {
  .one-time-material__value-row {
    grid-template-columns: minmax(0, 1fr);
  }

  .one-time-material__copy {
    width: 100%;
    min-height: 44px;
  }
}
</style>
