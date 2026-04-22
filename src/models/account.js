import { t } from 'src/utils/i18n';
import { message } from 'antd';
import ENV, { getUniverseRoot } from 'src/config/env';
import { tcPost } from 'src/services/tcApi';
import { listAllEnterpriseUsers } from 'src/services/account';
import { runMainDataLoaders } from 'src/lib/mainData';
import { getClientTag, isLoggedInLocally } from 'src/utils/login';

function readLsJson(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw || raw === 'undefined') return fallback;
    return JSON.parse(raw);
  } catch (e) {
    return fallback;
  }
}

/** 登录「记住我」相关；loginEntInfo 内 localStorage.clear 前需快照并在 clear 后写回，否则退出后再打开弹窗无手机号 */
const LOGIN_REMEMBER_LS_KEYS = ['remember', 'rem_account', 'rem_wordpas', 'loginPrefix'];

function snapshotLoginRememberLocalStorage() {
  const out = {};
  LOGIN_REMEMBER_LS_KEYS.forEach((k) => {
    const v = localStorage.getItem(k);
    if (v != null) out[k] = v;
  });
  return out;
}

function restoreLoginRememberLocalStorage(snapshot) {
  if (!snapshot) return;
  Object.entries(snapshot).forEach(([k, v]) => localStorage.setItem(k, v));
}

const isDev = import.meta.env.DEV;

