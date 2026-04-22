import { post } from 'src/utils/request';

/** WPS 签名：完整路径为 /universe/paas/wps/... */
export async function signatureUrl(params) {
  return post('paas/wps/signatureParam', params);
}
