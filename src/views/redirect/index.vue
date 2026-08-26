<template>
  <div class="redirect-container">
    <el-icon class="loading-icon" :size="32"><Loading /></el-icon>
    <p>{{ t('account.redirecting') }}</p>
  </div>
</template>

<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { Loading } from '@element-plus/icons-vue'
import { normalizeRedirectPath } from '@/router/redirect'

const route = useRoute()
const router = useRouter()
const { t } = useI18n()

onMounted(() => {
  const { params, query } = route
  router.replace({ path: normalizeRedirectPath(params.path), query })
})
</script>

<style scoped>
.redirect-container {
  height: 100vh;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 16px;
  font-size: 14px;
  color: var(--color-text-secondary);
}

.loading-icon {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from {
    transform: rotate(0deg);
  }

  to {
    transform: rotate(360deg);
  }
}
</style>
