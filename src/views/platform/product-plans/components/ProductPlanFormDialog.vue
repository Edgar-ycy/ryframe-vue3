<template>
  <el-dialog v-model="visible" :title="plan ? t('productPlans.editPlan') : t('productPlans.createPlan')" width="min(560px, calc(100vw - 24px))" destroy-on-close @open="populate">
    <el-form ref="formRef" :model="form" :rules="rules" label-width="110px">
      <el-form-item :label="t('productPlans.code')" prop="key">
        <el-input v-model="form.key" maxlength="64" :disabled="Boolean(plan)" />
      </el-form-item>
      <el-form-item :label="t('productPlans.name')" prop="name">
        <el-input v-model="form.name" maxlength="100" />
      </el-form-item>
      <el-form-item :label="t('productPlans.description')">
        <el-input v-model="form.description" type="textarea" :rows="4" maxlength="500" show-word-limit />
      </el-form-item>
      <el-form-item v-if="plan" :label="t('productPlans.planStatus')">
        <el-select v-model="form.status">
          <el-option :label="t('productPlans.planEnabled')" value="1" />
          <el-option :label="t('productPlans.planDisabled')" value="0" />
        </el-select>
      </el-form-item>
    </el-form>
    <template #footer>
      <el-button :disabled="submitting" @click="visible = false">{{ t('productPlans.cancel') }}</el-button>
      <el-button type="primary" :loading="submitting" @click="submit">{{ t('productPlans.save') }}</el-button>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import type { ProductPlan, ProductPlanFormInput } from '@/api/modules/productPlan'

const props = defineProps<{ plan?: ProductPlan, submitting: boolean }>()
const emit = defineEmits<{ save: [data: ProductPlanFormInput] }>()
const visible = defineModel<boolean>({ required: true })
const { t } = useI18n()
const formRef = ref<FormInstance>()
const form = reactive<{
  key: string
  name: string
  description: string
  status: ProductPlanFormInput['status']
}>({ key: '', name: '', description: '', status: '1' })
const rules = computed<FormRules>(() => ({
  key: [{ required: true, message: t('productPlans.codeRequired'), trigger: 'blur' }],
  name: [{ required: true, message: t('productPlans.nameRequired'), trigger: 'blur' }],
}))

function populate(): void {
  Object.assign(form, {
    key: props.plan?.key ?? '',
    name: props.plan?.name ?? '',
    description: props.plan?.description ?? '',
    status: props.plan?.status ?? '1',
  })
  void nextTick(() => formRef.value?.clearValidate())
}

async function submit(): Promise<void> {
  if (props.submitting) return
  const valid = await formRef.value?.validate().catch(() => false)
  if (!valid) return
  emit('save', {
    key: form.key.trim(),
    name: form.name.trim(),
    description: form.description.trim() || undefined,
    status: form.status,
  })
}
</script>
