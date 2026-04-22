import React from 'react';
import { notification } from 'antd';
import { t } from 'src/utils/i18n';
import { getEasemobWebimConfig } from 'src/config/env';
import RichMsgContent from 'src/components/common/RichMsgContent/RichMsgContent';
import { tryOpenCreditFromMsg } from './openMsgTarget';

let client = null;
let ctx = { navigate: null, dispatch: null };
let initGeneration = 0;

let quickTotal = 0;
let quickTaskNum = 0;
let quickMsgNum = 0;
let batchTimer = null;
let singleTimers = [];

function readMyAuth() {
  try {
    const raw = localStorage.getItem('my');
    if (!raw) return null;
    const my = JSON.parse(raw);
    if (!my?.imId || !my?.imPwd) return null;
    return { imId: my.imId, imPwd: my.imPwd };
  } catch {
    return null;
  }
}

function refreshMsgTotals() {
  ctx.dispatch?.({ type: 'msgCenter/refreshTotals' });
}

function openBatchNotic(taskNum, msgNum) {
  if (taskNum > 0) {
    const taskId = `${Math.random()}task`;
    notification.open({
      message: (
        <a
          role="button"
          tabIndex={0}
          onClick={() => {
            notification.destroy(taskId);
            ctx.navigate?.('/msgCenter');
          }}
        >
          {t('i18n_9b56bad3d3c6f51f')}
        </a>
      ),
      description: <div>{t('i18n_584311551a170f0f', { Identifier1: taskNum })}</div>,
      duration: 5,
      key: taskId,
    });
  }
  if (msgNum > 0) {
    const msgId = `${Math.random()}msg`;
    notification.open({
      message: (
        <a
          role="button"
          tabIndex={0}
          onClick={() => {
            notification.destroy(msgId);
            ctx.navigate?.('/msgCenter');
          }}
        >
          {t('i18n_e9bfe7c62de23105')}
        </a>
      ),
      description: <div>{t('i18n_a98952bcfcb88f15', { Identifier1: msgNum })}</div>,
      duration: 5,
      key: msgId,
    });
  }
}

function handleSystemMsg(msgObj) {
  quickTotal += 1;
  if (msgObj.ext?.body?.type === 'task') {
    quickTaskNum += 1;
  } else {
    quickMsgNum += 1;
  }
  if (quickTotal > 6) {
    clearTimeout(batchTimer);
    singleTimers.forEach(clearTimeout);
    singleTimers = [];
    batchTimer = setTimeout(() => {
      openBatchNotic(quickTaskNum, quickMsgNum);
      quickTotal = 0;
      quickTaskNum = 0;
      quickMsgNum = 0;
    }, 1500);
  } else {
    const tid = setTimeout(() => {
      singleTimers = [];
      openSinglePushNotic(msgObj);
      quickTotal = 0;
      quickTaskNum = 0;
      quickMsgNum = 0;
    }, 1500);
    singleTimers.push(tid);
  }
  refreshMsgTotals();
}

function openSinglePushNotic(msgObj) {
  const body = msgObj.ext?.body || {};
  const titleText = body.title || '';
  const key = msgObj.id || `${Date.now()}`;
  const titleExtendRaw = body.titleExtend;
  const record = {
    titleExtend:
      typeof titleExtendRaw === 'string'
        ? titleExtendRaw
        : titleExtendRaw != null
          ? JSON.stringify(titleExtendRaw)
          : null,
  };

  const goCredit = () => {
    if (tryOpenCreditFromMsg(record, ctx.navigate)) {
      notification.destroy(key);
    }
  };

  notification.open({
    message: (
      <a role="button" tabIndex={0} onClick={goCredit}>
        {titleText}
      </a>
    ),
    description: (
      <div>
        <RichMsgContent defaultText={body.content || ''} richText={body.contentRich || ''} />
      </div>
    ),
    duration: 5,
    key,
  });
}

function onTextMessage(msgObj) {
  if (msgObj.ext && ['msg', 'txt'].includes(msgObj.ext.type)) {
    if (localStorage.hecomLoginTime && Date.now() - +localStorage.hecomLoginTime < 1500) {
      return;
    }
    handleSystemMsg(msgObj);
  }
}

function buildHxIM(WebIM) {
  return class HxIM {
    constructor(config) {
      this.conn = null;
      this.config = Object.assign(
        {
          onTextMessage() {},
          onOpened() {},
          onClosed() {},
          onError() {},
        },
        config.listen || {}
      );
      this.auth = config.auth;
    }

    login() {
      const systemConfig = getEasemobWebimConfig();
      WebIM.config = systemConfig;
      const options = {
        apiUrl: systemConfig.apiURL,
        user: this.auth.imId,
        pwd: this.auth.imPwd,
        appKey: systemConfig.appkey,
      };
      if (!this.auth.imId || !this.auth.imPwd) {
        console.warn('[HxIm] imId 或 imPwd 缺失，跳过环信登录');
        return;
      }
      this.conn = new WebIM.connection({
        isMultiLoginSessions: systemConfig.isMultiLoginSessions,
        https: typeof systemConfig.https === 'boolean' ? systemConfig.https : location.protocol === 'https:',
        url: systemConfig.xmppURL,
        heartBeatWait: systemConfig.heartBeatWait,
        autoReconnectNumMax: systemConfig.autoReconnectNumMax,
        autoReconnectInterval: systemConfig.autoReconnectInterval,
        apiUrl: systemConfig.apiURL,
        isAutoLogin: true,
        isDebug: systemConfig.isDebug,
      });
      this.conn.listen(this.config);
      this.conn.open(options);
      WebIM.logger?.disableAll?.();
    }

    logout() {
      if (this.conn) {
        this.conn.stopHeartBeat();
        this.conn.close();
        this.conn = null;
      }
    }
  };
}

export function initEasemobPush({ navigate, dispatch }) {
  ctx = { navigate, dispatch };
  const auth = readMyAuth();
  if (!auth) {
    console.warn('[easemobPush] 无 imId/imPwd，不连接环信');
    destroyEasemobPush();
    return;
  }

  const gen = ++initGeneration;
  destroyEasemobPush(false);

  (async () => {
    let WebIM;
    try {
      const mod = await import('easemob-websdk/Easemob-chat.js');
      WebIM = mod.default || mod.websdk || mod;
    } catch (e) {
      console.warn('[easemobPush] 加载 easemob-websdk 失败，请执行 npm install（package.json 已声明依赖）', e);
      return;
    }
    if (gen !== initGeneration) return;

    const HxIM = buildHxIM(WebIM);
    client = new HxIM({
      auth,
      listen: {
        onOpened() {
          if (client?.conn?.isOpened?.()) {
            client.conn.heartBeat(client.conn);
          }
        },
        onTextMessage,
        onClosed() {
          client = null;
        },
        onError() {},
      },
    });
    window.YunIm = client;
    try {
      client.login();
    } catch (e) {
      console.warn('[easemobPush] 环信登录失败', e);
      client = null;
      window.YunIm = null;
    }
  })();
}

/** @param {boolean} bumpGen 是否递增代数（登出/销毁连接时为 true；异步登录前清状态为 false） */
export function destroyEasemobPush(bumpGen = true) {
  if (bumpGen) {
    initGeneration += 1;
  }
  try {
    window.YunIm?.logout?.();
  } catch (e) {
    /* ignore */
  }
  window.YunIm = null;
  client = null;
  quickTotal = 0;
  quickTaskNum = 0;
  quickMsgNum = 0;
  clearTimeout(batchTimer);
  batchTimer = null;
  singleTimers.forEach(clearTimeout);
  singleTimers = [];
}
