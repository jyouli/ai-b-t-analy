import * as common from 'src/services/commom';
import { message } from 'antd';
import { deleteErrorHandle } from 'src/lib/tools';

export default {
	namespace: 'common',
	state: {
		metaInfoMap: {},
	},
	subscriptions: {},
	effects: {
		*getMetaAllDetail({ payload, callback }, { call, put, select }) {
			const metaName = payload?.metaName;
			if(!metaName) {
				callback && callback(null);
				return;
			}
			const metaInfoMap = yield select((state) => state?.common?.metaInfoMap || {});
			if(metaInfoMap[metaName]) {
				callback && callback(metaInfoMap[metaName]);
				return;
			}
			const { data } = yield call(common.getMetaAllDetail, payload);
			if(data) {
				yield put({ type: 'setMetaInfo', payload: { metaName: payload.metaName, metaInfo: data } });
				callback && callback(data);
			}
		},
		*getBizList({ payload, callback }, { call }) {
			const { data, desc, result } = yield call(common.getBizList, payload, payload?.meta?.metaName);
			callback && callback(data?.records || [], data?.totalCount || 0);
			if(result != 0) {
				message.error(desc);
				return;
			}
		},
		*getBizDetail({ payload, callback }, { call, put, select }) {
			const { data, desc, result } = yield call(common.getBizDetail, payload, payload?.metaName);
			if(result == 0) {
				callback && callback(data?.records?.[0]?.record);
			} else {
				message.error(desc);
				callback && callback(null);
				return;
			}
		},
		*deleteBizData({ payload, callback }, { call, put, select }) {
			const { desc, result } = yield call(common.deleteBizData, payload, payload.metaName);
			if(result == 0) {
				callback && callback();
			} else {
				message.error(desc);
			}
		},
		*saveBizData({ payload, callback, isEdit }, { call, put, select }) {
			const { data } = yield call(isEdit ? common.editBizData : common.createBizData, payload, payload?.metaData?.name);
			if(data) {
				callback && callback(data);
			}
		},
		*batchDeleteBizData({ payload, callback }, { call }) {
			const { result, data, desc } = yield call(common.batchDeleteBizData, payload, payload?.metaName);
			if(result == 0) {
				callback && callback(data);
			} else {
				message.error(desc);
			}
		},
	},
	reducers: {
		setMetaInfo(state, { payload }) {
			const metaInfoMap = { ...(state.metaInfoMap || {}), [payload.metaName]: payload.metaInfo };
			return { ...state, metaInfoMap };
		},
		setState(state, { payload }) {
			return { ...state, ...(payload || {}) };
		},
	},
};
