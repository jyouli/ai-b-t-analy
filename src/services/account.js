import { post } from 'src/utils/request';

/**
 * 获取员工详情（登录后）
 * @param {object} params 当前登录拉取本人详情时仅需 code（与 foreground 正常 curl 一致）；查他人时可在调用处传 metaName 等
 */
export async function userInfo(params = {}) {
  return post('paas/app/user/detail', params, { act: 'detail', app: 'user' });
}

/** 用户全部权限（与 cloud-web-foreground allAuthOfUser / ManageBtn 一致） */
export async function allAuthOfUser(params = {}) {
  return post('paas/env/authorization/getUserAuths', params, {}, true);
}

/**
 * 企业全部用户分页列表（与 cloud-web-foreground commonManage.allUserListAll 一致）
 * @param {object} params meta/filter/sorts/page
 */
export async function listAllEnterpriseUsers(params = {}) {
  return post('paas/app/user/listAll', params, { act: 'list', app: 'user' });
}
