import { APP_DEFAULT_ROUTE } from 'src/routes/appDefaultRoute';

/** 侧栏主导航（与 Figma 三项一致：选标 / 商务标 / 资信库）；图标为 aibid iconfont class（不含 iconfont 前缀） */
export const menuItems = [
  { key: 'aibidSelection', path: '/aibidSelection', menuIcon: 'icon-xuanbiao', labelKey: 'i18n_menu_tender' },
  {
    key: APP_DEFAULT_ROUTE.tabKey,
    path: APP_DEFAULT_ROUTE.path,
    menuIcon: 'icon-shangwubiao',
    labelKey: APP_DEFAULT_ROUTE.labelKey,
  },
  { key: 'credit', path: '/credit', menuIcon: 'icon-zixinku', labelKey: 'i18n_menu_credit' },
];

export function pathMatchesMenu(pathname, itemPath) {
  if (pathname === itemPath) return true;
  return pathname.startsWith(`${itemPath}/`);
}

/** 当前路径是否对应侧栏某一菜单项（含子路径，如 /aibidReview/xxx） */
export function pathnameMatchesMenuRoute(pathname) {
  if (!pathname) return false;
  return menuItems.some((m) => pathMatchesMenu(pathname, m.path));
}
