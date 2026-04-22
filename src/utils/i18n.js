import zhCN from 'src/locales/zh.json';
import enUS from 'src/locales/en.json';

export const LangCN = 'zh-CN';
export const LangEN = 'en-US';

export const LanguageList = [LangCN, LangEN];
export const LanguageKey = 'ai-b-t-language';
/** 与 foreground LanguageServerKey 一致：给接口 user-locale 用（个人/企业语言偏好） */
export const LanguageServerKey = 'ai-b-t-language-server';

const messages = {
  [LangCN]: zhCN,
  [LangEN]: enUS,
};

/** 登录、租户中心等 URL：user-locale 用当前展示语言；其余接口用服务端偏好（foreground getServerLanguage） */
const LoginUrlPatterns = ['/hecom-tenancy/', '/common/adcolumn/'];

let currentLocale = getLanguage();
let currentServerLocal = localStorage.getItem(LanguageServerKey) || currentLocale;

export function setLocale(locale) {
  if (LanguageList.includes(locale)) {
    currentLocale = locale;
    localStorage.setItem(LanguageKey, locale);
    localStorage.setItem(LanguageServerKey, locale);
    currentServerLocal = locale;
  }
}

/**
 * 供请求头 user-locale 使用（值与 foreground 一致：zh-CN / en-US）
 * @param {string} url 请求完整地址或路径，用于区分登录域与业务域
 */
export function getServerLanguage(url = '') {
  const u = String(url || '');
  if (u && LoginUrlPatterns.some((p) => u.includes(p))) {
    return currentLocale;
  }
  return currentServerLocal || currentLocale;
}

/** 登录成功后按用户/企业配置更新接口语言（与 foreground LanguageServerKey 一致） */
export function setServerLanguage(locale) {
  if (!LanguageList.includes(locale)) return;
  currentServerLocal = locale;
  localStorage.setItem(LanguageServerKey, locale);
}

function getLanguage() {
  const userLanguage = localStorage.getItem(LanguageKey);
  if (userLanguage && LanguageList.includes(userLanguage)) {
    return userLanguage;
  }
  const navLang = navigator.language || navigator.userLanguage;
  return navLang.includes('zh') ? LangCN : LangEN;
}

export function getCurrentShowLanguage() {
  return currentLocale;
}

export function t(key, params) {
  let message = messages[currentLocale]?.[key] || messages[LangCN]?.[key] || key;
  if (params) {
    Object.keys(params).forEach((paramKey) => {
      const placeholder = `{{${paramKey}}}`;
      message = message.replace(new RegExp(placeholder, 'g'), String(params[paramKey]));
    });
  }
  if (message?.includes?.('\\n')) {
    message = message.replace(/\\n/g, '\n');
  }
  return message;
}
