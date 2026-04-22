import { STORAGE_KEYS } from 'src/utils/constants';
import { APP_DEFAULT_ROUTE } from 'src/routes/appDefaultRoute';

const savedMode = localStorage.getItem(STORAGE_KEYS.MULTI_TAB_MODE) === 'true';

export default {
  namespace: 'multipleTabs',
  state: {
    tabsItems: [],
    activeTabKey: APP_DEFAULT_ROUTE.tabKey,
    isMultiTabMode: savedMode,
  },
  reducers: {
    setMultiTabMode(state, { payload }) {
      const isMultiTabMode = !!payload;
      localStorage.setItem(STORAGE_KEYS.MULTI_TAB_MODE, String(isMultiTabMode));
      return { ...state, isMultiTabMode };
    },
    addTab(state, { payload }) {
      const { key, label, path, tabInfo = {} } = payload;
      const exists = state.tabsItems.some((t) => t.key === key);
      if (exists) {
        return { ...state, activeTabKey: key };
      }
      const newTab = { key, label, path, tabInfo };
      return {
        ...state,
        tabsItems: [...state.tabsItems, newTab],
        activeTabKey: key,
      };
    },
    removeTab(state, { payload }) {
      const { tabKey } = payload;
      const items = state.tabsItems.filter((t) => t.key !== tabKey);
      const wasActive = state.activeTabKey === tabKey;
      const newActive = wasActive
        ? items.length > 0
          ? items[items.length - 1].key
          : APP_DEFAULT_ROUTE.tabKey
        : state.activeTabKey;
      return { ...state, tabsItems: items, activeTabKey: newActive };
    },
    removeOtherTabs(state, { payload }) {
      const { tabKey } = payload;
      const tab = state.tabsItems.find((t) => t.key === tabKey);
      return {
        ...state,
        tabsItems: tab ? [tab] : [],
        activeTabKey: tab?.key || APP_DEFAULT_ROUTE.tabKey,
      };
    },
    removeAllTabs(state) {
      return { ...state, tabsItems: [], activeTabKey: APP_DEFAULT_ROUTE.tabKey };
    },
    setActiveTab(state, { payload }) {
      return { ...state, activeTabKey: payload };
    },
  },
};
