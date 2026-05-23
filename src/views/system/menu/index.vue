<template>
  <div class="page-container">
    <el-card shadow="never">
      <template #header>
        <div class="card-header">
          <span>菜单列表</span>
          <el-button v-permission="'system:menu:create'" type="primary" icon="Plus" @click="handleAdd()">新增</el-button>
        </div>
      </template>
      <el-table v-loading="loading" :data="tableData" border stripe row-key="id" default-expand-all
        :tree-props="{ children: 'children', hasChildren: 'hasChildren' }">
        <el-table-column prop="name" label="菜单名称" min-width="180" show-overflow-tooltip />
        <el-table-column prop="path" label="路由地址" width="160" show-overflow-tooltip />
        <el-table-column prop="component" label="组件路径" width="180" show-overflow-tooltip />
        <el-table-column label="图标" width="60" align="center">
          <template #default="{ row }">
            <el-icon v-if="row.icon"><component :is="row.icon" /></el-icon>
          </template>
        </el-table-column>
        <el-table-column prop="sort" label="排序" width="60" align="center" />
        <el-table-column prop="visible" label="可见" width="60" align="center">
          <template #default="{ row }">
            <el-tag :type="row.visible ? 'success' : 'info'" size="small">{{ row.visible ? '是' : '否' }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="status" label="状态" width="70" align="center">
          <template #default="{ row }">
            <el-tag :type="row.status === '1' ? 'success' : 'danger'" size="small">{{ row.status === '1' ? '正常' : '禁用' }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="180" fixed="right" align="center">
          <template #default="{ row }">
            <el-button v-permission="'system:menu:create'" type="success" link icon="Plus" @click="handleAdd(row.id)">新增</el-button>
            <el-button v-permission="'system:menu:update'" type="primary" link icon="Edit" @click="handleEdit(row)">编辑</el-button>
            <el-button v-permission="'system:menu:delete'" type="danger" link icon="Delete" @click="handleDelete(row)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <!-- 新增/编辑弹窗 -->
    <el-dialog v-model="dialog.visible" :title="dialog.title" width="550px" @close="resetForm">
      <el-form ref="formRef" :model="form" :rules="rules" label-width="80px">
        <el-form-item label="上级菜单">
          <el-tree-select
            v-model="form.parent_id"
            :data="menuTreeOptions"
            :props="{ label: 'name', value: 'id', children: 'children' }"
            placeholder="根菜单（不选则为顶级）"
            clearable check-strictly
            style="width:100%"
          />
        </el-form-item>
        <el-form-item label="菜单名称" prop="name">
          <el-input v-model="form.name" placeholder="请输入菜单名称" />
        </el-form-item>
        <el-form-item label="路由地址">
          <el-input v-model="form.path" placeholder="如 /system/user" />
        </el-form-item>
        <el-form-item label="组件路径">
          <el-input v-model="form.component" placeholder="如 system/user/index" />
        </el-form-item>
        <el-form-item label="图标">
          <el-input v-model="form.icon" placeholder="如 Setting（Element Plus 图标名）" />
        </el-form-item>
        <el-form-item label="排序">
          <el-input-number v-model="form.sort" :min="0" :max="999" />
        </el-form-item>
        <el-form-item label="可见">
          <el-radio-group v-model="form.visible">
            <el-radio :value="true">显示</el-radio>
            <el-radio :value="false">隐藏</el-radio>
          </el-radio-group>
        </el-form-item>
        <el-form-item v-if="dialog.isEdit" label="状态">
          <el-radio-group v-model="form.status">
            <el-radio value="1">正常</el-radio>
            <el-radio value="2">禁用</el-radio>
          </el-radio-group>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialog.visible = false">取消</el-button>
        <el-button type="primary" :loading="submitLoading" @click="handleSubmit">确定</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { listMenu, getMenu, createMenu, updateMenu, deleteMenu } from '@/api/modules/menu'

const loading = ref(false)
const tableData = ref([])
const menuTreeOptions = ref([])

// 扁平化树为列表用于表格展示（保留 children 供 tree-props）
async function fetchData() {
  loading.value = true
  try {
    const res = await listMenu()
    tableData.value = res.rows || []
    // 构建下拉选项（含"根节点"占位）
    menuTreeOptions.value = res.rows || []
  } finally { loading.value = false }
}

// ----- 新增/编辑 -----
const dialog = ref({ visible: false, title: '', isEdit: false })
const formRef = ref<FormInstance>()
const submitLoading = ref(false)
const currentEditId = ref<number | null>(null)

interface MenuFormState {
  parent_id?: number
  name: string
  path: string
  component: string
  icon: string
  sort: number
  visible: boolean
  status: string
}

const form = ref<MenuFormState>({
  parent_id: undefined, name: '', path: '', component: '', icon: '',
  sort: 0, visible: true, status: '1',
})

const rules = {
  name: [{ required: true, message: '请输入菜单名称', trigger: 'blur' }],
}

function resetForm() {
  form.value.parent_id = undefined; form.value.name = ''; form.value.path = ''; form.value.component = ''
  form.value.icon = ''; form.value.sort = 0; form.value.visible = true; form.value.status = '1'
  formRef.value?.clearValidate()
}

function handleAdd(parentId?: number) {
  currentEditId.value = null
  dialog.value.title = '新增菜单'; dialog.value.isEdit = false
  resetForm()
  form.value.parent_id = parentId || undefined
  dialog.value.visible = true
}

async function handleEdit(row) {
  currentEditId.value = row.id
  dialog.value.title = '编辑菜单'; dialog.value.isEdit = true
  resetForm()
  const res = await getMenu(row.id)
  const d = res.data || res
  form.value.parent_id = d.parent_id
  form.value.name = d.name
  form.value.path = d.path || ''
  form.value.component = d.component || ''
  form.value.icon = d.icon || ''
  form.value.sort = d.sort ?? 0
  form.value.visible = d.visible ?? true
  form.value.status = d.status
  dialog.value.visible = true
}

async function handleSubmit() {
  const valid = await formRef.value?.validate().catch(() => false)
  if (!valid) return
  submitLoading.value = true
  try {
    const data = {
      name: form.value.name, parent_id: form.value.parent_id || undefined,
      path: form.value.path || undefined, component: form.value.component || undefined,
      icon: form.value.icon || undefined, sort: form.value.sort, visible: form.value.visible,
    }
    if (dialog.value.isEdit) {
      await updateMenu(currentEditId.value!, { ...data, status: form.value.status } as any)
      ElMessage.success('更新成功')
    } else {
      await createMenu(data as any)
      ElMessage.success('新增成功')
    }
    dialog.value.visible = false
    fetchData()
  } finally { submitLoading.value = false }
}

// ----- 删除 -----
async function handleDelete(row) {
  try {
    await ElMessageBox.confirm(`确认删除菜单"${row.name}"吗？(子菜单将一并删除)`, '警告', { type: 'warning' })
    await deleteMenu(row.id)
    ElMessage.success('删除成功')
    fetchData()
  } catch { /* cancelled */ }
}

onMounted(() => fetchData())
</script>

<style scoped>
.card-header { display: flex; justify-content: space-between; align-items: center }
</style>
