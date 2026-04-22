import { post } from 'src/utils/request';

const pass4100002 = { extraPassThroughResults: ['4100002'] };

/** 与 cloud-web-foreground msgCenter 接口一致，路径走 universe 下 paas */
export async function getMsgList(params) {
  return post('paas/env/message/list', params);
}

export async function getMsgListByCodes(params) {
  return post('paas/env/message/listByCodes', params);
}

export async function markRead(params) {
  return post('paas/env/message/markRead', params);
}

export async function claimTask(params) {
  return post('paas/workflow/runtime/claimTask', params, {}, true, pass4100002);
}

export async function getUndoTotal(params = {}) {
  return post('paas/workflow/runtime/getUndoTotalMap', params);
}

export async function getUnReadTotal(params = {}) {
  return post('paas/env/message/getUnReadTotal', params);
}

export async function getProcessInstanceDetails(params) {
  return post('paas/workflow/runtime/getProcessInstanceDetails', params, {}, true, pass4100002);
}

export async function getUntreatedMsgList(params) {
  return post('paas/env/message/todo/list', params);
}

export async function getUntreatedMsgListSimple(params) {
  return post('paas/env/message/todo/listSimple', params);
}

export async function unReadTodoCount(params) {
  return post('paas/env/message/todo/appNameStats', params);
}

export async function UnReadMsg(params) {
  return post('paas/env/message/list', params);
}

export async function unreadTypeList(params = {}) {
  return post('paas/env/message/type/list', params);
}

export async function untreatTypeList(params = {}) {
  return post('paas/env/message/todo/type/list', params);
}

export async function markAllRead(params) {
  return post('paas/env/message/markAllRead', params, {}, true, pass4100002);
}

export async function submitTask(params) {
  return post('paas/workflow/runtime/submit', params, {}, true, pass4100002);
}

export async function transferTask(params) {
  return post('paas/workflow/runtime/transferTask', params, {}, true, pass4100002);
}

export async function addAssignee(params) {
  return post('paas/workflow/runtime/addAssignee', params, {}, true, pass4100002);
}

export async function updateApprover(params) {
  return post('paas/workflow/runtime/addAssignee', params, {}, true, pass4100002);
}

