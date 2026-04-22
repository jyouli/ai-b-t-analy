/**
 * 上传组件成功态 meta → 网关要求的 { url, name, type, size, md5 }
 * @param {object} fileMeta
 * @returns {{ url: string, name: string, type: string, size: number, md5: string } | null}
 */
export function toAibidFilePayload(fileMeta) {
  if (!fileMeta || fileMeta.status !== 'done') return null;
  const { url, name, type, size, md5 } = fileMeta;
  if (url == null || name == null || md5 == null || size == null) return null;
  return {
    url,
    name,
    type: type ?? '',
    size,
    md5,
  };
}
