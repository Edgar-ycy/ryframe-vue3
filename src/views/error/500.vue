<template>
  <div class="error-page">
    <h1>503</h1>
    <p>{{ t('account.authenticationUnavailable') }}</p>
    <el-button type="primary" @click="$router.push('/')">{{ t('account.retry') }}</el-button>
  </div>
</template>

<script setup lang="ts">
import { useI18n } from 'vue-i18n'

const { t } = useI18n()
</script>
