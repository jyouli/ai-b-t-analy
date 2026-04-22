import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Tabs, message, Badge, Menu } from 'antd';
import { useNavigate } from 'react-router-dom';
import { useDvaDispatch, useDvaSelector } from 'src/hooks/useDva';
import { t } from 'src/utils/i18n';
import { mergeFilter } from 'src/lib/tools';
import PageHeader from 'src/components/PageHeader/Index';
import BizList from 'src/components/bizView/bizList/BizList';
import RichMsgContent from 'src/components/common/RichMsgContent/RichMsgContent';
import { MSG_CENTER_SHOW_NOTIFICATION_TAB } from 'src/config/env';
import { tryOpenCreditFromMsg } from './openMsgTarget';
import './Index.less';

const defaultPage = { pageNo: 1, pageSize: 20 };

/** 关联数据列：接口可能返回对象或 JSON 字符串，展示 name 而非整段 JSON */
const RELATED_DATA_LABEL_ZH = '关联数据';

function MsgCenterIndex() {
  const dispatch = useDvaDispatch();
  const navigate = useNavigate();
  const isLogined = useDvaSelector((s) => s.account?.isLogined);
  const todoTotal = useDvaSelector((s) => s.msgCenter?.todoTotal ?? 0);
  const unreadTotal = useDvaSelector((s) => s.msgCenter?.unreadTotal ?? 0);

  const showNotifyTab = MSG_CENTER_SHOW_NOTIFICATION_TAB;
  const [mainTab, setMainTab] = useState('todo');
  const [todoMenuKey, setTodoMenuKey] = useState('t0');
  const [msgMenuKey, setMsgMenuKey] = useState('i0');
  const [appliedKeyword, setAppliedKeyword] = useState('');
  const [todoMeta, setTodoMeta] = useState(null);
  const [msgMeta, setMsgMeta] = useState(null);
  const [todoRecords, setTodoRecords] = useState([]);
  const [todoTotalCount, setTodoTotalCount] = useState(0);
  const [msgRecords, setMsgRecords] = useState([]);
  const [msgTotalCount, setMsgTotalCount] = useState(0);
  const [todoLoading, setTodoLoading] = useState(false);
  const [msgLoading, setMsgLoading] = useState(false);
  const [todoParams, setTodoParams] = useState({
    thConditions: [],
    sorts: [{ field: 'createdOn', orderType: 0 }],
    page: { ...defaultPage },
  });
  const [msgParams, setMsgParams] = useState({
    thConditions: [],
    sorts: [{ field: 'createdOn', orderType: 0 }],
    page: { ...defaultPage },
  });

  const patchedTodoMeta = useMemo(() => patchMsgCenterMeta(todoMeta, 'todo'), [todoMeta]);
  const patchedMsgMeta = useMemo(() => patchMsgCenterMeta(msgMeta, 'message'), [msgMeta]);

  const renderCellTodo = useCallback((fieldName, value, record, fieldInfo) => {
    if (fieldInfo?.name === 'dynamicBizData') {
      return formatDynamicBizDataCell(value);
    }
    if (fieldName === 'informContent') {
      const plain = (value && String(value).replace(/<\/?.+?>/g, '')) || '';
      return (
        <RichMsgContent defaultText={plain} richText={record.informContentRich || ''} />
      );
    }
    if (fieldName === 'informStatus') {
      if (!record.titleExtend || record.titleExtend === 'null') return undefined;
      const pending =
        record.informStatus === '20' ||
        record.informStatus === '10' ||
        record.informStatus === '21';
      return pending ? (
        <span style={{ color: '#FD6364' }}>{t('i18n_83fbf42f9e87f6d7')}</span>
      ) : (
        <span style={{ color: '#666' }}>{t('i18n_59f6c836929344e5')}</span>
      );
    }
    return undefined;
  }, []);

  const renderCellMsg = useCallback((fieldName, value, record) => {
    if (fieldName === 'content') {
      return <RichMsgContent defaultText={value || ''} richText={record.contentRich || ''} />;
    }
    if (fieldName === 'isRead') {
      return record.isRead === '0' ? (
        <span style={{ color: '#FD6364' }}>{t('i18n_4d0680f9efaef147')}</span>
      ) : (
        <span style={{ color: '#666' }}>{t('i18n_efdd1a47e4beb2f9')}</span>
      );
    }
    return undefined;
  }, []);

  const siderItemsTodo = useMemo(
    () => menuItemsDef(false, todoTotal, unreadTotal),
    [todoTotal, unreadTotal]
  );
  const siderItemsMsg = useMemo(
    () => menuItemsDef(true, todoTotal, unreadTotal),
    [todoTotal, unreadTotal]
  );

  useEffect(() => {
    if (!isLogined) return;
    dispatch({ type: 'msgCenter/refreshTotals' });
  }, [dispatch, isLogined]);

  useEffect(() => {
    if (!isLogined) return;
    dispatch({
      type: 'common/getMetaAllDetail',
      payload: { metaName: 'todoMessage' },
      callback: setTodoMeta,
    });
    dispatch({
      type: 'common/getMetaAllDetail',
      payload: { metaName: 'message' },
      callback: setMsgMeta,
    });
  }, [dispatch, isLogined]);

  const handleSearchApply = useCallback((v) => {
    setAppliedKeyword(v ?? '');
    setTodoParams((p) => ({ ...p, page: { ...p.page, pageNo: 1 } }));
    setMsgParams((p) => ({ ...p, page: { ...p.page, pageNo: 1 } }));
  }, []);

  const onTodoMenuClick = useCallback((key) => {
    setTodoMenuKey(key);
    setTodoParams((p) => ({ ...p, page: { ...p.page, pageNo: 1 } }));
  }, []);

  const onMsgMenuClick = useCallback((key) => {
    setMsgMenuKey(key);
    setMsgParams((p) => ({ ...p, page: { ...p.page, pageNo: 1 } }));
  }, []);

  const fetchTodo = useCallback(() => {
    if (!patchedTodoMeta) return;
    setTodoLoading(true);
    const filter = mergeFilter({}, todoParams.thConditions || []);
    const payload = {
      meta: { metaName: 'todoMessage' },
      page: todoParams.page,
      sorts: todoParams.sorts,
      filter,
      type: 'all',
      keyword: appliedKeyword,
    };
    if (todoMenuKey[1] !== '3') {
      payload.isRead = Number(todoMenuKey[1]);
    }
    dispatch({
      type: 'msgCenter/getUntreatedList',
      payload,
      fromPage: 'allUntreated',
      callback: (records, totalCount) => {
        setTodoRecords(records || []);
        setTodoTotalCount(totalCount ?? 0);
        setTodoLoading(false);
      },
    });
  }, [dispatch, patchedTodoMeta, todoParams, todoMenuKey, appliedKeyword]);

  const fetchMsg = useCallback(() => {
    if (!patchedMsgMeta) return;
    setMsgLoading(true);
    const filter = mergeFilter({}, msgParams.thConditions || []);
    const payload = {
      meta: { metaName: 'message' },
      page: msgParams.page,
      sorts: msgParams.sorts,
      filter,
      keyword: appliedKeyword,
    };
    if (msgMenuKey[1] !== '3') {
      payload.isRead = Number(msgMenuKey[1]);
    }
    dispatch({
      type: 'msgCenter/getMsgList',
      payload,
      callback: (records, totalCount) => {
        setMsgRecords(records || []);
        setMsgTotalCount(totalCount ?? 0);
        setMsgLoading(false);
      },
    });
  }, [dispatch, patchedMsgMeta, msgParams, msgMenuKey, appliedKeyword]);

  const todoTableChange = (key, next) => {
    setTodoParams((prev) => {
      if (key === 'page') return { ...prev, page: next };
      if (key === 'sorts') return { ...prev, sorts: next, page: { ...prev.page, pageNo: 1 } };
      if (key === 'thConditions') return { ...prev, thConditions: next, page: { ...prev.page, pageNo: 1 } };
      return prev;
    });
  };

  const msgTableChange = (key, next) => {
    setMsgParams((prev) => {
      if (key === 'page') return { ...prev, page: next };
      if (key === 'sorts') return { ...prev, sorts: next, page: { ...prev.page, pageNo: 1 } };
      if (key === 'thConditions') return { ...prev, thConditions: next, page: { ...prev.page, pageNo: 1 } };
      return prev;
    });
  };

  useEffect(() => {
    if (mainTab === 'todo' && patchedTodoMeta) fetchTodo();
  }, [todoParams, mainTab, patchedTodoMeta, fetchTodo]);

  useEffect(() => {
    if (mainTab === 'message' && patchedMsgMeta && showNotifyTab) fetchMsg();
  }, [msgParams, mainTab, patchedMsgMeta, fetchMsg, showNotifyTab]);

  const onTodoRow = (record) => ({
    onClick: () => {
      if (!tryOpenCreditFromMsg(record, navigate)) {
        // message.info(t('i18n_msg_center_no_detail_jump'));
      }
    },
  });

  const onMsgRow = (record) => ({
    onClick: () => {
      if (!tryOpenCreditFromMsg(record, navigate)) {
        // message.info(t('i18n_msg_center_no_detail_jump'));
      }
    },
  });

  const onMainTabChange = (key) => {
    setMainTab(key);
    dispatch({ type: 'msgCenter/refreshTotals' });
  };

  const wrapWithSider = (node, isMsg) => (
    <div className="ai-b-t-msg-content-wrap">
      <div className="ai-b-t-msg-sider-menu">
        <Menu
          mode="vertical"
          selectedKeys={[isMsg ? msgMenuKey : todoMenuKey]}
          items={isMsg ? siderItemsMsg : siderItemsTodo}
          onClick={({ key }) => (isMsg ? onMsgMenuClick(key) : onTodoMenuClick(key))}
        />
      </div>
      <div className="ai-b-t-msg-table-box">{node}</div>
    </div>
  );

  const tabItems = [
    {
      key: 'todo',
      label: <TabBadgeLabel text={t('i18n_52fdbbaeda4c9473')} count={todoTotal} />,
      children: patchedTodoMeta
        ? wrapWithSider(
            <BizList
              readOnly
              metaInfo={patchedTodoMeta}
              records={todoRecords}
              totalCount={todoTotalCount}
              params={todoParams}
              tableLoading={todoLoading}
              tableChange={todoTableChange}
              refresh={fetchTodo}
              onRow={onTodoRow}
              rowKey={(r) => r.code ?? r.id}
              renderCell={renderCellTodo}
            />,
            false
          )
        : null,
    },
  ];

  if (showNotifyTab) {
    tabItems.push({
      key: 'message',
      label: <TabBadgeLabel text={t('i18n_4b6ded8a7f181397')} count={unreadTotal} />,
      children: patchedMsgMeta
        ? wrapWithSider(
            <BizList
              readOnly
              metaInfo={patchedMsgMeta}
              records={msgRecords}
              totalCount={msgTotalCount}
              params={msgParams}
              tableLoading={msgLoading}
              tableChange={msgTableChange}
              refresh={fetchMsg}
              onRow={onMsgRow}
              rowKey={(r) => r.code ?? r.id}
              renderCell={renderCellMsg}
            />,
            true
          )
        : null,
    });
  }

  return (
    <div className="ai-b-t-msg-center-page">
      <PageHeader
        title={t('i18n_18b7db54924fbd90')}
        onSearch={handleSearchApply}
        searchPlaceholder={t('i18n_msg_center_search_ph')}
      />
      <div className="ai-b-t-msg-center-body">
        <Tabs
          activeKey={showNotifyTab ? mainTab : 'todo'}
          onChange={onMainTabChange}
          className="ai-b-t-msg-center-tabs"
          items={showNotifyTab ? tabItems : [tabItems[0]]}
        />
      </div>
    </div>
  );
}

