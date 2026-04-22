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
import recordItem from 'src/assets/img/record-item.png';
import './Index.less';
import AddReview from './components/AddReview';

/** 列表单次请求/分页默认条数 */
const PAGE_SIZE = 20;

/** 审标记录标准列表默认请求体（aibidReviewRecord / paas/app/std/list） */
const AIBID_REVIEW_RECORD_LIST_BASE = {
  meta: { metaName: 'aibidReviewRecord' },
  page: { pageNo: 1, pageSize: 20 },
  keyWord: '',
  filter: {
    conditions: [
      {
        left: { type: 'field', value: 'aibidReviewRecord.createdBy' },
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
  keyWordSearchFields: ['tenderFileName', 'bidderFileName', 'companyName'],
  scope: 1,
  sorts: [{ field: 'createdOn', orderType: 0 }],
};

/** 拼装审标记录列表请求体（分页 + 关键词） */
function buildAibidReviewRecordListRequest({ pageNo, pageSize, keyWord = '' }) {
  return {
    ...AIBID_REVIEW_RECORD_LIST_BASE,
    page: { pageNo, pageSize },
    keyWord: typeof keyWord === 'string' ? keyWord.trim() : '',
  };
}

/** 分页 UI 初始状态 */
const defaultPagination = { current: 1, pageSize: PAGE_SIZE, total: 0 };
/** 距列表底部多少 px 触发加载更多 */
const SCROLL_LOAD_THRESHOLD = 72;
/** 「分析完成」高亮闪烁持续时间 */
const COMPLETED_FLASH_MS = 3000;

/** 创建时间戳格式化为展示字符串 */
function formatCreatedOn(createdOn) {
  if (createdOn == null || createdOn === '') return '—';
  const n = Number(createdOn);
  const ms = !Number.isFinite(n) ? NaN : n < 1e12 ? n * 1000 : n;
  const d = dayjs(ms);
  return d.isValid() ? d.format('YYYY-MM-DD HH:mm') : '—';
}

/** 单条记录的审标状态（兼容 reviewStatus / status） */
function recordStatus(record) {
  return record.reviewStatus ?? record.status;
}

/** 记录唯一 code，转字符串便于 Map/Set */
function recordCodeKey(record) {
  return record.code != null ? String(record.code) : '';
}

/** 搜索结果高亮（#FD6364 见 Index.less） */
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

/** 新标签页打开详情，查询参数携带文件名/公司名供标题兜底 */
function openBusinessDetail(record) {
  const code = record.code;
  if (code == null || code === '') return;
  const path = `/aibidReview/${encodeURIComponent(code)}`;
  const sp = new URLSearchParams();
  if (record.bidderFileName) sp.set('b', String(record.bidderFileName));
  if (record.tenderFileName) sp.set('t', String(record.tenderFileName));
  if (record.companyName) sp.set('c', String(record.companyName));
  const q = sp.toString();
  const href = new URL(q ? `${path}?${q}` : path, window.location.origin).href;
  window.open(href, '_blank', 'noopener,noreferrer');
}

/** 审标记录列表：历史列表、搜索、分页加载、定时同步与重试/删除 */
function BusinessList() {
  /** dva dispatch（删除、拉详情等） */
  const dispatch = useDvaDispatch();
  /** 是否已登录（未登录不拉列表） */
  const isLogined = useDvaSelector((s) => !!s.account?.isLogined);
  /** 重试审标分析 effect 加载中（dva-loading） */
  const retryAnalyzeLoading = useDvaSelector((s) => !!s.loading?.effects?.['aibidReview/retryAnalyze']);
  /** 当前正在重试的记录 code（与 loading 组合，仅该行显示 loading） */
  const [retryingCode, setRetryingCode] = useState(null);

  /** 当前页合并后的审标记录列表 */
  const [list, setList] = useState([]);
  /** 与 antd 分页语义对齐：current / pageSize / total */
  const [pagination, setPagination] = useState(defaultPagination);
  /** 触底加载下一页中 */
  const [loadingMore, setLoadingMore] = useState(false);
  /** 列表请求进行中（含首屏与刷新） */
  const [listFetching, setListFetching] = useState(false);

  /** 搜索关键词（节流在 ThrottledInput 内） */
  const [keyword, setKeyword] = useState('');
  /** 刚变为「完成」的记录 code，用于短时高亮 */
  const [flashCompletedCodes, setFlashCompletedCodes] = useState(() => new Set());
  /** 防止滚动事件重复触发加载更多 */
  const loadLockRef = useRef(false);
  /** 列表滚动容器，供 IntersectionObserver 作 root */
  const scrollRootRef = useRef(null);
  /** 吸顶区域哨兵：用于判断标题栏是否「粘住」 */
  const stickySentinelRef = useRef(null);
  /** 吸顶样式是否激活 */
  const [stickyStuck, setStickyStuck] = useState(false);
  /** 定时轮询/刷新时读取最新关键词 */
  const keywordRef = useRef('');
  /** 异步回调内读取最新列表，避免闭包陈旧 */
  const listRef = useRef(list);
  /** 异步回调内读取最新分页信息 */
  const paginationRef = useRef(pagination);
  /** 标记下一次 list 更新来自定时刷新（用于检测状态跃迁并闪动） */
  const autoRefreshPendingRef = useRef(false);
  /** 上一次列表快照：code + 状态，用于对比 analyzing→completed */
  const prevListSnapshotRef = useRef([]);
  /** 完成态闪动定时器 id，卸载时清理 */
  const flashTimersRef = useRef([]);

  keywordRef.current = keyword;
  listRef.current = list;
  paginationRef.current = pagination;

  /** 请求审标记录列表；支持追加、同步总条数替换当前页等 */
  const fetchBusinessList = useCallback(async (payload) => {
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
    const requestPayload = buildAibidReviewRecordListRequest({
      pageNo: current,
      pageSize: apiPageSize,
      keyWord: kw,
    });

    try {
      const { data, desc, result } = await commonService.getBizList(requestPayload, 'aibidReviewRecord');
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

  /** list 变化：定时刷新若检测到 analyzing→completed，则短时高亮；并更新快照 */
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

  /** 卸载时清理完成态闪动定时器 */
  useEffect(
    () => () => {
      flashTimersRef.current.forEach((id) => window.clearTimeout(id));
      flashTimersRef.current = [];
    },
    []
  );

  /** 登录态变化：未登录清空；已登录拉第一页 */
  useEffect(() => {
    if (!isLogined) {
      setList([]);
      setPagination(defaultPagination);
      setLoadingMore(false);
      setListFetching(false);
      setKeyword('');
      return;
    }
    void fetchBusinessList({ current: 1, pageSize: PAGE_SIZE });
  }, [fetchBusinessList, isLogined]);

  /** 已登录时每分钟静默同步列表（保持与后端状态一致） */
  useEffect(() => {
    if (!isLogined) return undefined;
    const id = window.setInterval(() => {
      const len = listRef.current.length;
      const total = paginationRef.current.total;
      const requestPageSize =
        len === 0 ? PAGE_SIZE : Math.min(Math.max(PAGE_SIZE, len), total > 0 ? total : Number.MAX_SAFE_INTEGER);
      autoRefreshPendingRef.current = true;
      void fetchBusinessList({
        current: 1,
        pageSize: PAGE_SIZE,
        requestPageSize,
        keyword: keywordRef.current?.trim() || undefined,
        replaceSyncPages: true,
      });
    }, 60000);
    return () => window.clearInterval(id);
  }, [fetchBusinessList, isLogined]);

  /** 加载更多结束后解锁，允许再次触底请求 */
  useEffect(() => {
    if (!loadingMore) loadLockRef.current = false;
  }, [loadingMore]);

  /** 吸顶栏：哨兵不可见时加 stuck 样式 */
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

  /** 是否还有未加载的后续页 */
  const hasMore = list.length < pagination.total;

  /** 搜索：重置到第一页并带关键词请求 */
  const handleSearch = useCallback(
    (val) => {
      if (!isLogined) return;
      const v = val ?? '';
      setKeyword(v);
      void fetchBusinessList({ current: 1, pageSize: PAGE_SIZE, keyword: v || undefined });
    },
    [fetchBusinessList, isLogined]
  );

  /** 列表滚动触底：加载下一页 */
  const handleListScroll = useCallback(
    (e) => {
      if (!isLogined) return;
      const el = e.currentTarget;
      if (!hasMore || loadingMore || listFetching) return;
      if (el.scrollTop + el.clientHeight < el.scrollHeight - SCROLL_LOAD_THRESHOLD) return;
      if (loadLockRef.current) return;
      loadLockRef.current = true;
      void fetchBusinessList({
        current: pagination.current + 1,
        pageSize: PAGE_SIZE,
        keyword: keyword || undefined,
        append: true,
      });
    },
    [fetchBusinessList, hasMore, isLogined, keyword, listFetching, loadingMore, pagination.current]
  );

  /** 查看详情（新开标签） */
  const handleView = useCallback((record) => {
    openBusinessDetail(record);
  }, []);

  /** 阻止行内按钮冒泡，避免触发行点击进详情 */
  const stopRowClick = useCallback((e) => {
    e.stopPropagation();
  }, []);

  /** 重试失败记录：确认后调用前台重试审标分析（入参为记录 reviewCode） */
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
              type: 'aibidReview/retryAnalyze',
              payload: { reviewCode: code },
            });
            message.success(t('i18n_retry_started'));
            void fetchBusinessList({
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
    [dispatch, fetchBusinessList, keyword]
  );

  /** 与查看一致：报告在详情页下载，此处仅打开详情 */
  const handleDownload = useCallback((record) => {
    openBusinessDetail(record);
  }, []);

  /** 刷新第一页（创建/删除/重试后） */
  const refreshFirstPage = useCallback(() => {
    void fetchBusinessList({
      current: 1,
      pageSize: PAGE_SIZE,
      keyword: keyword.trim() || undefined,
    });
  }, [fetchBusinessList, keyword]);

  /** 删除单条审标记录 */
  const handleDeleteClick = useCallback(
    (record) => {
      const name = record.bidderFileName || record.tenderFileName || record.code || '';
      confirmModal({
        noDrag: true,
        content: t('i18n_delete_confirm', { name }),
        onOk: () => {
          dispatch({
            type: 'common/deleteBizData',
            payload: { metaName: 'aibidReviewRecord', code: record.code },
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

  /** 列表首列状态：失败/分析中/刚完成闪动 */
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

  /** 行尾操作：重试/查看/更多菜单 */
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
              label: t('i18n_download_report'),
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

  /** 已登录且首屏拉列表中、尚无数据 */
  const initialLoading = isLogined && listFetching && list.length === 0;

  return (
    <div className="business-list-page">
      <div
        className="business-list-page__scroll"
        ref={scrollRootRef}
        onScroll={handleListScroll}
      >
        <AddReview key={String(isLogined)} onAnalyzeSuccessRefreshList={refreshFirstPage} />

        <section className="business-list-page__history">
          <div
            className="business-list-page__sticky-sentinel"
            ref={stickySentinelRef}
            aria-hidden
          />
          <div
            className={`business-list-page__sticky${stickyStuck ? ' business-list-page__sticky--stuck' : ''}`}
          >
            <h2 className="business-list-page__history-title">{t('i18n_business_inspection_history')}</h2>
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
            aria-label={t('i18n_business_inspection_history')}
          >
            {initialLoading ? (
              <div className="business-list-page__list-loading">
                <Spin size="large" />
              </div>
            ) : list.length === 0 ? (
              <Empty description={t('i18n_business_history_empty')} className="business-list-page__empty" />
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
                        className={`business-list-page__item-icon${st === STATUS_MAP.FAILED ? ' is-dimmed' : ''}`}
                        src={recordItem}
                        alt=""
                      />
                      <div className="business-list-page__item-body">
                        <div className="business-list-page__item-row business-list-page__item-row--top">
                          <div className="business-list-page__item-title">
                            {highlightKeyword(record.bidderFileName ?? '—', keyword)}
                          </div>
                          <div className="business-list-page__item-status-slot">{renderStatusFirstCell(record)}</div>
                        </div>
                        <div className="business-list-page__item-sub">
                          {highlightKeyword(record.tenderFileName ?? '—', keyword)}
                        </div>
                        <div className="business-list-page__item-company">
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

export default BusinessList;
