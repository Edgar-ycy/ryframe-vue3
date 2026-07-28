<template>
  <div class="page-container">
    <el-card shadow="never">
      <template #header>
        <div class="card-header">
          <span>{{ t('system.department.list') }}</span>
          <el-button v-perm="'system:dept:add'" type="primary" icon="Plus" @click="handleAdd()">
            {{ t('system.common.add') }}
          </el-button>
        </div>
      </template>
      <el-table
        v-loading="loading" :data="tableData" border stripe row-key="id"
        :tree-props="{ children: 'children' }"
      >
        <el-table-column prop="name" :label="t('system.department.name')" min-width="180" show-overflow-tooltip />
        <el-table-column prop="sort" :label="t('system.common.sort')" align="center" />
        <el-table-column prop="status" :label="t('system.common.status')" align="center">
          <template #default="{ row }">
            <el-tag :type="row.status === '1' ? 'success' : 'danger'" size="small">
              {{ row.status === '1' ? t('system.common.normal') : t('system.common.disabled') }}
            </el-tag>
          </template>
        </el-table-column>

        <el-table-column :label="t('system.common.actions')" fixed="right" align="center">
          <template #default="{ row }">
            <el-button v-perm="'system:dept:add'" type="success" link icon="Plus" @click="handleAdd(row.id)">
              {{ t('system.common.add') }}
            </el-button>
            <el-button v-perm="'system:dept:edit'" type="primary" link icon="Edit" @click="handleEdit(row)">
              {{ t('system.common.edit') }}
            </el-button>
            <el-button v-perm="'system:dept:remove'" type="danger" link icon="Delete" @click="handleDelete(row)">
              {{ t('system.common.delete') }}
            </el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <!-- 新增/编辑弹窗 -->
    <el-dialog v-model="dialog.visible" :title="dialog.title" width="500px" @close="resetForm">
      <el-form ref="formRef" :model="form" :rules="rules" label-width="80px">
        <el-form-item :label="t('system.department.parent')">
          <el-tree-select
            v-model="form.parent_id"
            :data="deptOptions"
            :props="{ label: 'name', value: 'id', children: 'children' }"
            :placeholder="t('system.department.rootPlaceholder')"
            clearable check-strictly
            style="width:100%"
          />
        </el-form-item>
        <el-form-item :label="t('system.department.name')" prop="name">
          <el-input v-model="form.name" :placeholder="t('system.department.enterName')" />
        </el-form-item>
        <el-form-item :label="t('system.common.sort')">
          <el-input-number v-model="form.sort" :min="0" :max="999" />
        </el-form-item>
        <el-form-item v-if="dialog.isEdit" :label="t('system.common.status')">
          <el-radio-group v-model="form.status">
            <el-radio value="1">{{ t('system.common.normal') }}</el-radio>
            <el-radio value="0">{{ t('system.common.disabled') }}</el-radio>
          </el-radio-group>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialog.visible = false">{{ t('system.common.cancel') }}</el-button>
        <el-button v-if="dialog.isEdit" v-perm="'system:dept:edit'" type="primary" :loading="submitLoading" @click="handleSubmit">
          {{ t('system.common.confirm') }}
        </el-button>
        <el-button v-else v-perm="'system:dept:add'" type="primary" :loading="submitLoading" @click="handleSubmit">
          {{ t('system.common.confirm') }}
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { getDeptTree, getDept, createDept, updateDept, deleteDept } from '@/api/modules/dept'
import type { DeptNode } from '@/api/modules/dept'
import type { Id } from '@/shared/http/types'

const { t } = useI18n()

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

const rules = computed<FormRules>(() => ({
  name: [{ required: true, message: t('system.department.enterName'), trigger: 'blur' }],
}))

function resetForm() {
  form.value.parent_id = undefined; form.value.name = ''; form.value.sort = 0; form.value.status = '1'
  formRef.value?.clearValidate()
}

function handleAdd(parentId?: Id) {
  currentEditId.value = null
  dialog.value.title = t('system.department.addTitle'); dialog.value.isEdit = false
  resetForm()
  form.value.parent_id = parentId || undefined
  dialog.value.visible = true
}

async function handleEdit(row: DeptNode) {
  currentEditId.value = row.id
  dialog.value.title = t('system.department.editTitle'); dialog.value.isEdit = true
  resetForm()
  const res = await getDept(row.id)
  if (!res.data) throw new Error(t('system.department.detailMissing'))
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
      ElMessage.success(t('system.common.updateSuccess'))
    } else {
      await createDept(data)
      ElMessage.success(t('system.common.addSuccess'))
    }
    dialog.value.visible = false
    await fetchData()
  } finally { submitLoading.value = false }
}

// ----- 删除 -----
async function handleDelete(row: DeptNode) {
  try {
    await ElMessageBox.confirm(
      t('system.department.deleteConfirm', { name: row.name }),
      t('system.common.warning'),
      { type: 'warning' },
    )
    await deleteDept(row.id)
    ElMessage.success(t('system.common.deleteSuccess'))
    await fetchData()
  } catch { /* 用户取消 */ }
}

onMounted(() => fetchData())
</script>
