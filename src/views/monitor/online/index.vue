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
          <el-button v-perm="'monitor:online:list'" type="primary" icon="Search" @click="fetchData">{{ t('monitor.online.search') }}</el-button>
          <el-button v-perm="'monitor:online:list'" icon="Refresh" @click="handleReset">{{ t('monitor.online.reset') }}</el-button>
        </el-form-item>
      </el-form>
    </el-card>

    <el-card shadow="never" style="margin-top:12px">
      <template #header><span>{{ t('monitor.online.title', { count: tableData.length }) }}</span></template>
      <el-table v-loading="loading" :data="tableData" border stripe>
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
            <el-button v-perm="'monitor:online:force-logout'" type="danger" link icon="SwitchButton" @click="handleForceLogout(row)">{{ t('monitor.online.forceLogout') }}</el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { listOnlineUser, forceLogout, type OnlineUserRecord } from '@/api/modules/monitor'

const { t } = useI18n()
const loading = ref(false)
const tableData = ref<OnlineUserRecord[]>([])
const queryParams = ref({ username: '', ipaddr: '' })

async function fetchData() {
  loading.value = true
  try {
    const res = await listOnlineUser(queryParams.value)
    tableData.value = res.data?.items || []
  } finally { loading.value = false }
}

function handleReset() {
  queryParams.value.username = ''; queryParams.value.ipaddr = ''
  fetchData()
}

async function handleForceLogout(row: OnlineUserRecord) {
  try {
    await ElMessageBox.confirm(
      t('monitor.online.forceLogoutConfirm', { username: row.username }),
      t('monitor.online.warning'),
      { type: 'warning' },
    )
    await forceLogout(row.sid)
    ElMessage.success(t('monitor.online.forceLogoutSuccess'))
    await fetchData()
  } catch { /* 用户取消 */ }
}

onMounted(() => fetchData())
</script>
