import ENV, { universePath } from 'src/config/env';
import { getServerLanguage } from 'src/utils/i18n';

const tcNoLocaleUrl = ['/user/getSalt'];

/**
 * 租户中心 /业务网关 JSON POST（与 foreground tcRequest 一致：不要求登录态）
 * @param {string} url 完整 URL
 * @param {object|string} body
 */
export async function tcPost(url, body) {
  const bodyStr = typeof body === 'string' ? body : JSON.stringify(body);
  const skipLocale = tcNoLocaleUrl.some((f) => String(url).includes(f));
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      version: ENV.version,
      ...(skipLocale ? {} : { 'user-locale': getServerLanguage(url) }),
    },
    body: bodyStr,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(data.desc || res.statusText || 'Request failed');
    err.status = res.status;
    err.data = data;
    throw err;
  }
  return data;
}

/** 当前站点 universe 网关（与页面同源 + universePath，开发环境走 Vite 代理） */
export function universeUrl(path) {
  const p = path.startsWith('/') ? path.slice(1) : path;
  const prefix = universePath.startsWith('/') ? universePath : `/${universePath}`;
  return `${window.location.origin}${prefix}/${p}`;
}

export async function universeUserLogin(params) {
  return tcPost(universeUrl('user/login'), params);
}
