<template>
  <el-dialog
    v-model="visible"
    :title="isEdit ? t('system.menu.editTitle') : t('system.menu.addTitle')"
    width="600px"
    @closed="resetForm"
  >
    <el-form ref="formRef" :model="form" :rules="rules" label-width="80px">
      <el-form-item :label="t('system.menu.parent')">
        <el-tree-select
          v-model="form.parent_id"
          :data="parentOptions"
          :props="{ label: 'name', value: 'id', children: 'children' }"
          :placeholder="t('system.menu.rootPlaceholder')"
          clearable
          check-strictly
          style="width:100%"
        />
      </el-form-item>
      <el-form-item :label="t('system.menu.name')" prop="name">
        <el-input v-model="form.name" :placeholder="t('system.menu.enterName')" maxlength="50" />
      </el-form-item>
      <el-form-item :label="t('system.menu.type')" prop="menu_type">
        <el-radio-group v-model="form.menu_type" @change="handleMenuTypeChange">
          <el-radio value="M">{{ t('system.menu.directory') }}</el-radio>
          <el-radio value="C">{{ t('system.menu.menu') }}</el-radio>
          <el-radio value="F">{{ t('system.menu.button') }}</el-radio>
        </el-radio-group>
      </el-form-item>
      <el-form-item :label="t('system.menu.icon')">
        <IconSelect v-model="form.icon" />
      </el-form-item>
      <el-form-item v-if="form.menu_type !== 'M'" :label="t('system.menu.linkedPermission')" prop="perm_id">
        <el-select
          v-model="form.perm_id"
          filterable
          clearable
          :placeholder="t('system.menu.selectPermission')"
          style="width:100%"
          @change="handlePermissionChange"
        >
          <el-option
            v-for="option in permissionOptions"
            :key="option.id"
            :label="`${option.name} (${option.code})`"
            :value="option.id"
          />
        </el-select>
      </el-form-item>
      <el-form-item :label="t('system.common.sort')">
        <el-input-number v-model="form.sort" :min="0" :max="999" />
      </el-form-item>
      <el-form-item v-if="form.menu_type !== 'F'" :label="t('system.menu.visible')">
        <el-radio-group v-model="form.visible">
          <el-radio :value="true">{{ t('system.menu.display') }}</el-radio>
          <el-radio :value="false">{{ t('system.menu.hidden') }}</el-radio>
        </el-radio-group>
      </el-form-item>
      <el-form-item v-if="isEdit" :label="t('system.common.status')">
        <el-radio-group v-model="form.status">
          <el-radio value="1">{{ t('system.common.normal') }}</el-radio>
          <el-radio value="0">{{ t('system.common.disabled') }}</el-radio>
        </el-radio-group>
      </el-form-item>
    </el-form>
    <template #footer>
      <el-button @click="visible = false">{{ t('system.common.cancel') }}</el-button>
      <el-button
        v-perm="isEdit ? 'system:menu:edit' : 'system:menu:add'"
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
  createMenu,
  updateMenu,
  type MenuCreateInput,
  type MenuTreeNode,
  type MenuType,
  type MenuUpdateInput,
} from '@/api/modules/menu'
import IconSelect from '@/components/common/IconSelect.vue'
import { getRouteKeyByPermissionCode } from '@/router/pageRegistry'
import type { Id } from '@/shared/http/types'
import { useTenantMutation } from '@/shared/query/useTenantMutation'
import { useUserStore } from '@/stores/user'
import { excludeMenuSubtree, type PermissionOption } from '../menuTree'

const { t } = useI18n()

interface MenuFormState {
  parent_id?: Id
  name: string
  menu_type: MenuType
  perm_id?: Id
  route_key: string
  icon: string
  sort: number
  visible: boolean
  status: string
}

type SaveMenuCommand =
  | { kind: 'create', data: MenuCreateInput }
  | { kind: 'update', id: Id, data: MenuUpdateInput }

const props = defineProps<{
  modelValue: boolean
  menu: MenuTreeNode | null
  parentId?: Id
  menuTree: MenuTreeNode[]
  permissionOptions: PermissionOption[]
}>()

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  saved: []
}>()

