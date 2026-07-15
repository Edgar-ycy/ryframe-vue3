<template>
  <div class="page-container">
    <el-card shadow="never">
      <template #header>
        <div class="card-header">
          <span>菜单列表</span>
          <el-button v-perm="'system:menu:add'" type="primary" icon="Plus" @click="handleAdd()">新增</el-button>
        </div>
      </template>
      <el-table v-loading="loading" :data="tableData" border stripe row-key="id"
        :tree-props="{ children: 'children', hasChildren: 'hasChildren' }">
        <el-table-column prop="name" label="菜单名称" min-width="150" show-overflow-tooltip />
        <el-table-column label="类型" align="center">
          <template #default="{ row }">
            <el-tag :type="menuTypeTag(row.menu_type)" size="small">{{ menuTypeLabel(row.menu_type) }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="图标" align="center">
          <template #default="{ row }">
            <el-icon v-if="row.icon" :size="18"><component :is="row.icon" /></el-icon>
          </template>
        </el-table-column>
        <el-table-column label="关联权限" min-width="220" show-overflow-tooltip>
          <template #default="{ row }">
            {{ permissionLabel(row) }}
          </template>
        </el-table-column>
        <el-table-column prop="sort" label="排序" align="center" />
        <el-table-column prop="visible" label="可见" align="center">
          <template #default="{ row }">
            <el-tag :type="row.visible ? 'success' : 'info'" size="small">{{ row.visible ? '是' : '否' }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="status" label="状态" align="center">
          <template #default="{ row }">
            <el-switch
              v-if="hasPermission('system:menu:edit')"
              v-model="row.status"
              :active-value="'1'"
              :inactive-value="'0'"
              @change="(val: string) => handleChangeStatus(row, val)"
            />
            <el-tag v-else :type="row.status === '1' ? 'success' : 'danger'" size="small">
              {{ row.status === '1' ? '正常' : '停用' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="操作" min-width="100" fixed="right" align="center">
          <template #default="{ row }">
            <el-button v-perm="'system:menu:add'" type="success" link icon="Plus" @click="handleAdd(row.id)">新增</el-button>
            <el-button v-perm="'system:menu:edit'" type="primary" link icon="Edit" @click="handleEdit(row)">编辑</el-button>
            <el-button v-perm="'system:menu:remove'" type="danger" link icon="Delete" :loading="deletingId === row.id" @click="handleDelete(row)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <!-- 新增/编辑弹窗 -->
    <el-dialog v-model="dialog.visible" :title="dialog.title" width="600px" @close="resetForm">
      <el-form ref="formRef" :model="form" :rules="rules" label-width="80px">
        <el-form-item label="上级菜单">
          <el-tree-select
            v-model="form.parent_id"
            :data="parentOptions"
            :props="{ label: 'name', value: 'id', children: 'children' }"
            placeholder="根菜单（不选则为顶级）"
            clearable check-strictly
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
        <el-form-item label="关联权限" prop="perm_id">
          <el-select v-model="form.perm_id" filterable clearable placeholder="请选择权限" style="width:100%" @change="handlePermissionChange">
            <el-option v-for="option in permissionOptions" :key="option.id" :label="`${option.name} (${option.code})`" :value="option.id" />
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
        <el-form-item v-if="dialog.isEdit" label="状态">
          <el-radio-group v-model="form.status">
            <el-radio value="1">正常</el-radio>
            <el-radio value="0">停用</el-radio>
          </el-radio-group>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialog.visible = false">取消</el-button>
        <el-button v-if="dialog.isEdit" v-perm="'system:menu:edit'" type="primary" :loading="submitLoading" @click="handleSubmit">确定</el-button>
        <el-button v-else v-perm="'system:menu:add'" type="primary" :loading="submitLoading" @click="handleSubmit">确定</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import type { TreeNode } from '@/utils/tree'
import { getMenuTree, createMenu, updateMenu, deleteMenu } from '@/api/modules/menu'
import { getPermissionTree } from '@/api/modules/permission'
import type { PermissionTreeNode } from '@/api/modules/permission'
import { getRouteKeyByPermissionCode } from '@/router/pageRegistry'
import IconSelect from '@/components/common/IconSelect.vue'
import { usePermission } from '@/hooks/usePermission'

// ===== 数据加载 =====
const loading = ref(false)
const { hasPermission } = usePermission()
const tableData = ref<TreeNode[]>([])
const allMenuTree = ref<TreeNode[]>([])
interface PermissionOption {
  id: string
  name: string
  code: string
}

const permissionOptions = ref<PermissionOption[]>([])

function flattenPermissions(nodes: PermissionTreeNode[]): PermissionOption[] {
  return nodes.flatMap(node => [
    { id: String(node.id), name: node.name, code: node.code },
    ...flattenPermissions(node.children || []),
  ])
}

async function loadPermissionOptions() {
  const res = await getPermissionTree()
  permissionOptions.value = flattenPermissions(res.data || [])
}

function handlePermissionChange(permissionId?: number | string) {
  const selected = permissionOptions.value.find(option => String(option.id) === String(permissionId))
  form.value.route_key = form.value.menu_type === 'C'
    ? (getRouteKeyByPermissionCode(selected?.code) || '')
    : ''
}

function permissionLabel(menu: TreeNode): string {
  if (menu.perm_id == null) return '-'
  const permission = permissionOptions.value.find(option => option.id === String(menu.perm_id))
  return permission ? `${permission.name} (${permission.code})` : (menu.perm_code || '-')
}

function handleMenuTypeChange(type: string | number | boolean | undefined) {
  if (type === 'M') {
    form.value.route_key = ''
  } else if (type === 'F') {
    form.value.route_key = ''
  } else if (type === 'C') {
    handlePermissionChange(form.value.perm_id)
  }
}

async function fetchData() {
  loading.value = true
  try {
    const res = await getMenuTree()
    const tree = (res.data || []) as TreeNode[]
    tableData.value = tree
    allMenuTree.value = tree
  } finally { loading.value = false }
}

// ===== menu_type 显示辅助 =====
function menuTypeLabel(type: string) {
  const map: Record<string, string> = { M: '目录', C: '菜单', F: '按钮' }
  return map[type] || type
}
function menuTypeTag(type: string) {
  const map: Record<string, string> = { M: '', C: 'success', F: 'warning' }
  return map[type] || 'info'
}

// ===== 状态切换 =====
async function handleChangeStatus(row: any, val: string) {
  const text = val === '1' ? '启用' : '停用'
  try {
    await ElMessageBox.confirm(`确认要${text}菜单"${row.name}"吗？`, '提示', { type: 'warning' })
    await updateMenu(row.id, { status: val } as any)
    ElMessage.success(`${text}成功`)
    await fetchData()
  } catch {
    row.status = val === '1' ? '0' : '1'
  }
}

// ===== 新增/编辑 =====
const dialog = ref({ visible: false, title: '', isEdit: false })
const formRef = ref<FormInstance>()
const submitLoading = ref(false)
const currentEditId = ref<number | string | null>(null)

interface MenuFormState {
  parent_id?: number | string
  name: string
  menu_type: string
  perm_id?: number | string
  route_key: string
  icon: string
  sort: number
  visible: boolean
  status: string
}

const form = ref<MenuFormState>({
  parent_id: undefined, name: '', menu_type: 'M', perm_id: undefined, route_key: '', icon: '',
  sort: 0, visible: true, status: '1',
})

const rules = computed<FormRules>(() => {
  const result: FormRules = {
    name: [{ required: true, message: '请输入菜单名称', trigger: 'blur' }],
  }
  if (form.value.menu_type !== 'M') {
    result.perm_id = [{ required: true, message: '菜单需关联查询权限，按钮必须关联操作权限', trigger: 'change' }]
  }
  return result
})

function resetForm() {
  form.value.parent_id = undefined; form.value.name = ''; form.value.menu_type = 'M'; form.value.perm_id = undefined; form.value.route_key = ''; form.value.icon = ''
  form.value.sort = 0; form.value.visible = true; form.value.status = '1'
  currentEditId.value = null
  formRef.value?.clearValidate()
}

/** 编辑模式下过滤掉自身及后代节点的父级选项树 */
const parentOptions = computed(() => {
  if (!dialog.value.isEdit || !currentEditId.value) {
    return allMenuTree.value
  }
  return excludeSubtree(allMenuTree.value, currentEditId.value)
})

/** 从树中移除指定 id 的整个子树 */
function excludeSubtree(tree: TreeNode[], excludeId: number | string): TreeNode[] {
  return tree.reduce<TreeNode[]>((acc, node) => {
    if (node.id === excludeId) return acc
    const children = node.children?.length
      ? excludeSubtree(node.children as TreeNode[], excludeId)
      : []
    acc.push({ ...node, children } as TreeNode)
    return acc
  }, [])
}

function handleAdd(parentId?: number | string) {
  currentEditId.value = null
  dialog.value.title = '新增菜单'; dialog.value.isEdit = false
  resetForm()
  form.value.parent_id = parentId || undefined
  form.value.menu_type = parentId ? 'C' : 'M'
  dialog.value.visible = true
}

async function handleEdit(row: any) {
  dialog.value.title = '编辑菜单'; dialog.value.isEdit = true
  resetForm()
  currentEditId.value = row.id
  if (permissionOptions.value.length === 0) {
    await loadPermissionOptions()
  }
  const d = row
  form.value.parent_id = d.parent_id ?? undefined
  form.value.name = d.name
  form.value.menu_type = d.menu_type || 'C'
  form.value.perm_id = d.perm_id == null ? undefined : String(d.perm_id)
  form.value.route_key = d.route_key || ''
  form.value.icon = d.icon || ''
  form.value.sort = d.sort ?? 0
  form.value.visible = d.visible === true || d.visible === '1' || d.visible === 1
  form.value.status = d.status ?? '1'
  dialog.value.visible = true
}

async function handleSubmit() {
  const valid = await formRef.value?.validate().catch(() => false)
  if (!valid) return
  if (form.value.menu_type === 'C' && !form.value.route_key) {
    ElMessage.error('所选权限没有对应的前端页面，请选择该页面的查询权限')
    return
  }
  submitLoading.value = true
  try {
    const data: Record<string, any> = {
      name: form.value.name,
      parent_id: form.value.parent_id || undefined,
      menu_type: form.value.menu_type,
      perm_id: form.value.perm_id || undefined,
      route_key: form.value.menu_type === 'F' ? undefined : form.value.route_key,
      icon: form.value.icon || undefined,
      sort: form.value.sort,
      visible: form.value.visible,
    }
    if (dialog.value.isEdit) {
      await updateMenu(currentEditId.value!, { ...data, status: form.value.status } as any)
      ElMessage.success('更新成功')
    } else {
      await createMenu(data as any)
      ElMessage.success('新增成功')
    }
    dialog.value.visible = false
    await fetchData()
  } finally { submitLoading.value = false }
}

// ===== 删除 =====
const deletingId = ref<number | null>(null)

async function handleDelete(row: any) {
  try {
    await ElMessageBox.confirm(
      `确认删除菜单"${row.name}"吗？存在子菜单时需先处理子菜单。`,
      '警告',
      { type: 'warning', confirmButtonText: '确认删除' },
    )
    deletingId.value = row.id
    await deleteMenu(row.id)
    ElMessage.success('删除成功')
    await fetchData()
  } catch {
    /* cancelled or error */
  } finally {
    deletingId.value = null
  }
}

onMounted(() => {
  fetchData()
  loadPermissionOptions()
})
</script>
