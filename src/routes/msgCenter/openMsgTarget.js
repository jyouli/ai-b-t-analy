/**
 * 从消息记录中解析 titleExtend，并仅在指向资信企业 aibidCompany 时跳转。
 * @param {import('react-router-dom').NavigateFunction} navigate
 * @returns {boolean} 是否已跳转
 */
export function parseTitleExtend(record) {
  if (!record?.titleExtend || record.titleExtend === 'null') return null;
  try {
    return typeof record.titleExtend === 'string' ? JSON.parse(record.titleExtend) : record.titleExtend;
  } catch {
    return null;
  }
}

export function tryOpenCreditFromMsg(record, navigate) {
  const todo = parseTitleExtend(record);
  if (!todo) return false;
  const taskInfo = todo.param || {};
  const meta = taskInfo.busObjName || taskInfo.metaName || todo.metaName;
  const code = taskInfo.busDataId ?? taskInfo.code;
  if (meta === 'aibidCompany' && code != null && String(code) !== '') {
    navigate(`/credit?companyCode=${encodeURIComponent(String(code))}`);
    return true;
  }
  return false;
}
