<template>
  <div class="page-container">
    <div class="dict-layout">
      <div class="dict-panel">
        <el-card shadow="never">
          <template #header>
            <div class="card-header">
              <span>{{ t('system.dict.typeTitle') }}</span>
              <div>
                <el-button
                  v-perm="'system:dict:export'"
                  size="small"
                  icon="Download"
                  :loading="exportLoading"
                  @click="handleExport"
                >
                  {{ t('system.common.export') }}
                </el-button>
                <el-button
                  v-perm="'system:dict:add'"
                  type="primary"
                  size="small"
                  icon="Plus"
                  @click="handleAddType"
                >
                  {{ t('system.common.add') }}
                </el-button>
              </div>
            </div>
          </template>

          <el-table
            v-loading="typeLoading"
            :data="typeList"
            border
            stripe
            highlight-current-row
            @row-click="handleTypeClick"
          >
            <el-table-column prop="name" :label="t('system.dict.name')" min-width="110" show-overflow-tooltip />
            <el-table-column prop="code" :label="t('system.dict.code')" show-overflow-tooltip />
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
                  v-perm="'system:dict:edit'"
                  type="primary"
                  link
                  icon="Edit"
                  size="small"
                  @click.stop="handleEditType(row)"
                >
                  {{ t('system.common.edit') }}
                </el-button>
                <el-button
                  v-perm="'system:dict:remove'"
                  type="danger"
                  link
                  icon="Delete"
                  size="small"
                  :loading="deletingTypeId === row.id"
                  @click.stop="handleDeleteType(row)"
                >
                  {{ t('system.common.delete') }}
                </el-button>
              </template>
            </el-table-column>
          </el-table>
          <el-pagination
            v-model:current-page="typePage.page"
            v-model:page-size="typePage.page_size"
            :total="typeTotal"
            :page-sizes="[10, 20, 50]"
            layout="total, prev, pager, next"
            size="small"
            background
            class="dict-pagination"
          />
        </el-card>
      </div>

      <div class="dict-panel">
        <el-card shadow="never">
          <template #header>
            <div class="card-header">
              <span>
                {{ currentType
                  ? t('system.dict.dataTitleWithName', { name: currentType.name })
                  : t('system.dict.dataTitle') }}
              </span>
              <el-button
                v-if="currentType"
                v-perm="'system:dict:add'"
                type="primary"
                size="small"
                icon="Plus"
                @click="handleAddData"
              >
                {{ t('system.common.add') }}
              </el-button>
            </div>
          </template>
          <el-table v-if="currentType" v-loading="dataLoading" :data="dataList" border stripe>
            <el-table-column prop="label" :label="t('system.dict.label')" min-width="120" show-overflow-tooltip />
            <el-table-column prop="value" :label="t('system.dict.value')" />
            <el-table-column prop="sort" :label="t('system.common.sort')" align="center" />
            <el-table-column prop="status" :label="t('system.common.status')" align="center">
              <template #default="{ row }">
                <el-tag :type="row.status === '1' ? 'success' : 'danger'" size="small">
                  {{ row.status === '1' ? t('system.common.normal') : t('system.common.disabled') }}
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column :label="t('system.common.actions')" align="center">
              <template #default="{ row }">
                <el-button
                  v-perm="'system:dict:edit'"
                  type="primary"
                  link
                  icon="Edit"
                  size="small"
                  @click="handleEditData(row)"
                >
                  {{ t('system.common.edit') }}
                </el-button>
                <el-button
                  v-perm="'system:dict:remove'"
                  type="danger"
                  link
                  icon="Delete"
                  size="small"
                  :loading="deletingDataId === row.id"
                  @click="handleDeleteData(row)"
                >
                  {{ t('system.common.delete') }}
                </el-button>
              </template>
            </el-table-column>
          </el-table>
          <el-empty v-else :description="t('system.dict.selectType')" />
        </el-card>
      </div>
    </div>

    <DictTypeDialog
      v-model="typeDialogVisible"
      :dict-type="editingType"
      @saved="handleTypeSaved"
    />
    <DictDataDialog
      v-model="dataDialogVisible"
      :dict-data="editingData"
      :type-code="currentType?.code ?? null"
      @saved="handleDataSaved"
    />
  </div>
</template>

<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import DictDataDialog from './components/DictDataDialog.vue'
import DictTypeDialog from './components/DictTypeDialog.vue'
import { useDictManagement } from './composables/useDictManagement'

const { t } = useI18n()

const {
  currentType,
  dataDialogVisible,
  dataList,
  dataLoading,
  deletingDataId,
  deletingTypeId,
  editingData,
  editingType,
  exportLoading,
  handleAddData,
  handleAddType,
  handleDataSaved,
  handleDeleteData,
  handleDeleteType,
  handleEditData,
  handleEditType,
  handleExport,
  handleTypeClick,
  handleTypeSaved,
  typeDialogVisible,
  typeList,
  typeLoading,
  typePage,
  typeTotal,
} = useDictManagement()
</script>

<style scoped>
.dict-layout {
  display: grid;
  grid-template-columns: minmax(320px, 1fr) minmax(0, 2fr);
  gap: 12px;
  align-items: start;
}

.dict-panel {
  min-width: 0;
}

.dict-pagination {
  margin-top: 8px;
  justify-content: flex-end;
}

@media (width <= 1000px) {
  .dict-layout {
    grid-template-columns: minmax(0, 1fr);
  }
}
</style>