export default MsgCenterIndex;


function collectNamesFromDynamicBiz(node, depth = 0) {
  if (depth > 8 || node == null) return [];
  if (typeof node === 'string') {
    try {
      return collectNamesFromDynamicBiz(JSON.parse(node), depth + 1);
    } catch {
      return [];
    }
  }
  if (Array.isArray(node)) {
    return node.flatMap((x) => collectNamesFromDynamicBiz(x, depth + 1));
  }
  if (typeof node === 'object') {
    const nm = node.name;
    if (nm != null && String(nm).trim() !== '') {
      return [String(nm)];
    }
    const containerKeys = ['list', 'data', 'records', 'items', 'rows', 'value', 'bizData'];
    for (const k of containerKeys) {
      if (node[k] != null) {
        const inner = collectNamesFromDynamicBiz(node[k], depth + 1);
        if (inner.length) return inner;
      }
    }
    const out = [];
    for (const v of Object.values(node)) {
      if (v && typeof v === 'object') {
        out.push(...collectNamesFromDynamicBiz(v, depth + 1));
      }
    }
    return out;
  }
  return [];
}

function formatDynamicBizDataCell(value) {
  if (value == null || value === '') return '--';
  let parsed = value;
  if (typeof value === 'string') {
    try {
      parsed = JSON.parse(value);
    } catch {
      return value;
    }
  }
  const names = collectNamesFromDynamicBiz(parsed);
  const uniq = [...new Set(names)];
  return uniq.length ? uniq.join(', ') : '--';
}

