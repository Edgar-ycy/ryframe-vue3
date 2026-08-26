<template>
  <div class="diff-card">
    <strong>{{ title }}</strong>
    <template v-if="hasDiff">
      <p v-if="diff.added.length">
        <span>{{ t('productPlans.added') }}</span
        >{{ diff.added.join(', ') }}
      </p>
      <p v-if="diff.removed.length">
        <span>{{ t('productPlans.removed') }}</span
        >{{ diff.removed.join(', ') }}
      </p>
      <p v-if="diff.changed.length">
        <span>{{ t('productPlans.changed') }}</span
        >{{ diff.changed.join(', ') }}
      </p>
    </template>
    <p v-else>{{ t('productPlans.noDiff') }}</p>
  </div>
</template>

<script setup lang="ts">
import { useI18n } from 'vue-i18n'

interface ProductChangeDiff {
  added: string[]
  removed: string[]
  changed: string[]
}

const props = defineProps<{ diff: ProductChangeDiff; title: string }>()
const { t } = useI18n()
const hasDiff = computed(
  () =>
    props.diff.added.length > 0 || props.diff.removed.length > 0 || props.diff.changed.length > 0,
)
</script>

<style scoped>
.diff-card {
  min-width: 0;
  padding: 12px;
  border-radius: 6px;
  background: var(--el-fill-color-light);
}

p {
  margin: 8px 0 0;
  color: var(--el-text-color-secondary);
  overflow-wrap: anywhere;
}

span {
  margin-right: 6px;
  color: var(--el-text-color-primary);
}
</style>
