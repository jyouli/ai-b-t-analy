import React, { useEffect, useMemo, useRef, useState } from 'react';
import { message, Spin, Tabs, Button } from 'antd';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { t } from 'src/utils/i18n';
import { useDvaDispatch } from 'src/hooks/useDva';
import SvgIcon from 'src/components/common/SvgIcon/SvgIcon';
import checkBidingBg from 'src/assets/img/check-biding-bg.png';
import starColor from 'src/assets/img/star-color.png';
import downloadSvg from 'src/assets/svg/download.svg?raw';
import TabMain from 'src/components/bidDetail/TabMain';
import AibidWpsDocPane from 'src/components/aibid/AibidWpsDocPane';
import AibidFullscreenModal from 'src/components/aibid/AibidFullscreenModal';
import './Detail.less';

/** 左侧：招标文件 / 解析结果 */
const DOC_TAB_KEYS = { tender: 'tender', parse: 'parse' };

const INSPECT_TAB_ORDER = ['qualification', 'scoring'];

const INSPECT_TAB_I18N = {
  qualification: 'i18n_selection_tab_qualification',
  scoring: 'i18n_selection_tab_scoring',
};

const POLL_MS = 5000;

const META_AIBID_SELECTION_RECORD = 'aibidSelectionRecord';
const FIELD_TENDER_FILE = 'tenderFile';

function wpsInstanceKey(fieldName, fileUrl) {
  return `${fieldName}\0${fileUrl}`;
}

