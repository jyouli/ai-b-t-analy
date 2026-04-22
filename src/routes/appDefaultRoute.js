/**
 * 应用根路径重定向、未登录回落、多页签固定主 Tab。
 * 修改默认落地页时：与 `menuConfig` 中对应项的 path / key / labelKey 保持一致。
 */
export const APP_DEFAULT_ROUTE = {
  path: '/aibidReview',
  tabKey: 'aibidReview',
  labelKey: 'i18n_menu_business',
};

const DEFAULT_DETAIL_PATH_RE = new RegExp(
  `^${APP_DEFAULT_ROUTE.path.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}/([^/]+)$`,
);

/** 是否匹配「默认列表页」下的单层详情路径（如审标 /aibidReview/:code） */
export function matchAppDefaultListDetailPath(pathname) {
  return pathname.match(DEFAULT_DETAIL_PATH_RE);
}
