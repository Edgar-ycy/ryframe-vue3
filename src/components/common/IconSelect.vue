<template>
  <el-button
    :icon="resolveElementIcon(props.modelValue, 'Plus')"
    :aria-label="
      props.modelValue
        ? t('shell.icon.changeCurrent', { icon: props.modelValue })
        : t('shell.icon.select')
    "
    @click="openDialog"
  >
    {{ props.modelValue ? '' : t('shell.icon.select') }}
  </el-button>
  <el-dialog
    v-model="dialogVisible"
    :title="t('shell.icon.dialogTitle')"
    width="600px"
    append-to-body
  >
    <el-input
      v-model="search"
      :placeholder="t('shell.icon.search')"
      clearable
      style="margin-bottom: 12px"
    />
    <el-tabs v-model="activeTab">
      <el-tab-pane :label="t('shell.icon.elementPlus')" name="ep">
        <div class="icon-grid">
          <button
            v-for="icon in filteredIcons"
            :key="icon"
            type="button"
            class="icon-item"
            :class="{ active: pendingIcon === icon }"
            :aria-label="t('shell.icon.selectItem', { icon })"
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
      <el-button @click="closeDialog">{{ t('shell.icon.cancel') }}</el-button>
      <el-button type="primary" @click="confirmSelection">{{ t('shell.icon.confirm') }}</el-button>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { elementIcons, resolveElementIcon } from '@/shared/ui/icons'
import { useIconSelection } from './iconSelection'

const props = defineProps<{
  modelValue?: string
}>()

const emit = defineEmits<{
  'update:modelValue': [val: string]
}>()

const { t } = useI18n()
const search = ref('')
const activeTab = ref('ep')
const { closeDialog, confirmSelection, dialogVisible, openDialog, pendingIcon, selectIcon } =
  useIconSelection(
    () => props.modelValue,
    (value) => emit('update:modelValue', value),
  )

// Element Plus 图标清单
const epIcons = Object.keys(elementIcons)

const filteredIcons = computed(() => {
  if (!search.value) return epIcons.slice(0, 100)
  const q = search.value.toLowerCase()
  return epIcons.filter((i) => i.toLowerCase().includes(q)).slice(0, 100)
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
