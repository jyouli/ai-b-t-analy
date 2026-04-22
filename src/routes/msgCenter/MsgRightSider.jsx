import React, { useCallback, useEffect, useRef, useState } from 'react';
import { connect } from 'dva';
import { useNavigate } from 'react-router-dom';
import { Drawer, Tabs, Badge, Input, Select, Button, Empty, message } from 'antd';
import { Virtuoso } from 'react-virtuoso';
import { t } from 'src/utils/i18n';
import toolTime from 'src/lib/toolTime';
import { MSG_CENTER_SHOW_NOTIFICATION_TAB } from 'src/config/env';
import RichMsgContent from 'src/components/common/RichMsgContent/RichMsgContent';
import { tryOpenCreditFromMsg } from './openMsgTarget';
import './MsgRightSider.less';

function MsgRightSider({
  visible,
  onClose,
  dispatch,
  todoTotal,
  unreadTotal,
  searchUnreadValue,
  searchedUnreadValue,
  searchUntreatValue,
  searchedUntreatedValue,
  unreadTypeName,
  untreatTypeName,
}) {
  const navigate = useNavigate();
  const [unTreatedList, setUnTreatedList] = useState([]);
  const [unReadList, setUnReadList] = useState([]);
  const [unreadTypeList, setUnreadTypeList] = useState([]);
  const [untreatTypeList, setUntreatTypeList] = useState([]);
  const [batchLoading, setBatchLoading] = useState(false);
  const [activeKey, setActiveKey] = useState('1');
  const searchTimer = useRef(null);
  const openSnapshotRef = useRef({});
  const activeKeyRef = useRef('1');
  const fetchNumRef = useRef(0);

  const showNotifyTab = MSG_CENTER_SHOW_NOTIFICATION_TAB;

  activeKeyRef.current = activeKey;

  useEffect(() => {
    if (!visible) return;
    const defaultKey =
      showNotifyTab && todoTotal === 0 && unreadTotal > 0 ? '2' : '1';
    setActiveKey(defaultKey);
    activeKeyRef.current = defaultKey;
  }, [visible, showNotifyTab, todoTotal, unreadTotal]);

  const loadTypeLists = useCallback(() => {
    dispatch({
      type: 'msgCenter/getMsgTypeList',
      payload: {},
      callback: (unreadTypes, untreatTypes) => {
        setUnreadTypeList(Array.isArray(unreadTypes) ? unreadTypes : []);
        setUntreatTypeList(Array.isArray(untreatTypes) ? untreatTypes : []);
      },
    });
  }, [dispatch]);

  openSnapshotRef.current = {
    untreatTypeName,
    unreadTypeName,
    searchUntreatValue,
    searchUnreadValue,
    showNotifyTab,
  };

  const runGetAllDataFromSnapshot = useCallback(() => {
    const snap = openSnapshotRef.current;
    const untreatParams = {
      meta: { metaName: 'todoMessage' },
      page: { pageNo: 1, pageSize: 999 },
      sorts: [{ field: 'createdOn', orderType: 2 }],
      isRead: 0,
      type: snap.untreatTypeName,
      keyword: snap.searchUntreatValue,
    };
    const unreadParams = {
      meta: { metaName: 'message' },
      page: { pageNo: 1, pageSize: 999 },
      sorts: [{ field: 'createdOn', orderType: 2 }],
      isRead: 0,
      type: snap.unreadTypeName,
      keyword: snap.searchUnreadValue,
    };
    dispatch({
      type: 'msgCenter/getAllData',
      payload: { untreatParams, unreadParams },
      callback: (tTodo, tUnread, todos, unreads) => {
        if (snap.showNotifyTab && tTodo === 0 && tUnread > 0) {
          setActiveKey('2');
          activeKeyRef.current = '2';
        }
        setUnTreatedList(todos || []);
        setUnReadList(unreads || []);
      },
    });
  }, [dispatch]);

  useEffect(() => {
    if (!visible) return;
    runGetAllDataFromSnapshot();
    loadTypeLists();
  }, [visible, runGetAllDataFromSnapshot, loadTypeLists]);

  const refreshTotalsDelayed = useCallback(() => {
    setTimeout(() => dispatch({ type: 'msgCenter/refreshTotals' }), 2000);
  }, [dispatch]);

  const clearUnreadnum = useCallback(() => {
    fetchNumRef.current += 1;
    dispatch({
      type: 'msgCenter/getUnReadTotal',
      payload: {},
      callback: (data) => {
        const n = data != null ? Number(data) : 0;
        if (n !== 0 && fetchNumRef.current < 10) {
          setTimeout(clearUnreadnum, 5000);
        } else {
          fetchNumRef.current = 0;
        }
      },
    });
  }, [dispatch]);

  const handleMsgType = (type, value) => {
    dispatch({
      type: 'msgCenter/saveReducer',
      payload: { [type]: value },
    });
    if (type === 'unreadTypeName') {
      dispatch({
        type: 'msgCenter/getReadMsgList',
        payload: {
          meta: { metaName: 'message' },
          page: { pageNo: 1, pageSize: 999 },
          sorts: [{ field: 'createdOn', orderType: 2 }],
          isRead: 0,
          type: value,
          keyword: searchUnreadValue,
        },
        callback: (list) => setUnReadList(list || []),
      });
    } else if (type === 'untreatTypeName') {
      dispatch({
        type: 'msgCenter/getUntreatedList',
        payload: {
          meta: { metaName: 'todoMessage' },
          page: { pageNo: 1, pageSize: 999 },
          sorts: [{ field: 'createdOn', orderType: 2 }],
          isRead: 0,
          type: value,
          keyword: searchUntreatValue,
        },
        callback: (list) => setUnTreatedList(list || []),
      });
    }
  };

  const runSearch = (value) => {
    const tabKey = activeKeyRef.current;
    if (tabKey === '1') {
      dispatch({
        type: 'msgCenter/getUntreatedList',
        payload: {
          meta: { metaName: 'todoMessage' },
          page: { pageNo: 1, pageSize: 999 },
          sorts: [{ field: 'createdOn', orderType: 2 }],
          isRead: 0,
          keyword: value,
        },
        callback: (list) => setUnTreatedList(list || []),
      });
    } else {
      dispatch({
        type: 'msgCenter/getReadMsgList',
        payload: {
          meta: { metaName: 'message' },
          page: { pageNo: 1, pageSize: 999 },
          sorts: [{ field: 'createdOn', orderType: 2 }],
          isRead: 0,
          keyword: value,
        },
        callback: (list) => setUnReadList(list || []),
      });
    }
  };

  const debouncedSearch = (value) => {
    clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => runSearch(value), 800);
  };

  const setSearchValue = (key, value) => {
    dispatch({ type: 'msgCenter/saveReducer', payload: { [key]: value } });
  };

  const onTabsChange = (key) => {
    clearTimeout(searchTimer.current);
    setActiveKey(key);
    activeKeyRef.current = key;
  };

  const getUnreadParams = () => ({
    meta: { metaName: 'message' },
    page: { pageNo: 1, pageSize: 999 },
    sorts: [{ field: 'createdOn', orderType: 2 }],
    isRead: 0,
    type: unreadTypeName,
    keyword: searchUnreadValue,
  });

  const updateInform = (item, idx) => {
    if (
      !(
        unReadList[idx] &&
        (unReadList[idx].isRead === '0' || unReadList[idx].isRead === undefined)
      )
    ) {
      return;
    }
    const next = [...unReadList];
    next[idx] = { ...next[idx], isRead: '1' };
    setUnReadList(next);
    dispatch({
      type: 'msgCenter/updateInformStatus',
      payload: {
        code: item.code,
        callback: refreshTotalsDelayed,
      },
    });
  };

  const onUnreadCardClick = (item, idx) => {
    if (tryOpenCreditFromMsg(item, navigate)) {
      onClose?.();
      updateInform(item, idx);
      return;
    }
    updateInform(item, idx);
    // message.info(t('i18n_msg_center_no_detail_jump'));
  };

  const onTodoCardClick = (item) => {
    if (tryOpenCreditFromMsg(item, navigate)) {
      onClose?.();
      return;
    }
    // message.info(t('i18n_msg_center_no_detail_jump'));
  };

  const batchInform = () => {
    fetchNumRef.current = 0;
    const listFilter = { ...getUnreadParams() };
    if (listFilter.type === 'all') delete listFilter.type;
    setBatchLoading(true);
    dispatch({
      type: 'msgCenter/updateAllInformStatus',
      payload: { listFilter },
      callback: () => {
        dispatch({
          type: 'msgCenter/getUnReadData',
          payload: { unreadParams: getUnreadParams() },
          callback: (list) => setUnReadList(list || []),
        });
        setTimeout(clearUnreadnum, 5000);
        setBatchLoading(false);
      },
    });
  };

  const goMsgCenterPage = () => {
    onClose?.();
    navigate('/msgCenter');
  };

  const untreatOptions = [
    { value: 'all', label: t('i18n_ae99f297e9f5c759') },
    ...untreatTypeList.map((item) => ({ value: item.name, label: item.label })),
  ];
  const unreadOptions = [
    { value: 'all', label: t('i18n_ae99f297e9f5c759') },
    ...unreadTypeList.map((item) => ({ value: item.name, label: item.label })),
  ];

  const renderTodoItem = (item, idx) => (
    <div
      className="ai-b-t-msg-card"
      role="presentation"
      onClick={() => onTodoCardClick(item)}
    >
      <p className="ai-b-t-msg-card-title">
        <span className="subject">{item.subject}</span>
        <span className="time">{toolTime.formatTime(item.createdOn)}</span>
      </p>
      <div className="ai-b-t-msg-card-text">
        <RichMsgContent
          defaultText={(item.informContent || '').replace(/<\/?.+?>/g, '')}
          richText={item.informContentRich || ''}
        />
      </div>
    </div>
  );

  const renderUnreadItem = (item, idx) => (
    <div
      className="ai-b-t-msg-card"
      role="presentation"
      onClick={() => onUnreadCardClick(item, idx)}
    >
      <p className="ai-b-t-msg-card-title">
        <span className="subject">{item.subject}</span>
        <span className="time">{toolTime.formatTime(item.createdOn)}</span>
      </p>
      <div className="ai-b-t-msg-card-text">
        <RichMsgContent defaultText={item.content || ''} richText={item.contentRich || ''} />
      </div>
    </div>
  );

  const tabItems = [
    {
      key: '1',
      label: (
        <Badge overflowCount={999} offset={[10, 1]} count={todoTotal}>
          {t('i18n_52fdbbaeda4c9473')}
        </Badge>
      ),
      children: (
        <div className="ai-b-t-msg-panel">
          {todoTotal === 0 ? (
            <div className="ai-b-t-msg-empty-wrap">
              <Empty description={t('i18n_d5d797a0101c8297')} />
            </div>
          ) : (
            <>
              <div className="ai-b-t-msg-toolbar">
                <Select
                  style={{ width: 130, marginRight: 14 }}
                  value={untreatTypeName}
                  options={untreatOptions}
                  showSearch
                  optionFilterProp="label"
                  onChange={(v) => handleMsgType('untreatTypeName', v)}
                />
                <Input.Search
                  placeholder={t('i18n_msg_center_search_ph')}
                  value={searchUntreatValue}
                  style={{ width: 'calc(100% - 144px)' }}
                  onSearch={(v) => {
                    setSearchValue('searchUntreatValue', v);
                    debouncedSearch(v);
                  }}
                  onChange={(e) => setSearchValue('searchUntreatValue', e.target.value)}
                  onPressEnter={(e) => {
                    const v = e.target.value;
                    setSearchValue('searchUntreatValue', v);
                    debouncedSearch(v);
                  }}
                />
              </div>
              {(searchedUntreatedValue?.length || untreatTypeName !== 'all') && (
                <p className="ai-b-t-msg-search-hint">
                  {t('i18n_msg_center_search_count', { count: unTreatedList.length })}
                </p>
              )}
              <div className="ai-b-t-msg-list-virtuoso">
                <Virtuoso
                  data={unTreatedList}
                  style={{ height: '100%' }}
                  computeItemKey={(index, item) => `${item.code || item.id}-${index}`}
                  itemContent={(index, item) => renderTodoItem(item, index)}
                />
              </div>
            </>
          )}
        </div>
      ),
    },
  ];

  if (showNotifyTab) {
    tabItems.push({
      key: '2',
      label: (
        <Badge overflowCount={999} offset={[10, 1]} count={unreadTotal}>
          {t('i18n_4b6ded8a7f181397')}
        </Badge>
      ),
      children: (
        <div className="ai-b-t-msg-panel ai-b-t-msg-panel--with-footer">
          {unreadTotal === 0 ? (
            <div className="ai-b-t-msg-empty-wrap">
              <Empty description={t('i18n_2fcd9cfe34c32b6f')} />
            </div>
          ) : (
            <>
              <div className="ai-b-t-msg-toolbar">
                <Select
                  style={{ width: 130, marginRight: 14 }}
                  value={unreadTypeName}
                  options={unreadOptions}
                  showSearch
                  optionFilterProp="label"
                  onChange={(v) => handleMsgType('unreadTypeName', v)}
                />
                <Input.Search
                  placeholder={t('i18n_msg_center_search_ph')}
                  value={searchUnreadValue}
                  style={{ width: 'calc(100% - 144px)' }}
                  onSearch={(v) => {
                    setSearchValue('searchUnreadValue', v);
                    debouncedSearch(v);
                  }}
                  onChange={(e) => setSearchValue('searchUnreadValue', e.target.value)}
                  onPressEnter={(e) => {
                    const v = e.target.value;
                    setSearchValue('searchUnreadValue', v);
                    debouncedSearch(v);
                  }}
                />
              </div>
              {(searchedUnreadValue?.length || unreadTypeName !== 'all') && (
                <p className="ai-b-t-msg-search-hint">
                  {t('i18n_msg_center_search_count', { count: unReadList.length })}
                </p>
              )}
              <div className="ai-b-t-msg-list-virtuoso ai-b-t-msg-list-virtuoso--padded">
                <Virtuoso
                  data={unReadList}
                  style={{ height: '100%' }}
                  computeItemKey={(index, item) => `${item.code}-${index}`}
                  itemContent={(index, item) => renderUnreadItem(item, index)}
                />
              </div>
              <div className="ai-b-t-msg-footer-floating">
                <Button
                  danger
                  block
                  loading={batchLoading && unReadList.length !== 0}
                  disabled={unReadList.length === 0}
                  onClick={batchInform}
                >
                  {t('i18n_6138e61195c930e1')}
                </Button>
              </div>
            </>
          )}
        </div>
      ),
    });
  }

  return (
    <Drawer
      title={null}
      placement="right"
      width={360}
      open={visible}
      onClose={onClose}
      mask={false}
      closable={false}
      className="ai-b-t-msg-drawer"
      styles={{ body: { padding: 0, display: 'flex', flexDirection: 'column', height: '100%' } }}
    >
      <div className="ai-b-t-msg-drawer-header">
        <span>{t('i18n_18b7db54924fbd90')}</span>
        <button type="button" className="ai-b-t-msg-all-link" onClick={goMsgCenterPage}>
          <i className="iconfont icon-xiaoxitongzhi" aria-hidden />
          {t('i18n_fa2ff3c379a7c988')}
        </button>
      </div>
      <Tabs
        activeKey={showNotifyTab ? activeKey : '1'}
        onChange={onTabsChange}
        className="ai-b-t-msg-tabs"
        destroyOnHidden
        items={showNotifyTab ? tabItems : [tabItems[0]]}
      />
    </Drawer>
  );
}

export default connect((state) => ({
  todoTotal: state.msgCenter.todoTotal,
  unreadTotal: state.msgCenter.unreadTotal,
  searchUnreadValue: state.msgCenter.searchUnreadValue,
  searchedUnreadValue: state.msgCenter.searchedUnreadValue,
  searchUntreatValue: state.msgCenter.searchUntreatValue,
  searchedUntreatedValue: state.msgCenter.searchedUntreatedValue,
  unreadTypeName: state.msgCenter.unreadTypeName,
  untreatTypeName: state.msgCenter.untreatTypeName,
}))(MsgRightSider);
