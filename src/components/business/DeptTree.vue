<template>
  <div class="dept-tree-container">
    <el-input
      v-if="filterable"
      v-model="filterText"
      placeholder="输入部门名称搜索"
      clearable
      size="small"
      style="margin-bottom:8px"
    />
    <el-tree
      ref="treeRef"
      :data="treeData"
      :props="defaultProps"
      :node-key="nodeKey"
      :default-expand-all="defaultExpandAll"
      :default-checked-keys="checkedKeys"
      :check-strictly="checkStrictly"
      :show-checkbox="showCheckbox"
      :filter-node-method="filterNode"
      :highlight-current="highlightCurrent"
      class="dept-tree"
      @check="onCheck"
      @node-click="onNodeClick"
    />
  </div>
</template>

<script setup lang="ts">
import type { ElTree } from 'element-plus'
import { listDept } from '@/api/modules/dept'

interface Props {
  modelValue?: number | number[]
  placeholder?: string
  multiple?: boolean
  filterable?: boolean
  defaultExpandAll?: boolean
  checkStrictly?: boolean
  highlightCurrent?: boolean
  nodeKey?: string
}

const props = withDefaults(defineProps<Props>(), {
  defaultExpandAll: true,
  checkStrictly: false,
  highlightCurrent: true,
  nodeKey: 'id',
})

const emit = defineEmits<{
  'update:modelValue': [val: number | number[]]
  change: [val: number | number[]]
}>()

const showCheckbox = computed(() => props.multiple || Array.isArray(props.modelValue))
const checkedKeys = computed(() => {
  if (!props.modelValue) return []
  return Array.isArray(props.modelValue) ? props.modelValue : [props.modelValue]
})

const treeRef = ref<InstanceType<typeof ElTree>>()
const treeData = ref<any[]>([])
const filterText = ref('')

const defaultProps = {
  children: 'children',
  label: 'name',
  value: 'id',
}

function filterNode(value: string, data: any): boolean {
  if (!value) return true
  return data.name?.includes(value)
}

watch(filterText, (val) => {
  treeRef.value?.filter(val)
})

async function loadDeptTree() {
  try {
    const res = await listDept({}) as any
    treeData.value = res.rows || []
  } catch { /* ignore */ }
}

function onCheck(node: any, { checkedNodes }: any) {
  if (props.multiple) {
    const ids = checkedNodes.map((n: any) => n.id)
    emit('update:modelValue', ids)
    emit('change', ids)
  }
}

function onNodeClick(data: any) {
  if (!props.multiple) {
    emit('update:modelValue', data.id)
    emit('change', data.id)
  }
}

onMounted(() => { loadDeptTree() })

defineExpose({ treeData, loadDeptTree })
</script>

<style scoped>
.dept-tree-container {
  border: 1px solid var(--el-border-color);
  border-radius: 4px;
  padding: 8px;
  max-height: 400px;
  overflow-y: auto;
}
.dept-tree {
  min-height: 200px;
}
</style>
