import * as creditService from 'src/services/credit';
import { message } from 'antd';

export default {
    namespace: 'credit',
    state: {
        
    },
    effects: {
        // 营业执照识别（SSE）
        *analyzeBusinessLicense({ payload, onMessage, onError, onDone }, { call }) {
            const ctrl = yield call(creditService.analyzeBusinessLicenseSSE, payload, {
                onMessage: (evt) => onMessage?.(evt),
                onError: (err) => onError?.(err),
                onComplete: () => onDone?.(),
            });
            return ctrl;
        },
        *parseBusinessBid({ payload, callback }, { call }) {
            const { data, desc, result } = yield call(creditService.parseBusinessBid, payload);
            if(result == 0) {
                callback(data);
            } else {
                message.error(desc);
            }
        },
        *parseCreditItems({ payload, callback }, { call }) {
            const { data, desc, result } = yield call(creditService.parseCreditItems, payload);
            if(result == 0) {
                callback(data);
            } else {
                message.error(desc);
            }
        },
        *getTaskStatus({ payload, callback }, { call }) {
            const { data, desc, result } = yield call(creditService.getTaskStatus, payload);
            if(result == 0) {
                callback(data);
            } else {
                message.error(desc);
            }   
        },
    },
    reducers: {
        saveReducer(state, { payload }) {
            return { ...state, ...payload };
        },
    },
};
