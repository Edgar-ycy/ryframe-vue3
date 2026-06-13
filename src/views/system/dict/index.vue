<template>
  <div class="page-container">
    <el-row :gutter="12">
      <!-- 左侧：字典类型 -->
      <el-col :span="8">
        <el-card shadow="never">
          <template #header>
            <div class="card-header">
              <span>字典类型</span>
              <el-button v-permission="'system:dict:add'" type="primary" size="small" icon="Plus" @click="handleAddType">新增</el-button>
            </div>
          </template>
          <el-table v-loading="typeLoading" :data="typeList" border stripe highlight-current-row
            @row-click="handleTypeClick">
            <el-table-column prop="name" label="字典名称" min-width="110" show-overflow-tooltip />
            <el-table-column prop="code" label="字典编码" show-overflow-tooltip />
            <el-table-column prop="status" label="状态" align="center">
              <template #default="{ row }">
                <el-tag :type="row.status === '1' ? 'success' : 'danger'" size="small">{{ row.status === '1' ? '正常' : '停用' }}</el-tag>
              </template>
            </el-table-column>
            <el-table-column label="操作" fixed="right" align="center">
              <template #default="{ row }">
                <el-button type="primary" link icon="Edit" size="small" @click.stop="handleEditType(row)">编辑</el-button>
                <el-button type="danger" link icon="Delete" size="small" @click.stop="handleDeleteType(row)">删除</el-button>
              </template>
            </el-table-column>
          </el-table>
          <el-pagination
            v-model:current-page="typePage.page"
            v-model:page-size="typePage.pageSize"
            :total="typeTotal" :page-sizes="[10, 20, 50]" layout="total, prev, pager, next" small background
            style="margin-top:8px;justify-content:flex-end"
            @change="fetchTypeList"
          />
        </el-card>
      </el-col>

      <!-- 右侧：字典数据 -->
      <el-col :span="16">
        <el-card shadow="never">
          <template #header>
            <div class="card-header">
              <span>字典数据{{ currentType ? ` — ${currentType.name}` : '' }}</span>
              <el-button v-if="currentType" v-permission="'system:dict:add'" type="primary" size="small" icon="Plus" @click="handleAddData">新增</el-button>
            </div>
          </template>
          <el-table v-loading="dataLoading" :data="dataList" border stripe>
            <el-table-column prop="label" label="字典标签" min-width="120" show-overflow-tooltip />
            <el-table-column prop="value" label="字典键值" />
            <el-table-column prop="sort" label="排序" align="center" />
            <el-table-column prop="status" label="状态" align="center">
              <template #default="{ row }">
                <el-tag :type="row.status === '1' ? 'success' : 'danger'" size="small">{{ row.status === '1' ? '正常' : '停用' }}</el-tag>
              </template>
            </el-table-column>
            <el-table-column label="操作" align="center">
              <template #default="{ row }">
                <el-button type="primary" link icon="Edit" size="small" @click="handleEditData(row)">编辑</el-button>
                <el-button type="danger" link icon="Delete" size="small" @click="handleDeleteData(row)">删除</el-button>
              </template>
            </el-table-column>
          </el-table>
          <el-empty v-if="!currentType" description="请在左侧选择字典类型" />
        </el-card>
      </el-col>
    </el-row>

    <!-- 字典类型弹窗 -->
    <el-dialog v-model="typeDialog.visible" :title="typeDialog.title" width="420px" @close="resetTypeForm">
      <el-form ref="typeFormRef" :model="typeForm" :rules="typeRules" label-width="80px">
        <el-form-item label="字典名称" prop="name">
          <el-input v-model="typeForm.name" placeholder="请输入字典名称" />
        </el-form-item>
        <el-form-item label="字典编码" prop="code">
          <el-input v-model="typeForm.code" :disabled="typeDialog.isEdit" placeholder="请输入字典编码" />
        </el-form-item>
        <el-form-item v-if="typeDialog.isEdit" label="状态">
          <el-radio-group v-model="typeForm.status">
            <el-radio value="1">正常</el-radio>
            <el-radio value="0">停用</el-radio>
          </el-radio-group>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="typeDialog.visible = false">取消</el-button>
        <el-button type="primary" :loading="typeSubmitLoading" @click="handleTypeSubmit">确定</el-button>
      </template>
    </el-dialog>

    <!-- 字典数据弹窗 -->
    <el-dialog v-model="dataDialog.visible" :title="dataDialog.title" width="420px" @close="resetDataForm">
      <el-form ref="dataFormRef" :model="dataForm" :rules="dataRules" label-width="80px">
        <el-form-item label="字典标签" prop="label">
          <el-input v-model="dataForm.label" placeholder="请输入字典标签" />
        </el-form-item>
        <el-form-item label="字典键值" prop="value">
          <el-input v-model="dataForm.value" placeholder="请输入字典键值" />
        </el-form-item>
        <el-form-item label="排序">
          <el-input-number v-model="dataForm.sort" :min="0" :max="999" />
        </el-form-item>
        <el-form-item v-if="dataDialog.isEdit" label="状态">
          <el-radio-group v-model="dataForm.status">
            <el-radio value="1">正常</el-radio>
            <el-radio value="0">停用</el-radio>
          </el-radio-group>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dataDialog.visible = false">取消</el-button>
        <el-button type="primary" :loading="dataSubmitLoading" @click="handleDataSubmit">确定</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import {
  listDictType, createDictType, updateDictType, deleteDictType,
  listDictData, createDictData, updateDictData, deleteDictData,
} from '@/api/modules/dict'