export default {
  namespace: 'account',

  state: {
    // 是否已登录（与 localStorage auth/my 一致）,登陆后会自动变为 true
    isLogined: isLoggedInLocally(),

    auth: readLsJson('auth', {}),
    my: readLsJson('my', {}),
    userDetail: readLsJson('userDetail', null),
    entDetails: readLsJson('entDetails', {}),
    entList: [],
    /** 用户权限树，登录后由 getUserAuths 拉取（ManageBtn / 配置端入口） */
    authList: null,
    /** 企业全部用户（表头 User 类筛选等公用，由 listAll 分页拉全量） */
    entUserList: [],
    theme: localStorage.getItem('theme') || 'white',
    webMenuShowType: localStorage.getItem('webMenuShowType') || '1',
  },

  reducers: {
    saveReducer(state, { payload }) {
      return { ...state, ...payload };
    },
    syncLoginState(state) {
      return { ...state, isLogined: isLoggedInLocally() };
    },
  },

  effects: {
    /** 已登录时拉取主数据（首屏、登录成功后共用） */
    *fetchMainData(_, { put, select, call }) {
      if (!isLoggedInLocally()) return;
      yield* runMainDataLoaders({ put, select, call });
    },

    /** 拉取当前企业全部用户，供表头筛选等复用（与 foreground fetchAllEmp + listAll 一致） */
    *fetchEntUserList(_, { call, put }) {
      const pageSize = 1000;
      const basePayload = {
        meta: { metaName: 'User' },
        filter: {},
        sorts: [{ field: 'updatedOn', orderType: 1 }],
        page: { pageNo: 1, pageSize },
      };
      try {
        const first = yield call(listAllEnterpriseUsers, { ...basePayload });
        const data0 = first?.data;
        if (!data0) {
          yield put({ type: 'saveReducer', payload: { entUserList: [] } });
          return;
        }
        let merged = [...(data0.records || [])];
        const totalPageNo = Math.ceil((data0.totalCount || 0) / pageSize) || 1;
        let pageNo = 1;
        while (pageNo < totalPageNo) {
          pageNo += 1;
          const next = yield call(listAllEnterpriseUsers, {
            ...basePayload,
            page: { pageNo, pageSize },
          });
          const d = next?.data;
          if (d?.records?.length) merged = merged.concat(d.records);
        }
        yield put({ type: 'saveReducer', payload: { entUserList: merged } });
      } catch (e) {
        console.warn('fetchEntUserList failed', e);
      }
    },

    *tcLogin({ payload, callback }, { put }) {
      const res = yield tcPost(ENV.tcURL + 'cloud/user/signIn', JSON.stringify(payload));
      if (res.result === '0' || res.result === 0) {
        const data = res.data;
        let entList = data.entInfo;
        if (!entList || entList.length === 0) {
          message.warning(t('i18n_a250d9882fbe373f'));
          return;
        }
        yield put({ type: 'saveReducer', payload: { entList } });
        if (entList.length === 1) {
          callback?.({
            entInfo: entList[0],
            uid: data.uid,
            account: payload.account,
            accessToken: data.accessToken,
            accessCode: data.accessCode,
          });
        } else {
          callback?.({
            uid: data.uid,
            account: payload.account,
            accessToken: data.accessToken,
            accessCode: data.accessCode,
          });
        }
      } else {
        callback?.([], res.result);
        if (res.desc) message.error(res.desc);
      }
    },

    *loginEntInfo({ payload, query = {}, callback, clearCache }, { put, select, call }) {
      const entInfo = payload.entInfo;
      const authorizeLoginTag = payload?.clientTag || localStorage.getItem('authorizeLoginTag');
      if (entInfo && entInfo.endTime && entInfo.endTime * 1000 < Date.now()) {
        message.warning(t('i18n_54d8a187639528d4'));
        return;
      }
      const isPre = window.location.origin.includes('pre');
      const serverMap = {};
      entInfo?.podServerList?.forEach((row) => {
        if (isPre) {
          let url = row.url.replace('https://cloud.hecom.cn', window.location.origin);
          url = url.replace('https://cloud1.hecom.cn', 'https://pre1.cloud.hecom.cn');
          url = url.replace('/v1/', '/');
          url = url.replace('/cloud-gray.', '/pre.cloud.');
          url = url.replace('/cloud1-gray.', '/pre1.cloud.');
          serverMap[row.name] = url;
        } else {
          serverMap[row.name] = row.url;
        }
      });

      const params = {
        accessToken: payload.accessToken,
        accessCode: payload.accessCode,
        entCode: entInfo.entCode,
        uid: payload.uid,
        realUid: payload.realUid,
        realEntCode: payload.realEntCode,
        realEmpCode: payload.realEmpCode,
        realEmpName: payload.realEmpName,
        empCode: entInfo.empCode,
        clientTag: getClientTag(
          authorizeLoginTag
            ? authorizeLoginTag
            : payload?.clientTag
              ? payload.clientTag
              : window.location.origin.includes('pre')
                ? 'web-pre'
                : 'web'
        ),
        time: Date.now(),
      };
      if (payload.smsBizType) {
        params.smsBizType = payload.smsBizType;
        params.verifyCode = payload.verifyCode;
        params.account = payload.account;
      }

      if (!isPre && !isDev && serverMap.web && serverMap.web.indexOf(window.location.origin) === -1 && !query.isPre) {
        if (payload.account) {
          const codeParam = { account: payload.account, accessToken: payload.accessToken, clientTag: 'web' };
          const codeRes = yield tcPost(ENV.tcURL + 'cloud/user/getCode', JSON.stringify(codeParam));
          if (codeRes?.data) {
            window.location.href =
              serverMap.web +
              '?code=' +
              codeRes.data.accessCode +
              '&ent=' +
              entInfo.entCode +
              (authorizeLoginTag ? '&authorizeLogin=' + JSON.stringify(payload) : '');
          }
        } else {
          window.location.href =
            serverMap.web +
            '?code=' +
            payload.accessCode +
            '&ent=' +
            entInfo.entCode +
            (authorizeLoginTag ? '&authorizeLogin=' + JSON.stringify(payload) : '');
        }
        return;
      }

      let authURL = isDev ? `${getUniverseRoot()}/` : serverMap.main;
      if (!isDev && query.isPre) {
        authURL = window.location.origin + '/universe/';
      }
      if (clearCache) {
        localStorage.removeItem('webMenuShowType');
        localStorage.removeItem('theme');
      }

      const loginUrl = authURL + 'user/login';
      const info = yield tcPost(loginUrl, JSON.stringify(params));

      if (info.result == '0' || info.result === 0) {
        const accountMy = yield select((state) => state.account.my);
        const lastEnt = localStorage.getItem('lastEnt');
        const useDebug = localStorage.getItem('hecomDebug');

        if (lastEnt != info.data.code + entInfo.entCode) {
          const activityShowTime = localStorage.getItem(`${accountMy?.uid}_activityShowTime`);
          const loginRememberSnapshot = snapshotLoginRememberLocalStorage();
          localStorage.clear();
          sessionStorage.clear();
          restoreLoginRememberLocalStorage(loginRememberSnapshot);
          if (accountMy?.uid && activityShowTime) {
            localStorage.setItem(`${accountMy.uid}_activityShowTime`, activityShowTime);
          }
          if (useDebug === 'true') {
            localStorage.setItem('hecomDebug', 'true');
          }
        }

        if (authorizeLoginTag) {
          localStorage.setItem('authorizeLoginTag', authorizeLoginTag);
          localStorage.setItem(
            'realAuthInfo',
            JSON.stringify({
              realEmpCode: accountMy.code,
              realEntCode: accountMy.entCode,
              realUid: accountMy.uid,
            })
          );
        }

        const isMultiTabMode = !!Number(info.data?.webMultiTabSwitch) && !window.window?.ReactNativeWebView?.postMessage;
        window.isMultiTabMode = isMultiTabMode;
        window.multipleTabObj = {};
        localStorage.setItem('isMultiTabMode', JSON.stringify(isMultiTabMode));
        localStorage.setItem('isMultiTabModeManage', JSON.stringify(isMultiTabMode));
        localStorage.setItem('justLoginAtNow', 'true');
        const webMenuShowType =
          localStorage.getItem('webMenuShowType') || query.menuSet || info.data.webMenuShowType;
        localStorage.setItem('authURL', authURL);
        localStorage.setItem('webURL', serverMap.web);
        localStorage.setItem('tenantURL', serverMap.tenant);
        localStorage.setItem('auth', JSON.stringify(params));
        localStorage.setItem('my', JSON.stringify(info.data));
        localStorage.setItem('entDetails', JSON.stringify(entInfo));
        localStorage.setItem('unReadMessage', JSON.stringify({}));
        localStorage.setItem('timezone', info.data.userTimeZone || 'Asia/Shanghai');

        if (!localStorage.getItem('webMenuShowType')) {
          localStorage.setItem('webMenuShowType', webMenuShowType);
          const newTheme = webMenuShowType === '2' ? 'black' : 'white';
          localStorage.setItem('theme', newTheme);
          yield put({ type: 'saveReducer', payload: { theme: newTheme } });
        }
        document.documentElement.style.setProperty(`--theme-top`, webMenuShowType != 2 ? '93px' : '53px');
        document.documentElement.style.setProperty(`--theme-minus-top`, webMenuShowType != 2 ? '-93px' : '-53px');

        yield put({
          type: 'saveReducer',
          payload: {
            my: info.data,
            auth: params,
            entDetails: entInfo,
            webMenuShowType,
            isLogined: true,
            entUserList: [],
          },
        });

        const isGray = window.location.href.indexOf('/v1') !== -1;
        const hasDiffy = serverMap.web !== window.location.origin + (isGray ? '/v1/' : '/');

        if (hasDiffy && !isDev && !query.isPre) {
          setTimeout(() => {
            localStorage.setItem('lastEnt', info.data.code + entInfo.entCode);
            window.location.href = serverMap.web;
          }, 500);
        } else {
          localStorage.setItem('lastEnt', info.data.code + entInfo.entCode);
          callback?.();
        }
      } else if (info.result == '51022') {
        /* reserved */
      } else {
        localStorage.removeItem('my');
        localStorage.removeItem('userDetail');
        localStorage.removeItem('entDetails');
        localStorage.removeItem('auth');
        localStorage.removeItem('unReadMessage');
        yield put({
          type: 'saveReducer',
          payload: { my: null, auth: null, userDetail: null, entDetails: {}, authList: null, isLogined: false, entUserList: [] },
        });
        callback?.(info.result);
      }
    },

    *getSalt({ payload, callback }) {
      const res = yield tcPost(ENV.tcURL + 'cloud/user/getSalt.do', JSON.stringify(payload));
      if (res?.data) {
        callback?.(res.data);
      } else if (res?.desc) {
        message.error(res.desc);
      }
    },

    *loginFailStatus({ payload, callback }) {
      const res = yield tcPost(ENV.tcURL + 'cloud/user/loginFailStatus.do', JSON.stringify(payload));
      callback?.(res?.data);
    },

    *getPolicy({ payload, callback }) {
      const res = yield tcPost(ENV.tcURL + 'cloud/user/pwdPolicy.do', JSON.stringify(payload));
      if (res?.data) {
        callback?.(res.data);
      }
    },

    *verifyCode({ payload, callback }) {
      const res = yield tcPost(ENV.tcURL + 'cloud/user/verify.do', JSON.stringify(payload));
      callback?.(res?.data);
    },

    *isExistAccount({ payload, callback }) {
      const res = yield tcPost(ENV.tcURL + 'cloud/user/isExistAccount.do', JSON.stringify(payload));
      callback?.(res?.data);
    },

    *sendSms({ payload, callback }) {
      const res = yield tcPost(ENV.tcURL + 'cloud/user/sendSmsCode', JSON.stringify(payload));
      callback?.(res.result);
    },

    *sendSmsNoImgCode({ payload, callback }) {
      const res = yield tcPost(ENV.tcURL + 'cloud/user/sendSmsNoImgCode.do', JSON.stringify(payload));
      if (res.result == '0' || res.result === 0) {
        callback?.(true);
      }
    },

    *tcSmsLogin({ payload, callback }) {
      const res = yield tcPost(
        ENV.tcURL + 'cloud/user/loginByVCodeAndSetPassword.do',
        JSON.stringify(payload)
      );
      const data = res?.data;
      if (data) {
        if (!data.entInfo || data.entInfo.length === 0) {
          message.warning(t('i18n_a250d9882fbe373f'));
          return;
        }
        callback?.();
      } else if (res?.desc) {
        message.error(res.desc);
      }
    },
  },
};
