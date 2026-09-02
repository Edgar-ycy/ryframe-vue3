<template>
  <el-dialog
    v-model="visible"
    :title="plan ? t('productPlans.editPlan') : t('productPlans.createPlan')"
    width="min(560px, calc(100vw - 24px))"
    destroy-on-close
    @open="populate"
    @closed="invalidateForm"
  >
    <el-form ref="formRef" :model="form" :rules="rules" label-width="110px">
      <el-form-item :label="t('productPlans.code')" prop="key">
        <el-input v-model="form.key" maxlength="64" :disabled="Boolean(plan)" />
      </el-form-item>
      <el-form-item :label="t('productPlans.name')" prop="name">
        <el-input v-model="form.name" maxlength="100" />
      </el-form-item>
      <el-form-item :label="t('productPlans.description')">
        <el-input
          v-model="form.description"
          type="textarea"
          :rows="4"
          maxlength="500"
          show-word-limit
        />
      </el-form-item>
      <el-form-item v-if="plan" :label="t('productPlans.planStatus')">
        <el-select v-model="form.status">
          <el-option :label="t('productPlans.planEnabled')" value="1" />
          <el-option :label="t('productPlans.planDisabled')" value="0" />
        </el-select>
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
import type { FormInstance, FormRules } from 'element-plus'
import { onBeforeUnmount, onDeactivated, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import type { ProductPlan, ProductPlanFormInput } from '@/api/modules/productPlan'
import { useServerStateScope } from '@/shared/query/client'
import { beginServerStatePageOperation } from '@/shared/query/pageOperationScope'
import type { ServerStateScope } from '@/shared/query/scope'

const props = defineProps<{ plan?: ProductPlan; submitting: boolean }>()
const emit = defineEmits<{ save: [data: ProductPlanFormInput, scope: ServerStateScope] }>()
const visible = defineModel<boolean>({ required: true })
const { t } = useI18n()
const formRef = ref<FormInstance>()
const pageGeneration = ref(0)
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
  const generation = pageGeneration.value
  const operation = beginServerStatePageOperation()
  const ownsOperation = () => visible.value && pageGeneration.value === generation
  const valid = await formRef.value?.validate().catch(() => false)
  operation.assertCurrent(ownsOperation)
  if (!valid) return
  emit(
    'save',
    {
      key: form.key.trim(),
      name: form.name.trim(),
      description: form.description.trim() || undefined,
      status: form.status,
    },
    operation.scope,
  )
}

function invalidateForm(): void {
  pageGeneration.value += 1
  visible.value = false
}

watch(useServerStateScope(), invalidateForm, { flush: 'sync' })
onDeactivated(invalidateForm)
onBeforeUnmount(invalidateForm)
</script>
