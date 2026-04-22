import React from 'react';
import { createRoot } from 'react-dom/client';
import { createBrowserHistory } from 'history';
import dva from 'dva';
import createLoading from 'dva-loading';
import './initTool';
import models from './models/index';
import AppRoutes from './routes';
import { renderWithQiankun, qiankunWindow } from 'vite-plugin-qiankun/dist/helper';
import { ConfigProvider, App as AntdApp } from 'antd';
import zhCN from 'antd/locale/zh_CN';
import { MicroAppContext } from './components/multipleTabs/connect';
import eventBus from './utils/EventBus';
import theme from './config/theme';
import { registerDvaApp } from './utils/dvaRuntime';
import { installWindowLoginApi } from './utils/login';
import './index.less';
import './components/common/Modal/Modal.less';
import './components/common/Modal/confirmModal.less';

// 独立运行时用子应用 eventBus，接入 qiankun 时用主应用传入的 eventBus
window.hc_eventBus = eventBus;
installWindowLoginApi();

const history = createBrowserHistory();
const app = dva({
  history,
  onError(err) {
    console.error(err);
  },
});

app.use(createLoading());
models.forEach((m) => app.model(m));

app.router(() => (
  <ConfigProvider
    locale={zhCN}
    theme={theme}
  >
    <AntdApp>
      <AppRoutes />
    </AntdApp>
  </ConfigProvider>
));

function getRootElement(props = {}) {
  if (props.container) return props.container.querySelector('#root');
  return document.querySelector('#root');
}

let root = null;

function render(props = {}) {
  const rootEl = getRootElement(props);
  if (!rootEl) return;
  rootEl.setAttribute('data-powered-by-qiankun', String(!!qiankunWindow.__POWERED_BY_QIANKUN__));
  // 接入 qiankun 时使用主应用传入的 eventBus，实现跨应用通信
  if (props.eventBus) {
    window.hc_eventBus = props.eventBus;
  }
  const RootApp = app.start();
  registerDvaApp(app);
  const content = (
    <MicroAppContext.Provider value={props}>
      <RootApp />
    </MicroAppContext.Provider>
  );
  
  if (!root) {
    root = createRoot(rootEl);
  }
  root.render(content);
}

const initQiankun = () => {
  renderWithQiankun({
    mount(props) {
      render(props);
    },
    bootstrap() {},
    unmount(props) {
      if (root) {
        root.unmount();
        root = null;
      }
    },
  });
};

if (!qiankunWindow.__POWERED_BY_QIANKUN__) {
  render({});
} else {
  initQiankun();
}
