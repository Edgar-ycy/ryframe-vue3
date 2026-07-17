<template>
  <el-dialog v-model="visible" :title="isEdit ? '编辑菜单' : '新增菜单'" width="600px" @closed="resetForm">
    <el-form ref="formRef" :model="form" :rules="rules" label-width="80px">
      <el-form-item label="上级菜单">
        <el-tree-select
          v-model="form.parent_id"
          :data="parentOptions"
          :props="{ label: 'name', value: 'id', children: 'children' }"
          placeholder="根菜单（不选则为顶级）"
          clearable
          check-strictly
          style="width:100%"
        />
      </el-form-item>
      <el-form-item label="菜单名称" prop="name">
        <el-input v-model="form.name" placeholder="请输入菜单名称" maxlength="50" />
      </el-form-item>
      <el-form-item label="菜单类型" prop="menu_type">
        <el-radio-group v-model="form.menu_type" @change="handleMenuTypeChange">
          <el-radio value="M">目录</el-radio>
          <el-radio value="C">菜单</el-radio>
          <el-radio value="F">按钮</el-radio>
        </el-radio-group>
      </el-form-item>
      <el-form-item label="菜单图标">
        <IconSelect v-model="form.icon" />
      </el-form-item>
      <el-form-item v-if="form.menu_type !== 'M'" label="关联权限" prop="perm_id">
        <el-select
          v-model="form.perm_id"
          filterable
          clearable
          placeholder="请选择权限"
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
      <el-form-item label="排序">
        <el-input-number v-model="form.sort" :min="0" :max="999" />
      </el-form-item>
      <el-form-item v-if="form.menu_type !== 'F'" label="可见">
        <el-radio-group v-model="form.visible">
          <el-radio :value="true">显示</el-radio>
          <el-radio :value="false">隐藏</el-radio>
        </el-radio-group>
      </el-form-item>
      <el-form-item v-if="isEdit" label="状态">
        <el-radio-group v-model="form.status">
          <el-radio value="1">正常</el-radio>
          <el-radio value="0">停用</el-radio>
        </el-radio-group>
      </el-form-item>
    </el-form>
    <template #footer>
      <el-button @click="visible = false">取消</el-button>
      <el-button
        v-perm="isEdit ? 'system:menu:edit' : 'system:menu:add'"
        type="primary"
        :loading="submitting"
        @click="submit"
      >
        确定
      </el-button>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import {
  createMenu,
  updateMenu,
  type MenuCreateInput,
  type MenuTreeNode,
  type MenuType,
} from '@/api/modules/menu'
import IconSelect from '@/components/common/IconSelect.vue'
import { getRouteKeyByPermissionCode } from '@/router/pageRegistry'
import type { Id } from '@/shared/http/types'
import { excludeMenuSubtree, type PermissionOption } from '../menuTree'

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
const submitting = ref(false)

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
  name: [{ required: true, message: '请输入菜单名称', trigger: 'blur' }],
  ...(form.value.menu_type === 'M'
    ? {}
    : {
        perm_id: [{
          required: true,
          message: '菜单需关联查询权限，按钮必须关联操作权限',
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
  const valid = await formRef.value?.validate().catch(() => false)
  if (!valid) return
  if (form.value.menu_type === 'C' && !form.value.route_key) {
    ElMessage.error('所选权限没有对应的前端页面，请选择该页面的查询权限')
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

  submitting.value = true
  try {
    if (props.menu) {
      await updateMenu(props.menu.id, { ...payload, status: form.value.status })
      ElMessage.success('更新成功')
    }
    else {
      await createMenu(payload)
      ElMessage.success('新增成功')
    }
    visible.value = false
    emit('saved')
  }
  finally {
    submitting.value = false
  }
}
</script>
