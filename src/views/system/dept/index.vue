<template>
  <div class="page-container">
    <el-card shadow="never">
      <template #header>
        <div class="card-header">
          <span>部门列表</span>
          <el-button v-perm="'system:dept:add'" type="primary" icon="Plus" @click="handleAdd()">新增</el-button>
        </div>
      </template>
      <el-table
        v-loading="loading" :data="tableData" border stripe row-key="id"
        :tree-props="{ children: 'children' }"
      >
        <el-table-column prop="name" label="部门名称" min-width="180" show-overflow-tooltip />
        <el-table-column prop="sort" label="排序" align="center" />
        <el-table-column prop="status" label="状态" align="center">
          <template #default="{ row }">
            <el-tag :type="row.status === '1' ? 'success' : 'danger'" size="small">{{ row.status === '1' ? '正常' : '停用' }}</el-tag>
          </template>
        </el-table-column>

        <el-table-column label="操作" fixed="right" align="center">
          <template #default="{ row }">
            <el-button v-perm="'system:dept:add'" type="success" link icon="Plus" @click="handleAdd(row.id)">新增</el-button>
            <el-button v-perm="'system:dept:edit'" type="primary" link icon="Edit" @click="handleEdit(row)">编辑</el-button>
            <el-button v-perm="'system:dept:remove'" type="danger" link icon="Delete" @click="handleDelete(row)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <!-- 新增/编辑弹窗 -->
    <el-dialog v-model="dialog.visible" :title="dialog.title" width="500px" @close="resetForm">
      <el-form ref="formRef" :model="form" :rules="rules" label-width="80px">
        <el-form-item label="上级部门">
          <el-tree-select
            v-model="form.parent_id"
            :data="deptOptions"
            :props="{ label: 'name', value: 'id', children: 'children' }"
            placeholder="根部门（不选则为顶级）"
            clearable check-strictly
            style="width:100%"
          />
        </el-form-item>
        <el-form-item label="部门名称" prop="name">
          <el-input v-model="form.name" placeholder="请输入部门名称" />
        </el-form-item>
        <el-form-item label="排序">
          <el-input-number v-model="form.sort" :min="0" :max="999" />
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
        <el-button v-if="dialog.isEdit" v-perm="'system:dept:edit'" type="primary" :loading="submitLoading" @click="handleSubmit">确定</el-button>
        <el-button v-else v-perm="'system:dept:add'" type="primary" :loading="submitLoading" @click="handleSubmit">确定</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { getDeptTree, getDept, createDept, updateDept, deleteDept } from '@/api/modules/dept'
import type { DeptNode } from '@/api/modules/dept'
import type { Id } from '@/shared/http/types'

const loading = ref(false)
const tableData = ref<DeptNode[]>([])
const deptOptions = ref<DeptNode[]>([])

async function fetchData() {
  loading.value = true
  try {
    const res = await getDeptTree()
    const treeData = res.data ?? []
    tableData.value = treeData
    deptOptions.value = treeData
  } finally { loading.value = false }
}

// ----- 新增/编辑 -----
const dialog = ref({ visible: false, title: '', isEdit: false })
const formRef = ref<FormInstance>()
const submitLoading = ref(false)
const currentEditId = ref<Id | null>(null)

const form = ref<{ parent_id?: Id; name: string; sort: number; status: string }>({ parent_id: undefined, name: '', sort: 0, status: '1' })

const rules = { name: [{ required: true, message: '请输入部门名称', trigger: 'blur' }] }

function resetForm() {
  form.value.parent_id = undefined; form.value.name = ''; form.value.sort = 0; form.value.status = '1'
  formRef.value?.clearValidate()
}

function handleAdd(parentId?: Id) {
  currentEditId.value = null
  dialog.value.title = '新增部门'; dialog.value.isEdit = false
  resetForm()
  form.value.parent_id = parentId || undefined
  dialog.value.visible = true
}

async function handleEdit(row: DeptNode) {
  currentEditId.value = row.id
  dialog.value.title = '编辑部门'; dialog.value.isEdit = true
  resetForm()
  const res = await getDept(row.id)
  if (!res.data) throw new Error('部门详情响应缺少数据')
  const d = res.data
  form.value.parent_id = d.parent_id ?? undefined
  form.value.name = d.name
  form.value.sort = d.sort ?? 0
  form.value.status = d.status
  dialog.value.visible = true
}

async function handleSubmit() {
  const valid = await formRef.value?.validate().catch(() => false)
  if (!valid) return
  submitLoading.value = true
  try {
    const data = { name: form.value.name, parent_id: form.value.parent_id, sort: form.value.sort }
    if (dialog.value.isEdit) {
      await updateDept(currentEditId.value!, { ...data, status: form.value.status })
      ElMessage.success('更新成功')
    } else {
      await createDept(data)
      ElMessage.success('新增成功')
    }
    dialog.value.visible = false
    await fetchData()
  } finally { submitLoading.value = false }
}

// ----- 删除 -----
async function handleDelete(row: DeptNode) {
  try {
    await ElMessageBox.confirm(`确认删除部门"${row.name}"吗？(子部门将一并删除)`, '警告', { type: 'warning' })
    await deleteDept(row.id)
    ElMessage.success('删除成功')
    await fetchData()
  } catch { /* cancelled */ }
}

onMounted(() => fetchData())
</script>
