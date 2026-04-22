import React, { useEffect, useMemo, useRef, useState } from 'react';
import { message, Spin, Tabs } from 'antd';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { t } from 'src/utils/i18n';
import { APP_DEFAULT_ROUTE } from 'src/routes/appDefaultRoute';
import { useDvaDispatch } from 'src/hooks/useDva';
import SvgIcon from 'src/components/common/SvgIcon/SvgIcon';
import checkBidingBg from 'src/assets/img/check-biding-bg.png';
import starColor from 'src/assets/img/star-color.png';
import downloadSvg from 'src/assets/svg/download.svg?raw';
import TabMain from 'src/components/bidDetail/TabMain';
import AibidWpsDocPane from 'src/components/aibid/AibidWpsDocPane';
import './Detail.less';

/**
 * 审标详情：路由参数 code 即 reviewCode。
 * 轮询「前台-查询审标分析状态」：key===analyzing 时每 5s 再查；标题区展示接口 data.description（兼容旧字段 descrption）。
 */
/** 原文档区 Tab：招标文件 / 投标文件 */
const DOC_TAB_KEYS = { tender: 'tender', bid: 'bid' };

/** 检查项 Tab 顺序（与 TabMain 配置一致） */
const INSPECT_TAB_ORDER = [
  'qualification',
  'formality',
  'scoring',
  'responsiveness',
  'basic',
  'todo',
];

/** 检查项 Tab 与 i18n key 映射 */
const INSPECT_TAB_I18N = {
  qualification: 'i18n_bd_tab_qualification',
  formality: 'i18n_bd_tab_formality',
  scoring: 'i18n_bd_tab_scoring',
  responsiveness: 'i18n_bd_tab_responsiveness',
  basic: 'i18n_bd_tab_basic',
  todo: 'i18n_bd_tab_todo',
};

/** 分析中状态下轮询间隔（毫秒） */
const POLL_MS = 5000;

/** 审标记录的metaName */
const META_AIBID_REVIEW_RECORD = 'aibidReviewRecord';

/** 附件字段 API 名（与实体配置一致） */
const FIELD_TENDER_FILE = 'tenderFile';
const FIELD_BIDDER_FILE = 'bidderFile';

/** 缓存已打开过的 WPS 实例键：`\`${fieldName}\0${fileUrl}\``，切换 Tab 时复用不卸载 */
function wpsInstanceKey(fieldName, fileUrl) {
  return `${fieldName}\0${fileUrl}`;
}

