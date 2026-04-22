import React, { useCallback, useEffect, useRef } from 'react';
import { Upload, message, Progress } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import CryptoJS from 'crypto-js';
import fileOxs from 'src/lib/fileOxs';
import { useDvaDispatch } from 'src/hooks/useDva';
import { t } from 'src/utils/i18n';
import {
  fileMatchesAccept,
  normalizeOssObjectKey,
  formatFileSize,
  getFileTypeIconUrl,
  resolveUploadMaxFileSizeMB,
} from 'src/components/upload/uploadHelpers';
import { isLogined } from 'src/utils/login';
import classNames from 'classnames';
import './AibidAnnouncementImages.less';

const MD5_CHUNK_SIZE = 2 * 1024 * 1024;

function readFileMd5Hex(file) {
  return new Promise((resolve, reject) => {
    const hasher = CryptoJS.algo.MD5.create();
    let offset = 0;
    const reader = new FileReader();
    const readSlice = () => {
      const end = Math.min(offset + MD5_CHUNK_SIZE, file.size);
      reader.readAsArrayBuffer(file.slice(offset, end));
    };
    reader.onload = (e) => {
      const buf = e.target?.result;
      if (buf) {
        hasher.update(CryptoJS.lib.WordArray.create(buf));
      }
      offset += MD5_CHUNK_SIZE;
      if (offset < file.size) {
        readSlice();
      } else {
        resolve(hasher.finalize().toString(CryptoJS.enc.Hex));
      }
    };
    reader.onerror = () => reject(reader.error || new Error('readFileMd5Hex failed'));
    if (!file || file.size === 0) {
      resolve(hasher.finalize().toString(CryptoJS.enc.Hex));
      return;
    }
    readSlice();
  });
}

function FileTypeIcon({ fileName }) {
  return (
    <span className="aibid-ann-file-card__type-icon">
      <img src={getFileTypeIconUrl(fileName)} alt="" className="aibid-ann-file-card__type-img" draggable={false} />
    </span>
  );
}

/** 与 selectionMode 内卡片一致，供父级自定义布局（如整行多列） */
export function AibidAnnouncementFileCard({ row, onRemove }) {
  return (
    <div className="aibid-ann-file-card">
      <button
        type="button"
        className="aibid-ann-file-card__remove"
        aria-label={t('i18n_delete')}
        onClick={() => onRemove(row.uid)}
      >
        <i className="icon-wenjianqingchu1" />
      </button>
      <div className="aibid-ann-file-card__main">
        <FileTypeIcon fileName={row.name} />
        <div className="aibid-ann-file-card__text">
          <div className="aibid-ann-file-card__name" title={row.name}>
            {row.name}
          </div>
          <div className="aibid-ann-file-card__meta">
            <span>{formatFileSize(row.size)}</span>
            {row.status === 'uploading' ? (
              <span>{t('i18n_upload_progress', { percent: row.percent ?? 0 })}</span>
            ) : null}
            {row.status === 'error' ? <span className="aibid-ann-file-card__err">{t('i18n_upload_failed')}</span> : null}
          </div>
        </div>
      </div>
      {row.status === 'uploading' ? (
        <Progress
          percent={row.percent ?? 0}
          showInfo={false}
          strokeColor="#FD6364"
          railColor="rgba(0,0,0,0.06)"
          size="small"
          className="aibid-ann-file-card__progress"
        />
      ) : null}
    </div>
  );
}

/**
 * 招标公告多图上传（png/jpg/jpeg）
 * @param {boolean} [selectionMode] — 选标：半区大按钮 + 图标下说明，样式与 SingleBidFileSlot selection 一致
 * @param {number} [maxFileSizeMB] — 单文件最大 MB，默认 100；传 0 表示不限制
 */
