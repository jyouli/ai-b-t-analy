import { matchPath } from 'react-router-dom';
import { pathnameMatchesMenuRoute } from 'src/layouts/menuConfig';
import { routeConfig } from 'src/routes/routeConfig';

function normalizePathname(pathname) {
  if (!pathname || pathname === '/') return pathname || '/';
  return pathname.length > 1 && pathname.endsWith('/') ? pathname.slice(0, -1) : pathname;
}

/**
 * 是否为应用内已配置的路由（含 index `/`），否则视为 404 页
 */
export function matchesKnownAppRoute(pathname) {
  const p = normalizePathname(pathname);
  if (p === '/' || p === '') return true;
  for (const item of routeConfig) {
    if (item.index || !item.path) continue;
    const full = item.path.startsWith('/') ? item.path : `/${item.path}`;
    if (matchPath({ path: full, end: true }, p)) return true;
  }
  return false;
}

/**
 * 未登录时允许停留的路径（其余将重定向到 APP_DEFAULT_ROUTE.path，见 appDefaultRoute.js）：
 * — 侧栏三个菜单及其子路径（选标 / 商务标 / 资信库，与 menuConfig 一致）
 * — 未匹配 routeConfig 的地址走 404，仍允许停留
 * — /bizDetail/... 等不在三菜单下的路由需登录或会被拦回审标列表
 */
export function isGuestEntryPath(pathname) {
  const p = normalizePathname(pathname);
  if (!matchesKnownAppRoute(p)) return true;
  if (pathnameMatchesMenuRoute(p)) return true;
  return false;
}
