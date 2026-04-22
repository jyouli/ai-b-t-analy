import React from 'react';
import ReactDOM from 'react-dom';
import { Button } from 'antd';
import { t } from 'src/utils/i18n';
import Modal from './Modal';
import './confirmModal.less';

/**
 * 确认弹窗（可拖动）
 * @param {Object} config
 * @param {string|false} config.title - 标题，false 隐藏
 * @param {string} config.subTitle - 副标题
 * @param {ReactNode} config.content - 内容
 * @param {string} config.okText - 确定按钮文案
 * @param {string} config.cancelText - 取消按钮文案
 * @param {boolean} config.maskClosable - 点击遮罩关闭
 * @param {number} config.width - 宽度
 * @param {boolean} config.hiddenFooter - 隐藏底部
 * @param {Function} config.onOk - 确定回调
 * @param {Function} config.onCancel - 取消回调
 * @param {boolean} [config.noDrag] - 禁用拖动，透传内部 Modal
 * @param {boolean} [config.showCancel=true] - 为 false 时仅显示确定按钮（与 Ant Design Modal 默认双按钮区分）
 * @returns {{ destroy: Function }}
 */
export function confirmModal(config) {
  const div = document.createElement('div');
  document.body.appendChild(div);

  const hideModal = () => {
    ReactDOM.unmountComponentAtNode(div);
    div.parentNode?.removeChild(div);
  };

  const onCancel = (e) => {
    hideModal();
    config.onCancel?.(e);
  };

  const onOk = () => {
    hideModal();
    config.onOk?.();
  };

  const props = {
    title: config.title === false ? null : (config.title || t('i18n_tip')),
    open: true,
    maskClosable: config.maskClosable ?? false,
    centered: true,
    width: config.width ?? 500,
    okText: config.okText || t('i18n_confirm'),
    cancelText: config.cancelText || t('i18n_cancel'),
    onCancel,
    onOk,
    wrapClassName: `common-confirm-modal ${config.className || ''}`,
    cancelButtonProps: config.cancelButtonProps,
    okButtonProps: config.okButtonProps,
    ...(config.hiddenFooter
      ? { footer: null }
      : config.showCancel === false
        ? {
            footer: (_, { OkBtn }) => <OkBtn />,
          }
        : {}),
    ...(config.noDrag ? { noDrag: true } : {}),
  };
  if (config.zIndex) props.zIndex = config.zIndex;

  ReactDOM.render(
    <Modal {...props}>
      {config.subTitle ? (
        <div className="modal-sub-title">{config.subTitle}</div>
      ) : null}
      <div className="modal-text">{config.content || t('i18n_confirm_content')}</div>
    </Modal>,
    div
  );

  return { destroy: hideModal };
}

/**
 * 警告/提示弹窗（可拖动，仅确定按钮）
 * @param {Object} config
 * @param {ReactNode} config.content - 内容
 * @param {string} config.okText - 确定按钮文案
 * @param {Function} config.onOk - 确定回调
 * @param {Function} config.onCancel - 关闭回调（点击遮罩等）
 * @returns {{ destroy: Function }}
 */
export function warningModal(config) {
  const div = document.createElement('div');
  document.body.appendChild(div);

  const hideModal = () => {
    ReactDOM.unmountComponentAtNode(div);
    div.parentNode?.removeChild(div);
  };

  const clickOK = () => {
    hideModal();
    config.onOk?.();
  };

  const props = {
    title: t('i18n_tip'),
    footer:
      config.footer === null
        ? null
        : [
            <Button key="submit" type="primary" onClick={clickOK}>
              {config.okText || t('i18n_confirm')}
            </Button>,
          ],
    wrapClassName: 'common-warning-modal',
    open: true,
    width: config.width ?? 500,
    centered: true,
    maskClosable: false,
    ...config,
    onCancel: () => {
      config?.onCancel?.();
      hideModal();
    },
  };

  ReactDOM.render(
    <Modal {...props}>
      <span className="modal-text">{config.content ?? null}</span>
    </Modal>,
    div
  );

  return { destroy: hideModal };
}

/**
 * 信息弹窗（可拖动，仅确定按钮）
 * @param {Object} config
 * @param {ReactNode} config.content - 内容
 * @param {string} config.okText - 确定按钮文案
 * @param {string} config.confirmType - 按钮类型 primary | default
 * @param {Function} config.onOk - 确定回调
 * @param {Function} config.onCancel - 关闭回调
 * @returns {{ destroy: Function }}
 */
export function infoModal(config) {
  const div = document.createElement('div');
  document.body.appendChild(div);

  const hideModal = () => {
    ReactDOM.unmountComponentAtNode(div);
    div.parentNode?.removeChild(div);
  };

  const clickOK = () => {
    hideModal();
    config.onOk?.();
  };

  const props = {
    title: t('i18n_tip'),
    footer: [
      <Button
        key="submit"
        type={config.confirmType || 'primary'}
        onClick={clickOK}
      >
        {config.okText || t('i18n_confirm')}
      </Button>,
    ],
    wrapClassName: 'common-info-modal',
    open: true,
    centered: true,
    maskClosable: false,
    ...config,
    onCancel: () => {
      hideModal();
      config.onCancel?.();
    },
  };

  ReactDOM.render(
    <Modal {...props}>
      <span className="modal-text">{config.content ?? null}</span>
    </Modal>,
    div
  );

  return { destroy: hideModal };
}
