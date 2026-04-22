/**
 * AI 审标（aibidReview）HTTP 封装。
 * YApi 要求请求头携带 app: aibidReview；路径经 request.resolveRequestUrl 走 universe 网关。
 */
import { post } from 'src/utils/request';

const AIBID_HEADERS = { app: 'aibidReview' };

/** @param {string} path - 相对网关，如 aibid/env/aibidReview/... */
function aibidPost(path, data = {}, requestExtra = {}) {
  return post(path, data, AIBID_HEADERS, true, requestExtra);
}

/** 前台-从招标文件中提取标段信息（返回 sections、keyInfo 等） */
export function extractTenderSection(body) {
  return aibidPost('aibid/env/aibidReview/extractTenderSection', body);
}

/** 前台-从投标文件中提取投标主体（返回 companyName、projectName、keyInfo 等） */
export function extractBidderCompany(body) {
  return aibidPost('aibid/env/aibidReview/extractBidderCompany', body);
}

/** 前台-开始审标分析（返回 data 为审标记录编码 reviewCode） */
export function startAnalyze(body) {
  return aibidPost('aibid/env/aibidReview/startAnalyze', body, { responseAll: true });
}

/** 前台-重试审标分析（返回 data 为审标记录编码 reviewCode） */
export function retryAnalyze(body) {
  return aibidPost('aibid/env/aibidReview/retryAnalyze', body);
}

/** 前台-查询审标分析状态（data.key：analyzing | completed | failed；data.description 为状态文案） */
export function getAnalyzeStatus(body) {
  return aibidPost('aibid/env/aibidReview/getAnalyzeStatus', body);
}

/** 前台-忽略审标检查项 */
export function ignoreEvaluationItem(body) {
  return aibidPost('aibid/env/aibidReview/ignoreEvaluationItem', body);
}

/** 前台-恢复审标检查项 */
export function restoreEvaluationItem(body) {
  return aibidPost('aibid/env/aibidReview/restoreEvaluationItem', body);
}

/** Dify-保存审标的招标要求 */
export function saveRequirementItems(body) {
  return aibidPost('aibid/env/aibidReview/agent/saveRequirementItems', body);
}

/** Dify-保存审标的一致性信息 */
export function saveConsistency(body) {
  return aibidPost('aibid/env/aibidReview/agent/saveConsistency', body);
}

/** Dify-保存审标检查项 */
export function saveEvaluationItems(body) {
  return aibidPost('aibid/env/aibidReview/agent/saveEvaluationItems', body);
}
