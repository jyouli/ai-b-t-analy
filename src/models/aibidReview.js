/**
 * Dva model：AI 审标接口编排。
 * 页面侧通过 dispatch 调用 effects；并缓存最近一次「查询审标分析状态」结果供扩展使用。
 */
import * as aibidReviewService from 'src/services/aibidReview';

export default {
  namespace: 'aibidReview',
  state: {
    /** 最近一次 getAnalyzeStatus 返回的 data（key、description 等） */
    lastAnalyzeStatus: null,
  },
  effects: {
    /** 从招标文件提取标段 */
    *extractTenderSection({ payload }, { call }) {
      return yield call(aibidReviewService.extractTenderSection, payload);
    },
    /** 从投标文件提取投标主体 */
    *extractBidderCompany({ payload }, { call }) {
      return yield call(aibidReviewService.extractBidderCompany, payload);
    },
    /** 开始审标分析 */
    *startAnalyze({ payload }, { call }) {
      return yield call(aibidReviewService.startAnalyze, payload);
    },
    /** 重试审标分析 */
    *retryAnalyze({ payload }, { call }) {
      return yield call(aibidReviewService.retryAnalyze, payload);
    },
    /** 查询审标分析状态（同步写入 lastAnalyzeStatus） */
    *getAnalyzeStatus({ payload }, { call, put }) {
      const res = yield call(aibidReviewService.getAnalyzeStatus, payload);
      yield put({ type: 'save', payload: { lastAnalyzeStatus: res?.data ?? null } });
      return res;
    },
    /** 忽略审标检查项（界面暂未调用） */
    *ignoreEvaluationItem({ payload }, { call }) {
      return yield call(aibidReviewService.ignoreEvaluationItem, payload);
    },
    /** 恢复审标检查项（界面暂未调用） */
    *restoreEvaluationItem({ payload }, { call }) {
      return yield call(aibidReviewService.restoreEvaluationItem, payload);
    },
    /** Dify 保存招标要求（界面暂未调用） */
    *saveRequirementItems({ payload }, { call }) {
      return yield call(aibidReviewService.saveRequirementItems, payload);
    },
    /** Dify 保存一致性信息（界面暂未调用） */
    *saveConsistency({ payload }, { call }) {
      return yield call(aibidReviewService.saveConsistency, payload);
    },
    /** Dify 保存审标检查项（界面暂未调用） */
    *saveEvaluationItems({ payload }, { call }) {
      return yield call(aibidReviewService.saveEvaluationItems, payload);
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
