import eventBus from 'src/utils/EventBus';

/**
 * 全站 eventBus 事件名集中定义，业务代码请勿硬编码字符串。
 * 新增事件时在此补充常量与注释。
 */
export const EventBusActions = {
  /** 打开登录弹窗（BasicLayout 订阅） */
  SHOW_LOGIN_MODAL: 'showLoginModal',

  /**
   * 审标详情 WPS：请求将匹配到的 Word 文档滚动到指定书签。
   * payload: { fieldName: 'tenderFile' | 'bidderFile', fileUrl: string, bookmarkName: string }
   */
  AIBID_WPS_GOTO_BOOKMARK: 'aibidReview/wps/gotoBookmark',
};

/**
 * 审标详情：广播「跳转到书签」
 * @param {{ fieldName: string, fileUrl: string, bookmarkName: string }} payload
 */
export function emitAibidWpsGotoBookmark(payload) {
  eventBus.emit(EventBusActions.AIBID_WPS_GOTO_BOOKMARK, payload);
}
