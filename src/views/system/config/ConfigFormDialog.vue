<template>
  <el-dialog
    v-model="dialog.visible"
    :title="dialog.title"
    width="min(500px, calc(100vw - 32px))"
    @close="resetDialog"
  >
    <el-form ref="formRef" :model="form" :rules="rules" label-width="80px">
      <el-form-item :label="t('system.config.name')" prop="name">
        <el-input v-model="form.name" :placeholder="t('system.config.enterName')" />
      </el-form-item>
      <el-form-item :label="t('system.config.key')" prop="key">
        <el-input
          v-model="form.key"
          :disabled="dialog.isEdit"
          :placeholder="t('system.config.enterKey')"
        />
      </el-form-item>
      <el-form-item :label="t('system.config.value')" prop="value">
        <el-input
          v-model="form.value"
          type="textarea"
          :rows="3"
          :placeholder="t('system.config.enterValue')"
        />
      </el-form-item>
      <el-form-item :label="t('system.config.remark')">
        <el-input
          v-model="form.remark"
          type="textarea"
          :rows="2"
          :placeholder="t('system.config.enterRemark')"
        />
      </el-form-item>
      <el-form-item :label="t('system.config.portable')">
        <div class="portable-field">
          <el-switch v-model="form.portable" :aria-label="t('system.config.portable')" />
          <span class="portable-field__hint">{{ t('system.config.portableHint') }}</span>
        </div>
      </el-form-item>
    </el-form>
    <template #footer>
      <el-button @click="dialog.visible = false">{{ t('system.common.cancel') }}</el-button>
      <el-button
        v-if="dialog.isEdit"
        v-perm="'system:config:edit'"
        type="primary"
        :loading="submitLoading"
        @click="handleSubmit"
        >{{ t('system.common.confirm') }}</el-button
      >
      <el-button
        v-else
        v-perm="'system:config:add'"
        type="primary"
        :loading="submitLoading"
        @click="handleSubmit"
        >{{ t('system.common.confirm') }}</el-button
      >
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { ElMessage } from 'element-plus'
import type { FormInstance, FormRules } from 'element-plus'
import { useI18n } from 'vue-i18n'
import {
  createConfig,
  getConfig,
  updateConfig,
  type ConfigCreateInput,
  type ConfigRecord,
  type ConfigUpdateInput,
} from '@/api/modules/config'
import { refreshShellSettings } from '@/app/settings/shellSettingsQuery'
import { type Id } from '@/shared/http/types'
import { beginServerStatePageOperation } from '@/shared/query/pageOperationScope'
import { validateServerStatePageOperation } from '@/shared/query/scopedConfirmation'
import { useServerStateMutation } from '@/shared/query/useServerStateMutation'
import { useServerStatePageLifecycle } from '@/shared/query/useServerStatePageLifecycle'
import { useServerStateQuery } from '@/shared/query/useServerStateQuery'
import { useUserStore } from '@/stores/user'
import {
  buildConfigCreateInput,
  buildConfigUpdateInput,
  createEmptyConfigForm,
  isShellSettingKey,
} from './formModel'

const props = defineProps<{ afterSaved: () => Promise<void> }>()
const { t } = useI18n()
const userStore = useUserStore()
const dialog = ref({ visible: false, title: '', isEdit: false })
const formRef = ref<FormInstance>()
const currentEditId = ref<Id | null>(null)
const editingConfig = ref<ConfigRecord | null>(null)
const form = ref(createEmptyConfigForm())
const rules = computed<FormRules>(() => ({
  name: [{ required: true, message: t('system.config.enterName'), trigger: 'blur' }],
  key: [{ required: true, message: t('system.config.enterKey'), trigger: 'blur' }],
  value: [{ required: true, message: t('system.config.enterValue'), trigger: 'blur' }],
}))
const pageLifecycle = useServerStatePageLifecycle(resetDialog)

