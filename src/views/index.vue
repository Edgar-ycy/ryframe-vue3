<template>
  <div class="index-container">
    <div class="hero-section">
      <div class="hero-content">
        <h1 class="hero-title">RyFrame</h1>
        <p class="hero-subtitle">企业级 Rust 全栈快速开发框架</p>
        <p class="hero-desc">
          基于 Axum + Vue 3 + Element Plus 构建，提供开箱即用的后台管理解决方案
        </p>
      </div>
    </div>

    <el-row :gutter="20" class="feature-section">
      <el-col :xs="24" :sm="12" :md="8" :lg="6" v-for="item in features" :key="item.title">
        <el-card shadow="hover" class="feature-card">
          <div class="feature-icon">
            <el-icon :size="28">
              <component :is="item.icon" />
            </el-icon>
          </div>
          <h3 class="feature-title">{{ item.title }}</h3>
          <p class="feature-desc">{{ item.desc }}</p>
        </el-card>
      </el-col>
    </el-row>

    <el-row :gutter="20">
      <el-col :xs="24" :md="12">
        <el-card class="tech-card">
          <template #header>
            <span class="tech-header">🦀 后端技术栈</span>
          </template>
          <div class="tech-tags">
            <el-tag v-for="tech in backendTechs" :key="tech" class="tech-tag" effect="plain">
              {{ tech }}
            </el-tag>
          </div>
        </el-card>
      </el-col>
      <el-col :xs="24" :md="12">
        <el-card class="tech-card">
          <template #header>
            <span class="tech-header">🎨 前端技术栈</span>
          </template>
          <div class="tech-tags">
            <el-tag v-for="tech in frontendTechs" :key="tech" class="tech-tag" type="success" effect="plain">
              {{ tech }}
            </el-tag>
          </div>
        </el-card>
      </el-col>
    </el-row>

    <el-card class="info-card">
      <template #header>
        <span>📋 核心能力</span>
      </template>
      <el-row :gutter="20">
        <el-col :xs="24" :sm="12" :md="8" v-for="cap in capabilities" :key="cap.title">
          <div class="cap-item">
            <el-icon :size="20" color="#409EFF"><component :is="cap.icon" /></el-icon>
            <span class="cap-title">{{ cap.title }}</span>
            <p class="cap-desc">{{ cap.desc }}</p>
          </div>
        </el-col>
      </el-row>
    </el-card>

    <el-card class="info-card">
      <template #header>
        <span>ℹ️ 项目信息</span>
      </template>
      <el-descriptions :column="2" border>
        <el-descriptions-item label="项目名称">RyFrame</el-descriptions-item>
        <el-descriptions-item label="当前版本">v0.1.0</el-descriptions-item>
        <el-descriptions-item label="后端语言">Rust 2024 Edition</el-descriptions-item>
        <el-descriptions-item label="前端语言">TypeScript 5+</el-descriptions-item>
        <el-descriptions-item label="Web 框架">Axum 0.8</el-descriptions-item>
        <el-descriptions-item label="ORM">SeaORM 2.0</el-descriptions-item>
        <el-descriptions-item label="前端框架">Vue 3.5 + Element Plus 2</el-descriptions-item>
        <el-descriptions-item label="构建工具">Vite 8</el-descriptions-item>
        <el-descriptions-item label="数据库">MySQL 8.0 / PostgreSQL</el-descriptions-item>
        <el-descriptions-item label="许可证">MIT</el-descriptions-item>
      </el-descriptions>
    </el-card>
  </div>
</template>

<script setup lang="ts">
// 纯静态页面，无任何后端请求

const features = [
  {
    title: 'RBAC 权限管理',
    desc: '菜单/按钮/API 三级细粒度权限控制，支持数据权限隔离',
    icon: 'Lock',
  },
  {
    title: '代码生成器',
    desc: '基于 Proc Macro 的代码生成，一键生成 CRUD 前后端代码',
    icon: 'MagicStick',
  },
  {
    title: '系统监控',
    desc: '服务器资源、缓存、DB 连接池、运行时指标实时监控',
    icon: 'Monitor',
  },
  {
    title: '链路追踪',
    desc: 'OpenTelemetry 分布式链路追踪，快速定位性能瓶颈',
    icon: 'Connection',
  },
  {
    title: '消息队列',
    desc: '集成 Kafka 消息队列，支持异步任务与事件驱动架构',
    icon: 'Message',
  },
  {
    title: '文件管理',
    desc: 'MinIO / S3 对象存储，支持文件上传、下载、MD5 去重',
    icon: 'Folder',
  },
  {
    title: 'Excel 导入导出',
    desc: '基于 calamine + rust_xlsxwriter 的高性能 Excel 处理',
    icon: 'Document',
  },
  {
    title: '国际化 i18n',
    desc: '前后端完整的国际化支持，轻松扩展多语言',
    icon: 'ChatLineSquare',
  },
]

