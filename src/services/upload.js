import { post } from 'src/utils/request';

export async function getFileUploadParameter(params) {
  return post('paas/settings/getFileUploadParamBySize', params);
}

export async function getOssConfig(params = {}) {
  return post('paas/settings/getOssConfig', params);
}

export async function getReadParam(params = {}) {
  return post('paas/settings/getReadParam', params);
}
