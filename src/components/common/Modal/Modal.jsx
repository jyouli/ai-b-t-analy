import React from 'react';
import classNames from 'classnames';
import { Modal as AntModal, ConfigProvider } from 'antd';
import zhCN from 'antd/locale/zh_CN';
import theme from 'src/config/theme';
import DraggableModal from './DraggableModal';

/**
 * 可拖动 Modal 包装器
 * @param {boolean} noDrag - 禁用拖动
 */
function Modal({ noDrag, modalRender, className, ...rest }) {
  const modalClassName = classNames('hc-modal', className);
  if (noDrag) {
    return (
      <ConfigProvider locale={zhCN} theme={theme}>
        <AntModal {...rest} className={modalClassName} />
      </ConfigProvider>
    );
  }
  return (
    <ConfigProvider locale={zhCN} theme={theme}>
      <AntModal
        {...rest}
        className={modalClassName}
        modalRender={
          modalRender ||
          ((modal) => <DraggableModal>{modal}</DraggableModal>)
        }
      />
    </ConfigProvider>
  );
}

export default Modal;
