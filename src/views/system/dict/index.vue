<template>
  <div class="page-container">
    <div class="dict-layout">
      <div class="dict-panel">
        <el-card shadow="never">
          <template #header>
            <div class="card-header">
              <span>字典类型</span>
              <div>
                <el-button
                  v-perm="'system:dict:export'"
                  size="small"
                  icon="Download"
                  :loading="exportLoading"
                  @click="handleExport"
                >
                  导出
                </el-button>
                <el-button
                  v-perm="'system:dict:add'"
                  type="primary"
                  size="small"
                  icon="Plus"
                  @click="handleAddType"
                >
                  新增
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
            <el-table-column prop="name" label="字典名称" min-width="110" show-overflow-tooltip />
            <el-table-column prop="code" label="字典编码" show-overflow-tooltip />
            <el-table-column prop="status" label="状态" align="center">
              <template #default="{ row }">
                <el-tag :type="row.status === '1' ? 'success' : 'danger'" size="small">
                  {{ row.status === '1' ? '正常' : '停用' }}
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column label="操作" fixed="right" align="center">
              <template #default="{ row }">
                <el-button
                  v-perm="'system:dict:edit'"
                  type="primary"
                  link
                  icon="Edit"
                  size="small"
                  @click.stop="handleEditType(row)"
                >
                  编辑
                </el-button>
                <el-button
                  v-perm="'system:dict:remove'"
                  type="danger"
                  link
                  icon="Delete"
                  size="small"
                  @click.stop="handleDeleteType(row)"
                >
                  删除
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
            @change="fetchTypeList"
          />
        </el-card>
      </div>

      <div class="dict-panel">
        <el-card shadow="never">
          <template #header>
            <div class="card-header">
              <span>字典数据{{ currentType ? ` — ${currentType.name}` : '' }}</span>
              <el-button
                v-if="currentType"
                v-perm="'system:dict:add'"
                type="primary"
                size="small"
                icon="Plus"
                @click="handleAddData"
              >
                新增
              </el-button>
            </div>
          </template>
          <el-table v-loading="dataLoading" :data="dataList" border stripe>
            <el-table-column prop="label" label="字典标签" min-width="120" show-overflow-tooltip />
            <el-table-column prop="value" label="字典键值" />
            <el-table-column prop="sort" label="排序" align="center" />
            <el-table-column prop="status" label="状态" align="center">
              <template #default="{ row }">
                <el-tag :type="row.status === '1' ? 'success' : 'danger'" size="small">
                  {{ row.status === '1' ? '正常' : '停用' }}
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column label="操作" align="center">
              <template #default="{ row }">
                <el-button
                  v-perm="'system:dict:edit'"
                  type="primary"
                  link
                  icon="Edit"
                  size="small"
                  @click="handleEditData(row)"
                >
                  编辑
                </el-button>
                <el-button
                  v-perm="'system:dict:remove'"
                  type="danger"
                  link
                  icon="Delete"
                  size="small"
                  @click="handleDeleteData(row)"
                >
                  删除
                </el-button>
              </template>
            </el-table-column>
          </el-table>
          <el-empty v-if="!currentType" description="请在左侧选择字典类型" />
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
import DictDataDialog from './components/DictDataDialog.vue'
import DictTypeDialog from './components/DictTypeDialog.vue'
import { useDictManagement } from './composables/useDictManagement'

const {
  currentType,
  dataDialogVisible,
  dataList,
  dataLoading,
  editingData,
  editingType,
  exportLoading,
  fetchTypeList,
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
