import React from 'react';
import { Popover, Switch, Select } from 'antd';
import { connect } from 'dva';
import { t } from 'src/utils/i18n';
import { setLocale, getCurrentShowLanguage, LangCN, LangEN } from 'src/utils/i18n';
import './SettingsPopover.less';

const langOptions = [
  { value: LangCN, label: '中文' },
  { value: LangEN, label: 'English' },
];

function SettingsPopover({ children, onOpenLogin, dispatch, isMultiTabMode }) {
  const handleMultiTabChange = (checked) => {
    dispatch({ type: 'multipleTabs/setMultiTabMode', payload: checked });
  };

  const handleSwitchAccount = () => {
    onOpenLogin?.();
  };

  const handleLangChange = (value) => {
    setLocale(value);
    window.location.reload();
  };

  const content = (
    <div className="settings-popover-content">
      <div className="settings-list">
        <div className="settings-list-item">
          <div className="settings-item-meta">
            <div className="settings-item-title">{t('i18n_multi_tab_mode')}</div>
            <div className="settings-item-desc">{isMultiTabMode ? t('i18n_multi_tab_mode') : t('i18n_single_tab_mode')}</div>
          </div>
          <div className="settings-item-extra">
            <Switch
              checked={isMultiTabMode}
              onChange={handleMultiTabChange}
              size="small"
            />
          </div>
        </div>
        
        <div className="settings-list-item">
          <div className="settings-item-meta">
            <div className="settings-item-title">{t('i18n_language')}</div>
            <div className="settings-item-desc">
              <Select
                size="small"
                value={getCurrentShowLanguage()}
                options={langOptions}
                onChange={handleLangChange}
                style={{ width: '100%' }}
              />
            </div>
          </div>
        </div>

        <div className="settings-list-item clickable" onClick={handleSwitchAccount}>
          <div className="settings-item-meta">
            <div className="settings-item-title">{t('i18n_switch_account')}</div>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <Popover
      content={content}
      title={t('i18n_settings')}
      placement="rightTop"
      trigger="hover"
      mouseEnterDelay={0.2}
      mouseLeaveDelay={0.3}
      overlayClassName="settings-popover-overlay"
    >
      {children}
    </Popover>
  );
}

export default connect((state) => ({
  isMultiTabMode: state.multipleTabs?.isMultiTabMode,
}))(SettingsPopover);
