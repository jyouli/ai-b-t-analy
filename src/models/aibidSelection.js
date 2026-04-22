/**
 * Dva model：AI 选标接口编排。
 */
import * as aibidSelectionService from 'src/services/aibidSelection';

export default {
  namespace: 'aibidSelection',
  state: {
    lastAnalyzeStatus: null,
  },
  effects: {
    *startAnalyzing({ payload }, { call }) {
      return yield call(aibidSelectionService.startAnalyzing, payload);
    },
    *retryAnalyze({ payload }, { call }) {
      return yield call(aibidSelectionService.retryAnalyze, payload);
    },
    *getAnalyzeStatus({ payload }, { call, put }) {
      const res = yield call(aibidSelectionService.getAnalyzeStatus, payload);
      yield put({ type: 'save', payload: { lastAnalyzeStatus: res?.data ?? null } });
      return res;
    },
    *getBidSelectionDetail({ payload }, { call }) {
      return yield call(aibidSelectionService.getBidSelectionDetail, payload);
    },
    *listCompanies({ payload }, { call }) {
      return yield call(aibidSelectionService.listCompanies, payload);
    },
    *checkCompany({ payload }, { call }) {
      return yield call(aibidSelectionService.checkCompany, payload);
    },
    *checkBiddingFile({ payload }, { call }) {
      return yield call(aibidSelectionService.checkBiddingFile, payload);
    },
    *getExportInfo({ payload }, { call }) {
      return yield call(aibidSelectionService.getExportInfo, payload);
    },
    *exportBidSelection({ payload }, { call }) {
      return yield call(aibidSelectionService.exportBidSelection, payload);
    },
  },
  reducers: {
    save(state, { payload }) {
      return { ...state, ...payload };
    },
    clearAnalyzeStatus(state) {
      return { ...state, lastAnalyzeStatus: null };
    },
  },
};
