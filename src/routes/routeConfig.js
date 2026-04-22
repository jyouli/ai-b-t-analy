import React from 'react';
import { Navigate, matchPath } from 'react-router-dom';
import { APP_DEFAULT_ROUTE } from 'src/routes/appDefaultRoute';

/**
 * 应用路由表（path 相对于 "/"）
 * hideMenu: 为 true 时 BasicLayout 不渲染左侧菜单（全屏内容区）
 */
export const routeConfig = [
  { index: true, element: <Navigate to={APP_DEFAULT_ROUTE.path} replace />},
  // 选标列表
  { path: 'aibidSelection', component: () => import('./aibidSelection/Index') },
  // 选标详情（:code 为选标记录编码）
  { path: 'aibidSelection/:code', component: () => import('./aibidSelection/Detail'), hideMenu: true },
  // 商务标审标
  { path: 'aibidReview', component: () => import('./aibidReview/Index') },
  // 审标分析结果界面，全屏（:code 为审标记录编码 reviewCode）
  { path: 'aibidReview/:code', component: () => import('./aibidReview/Detail'), hideMenu: true },
  // 授信分析结果界面
  { path: 'credit', component: () => import('./credit/Index') },
  { path: 'bizDetail', component: () => import('src/components/bizView/bizDetail/Index') },
  // 消息中心（全部消息）
  { path: 'msgCenter', component: () => import('./msgCenter/Index') },
];

/**
 * @param {string} pathname 如 /aibidReview/100001
 * @returns {boolean} 是否隐藏侧栏
 */
export function shouldHideMenuForPath(pathname) {
  for (const item of routeConfig) {
    if (item.index || !item.path) continue;
    const fullPath = item.path.startsWith('/') ? item.path : `/${item.path}`;
    if (matchPath({ path: fullPath, end: true }, pathname)) {
      return Boolean(item.hideMenu);
    }
  }
  return false;
}