/** 单条审标详情：轮询分析状态、双栏文档与检查 Tab */
function BusinessDetail() {
  const { code } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const dispatch = useDvaDispatch();

  /** 左侧原文档当前 Tab */
  const [docTab, setDocTab] = useState(DOC_TAB_KEYS.bid);
  /** 右侧检查项当前 Tab */
  const [inspectTab, setInspectTab] = useState('qualification');

  /** 分析状态接口返回的 data.key */
  const [statusKey, setStatusKey] = useState('');
  /** 分析状态说明文案（标题区/失败提示） */
  const [statusDescription, setStatusDescription] = useState('');
  /** 首轮状态请求是否已结束（结束前全页 loading） */
  const [pollReady, setPollReady] = useState(false);

  /** getBizDetail 返回的 record（仅分析完成后拉取） */
  const [bizDetailRecord, setBizDetailRecord] = useState(null);
  /** 分析已完成时拉取业务详情的 loading */
  const [bizDetailLoading, setBizDetailLoading] = useState(false);

  /** 招标/投标附件列表内当前选中下标（多附件时子 Tab） */
  const [tenderFileIdx, setTenderFileIdx] = useState(0);
  const [bidFileIdx, setBidFileIdx] = useState(0);
  /** 已进入过视图的附件键，仅对这些键挂载 WPS，切换回来时复用实例 */
  const [mountedWpsKeys, setMountedWpsKeys] = useState([]);

  /** analyzing 时下一次轮询的 setTimeout id */
  const timeoutRef = useRef(null);
  /** 上一次 statusKey，用于失败时只 toast 一次 */
  const prevStatusKeyRef = useRef(null);

  /** 审标记录编码（来自 URL :code） */
  const reviewCode = useMemo(() => (code ? decodeURIComponent(code) : ''), [code]);

  /** 列表跳转或创建流程传入的展示用文件名/公司名；新标签页打开时用查询参数 b/t/c 兜底 */
  const titleName = useMemo(() => {
    const s = location.state;
    const fromState = s?.bidDocName || s?.tenderDocName || s?.companyName;
    if (fromState) return fromState;
    const sp = new URLSearchParams(location.search || '');
    const fromQuery = sp.get('b') || sp.get('t') || sp.get('c');
    if (fromQuery) return fromQuery;
    return '—';
  }, [location.state, location.search]);

  // 首次立即拉状态；仍为 analyzing 则每 POLL_MS 再查，直至 completed/failed 或组件卸载
  useEffect(() => {
    if (!reviewCode) {
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
        // 前台-查询审标分析状态
        const res = await dispatch({ type: 'aibidReview/getAnalyzeStatus', payload: { reviewCode } });
        if (cancelled) return;
        // TODO
        const key = 'completed';
        // const key = res?.data?.key ?? '';
        const statusText = res?.data?.description ?? res?.data?.descrption ?? '';

        setStatusKey(key);
        setStatusDescription(statusText);
        setPollReady(true);

        if (key === 'failed' && prevStatusKeyRef.current !== 'failed') {
          message.error(statusText || t('i18n_bd_analyze_failed'));
        }
        prevStatusKeyRef.current = key;

        if (!cancelled && key === 'completed') {
          setBizDetailLoading(true);
          dispatch({
            type: 'common/getBizDetail',
            payload: { metaName: META_AIBID_REVIEW_RECORD, code: reviewCode },
            callback: (record) => {
              if (cancelled) return;
              setBizDetailLoading(false);
              if (record) {
                setBizDetailRecord(record);
              }
            },
          });
        }

        if (!cancelled && key === 'analyzing') {
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
    setTenderFileIdx(0);
    setBidFileIdx(0);
    setMountedWpsKeys([]);
    poll();

    return () => {
      cancelled = true;
      clearTimer();
    };
  }, [reviewCode, dispatch]);

  /** 与接口 data.key 一致：analyzing 时双栏 loading，标题走 data.description */
  const isAnalyzing = statusKey === 'analyzing';

  const tenderList = useMemo(() => bizDetailRecord?.tenderFile || [], [bizDetailRecord]);
  const bidList = useMemo(() => bizDetailRecord?.bidderFile || [], [bizDetailRecord]);

  useEffect(() => {
    setTenderFileIdx((i) => Math.min(i, Math.max(0, tenderList.length - 1)));
  }, [tenderList.length]);

  useEffect(() => {
    setBidFileIdx((i) => Math.min(i, Math.max(0, bidList.length - 1)));
  }, [bidList.length]);

  const currentFiles = docTab === DOC_TAB_KEYS.tender ? tenderList : bidList;
  const currentSubIdx = docTab === DOC_TAB_KEYS.tender ? tenderFileIdx : bidFileIdx;
  const currentFieldName = docTab === DOC_TAB_KEYS.tender ? FIELD_TENDER_FILE : FIELD_BIDDER_FILE;
  const currentItem = currentFiles[currentSubIdx];

  useEffect(() => {
    if (statusKey !== 'completed' || !bizDetailRecord || !currentItem?.url) return;
    const k = wpsInstanceKey(currentFieldName, currentItem.url);
    setMountedWpsKeys((prev) => (prev.includes(k) ? prev : [...prev, k]));
  }, [statusKey, bizDetailRecord, currentFieldName, currentItem?.url]);

  const handleSubFileTabChange = (k) => {
    const n = Number(k);
    if (docTab === DOC_TAB_KEYS.tender) {
      setTenderFileIdx(n);
    } else {
      setBidFileIdx(n);
    }
  };

  /** 右侧检查项 Tab 列表（label 走 i18n） */
  const inspectTabItems = useMemo(
    () =>
      INSPECT_TAB_ORDER.map((k) => ({
        key: k,
        label: t(INSPECT_TAB_I18N[k]),
      })),
    []
  );

  /** 左侧原文档 Tab 列表 */
  const docTabItems = useMemo(
    () => [
      { key: DOC_TAB_KEYS.tender, label: t('i18n_bd_doc_tab_tender') },
      { key: DOC_TAB_KEYS.bid, label: t('i18n_bd_doc_tab_bid') },
    ],
    []
  );

  /** 分析中/失败用接口文案；完成用标准页标题 */
  const headerTitleText = useMemo(() => {
    if (isAnalyzing) {
      return statusDescription || t('i18n_bd_analyzing_hint');
    }
    if (statusKey === 'failed') {
      return statusDescription || t('i18n_bd_analyze_failed');
    }
    return t('i18n_bd_page_title', { name: titleName });
  }, [isAnalyzing, statusDescription, statusKey, titleName]);

  /** 仅分析完成可点下载（当前为占位成功提示） */
  const canDownload = statusKey === 'completed';

  /** 点击 Logo 回列表 */
  const handleLogo = () => {
    navigate(APP_DEFAULT_ROUTE.path);
  };

  /** 下载报告（待接真实下载逻辑） */
  const handleDownload = () => {
    if (!canDownload) return;
    message.success(t('i18n_download_report'));
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
    <div className="business-detail-page">
      <img className="business-detail-page__bg" src={checkBidingBg} alt="" />

      <header className="bd-header">
        <div className="bd-header__left">
          <button type="button" className="bd-header__logo" onClick={handleLogo} title={t('i18n_bd_back_list')}>
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
        <button
          type="button"
          className="bd-header__download"
          onClick={handleDownload}
          disabled={!canDownload}
        >
          <SvgIcon svg={downloadSvg} size={14} />
          {t('i18n_download_report')}
        </button>
      </header>

      <main className="bd-main">
        <TabMain
          className="bd-card--left"
          title={t('i18n_bd_column_original')}
          tabItems={docTabItems}
          activeTabKey={docTab}
          onTabChange={setDocTab}
          loading={isAnalyzing}
          bodyClassName="bd-card__body-wrap--doc"
        >
          {statusKey === 'failed' ? (
            <div className="bd-empty">{statusDescription || t('i18n_bd_analyze_failed')}</div>
          ) : null}
          {statusKey === 'completed' && bizDetailLoading ? (
            <div className="bd-wps-doc-loading">
              <Spin size="large" />
            </div>
          ) : null}
          {statusKey === 'completed' && !bizDetailLoading && !bizDetailRecord ? (
            <div className="bd-empty">{t('i18n_bd_detail_load_failed')}</div>
          ) : null}
          {statusKey === 'completed' && !bizDetailLoading && bizDetailRecord && currentFiles.length === 0 ? (
            <div className="bd-empty">{t('i18n_bd_no_attachment')}</div>
          ) : null}
          {statusKey === 'completed' && !bizDetailLoading && bizDetailRecord && currentFiles.length > 0 ? (
            <div className="bd-wps-doc">
              {currentFiles.length > 1 ? (
                <Tabs
                  size="small"
                  className="bd-wps-doc__subtabs"
                  activeKey={String(currentSubIdx)}
                  onChange={handleSubFileTabChange}
                  items={currentFiles.map((f, i) => ({
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
                  const active = docTab === DOC_TAB_KEYS.tender && tenderFileIdx === i;
                  return (
                    <AibidWpsDocPane
                      key={k}
                      item={file}
                      dataCode={reviewCode}
                      fieldName={FIELD_TENDER_FILE}
                      active={active}
                      metaName={META_AIBID_REVIEW_RECORD}
                    />
                  );
                })}
                {bidList.map((file, i) => {
                  const k = wpsInstanceKey(FIELD_BIDDER_FILE, file.url);
                  if (!mountedWpsKeys.includes(k)) return null;
                  const active = docTab === DOC_TAB_KEYS.bid && bidFileIdx === i;
                  return (
                    <AibidWpsDocPane
                      key={k}
                      item={file}
                      dataCode={reviewCode}
                      fieldName={FIELD_BIDDER_FILE}
                      active={active}
                      metaName={META_AIBID_REVIEW_RECORD}
                    />
                  );
                })}
              </div>
            </div>
          ) : null}
          {statusKey !== 'completed' && statusKey !== 'failed' ? (
            <div className="bd-wps-placeholder">
              <p>{t('i18n_bd_wps_placeholder')}</p>
              <p className="bd-wps-placeholder__sub">{t('i18n_bd_wps_readonly')}</p>
            </div>
          ) : null}
        </TabMain>

        <TabMain
          className="bd-card--right"
          title={t('i18n_bd_column_inspection')}
          tabItems={inspectTabItems}
          activeTabKey={inspectTab}
          onTabChange={setInspectTab}
          loading={isAnalyzing}
          bodyClassName="bd-card__body-wrap--inspect"
        >
          {!isAnalyzing && statusKey === 'completed' ? (
            <div className="bd-empty">{t('i18n_bd_no_data')}</div>
          ) : null}
          {!isAnalyzing && statusKey === 'failed' ? (
            <div className="bd-empty">{statusDescription || t('i18n_bd_analyze_failed')}</div>
          ) : null}
        </TabMain>
      </main>
    </div>
  );
}

export default BusinessDetail;
