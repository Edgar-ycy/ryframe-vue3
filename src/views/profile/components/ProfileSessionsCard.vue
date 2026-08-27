<template>
  <el-card class="sessions-card" shadow="never">
    <template #header>
      <div class="sessions-card__header">
        <div>
          <h2>{{ t('profile.sessions.title') }}</h2>
          <p>{{ t('profile.sessions.description') }}</p>
        </div>
        <div class="sessions-card__header-actions">
          <el-button
            :loading="refreshing"
            :disabled="actionsPending()"
            :title="t('profile.sessions.refresh')"
            :aria-label="t('profile.sessions.refresh')"
            @click="emit('refresh')"
          >
            {{ t('profile.sessions.refresh') }}
          </el-button>
          <el-button
            type="danger"
            plain
            :loading="revokeOthersPending"
            :disabled="!hasOtherDevices || actionsPending()"
            :title="t('profile.sessions.revokeOthers')"
            :aria-label="t('profile.sessions.revokeOthers')"
            @click="emit('revoke-others')"
          >
            {{ t('profile.sessions.revokeOthers') }}
          </el-button>
        </div>
      </div>
    </template>

    <div :aria-busy="loading || refreshing" aria-live="polite">
      <el-alert
        v-if="hasError"
        class="sessions-card__error"
        type="error"
        :closable="false"
        show-icon
        :title="t('profile.sessions.loadFailed')"
      />
      <el-button
        v-if="hasError && devices.length === 0"
        class="sessions-card__retry"
        :loading="refreshing"
        :disabled="actionsPending()"
        :title="t('profile.sessions.retry')"
        :aria-label="t('profile.sessions.retry')"
        @click="emit('refresh')"
      >
        {{ t('profile.sessions.retry') }}
      </el-button>

      <el-skeleton v-if="loading && devices.length === 0 && !hasError" :rows="4" animated />
      <el-empty
        v-else-if="devices.length === 0 && !hasError"
        :description="t('profile.sessions.empty')"
      />

      <template v-if="devices.length > 0">
        <div class="sessions-table" role="region" :aria-label="t('profile.sessions.title')">
          <div class="sessions-table__inner">
            <el-table :data="[...devices]" row-key="key">
              <el-table-column :label="t('profile.sessions.device')" min-width="200">
                <template #default="{ row }">
                  <div class="device-name">
                    <span>{{ row.device }}</span>
                    <el-tag v-if="row.current" type="success" size="small">
                      {{ t('profile.sessions.currentDevice') }}
                    </el-tag>
                  </div>
                </template>
              </el-table-column>
              <el-table-column
                prop="ipAddress"
                :label="t('profile.sessions.ipAddress')"
                min-width="140"
              />
              <el-table-column
                prop="loginLocation"
                :label="t('profile.sessions.loginLocation')"
                min-width="150"
              />
              <el-table-column
                prop="loginTime"
                :label="t('profile.sessions.loginTime')"
                min-width="180"
              />
              <el-table-column
                prop="lastActivity"
                :label="t('profile.sessions.lastActivity')"
                min-width="180"
              />
              <el-table-column
                prop="expiresAt"
                :label="t('profile.sessions.expiresAt')"
                min-width="180"
              />
              <el-table-column :label="t('profile.sessions.actions')" width="120" fixed="right">
                <template #default="{ row }">
                  <el-button
                    type="danger"
                    link
                    :loading="pendingDeviceKey === row.key"
                    :disabled="actionsPending()"
                    :title="t('profile.sessions.revokeDeviceLabel', { device: row.device })"
                    :aria-label="t('profile.sessions.revokeDeviceLabel', { device: row.device })"
                    @click="revokeDevice(row.key)"
                  >
                    {{ t('profile.sessions.revoke') }}
                  </el-button>
                </template>
              </el-table-column>
            </el-table>
          </div>
        </div>

        <div class="sessions-mobile" :aria-label="t('profile.sessions.title')">
          <article v-for="device in devices" :key="device.key" class="device-card">
            <div class="device-card__title">
              <strong>{{ device.device }}</strong>
              <el-tag v-if="device.current" type="success" size="small">
                {{ t('profile.sessions.currentDevice') }}
              </el-tag>
            </div>
            <dl class="device-card__details">
              <div>
                <dt>{{ t('profile.sessions.browser') }}</dt>
                <dd>{{ device.browser }}</dd>
              </div>
              <div>
                <dt>{{ t('profile.sessions.operatingSystem') }}</dt>
                <dd>{{ device.operatingSystem }}</dd>
              </div>
              <div>
                <dt>{{ t('profile.sessions.ipAddress') }}</dt>
                <dd>{{ device.ipAddress }}</dd>
              </div>
              <div>
                <dt>{{ t('profile.sessions.loginLocation') }}</dt>
                <dd>{{ device.loginLocation }}</dd>
              </div>
              <div>
                <dt>{{ t('profile.sessions.loginTime') }}</dt>
                <dd>{{ device.loginTime }}</dd>
              </div>
              <div>
                <dt>{{ t('profile.sessions.lastActivity') }}</dt>
                <dd>{{ device.lastActivity }}</dd>
              </div>
              <div>
                <dt>{{ t('profile.sessions.expiresAt') }}</dt>
                <dd>{{ device.expiresAt }}</dd>
              </div>
            </dl>
            <el-button
              class="device-card__revoke"
              type="danger"
              plain
              :loading="pendingDeviceKey === device.key"
              :disabled="actionsPending()"
              :title="t('profile.sessions.revokeDeviceLabel', { device: device.device })"
              :aria-label="t('profile.sessions.revokeDeviceLabel', { device: device.device })"
              @click="emit('revoke', device)"
            >
              {{ t('profile.sessions.revoke') }}
            </el-button>
          </article>
        </div>
      </template>
    </div>
  </el-card>
