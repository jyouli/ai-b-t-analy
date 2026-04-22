import bcrypt from 'bcryptjs';
import CryptoJS from 'crypto-js';
import eventBus from 'src/utils/EventBus';
import { EventBusActions } from 'src/utils/EventBusActions';
import { t } from 'src/utils/i18n';
import { destroyEasemobPush } from 'src/routes/msgCenter/easemobPush';

// --- authGate ---

/**
 * 是否与登录成功后写入的 localStorage 一致（供首屏/布局判断是否弹出登录）
 */
export function isLoggedInLocally() {
  try {
    const authRaw = localStorage.getItem('auth');
    const myRaw = localStorage.getItem('my');
    if (!authRaw || !myRaw) return false;
    const auth = JSON.parse(authRaw);
    const my = JSON.parse(myRaw);
    if (!auth?.accessToken) return false;
    if (!my?.uid && !my?.code) return false;
    return true;
  } catch {
    return false;
  }
}

// --- loginAccount（与 cloud-web-foreground/src/utils/util.js 一致）---

export function getClientTag(clientTag) {
  const params = new URLSearchParams(window.location.search);
  const largeScreenStorageKey = 'largeScreenClientTag';
  let clientTagInStorage = localStorage.getItem(largeScreenStorageKey);
  const qTag = params.get('clientTag');
  if (qTag && !clientTagInStorage) {
    localStorage.setItem(largeScreenStorageKey, qTag);
  }
  return qTag || clientTagInStorage || clientTag;
}

export function formatLoginAccount(prefix, val) {
  if (['email', '+86'].includes(prefix) || !prefix) {
    return val;
  }
  let p = prefix;
  if (p && p.includes('_')) {
    p = p.split('_')[0];
  }
  return `${p}-${val}`;
}

// --- loginCrypto ---

export function sha1(input, { mode } = { mode: CryptoJS.enc.Hex }) {
  const result = CryptoJS.SHA1(input);
  return mode.stringify(result);
}

export function sha256(input, { mode } = { mode: CryptoJS.enc.Hex }) {
  const result = CryptoJS.SHA256(input);
  return mode.stringify(result);
}

export function string2Base62(input) {
  return base62Encode(_stringToBytes(input));
}

export function sha256ByBase64(input) {
  return sha256(input, { mode: CryptoJS.enc.Base64 });
}

export function AESEncrypt(content, key, cfg = { mode: CryptoJS.mode.ECB, padding: CryptoJS.pad.Pkcs7 }) {
  const byteKey = CryptoJS.MD5(key);
  const encrypted = CryptoJS.AES.encrypt(content, byteKey, cfg);
  return encrypted.toString();
}

export function base62Encode(byteArr, outLength = 0) {
  let out = '';
  let b;
  for (let i = 0; i < byteArr.length; i += 3) {
    b = (byteArr[i] & 0xfc) >> 2;
    out += _append(b);
    b = (byteArr[i] & 0x03) << 4;
    if (i + 1 < byteArr.length) {
      b |= (byteArr[i + 1] & 0xf0) >> 4;
      out += _append(b);
      b = (byteArr[i + 1] & 0x0f) << 2;
      if (i + 2 < byteArr.length) {
        b |= (byteArr[i + 2] & 0xc0) >> 6;
        out += _append(b);
        b = byteArr[i + 2] & 0x3f;
        out += _append(b);
      } else {
        out += _append(b);
      }
    } else {
      out += _append(b);
    }
  }
  if (outLength > 0) {
    return out.substr(0, outLength);
  }
  return out;
}

function _stringToBytes(str) {
  let pos = 0;
  let len = str.length;
  if (len % 2 !== 0) {
    return null;
  }
  len /= 2;
  const hexA = [];
  for (let i = 0; i < len; i++) {
    const s = str.substr(pos, 2);
    const v = parseInt(s, 16);
    hexA.push(v);
    pos += 2;
  }
  return hexA;
}

function _append(b) {
  const CODES = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  const CODEFLAG = '9';
  return b < 61 ? CODES.charAt(b) : CODEFLAG + CODES.charAt(b - 61);
}

/**
 * 与 cloud-web-foreground 登录页 _encodePassword 一致
 */
export function encodePasswordForLogin(password, { r1, r2, r3, uid }) {
  const sha256Slice = string2Base62(sha256('cloud-' + password)).slice(0, 32);
  const sha1Val = string2Base62(sha1(sha256Slice + '-' + r1));
  const hash1 = bcrypt.hashSync(sha1Val, r2);
  const hash2 = sha256ByBase64(hash1 + '-' + r3);
  const json = { hash: hash1, uid };
  return AESEncrypt(JSON.stringify(json), hash2);
}

