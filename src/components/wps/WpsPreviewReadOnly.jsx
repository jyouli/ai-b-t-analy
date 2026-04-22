import React, { Component } from 'react';
import { connect } from 'dva';
import { Typography } from 'antd';
import { getFileType } from 'src/utils/FileTool';
import WpsPreviewDrawerReadOnly from './WpsPreviewDrawerReadOnly';

export const wps_suffix = ['doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'pdf', 'wps', 'et', 'dps'];

class WpsPreviewReadOnly extends Component {
  componentDidMount() {
    this.props.openRef?.(this.openDrawer);
  }

  openDrawer = () => {
    this.drawerRef?.openDrawer?.();
  };

  render() {
    const { children, label, item } = this.props;
    if (!item || !getFileType(item)) return null;
    return (
      <span className="text-show">
        <span className="text-title" onClick={this.openDrawer} style={{ cursor: 'pointer' }}>
          {children || <Typography.Paragraph ellipsis={{ rows: 1 }}>{label || item.name}</Typography.Paragraph>}
        </span>
        <WpsPreviewDrawerReadOnly
          onRef={(r) => (this.drawerRef = r)}
          {...this.props}
        />
      </span>
    );
  }
}

export default connect((state) => ({
  auth: { accessToken: JSON.parse(localStorage.getItem('auth') || '{}').accessToken },
}))(WpsPreviewReadOnly);