const detailQuery = useServerStateQuery<ConfigRecord>(
  () =>
    pageLifecycle.pageActive.value &&
    userStore.sessionStatus === 'authenticated' &&
    editingConfig.value !== null,
  'configs',
  () => ({ scope: 'detail', id: editingConfig.value?.id ?? null }),
  async (signal) => {
    const target = editingConfig.value
    if (!target) throw new Error(t('system.config.detailMissing'))
    const response = await getConfig(target.id, signal)
    if (!response.data) throw new Error(t('system.config.detailMissing'))
    return response.data
  },
)

type SaveConfigCommand =
  | { kind: 'create'; data: ConfigCreateInput }
  | { kind: 'update'; id: Id; key: string; data: ConfigUpdateInput }

const saveMutation = useServerStateMutation<void, SaveConfigCommand>('configs', {
  mutationFn: async (command) => {
    if (command.kind === 'create') await createConfig(command.data)
    else await updateConfig(command.id, command.data)
  },
})
const submitLoading = saveMutation.pending

function resetForm(): void {
  Object.assign(form.value, createEmptyConfigForm())
  formRef.value?.clearValidate()
}

function resetDialog(): void {
  resetForm()
  currentEditId.value = null
  editingConfig.value = null
  dialog.value = { visible: false, title: '', isEdit: false }
}

function openAdd(): void {
  resetDialog()
  dialog.value = { visible: true, title: t('system.config.addTitle'), isEdit: false }
}

async function openEdit(config: ConfigRecord): Promise<void> {
  if (saveMutation.pending.value) return
  const operation = beginServerStatePageOperation()
  const ownsPage = pageLifecycle.captureOwnership()
  const ownsEdit = () => ownsPage() && editingConfig.value?.id === config.id
  currentEditId.value = config.id
  editingConfig.value = config
  dialog.value.title = t('system.config.editTitle')
  dialog.value.isEdit = true
  resetForm()
  await nextTick()
  operation.assertCurrent(ownsEdit)
  const result = await detailQuery.refetch({ throwOnError: true })
  operation.assertCurrent(ownsEdit)
  const detail = result.data
  if (!detail) throw new Error(t('system.config.detailMissing'))
  Object.assign(form.value, {
    name: detail.name,
    key: detail.key,
    value: detail.value,
    remark: detail.remark || '',
    portable: detail.portable,
  })
  dialog.value.visible = true
}

async function handleSubmit(): Promise<void> {
  if (saveMutation.pending.value) return
  const ownsPage = pageLifecycle.captureOwnership()
  const expectedEditId = currentEditId.value
  const expectedIsEdit = dialog.value.isEdit
  const ownsDialog = () =>
    ownsPage() &&
    dialog.value.visible &&
    dialog.value.isEdit === expectedIsEdit &&
    currentEditId.value === expectedEditId
  const operation = await validateServerStatePageOperation(
    () => formRef.value?.validate().catch(() => false) ?? Promise.resolve(false),
    ownsDialog,
  )
  if (!operation) return
  const command: SaveConfigCommand = dialog.value.isEdit
    ? {
        kind: 'update',
        id: currentEditId.value!,
        key: form.value.key,
        data: buildConfigUpdateInput(form.value),
      }
    : { kind: 'create', data: buildConfigCreateInput(form.value) }
  await saveMutation.mutateAsync(command)
  operation.assertCurrent(ownsDialog)
  if (command.kind === 'update' && isShellSettingKey(command.key)) {
    await refreshShellSettings()
    operation.assertCurrent(ownsDialog)
  }
  ElMessage.success(
    t(command.kind === 'create' ? 'system.common.addSuccess' : 'system.common.updateSuccess'),
  )
  dialog.value.visible = false
  await props.afterSaved()
}

defineExpose({ openAdd, openEdit })
</script>

<style scoped lang="scss">
.portable-field {
  display: flex;
  flex-direction: column;
  gap: 6px;
  min-width: 0;

  &__hint {
    color: var(--el-text-color-secondary);
    font-size: 12px;
    line-height: 1.5;
  }
}

@media (width <= 480px) {
  .portable-field {
    width: 100%;
  }
}
</style>
