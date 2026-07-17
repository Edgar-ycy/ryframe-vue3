<template>
  <div class="redirect-container">
    <el-icon class="loading-icon" :size="32"><Loading /></el-icon>
    <p>正在跳转...</p>
  </div>
</template>

<script setup lang="ts">
const route = useRoute()
const router = useRouter()

onMounted(() => {
  const { params, query } = route
  const path = params.path || '/'
  router.replace({ path: '/' + path, query })
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
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}
</style>
