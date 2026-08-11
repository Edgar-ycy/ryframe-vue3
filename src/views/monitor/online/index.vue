<template>
  <div class="page-container">
    <el-card shadow="never" class="search-card">
      <el-form :model="queryParams" inline>
        <el-form-item :label="t('monitor.online.username')">
          <el-input v-model="queryParams.username" :placeholder="t('monitor.online.usernamePlaceholder')" clearable />
        </el-form-item>
        <el-form-item :label="t('monitor.online.ipAddress')">
          <el-input v-model="queryParams.ipaddr" :placeholder="t('monitor.online.ipAddressPlaceholder')" clearable />
        </el-form-item>
        <el-form-item>
          <el-button v-perm="'monitor:online:list'" type="primary" icon="Search" @click="handleSearch">{{ t('monitor.online.search') }}</el-button>
          <el-button v-perm="'monitor:online:list'" icon="Refresh" @click="handleReset">{{ t('monitor.online.reset') }}</el-button>
        </el-form-item>
      </el-form>
    </el-card>

    <el-card shadow="never" style="margin-top:12px">
      <template #header><span>{{ t('monitor.online.title', { count: onlineUsers?.total ?? 0 }) }}</span></template>
      <el-table v-loading="loading" :data="onlineUsers?.items ?? []" border stripe>
        <el-table-column prop="sid" :label="t('monitor.online.sessionId')" show-overflow-tooltip />
        <el-table-column prop="username" :label="t('monitor.online.username')" />
        <el-table-column prop="dept_name" :label="t('monitor.online.department')" show-overflow-tooltip />
        <el-table-column prop="ipaddr" :label="t('monitor.online.ipAddress')" />
        <el-table-column prop="login_location" :label="t('monitor.online.loginLocation')" show-overflow-tooltip />
        <el-table-column prop="browser" :label="t('monitor.online.browser')" show-overflow-tooltip />
        <el-table-column prop="os" :label="t('monitor.online.operatingSystem')" show-overflow-tooltip />
        <el-table-column prop="login_time" :label="t('monitor.online.loginTime')" min-width="180" />
        <el-table-column :label="t('monitor.online.operation')" fixed="right" align="center">
          <template #default="{ row }">
            <el-button
              v-perm="'monitor:online:force-logout'"
              type="danger"
              link
              icon="SwitchButton"
              :loading="forcingSid === row.sid"
              :disabled="forceLogoutPending"
              @click="handleForceLogout(row)"
            >
              {{ t('monitor.online.forceLogout') }}
            </el-button>
          </template>
        </el-table-column>
      </el-table>
      <el-pagination
        v-model:current-page="queryParams.page"
        v-model:page-size="queryParams.page_size"
        :total="onlineUsers?.total ?? 0"
        :page-sizes="[10, 20, 50, 100]"
        layout="total, sizes, prev, pager, next, jumper"
        background
        @change="fetchData"
      />
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { useOnlineManagement } from './useOnlineManagement'

const { t } = useI18n()
const {
  fetchData,
  forceLogoutPending,
  forcingSid,
  handleForceLogout,
  handleReset,
  handleSearch,
  loading,
  onlineUsers,
  queryParams,
} = useOnlineManagement(t)
</script>
