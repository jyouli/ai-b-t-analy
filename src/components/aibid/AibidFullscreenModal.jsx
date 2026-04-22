import React from 'react';
import { Modal } from 'antd';
import './AibidFullscreenModal.less';

/**
 * 详情内表格/区块全屏查看（与设计稿「表格放大」一致）
 */
export default function AibidFullscreenModal({ open, title, onCancel, children }) {
  return (
    <Modal
      open={open}
      title={title ?? ''}
      footer={null}
      onCancel={onCancel}
      width="100%"
      style={{ top: 0, paddingBottom: 0 }}
      styles={{ body: { height: 'calc(100vh - 55px)', overflow: 'auto', padding: 16 } }}
      className="aibid-fullscreen-modal"
      destroyOnClose
    >
      {children}
    </Modal>
  );
}
