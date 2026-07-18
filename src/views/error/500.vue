<template>
  <div class="error-page">
    <h1>503</h1>
    <p>认证服务暂不可用，请稍后重试</p>
    <el-button type="primary" @click="$router.push('/')">重试</el-button>
  </div>
</template>

