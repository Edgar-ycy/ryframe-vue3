<template>
  <el-button
    :icon="resolveElementIcon(selectedIcon, 'Plus')"
    :aria-label="selectedIcon ? `更换图标，当前为 ${selectedIcon}` : '选择图标'"
    @click="openDialog"
  >
    {{ selectedIcon ? '' : '选择图标' }}
  </el-button>
  <el-dialog v-model="dialogVisible" title="图标选择器" width="600px" append-to-body>
    <el-input v-model="search" placeholder="搜索图标" clearable style="margin-bottom:12px" />
    <el-tabs v-model="activeTab">
      <el-tab-pane label="Element Plus" name="ep">
        <div class="icon-grid">
          <button
            v-for="icon in filteredIcons"
            :key="icon"
            type="button"
            class="icon-item"
            :class="{ active: pendingIcon === icon }"
            :aria-label="`选择 ${icon} 图标`"
            :aria-pressed="pendingIcon === icon"
            @click="selectIcon(icon)"
          >
            <el-icon :size="20"><component :is="icon" /></el-icon>
            <span class="icon-name">{{ icon }}</span>
          </button>
        </div>
      </el-tab-pane>
    </el-tabs>
    <template #footer>
      <el-button @click="closeDialog">取消</el-button>
      <el-button type="primary" @click="confirmSelection">确定</el-button>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { elementIcons, resolveElementIcon } from '@/shared/ui/icons'
import { useIconSelection } from './iconSelection'

const props = defineProps<{
  modelValue?: string
}>()

const emit = defineEmits<{
  'update:modelValue': [val: string]
}>()

const search = ref('')
const activeTab = ref('ep')
const {
  closeDialog,
  confirmSelection,
  dialogVisible,
  openDialog,
  pendingIcon,
  selectedIcon,
  selectIcon,
} = useIconSelection(
  () => props.modelValue,
  value => emit('update:modelValue', value),
)

// Element Plus 图标列表
const epIcons = Object.keys(elementIcons)

const filteredIcons = computed(() => {
  if (!search.value) return epIcons.slice(0, 100)
  const q = search.value.toLowerCase()
  return epIcons.filter(i => i.toLowerCase().includes(q)).slice(0, 100)
})

</script>

<style scoped>
.icon-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  max-height: 320px;
  overflow-y: auto;
}

.icon-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  width: 80px;
  height: 72px;
  border: 1px solid var(--el-border-color-light);
  border-radius: 6px;
  padding: 0;
  color: inherit;
  font: inherit;
  background: transparent;
  cursor: pointer;
  transition: all 0.2s;
  gap: 4px;
}

.icon-item:hover,
.icon-item:focus-visible {
  border-color: var(--el-color-primary);
  color: var(--el-color-primary);
}

.icon-item.active {
  border-color: var(--el-color-primary);
  background: var(--el-color-primary-light-9);
  color: var(--el-color-primary);
}

.icon-name {
  font-size: 10px;
  max-width: 70px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
</style>