/** 忘记密码流程 set password */
export function encodePasswordPlainForSmsReset(plain) {
  return string2Base62(sha256('cloud-' + plain)).slice(0, 32);
}

// --- passwordPolicy（与 cloud-web-foreground/src/routes/login/validate.js 一致）---

export function checkPass(_rule, value, callback, rules, account) {
  if (rules.pwdSameChar == 0) {
    const arr = value.split('');
    for (let i = 1, len = arr.length; i < len; i++) {
      if (arr[i] === arr[i - 1]) {
        callback(t('i18n_02ef5ff4aa69b7ad'));
        return;
      }
    }
  }
  if (rules.pwdNumber) {
    if (!/(?=(?:[^0-9]*[0-9]){1})/.test(value)) {
      callback(t('i18n_a4a76a3c66959223'));
      return;
    }
  }
  if (rules.pwdUpperCase) {
    if (!/(([A-Z]){1})/.test(value)) {
      callback(t('i18n_8775bc0694fa51a4'));
      return;
    }
  }
  if (rules.pwdLowerCase) {
    if (!/(([a-z]){1})/.test(value)) {
      callback(t('i18n_3134544db9af9837'));
      return;
    }
  }
  if (rules.pwdSpecialChar) {
    if (!/(([!@#%^$:;+?&*~]){1})/.test(value)) {
      callback(t('i18n_c8fa4e04a3f6c169'));
      return;
    }
  }
  if (rules.pwdMinLength && value.length < rules.pwdMinLength) {
    callback(t('i18n_f5490e03a224b02e', { min: rules.pwdMinLength }));
    return;
  }
  if (rules.pwdEqualAccount == 0 && account) {
    const reversed = account.split('').reverse().join('');
    if (value === account || value === reversed) {
      callback(t('i18n_3aa6b571dcde62f6'));
      return;
    }
  }
  callback();
}

// --- loginBridge ---

/** 与 BasicLayout 中 LoginModal 可见性同步，避免重复弹出 */
let loginModalOpen = false;

export function setGlobalLoginModalOpen(open) {
  loginModalOpen = !!open;
}

/**
 * 弹出登录（已打开时无效）
 */
export function showLogin() {
  if (loginModalOpen) return;
  loginModalOpen = true;
  eventBus.emit(EventBusActions.SHOW_LOGIN_MODAL);
}

/**
 * 是否已登录（与 localStorage auth/my 一致）
 * @param {boolean} [autoShowLoginIfNeeded=false] 未登录时是否自动调起登录弹窗
 * @returns {boolean}
 */
export function isLogined(autoShowLoginIfNeeded = false) {
  const ok = isLoggedInLocally();
  if (!ok && autoShowLoginIfNeeded) showLogin();
  return ok;
}

/** 退出登录：清本地会话并同步 account（与 request 会话失效清理项对齐） */
export function clearAppSession(dispatch) {
  destroyEasemobPush();
  localStorage.removeItem('auth');
  localStorage.removeItem('my');
  localStorage.removeItem('userDetail');
  localStorage.removeItem('entDetails');
  localStorage.removeItem('unReadMessage');
  dispatch?.({
    type: 'account/saveReducer',
    payload: { my: null, auth: null, userDetail: null, entDetails: {}, authList: null, isLogined: false, entUserList: [] },
  });
}

export function installWindowLoginApi() {
  window.isLogined = isLogined;
  window.showLogin = showLogin;
}

// --- manageConsoleAuth（对齐 cloud-web-foreground ManageBtn.js）---

export function getManageConsoleHref() {
  const isV1 = window.location.href.indexOf('hecom.cn/v1/') > -1;
  return window.location.origin + (isV1 ? '/ccmsv1/' : '/ccms/');
}

/** authList 中存在任一 app: 前缀的 key 则认为有管理后台权限 */
export function hasAppManageAuth(authList) {
  if (!authList || typeof authList !== 'object') return false;
  for (const key of Object.keys(authList)) {
    if (key.indexOf('app:') > -1) return true;
  }
  return false;
}

/** 与 ManageBtn 显示条件一致：已登录、非供应商外协门户、且有 app 权限 */
export function shouldShowManageConsoleButton(isLogined, authList) {
  if (!isLogined) return false;
  if (localStorage.getItem('ProcurePortal')) return false;
  return hasAppManageAuth(authList);
}
