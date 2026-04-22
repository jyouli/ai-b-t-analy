import { userInfo, allAuthOfUser } from 'src/services/account';
import * as uploadService from 'src/services/upload';
import fileOxs, {
  setLocalStorage,
  OSS_READ_PARAM_KEY,
  OSS_CONFIG_KEY,
  OSS_READ_TIME_KEY,
} from 'src/lib/fileOxs';

/**
 * 登录态下「主数据」拉取：项目加载后、登录成功后都会跑同一套。
 * 新增接口：在下面 MAIN_DATA_SAGAS 里追加一个 function* (ctx) { ... } 即可。
 *
 * @param {object} ctx
 * @param {function} ctx.put - dva put
 * @param {function} ctx.select - dva select
 * @param {function} ctx.call - redux-saga call（与 upload 模型中 initOssConfig 逻辑一致）
 */

function* fetchAllUserAuth(ctx) {
  const { put, call } = ctx;
  try {
    const res = yield call(allAuthOfUser, {});
    const authInfo = res?.data?.authInfo ?? res?.authInfo;
    if (authInfo != null) {
      yield put({ type: 'account/saveReducer', payload: { authList: authInfo } });
    }
  } catch (e) {
    console.warn('fetch user auths failed', e);
    yield put({ type: 'account/saveReducer', payload: { authList: null } });
  }
}

function* fetchUserDetail(ctx) {
  const { put, select } = ctx;
  const my = yield select((s) => s.account?.my);
  const code = my?.code;
  if (!code) return;
  try {
    const detailRes = yield userInfo({ code: String(code) });
    if (detailRes?.data != null) {
      localStorage.setItem('userDetail', JSON.stringify(detailRes.data));
      yield put({ type: 'account/saveReducer', payload: { userDetail: detailRes.data } });
    }
  } catch (e) {
    console.warn('fetch user detail failed', e);
  }
}

/** 与 models/upload initOssConfig 同步：首屏预拉 OSS + 读权限，避免上传组件竞态 */
function* initOssOnBoot(ctx) {
  const { select, call } = ctx;
  const my = yield select((s) => s.account?.my);
  if (!my?.code) return;
  try {
    const [ossRes, readRes] = yield [
      call(uploadService.getOssConfig, {}),
      call(uploadService.getReadParam, {}),
    ];
    if (ossRes?.data) {
      setLocalStorage(OSS_CONFIG_KEY, ossRes.data);
    }
    if (readRes?.data) {
      setLocalStorage(OSS_READ_PARAM_KEY, readRes.data);
      setLocalStorage(OSS_READ_TIME_KEY, Date.now());
    }
    fileOxs.refreshConfig();
  } catch (e) {
    console.warn('init oss config on boot failed', e);
  }
}

function* fetchMsgCenterTotals(ctx) {
  const { put } = ctx;
  yield put({ type: 'msgCenter/refreshTotals' });
}

function* fetchEntUserListMain(ctx) {
  const { put } = ctx;
  yield put({ type: 'account/fetchEntUserList' });
}

export const MAIN_DATA_SAGAS = [
  fetchAllUserAuth,
  fetchUserDetail,
  initOssOnBoot,
  fetchMsgCenterTotals,
  fetchEntUserListMain,
];

export function* runMainDataLoaders(ctx) {
  for (const saga of MAIN_DATA_SAGAS) {
    yield* saga(ctx);
  }
}
