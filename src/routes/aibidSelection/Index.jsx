import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  CheckCircleOutlined,
  ClockCircleOutlined,
  LoadingOutlined,
  MoreOutlined,
} from '@ant-design/icons';
import { Dropdown, message, Spin } from 'antd';
import dayjs from 'dayjs';
import { useDvaDispatch, useDvaSelector } from 'src/hooks/useDva';
import * as commonService from 'src/services/commom';
import { t } from 'src/utils/i18n';
import ThrottledInput from 'src/components/common/ThrottledInput/ThrottledInput';
import { confirmModal } from 'src/components/common/Modal/confirmModal';
import Empty from 'src/components/common/Empty';
import { STATUS_MAP } from 'src/utils/constants';
import selectionItemLogo from 'src/assets/img/selection-item-logo.png';
import './Index.less';
import AddSelection from './components/AddSelection';

const PAGE_SIZE = 20;

const AIBID_SELECTION_RECORD_LIST_BASE = {
  meta: { metaName: 'aibidSelectionRecord' },
  page: { pageNo: 1, pageSize: 20 },
  keyWord: '',
  filter: {
    conditions: [
      {
        left: { type: 'field', value: 'aibidSelectionRecord.createdBy' },
        op: 'in',
        label: '包括当前用户',
        right: {
          type: 'expression',
          value: ['currentUser'],
          expression: 'currentUser',
          labels: ['当前用户'],
        },
        curLabel: '包括当前用户',
        key: 1,
      },
    ],
    conj: 'advance',
    expr: '1',
  },
  keyWordSearchFields: ['tenderFileName', 'companyName'],
  scope: 1,
  sorts: [{ field: 'createdOn', orderType: 0 }],
};

function buildAibidSelectionRecordListRequest({ pageNo, pageSize, keyWord = '' }) {
  return {
    ...AIBID_SELECTION_RECORD_LIST_BASE,
    page: { pageNo, pageSize },
    keyWord: typeof keyWord === 'string' ? keyWord.trim() : '',
  };
}

const defaultPagination = { current: 1, pageSize: PAGE_SIZE, total: 0 };
const SCROLL_LOAD_THRESHOLD = 72;
const COMPLETED_FLASH_MS = 3000;

function formatCreatedOn(createdOn) {
  if (createdOn == null || createdOn === '') return '—';
  const n = Number(createdOn);
  const ms = !Number.isFinite(n) ? NaN : n < 1e12 ? n * 1000 : n;
  const d = dayjs(ms);
  return d.isValid() ? d.format('YYYY-MM-DD HH:mm') : '—';
}

/** 选标记录分析状态（analyzeStatus 对象或旧字段） */
function recordStatus(record) {
  const a = record.analyzeStatus;
  if (a != null && typeof a === 'object') {
    const v = a.name ?? a.id;
    if (v != null) return String(v);
  }
  if (typeof a === 'string') return a;
  return record.status != null ? String(record.status) : '';
}

function recordCodeKey(record) {
  return record.code != null ? String(record.code) : '';
}

function highlightKeyword(text, rawKeyword) {
  const str = text == null ? '' : String(text);
  const kw = (rawKeyword || '').trim();
  if (!kw) return str;
  try {
    const escaped = kw.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const re = new RegExp(`(${escaped})`, 'gi');
    const parts = str.split(re);
    const kwLower = kw.toLowerCase();
    return parts.map((part, i) =>
      part.toLowerCase() === kwLower ? (
        <span key={`${i}-${part.slice(0, 8)}`} className="business-list-page__kw-highlight">
          {part}
        </span>
      ) : (
        part
      )
    );
  } catch {
    return str;
  }
}

function openSelectionDetail(record) {
  const code = record.code;
  if (code == null || code === '') return;
  const path = `/aibidSelection/${encodeURIComponent(code)}`;
  const sp = new URLSearchParams();
  if (record.tenderFileName) sp.set('t', String(record.tenderFileName));
  if (record.companyName) sp.set('c', String(record.companyName));
  const q = sp.toString();
  const href = new URL(q ? `${path}?${q}` : path, window.location.origin).href;
  window.open(href, '_blank', 'noopener,noreferrer');
}

