<template>
  <el-button :icon="selectedIcon || 'Plus'" @click="dialogVisible = true">
    {{ selectedIcon ? '' : '选择图标' }}
  </el-button>
  <el-dialog v-model="dialogVisible" title="图标选择器" width="600px" append-to-body>
    <el-input v-model="search" placeholder="搜索图标" clearable style="margin-bottom:12px" />
    <el-tabs v-model="activeTab">
      <el-tab-pane label="Element Plus" name="ep">
        <div class="icon-grid">
          <div
            v-for="icon in filteredIcons"
            :key="icon"
            class="icon-item"
            :class="{ active: selectedIcon === icon }"
            @click="selectIcon(icon)"
          >
            <el-icon :size="20"><component :is="icon" /></el-icon>
            <span class="icon-name">{{ icon }}</span>
          </div>
        </div>
      </el-tab-pane>
    </el-tabs>
    <template #footer>
      <el-button @click="dialogVisible = false">取消</el-button>
      <el-button type="primary" @click="confirmSelect">确定</el-button>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import * as Icons from '@element-plus/icons-vue'

const props = defineProps<{
  modelValue?: string
}>()

const emit = defineEmits<{
  'update:modelValue': [val: string]
}>()

const dialogVisible = ref(false)
const search = ref('')
const activeTab = ref('ep')
const selectedIcon = ref(props.modelValue || '')
const tempIcon = ref('')

// Element Plus 图标列表
const epIcons = Object.keys(Icons).filter(k => k !== 'default' && k !== 'Menu')

const filteredIcons = computed(() => {
  if (!search.value) return epIcons.slice(0, 100)
  const q = search.value.toLowerCase()
  return epIcons.filter(i => i.toLowerCase().includes(q)).slice(0, 100)
})

function selectIcon(icon: string) {
  tempIcon.value = icon
}

function confirmSelect() {
  selectedIcon.value = tempIcon.value || selectedIcon.value
  emit('update:modelValue', selectedIcon.value)
  dialogVisible.value = false
}
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
  cursor: pointer;
  transition: all 0.2s;
  gap: 4px;
}
.icon-item:hover {
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
