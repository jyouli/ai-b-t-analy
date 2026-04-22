/**
 * 上传相关通用方法（格式、accept 校验、类型图标分类）
 */

/** 单文件上传默认大小上限（MB），各上传组件可通过 props 覆盖 */
export const DEFAULT_MAX_UPLOAD_FILE_SIZE_MB = 100;

/**
 * @param {number|undefined|null} propValue - 未传则用默认；传 0 或负数表示不限制
 * @returns {number|null} 有效上限（MB），null 表示不校验大小
 */
export function resolveUploadMaxFileSizeMB(propValue) {
  const raw = propValue !== undefined && propValue !== null ? Number(propValue) : DEFAULT_MAX_UPLOAD_FILE_SIZE_MB;
  if (!Number.isFinite(raw) || raw <= 0) return null;
  return raw;
}

/** @param {string} fileName */
export function getFileExtension(fileName) {
  if (!fileName || typeof fileName !== 'string') return '';
  const i = fileName.lastIndexOf('.');
  if (i <= 0 || i === fileName.length - 1) return '';
  return fileName.slice(i + 1).toLowerCase();
}

/**
 * @param {string} accept - 如 ".doc,.docx,.pdf" 或 ".pdf"
 * @returns {string[]} 小写扩展名，不含点
 */
export function parseAcceptExtensions(accept) {
  if (!accept || typeof accept !== 'string') return [];
  return accept
    .split(',')
    .map((s) => s.trim().toLowerCase())
    .map((s) => (s.startsWith('.') ? s.slice(1) : s))
    .filter(Boolean);
}

/**
 * @param {File} file
 * @param {string} accept
 * @returns {boolean}
 */
export function fileMatchesAccept(file, accept) {
  const allowed = parseAcceptExtensions(accept);
  if (allowed.length === 0) return true;
  const ext = getFileExtension(file.name);
  return allowed.includes(ext);
}

/**
 * @param {number} bytes
 * @returns {string}
 */
export function formatFileSize(bytes) {
  if (bytes == null || Number.isNaN(bytes)) return '';
  const n = Number(bytes);
  if (n < 1024) return `${n}B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(n < 10240 ? 1 : 0)}KB`;
  return `${(n / (1024 * 1024)).toFixed(n < 10485760 ? 1 : 1)}MB`;
}

/** @typedef {'pdf' | 'word' | 'txt' | 'other'} FileCategory */

/**
 * @param {string} fileName
 * @returns {FileCategory}
 */
export function getFileCategory(fileName) {
  const ext = getFileExtension(fileName);
  if (ext === 'pdf') return 'pdf';
  if (ext === 'doc' || ext === 'docx') return 'word';
  if (ext === 'txt') return 'txt';
  return 'other';
}

/**
 * public/assets/images/fileIcon 下的文件名（与 foreground 一致）
 * @param {string} fileName
 * @returns {string}
 */
export function getFileTypeIconFileName(fileName) {
  const ext = getFileExtension(fileName);
  if (ext === 'pdf') return 'pdf-64.png';
  if (ext === 'doc' || ext === 'docx') return 'word-64.png';
  if (ext === 'txt') return 'txt-64.png';
  if (['xls', 'xlsx', 'csv'].includes(ext)) return 'excel.png';
  if (['ppt', 'pptx'].includes(ext)) return 'ppt.png';
  if (['zip', 'rar', '7z', 'tar', 'gz'].includes(ext)) return 'zip.png';
  if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp', 'svg'].includes(ext)) return 'image.png';
  if (['mp4', 'webm', 'mov', 'avi', 'mkv'].includes(ext)) return 'mp4.png';
  if (ext === 'mp3') return 'mp3.png';
  if (ext === 'ofd') return 'ofd.png';
  if (ext === 'mpp') return 'mpp.png';
  return 'other.png';
}

/**
 * 文件类型图标完整 URL（Vite public 目录）
 * @param {string} fileName
 * @returns {string}
 */
export function getFileTypeIconUrl(fileName) {
  const iconFile = getFileTypeIconFileName(fileName);
  const base = typeof import.meta !== 'undefined' && import.meta.env?.BASE_URL != null ? import.meta.env.BASE_URL : '/';
  const root = base.endsWith('/') ? base : `${base}/`;
  return `${root}assets/images/fileIcon/${iconFile}`;
}

/**
 * 归一化 ali-oss multipartUpload / OBS 成功回调中的对象 key
 * @param {*} result
 * @param {string} [fallbackKey]
 */
export function normalizeOssObjectKey(result, fallbackKey) {
  if (result == null) return fallbackKey || '';
  if (typeof result === 'string') return result;
  if (typeof result.name === 'string') return result.name;
  return fallbackKey || '';
}