function SelectionList() {
  const dispatch = useDvaDispatch();
  const isLogined = useDvaSelector((s) => !!s.account?.isLogined);
  const retryAnalyzeLoading = useDvaSelector((s) => !!s.loading?.effects?.['aibidSelection/retryAnalyze']);
  const [retryingCode, setRetryingCode] = useState(null);

  const [list, setList] = useState([]);
  const [pagination, setPagination] = useState(defaultPagination);
  const [loadingMore, setLoadingMore] = useState(false);
  const [listFetching, setListFetching] = useState(false);
  const [keyword, setKeyword] = useState('');
  const [flashCompletedCodes, setFlashCompletedCodes] = useState(() => new Set());
  const loadLockRef = useRef(false);
  const scrollRootRef = useRef(null);
  const stickySentinelRef = useRef(null);
  const [stickyStuck, setStickyStuck] = useState(false);
  const keywordRef = useRef('');
  const listRef = useRef(list);
  const paginationRef = useRef(pagination);
  const autoRefreshPendingRef = useRef(false);
  const prevListSnapshotRef = useRef([]);
  const flashTimersRef = useRef([]);

  keywordRef.current = keyword;
  listRef.current = list;
  paginationRef.current = pagination;

  const fetchList = useCallback(async (payload) => {
    const {
      current = 1,
      pageSize = PAGE_SIZE,
      keyword: keywordOpt = '',
      append,
      requestPageSize,
      replaceSyncPages,
    } = payload || {};

    const apiPageSize = requestPageSize ?? pageSize;

    if (append) {
      setLoadingMore(true);
    }
    setListFetching(true);

    const kw = typeof keywordOpt === 'string' ? keywordOpt : '';
    const requestPayload = buildAibidSelectionRecordListRequest({
      pageNo: current,
      pageSize: apiPageSize,
      keyWord: kw,
    });

    try {
      const { data, desc, result } = await commonService.getBizList(requestPayload, 'aibidSelectionRecord');
      if (result != 0) {
        message.error(desc);
        return;
      }

      const records = data?.records || [];
      const totalCount = data?.totalCount ?? 0;
      const nextList = append ? [...(listRef.current || []), ...records] : records;

      setList(nextList);

      const nextPageSize = replaceSyncPages ? PAGE_SIZE : pageSize;
      const nextCurrent = replaceSyncPages
        ? Math.max(1, Math.ceil(nextList.length / PAGE_SIZE))
        : current;

      setPagination({
        current: nextCurrent,
        pageSize: nextPageSize,
        total: totalCount,
      });
    } finally {
      setLoadingMore(false);
      setListFetching(false);
    }
  }, []);

  useEffect(() => {
    const isAuto = autoRefreshPendingRef.current;
    autoRefreshPendingRef.current = false;

    const prevSnap = prevListSnapshotRef.current;
    const prevMap = new Map(prevSnap.map((x) => [x.code, x.st]));

    if (isAuto && prevSnap.length) {
      const nextFlash = new Set();
      list.forEach((r) => {
        const ck = recordCodeKey(r);
        if (!ck) return;
        const st = recordStatus(r);
        const prevSt = prevMap.get(ck);
        if (prevSt === STATUS_MAP.ANALYZING && st === STATUS_MAP.COMPLETED) {
          nextFlash.add(ck);
        }
      });
      if (nextFlash.size) {
        setFlashCompletedCodes((prev) => {
          const merged = new Set(prev);
          nextFlash.forEach((c) => merged.add(c));
          return merged;
        });
        nextFlash.forEach((code) => {
          const tid = window.setTimeout(() => {
            setFlashCompletedCodes((prev) => {
              const next = new Set(prev);
              next.delete(code);
              return next;
            });
          }, COMPLETED_FLASH_MS);
          flashTimersRef.current.push(tid);
        });
      }
    }

    prevListSnapshotRef.current = list.map((r) => ({
      code: recordCodeKey(r),
      st: recordStatus(r),
    }));

    return undefined;
  }, [list]);

  useEffect(
    () => () => {
      flashTimersRef.current.forEach((id) => window.clearTimeout(id));
      flashTimersRef.current = [];
    },
    []
  );

  useEffect(() => {
    if (!isLogined) {
      setList([]);
      setPagination(defaultPagination);
      setLoadingMore(false);
      setListFetching(false);
      setKeyword('');
      return;
    }
    void fetchList({ current: 1, pageSize: PAGE_SIZE });
  }, [fetchList, isLogined]);

  useEffect(() => {
    if (!isLogined) return undefined;
    const id = window.setInterval(() => {
      const len = listRef.current.length;
      const total = paginationRef.current.total;
      const requestPageSize =
        len === 0 ? PAGE_SIZE : Math.min(Math.max(PAGE_SIZE, len), total > 0 ? total : Number.MAX_SAFE_INTEGER);
      autoRefreshPendingRef.current = true;
      void fetchList({
        current: 1,
        pageSize: PAGE_SIZE,
        requestPageSize,
        keyword: keywordRef.current?.trim() || undefined,
        replaceSyncPages: true,
      });
    }, 60000);
    return () => window.clearInterval(id);
  }, [fetchList, isLogined]);

  useEffect(() => {
    if (!loadingMore) loadLockRef.current = false;
  }, [loadingMore]);

  useEffect(() => {
    const root = scrollRootRef.current;
    const sentinel = stickySentinelRef.current;
    if (!root || !sentinel || typeof IntersectionObserver === 'undefined') return undefined;

    const observer = new IntersectionObserver(
      ([entry]) => {
        setStickyStuck(!entry.isIntersecting);
      },
      { root, threshold: 0, rootMargin: '0px' }
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, []);

  const hasMore = list.length < pagination.total;

  const handleSearch = useCallback(
    (val) => {
      if (!isLogined) return;
      const v = val ?? '';
      setKeyword(v);
      void fetchList({ current: 1, pageSize: PAGE_SIZE, keyword: v || undefined });
    },
    [fetchList, isLogined]
  );

  const handleListScroll = useCallback(
    (e) => {
      if (!isLogined) return;
      const el = e.currentTarget;
      if (!hasMore || loadingMore || listFetching) return;
      if (el.scrollTop + el.clientHeight < el.scrollHeight - SCROLL_LOAD_THRESHOLD) return;
      if (loadLockRef.current) return;
      loadLockRef.current = true;
      void fetchList({
        current: pagination.current + 1,
        pageSize: PAGE_SIZE,
        keyword: keyword || undefined,
        append: true,
      });
    },
    [fetchList, hasMore, isLogined, keyword, listFetching, loadingMore, pagination.current]
  );

  const handleView = useCallback((record) => {
    openSelectionDetail(record);
  }, []);

  const stopRowClick = useCallback((e) => {
    e.stopPropagation();
  }, []);

  const handleRetry = useCallback(
    (record) => {
      const code = record?.code;
      if (code == null || code === '') return;
      const codeKey = recordCodeKey(record);
      confirmModal({
        noDrag: true,
        content: t('i18n_retry_confirm'),
        onOk: async () => {
          setRetryingCode(codeKey);
          try {
            await dispatch({
              type: 'aibidSelection/retryAnalyze',
              payload: { selectionCode: code },
            });
            message.success(t('i18n_retry_started'));
            void fetchList({
              current: 1,
              pageSize: PAGE_SIZE,
              keyword: keyword.trim() || undefined,
            });
          } catch (e) {
            message.error(e?.message || t('i18n_request_failed'));
          } finally {
            setRetryingCode(null);
          }
        },
      });
    },
    [dispatch, fetchList, keyword]
  );

  const handleDownload = useCallback((record) => {
    openSelectionDetail(record);
  }, []);

  const refreshFirstPage = useCallback(() => {
    void fetchList({
      current: 1,
      pageSize: PAGE_SIZE,
      keyword: keyword.trim() || undefined,
    });
  }, [fetchList, keyword]);

  const handleDeleteClick = useCallback(
    (record) => {
      const name = record.tenderFileName || record.name || record.code || '';
      confirmModal({
        noDrag: true,
        content: t('i18n_delete_confirm', { name }),
        onOk: () => {
          dispatch({
            type: 'common/deleteBizData',
            payload: { metaName: 'aibidSelectionRecord', code: record.code },
            callback: () => {
              message.success(t('i18n_delete'));
              setList((prev) => prev.filter((r) => r.code !== record.code));
            },
          });
        },
      });
    },
    [dispatch]
  );

  const renderStatusFirstCell = (record) => {
    const st = recordStatus(record);
    const ck = recordCodeKey(record);
    if (st === STATUS_MAP.FAILED) {
      return (
        <span className="business-list-page__status business-list-page__status--failed">
          <ClockCircleOutlined /> {t('i18n_status_failed_short')}
        </span>
      );
    }
    if (st === STATUS_MAP.ANALYZING) {
      return (
        <span className="business-list-page__status business-list-page__status--analyzing">
          <LoadingOutlined spin /> {t('i18n_status_analyzing_short')}
        </span>
      );
    }
    if (st === STATUS_MAP.COMPLETED && ck && flashCompletedCodes.has(ck)) {
      return (
        <span className="business-list-page__status business-list-page__status--completed">
          <CheckCircleOutlined /> {t('i18n_status_completed_short')}
        </span>
      );
    }
    return null;
  };

  const renderActionsRow = (record) => {
    const st = recordStatus(record);
    if (st === STATUS_MAP.FAILED) {
      const ck = recordCodeKey(record);
      const retryBusy = retryAnalyzeLoading && retryingCode === ck;
      return (
        <span className="business-list-page__item-actions">
          <button
            type="button"
            className="business-list-page__link"
            disabled={retryBusy}
            onClick={(e) => {
              stopRowClick(e);
              handleRetry(record);
            }}
          >
            {retryBusy ? (
              <>
                <LoadingOutlined spin />
                {' '}
              </>
            ) : null}
            {t('i18n_retry')}
          </button>
          <button
            type="button"
            className="business-list-page__link"
            onClick={(e) => {
              stopRowClick(e);
              handleDeleteClick(record);
            }}
          >
            {t('i18n_delete')}
          </button>
        </span>
      );
    }
    if (st === STATUS_MAP.ANALYZING) {
      return (
        <span className="business-list-page__item-actions">
          <button type="button" className="business-list-page__link" onClick={(e) => { stopRowClick(e); handleView(record); }}>
            {t('i18n_view')}
          </button>
        </span>
      );
    }
    return (
      <Dropdown
        menu={{
          items: [
            {
              key: 'view',
              label: t('i18n_view'),
              onClick: () => handleView(record),
            },
            {
              key: 'download',
              label: t('i18n_selection_download_report'),
              onClick: () => handleDownload(record),
            },
            {
              key: 'delete',
              label: t('i18n_delete'),
              danger: true,
              onClick: () => handleDeleteClick(record),
            },
          ],
        }}
        trigger={['click']}
      >
        <button
          type="button"
          className="business-list-page__more"
          aria-label="more"
          onClick={stopRowClick}
        >
          <MoreOutlined />
        </button>
      </Dropdown>
    );
  };

  const initialLoading = isLogined && listFetching && list.length === 0;

  return (
    <div className="aibid-selection-list-page business-list-page">
      <div
        className="business-list-page__scroll"
        ref={scrollRootRef}
        onScroll={handleListScroll}
      >
        <AddSelection key={String(isLogined)} onAnalyzeSuccessRefreshList={refreshFirstPage} />

        <section className="business-list-page__history">
          <div
            className="business-list-page__sticky-sentinel"
            ref={stickySentinelRef}
            aria-hidden
          />
          <div
            className={`business-list-page__sticky${stickyStuck ? ' business-list-page__sticky--stuck' : ''}`}
          >
            <h2 className="business-list-page__history-title">{t('i18n_selection_history')}</h2>
            {isLogined ? (
              <ThrottledInput
                className="business-list-page__search"
                placeholder={t('i18n_search')}
                prefix={<i className="iconfont icon-sousuo ai-b-t-search-prefix-icon" aria-hidden />}
                allowClear
                value={keyword}
                throttleMs={500}
                onChange={handleSearch}
              />
            ) : null}
          </div>

          <div
            className={`business-list-page__list-viewport${list.length > 0 ? ' business-list-page__list-viewport--has-records' : ''}`}
            role="region"
            aria-label={t('i18n_selection_history')}
          >
            {initialLoading ? (
              <div className="business-list-page__list-loading">
                <Spin size="large" />
              </div>
            ) : list.length === 0 ? (
              <Empty description={t('i18n_selection_history_empty')} className="business-list-page__empty" />
            ) : (
              <ul className="business-list-page__list">
                {list.map((record, index) => {
                  const st = recordStatus(record);
                  return (
                    <li
                      key={record.code != null ? String(record.code) : `row-${index}`}
                      className="business-list-page__item"
                      role="button"
                      tabIndex={0}
                      onClick={() => handleView(record)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          handleView(record);
                        }
                      }}
                    >
                      <img
                        className={`business-list-page__item-icon business-list-page__item-icon--selection${st === STATUS_MAP.FAILED ? ' is-dimmed' : ''}`}
                        src={selectionItemLogo}
                        alt=""
                        width={78}
                        height={78}
                      />
                      <div className="business-list-page__item-body">
                        <div className="business-list-page__item-row business-list-page__item-row--top">
                          <div className="business-list-page__item-title">
                            {highlightKeyword(record.tenderFileName ?? record.name ?? '—', keyword)}
                          </div>
                          <div className="business-list-page__item-status-slot">{renderStatusFirstCell(record)}</div>
                        </div>
                        <div className="business-list-page__item-sub">
                          {highlightKeyword(record.companyName ?? '—', keyword)}
                        </div>
                        <div className="business-list-page__item-row business-list-page__item-row--bottom">
                          <div className="business-list-page__item-time">{formatCreatedOn(record.createdOn)}</div>
                          <div className="business-list-page__item-actions-slot" onClick={stopRowClick}>
                            {renderActionsRow(record)}
                          </div>
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
            {list.length > 0 && !hasMore ? (
              <p className="business-list-page__no-more">{t('i18n_no_more_data')}</p>
            ) : null}
            {list.length > 0 && loadingMore ? (
              <div className="business-list-page__list-more">
                <Spin />
              </div>
            ) : null}
          </div>
        </section>
      </div>
    </div>
  );
}

export default SelectionList;
