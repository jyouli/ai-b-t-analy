import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { Layout, Spin } from 'antd';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import SiderMenu from './SiderMenu';
import TabsContainer from 'src/components/multipleTabs/TabsContainer';
import LoginModal from 'src/components/common/LoginModal/LoginModal';
import eventBus from 'src/utils/EventBus';
import { EventBusActions } from 'src/utils/EventBusActions';
import { isLoggedInLocally, setGlobalLoginModalOpen } from 'src/utils/login';
import { isGuestEntryPath } from 'src/utils/guestRoutes';
import { useDvaDispatch, useDvaSelector } from 'src/hooks/useDva';
import { shouldHideMenuForPath } from 'src/routes/routeConfig';
import { APP_DEFAULT_ROUTE } from 'src/routes/appDefaultRoute';
import { initEasemobPush, destroyEasemobPush } from 'src/routes/msgCenter/easemobPush';
import './BasicLayout.less';

const { Content } = Layout;

function BasicLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const dispatch = useDvaDispatch();
  const accountLogined = useDvaSelector((s) => s.account?.isLogined);
  const pathname = location.pathname;
  const hideSider = shouldHideMenuForPath(pathname);
  /** 未登录且当前路由非访客白名单时，不挂载子路由，避免详情页等抢先请求接口 */
  const allowOutlet = isLoggedInLocally() || isGuestEntryPath(pathname);

  // 默认收起以展示 Figma 设计的轨道导航
  const [collapsed, setCollapsed] = useState(true);
  const [loginVisible, setLoginVisible] = useState(false);

  useEffect(() => {
    const open = () => setLoginVisible(true);
    eventBus.add(EventBusActions.SHOW_LOGIN_MODAL, open);
    return () => eventBus.remove(EventBusActions.SHOW_LOGIN_MODAL, open);
  }, []);

  useEffect(() => {
    dispatch({ type: 'account/syncLoginState' });
  }, [dispatch]);

  useEffect(() => {
    const onVis = () => {
      if (document.visibilityState === 'visible') {
        dispatch({ type: 'account/syncLoginState' });
      }
    };
    document.addEventListener('visibilitychange', onVis);
    return () => document.removeEventListener('visibilitychange', onVis);
  }, [dispatch]);

  useEffect(() => {
    setGlobalLoginModalOpen(loginVisible);
  }, [loginVisible]);

  useEffect(() => {
    if (isLoggedInLocally()) return;
    if (isGuestEntryPath(pathname)) return;
    navigate(APP_DEFAULT_ROUTE.path, { replace: true });
  }, [pathname, navigate]);

  useEffect(() => {
    if (accountLogined) {
      dispatch({ type: 'account/fetchMainData' });
    }
  }, [dispatch, accountLogined]);

  useEffect(() => {
    if (!accountLogined) {
      destroyEasemobPush();
      return;
    }
    initEasemobPush({ navigate, dispatch });
    return () => destroyEasemobPush();
  }, [accountLogined, navigate, dispatch]);

  const handleCollapse = useCallback((val) => {
    setCollapsed(val);
  }, []);

  const tabsContent = useMemo(
    () => (
      <Content className={`ai-b-t-content${hideSider ? ' ai-b-t-content--fullscreen' : ''}`}>
        <TabsContainer>
          {allowOutlet ? (
            <Outlet />
          ) : (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                minHeight: 200,
                height: '100%',
              }}
            >
              <Spin size="large" />
            </div>
          )}
        </TabsContainer>
      </Content>
    ),
    [hideSider, allowOutlet]
  );

  return (
    <Layout className={`ai-b-t-layout${hideSider ? ' ai-b-t-layout--no-sider' : ''}`}>
      {!hideSider ? <SiderMenu collapsed={collapsed} onCollapse={handleCollapse} /> : null}
      <Layout className="ai-b-t-main-layout">
        {tabsContent}
      </Layout>
      <LoginModal
        visible={loginVisible}
        onClose={() => setLoginVisible(false)}
      />
    </Layout>
  );
}

export default BasicLayout;
