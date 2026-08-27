<template>
  <el-dialog
    v-model="visible"
    :title="version ? t('productPlans.editVersion') : t('productPlans.createVersion')"
    width="min(840px, calc(100vw - 24px))"
    destroy-on-close
    @open="reset"
  >
    <p class="dialog-hint">{{ t('productPlans.capabilitiesHint') }}</p>
    <el-form ref="formRef" :model="form" label-width="110px">
      <el-form-item :label="t('productPlans.versionName')" :error="nameError">
        <el-input v-model="form.name" maxlength="128" @input="nameError = ''" />
      </el-form-item>
      <el-form-item :label="t('productPlans.description')">
        <el-input v-model="form.description" maxlength="500" />
      </el-form-item>
      <el-form-item :label="t('productPlans.capabilities')" :error="capabilityError">
        <ProductCapabilityEditor
          ref="capabilityEditorRef"
          v-model="form.capabilities"
          @update:model-value="capabilityError = ''"
        />
      </el-form-item>
    </el-form>
    <template #footer>
      <el-button :disabled="submitting" @click="visible = false">{{
        t('productPlans.cancel')
      }}</el-button>
      <el-button type="primary" :loading="submitting" @click="submit">{{
        t('productPlans.save')
      }}</el-button>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import type { FormInstance } from 'element-plus'
import { useI18n } from 'vue-i18n'
import type {
  ProductCapability,
  ProductPlanVersion,
  ProductPlanVersionInput,
} from '@/api/modules/productPlan'
import ProductCapabilityEditor from './ProductCapabilityEditor.vue'

const props = defineProps<{ submitting: boolean; version?: ProductPlanVersion }>()
const emit = defineEmits<{ save: [data: ProductPlanVersionInput] }>()
const visible = defineModel<boolean>({ required: true })
const { t } = useI18n()
const formRef = ref<FormInstance>()
const form = reactive<{ name: string; description: string; capabilities: ProductCapability[] }>({
  name: '',
  description: '',
  capabilities: [],
})
const capabilityEditorRef = ref<{ validate: () => boolean }>()
const capabilityError = ref('')
const nameError = ref('')

function reset(): void {
  form.capabilities = (props.version?.capabilities ?? []).map((capability) => ({
    ...capability,
    config: { ...capability.config },
  }))
  form.name = props.version?.name ?? ''
  form.description = props.version?.description ?? ''
  capabilityError.value = ''
  nameError.value = ''
  formRef.value?.clearValidate()
}

function submit(): void {
  if (props.submitting) return
  if (!capabilityEditorRef.value?.validate()) {
    capabilityError.value = t('productPlans.capabilitiesInvalid')
    return
  }
  const name = form.name.trim()
  if (!name) {
    nameError.value = t('productPlans.versionNameRequired')
    return
  }
  emit('save', {
    name,
    description: form.description.trim() || undefined,
    capabilities: form.capabilities.map((capability) => ({
      ...capability,
      config: { ...capability.config },
    })),
  })
}
</script>

<style scoped>
.dialog-hint {
  margin: 0 0 14px;
  color: var(--el-text-color-secondary);
  line-height: 1.6;
}
</style>
