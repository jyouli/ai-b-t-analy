import React from 'react';
import { Button } from 'antd';
import { HomeOutlined, FileSearchOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { t } from 'src/utils/i18n';
import { APP_DEFAULT_ROUTE } from 'src/routes/appDefaultRoute';
import './NotFound.less';

export default function NotFound() {
  const navigate = useNavigate();

  return (
    <div className="not-found-page">
      <div className="not-found-content">
        <FileSearchOutlined className="not-found-icon" />
        <div className="not-found-title">404</div>
        <div className="not-found-desc">{t('i18n_404_message')}</div>
        <Button
          type="primary"
          size="large"
          icon={<HomeOutlined />}
          onClick={() => navigate(APP_DEFAULT_ROUTE.path)}
          className="not-found-btn"
        >
          {t('i18n_go_home')}
        </Button>
      </div>
    </div>
  );
}
