import mitt from 'mitt'
import type { Emitter } from 'mitt'

/**
 * 全局事件总线
 * 用于跨组件/跨模块通信
 */

// ---- 事件类型定义 ----

type Events = {
  /** 标签页关闭 */
  'tags-view:close': { path: string }
  /** 刷新当前路由 */
  'page:refresh': void
  /** 字典更新 */
  'dict:refresh': { typeCode: string }
  /** 主题变更 */
  'theme:change': { theme: 'light' | 'dark' }
  /** 全局尺寸变更 */
  'size:change': { size: 'large' | 'default' | 'small' }
  /** 用户信息更新 */
  'user:updated': void
}

const emitter: Emitter<Events> = mitt<Events>()

export { emitter }
export type { Events }
export default emitter