const menusUndo = [
  {
    key: 'g-undo',
    type: 'group',
    label: '',
    children: [
      { key: 't3', label: t('i18n_ae99f297e9f5c759') },
      { key: 't0', label: t('i18n_msg_center_filter_unread'), showBadge: 'todoTotal' },
      { key: 't1', label: t('i18n_msg_center_filter_read') },
    ],
  },
];

const menusMsg = [
  {
    key: 'g-msg',
    type: 'group',
    label: '',
    children: [
      { key: 'i3', label: t('i18n_ae99f297e9f5c759') },
      { key: 'i0', label: t('i18n_msg_center_filter_unread'), showBadge: 'unreadTotal' },
      { key: 'i1', label: t('i18n_msg_center_filter_read') },
    ],
  },
];

function menuItemsDef(isMsg, todoTotal, unreadTotal) {
  const raw = isMsg ? menusMsg : menusUndo;
  return raw.map((grp) => ({
    ...grp,
    label: grp.label ?? '',
    children: grp.children.map((menu) => {
      const count =
        menu.showBadge === 'todoTotal'
          ? todoTotal
          : menu.showBadge === 'unreadTotal'
            ? unreadTotal
            : 0;
      const labelNode =
        menu.showBadge && count > 0 ? (
          <span className="ai-b-t-msg-sider-badge-row">
            <span className="ai-b-t-msg-sider-badge-text">{menu.label}</span>
            <Badge overflowCount={999} offset={[5, 0]} count={count} />
          </span>
        ) : (
          menu.label
        );
      return { key: menu.key, label: labelNode };
    }),
  }));
}

function TabBadgeLabel({ text, count }) {
  return (
    <>
      {text}
      {count > 0 ? <Badge overflowCount={999} offset={[5, 0]} count={count} /> : null}
    </>
  );
}

const TODO_FIELD_ORDER = [
  'messageType',
  'subject',
  'informContent',
  'dynamicBizData',
  'fromUser',
  'createdOn',
  'informStatus',
];

const MESSAGE_FIELD_ORDER = ['messageType', 'title', 'content', 'createdOn', 'isRead'];

/**
 * @param {object|null} meta common/getMetaAllDetail 返回
 * @param {'todo'|'message'} mode
 */
function patchMsgCenterMeta(meta, mode) {
  if (!meta) return null;
  const order = mode === 'todo' ? TODO_FIELD_ORDER : MESSAGE_FIELD_ORDER;
  const names = new Set((meta.fieldList || []).map((f) => f?.name).filter(Boolean));
  const defaultFields = order.filter((n) => names.has(n));
  const prevLayout = meta.listLayout?.[0] || {};
  return {
    ...meta,
    listLayout: [{ ...prevLayout, defaultFields }],
  };
}
