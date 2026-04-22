import { t } from 'src/utils/i18n';
import { message } from 'antd';
import * as msg from 'src/services/msgCenter';

function cloneParams(payload) {
  try {
    return JSON.parse(JSON.stringify(payload));
  } catch (e) {
    return { ...payload };
  }
}

export default {
  namespace: 'msgCenter',

  state: {
    allTotal: 0,
    todoTotal: 0,
    unreadTotal: 0,
    taskInfo: {},
    msgId: '',
    taskDetail: {},
    unreadTypeName: 'all',
    searchUnreadValue: '',
    searchedUnreadValue: '',
    untreatTypeName: 'all',
    searchUntreatValue: '',
    searchedUntreatedValue: '',
    total: 0,
  },

  effects: {
    *refreshTotals(_, { call, put }) {
      try {
        const [undoRes, unreadRes] = yield [
          call(msg.getUndoTotal, {}),
          call(msg.getUnReadTotal, {}),
        ];
        const todo = undoRes?.result == 0 && undoRes.data != null ? +undoRes.data.todo || 0 : 0;
        const unread =
          unreadRes?.result == 0 && unreadRes.data != null ? Number(unreadRes.data) || 0 : 0;
        yield put({
          type: 'saveReducer',
          payload: {
            todoTotal: todo,
            unreadTotal: unread,
            allTotal: todo + unread,
          },
        });
      } catch (e) {
        console.warn('msgCenter refreshTotals failed', e);
      }
    },

    *getAllData({ payload, callback }, { call, put }) {
      let { untreatParams, unreadParams } = payload;
      untreatParams = cloneParams(untreatParams);
      unreadParams = cloneParams(unreadParams);
      if (untreatParams.type === 'all') delete untreatParams.type;
      if (unreadParams.type === 'all') delete unreadParams.type;

      try {
        const todoData = yield call(msg.getUntreatedMsgListSimple, untreatParams);
        const undoTotalData = yield call(msg.getUndoTotal, {});
        const msgListata = yield call(msg.UnReadMsg, unreadParams);
        const unReadTotalData = yield call(msg.getUnReadTotal, {});

        if (undoTotalData?.data != null) {
          const todo = +undoTotalData.data.todo || 0;
          const unread = unReadTotalData?.data != null ? Number(unReadTotalData.data) || 0 : 0;
          callback?.(
            todo,
            unread,
            todoData?.data?.records || [],
            msgListata?.data?.records
          );
          yield put({
            type: 'saveReducer',
            payload: {
              searchedUntreatedValue: untreatParams.keyword,
              todoTotal: todo,
              searchedUnreadValue: unreadParams.keyword,
              unreadTotal: unread,
              allTotal: todo + unread,
            },
          });
        }
      } catch (e) {
        console.warn('msgCenter getAllData failed', e);
      }
    },

    *getUnReadData({ payload, callback }, { call }) {
      const { unreadParams } = payload;
      try {
        const msgListata = yield call(msg.UnReadMsg, unreadParams);
        if (msgListata?.data) {
          callback?.(msgListata.data.records);
        }
      } catch (e) {
        console.warn('getUnReadData failed', e);
      }
    },

    *getMsgList({ payload, callback }, { call }) {
      try {
        const res = yield call(msg.getMsgList, payload);
        if (res?.result == 0) {
          callback?.(res.data?.records || [], res.data?.totalCount || 0);
        }
      } catch (e) {
        console.warn('getMsgList failed', e);
      }
    },

    *getMsgListByCodes({ payload, callback }, { call }) {
      try {
        const res = yield call(msg.getMsgListByCodes, payload);
        callback?.(res);
      } catch (e) {
        console.warn('getMsgListByCodes failed', e);
      }
    },

    *getUndoTotal({ payload }, { call, put }) {
      try {
        const res = yield call(msg.getUndoTotal, payload?.data ?? {});
        if (res?.result == 0) {
          yield put({ type: 'getUndoTotalSuccess', payload: res.data });
        }
      } catch (e) {
        console.warn('getUndoTotal failed', e);
      }
    },

    *getUnReadTotal({ payload, callback }, { call, put }) {
      try {
        const res = yield call(msg.getUnReadTotal, payload?.data ?? {});
        if (res?.result == 0) {
          yield put({ type: 'getUnReadTotalSuccess', payload: res.data });
          callback?.(res.data);
        }
      } catch (e) {
        console.warn('getUnReadTotal failed', e);
      }
    },

    *updateReadStatus({ payload }, { call }) {
      try {
        const { callback: cb, ...rest } = payload || {};
        const res = yield call(msg.markRead, rest);
        if (res?.result == 0) {
          setTimeout(() => cb?.(), 1000);
        }
      } catch (e) {
        console.warn('updateReadStatus failed', e);
      }
    },

    *claimTask({ payload, callback }, { call }) {
      try {
        const res = yield call(msg.claimTask, payload);
        if (res?.result == 0) {
          callback?.(res.data?.result);
        } else {
          callback?.(res?.data);
        }
      } catch (e) {
        callback?.(null);
        console.warn('claimTask failed', e);
      }
    },

    *getProcessInstanceDetails({ payload, callback }, { call, put }) {
      try {
        const res = yield call(msg.getProcessInstanceDetails, payload);
        if (res?.result == 0) {
          yield put({ type: 'saveReducer', payload: { taskDetail: res.data } });
          callback?.(res.data);
        }
      } catch (e) {
        console.warn('getProcessInstanceDetails failed', e);
      }
    },

    *getUntreatedList({ payload, callback, fromPage }, { call, put, select }) {
      let params = cloneParams(payload);
      const msgData = yield select((s) => s.msgCenter);
      if (!payload.keyword && !fromPage) {
        params.keyword = msgData.searchUntreatValue;
      }
      if (!payload.type && msgData.untreatTypeName !== 'all') {
        params.type = msgData.untreatTypeName;
      }
      if (params.type === 'all') delete params.type;

      try {
        const res = yield call(msg.getUntreatedMsgList, params);
        if (res?.result == 0) {
          yield put({
            type: 'saveReducer',
            payload: { searchedUntreatedValue: params.keyword },
          });
          callback?.(res.data?.records || [], res.data?.totalCount);
        }
      } catch (e) {
        console.warn('getUntreatedList failed', e);
      }
    },

    *getReadMsgList({ payload, callback }, { call, put, select }) {
      let params = cloneParams(payload);
      const msgData = yield select((s) => s.msgCenter);
      if (!payload.keyword) {
        params.keyword = msgData.searchUnreadValue;
      }
      if (!payload.type && msgData.unreadTypeName !== 'all') {
        params.type = msgData.unreadTypeName;
      }
      if (params.type === 'all') delete params.type;

      try {
        const res = yield call(msg.UnReadMsg, params);
        if (res?.result == 0) {
          yield put({
            type: 'saveReducer',
            payload: {
              total: res.data?.totalCount || 0,
              searchedUnreadValue: params.keyword,
            },
          });
          const records = res.data?.records || [];
          callback?.(records);
          return records;
        }
      } catch (e) {
        console.warn('getReadMsgList failed', e);
      }
      return [];
    },

    *getMsgTypeList({ payload, callback }, { call }) {
      try {
        const unreadRes = yield call(msg.unreadTypeList, payload || {});
        const untreatRes = yield call(msg.untreatTypeList, payload || {});
        if (unreadRes?.result == 0 || untreatRes?.result == 0) {
          callback?.(unreadRes?.data, untreatRes?.data);
        }
      } catch (e) {
        console.warn('getMsgTypeList failed', e);
      }
    },

    *updateInformStatus({ payload }, { call }) {
      try {
        const { callback: cb, code } = payload || {};
        const res = yield call(msg.markRead, { code });
        if (res?.result == 0 && cb) {
          setTimeout(cb, 1000);
        }
      } catch (e) {
        console.warn('updateInformStatus failed', e);
      }
    },

    *updateAllInformStatus({ payload, callback }, { call }) {
      try {
        const res = yield call(msg.markAllRead, payload?.listFilter || payload || {});
        if (res) {
          if (String(res.result) === '4100002') {
            message.warning(res.desc || '');
          }
          callback?.();
        }
      } catch (e) {
        console.warn('updateAllInformStatus failed', e);
      }
    },

    *submitTask({ payload, callback }, { call }) {
      try {
        const body = payload?.data ? { ...payload.data } : { ...payload };
        if (payload?.validateParam !== undefined) {
          body.validateParam = payload.validateParam;
        }
        const res = yield call(msg.submitTask, body);
        if (res?.result == 0) {
          message.success(t('i18n_f71e09077f9af9ad'));
          if (callback) {
            setTimeout(() => callback(null, true), 1500);
          }
        } else if (res?.desc) {
          message.error(res.desc);
        }
      } catch (e) {
        console.warn('submitTask failed', e);
      }
    },

    *unReadTodoCount({ payload, callback }, { call }) {
      try {
        const res = yield call(msg.unReadTodoCount, payload);
        if (res?.data) {
          callback?.(res.data);
        }
      } catch (e) {
        console.warn('unReadTodoCount failed', e);
      }
    },
  },

  reducers: {
    saveReducer(state, { payload }) {
      return { ...state, ...payload };
    },
    getUnReadTotalSuccess(state, { payload }) {
      const unread = payload != null ? Number(payload) || 0 : 0;
      return {
        ...state,
        unreadTotal: unread,
        allTotal: unread + state.todoTotal,
      };
    },
    getUndoTotalSuccess(state, { payload }) {
      const todo = payload?.todo != null ? +payload.todo : 0;
      return {
        ...state,
        todoTotal: todo,
        allTotal: todo + state.unreadTotal,
      };
    },
  },
};
