<template>
  <div class="user-management">
    <!-- 左侧：部门树 -->
    <div class="user-management__left">
      <el-card shadow="never" class="dept-tree-card">
        <template #header>
          <div class="card-header">
            <span>组织架构</span>
          </div>
        </template>

        <!-- 部门树加载中 -->
        <div v-if="deptTreeLoading" v-loading="deptTreeLoading" class="tree-loading-placeholder" />

        <!-- 部门树空数据 -->
        <el-empty v-else-if="deptTree.length === 0" description="暂无部门数据" :image-size="80" />

        <!-- 部门树 -->
        <div v-else class="dept-tree-wrapper">
          <el-input
            v-model="deptFilterText"
            placeholder="搜索部门"
            :prefix-icon="Search"
            clearable
            size="small"
            class="dept-filter-input"
          />
          <el-scrollbar class="dept-tree-scroll">
            <el-tree
              ref="deptTreeRef"
              :data="displayDeptTree"
              :props="{ label: 'name', children: 'children' }"
              node-key="id"
              :highlight-current="true"
              :expand-on-click-node="true"
              :filter-node-method="filterDeptNode"
              :default-expand-all="true"
              @node-click="handleDeptNodeClick"
            >
              <template #default="{ node, data }">
                <span class="dept-tree-node">
                  <el-icon v-if="!data.id" class="dept-tree-icon"><Folder /></el-icon>
                  <el-icon v-else class="dept-tree-icon"><FolderOpened /></el-icon>
                  <span>{{ node.label }}</span>
                </span>
              </template>
            </el-tree>
          </el-scrollbar>
        </div>
      </el-card>
    </div>

    <!-- 右侧：用户列表 -->
    <div class="user-management__right">
      <!-- 搜索栏 -->
      <el-card shadow="never" class="search-card">
        <div class="search-card__header">
          <span class="search-card__title">
            用户列表
            <template v-if="selectedDeptName">
              <el-icon class="search-card__separator"><ArrowRight /></el-icon>
              <el-tag size="small" closable @close="clearDeptFilter">{{ selectedDeptName }}</el-tag>
            </template>
          </span>
        </div>
        <el-form :model="queryParams" inline>
          <el-form-item label="用户名">
            <el-input v-model="queryParams.username" placeholder="请输入用户名" clearable @keyup.enter="handleSearch" />
          </el-form-item>
          <el-form-item label="手机号">
            <el-input v-model="queryParams.phone" placeholder="请输入手机号" clearable @keyup.enter="handleSearch" />
          </el-form-item>
          <el-form-item label="状态">
            <el-select v-model="queryParams.status" placeholder="用户状态" clearable style="width:120px">
              <el-option label="正常" value="1" />
              <el-option label="停用" value="0" />
            </el-select>
          </el-form-item>
          <el-form-item>
            <el-button v-perm="'system:user:list'" type="primary" icon="Search" @click="handleSearch">搜索</el-button>
            <el-button v-perm="'system:user:list'" icon="Refresh" @click="handleReset">重置</el-button>
          </el-form-item>
        </el-form>
      </el-card>

      <!-- 表格 -->
      <el-card shadow="never" class="table-card">
        <template #header>
          <div class="card-header">
            <span>用户列表</span>
            <div>
              <el-button v-perm="'system:user:export'" icon="Download" :loading="exportLoading" @click="handleExport">导出</el-button>
              <el-button v-perm="'system:user:add'" type="primary" icon="Plus" @click="handleAdd">新增</el-button>
            </div>
          </div>
        </template>

        <!-- 加载中 -->
        <el-table v-loading="loading" :data="tableData" border stripe @selection-change="handleSelectionChange">
          <el-table-column prop="id" label="ID" width="70" align="center" />
          <el-table-column prop="username" label="用户名" show-overflow-tooltip />
          <el-table-column prop="nickname" label="昵称" show-overflow-tooltip />
          <el-table-column prop="email" label="邮箱" show-overflow-tooltip />
          <el-table-column prop="phone" label="手机号" show-overflow-tooltip />
          <el-table-column prop="dept_name" label="部门" show-overflow-tooltip />
          <el-table-column prop="status" label="状态" align="center">
            <template #default="{ row }">
              <el-switch
                v-if="hasPermission('system:user:edit')"
                v-model="row.status"
                :active-value="'1'"
                :inactive-value="'0'"
                @change="(val) => handleChangeStatus(row, val)"
              />
              <el-tag v-else :type="row.status === '1' ? 'success' : 'danger'" size="small">
                {{ row.status === '1' ? '正常' : '停用' }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column prop="created_at" label="创建时间" />
          <el-table-column label="操作" min-width="100" fixed="right" align="center">
            <template #default="{ row }">
              <el-button v-perm="'system:user:edit'" type="primary" link icon="Edit" @click="handleEdit(row)">编辑</el-button>
              <el-button v-perm="'system:user:edit'" type="warning" link icon="Key" @click="handleResetPwd(row)">发起重置</el-button>
              <el-button v-perm="'system:user:remove'" type="danger" link icon="Delete" :loading="deletingId === row.id" @click="handleDelete(row)">删除</el-button>
            </template>
          </el-table-column>

          <!-- 空数据 -->
          <template #empty>
            <el-empty description="暂无用户数据" :image-size="100" />
          </template>
        </el-table>

        <el-pagination
          v-if="total > 0"
          v-model:current-page="queryParams.page"
          v-model:page-size="queryParams.pageSize"
          :total="total"
          :page-sizes="[10, 20, 50, 100]"
          layout="total, sizes, prev, pager, next, jumper"
          background
          @change="fetchData"
        />
      </el-card>
    </div>

    <!-- 新增/编辑弹窗 -->
    <el-dialog v-model="dialog.visible" :title="dialog.title" width="580px" @close="resetForm">
      <el-form ref="formRef" :model="form" :rules="rules" label-width="80px">
        <el-form-item label="用户名" prop="username">
          <el-input v-model="form.username" :disabled="dialog.isEdit" placeholder="请输入用户名" maxlength="50" />
        </el-form-item>
        <el-form-item label="昵称" prop="nickname">
          <el-input v-model="form.nickname" placeholder="请输入昵称" maxlength="50" />
        </el-form-item>
        <el-form-item label="邮箱">
          <el-input v-model="form.email" placeholder="请输入邮箱" />
        </el-form-item>
        <el-form-item label="手机号">
          <el-input v-model="form.phone" placeholder="请输入手机号" />
        </el-form-item>
        <el-form-item label="部门">
          <el-tree-select
            v-model="form.dept_id"
            :data="deptTree"
            :props="{ label: 'name', value: 'id', children: 'children' }"
            placeholder="选择部门"
            clearable
            check-strictly
            style="width:100%"
          />
        </el-form-item>
        <el-form-item v-if="dialog.isEdit" label="状态">
          <el-radio-group v-model="form.status">
            <el-radio value="1">正常</el-radio>
            <el-radio value="0">停用</el-radio>
          </el-radio-group>
        </el-form-item>
        <el-form-item label="角色">
          <el-select v-model="form.role_ids" multiple placeholder="请选择角色" :disabled="disableRoleSelect" style="width:100%">
            <el-option v-for="r in assignableRoleList" :key="r.id" :label="r.name" :value="r.id" :disabled="r.status !== '1'" />
          </el-select>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialog.visible = false">取消</el-button>
        <el-button v-if="dialog.isEdit" v-perm="'system:user:edit'" type="primary" :loading="submitLoading" @click="handleSubmit">确定</el-button>
        <el-button v-else v-perm="'system:user:add'" type="primary" :loading="submitLoading" @click="handleSubmit">确定</el-button>
      </template>
    </el-dialog>

    <!-- 发起密码重置弹窗 -->
    <el-dialog v-model="pwdDialog.visible" title="发起密码重置" width="420px">
      <el-form ref="pwdFormRef" :model="pwdForm" :rules="pwdRules" label-width="80px">
        <el-form-item label="原因" prop="reason">
          <el-input
            v-model="pwdForm.reason"
            type="textarea"
            :rows="4"
            maxlength="512"
            show-word-limit
            placeholder="请输入发起密码重置的原因"
          />
        </el-form-item>
      </el-form>
      <el-alert
        v-if="pwdResetLink"
        type="success"
        title="重置链接已生成"
        :closable="false"
        show-icon
        class="reset-link-alert"
      />
      <el-input
        v-if="pwdResetLink"
        :model-value="pwdResetLink"
        readonly
        class="reset-link-input"
      >
        <template #append>
          <el-button v-perm="'system:user:edit'" icon="DocumentCopy" @click="copyResetLink">复制</el-button>
        </template>
      </el-input>
      <template #footer>
        <el-button @click="pwdDialog.visible = false">取消</el-button>
        <el-button v-perm="'system:user:edit'" type="primary" :loading="pwdLoading" @click="handlePwdSubmit">发起</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import {ArrowRight, Folder, FolderOpened, Search} from '@element-plus/icons-vue'
import { listUser, getUser, createUser, updateUser, assignRole, deleteUser, requestPasswordReset, changeUserStatus, exportUser } from '@/api/modules/user'
import type { PasswordResetRequestResult } from '@/api/modules/user'
import { listRole } from '@/api/modules/role'
import { getDeptTree } from '@/api/modules/dept'
import { usePermission } from '@/hooks/usePermission'
import { useDownload } from '@/hooks/useDownload'
import { useUserStore } from '@/stores/user'

// ===== 部门树（左侧） =====
const deptTreeRef = ref()
const deptTree = ref<any[]>([])
const deptTreeLoading = ref(false)
const deptFilterText = ref('')
const selectedDeptId = ref<number | undefined>(undefined)
const selectedDeptName = ref('')

/** 带"全部"根节点的展示树 */
const displayDeptTree = ref<any[]>([])

async function loadDeptTree() {
  deptTreeLoading.value = true
  try {
    const res = await getDeptTree()
    deptTree.value = (res as any).data || (res as any).rows || []
    displayDeptTree.value = [{ id: 0, name: '全部', children: deptTree.value }]
  } finally {
    deptTreeLoading.value = false
  }
}

function filterDeptNode(value: string, data: any) {
  if (!value) return true
  return (data.name || '').includes(value)
}

/** 监听部门搜索文字变化 */
watch(deptFilterText, (val) => {
  deptTreeRef.value?.filter(val)
})

/** 点击部门树节点 */
function handleDeptNodeClick(data: any) {
  if (data.id === 0) {
    // 选中"全部"
    selectedDeptId.value = undefined
    selectedDeptName.value = ''
  } else {
    selectedDeptId.value = data.id
    selectedDeptName.value = data.name
  }
  queryParams.value.dept_id = selectedDeptId.value
  handleSearch()
}

/** 清除部门过滤 */
function clearDeptFilter() {
  selectedDeptId.value = undefined
  selectedDeptName.value = ''
  queryParams.value.dept_id = undefined
  deptTreeRef.value?.setCurrentKey(null)
  handleSearch()
}

// ===== 用户搜索 & 表格（右侧） =====
const loading = ref(false)
const tableData = ref<any[]>([])
const total = ref(0)
const selectIds = ref<any[]>([])
const roleList = ref<any[]>([])
const { isAdmin, hasPermission } = usePermission()
const { downloading: exportLoading, downloadBlob } = useDownload()
const userStore = useUserStore()
const assignableRoleList = computed(() =>
  isAdmin() ? roleList.value : roleList.value.filter(role => role.is_super !== 1 && role.code !== 'admin'),
)

const queryParams = ref({
  page: 1,
  pageSize: 10,
  username: '',
  phone: '',
  status: '',
  dept_id: undefined as number | undefined,
})

function handleExport() {
  return downloadBlob(() => exportUser(queryParams.value), { filename: '用户数据.xlsx' })
}

async function fetchData() {
  loading.value = true
  try {
    const res = await listUser(queryParams.value)
    if (Array.isArray(res.rows)) {
      tableData.value = res.rows
    }
    if (typeof res.total === 'number') {
      total.value = res.total
    }
    selectIds.value = []
  } finally {
    loading.value = false
  }
}

async function loadRoleList() {
  const res = await listRole({ page: 1, pageSize: 1000 })
  roleList.value = (res as any).rows || []
}

function hasForbiddenRoleSelection() {
  if (isAdmin()) return false
  const adminRole = roleList.value.find(role => role.is_super === 1 || role.code === 'admin')
  return !!adminRole && form.value.role_ids.includes(adminRole.id)
}

function handleSearch() {
  queryParams.value.page = 1
  fetchData()
}

function handleReset() {
  queryParams.value.username = ''
  queryParams.value.phone = ''
  queryParams.value.status = ''
  handleSearch()
}

function handleSelectionChange(rows: any[]) {
  selectIds.value = rows.map(r => r.id)
}

// ===== 状态切换 =====
async function handleChangeStatus(row: any, val: string) {
  const text = val === '1' ? '启用' : '停用'
  try {
    await ElMessageBox.confirm(`确认要${text}"${row.username}"吗？`, '提示', { type: 'warning' })
    await changeUserStatus({ user_id: row.id, status: val })
    ElMessage.success(`${text}成功`)
  } catch {
    row.status = val === '1' ? '0' : '1'
  }
}

// ===== 新增/编辑 =====
const dialog = ref({ visible: false, title: '', isEdit: false })
const formRef = ref<FormInstance>()
const submitLoading = ref(false)
const currentEditId = ref<number | null>(null)
const disableRoleSelect = ref(false)

const form = ref({
  username: '', nickname: '', email: '', phone: '',
  dept_id: undefined as number | undefined, status: '1', role_ids: [] as any[],
})

const rules: FormRules = {
  username: [{ required: true, message: '请输入用户名', trigger: 'blur' }],
  nickname: [{ required: true, message: '请输入昵称', trigger: 'blur' }],
  email: [{ type: 'email', message: '请输入正确的邮箱地址', trigger: 'blur' }],
}

function resetForm() {
  form.value = {
    username: '', nickname: '', email: '', phone: '',
    dept_id: undefined, status: '1', role_ids: [],
  }
  currentEditId.value = null
  disableRoleSelect.value = false
  formRef.value?.clearValidate()
}

function handleAdd() {
  currentEditId.value = null
  dialog.value.title = '新增用户'
  dialog.value.isEdit = false
  resetForm()
  dialog.value.visible = true
}

async function handleEdit(row: any) {
  dialog.value.title = '编辑用户'
  dialog.value.isEdit = true
  resetForm()
  currentEditId.value = row.id
  disableRoleSelect.value = String(row.id) === String(userStore.userId) && !userStore.isSuper
  const res = await getUser(row.id)
  const d = res.data || res
  form.value.username = d.username || d.user?.username || ''
  form.value.nickname = d.nickname || d.user?.nickname || ''
  form.value.email = d.email || d.user?.email || ''
  form.value.phone = d.phone || d.user?.phone || ''
  form.value.dept_id = d.dept_id ?? d.user?.dept_id
  form.value.status = d.status ?? d.user?.status ?? '1'
  const roles = d.roles || d.user?.roles || []
  form.value.role_ids = roles.map((r: any) => typeof r === 'object' ? r.id : r)
  dialog.value.visible = true
}

async function handleSubmit() {
  const fields = dialog.value.isEdit ? ['nickname'] : ['username', 'nickname']
  const valid = await formRef.value?.validateField(fields).catch(() => false)
  if (valid === false) return
  if (hasForbiddenRoleSelection()) {
    ElMessage.warning('禁止分配超级管理员角色')
    return
  }

  submitLoading.value = true
  try {
    if (dialog.value.isEdit) {
      const data = {
        nickname: form.value.nickname,
        email: form.value.email || undefined,
        phone: form.value.phone || undefined,
        dept_id: form.value.dept_id,
        status: form.value.status,
      }
      await updateUser(currentEditId.value!, data as any)
      if (!disableRoleSelect.value) {
        await assignRole(currentEditId.value!, form.value.role_ids)
      }
      ElMessage.success('更新成功')
    } else {
      const data = {
        username: form.value.username,
        nickname: form.value.nickname,
        email: form.value.email || undefined,
        phone: form.value.phone || undefined,
        dept_id: form.value.dept_id,
      }
      const res = await createUser(data as any) as any
      const user = res.data || res
      await assignRole(user.id, form.value.role_ids)
      ElMessage.success('用户已创建，状态为待激活')
    }
    dialog.value.visible = false
    fetchData()
  } finally {
    submitLoading.value = false
  }
}

// ===== 删除 =====
const deletingId = ref<number | null>(null)

async function handleDelete(row: any) {
  try {
    await ElMessageBox.confirm(
      `确认删除用户"${row.username}"吗？`,
      '警告',
      { type: 'warning', confirmButtonText: '确认删除' },
    )
    deletingId.value = row.id
    await deleteUser(row.id)
    ElMessage.success('删除成功')
    await fetchData()
  } catch {
    /* cancelled or error */
  } finally {
    deletingId.value = null
  }
}

// ===== 重置密码 =====
const pwdDialog = ref({ visible: false })
const pwdFormRef = ref<FormInstance>()
const pwdForm = ref({ reason: '' })
const pwdLoading = ref(false)
const pwdUserId = ref<number | null>(null)
const pwdResult = ref<PasswordResetRequestResult | null>(null)
const pwdResetLink = computed(() => {
  const url = pwdResult.value?.reset_url
  if (!url) return ''
  return new URL(url, window.location.origin).toString()
})

const pwdRules = {
  reason: [
    { required: true, message: '请输入重置原因', trigger: 'blur' },
  ],
}

function handleResetPwd(row: any) {
  pwdUserId.value = row.id
  pwdForm.value.reason = ''
  pwdResult.value = null
  pwdFormRef.value?.clearValidate()
  pwdDialog.value.visible = true
}

async function handlePwdSubmit() {
  const valid = await pwdFormRef.value?.validate().catch(() => false)
  if (!valid) return
  pwdLoading.value = true
  try {
    const res = await requestPasswordReset(pwdUserId.value!, { reason: pwdForm.value.reason.trim() })
    pwdResult.value = (res as any).data || (res as any)
    ElMessage.success('密码重置请求已发起')
  } finally {
    pwdLoading.value = false
  }
}

async function copyResetLink() {
  if (!pwdResetLink.value) return
  await navigator.clipboard.writeText(pwdResetLink.value)
  ElMessage.success('重置链接已复制')
}

// ===== 初始化 =====
onMounted(() => {
  fetchData()
  loadDeptTree()
  loadRoleList()
})
</script>

<style scoped lang="scss">
.user-management {
  display: flex;
  gap: 12px;
  height: calc(100vh - var(--navbar-height) - var(--tags-view-height) - 40px);
  min-height: 600px;

  // ===== 左侧部门树 =====
  &__left {
    width: 280px;
    flex-shrink: 0;
  }

  // ===== 右侧用户列表 =====
  &__right {
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: 12px;
    overflow: hidden;
  }
}

// 部门树卡片
.dept-tree-card {
  height: 100%;
  display: flex;
  flex-direction: column;

  :deep(.el-card__body) {
    flex: 1;
    display: flex;
    flex-direction: column;
    overflow: hidden;
    padding: 12px;
  }
}

// 部门树加载占位
.tree-loading-placeholder {
  flex: 1;
  min-height: 200px;
}

// 部门树容器
.dept-tree-wrapper {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.dept-filter-input {
  margin-bottom: 8px;
}

.dept-tree-scroll {
  flex: 1;
  overflow: auto;
}

// 部门树节点样式
.dept-tree-node {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 14px;

  .dept-tree-icon {
    color: var(--color-primary);
    font-size: 16px;
    flex-shrink: 0;
  }
}

// 调整 el-tree 内部样式
:deep(.el-tree) {
  .el-tree-node__content {
    height: 36px;
    border-radius: 6px;
    margin: 1px 0;

    &:hover {
      background-color: var(--border-color-light);
    }
  }

  .el-tree-node.is-current > .el-tree-node__content {
    background-color: rgba(99, 102, 241, 0.1);
    color: var(--color-primary);
    font-weight: 500;
  }
}

// 搜索栏标题
.search-card__header {
  margin-bottom: 12px;
}

.search-card__title {
  font-size: 14px;
  font-weight: 600;
  color: var(--color-text-primary);
  display: inline-flex;
  align-items: center;
  gap: 6px;
}

.search-card__separator {
  color: var(--color-text-secondary);
}

// 表格卡片
.table-card {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;

  :deep(.el-card__body) {
    flex: 1;
    display: flex;
    flex-direction: column;
    overflow: hidden;
  }

  :deep(.el-table) {
    flex: 1;
  }
}

.reset-link-alert {
  margin-top: 8px;
}

.reset-link-input {
  margin-top: 10px;
}

// ===== 响应式 =====
@media (max-width: 1024px) {
  .user-management {
    flex-direction: column;
    height: auto;

    &__left {
      width: 100%;
      max-height: 320px;
    }

    &__right {
      min-height: 500px;
    }
  }

  .dept-tree-card {
    max-height: 320px;
  }
}

@media (max-width: 768px) {
  .user-management {
    gap: 8px;

    &__left {
      max-height: 260px;
    }

    &__right {
      min-height: 400px;
    }
  }

  .dept-tree-card {
    max-height: 260px;
  }

  // 搜索栏在小屏幕上允许换行
  .search-card :deep(.el-form) {
    .el-form-item {
      margin-bottom: 8px;
    }
  }
}
</style>
