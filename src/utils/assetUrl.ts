/** 將 public/ 底下的相對路徑轉成實際網址（支援部署在子目錄） */
export function assetUrl(path: string): string {
  if (/^(https?:|data:|blob:)/.test(path)) return path
  const base = (import.meta.env?.BASE_URL as string | undefined) ?? '/'
  const normalizedBase = base.endsWith('/') ? base : `${base}/`
  return normalizedBase + path.replace(/^\/+/, '')
}
