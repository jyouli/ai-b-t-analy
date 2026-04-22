import React, { useCallback, useRef, useState } from 'react';
import { Progress, message } from 'antd';
import { UploadOutlined } from '@ant-design/icons';
import classNames from 'classnames';
import { useDvaDispatch } from 'src/hooks/useDva';
import CryptoJS from 'crypto-js';
import { t } from 'src/utils/i18n';
import fileOxs from 'src/lib/fileOxs';
import {
  formatFileSize,
  fileMatchesAccept,
  getFileTypeIconUrl,
  normalizeOssObjectKey,
  resolveUploadMaxFileSizeMB,
} from 'src/components/upload/uploadHelpers';
import { isLogined } from 'src/utils/login';
import './SingleBidFileSlot.less';

/** 单块读取大小（2MB），用于 readFileMd5Hex 分片累加哈希 */
const MD5_CHUNK_SIZE = 2 * 1024 * 1024;

/**
 * 计算浏览器 File 的内容 MD5（hex），分片读取避免大文件占满内存。
 * @param {File} file
 * @returns {Promise<string>}
 */
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
  const base = 'single-bid-file-slot__type-icon';
  return (
    <span className={classNames(base)}>
      <img
        src={getFileTypeIconUrl(fileName)}
        alt=""
        className={`${base}__img`}
        draggable={false}
      />
    </span>
  );
}

/**
 * 单文件招投标上传槽位：虚线区 + 文件卡片 + 进度/成败 + 删除
 *
 * @param {'default'|'selection'} [variant='default'] — 选标：大号分区 + 图标下说明文案
 * @param {string} [selectionHint] — variant=selection 时图标下方小字
 * @param {string} [selectionIconClass='icon-zhaobiaowenjian'] — variant=selection 时主图标 class
 * @param {boolean} [disabled=false] — 禁用点击上传
 * @param {number} [maxFileSizeMB] — 单文件最大 MB，默认 100；传 0 表示不限制
 * @param {() => boolean | Promise<boolean>} [onBeforeChooseFile] - 在「已有成功文件、即将重新选文件」时调用；返回 true 则清空并打开系统文件选择，false 则中止。由业务侧弹窗（如 confirmModal）后 resolve。
 */
