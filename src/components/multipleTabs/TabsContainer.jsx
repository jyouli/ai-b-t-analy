import React, { useEffect } from 'react';
import { Tabs } from 'antd';
import { useNavigate, useLocation } from 'react-router-dom';
import { t } from 'src/utils/i18n';
import { useDvaDispatch, useDvaSelector } from 'src/hooks/useDva';
import { menuItems } from 'src/layouts/menuConfig';
import { APP_DEFAULT_ROUTE, matchAppDefaultListDetailPath } from 'src/routes/appDefaultRoute';
import './TabsContainer.less';

function pathMatchesMenuRoute(path, itemPath) {
  if (path === itemPath) return true;
  return path.startsWith(`${itemPath}/`);
}

function TabsContainer({ children }) {
  const dispatch = useDvaDispatch();
  const tabsItems = useDvaSelector((s) => s.multipleTabs?.tabsItems || []);
  const activeTabKey = useDvaSelector((s) => s.multipleTabs?.activeTabKey || APP_DEFAULT_ROUTE.tabKey);
  const isMultiTabMode = useDvaSelector((s) => s.multipleTabs?.isMultiTabMode);
  const navigate = useNavigate();
  const location = useLocation();

  // 多页签下根据路由同步页签
  useEffect(() => {
    if (!isMultiTabMode) return;
    const path = location.pathname;
    if (path === '/' || path === APP_DEFAULT_ROUTE.path) {
      dispatch({ type: 'multipleTabs/setActiveTab', payload: APP_DEFAULT_ROUTE.tabKey });
      return;
    }
    // 默认列表下的详情（如审标 /aibidReview/:code）
    const detailMatch = matchAppDefaultListDetailPath(path);
    if (detailMatch) {
      const reviewCode = detailMatch[1];
      dispatch({
        type: 'multipleTabs/addTab',
        payload: {
          key: `detail_${reviewCode}`,
          path,
          label: `${t('i18n_view')}-${reviewCode}`,
          tabInfo: { code: reviewCode },
        },
      });
      return;
    }
    // 选标详情：/aibidSelection/:code
    const selectionDetailMatch = path.match(/^\/aibidSelection\/([^/]+)$/);
    if (selectionDetailMatch) {
      const selectionCode = selectionDetailMatch[1];
      dispatch({
        type: 'multipleTabs/addTab',
        payload: {
          key: `selection_${selectionCode}`,
          path,
          label: `${t('i18n_view')}-${selectionCode}`,
          tabInfo: { code: selectionCode },
        },
      });
      return;
    }
    const menuItem = menuItems.find((m) => pathMatchesMenuRoute(path, m.path));
    if (menuItem) {
      dispatch({
        type: 'multipleTabs/addTab',
        payload: { key: menuItem.key, path: menuItem.path, label: t(menuItem.labelKey) },
      });
    }
  }, [location.pathname, isMultiTabMode, dispatch]);

  if (!isMultiTabMode) {
    return <div style={{ flex: 1, overflow: 'auto', display: 'flex', flexDirection: 'column' }}>{children}</div>;
  }

  const pinnedTab = {
    key: APP_DEFAULT_ROUTE.tabKey,
    label: t(APP_DEFAULT_ROUTE.labelKey),
    path: APP_DEFAULT_ROUTE.path,
  };
  const allTabs = [pinnedTab, ...tabsItems.filter((t) => t.key !== APP_DEFAULT_ROUTE.tabKey)];

  const handleTabChange = (key) => {
    dispatch({ type: 'multipleTabs/setActiveTab', payload: key });
    const tab = allTabs.find((t) => t.key === key);
    if (tab?.path) navigate(tab.path);
  };

  const handleTabEdit = (targetKey, action) => {
    if (action === 'remove' && targetKey !== APP_DEFAULT_ROUTE.tabKey) {
      const tab = tabsItems.find((t) => t.key === targetKey);
      dispatch({ type: 'multipleTabs/removeTab', payload: { tabKey: targetKey } });
      if (activeTabKey === targetKey) {
        const remaining = tabsItems.filter((t) => t.key !== targetKey);
        const nextActive = remaining.length > 0 ? remaining[remaining.length - 1] : null;
        navigate(nextActive?.path || APP_DEFAULT_ROUTE.path);
        dispatch({ type: 'multipleTabs/setActiveTab', payload: nextActive?.key || APP_DEFAULT_ROUTE.tabKey });
      }
    }
  };

  return (
    <div className="tabs-container-bookmark">
      <Tabs
        type="editable-card"
        hideAdd
        activeKey={activeTabKey}
        onChange={handleTabChange}
        onEdit={handleTabEdit}
        items={allTabs.map((tab) => ({
          key: tab.key,
          label: tab.label,
          closable: tab.key !== APP_DEFAULT_ROUTE.tabKey,
        }))}
      />
      <div className="tabs-content-wrap">{children}</div>
    </div>
  );
}

export default TabsContainer;
