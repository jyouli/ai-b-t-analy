import { post } from 'src/utils/request';

export async function getMetaAllDetail(params) {
	return post('paas/env/meta/baseInfo/getMetaAllDetail', params);
}
export async function getBizList(params, header_obj) {
	return post('paas/app/std/list', params, { app: 'std', act: 'list', obj: header_obj });
}
export async function getBizDetail(params, header_obj) {
	return post('paas/app/std/detail', params, { app: 'std', act: 'detail', obj: header_obj });
}
export async function deleteBizData(params, header_obj) {
	return post('paas/app/std/delete', params, { app: 'std', act: 'delete', obj: header_obj });
}
export async function createBizData(params, header_obj) {
	return post('paas/app/std/add', params, { app: 'std', act: 'create', obj: header_obj });
}
export async function editBizData(params, header_obj) {
	return post('paas/app/std/edit', params, { app: 'std', act: 'edit', obj: header_obj });
}
export async function batchDeleteBizData(params, header_obj) {
	return post('paas/app/std/deleteBatch', params, { app: 'std', act: 'delete', obj: header_obj });
}