const capabilities = [
  { title: 'JWT 双 Token 认证', desc: 'Access Token + Refresh Token 无感刷新', icon: 'Key' },
  { title: 'Argon2 密码哈希', desc: '安全的密码存储方案', icon: 'Lock' },
  { title: 'Redis 缓存', desc: '高性能缓存与会话管理', icon: 'Coin' },
  { title: 'gRPC 微服务', desc: '基于 Tonic 的高性能服务间通信', icon: 'Connection' },
  { title: 'Prometheus 指标', desc: 'Prometheus 格式系统指标暴露', icon: 'TrendCharts' },
  { title: 'OpenAPI 文档', desc: '基于 Utoipa 的自动 API 文档生成', icon: 'Notebook' },
  { title: '多数据源', desc: '动态多数据源切换支持', icon: 'Grid' },
  { title: '操作日志', desc: '完整的操作日志记录与审计', icon: 'EditPen' },
  { title: '邮件发送', desc: '基于 Lettre 的 SMTP 邮件服务', icon: 'Message' },
  { title: '验证码', desc: '图片验证码与邮件验证码支持', icon: 'Picture' },
  { title: 'XSS 防护', desc: '基于 Ammonia 的 HTML 净化', icon: 'Warning' },
  { title: '多租户', desc: '内置租户隔离，一套系统服务多客户', icon: 'OfficeBuilding' },
]

const backendTechs = [
  'Rust 2024', 'Axum 0.8', 'Tokio', 'SeaORM 2.0',
  'Argon2', 'JWT', 'Redis', 'MySQL / PostgreSQL',
  'OpenTelemetry', 'Tonic (gRPC)', 'Kafka', 'MinIO / S3',
  'Prometheus', 'Utoipa (OpenAPI)', 'Lettre (SMTP)',
  'calamine', 'rust_xlsxwriter', 'Ammonia (XSS)',
]

const frontendTechs = [
  'Vue 3.5', 'TypeScript 5+', 'Element Plus 2',
  'Vite 8', 'Pinia 3', 'Vue Router 5',
  'Axios', 'Sass', '@vueuse/core',
]
</script>

<style scoped>
.index-container {
  width: 100%;
  padding: 24px;
}

.hero-section {
  text-align: center;
  padding: 40px 0 32px;
  margin: -24px -24px 0;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: #fff;
}

.hero-title {
  font-size: 46px;
  font-weight: 700;
  margin: 0 0 8px;
  letter-spacing: 4px;
}

.hero-subtitle {
  font-size: 20px;
  margin: 0 0 12px;
  font-weight: 400;
  opacity: 0.9;
}

.hero-desc {
  font-size: 15px;
  margin: 0 auto;
  max-width: 520px;
  line-height: 1.6;
  opacity: 0.8;
}

.feature-section {
  margin-top: 24px;
}

.feature-card {
  margin-bottom: 20px;
  text-align: center;
  transition: transform 0.2s, box-shadow 0.2s;
  height: 100%;
}

.feature-card:hover {
  transform: translateY(-4px);
}

.feature-icon {
  width: 56px;
  height: 56px;
  margin: 0 auto 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 12px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: #fff;
}

.feature-title {
  margin: 0 0 6px;
  font-size: 15px;
  color: var(--color-text-primary);
}

.feature-desc {
  margin: 0;
  font-size: 13px;
  color: var(--color-text-secondary);
  line-height: 1.5;
}

.tech-card {
  margin-top: 8px;
  height: 100%;
}

.tech-header {
  font-weight: 600;
}

.tech-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.tech-tag {
  margin: 0;
}

.info-card {
  margin-top: 20px;
}

.cap-item {
  padding: 12px 0;
  text-align: center;
}

.cap-title {
  font-size: 14px;
  font-weight: 600;
  color: var(--color-text-primary);
  display: block;
  margin-bottom: 4px;
}

.cap-desc {
  margin: 0;
  font-size: 12px;
  color: var(--color-text-secondary);
  line-height: 1.4;
}
</style>