function SelectionDetail() {
  const { code } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const dispatch = useDvaDispatch();

  const [docTab, setDocTab] = useState(DOC_TAB_KEYS.tender);
  const [inspectTab, setInspectTab] = useState('qualification');

  const [statusKey, setStatusKey] = useState('');
  const [statusDescription, setStatusDescription] = useState('');
  const [pollReady, setPollReady] = useState(false);

  const [bizDetailRecord, setBizDetailRecord] = useState(null);
  const [bizDetailLoading, setBizDetailLoading] = useState(false);
  const [selectionDetail, setSelectionDetail] = useState(null);

  const [tenderFileIdx, setTenderFileIdx] = useState(0);
  const [mountedWpsKeys, setMountedWpsKeys] = useState([]);

  const [fullscreenOpen, setFullscreenOpen] = useState(false);
  const [fullscreenTitle, setFullscreenTitle] = useState('');
  const [fullscreenText, setFullscreenText] = useState('');

  const timeoutRef = useRef(null);
  const prevStatusKeyRef = useRef(null);

  const selectionCode = useMemo(() => (code ? decodeURIComponent(code) : ''), [code]);

  const titleName = useMemo(() => {
    const s = location.state;
    const fromState = s?.tenderDocName || s?.companyName;
    if (fromState) return fromState;
    const sp = new URLSearchParams(location.search || '');
    const fromQuery = sp.get('t') || sp.get('c');
    if (fromQuery) return fromQuery;
    return '—';
  }, [location.state, location.search]);

  useEffect(() => {
    if (!selectionCode) {
      setPollReady(true);
      return undefined;
    }

    let cancelled = false;
    prevStatusKeyRef.current = null;

    const clearTimer = () => {
      if (timeoutRef.current != null) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
    };

    const poll = async () => {
      if (cancelled) return;
      try {
        const res = await dispatch({
          type: 'aibidSelection/getAnalyzeStatus',
          payload: { selectionCode },
        });

        // res.data.status = 'completed';

        if (cancelled) return;
        const statusPayload = res?.data ?? {};
        // 接口可能返回 key/description，或 status/desc（与列表等字段对齐）
        const status = statusPayload.status ?? '';
        const statusText = statusPayload.desc ?? '';

        setStatusKey(status);
        setStatusDescription(statusText);
        setPollReady(true);

        if (status === 'failed' && prevStatusKeyRef.current !== 'failed') {
          message.error(statusText || t('i18n_selection_analyze_failed'));
        }
        prevStatusKeyRef.current = status;

        if (!cancelled && status === 'completed') {
          setBizDetailLoading(true);
          dispatch({
            type: 'common/getBizDetail',
            payload: { metaName: META_AIBID_SELECTION_RECORD, code: selectionCode },
            callback: (record) => {
              if (cancelled) return;
              setBizDetailLoading(false);
              if (record) {
                setBizDetailRecord(record);
              }
            },
          });
        }

        if (!cancelled && status === 'analyzing') {
          clearTimer();
          timeoutRef.current = setTimeout(poll, POLL_MS);
        }
      } catch (e) {
        if (!cancelled) {
          setPollReady(true);
          message.error(e?.message || t('i18n_request_failed'));
        }
      }
    };

    prevStatusKeyRef.current = null;
    setPollReady(false);
    setStatusKey('');
    setStatusDescription('');
    setBizDetailRecord(null);
    setBizDetailLoading(false);
    setSelectionDetail(null);
    setTenderFileIdx(0);
    setMountedWpsKeys([]);
    poll();

    return () => {
      cancelled = true;
      clearTimer();
    };
  }, [selectionCode, dispatch]);

  useEffect(() => {
    if (statusKey !== 'completed' || !selectionCode) return undefined;
    let cancelled = false;
    (async () => {
      try {
        const res = await dispatch({
          type: 'aibidSelection/getBidSelectionDetail',
          payload: { selectionCode },
        });
        if (!cancelled) setSelectionDetail(res?.data ?? null);
      } catch {
        if (!cancelled) setSelectionDetail(null);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [statusKey, selectionCode, dispatch]);

  const isAnalyzing = statusKey === 'analyzing';

  const tenderList = useMemo(() => bizDetailRecord?.tenderFile || [], [bizDetailRecord]);

  useEffect(() => {
    setTenderFileIdx((i) => Math.min(i, Math.max(0, tenderList.length - 1)));
  }, [tenderList.length]);

  const currentItem = tenderList[tenderFileIdx];

  useEffect(() => {
    if (statusKey !== 'completed' || !bizDetailRecord || docTab !== DOC_TAB_KEYS.tender || !currentItem?.url) return;
    const k = wpsInstanceKey(FIELD_TENDER_FILE, currentItem.url);
    setMountedWpsKeys((prev) => (prev.includes(k) ? prev : [...prev, k]));
  }, [statusKey, bizDetailRecord, docTab, currentItem?.url]);

  const handleSubFileTabChange = (k) => {
    setTenderFileIdx(Number(k));
  };

  const inspectTabItems = useMemo(
    () =>
      INSPECT_TAB_ORDER.map((k) => ({
        key: k,
        label: t(INSPECT_TAB_I18N[k]),
      })),
    []
  );

  const docTabItems = useMemo(
    () => [
      { key: DOC_TAB_KEYS.tender, label: t('i18n_bd_doc_tab_tender') },
      { key: DOC_TAB_KEYS.parse, label: t('i18n_selection_doc_parse') },
    ],
    []
  );

  const parseBodyText = useMemo(() => {
    const raw =
      bizDetailRecord?.tenderFileAnalysisResult ??
      selectionDetail?.tenderFileAnalysisResult ??
      '';
    if (raw == null || raw === '') return '';
    return typeof raw === 'string' ? raw : JSON.stringify(raw, null, 2);
  }, [bizDetailRecord, selectionDetail]);

  const qualiText = useMemo(() => {
    const raw = bizDetailRecord?.qualiRequirements ?? selectionDetail?.qualiRequirements ?? '';
    return raw == null ? '' : String(raw);
  }, [bizDetailRecord, selectionDetail]);

  const scoringText = useMemo(() => {
    const raw = bizDetailRecord?.scoreRequirements ?? selectionDetail?.scoreRequirements ?? '';
    return raw == null ? '' : String(raw);
  }, [bizDetailRecord, selectionDetail]);

  const headerTitleText = useMemo(() => {
    if (isAnalyzing) {
      return statusDescription || t('i18n_selection_analyzing_hint');
    }
    if (statusKey === 'failed') {
      return statusDescription || t('i18n_selection_analyze_failed');
    }
    const project = bizDetailRecord?.projectName;
    if (project) return String(project);
    return t('i18n_selection_page_title', { name: titleName });
  }, [isAnalyzing, statusDescription, statusKey, titleName, bizDetailRecord?.projectName]);

  const canExport = statusKey === 'completed';

  const handleLogo = () => {
    navigate('/aibidSelection');
  };

  const handleDownloadReport = () => {
    if (!canExport) return;
    const file = bizDetailRecord?.analysisReport;
    const url = Array.isArray(file) ? file[0]?.url : file?.url;
    if (url) {
      window.open(url, '_blank', 'noopener,noreferrer');
      return;
    }
    message.info(t('i18n_selection_no_report_file'));
  };

  const handleExportMaterials = async () => {
    if (!canExport || !selectionCode) return;
    try {
      await dispatch({
        type: 'aibidSelection/getExportInfo',
        payload: { selectionCode },
      });
      await dispatch({
        type: 'aibidSelection/exportBidSelection',
        payload: { selectionCode },
      });
      message.success(t('i18n_selection_export_started'));
    } catch (e) {
      message.error(e?.message || t('i18n_request_failed'));
    }
  };

  const openFullscreen = (title, text) => {
    setFullscreenTitle(title);
    setFullscreenText(text ?? '');
    setFullscreenOpen(true);
  };

  if (!pollReady) {
    return (
      <div className="business-detail-page business-detail-page--loading">
        <img className="business-detail-page__bg" src={checkBidingBg} alt="" />
        <div className="business-detail-page__spin">
          <Spin size="large" />
        </div>
      </div>
    );
  }

  return (
    <div className="business-detail-page aibid-selection-detail-page">
      <img className="business-detail-page__bg" src={checkBidingBg} alt="" />

      <header className="bd-header">
        <div className="bd-header__left">
          <button type="button" className="bd-header__logo" onClick={handleLogo} title={t('i18n_selection_back_list')}>
            <img src="/assets/images/logo.png" alt="" width={32} height={32} />
          </button>
          <div className="bd-header__titles">
            <div className="bd-header__title-row">
              {isAnalyzing ? (
                <span className="ai-title-star bd-header__title-star" aria-hidden>
                  <img className="star-animation" src={starColor} alt="" width={20} height={20} />
                </span>
              ) : null}
              <h1 className="bd-header__title">{headerTitleText}</h1>
            </div>
          </div>
        </div>
        <div className="bd-header__actions">
          <button
            type="button"
            className="bd-header__download bd-header__download--secondary"
            onClick={handleExportMaterials}
            disabled={!canExport}
          >
            <SvgIcon svg={downloadSvg} size={14} />
            {t('i18n_selection_export_materials')}
          </button>
          <button
            type="button"
            className="bd-header__download"
            onClick={handleDownloadReport}
            disabled={!canExport}
          >
            <SvgIcon svg={downloadSvg} size={14} />
            {t('i18n_selection_download_analysis_pdf')}
          </button>
        </div>
      </header>

      <main className="bd-main">
        <TabMain
          className="bd-card--left"
          title={t('i18n_selection_column_doc')}
          tabItems={docTabItems}
          activeTabKey={docTab}
          onTabChange={setDocTab}
          loading={isAnalyzing}
          bodyClassName="bd-card__body-wrap--doc"
        >
          {statusKey === 'failed' ? (
            <div className="bd-empty">{statusDescription || t('i18n_selection_analyze_failed')}</div>
          ) : null}
          {docTab === DOC_TAB_KEYS.parse && statusKey === 'completed' && !bizDetailLoading ? (
            <div className="bd-parse-panel">
              <Button
                type="link"
                className="bd-fullscreen-trigger"
                onClick={() => openFullscreen(t('i18n_selection_doc_parse'), parseBodyText || '—')}
              >
                {t('i18n_selection_fullscreen')}
              </Button>
              <pre className="bd-parse-pre">{parseBodyText || t('i18n_bd_no_data')}</pre>
            </div>
          ) : null}
          {docTab === DOC_TAB_KEYS.tender && statusKey === 'completed' && bizDetailLoading ? (
            <div className="bd-wps-doc-loading">
              <Spin size="large" />
            </div>
          ) : null}
          {docTab === DOC_TAB_KEYS.tender && statusKey === 'completed' && !bizDetailLoading && !bizDetailRecord ? (
            <div className="bd-empty">{t('i18n_bd_detail_load_failed')}</div>
          ) : null}
          {docTab === DOC_TAB_KEYS.tender &&
          statusKey === 'completed' &&
          !bizDetailLoading &&
          bizDetailRecord &&
          tenderList.length === 0 ? (
            <div className="bd-empty">{t('i18n_bd_no_attachment')}</div>
          ) : null}
          {docTab === DOC_TAB_KEYS.tender &&
          statusKey === 'completed' &&
          !bizDetailLoading &&
          bizDetailRecord &&
          tenderList.length > 0 ? (
            <div className="bd-wps-doc">
              {tenderList.length > 1 ? (
                <Tabs
                  size="small"
                  className="bd-wps-doc__subtabs"
                  activeKey={String(tenderFileIdx)}
                  onChange={handleSubFileTabChange}
                  items={tenderList.map((f, i) => ({
                    key: String(i),
                    label: (
                      <span className="bd-wps-doc__subtab-label" title={f.name}>
                        {f.name}
                      </span>
                    ),
                  }))}
                />
              ) : null}
              <div className="bd-wps-doc-panels">
                {tenderList.map((file, i) => {
                  const k = wpsInstanceKey(FIELD_TENDER_FILE, file.url);
                  if (!mountedWpsKeys.includes(k)) return null;
                  const active = tenderFileIdx === i;
                  return (
                    <AibidWpsDocPane
                      key={k}
                      item={file}
                      dataCode={selectionCode}
                      fieldName={FIELD_TENDER_FILE}
                      active={active}
                      metaName={META_AIBID_SELECTION_RECORD}
                    />
                  );
                })}
              </div>
            </div>
          ) : null}
          {docTab === DOC_TAB_KEYS.parse && statusKey !== 'completed' && statusKey !== 'failed' ? (
            <div className="bd-wps-placeholder">
              <p>{t('i18n_selection_analyzing_hint')}</p>
            </div>
          ) : null}
          {docTab === DOC_TAB_KEYS.tender && statusKey !== 'completed' && statusKey !== 'failed' ? (
            <div className="bd-wps-placeholder">
              <p>{t('i18n_bd_wps_placeholder')}</p>
              <p className="bd-wps-placeholder__sub">{t('i18n_bd_wps_readonly')}</p>
            </div>
          ) : null}
        </TabMain>

        <TabMain
          className="bd-card--right"
          title={t('i18n_selection_column_analysis')}
          tabItems={inspectTabItems}
          activeTabKey={inspectTab}
          onTabChange={setInspectTab}
          loading={isAnalyzing}
          bodyClassName="bd-card__body-wrap--inspect"
        >
          {!isAnalyzing && statusKey === 'completed' ? (
            <div className="bd-inspect-panel">
              <Button
                type="link"
                className="bd-fullscreen-trigger"
                onClick={() =>
                  openFullscreen(
                    t(INSPECT_TAB_I18N[inspectTab]),
                    inspectTab === 'qualification' ? qualiText || '—' : scoringText || '—'
                  )
                }
              >
                {t('i18n_selection_fullscreen')}
              </Button>
              <pre className="bd-inspect-pre">
                {inspectTab === 'qualification' ? qualiText || t('i18n_bd_no_data') : scoringText || t('i18n_bd_no_data')}
              </pre>
            </div>
          ) : null}
          {!isAnalyzing && statusKey === 'failed' ? (
            <div className="bd-empty">{statusDescription || t('i18n_selection_analyze_failed')}</div>
          ) : null}
        </TabMain>
      </main>

      <AibidFullscreenModal
        open={fullscreenOpen}
        title={fullscreenTitle}
        onCancel={() => setFullscreenOpen(false)}
      >
        <pre className="bd-inspect-pre bd-inspect-pre--fullscreen">{fullscreenText}</pre>
      </AibidFullscreenModal>
    </div>
  );
}

export default SelectionDetail;
