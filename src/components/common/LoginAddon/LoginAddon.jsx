import React, { useMemo } from 'react';
import { Select } from 'antd';
import { CheckOutlined } from '@ant-design/icons';
import { PHONE_CODE, PHONE_CODE_EN } from 'src/components/common/LoginModal/phoneCode';
import { LangCN, getCurrentShowLanguage } from 'src/utils/i18n';

/**
 * 区号选择：Select 自带搜索（无下拉内独立搜索框），与设计稿一致。
 */
export default function LoginAddon({ value, onChange, hideEmailOption }) {
  const language = getCurrentShowLanguage();

  const options = useMemo(() => {
    const list = language && language !== LangCN ? PHONE_CODE_EN : PHONE_CODE;
    return list
      .filter((item) => {
        const v = item.__value || item.value;
        return hideEmailOption ? v !== 'email' : true;
      })
      .map((item) => ({
        label: item.label,
        value: item.__value || item.value,
        displayLabel: item.value === 'email' ? item.label : item.value,
      }));
  }, [language, hideEmailOption]);

  return (
    <Select
      className="ai-login-addon-select"
      bordered={false}
      value={value}
      onChange={onChange}
      optionLabelProp="displayLabel"
      showSearch={{
        filterOption: (input, option) => {
          const q = String(input ?? '').trim().toLowerCase();
          if (!q) return true;
          const label = String(option?.label ?? '').toLowerCase();
          const val = String(option?.value ?? '').toLowerCase();
          return label.includes(q) || val.includes(q);
        },
      }}
      style={{ width: 74 }}
      popupMatchSelectWidth={false}
      classNames={{ popup: { root: 'ai-login-addon-dropdown' } }}
      options={options}
      menuItemSelectedIcon={<CheckOutlined className="ai-login-addon-check-icon" />}
    />
  );
}
