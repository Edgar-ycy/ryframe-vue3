/**
 * 消息查询兼容门面。具体缓存、同步和组件 Hook 分别由独立模块负责，
 * 既有调用方可以继续沿用原导入路径。
 */
export * from './messageCache'
export * from './messageHooks'
export * from './messageSync'
