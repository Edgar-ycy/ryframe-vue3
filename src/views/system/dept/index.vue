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
        v-loading="loading"
        :data="tableData ?? []"
        border
        stripe
        row-key="id"
        :tree-props="{ children: 'children' }"
      >
        <el-table-column
          prop="name"
          :label="t('system.department.name')"
          min-width="180"
          show-overflow-tooltip
        />
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
            <el-button
              v-perm="'system:dept:add'"
              type="success"
              link
              icon="Plus"
              @click="handleAdd(row.id)"
            >
              {{ t('system.common.add') }}
            </el-button>
            <el-button
              v-perm="'system:dept:edit'"
              type="primary"
              link
              icon="Edit"
              @click="handleEdit(row)"
            >
              {{ t('system.common.edit') }}
            </el-button>
            <el-button
              v-perm="'system:dept:remove'"
              type="danger"
              link
              icon="Delete"
              :loading="deletingId === row.id"
              @click="handleDelete(row)"
            >
              {{ t('system.common.delete') }}
            </el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <!-- 新增/编辑弹窗 -->
    <el-dialog v-model="dialog.visible" :title="dialog.title" width="500px" @close="resetForm">
      <el-form
        ref="formRef"
        v-loading="detailLoading"
        :model="form"
        :rules="rules"
        label-width="80px"
      >
        <el-form-item :label="t('system.department.parent')">
          <el-tree-select
            v-model="form.parent_id"
            :data="deptOptions ?? []"
            :props="{ label: 'name', value: 'id', children: 'children' }"
            :placeholder="t('system.department.rootPlaceholder')"
            clearable
            check-strictly
            style="width: 100%"
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
        <el-button
          v-if="dialog.isEdit"
          v-perm="'system:dept:edit'"
          type="primary"
          :loading="submitLoading"
          @click="handleSubmit"
        >
          {{ t('system.common.confirm') }}
        </el-button>
        <el-button
          v-else
          v-perm="'system:dept:add'"
          type="primary"
          :loading="submitLoading"
          @click="handleSubmit"
        >
          {{ t('system.common.confirm') }}
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { useDeptManagement } from './composables/useDeptManagement'

const { t } = useI18n()
const {
  deletingId,
  deptOptions,
  detailLoading,
  dialog,
  form,
  formRef,
  handleAdd,
  handleDelete,
  handleEdit,
  handleSubmit,
  loading,
  resetForm,
  rules,
  submitLoading,
  tableData,
} = useDeptManagement(t)
void formRef
</script>