const visible = computed({
  get: () => props.modelValue,
  set: value => emit('update:modelValue', value),
})
const isEdit = computed(() => props.menu !== null)
const formRef = ref<FormInstance>()
const userStore = useUserStore()
const saveMutation = useTenantMutation<void, SaveMenuCommand>(
  () => userStore.tenantId,
  'menus',
  {
    mutationFn: async command => {
      if (command.kind === 'update') await updateMenu(command.id, command.data)
      else await createMenu(command.data)
    },
    onSuccess: (_data, command) => {
      ElMessage.success(t(
        command.kind === 'update'
          ? 'system.common.updateSuccess'
          : 'system.common.addSuccess',
      ))
    },
  },
)
const submitting = saveMutation.pending

function initialForm(): MenuFormState {
  return {
    parent_id: undefined,
    name: '',
    menu_type: 'M',
    perm_id: undefined,
    route_key: '',
    icon: '',
    sort: 0,
    visible: true,
    status: '1',
  }
}

const form = ref<MenuFormState>(initialForm())
const rules = computed<FormRules>(() => ({
  name: [{ required: true, message: t('system.menu.enterName'), trigger: 'blur' }],
  ...(form.value.menu_type === 'M'
    ? {}
    : {
        perm_id: [{
          required: true,
          message: t('system.menu.permissionRequired'),
          trigger: 'change',
        }],
      }),
}))
const parentOptions = computed(() =>
  props.menu ? excludeMenuSubtree(props.menuTree, props.menu.id) : props.menuTree,
)

function resetForm(): void {
  form.value = initialForm()
  formRef.value?.clearValidate()
}

function handlePermissionChange(permissionId?: Id): void {
  const selected = props.permissionOptions.find(option => option.id === permissionId)
  form.value.route_key = form.value.menu_type === 'C'
    ? (getRouteKeyByPermissionCode(selected?.code) ?? '')
    : ''
}

function handleMenuTypeChange(): void {
  if (form.value.menu_type === 'M') {
    form.value.perm_id = undefined
    form.value.route_key = ''
  }
  else if (form.value.menu_type === 'F') {
    form.value.route_key = ''
  }
  else {
    handlePermissionChange(form.value.perm_id)
  }
  formRef.value?.clearValidate('perm_id')
}

function populateForm(): void {
  resetForm()
  const menu = props.menu
  if (menu) {
    form.value = {
      parent_id: menu.parent_id ?? undefined,
      name: menu.name,
      menu_type: menu.menu_type,
      perm_id: menu.perm_id ?? undefined,
      route_key: menu.route_key ?? '',
      icon: menu.icon ?? '',
      sort: menu.sort,
      visible: menu.visible,
      status: menu.status,
    }
    return
  }
  form.value.parent_id = props.parentId
  form.value.menu_type = props.parentId ? 'C' : 'M'
}

watch(
  () => props.modelValue,
  open => {
    if (open) populateForm()
  },
)

async function submit(): Promise<void> {
  if (submitting.value) return
  const valid = await formRef.value?.validate().catch(() => false)
  if (!valid) return
  if (form.value.menu_type === 'C' && !form.value.route_key) {
    ElMessage.error(t('system.menu.pageMissing'))
    return
  }

  const payload: MenuCreateInput = {
    name: form.value.name,
    parent_id: form.value.parent_id,
    menu_type: form.value.menu_type,
    perm_id: form.value.perm_id,
    route_key: form.value.menu_type === 'F' ? undefined : form.value.route_key || undefined,
    icon: form.value.icon || undefined,
    sort: form.value.sort,
    visible: form.value.visible,
  }

  const command: SaveMenuCommand = props.menu
    ? {
        kind: 'update',
        id: props.menu.id,
        data: { ...payload, status: form.value.status },
      }
    : { kind: 'create', data: payload }
  await saveMutation.mutateAsync(command)
  visible.value = false
  emit('saved')
}
</script>
