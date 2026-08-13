/** 使用文件内容生成上传幂等意图指纹，避免同名同尺寸文件误复用。 */
export async function tenantConfigTransferFileFingerprint(file: File): Promise<string> {
  const digest = await globalThis.crypto.subtle.digest('SHA-256', await file.arrayBuffer())
  return Array.from(
    new Uint8Array(digest),
    byte => byte.toString(16).padStart(2, '0'),
  ).join('')
}
