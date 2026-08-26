import { defineStore } from 'pinia'
import type { MessageConnectionState } from '@/shared/messages/connection'

/** 消息 Store 只保存界面可观察状态，连接与缓存操作由应用控制器负责。 */
export const useMessageStore = defineStore('message', {
  state: (): MessageConnectionState => ({
    connectionStatus: 'disconnected',
    socketError: undefined,
  }),

  actions: {
    setConnectionStatus(status: MessageConnectionState['connectionStatus']): void {
      this.connectionStatus = status
    },

    setSocketError(message: string | undefined): void {
      this.socketError = message
    },

    clearSocketError(): void {
      this.socketError = undefined
    },

    resetConnectionState(): void {
      this.connectionStatus = 'disconnected'
      this.socketError = undefined
    },
  },
})
