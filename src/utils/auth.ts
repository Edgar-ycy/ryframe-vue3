/**
 * Token 管理工具
 *
 * 安全说明：Token 存储在 localStorage 中存在 XSS 窃取风险。
 * 缓解措施：
 *  1. 确保后端 Token 有过期时间（access_token 短期有效 + refresh_token 轮换）
 *  2. 生产环境启用严格 CSP (Content-Security-Policy) 防止内联脚本注入
 *  3. 如需更高安全性，可改为 httpOnly Cookie（需后端配合设置）
 */
const TOKEN_KEY = 'ryframe_token'
const REFRESH_TOKEN_KEY = 'ryframe_refresh_token'

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY)
}

export function setToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token)
}

export function removeToken(): void {
  localStorage.removeItem(TOKEN_KEY)
  localStorage.removeItem(REFRESH_TOKEN_KEY)
}

export function getRefreshToken(): string | null {
  return localStorage.getItem(REFRESH_TOKEN_KEY)
}

export function setRefreshToken(token: string): void {
  localStorage.setItem(REFRESH_TOKEN_KEY, token)
}
