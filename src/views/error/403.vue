<template>
  <div class="error-page">
    <h1>403</h1>
    <p>抱歉，您没有访问此页面的权限</p>
    <el-button type="primary" @click="$router.push('/')">返回首页</el-button>
  </div>
</template>

<style scoped>
.error-page {
  height: 100vh;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 16px;
}
.error-page h1 {
  font-size: 72px;
  color: var(--color-text-secondary);
}
.error-page p {
  font-size: 16px;
  color: var(--color-text-secondary);
}
</style>