function SingleBidFileSlot({
  accept,
  hint,
  uploadLabel,
  required = false,
  onBeforeChooseFile,
  bucketType = 'privateFileBucket',
  slotKey,
  onSuccess,
  onChange,
  onUploadingChange,
  className,
  variant = 'default',
  selectionHint,
  selectionIconClass = 'icon-zhaobiaowenjian',
  disabled = false,
  maxFileSizeMB,
}) {
  const dispatch = useDvaDispatch();
  const fileInputRef = useRef(null);
  const activeUploadIdRef = useRef(null);
  const [row, setRow] = useState(null);

  const clearAndNotify = useCallback(() => {
    if (activeUploadIdRef.current != null) {
      fileOxs.cancelOssUpload(activeUploadIdRef.current);
      activeUploadIdRef.current = null;
    }
    setRow(null);
    onChange?.(null);
    onUploadingChange?.(false);
  }, [onChange, onUploadingChange]);

  const runUpload = useCallback(
    (file) => {
      if (!fileMatchesAccept(file, accept)) {
        message.warning(t('i18n_upload_invalid_type'));
        return;
      }
      const limitMb = resolveUploadMaxFileSizeMB(maxFileSizeMB);
      if (limitMb != null && file.size > limitMb * 1024 * 1024) {
        message.warning(t('i18n_upload_file_max_mb', { mb: limitMb }));
        return;
      }
      if (file.size === 0) {
        message.warning(t('i18n_upload_empty_file'));
        return;
      }

      const uid = `${Date.now()}-${file.name}`;
      activeUploadIdRef.current = uid;
      onUploadingChange?.(true);
      setRow({
        uid,
        status: 'uploading',
        name: file.name,
        size: file.size,
        percent: 0,
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
            setRow((r) => (r && r.uid === uid ? { ...r, percent: p } : r));
          },
          onSuccess: async (result) => {
            activeUploadIdRef.current = null;
            const objectKey = normalizeOssObjectKey(result, '');
            const fileEndPoint = fileOxs.getEndPoint(bucketType);
            // 审标等接口要求文件 md5 为内容摘要，与历史「仅对文件名 hash」区分
            let md5Hex;
            try {
              md5Hex = await readFileMd5Hex(file);
            } catch (err) {
              message.warning(t('i18n_upload_failed'));
              setRow((r) => {
                if (!r || r.uid !== uid) return r;
                return { ...r, status: 'error', percent: 0 };
              });
              onUploadingChange?.(false);
              return;
            }
            const fileMeta = {
              uid,
              status: 'done',
              name: file.name,
              size: file.size,
              lastModified: file.lastModified,
              type: file.type,
              md5: md5Hex,
              url: fileEndPoint ? `${fileEndPoint}/${objectKey}` : objectKey,
            };
            setRow(fileMeta);
            onUploadingChange?.(false);
            onChange?.(fileMeta);
            onSuccess?.(fileMeta);
          },
          onError: (err) => {
            activeUploadIdRef.current = null;
            if (err === 'noData') {
              dispatch({ type: 'upload/initOssConfig' });
              message.warning(t('i18n_oss_config_missing'));
            } else {
              message.warning(t('i18n_upload_failed'));
            }
            setRow((r) => {
              if (!r || r.uid !== uid) return r;
              return { ...r, status: 'error', percent: 0 };
            });
            onUploadingChange?.(false);
          },
          getUploadParams,
        },
        { bucketType, timeout: 120000 }
      );
    },
    [accept, bucketType, dispatch, maxFileSizeMB, onChange, onSuccess, onUploadingChange]
  );

  const onInputChange = (e) => {
    if (!isLogined(true)) return;
    const file = e.target.files?.[0];
    e.target.value = '';
    if (file) runUpload(file);
  };

  const openFilePicker = () => {
    fileInputRef.current?.click();
  };

  const onDashClick = async () => {
    if (disabled) return;
    if (!isLogined(true)) return;
    if (row?.status === 'uploading') return;

    if (row?.status === 'done') {
      if (onBeforeChooseFile) {
        const ok = await Promise.resolve(onBeforeChooseFile());
        if (!ok) return;
      }
      clearAndNotify();
      setTimeout(() => openFilePicker(), 0);
      return;
    }

    if (row?.status === 'error') {
      openFilePicker();
      return;
    }

    openFilePicker();
  };

  const onRemoveClick = (e) => {
    e.stopPropagation();
    clearAndNotify();
  };

  const isSelection = variant === 'selection';

  return (
    <div className={classNames('single-bid-file-slot', className)} data-slot-key={slotKey}>
      <div
        className={classNames('single-bid-file-slot__dash', {
          'is-uploading': row?.status === 'uploading',
          'single-bid-file-slot__dash--selection': isSelection,
          'single-bid-file-slot__dash--selection-disabled': isSelection && disabled,
        })}
        onClick={onDashClick}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            onDashClick();
          }
        }}
        role="button"
        tabIndex={disabled ? -1 : 0}
        aria-disabled={disabled}
      >
        {hint ? <p className="single-bid-file-slot__hint">{hint}</p> : null}

        {isSelection ? (
          <div className="single-bid-file-slot__selection-inner">
            <i className={classNames('single-bid-file-slot__selection-ico iconfont', selectionIconClass)} aria-hidden />
            {selectionHint ? (
              <p className="single-bid-file-slot__selection-hint">{selectionHint}</p>
            ) : null}
          </div>
        ) : (
          <span className="single-bid-file-slot__fake-btn">
            <i className="icon-shangchuan" />
            {uploadLabel}
            {required ? <span className="single-bid-file-slot__star">*</span> : null}
          </span>
        )}
      </div>
      <input
        ref={fileInputRef}
        type="file"
        className="single-bid-file-slot__native-input"
        accept={accept}
        onChange={onInputChange}
      />

      {row && (row.status === 'uploading' || row.status === 'done' || row.status === 'error') ? (
        <div className="single-bid-file-slot__card">
          <button
            type="button"
            className="single-bid-file-slot__remove"
            aria-label={t('i18n_delete')}
            onClick={onRemoveClick}
          >
            <i className='icon-wenjianqingchu1' />
          </button>
          <div className="single-bid-file-slot__card-main">
            <FileTypeIcon fileName={row.name} />
            <div className="single-bid-file-slot__card-text">
              <div className="single-bid-file-slot__name" title={row.name}>
                {row.name}
              </div>
              <div className="single-bid-file-slot__meta">
                <span className="single-bid-file-slot__size">{formatFileSize(row.size)}</span>
                {row.status === 'uploading' ? (
                  <span className="single-bid-file-slot__progress-label">
                    {t('i18n_upload_progress', { percent: row.percent ?? 0 })}
                  </span>
                ) : null}
                {row.status === 'error' ? (
                  <span className="single-bid-file-slot__err-label">{t('i18n_upload_failed')}</span>
                ) : null}
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
              className="single-bid-file-slot__progress-bar"
            />
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

export default SingleBidFileSlot;
