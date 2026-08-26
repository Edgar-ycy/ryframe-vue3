export type MessageSocketState =
  | 'idle'
  | 'connecting'
  | 'connected'
  | 'retrying'
  | 'degraded'
  | 'stopped'

export type MessageConnectionStatus =
  | Exclude<MessageSocketState, 'idle' | 'stopped'>
  | 'disconnected'

export interface MessageConnectionState {
  connectionStatus: MessageConnectionStatus
  socketError?: string
}
