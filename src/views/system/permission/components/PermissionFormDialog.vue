<template>
  <el-dialog
    v-model="visible"
    :title="isEdit() ? t('system.permission.editTitle') : t('system.permission.addTitle')"
    width="520px"
    @open="populateForm"
    @closed="resetForm"
  >
    <el-form ref="formRef" :model="form" :rules="rules" label-width="90px">
      <el-form-item :label="t('system.permission.parent')">
        <el-tree-select
          v-model="form.parent_id"
          :data="parentTree"
          :props="{ label: 'name', value: 'id', children: 'children' }"
          :placeholder="t('system.permission.selectParent')"
          clearable
          check-strictly
          style="width:100%"
        />
      </el-form-item>
      <el-form-item :label="t('system.permission.name')" prop="name">
        <el-input v-model="form.name" maxlength="50" :placeholder="t('system.permission.enterName')" />
      </el-form-item>
      <el-form-item :label="t('system.permission.code')" prop="code">
        <el-input v-model="form.code" maxlength="100" :placeholder="t('system.permission.codeExample')" />
      </el-form-item>
      <el-form-item :label="t('system.permission.type')" prop="perm_type">
        <el-radio-group v-model="form.perm_type">
          <el-radio value="api">{{ t('system.common.api') }}</el-radio>
          <el-radio value="menu">{{ t('system.common.menu') }}</el-radio>
        </el-radio-group>
      </el-form-item>
      <el-form-item :label="t('system.permission.icon')">
        <el-input v-model="form.icon" maxlength="50" :placeholder="t('system.permission.optional')" />
      </el-form-item>
      <el-form-item :label="t('system.common.sort')">
        <el-input-number v-model="form.sort" :min="0" :max="9999" />
      </el-form-item>
      <el-form-item :label="t('system.common.status')">
        <el-radio-group v-model="form.status">
          <el-radio value="1">{{ t('system.common.normal') }}</el-radio>
          <el-radio value="0">{{ t('system.common.disabled') }}</el-radio>
        </el-radio-group>
      </el-form-item>
    </el-form>
    <template #footer>
      <el-button @click="visible = false">{{ t('system.common.cancel') }}</el-button>
      <el-button
        v-perm="isEdit() ? 'system:perm:edit' : 'system:perm:add'"
        type="primary"
        :loading="submitting"
        @click="submit"
      >
        {{ t('system.common.confirm') }}
      </el-button>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import {
  createPermission,
  updatePermission,
  type PermissionForm,
  type PermissionTreeNode,
} from '@/api/modules/permission'
import type { Id } from '@/shared/http/types'
import { useTenantMutation } from '@/shared/query/useTenantMutation'
import { useUserStore } from '@/stores/user'

const { t } = useI18n()

const props = defineProps<{
  permission: PermissionTreeNode | null
  parentId?: Id
  parentTree: PermissionTreeNode[]
}>()

const emit = defineEmits<{
  saved: []
}>()

const visible = defineModel<boolean>({ required: true })
function isEdit(): boolean {
  return props.permission !== null
}
const formRef = ref<FormInstance>()
const userStore = useUserStore()
const saveMutation = useTenantMutation<
  void,
  { id?: Id, payload: PermissionForm }
>(
  () => userStore.tenantId,
  'permissions',
  {
    mutationFn: async variables => {
      if (variables.id === undefined) await createPermission(variables.payload)
      else await updatePermission(variables.id, variables.payload)
    },
    onSuccess: (_data, variables) => {
      ElMessage.success(t(
        variables.id === undefined
          ? 'system.common.addSuccess'
          : 'system.common.updateSuccess',
      ))
    },
  },
)
const submitting = saveMutation.pending

function initialForm(): PermissionForm {
  return {
    name: '',
    code: '',
    parent_id: null,
    perm_type: 'api',
    icon: '',
    sort: 0,
    status: '1',
  }
}

const form = ref<PermissionForm>(initialForm())
const rules = computed<FormRules>(() => ({
  name: [{ required: true, message: t('system.permission.enterName'), trigger: 'blur' }],
  code: [{ required: true, message: t('system.permission.enterCode'), trigger: 'blur' }],
  perm_type: [{
    required: true,
    message: t('system.permission.selectType'),
    trigger: 'change',
  }],
}))

function resetForm(): void {
  form.value = initialForm()
  formRef.value?.clearValidate()
}

function populateForm(): void {
  resetForm()
  const permission = props.permission
  if (permission) {
    form.value = {
      name: permission.name,
      code: permission.code,
      parent_id: permission.parent_id ?? null,
      perm_type: permission.perm_type,
      icon: permission.icon ?? '',
      sort: permission.sort,
      status: permission.status,
    }
    return
  }
  form.value.parent_id = props.parentId ?? null
}

async function submit(): Promise<void> {
  if (submitting.value) return
  const valid = await formRef.value?.validate().catch(() => false)
  if (!valid) return
  const payload: PermissionForm = {
    ...form.value,
    parent_id: form.value.parent_id === '0' ? null : form.value.parent_id,
  }

  await saveMutation.mutateAsync({ id: props.permission?.id, payload })
  visible.value = false
  emit('saved')
}
</script>
