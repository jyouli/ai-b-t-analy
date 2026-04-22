import React from 'react';
import { Modal, Switch, List } from 'antd';
import { connect } from 'dva';
import { t } from 'src/utils/i18n';

function SettingsModal({ visible, onClose, onOpenLogin, dispatch, isMultiTabMode }) {
  const handleMultiTabChange = (checked) => {
    dispatch({ type: 'multipleTabs/setMultiTabMode', payload: checked });
  };

  const handleSwitchAccount = () => {
    onClose();
    onOpenLogin?.();
  };

  return (
    <Modal
      title={t('i18n_settings')}
      open={visible}
      onCancel={onClose}
      footer={null}
      width={400}
    >
      <List>
        <List.Item
          extra={
            <Switch
              checked={isMultiTabMode}
              onChange={handleMultiTabChange}
            />
          }
        >
          <List.Item.Meta
            title={t('i18n_multi_tab_mode')}
            description={isMultiTabMode ? t('i18n_multi_tab_mode') : t('i18n_single_tab_mode')}
          />
        </List.Item>
        <List.Item
          onClick={handleSwitchAccount}
          style={{ cursor: 'pointer' }}
        >
          <List.Item.Meta title={t('i18n_switch_account')} />
        </List.Item>
      </List>
    </Modal>
  );
}

export default connect((state) => ({
  isMultiTabMode: state.multipleTabs?.isMultiTabMode,
}))(SettingsModal);
