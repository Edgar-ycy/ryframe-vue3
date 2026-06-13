<template>
  <div class="pagination-container" :class="{ 'pagination-hidden': !total }">
    <el-pagination
      v-model:current-page="currentPage"
      v-model:page-size="currentPageSize"
      :total="total"
      :page-sizes="pageSizes"
      :layout="layout"
      :background="background"
      :small="small"
      v-bind="$attrs"
      @size-change="handleSizeChange"
      @current-change="handleCurrentChange"
    />
  </div>
</template>

<script setup lang="ts">
import type { WritableComputedRef } from 'vue'

interface Props {
  total: number
  page?: number
  pageSize?: number
  pageSizes?: number[]
  layout?: string
  background?: boolean
  small?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  total: 0,
  page: 1,
  pageSize: 10,
  pageSizes: () => [10, 20, 50, 100],
  layout: 'total, sizes, prev, pager, next, jumper',
  background: true,
  small: false,
})

const emit = defineEmits<{
  'update:page': [page: number]
  'update:pageSize': [pageSize: number]
  'change': []
}>()

const currentPage = computed({
  get: () => props.page,
  set: (v) => emit('update:page', v),
}) as WritableComputedRef<number>
const currentPageSize = computed({
  get: () => props.pageSize,
  set: (v) => emit('update:pageSize', v),
}) as WritableComputedRef<number>

function handleSizeChange(pageSize: number) {
  emit('update:pageSize', pageSize)
  emit('change')
}

function handleCurrentChange(page: number) {
  emit('update:page', page)
  emit('change')
}
</script>

<style scoped>
.pagination-container {
  display: flex;
  justify-content: flex-end;
  margin-top: 12px;
}
.pagination-hidden {
  visibility: hidden;
}
</style>
