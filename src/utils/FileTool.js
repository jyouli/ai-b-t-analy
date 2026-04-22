import CryptoJS from 'crypto-js';
import generateUUID from 'src/utils/generateUUID';

const WORD = ['doc', 'dot', 'wps', 'wpt', 'docx', 'dotx', 'docm', 'dotm', 'rtf'];
const XLS = ['xls', 'xlt', 'et', 'xlsx', 'xltx', 'csv', 'xlsm', 'xltm'];
const PPT = ['ppt', 'pptx', 'pptm', 'ppsx', 'ppsm', 'pps', 'potx', 'potm', 'dpt', 'dps'];
const PDF = ['pdf', 'ofd'];

function MD5(input, { mode } = { mode: CryptoJS.enc.Hex }) {
  const result = CryptoJS.MD5(input);
  return mode.stringify(result);
}

function Base64(str) {
  return CryptoJS.enc.Base64.stringify(CryptoJS.enc.Utf8.parse(str));
}

export function getFileType(item) {
  let match = /\.([a-zA-Z]*)$/.exec(item?.url);
  if (!match) match = /\.([a-zA-Z]*)$/.exec(item?.name);
  if (!match) return false;
  if (WORD.includes(match[1].toLowerCase())) return 'w';
  if (XLS.includes(match[1].toLowerCase())) return 's';
  if (PPT.includes(match[1].toLowerCase())) return 'p';
  if (PDF.includes(match[1].toLowerCase())) return 'f';
}

export function getUrlParam(props, startEdit = false, isDataDraft = false) {
  let { item, fileSource = 0, metaName, dataCode, fieldItem, size, fileVersion, isUpstreamField, editForbided, bizData } = props;
  if (isDataDraft) fileSource = 4;
  let params = {
    fileSource,
    metaName: isUpstreamField ? props.upstreamFieldOriginBizdataInfo?.metaName : metaName,
    fileType: getFileType(item),
    readOnly: startEdit ? 0 : 1,
    dataCode: isUpstreamField ? props.upstreamFieldOriginBizdataInfo?.code : !isDataDraft ? dataCode : generateUUID(),
  };
  params.operateMode = editForbided || bizData?.isReadOnly ? 1 : 0;
  if (fileVersion != null) params.fileVersion = fileVersion;

  switch (fileSource) {
    case 0:
      params.fileId = '' + item.id;
      break;
    case 1:
      params.fieldName = isUpstreamField ? props.upstreamFieldOriginBizdataInfo?.fieldName : fieldItem?.name;
      params.fileId = MD5(item.url);
      break;
    case 2:
      params.fileId = MD5(item.url);
      params.fieldName = 'taskInfo';
      break;
    case 3:
      params.fieldName = 'remoteUrl';
      params.fileId = MD5(item.url);
      params.fileName = item.name;
      params.fileSize = size;
      params.fileUrl = Base64(item.url);
      break;
    case 4:
      params.fieldName = 'remoteUrl';
      params.fileId = MD5(item.url);
      params.fileName = item.name;
      params.fileSize = item.size;
      params.fileUrl = Base64(item.url);
      break;
    default:
      break;
  }
  return params;
}
