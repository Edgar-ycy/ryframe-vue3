/**
 * 消息缓存兼容门面。
 *
 * 查询键与缓存变更分别由子模块维护，既有调用方可以继续从本模块导入。
 */
export * from './messageCache/queryKeys'
export * from './messageCache/mutations'
