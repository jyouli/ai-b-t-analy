import React, { useCallback, useMemo, useState } from 'react';
import { Layout, Avatar, Badge, Popover, Tooltip } from 'antd';
import { connect } from 'dva';
import { useNavigate, useLocation } from 'react-router-dom';
import { t } from 'src/utils/i18n';
import { menuItems, pathMatchesMenu, pathnameMatchesMenuRoute } from './menuConfig';
import SettingsPopover from 'src/components/common/SettingsPopover/SettingsPopover';
import { showLogin, clearAppSession } from 'src/utils/login';
import { getManageConsoleHref, shouldShowManageConsoleButton } from 'src/utils/login';
import classNames from 'classnames';
import MsgRightSider from 'src/routes/msgCenter/MsgRightSider';
import { APP_DEFAULT_ROUTE } from 'src/routes/appDefaultRoute';
import './BasicLayout.less';

const { Sider } = Layout;

function SiderMenu({
  collapsed,
  onCollapse,
  currentAccount,
  dispatch,
  isMultiTabMode,
  isLogined,
  authList,
  msgAllTotal,
}) {
  const [msgSiderOpen, setMsgSiderOpen] = useState(false);
  const handleExpand = (e) => {
    e?.stopPropagation?.();
    onCollapse?.(false);
  };
  const handleCollapse = (e) => {
    e?.stopPropagation?.();
    onCollapse?.(true);
  };
  const navigate = useNavigate();
  const location = useLocation();
  const selectedKey = menuItems.find((m) => pathMatchesMenu(location.pathname, m.path))?.key;

  const handleGoHome = () => {
    if (isMultiTabMode) {
      dispatch({ type: 'multipleTabs/setActiveTab', payload: APP_DEFAULT_ROUTE.tabKey });
    }
    navigate(APP_DEFAULT_ROUTE.path);
  };

  const handleCollapsedLogoClick = (e) => {
    e?.preventDefault?.();
    e?.stopPropagation?.();
    handleExpand(e);
  };

  const handleMenuClick = (key) => {
    const item = menuItems.find((m) => m.key === key);
    if (!item) return;
    if (isMultiTabMode) {
      if (item.key === APP_DEFAULT_ROUTE.tabKey) {
        dispatch({ type: 'multipleTabs/setActiveTab', payload: APP_DEFAULT_ROUTE.tabKey });
      } else {
        dispatch({
          type: 'multipleTabs/addTab',
          payload: { key: item.key, path: item.path, label: t(item.labelKey) },
        });
      }
      navigate(item.path);
    } else {
      navigate(item.path);
    }
  };

  const handleMsgBellClick = () => {
    if (!isLogined) {
      showLogin();
      return;
    }
    setMsgSiderOpen((v) => !v);
  };

  const handleLogout = useCallback(() => {
    clearAppSession(dispatch);
    if (!pathnameMatchesMenuRoute(location.pathname)) {
      navigate(APP_DEFAULT_ROUTE.path, { replace: true });
    }
  }, [dispatch, navigate, location.pathname]);

  const logoutPopoverContent = (
    <div
      className="ai-b-t-logout-popover-item"
      role="button"
      tabIndex={0}
      onClick={(e) => {
        e.stopPropagation();
        handleLogout();
      }}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          handleLogout();
        }
      }}
    >
      {t('i18n_logout')}
    </div>
  );

  const logoutPopoverProps = {
    placement: 'top',
    trigger: 'hover',
    mouseEnterDelay: 0.2,
    mouseLeaveDelay: 0.15,
    overlayClassName: 'ai-b-t-logout-popover-overlay',
    content: logoutPopoverContent,
  };

  const showManageConsole = useMemo(
    () => shouldShowManageConsoleButton(isLogined, authList),
    [isLogined, authList]
  );
  const manageConsoleHref = useMemo(() => getManageConsoleHref(), []);

  const renderCollapsedRail = () => (
    <div className="ai-b-t-rail">
      <button
        type="button"
        className="ai-b-t-rail-logo"
        onClick={handleCollapsedLogoClick}
        title={t('i18n_expand_menu')}
      >
        <img src="/assets/images/logo.png" alt="" className="ai-b-t-rail-logo-img" />
        <span className="ai-b-t-rail-logo-expand" aria-hidden>
          <i className="iconfont icon-daohangshouqizhankai ai-b-t-rail-logo-expand-icon" />
        </span>
      </button>

      <div className="ai-b-t-rail-nav">
        {menuItems.map((item) => {
          const isActive = selectedKey === item.key;
          return (
            <div
              key={item.key}
              className={classNames('ai-b-t-rail-nav-item', { active: isActive })}
              onClick={() => handleMenuClick(item.key)}
              role="presentation"
            >
              <i className={classNames('iconfont', item.menuIcon, 'ai-b-t-menu-icon')} aria-hidden />
            </div>
          );
        })}
      </div>

      <div className="ai-b-t-rail-footer">
        <div
          className="ai-b-t-rail-icon-wrap"
          title={t('i18n_messages')}
          role="presentation"
          onClick={handleMsgBellClick}
        >
          <Badge count={isLogined ? msgAllTotal : 0} overflowCount={99} className="ai-b-t-msg-badge">
            <span className="ai-b-t-bell-anchor">
              <i className="iconfont icon-xiaoxitongzhi ai-b-t-action-icon" aria-hidden />
            </span>
          </Badge>
        </div>
        {isLogined ? (
          <SettingsPopover onOpenLogin={showLogin}>
            <div className="ai-b-t-rail-icon-wrap" title={t('i18n_settings')}>
              <i className="iconfont icon-shezhi ai-b-t-action-icon" aria-hidden />
            </div>
          </SettingsPopover>
        ) : null}
        {showManageConsole ? (
          <Tooltip title={t('i18n_manage_console')} placement="right">
            <a
              href={manageConsoleHref}
              target="_blank"
              rel="noopener noreferrer"
              className="ai-b-t-rail-icon-wrap"
              onClick={(e) => e.stopPropagation()}
            >
              <i className="iconfont icon-shezhi ai-b-t-action-icon" aria-hidden />
            </a>
          </Tooltip>
        ) : null}
        <div className="ai-b-t-rail-avatar">
          {!isLogined ? (
            <button
              type="button"
              className="ai-b-t-rail-avatar-hit"
              onClick={() => showLogin()}
              title={t('i18n_login')}
            >
              <Avatar size={24} className="ai-b-t-rail-avatar-inner" icon={<i className="icon-weidenglu" />} />
            </button>
          ) : (
            <Popover {...logoutPopoverProps}>
              <div className="ai-b-t-rail-avatar-hit" role="presentation">
                <Avatar size={24} className="ai-b-t-rail-avatar-inner" src={currentAccount?.avatar}>
                  {(currentAccount?.name || '伊').charAt(0)}
                </Avatar>
              </div>
            </Popover>
          )}
        </div>
      </div>
    </div>
  );

  const renderExpandedMenu = () => (
    <>
      <div className="ai-b-t-logo">
        <div className="logo-brand" onClick={handleGoHome} role="button" tabIndex={0} onKeyDown={(e) => e.key === 'Enter' && handleGoHome()}>
          <img src="/assets/images/logo.png" alt="" className="logo-icon" />
          <span className="logo-text">{t('i18n_app_name')}</span>
        </div>
        <button type="button" className="ai-b-t-logo-collapse" onClick={handleCollapse} title={t('i18n_collapse_menu')}>
          <i className="iconfont icon-daohangshouqizhankai ai-b-t-collapse-icon" aria-hidden />
        </button>
      </div>
      <div className="ai-b-t-menu-wrap">
        <div className="ai-b-t-menu-list">
          {menuItems.map((item) => {
            const isActive = selectedKey === item.key;
            return (
              <div
                key={item.key}
                className={classNames('ai-b-t-menu-item', { active: isActive })}
                onClick={() => handleMenuClick(item.key)}
                role="presentation"
              >
                <i className={classNames('iconfont', item.menuIcon, 'ai-b-t-menu-icon')} aria-hidden />
                <span className="ai-b-t-menu-item-label">{t(item.labelKey)}</span>
              </div>
            );
          })}
        </div>
      </div>
      <div className="ai-b-t-user-area">
        {!isLogined ? (
          <div
            className="ai-b-t-user-profile ai-b-t-user-profile--clickable"
            role="button"
            tabIndex={0}
            onClick={() => showLogin()}
          >
            <Avatar size={24} className="user-avatar" icon={<i className="icon-weidenglu" />} />
            <span className="user-name">{t('i18n_login')}</span>
          </div>
        ) : (
          <Popover {...logoutPopoverProps}>
            <div className="ai-b-t-user-profile ai-b-t-user-profile--trigger" role="presentation">
              <Avatar size={24} className="user-avatar" src={currentAccount?.avatar}>
                {(currentAccount?.name || '用户').charAt(0)}
              </Avatar>
              <span className="user-name">{currentAccount?.name || '用户'}</span>
            </div>
          </Popover>
        )}
        <div className="ai-b-t-user-actions">
          <div
            className="ai-b-t-user-icon-btn"
            title={t('i18n_messages')}
            role="presentation"
            onClick={handleMsgBellClick}
          >
            <Badge count={isLogined ? msgAllTotal : 0} overflowCount={99} className="ai-b-t-msg-badge">
              <span className="ai-b-t-bell-anchor">
                <i className="iconfont icon-xiaoxitongzhi ai-b-t-action-icon" aria-hidden />
              </span>
            </Badge>
          </div>
          {/* {isLogined ? (
            <SettingsPopover onOpenLogin={showLogin}>
              <div className="ai-b-t-user-icon-btn settings-trigger" title={t('i18n_settings')}>
                <i className="iconfont icon-shezhi ai-b-t-action-icon" aria-hidden />
              </div>
            </SettingsPopover>
          ) : null} */}
          {showManageConsole ? (
            <Tooltip title={t('i18n_manage_console')} placement="top">
              <a
                href={manageConsoleHref}
                target="_blank"
                rel="noopener noreferrer"
                className="ai-b-t-user-icon-btn settings-trigger"
              >
                <i className="iconfont icon-shezhi ai-b-t-action-icon" aria-hidden />
              </a>
            </Tooltip>
          ) : null}
        </div>
      </div>
    </>
  );

  return (
    <>
      <MsgRightSider visible={msgSiderOpen} onClose={() => setMsgSiderOpen(false)} />
      <Sider
        collapsible
        collapsed={collapsed}
        onCollapse={onCollapse}
        trigger={null}
        width={260}
        collapsedWidth={64}
        theme="light"
        className="ai-b-t-sider"
      >
        <div className="ai-b-t-sider-inner">{collapsed ? renderCollapsedRail() : renderExpandedMenu()}</div>
      </Sider>
    </>
  );
}

function mapMyToAccount(my) {
  if (!my || !(my.uid || my.code)) return null;
  return {
    id: my.uid || my.code,
    name: my.name || my.empName || my.code || '用户',
    avatar: my.avatar || my.photoUrl || '',
  };
}

export default connect((state) => {
  const logined = state.account?.isLogined;
  const fromMy = mapMyToAccount(state.account?.my);
  return {
    isLogined: logined,
    authList: state.account?.authList ?? null,
    currentAccount: fromMy || (logined ? state.global?.currentAccount : null),
    isMultiTabMode: state.multipleTabs?.isMultiTabMode,
    msgAllTotal: state.msgCenter?.allTotal ?? 0,
  };
})(SiderMenu);
