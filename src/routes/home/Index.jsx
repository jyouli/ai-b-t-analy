import React from 'react';
import { Card, Row, Col } from 'antd';
import { useNavigate } from 'react-router-dom';
import { CheckSquareOutlined, FileTextOutlined, DatabaseOutlined } from '@ant-design/icons';
import { t } from 'src/utils/i18n';
import { APP_DEFAULT_ROUTE } from 'src/routes/appDefaultRoute';
import './Index.less';

const shortcuts = [
  { key: 'aibidSelection', path: '/aibidSelection', icon: CheckSquareOutlined, labelKey: 'i18n_menu_tender' },
  {
    key: APP_DEFAULT_ROUTE.tabKey,
    path: APP_DEFAULT_ROUTE.path,
    icon: FileTextOutlined,
    labelKey: APP_DEFAULT_ROUTE.labelKey,
  },
  { key: 'credit', path: '/credit', icon: DatabaseOutlined, labelKey: 'i18n_menu_credit' },
];

export default function HomeIndex() {
  const navigate = useNavigate();

  return (
    <div className="home-page">
      <div className="home-welcome">
        <h1 className="welcome-title">{t('i18n_home_welcome')}</h1>
        <p className="welcome-desc">{t('i18n_home_desc')}</p>
      </div>
      <Row gutter={[16, 16]} className="home-shortcuts">
        {shortcuts.map((item) => (
          <Col key={item.key} xs={24} sm={12} md={8}>
            <Card hoverable onClick={() => navigate(item.path)}>
              <div className="shortcut-item">
                <item.icon className="shortcut-icon" />
                <span className="shortcut-label">{t(item.labelKey)}</span>
              </div>
            </Card>
          </Col>
        ))}
      </Row>
    </div>
  );
}
