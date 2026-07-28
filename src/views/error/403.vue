<template>
  <div class="error-page">
    <h1>403</h1>
    <p>{{ t('account.accessDenied') }}</p>
    <el-button type="primary" @click="$router.push('/')">{{ t('account.backHome') }}</el-button>
  </div>
</template>

<script setup lang="ts">
import { useI18n } from 'vue-i18n'

const { t } = useI18n()
</script>
