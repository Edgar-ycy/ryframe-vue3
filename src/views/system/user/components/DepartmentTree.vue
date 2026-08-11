<template>
  <el-card shadow="never" class="department-tree">
    <template #header>
      <div class="card-header">
        <span>{{ t('system.user.organization') }}</span>
      </div>
    </template>

    <div v-if="loading" v-loading="loading" class="department-tree__loading" />
    <el-empty v-else-if="nodes.length === 0" :description="t('system.user.noDepartments')" :image-size="80" />
    <div v-else class="department-tree__content">
      <el-input
        :model-value="filterText"
        :placeholder="t('system.user.searchDepartment')"
        :prefix-icon="Search"
        clearable
        size="small"
        class="department-tree__filter"
        @update:model-value="handleFilterChange"
      />
      <el-scrollbar class="department-tree__scroll">
        <el-tree
          ref="treeRef"
          :data="displayNodes"
          :props="{ label: 'name', children: 'children' }"
          node-key="id"
          :current-node-key="props.selectedId ?? ''"
          highlight-current
          expand-on-click-node
          default-expand-all
          :filter-node-method="filterNode"
          @node-click="selectNode"
        >
          <template #default="{ node, data }">
            <span class="department-tree__node">
              <el-icon class="department-tree__icon">
                <Folder v-if="!data.id" />
                <FolderOpened v-else />
              </el-icon>
              <span>{{ node.label }}</span>
            </span>
          </template>
        </el-tree>
      </el-scrollbar>
    </div>
  </el-card>
</template>

<script setup lang="ts">
import { Folder, FolderOpened, Search } from '@element-plus/icons-vue'
import { useI18n } from 'vue-i18n'
import type { DeptNode } from '@/api/modules/dept'
import type { Id } from '@/shared/http/types'
import type { TreeInstance } from 'element-plus'

const { t } = useI18n()

interface DepartmentOption {
  id: Id
  name: string
  children?: DepartmentOption[]
}

const props = defineProps<{
  nodes: DeptNode[]
  loading: boolean
  selectedId?: Id
}>()

const emit = defineEmits<{
  select: [department: { id?: Id, name: string }]
}>()

const treeRef = ref<TreeInstance>()
const filterText = ref('')
const displayNodes = computed<DepartmentOption[]>(() => [
  { id: '', name: t('system.user.allDepartments'), children: props.nodes },
])

function handleFilterChange(value: string): void {
  filterText.value = value
  treeRef.value?.filter(value)
}

function filterNode(value: string, node: DepartmentOption): boolean {
  return !value || node.name.includes(value)
}

function selectNode(node: DepartmentOption): void {
  emit('select', node.id === '' ? { name: '' } : { id: node.id, name: node.name })
}
</script>

<style scoped lang="scss">
.department-tree {
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

  &__loading {
    flex: 1;
    min-height: 200px;
  }

  &__content {
    flex: 1;
    display: flex;
    flex-direction: column;
    overflow: hidden;
  }

  &__filter {
    margin-bottom: 8px;
  }

  &__scroll {
    flex: 1;
    overflow: auto;
  }

  &__node {
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 14px;
  }

  &__icon {
    color: var(--color-primary);
    font-size: 16px;
    flex-shrink: 0;
  }

  :deep(.el-tree-node__content) {
    height: 36px;
    border-radius: 6px;
    margin: 1px 0;

    &:hover {
      background-color: var(--border-color-light);
    }
  }

  :deep(.el-tree-node.is-current > .el-tree-node__content) {
    background-color: var(--el-color-primary-light-9);
    color: var(--color-primary);
    font-weight: 500;
  }
}

@media (width <= 1024px) {
  .department-tree {
    max-height: 320px;
  }
}

@media (width <= 768px) {
  .department-tree {
    max-height: 260px;
  }
}
</style>
