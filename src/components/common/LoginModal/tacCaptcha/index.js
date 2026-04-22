/**
 * TAC 图形验证码（自 cloud-web-foreground/src/routes/login/tacCaptcha）
 */
import { loadTAC } from './load.js';
import ENV from 'src/config/env.js';
import { getClientTag } from 'src/utils/login';
import { getServerLanguage } from 'src/utils/i18n.js';

export const DEFAULT_REQUEST_CAPTCHA_URL = ENV.tcURL + 'cloud/user/captcha/gen';
export const DEFAULT_VALID_CAPTCHA_URL = ENV.tcURL + 'cloud/user/captcha/check';
export const DEFAULT_BIND_EL = '#captcha-box';
export const TAC_BASE_PATH = '/assets/js/tac';

export function getTacCaptchaConfig(options = {}) {
  const {
    setTacCaptchaOpen,
    onSuccess = () => {},
    requestCaptchaDataUrl = DEFAULT_REQUEST_CAPTCHA_URL,
    validCaptchaUrl = DEFAULT_VALID_CAPTCHA_URL,
    bindEl = DEFAULT_BIND_EL,
  } = options;

  const clientTagDefault = typeof window !== 'undefined' && window.location?.origin?.includes('pre') ? 'web-pre' : 'web';

  return {
    requestCaptchaDataUrl,
    validCaptchaUrl,
    bindEl,
    /** 与 tcPost / foreground request 对齐，避免后端校验缺少 version、clientTag */
    requestHeaders: {
      version: ENV.version,
      clientTag: typeof window !== 'undefined' ? getClientTag(clientTagDefault) : clientTagDefault,
      'user-locale': getServerLanguage(requestCaptchaDataUrl),
    },
    validSuccess: (res, c, t) => {
      if (res?.data?.id) {
        onSuccess(res.data.id);
        setTacCaptchaOpen?.(false);
        t.destroyWindow();
      } else {
        t.reloadCaptcha();
      }
    },
    validFail: (res, c, t) => {
      t.reloadCaptcha();
    },
    btnRefreshFun: (el, tac) => {
      tac.reloadCaptcha();
    },
    btnCloseFun: (el, tac) => {
      setTacCaptchaOpen?.(false);
      tac.destroyWindow();
    },
  };
}

export function initTacCaptcha(setTacCaptchaOpen, onSuccess, options = {}) {
  const { style = {}, ...configOverrides } = options;
  const captchaConfig = getTacCaptchaConfig({
    setTacCaptchaOpen,
    onSuccess: onSuccess || (() => {}),
    ...configOverrides,
  });
  return loadTAC(TAC_BASE_PATH, captchaConfig, style)
    .then((tac) => {
      tac.init();
      setTacCaptchaOpen?.(true);
      return tac;
    })
    .catch((e) => {
      console.warn('TAC 验证码加载失败', e);
    });
}
