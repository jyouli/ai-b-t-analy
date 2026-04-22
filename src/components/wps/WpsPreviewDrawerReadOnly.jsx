import React, { Component } from 'react';
import { Drawer, Button, message, Spin } from 'antd';
import { connect } from 'dva';
import { getFileType, getUrlParam } from 'src/utils/FileTool';
import { t } from 'src/utils/i18n';
import './WpsPreviewDrawer.less';

import WebOfficeSDK from 'src/assets/js/web-office-sdk-solution-v2.0.4.es.js';

/** 解析 WPS JSSDK 中可能返回的 Promise 或带 .done() 的对象 */
function awaitSdk(value) {
  if (value == null) return Promise.resolve(value);
  if (typeof value.then === 'function') return Promise.resolve(value);
  if (typeof value.done === 'function') return Promise.resolve(value.done());
  return Promise.resolve(value);
}

class WpsPreviewDrawerReadOnly extends Component {
  constructor(props) {
    super(props);
    this.state = { visible: false, wpsUrl: null, show: false, pdfRotate: 0, signing: false };
    this.editWps = null;
    this.wpsBox = null;
    /** 文档是否已完成 fileOpen + ready（用于书签跳转前等待） */
    this._documentReady = false;
    props.onRef?.(this);
  }

  getSignaturePayload = () => {
    const payload = getUrlParam({ ...this.props, fileVersion: null }, false, false);
    payload.readOnly = 1;
    // operateMode 为 2 跳过是否开通wps的校验
    payload.operateMode = 1;
    return payload;
  };

  /** 内嵌模式：拉签名并展示在容器内（不打开 Drawer） */
  loadEmbedded = () => {
    const { item, dispatch } = this.props;
    if (!getFileType(item)) return;
    this.setState({ signing: true });
    dispatch({
      type: 'fileList/signatureUrl',
      payload: this.getSignaturePayload(),
      callback: (data) => {
        if (!data) {
          message.warning(t('i18n_request_failed'));
          this.setState({ signing: false });
          return;
        }
        this.setState({ visible: false, wpsUrl: data, show: true, signing: false });
      },
    });
  };

  openDrawer = () => {
    const { item, dispatch } = this.props;
    if (!getFileType(item)) return;
    dispatch({
      type: 'fileList/signatureUrl',
      payload: this.getSignaturePayload(),
      callback: (data) => {
        this.setState({ visible: true, wpsUrl: data, show: true });
      },
    });
  };

  componentDidMount() {
    if (this.props.embedded && this.props.item) {
      this.loadEmbedded();
    }
  }

  onClose = () => {
    this._documentReady = false;
    if (this.wpsBox) {
      try {
        this.wpsBox.destroy?.();
      } catch (e) {}
      this.wpsBox = null;
    }
    this.setState({ visible: false, wpsUrl: null, show: false });
  };

  /** 等待文档打开并完成 SDK ready（轮询 _documentReady，超时返回 false） */
  waitUntilDocumentReady = async (timeoutMs = 120000) => {
    const t0 = Date.now();
    while (Date.now() - t0 < timeoutMs) {
      if (this._documentReady) return true;
      await new Promise((r) => setTimeout(r, 100));
    }
    return false;
  };

  /**
   * 跳转到 Word 书签（仅 officeType=w）。失败返回 false。
   * @param {string} bookmarkName
   */
  goToBookmark = async (bookmarkName) => {
    if (!bookmarkName || !this.wpsBox) return false;
    if (getFileType(this.props.item) !== 'w') return false;
    try {
      await this.wpsBox.ready();
      const app = this.wpsBox.Application;
      const doc = await awaitSdk(app.ActiveDocument);
      const bookmarks = doc.Bookmarks;
      if (!bookmarks || typeof bookmarks.Item !== 'function') return false;
      let bm;
      try {
        bm = await awaitSdk(bookmarks.Item(bookmarkName));
      } catch (_) {
        return false;
      }
      if (!bm) return false;
      const range = await awaitSdk(bm.Range);
      if (!range) return false;
      if (typeof range.Select === 'function') {
        await awaitSdk(range.Select());
      }
      return true;
    } catch (e) {
      console.warn('[WpsPreviewDrawerReadOnly] goToBookmark', e);
    }
    return false;
  };

  /** 先等到文档就绪再跳转书签（供外部 eventBus 等调用） */
  gotoBookmarkWhenReady = async (bookmarkName) => {
    const ok = await this.waitUntilDocumentReady();
    if (!ok) return false;
    return this.goToBookmark(bookmarkName);
  };

