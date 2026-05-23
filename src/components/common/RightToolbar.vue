<template>
  <div class="right-toolbar">
    <el-row :gutter="10" justify="end" align="middle">
      <el-col :span="1.5">
        <el-button type="primary" icon="Search" @click="$emit('search')">搜索</el-button>
      </el-col>
      <el-col :span="1.5">
        <el-button icon="RefreshRight" @click="$emit('reset')">重置</el-button>
      </el-col>
      <el-col :span="1.5" v-if="showColumns">
        <el-dropdown trigger="click" @command="(col: string) => $emit('column-change', col)">
          <el-button icon="Operation">
            <el-icon style="margin-left:4px"><ArrowDown /></el-icon>
          </el-button>
          <template #dropdown>
            <el-dropdown-menu>
              <el-dropdown-item
                v-for="col in columns"
                :key="col.prop"
                :command="col.prop"
              >
                <el-checkbox
                  :model-value="col.visible !== false"
                  :label="col.label"
                  @click.stop
                  @change="(val: boolean) => $emit('column-toggle', col.prop, val)"
                />
              </el-dropdown-item>
            </el-dropdown-menu>
          </template>
        </el-dropdown>
      </el-col>
      <el-col :span="1.5" v-if="showExport">
        <el-button icon="Download" @click="$emit('export')">导出</el-button>
      </el-col>
      <el-col :span="1.5" v-if="showRefresh">
        <el-tooltip content="刷新" placement="top">
          <el-button icon="Refresh" circle @click="$emit('refresh')" />
        </el-tooltip>
      </el-col>
    </el-row>
  </div>
</template>

<script setup lang="ts">
interface ColumnConfig {
  prop: string
  label: string
  visible?: boolean
}

interface Props {
  columns?: ColumnConfig[]
  showColumns?: boolean
  showExport?: boolean
  showRefresh?: boolean
}

withDefaults(defineProps<Props>(), {
  columns: () => [],
  showColumns: false,
  showExport: false,
  showRefresh: false,
})

defineEmits<{
  search: []
  reset: []
  'column-change': [prop: string]
  'column-toggle': [prop: string, visible: boolean]
  export: []
  refresh: []
}>()
</script>
