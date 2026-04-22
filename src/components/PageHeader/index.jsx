import React, { useState } from 'react';
import { t } from 'src/utils/i18n';
import ThrottledInput from '../common/ThrottledInput/ThrottledInput';
import './index.less';
import 'src/assets/iconfont/yunfont/yunfont.less';

export default function PageHeader({ title, extra, onSearch, searchPlaceholder }) {
  const [searchVal, setSearchVal] = useState('');

  const handleChange = (v) => {
    const s = v ?? '';
    setSearchVal(s);
    if (s === '') {
      onSearch?.('');
    }
  };

  const handlePressEnter = (e) => {
    const v = e.target?.value ?? '';
    setSearchVal(v);
    onSearch?.(v);
  };

  return (
    <div className="ai-b-t-page-header">
      <div className="ai-b-t-page-header-inner">
        <div className="ai-b-t-page-header-left">
          {title ? (
            <h2 className="ai-b-t-page-header-title">
              <i className="icon-dingdao_xiaoxi ai-b-t-page-header-bell" aria-hidden />
              {title}
            </h2>
          ) : null}
        </div>
        <div className="ai-b-t-page-header-right">
          {onSearch ? (
            <ThrottledInput
              placeholder={searchPlaceholder || t('i18n_search')}
              prefix={<i className="iconfont icon-sousuo ai-b-t-search-prefix-icon" aria-hidden />}
              allowClear
              value={searchVal}
              onChange={handleChange}
              throttleMs={500}
              className="ai-b-t-page-header-search-input"
              onPressEnter={handlePressEnter}
            />
          ) : null}
          {extra}
        </div>
      </div>
    </div>
  );
}