// ===== 字典类型 =====
const typeLoading = ref(false)
const typeList = ref<any[]>([])
const typeTotal = ref(0)
const typePage = ref({ page: 1, pageSize: 10 })

async function fetchTypeList() {
  typeLoading.value = true
  try {
    const res = await listDictType(typePage.value)
    typeList.value = res.rows || []
    typeTotal.value = res.total || 0
  } finally { typeLoading.value = false }
}

const typeDialog = ref({ visible: false, title: '', isEdit: false })
const typeFormRef = ref<FormInstance>()
const typeSubmitLoading = ref(false)
const currentTypeEditId = ref<number | null>(null)
const typeForm = ref({ name: '', code: '', status: '1' })
const typeRules = {
  name: [{ required: true, message: '请输入字典名称', trigger: 'blur' }],
  code: [{ required: true, message: '请输入字典编码', trigger: 'blur' }],
}

function resetTypeForm() { typeForm.value.name = ''; typeForm.value.code = ''; typeForm.value.status = '1'; typeFormRef.value?.clearValidate() }

function handleAddType() {
  currentTypeEditId.value = null
  typeDialog.value.title = '新增字典类型'; typeDialog.value.isEdit = false
  resetTypeForm(); typeDialog.value.visible = true
}

async function handleEditType(row:any) {
  currentTypeEditId.value = row.id
  typeDialog.value.title = '编辑字典类型'; typeDialog.value.isEdit = true
  resetTypeForm()
  typeForm.value.name = row.name; typeForm.value.code = row.code; typeForm.value.status = row.status
  typeDialog.value.visible = true
}

async function handleTypeSubmit() {
  const valid = await typeFormRef.value?.validate().catch(() => false)
  if (!valid) return
  typeSubmitLoading.value = true
  try {
    if (typeDialog.value.isEdit) {
      await updateDictType(currentTypeEditId.value!, { name: typeForm.value.name, status: typeForm.value.status } as any)
      ElMessage.success('更新成功')
    } else {
      await createDictType({ name: typeForm.value.name, code: typeForm.value.code } as any)
      ElMessage.success('新增成功')
    }
    typeDialog.value.visible = false
    await fetchTypeList()
  } finally { typeSubmitLoading.value = false }
}

async function handleDeleteType(row:any) {
  try {
    await ElMessageBox.confirm(`确认删除字典类型"${row.name}"吗？`, '警告', { type: 'warning' })
    await deleteDictType(row.id)
    ElMessage.success('删除成功')
    if (currentType.value?.id === row.id) { currentType.value = null; dataList.value = [] }
    await fetchTypeList()
  } catch { /* cancelled */ }
}

// ===== 字典数据 =====
const dataLoading = ref(false)
const dataList = ref<any[]>([])
const currentType = ref<any>(null)

async function handleTypeClick(row:any) {
  currentType.value = row
  await fetchDataList(row.code)
}

async function fetchDataList(typeCode:any) {
  dataLoading.value = true
  try {
    const res = await listDictData({ type_code: typeCode })
    dataList.value = res.rows || res.data || []
  } finally { dataLoading.value = false }
}

const dataDialog = ref({ visible: false, title: '', isEdit: false })
const dataFormRef = ref<FormInstance>()
const dataSubmitLoading = ref(false)
const currentDataEditId = ref<number | null>(null)
const dataForm = ref({ label: '', value: '', sort: 0, status: '1' })
const dataRules = {
  label: [{ required: true, message: '请输入字典标签', trigger: 'blur' }],
  value: [{ required: true, message: '请输入字典键值', trigger: 'blur' }],
}

function resetDataForm() { dataForm.value.label = ''; dataForm.value.value = ''; dataForm.value.sort = 0; dataForm.value.status = '1'; dataFormRef.value?.clearValidate() }

function handleAddData() {
  currentDataEditId.value = null
  dataDialog.value.title = '新增字典数据'; dataDialog.value.isEdit = false
  resetDataForm(); dataDialog.value.visible = true
}

function handleEditData(row:any) {
  currentDataEditId.value = row.id
  dataDialog.value.title = '编辑字典数据'; dataDialog.value.isEdit = true
  resetDataForm()
  dataForm.value.label = row.label; dataForm.value.value = row.value
  dataForm.value.sort = row.sort ?? 0; dataForm.value.status = row.status
  dataDialog.value.visible = true
}

async function handleDataSubmit() {
  const valid = await dataFormRef.value?.validate().catch(() => false)
  if (!valid) return
  dataSubmitLoading.value = true
  try {
    const payload = dataDialog.value.isEdit
      ? { label: dataForm.value.label, value: dataForm.value.value, sort: dataForm.value.sort, status: dataForm.value.status }
      : { type_code: currentType.value.code, label: dataForm.value.label, value: dataForm.value.value, sort: dataForm.value.sort }
    if (dataDialog.value.isEdit) {
      await updateDictData(currentDataEditId.value!, payload as any)
      ElMessage.success('更新成功')
    } else {
      await createDictData(payload as any)
      ElMessage.success('新增成功')
    }
    dataDialog.value.visible = false
    await fetchDataList(currentType.value.code)
  } finally { dataSubmitLoading.value = false }
}

async function handleDeleteData(row:any) {
  try {
    await ElMessageBox.confirm(`确认删除字典数据"${row.label}"吗？`, '警告', { type: 'warning' })
    await deleteDictData(row.id)
    ElMessage.success('删除成功')
    await fetchDataList(currentType.value.code)
  } catch { /* cancelled */ }
}

onMounted(() => fetchTypeList())
</script>


