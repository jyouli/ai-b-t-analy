/**
 * AI 选标（aibidSelection）HTTP 封装。
 * 请求头携带 app: aibidSelection；路径经 request.resolveRequestUrl 走 universe 网关。
 */
import { post } from 'src/utils/request';

const AIBID_HEADERS = { app: 'aibidSelection' };

/** @param {string} path - 相对网关 @param {object} [requestExtra] 透传 post 第五参（如 responseAll、extraPassThroughResults） */
function aibidPost(path, data = {}, requestExtra = {}) {
  return post(path, data, AIBID_HEADERS, true, requestExtra);
}

/** 前台-1-查询投标主体列表 */
export function listCompanies(body) {
  return aibidPost('aibid/env/aibidSelection/listCompanies', body);
}

/** 前台-2-校验投标主体是否存在有效企业资质（失败码 10011 / 1 由页面区分提示与跳转） */
export function checkCompany(body) {
  return post('aibid/env/aibidSelection/checkCompany', body, AIBID_HEADERS, true, {
    extraPassThroughResults: ['10011', '1'],
  });
}

/** 前台-3-检查招标信息是否有效 */
export function checkBiddingFile(body) {
  return aibidPost('aibid/env/aibidSelection/checkBiddingFile', body, { responseAll: true });
}

/** 前台-4-开始选标分析 */
export function startAnalyzing(body) {
  return aibidPost('aibid/env/aibidSelection/startAnalyzing', body, { responseAll: true });
}

/** 前台-5-查询选标分析状态（data.key：analyzing | completed | failed），请求体 selectionCode */
export function getAnalyzeStatus(body) {
  return aibidPost('aibid/env/aibidSelection/getAnalyzeStatus', body);
}

/** 重试选标分析，请求体 selectionCode */
export function retryAnalyze(body) {
  return aibidPost('aibid/env/aibidSelection/retryAnalyze', body);
}

/** 前台-6-查询选标历史列表（专用；列表页优先用 getBizList + aibidSelectionRecord） */
export function listBidSelectionRecord(body) {
  return aibidPost('aibid/env/aibidSelection/listBidSelectionRecord', body);
}

/** 前台-7-查询选标详情信息 */
export function getBidSelectionDetail(body) {
  return aibidPost('aibid/env/aibidSelection/getBidSelectionDetail', body);
}

/** 前台-8-删除选标历史（若与 std/delete 重复可不用） */
export function deleteBidSelectionRecord(body) {
  return aibidPost('aibid/env/aibidSelection/deleteBidSelectionRecord', body);
}

/** 前台-9-查询导出信息 */
export function getExportInfo(body) {
  return aibidPost('aibid/env/aibidSelection/getExportInfo', body);
}

/** 前台-10-导出 */
export function exportBidSelection(body) {
  return aibidPost('aibid/env/aibidSelection/export', body);
}
