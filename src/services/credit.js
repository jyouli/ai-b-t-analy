import { post, postSSE } from 'src/utils/request';

// 营业执照
export async function analyzeBusinessLicense(params) {
	return post('aibid/env/aibidCredit/analyzeBusinessLicense', params);
}

// 营业执照识别（SSE）
export function analyzeBusinessLicenseSSE(params, opts) {
	return postSSE('aibid/env/aibidCredit/analyzeBusinessLicense', params, opts);
}
// 识别商务标
export async function parseBusinessBid(params) {
	return post('aibid/env/aibidCredit/parseBusinessBid', params);
}
// 解析企业资信项材料
export async function parseCreditItems(params) {
	return post('aibid/env/aibidCredit/parseCreditItems', params);
}
// 获取任务状态
export async function getTaskStatus(params) {
	return post('aibid/env/aibidCredit/taskStatus', params);
}