</template>

<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import type { AuthSessionView } from '../useAuthSessionManagement'

const props = defineProps<{
  devices: readonly AuthSessionView[]
  hasOtherDevices: boolean
  hasError: boolean
  loading: boolean
  pendingDeviceKey?: string
  refreshing: boolean
  revokeOthersPending: boolean
}>()

const emit = defineEmits<{
  refresh: []
  revoke: [device: AuthSessionView]
  'revoke-others': []
}>()

const { t } = useI18n()

function actionsPending(): boolean {
  return props.refreshing || Boolean(props.pendingDeviceKey) || props.revokeOthersPending
}

function revokeDevice(key: string): void {
  const device = props.devices.find((item) => item.key === key)
  if (device) emit('revoke', device)
}
</script>

<style scoped>
.sessions-card {
  margin-top: 16px;
}

.sessions-card__header {
  display: flex;
  gap: 16px;
  align-items: flex-start;
  justify-content: space-between;
}

.sessions-card__header h2 {
  margin: 0;
  color: var(--el-text-color-primary);
  font-size: 16px;
}

.sessions-card__header p {
  margin: 6px 0 0;
  color: var(--el-text-color-secondary);
  line-height: 1.5;
}

.sessions-card__header-actions {
  display: flex;
  flex: 0 0 auto;
  gap: 8px;
}

.sessions-card__header-actions :deep(.el-button + .el-button) {
  margin-left: 0;
}

.sessions-card__error {
  margin-bottom: 16px;
}

.sessions-card__retry {
  min-height: 40px;
  margin-bottom: 16px;
  margin-left: 0;
}

.sessions-table {
  max-width: 100%;
  overflow-x: auto;
}

.sessions-table__inner {
  min-width: 1120px;
}

.device-name {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  align-items: center;
}

.sessions-mobile {
  display: none;
}

@media (width < 768px) {
  .sessions-card__header {
    display: grid;
  }

  .sessions-card__header-actions {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .sessions-card__header-actions :deep(.el-button) {
    width: 100%;
    min-height: 44px;
  }

  .sessions-table {
    display: none;
  }

  .sessions-mobile {
    display: grid;
    gap: 12px;
  }

  .device-card {
    min-width: 0;
    padding: 14px;
    border: 1px solid var(--el-border-color-lighter);
    border-radius: var(--el-border-radius-base);
    background: var(--el-fill-color-blank);
  }

  .device-card__title {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    align-items: center;
    justify-content: space-between;
  }

  .device-card__details {
    display: grid;
    gap: 8px;
    margin: 14px 0;
  }

  .device-card__details div {
    display: grid;
    grid-template-columns: minmax(92px, 38%) minmax(0, 1fr);
    gap: 10px;
  }

  .device-card__details dt {
    color: var(--el-text-color-secondary);
  }

  .device-card__details dd {
    min-width: 0;
    margin: 0;
    overflow-wrap: anywhere;
    text-align: right;
  }

  .device-card__revoke {
    width: 100%;
    min-height: 44px;
    margin-left: 0;
  }
}

@media (width < 480px) {
  .sessions-card__header-actions {
    grid-template-columns: minmax(0, 1fr);
  }
}
</style>
