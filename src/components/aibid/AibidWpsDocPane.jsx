import React, { useCallback, useEffect, useRef } from 'react';
import { getFileType } from 'src/utils/FileTool';
import { t } from 'src/utils/i18n';
import WebOfficeSDK from 'src/assets/js/web-office-sdk-solution-v2.0.4.es.js';
import { WpsPreviewDrawerReadOnly } from 'src/components/wps';
import eventBus from 'src/utils/EventBus';
import { EventBusActions } from 'src/utils/EventBusActions';

/**
 * 单个附件对应的内嵌 WPS；监听 eventBus 仅在 fieldName+fileUrl 匹配时执行书签跳转。
 * @param {string} [metaName='aibidReviewRecord'] 业务实体 metaName
 * @param {boolean} active 是否当前可见（未销毁实例，仅用样式隐藏以复用加载结果）
 */
export default function AibidWpsDocPane({ item, dataCode, fieldName, active, metaName = 'aibidReviewRecord' }) {
  const instRef = useRef(null);

  const onWpsRef = useCallback((inst) => {
    instRef.current = inst;
  }, []);

  useEffect(() => {
    const handler = (payload) => {
      if (!payload || !item?.url) return;
      if (payload.fieldName !== fieldName || payload.fileUrl !== item.url) return;
      const name = payload.bookmarkName;
      if (name == null || String(name).trim() === '') return;
      instRef.current?.gotoBookmarkWhenReady?.(String(name).trim());
    };
    eventBus.add(EventBusActions.AIBID_WPS_GOTO_BOOKMARK, handler);
    return () => eventBus.remove(EventBusActions.AIBID_WPS_GOTO_BOOKMARK, handler);
  }, [fieldName, item?.url, item]);

  if (!item) {
    return null;
  }

  if (!getFileType(item)) {
    return <div className="bd-empty">{t('i18n_upload_invalid_type')}</div>;
  }

  if (!WebOfficeSDK) {
    return <div className="bd-empty">{t('i18n_request_failed')}</div>;
  }

  return (
    <div
      className="bd-wps-doc-panel"
      style={{
        position: 'absolute',
        inset: 0,
        display: 'flex',
        flexDirection: 'column',
        visibility: active ? 'visible' : 'hidden',
        pointerEvents: active ? 'auto' : 'none',
        zIndex: active ? 1 : 0,
      }}
      aria-hidden={!active}
    >
      <div className="bd-wps-embed">
        <WpsPreviewDrawerReadOnly
          onRef={onWpsRef}
          embedded
          embeddedClassName="bd-wps-embed__inner"
          item={item}
          metaName={metaName}
          dataCode={dataCode}
          fieldItem={{ name: fieldName }}
          fileSource={1}
          editForbided
          fileVersion={null}
        />
      </div>
    </div>
  );
}