function AibidAnnouncementImages({
  value = [],
  onChange,
  onUploadingChange,
  disabled,
  maxCount = 20,
  accept = '.png,.jpg,.jpeg',
  bucketType = 'privateImgBucket',
  className,
  selectionMode = false,
  selectionHint,
  selectionIconClass = 'icon-zhaobiaogonggao',
  /** selectionMode：仅保留上传区，文件列表由父级渲染 */
  hideFileCards = false,
  maxFileSizeMB,
}) {
  const dispatch = useDvaDispatch();
  const valueRef = useRef(value);
  const multiInputRef = useRef(null);
  /** 父组件常传内联 onUploadingChange，勿放入 effect 依赖，否则每轮 render 都会触发 setState 死循环 */
  const onUploadingChangeRef = useRef(onUploadingChange);
  useEffect(() => {
    valueRef.current = value;
  }, [value]);

  useEffect(() => {
    onUploadingChangeRef.current = onUploadingChange;
  });

  useEffect(() => {
    const busy = value.some((f) => f.status === 'uploading');
    onUploadingChangeRef.current?.(busy);
  }, [value]);

  const replaceList = useCallback(
    (updater) => {
      const prev = valueRef.current;
      const next = typeof updater === 'function' ? updater(prev) : updater;
      valueRef.current = next;
      onChange?.(next);
    },
    [onChange]
  );

  const runOneFileUpload = useCallback(
    (file) => {
      if (!isLogined(true)) return;
      if (!fileMatchesAccept(file, accept)) {
        message.warning(t('i18n_upload_invalid_type'));
        return;
      }
      const limitMb = resolveUploadMaxFileSizeMB(maxFileSizeMB);
      if (limitMb != null && file.size > limitMb * 1024 * 1024) {
        message.warning(t('i18n_upload_file_max_mb', { mb: limitMb }));
        return;
      }

      const uid = file.uid || `${Date.now()}-${file.name}`;

      replaceList((prev) => {
        if (prev.length >= maxCount) {
          message.warning(t('i18n_upload_max_count', { count: maxCount }));
          return prev;
        }
        if (prev.some((x) => x.uid === uid)) {
          return prev.map((x) =>
            x.uid === uid
              ? { ...x, name: file.name, size: file.size, type: file.type, status: 'uploading', percent: 0 }
              : x
          );
        }
        return [
          ...prev,
          {
            uid,
            name: file.name,
            size: file.size,
            type: file.type,
            status: 'uploading',
            percent: 0,
          },
        ];
      });

      const getUploadParams = (params) =>
        new Promise((resolve, reject) => {
          dispatch({
            type: 'upload/getFileUploadParameter',
            payload: params,
            callback: (data) => (data ? resolve(data) : reject(new Error('noData'))),
          });
        });

      fileOxs.handleUpload(
        {
          file,
          uploadSessionId: uid,
          onProgress: (percent) => {
            const p = Math.min(100, Math.round(Number(percent) * 100));
            replaceList((prev) => prev.map((x) => (x.uid === uid ? { ...x, percent: p } : x)));
          },
          onSuccess: async (result) => {
            const objectKey = normalizeOssObjectKey(result, '');
            const fileEndPoint = fileOxs.getEndPoint(bucketType);
            let md5Hex;
            try {
              md5Hex = await readFileMd5Hex(file);
            } catch {
              message.warning(t('i18n_upload_failed'));
              replaceList((prev) => prev.filter((x) => x.uid !== uid));
              return;
            }
            const fileMeta = {
              uid,
              status: 'done',
              name: file.name,
              size: file.size,
              type: file.type,
              md5: md5Hex,
              url: fileEndPoint ? `${fileEndPoint}/${objectKey}` : objectKey,
            };
            replaceList((prev) => prev.map((x) => (x.uid === uid ? fileMeta : x)));
          },
          onError: (err) => {
            if (err === 'noData') {
              dispatch({ type: 'upload/initOssConfig' });
              message.warning(t('i18n_oss_config_missing'));
            } else {
              message.warning(t('i18n_upload_failed'));
            }
            replaceList((prev) => prev.filter((x) => x.uid !== uid));
          },
          getUploadParams,
        },
        { bucketType, timeout: 120000 }
      );
    },
    [accept, bucketType, dispatch, maxCount, maxFileSizeMB, replaceList]
  );

  const customRequest = useCallback(
    (options) => {
      const { file, onError, onSuccess, onProgress } = options;
      if (!isLogined(true)) {
        onError?.(new Error('not login'));
        return;
      }
      if (!fileMatchesAccept(file, accept)) {
        message.warning(t('i18n_upload_invalid_type'));
        onError?.(new Error('type'));
        return;
      }
      const limitMb = resolveUploadMaxFileSizeMB(maxFileSizeMB);
      if (limitMb != null && file.size > limitMb * 1024 * 1024) {
        message.warning(t('i18n_upload_file_max_mb', { mb: limitMb }));
        onError?.(new Error('size'));
        return;
      }

      const uid = file.uid || `${Date.now()}-${file.name}`;
      replaceList((prev) => {
        if (prev.some((x) => x.uid === uid)) {
          return prev.map((x) =>
            x.uid === uid
              ? { ...x, name: file.name, size: file.size, type: file.type, status: 'uploading', percent: 0 }
              : x
          );
        }
        return [
          ...prev,
          {
            uid,
            name: file.name,
            size: file.size,
            type: file.type,
            status: 'uploading',
            percent: 0,
          },
        ];
      });

      const getUploadParams = (params) =>
        new Promise((resolve, reject) => {
          dispatch({
            type: 'upload/getFileUploadParameter',
            payload: params,
            callback: (data) => (data ? resolve(data) : reject(new Error('noData'))),
          });
        });

      fileOxs.handleUpload(
        {
          file,
          uploadSessionId: uid,
          onProgress: (percent) => {
            const p = Math.min(100, Math.round(Number(percent) * 100));
            onProgress?.({ percent: p });
            replaceList((prev) => prev.map((x) => (x.uid === uid ? { ...x, percent: p } : x)));
          },
          onSuccess: async (result) => {
            const objectKey = normalizeOssObjectKey(result, '');
            const fileEndPoint = fileOxs.getEndPoint(bucketType);
            let md5Hex;
            try {
              md5Hex = await readFileMd5Hex(file);
            } catch {
              message.warning(t('i18n_upload_failed'));
              replaceList((prev) => prev.filter((x) => x.uid !== uid));
              onError?.(new Error('md5'));
              return;
            }
            const fileMeta = {
              uid,
              status: 'done',
              name: file.name,
              size: file.size,
              type: file.type,
              md5: md5Hex,
              url: fileEndPoint ? `${fileEndPoint}/${objectKey}` : objectKey,
            };
            replaceList((prev) => prev.map((x) => (x.uid === uid ? fileMeta : x)));
            onSuccess?.(fileMeta);
          },
          onError: (err) => {
            if (err === 'noData') {
              dispatch({ type: 'upload/initOssConfig' });
              message.warning(t('i18n_oss_config_missing'));
            } else {
              message.warning(t('i18n_upload_failed'));
            }
            replaceList((prev) => prev.filter((x) => x.uid !== uid));
            onError?.(err);
          },
          getUploadParams,
        },
        { bucketType, timeout: 120000 }
      );
    },
    [accept, bucketType, dispatch, maxFileSizeMB, replaceList]
  );

  const handleUploadChange = ({ fileList: fl }) => {
    if (fl.length < value.length) {
      const uids = new Set(fl.map((f) => f.uid));
      replaceList((prev) => prev.filter((x) => uids.has(x.uid)));
    }
  };

  const handleMultiInputChange = (e) => {
    const files = Array.from(e.target.files || []);
    e.target.value = '';
    files.forEach((f) => runOneFileUpload(f));
  };

  const removeFile = (uid) => {
    replaceList((prev) => prev.filter((x) => x.uid !== uid));
  };

  const antdFileList = value.map((f) => ({
    uid: f.uid,
    name: f.name,
    status: f.status === 'done' ? 'done' : f.status === 'uploading' ? 'uploading' : 'error',
    percent: f.percent,
    url: f.url,
  }));

  const atLimit = value.length >= maxCount;
  const uploadDisabled = disabled || atLimit;

  const openMultiPicker = () => {
    if (uploadDisabled) return;
    multiInputRef.current?.click();
  };

  if (selectionMode) {
    return (
      <div
        className={classNames(
          'aibid-announcement-images',
          'aibid-announcement-images--selection',
          disabled && 'aibid-announcement-images--selection-disabled',
          className
        )}
      >
        <button
          type="button"
          className={classNames(
            'aibid-announcement-images__selection-zone',
            uploadDisabled && 'aibid-announcement-images__selection-zone--disabled'
          )}
          onClick={openMultiPicker}
          disabled={uploadDisabled}
        >
          <i className={classNames('aibid-announcement-images__selection-ico iconfont', selectionIconClass)} aria-hidden />
          {selectionHint ? <p className="aibid-announcement-images__selection-hint">{selectionHint}</p> : null}
        </button>
        <input
          ref={multiInputRef}
          type="file"
          className="aibid-announcement-images__native-multi"
          accept={accept}
          multiple
          onChange={handleMultiInputChange}
        />

        {!hideFileCards ? (
          <div className="aibid-announcement-images__cards">
            {value.map((row) => (
              <AibidAnnouncementFileCard key={row.uid} row={row} onRemove={removeFile} />
            ))}
          </div>
        ) : null}
      </div>
    );
  }

  return (
    <div className={classNames('aibid-announcement-images', className)}>
      <Upload
        listType="picture-card"
        accept={accept}
        fileList={antdFileList}
        customRequest={customRequest}
        onChange={handleUploadChange}
        disabled={uploadDisabled}
        multiple
        maxCount={maxCount}
        showUploadList={{
          showPreviewIcon: true,
          showRemoveIcon: !disabled,
        }}
      >
        {uploadDisabled ? null : (
          <div>
            <PlusOutlined />
            <div style={{ marginTop: 8 }}>{t('i18n_selection_upload_announcement')}</div>
          </div>
        )}
      </Upload>
    </div>
  );
}

export default AibidAnnouncementImages;