  initWps = () => {
    if (!WebOfficeSDK || !this.state.wpsUrl || !this.editWps) return;
    const { wpsUrl } = this.state;
    const { item, auth } = this.props;
    const officeType = getFileType(item);
    const accessToken = auth?.accessToken || JSON.parse(localStorage.getItem('auth') || '{}').accessToken;
    const config = {
      mount: this.editWps,
      officeType,
      appId: wpsUrl._w_appid,
      fileId: wpsUrl._w_fileid,
      mode: 'simple',
      token: accessToken,
      customArgs: wpsUrl,
    };
    this._documentReady = false;
    this.wpsBox = WebOfficeSDK.init(config);
    this.wpsBox.on?.('fileOpen', () => {
      this.wpsBox.ready?.().then(() => {
        this._documentReady = true;
        if (this.wpsBox?.Application?.ActivePDF) {
          this.wpsBox.Application.ActivePDF.RotatePage(this.state.pdfRotate || 0);
        }
      });
    });
  };

  componentDidUpdate(prevProps, prevState) {
    const { embedded } = this.props;
    const openedForInit = embedded
      ? this.state.wpsUrl && this.state.show && !prevState.show
      : this.state.visible && this.state.wpsUrl && this.state.show && !prevState.show;
    if (openedForInit) {
      setTimeout(() => this.initWps(), 100);
    }
  }

  componentWillUnmount() {
    if (this.wpsBox) {
      try {
        this.wpsBox.destroy?.();
      } catch (e) {}
    }
  }

  print = () => {
    if (this.wpsBox?.executeCommandBar) {
      this.wpsBox.executeCommandBar('TabPrintPreview');
    }
  };

  handleLeftRotate = () => {
    if (!this.wpsBox?.Application?.ActivePDF) return;
    const rotate = (this.state.pdfRotate || 0) === 0 ? 270 : this.state.pdfRotate - 90;
    this.wpsBox.Application.ActivePDF.RotatePage(rotate);
    this.setState({ pdfRotate: rotate });
  };

  handleRightRotate = () => {
    if (!this.wpsBox?.Application?.ActivePDF) return;
    const rotate = this.state.pdfRotate === 270 ? 0 : (this.state.pdfRotate || 0) + 90;
    this.wpsBox.Application.ActivePDF.RotatePage(rotate);
    this.setState({ pdfRotate: rotate });
  };

  render() {
    const { visible, show, signing } = this.state;
    const { item, embedded, embeddedClassName, embeddedMountStyle } = this.props;
    const fileType = getFileType(item);
    const isPdf = fileType === 'f';

    if (!WebOfficeSDK) {
      return null;
    }

    if (embedded) {
      return (
        <div className={`wps-preview-embed ${embeddedClassName || ''}`.trim()}>
          {signing ? (
            <div className="wps-preview-embed__mask">
              <Spin size="large" />
            </div>
          ) : null}
          {show ? (
            <div
              ref={(r) => (this.editWps = r)}
              className="wps-content wps-preview-embed__mount"
              style={{
                height: '100%',
                minHeight: 400,
                ...(embeddedMountStyle || {}),
              }}
            />
          ) : null}
        </div>
      );
    }

    return (
      <Drawer
        title={item?.name || t('i18n_view')}
        placement="right"
        width={typeof window !== 'undefined' ? window.innerWidth - 150 : '90%'}
        open={visible}
        onClose={this.onClose}
        maskClosable={false}
        extra={
          <div style={{ display: 'flex', gap: 8 }}>
            <Button size="small" onClick={this.print}>
              {t('i18n_print')}
            </Button>
            {isPdf && (
              <>
                <Button size="small" onClick={this.handleLeftRotate}>
                  {t('i18n_rotate_left')}
                </Button>
                <Button size="small" onClick={this.handleRightRotate}>
                  {t('i18n_rotate_right')}
                </Button>
              </>
            )}
          </div>
        }
      >
        {show && (
          <div
            ref={(r) => (this.editWps = r)}
            className="wps-content"
            style={{
              height: typeof window !== 'undefined' ? window.innerHeight - 120 : 600,
            }}
          />
        )}
      </Drawer>
    );
  }
}

export default connect((state) => ({
  auth: { accessToken: JSON.parse(localStorage.getItem('auth') || '{}').accessToken },
}))(WpsPreviewDrawerReadOnly);
