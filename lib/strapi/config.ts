export type Connection = { url: string; token: string; toolApiUrl: string; toolApiToken: string; nickname: string };
export const CONFIG_KEY = 'fengbro-strapi-connection';
export function getConnection(): Connection {
  let saved: Partial<Connection> = {};
  if (typeof localStorage !== 'undefined') {
    try {
      saved = JSON.parse(localStorage.getItem(CONFIG_KEY) || 'null') || {};
      if (!saved.url) {
        const old = JSON.parse(localStorage.getItem('fengbro-remix-crud:settings') || '{}');
        saved = { ...saved, url: old.strapiUrl, token: old.strapiApiToken };
      }
    } catch { /* Invalid stored settings fall back to environment configuration. */ }
  }
  return {
    url: saved.url || import.meta.env?.VITE_STRAPI_URL || 'https://site--strapigoldshoot0720--p9rc2b8grv9b.code.run',
    token: saved.token || import.meta.env?.VITE_STRAPI_API_TOKEN || '',
    toolApiUrl: saved.toolApiUrl || import.meta.env?.VITE_FENGBRO_TOOL_API_BASE || '',
    toolApiToken: saved.toolApiToken || '',
    nickname: saved.nickname || '',
  };
}
export function validateBaseUrl(value: string): string {
  const url = new URL(value);
  if (!['https:', 'http:'].includes(url.protocol) || url.username || url.password || url.search || url.hash) throw new Error('請輸入不含帳密、查詢參數的 HTTP(S) 服務網址。');
  return url.href.replace(/\/$/, '');
}
