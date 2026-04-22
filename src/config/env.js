/**
 * 环境与多域名网关（对齐 cloud-web-foreground/src/config/env.js 思路，适配 Vite）
 *
 * - 业务接口：与当前站点同源 + universe路径（如 /universe），生产一般为 window.location.origin + '/universe'
 * - 租户中心 tcURL：仅来自 VITE_TC_URL（各环境在 .env.* 中配置；开发可用相对路径 /hecom-tenancy/ + 代理）
 * - IM / RCM 等：默认与 foreground 生产一致，可通过 VITE_IM_HOST、VITE_RCM_HOST 覆盖
 */

const mode = import.meta.env.VITE_MODE || import.meta.env.MODE || 'development';

/** 业务网关路径段，如 /universe（不含尾部 /） */
export function normalizeUniversePath(raw) {
  const s = (raw || '/universe').trim();
  const p = s.startsWith('/') ? s : `/${s}`;
  return p.replace(/\/$/, '') || '/universe';
}

export const universePath = normalizeUniversePath(import.meta.env.VITE_API_BASE);

export const version = import.meta.env.VITE_APP_VERSION || '1.0.0';

/**
 * 将 VITE_TC_URL 规范为末尾带 / 的地址（绝对 URL 或同源路径如 /hecom-tenancy/）
 * @param {string} raw 非空字符串，通常来自 import.meta.env.VITE_TC_URL
 */
export function normalizeTcUrl(raw) {
  if (raw == null || typeof raw !== 'string' || !raw.trim()) {
    throw new Error('normalizeTcUrl: raw 不能为空，请检查 VITE_TC_URL 是否在 .env 中配置');
  }
  const s = raw.trim();
  if (s.startsWith('http://') || s.startsWith('https://')) {
    return s.endsWith('/') ? s : `${s}/`;
  }
  const path = s.startsWith('/') ? s : `/${s}`;
  return path.endsWith('/') ? path : `${path}/`;
}

/**
 * 租户中心根地址（末尾带 /），唯一来源：构建时注入的 VITE_TC_URL
 */
export function getTcURL() {
  const raw = import.meta.env.VITE_TC_URL;
  if (raw == null || String(raw).trim() === '') {
    throw new Error(
      '[env] 未配置 VITE_TC_URL。请在 .env.development / .env.production / .env.test 等文件中设置租户中心地址'
    );
  }
  return normalizeTcUrl(String(raw).trim());
}

export function getUniverseRoot() {
  if (typeof window === 'undefined') return universePath;
  return `${window.location.origin}${universePath}`;
}

/** PaaS 能力挂在业务网关下：/universe/paas */
export function getPaasRoot() {
  if (typeof window === 'undefined') return `${universePath}/paas`;
  return `${window.location.origin}${universePath}/paas`;
}

function envOverride(key, fallback) {
  const raw = import.meta.env[key];
  if (raw != null && String(raw).trim() !== '') {
    return String(raw).trim().replace(/\/$/, '');
  }
  return fallback;
}

/** foreground 生产：msg.hecom.cn/bigdata；本地开发可在 .env 中覆盖 */
export function getImHost() {
  return envOverride('VITE_IM_HOST', 'https://msg.hecom.cn/bigdata');
}

/** foreground 生产 RCM */
export function getRcmHost() {
  return envOverride('VITE_RCM_HOST', 'https://mm.hecom.cn/mobile-0.0.1-SNAPSHOT/rcm/e');
}

/** foreground 生产 expression */
export function getExpressionHost() {
  return envOverride('VITE_EXPRESSION_HOST', 'https://download.hecom.cn');
}

const easemobDevHosts = [
  'localhost',
  '123.56.24.201',
  '47.94.19.123',
  '112.126.5.122',
  'dev.cloud.hecom.cn',
  'dev-hecomcloud-test.cloud.hecom.cn',
  'dev2.cloud.hecom.cn',
];

/**
 * 环信 WebIM 配置（原 webim.config.js，需在浏览器环境调用）
 */
export function getEasemobWebimConfig() {
  if (typeof window === 'undefined') {
    return {
      xmppURL: 'wss://im-api.easemob.com/ws/',
      apiURL: '//a1.easemob.com',
      appkey: 'tusou001#v40test',
      https: true,
      isMultiLoginSessions: true,
      isAutoLogin: true,
      isWindowSDK: false,
      isSandBox: false,
      isDebug: false,
      autoReconnectNumMax: 2,
      autoReconnectInterval: 2,
      isWebRTC: false,
      heartBeatWait: 4500,
      isHttpDNS: false,
      msgStatus: true,
      delivery: true,
      read: true,
      saveLocal: false,
      encrypt: { type: 'none' },
    };
  }
  const href = window.location.href || '';
  const isOnLine = !easemobDevHosts.some((item) => href.indexOf(item) > -1);
  return {
    xmppURL: isOnLine ? 'wss://im-api-vip6.easemob.com/ws/' : 'wss://im-api.easemob.com/ws/',
    apiURL:
      (window.location.protocol === 'https:' ? 'https:' : 'http:') +
      (isOnLine ? '//a1-vip6.easemob.com' : '//a1.easemob.com'),
    appkey: isOnLine ? 'tusou001#v40' : 'tusou001#v40test',
    https: true,
    isMultiLoginSessions: true,
    isAutoLogin: true,
    isWindowSDK: false,
    isSandBox: false,
    isDebug: false,
    autoReconnectNumMax: 2,
    autoReconnectInterval: 2,
    isWebRTC:
      (/Firefox/.test(navigator.userAgent) || /WebKit/.test(navigator.userAgent)) &&
      /^https\:$/.test(window.location.protocol),
    heartBeatWait: 4500,
    isHttpDNS: false,
    msgStatus: true,
    delivery: true,
    read: true,
    saveLocal: false,
    encrypt: {
      type: 'none',
    },
  };
}

const rawNotifyTab = import.meta.env.VITE_MSG_CENTER_SHOW_NOTIFY_TAB;
/** 消息中心是否展示「通知」Tab；.env 设 false 可关闭 */
export const MSG_CENTER_SHOW_NOTIFICATION_TAB =
  rawNotifyTab == null || String(rawNotifyTab).trim() === ''
    ? true
    : String(rawNotifyTab).toLowerCase() !== 'false';

export default {
  mode,
  version,
  /** 业务网关路径，如 /universe（与历史字段 apiBase 含义一致） */
  universePath,
  get apiBase() {
    return universePath;
  },
  getUniverseRoot,
  getPaasRoot,
  get tcURL() {
    return getTcURL();
  },
  get imHost() {
    return getImHost();
  },
  get rcmHost() {
    return getRcmHost();
  },
  get expressionHost() {
    return getExpressionHost();
  },
  /** @deprecated 请使用 getPaasRoot()，保留兼容 */
  get wpsApiBase() {
    return getPaasRoot();
  },
};
