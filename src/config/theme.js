/**
 * Ant Design 主题色与项目中已落地的红色体系统一（见 src/styles/variables.less）。
 * — @primary-color、hover、浅红、背景、描边、10% 选中底等与侧栏/弹窗实现一致。
 */
export const designRed = {
  primary: '#FD6364',
  /** variables.less @primary-hover；与主色一致，驱动 --ant-btn-bg-color-hover（colorPrimaryHover） */
  hover: '#E74959',
  /** 按下态略深于 hover */
  active: '#9a0f14',
  /** variables.less @primary-light */
  light: '#ff6b6b',
  /** variables.less @primary-bg */
  bg: '#fff5f5',
  /** variables.less 侧栏选中底 @sider-selected-bg */
  bgHover: 'rgba(253, 99, 100, 0.1)',
  /** variables.less @sider-rail-border */
  border: '#ffebeb',
  /** 边框强调用浅珊瑚红 */
  borderHover: '#ff6b6b',
  /** Button 等禁用态底（已有组件配置） */
  disabledBg: 'rgba(253, 99, 100, 0.5)',
};

export const designLink = {
  /** 避免 a 标签/Upload 文件名跟随主色红 */
  primary: '#5C59C6',
  hover: '#5C59C6',
  active: '#5C59C6',
};

export const designUpload = {
  /** Upload 组件不跟随全局主色 */
  primary: '#1677ff',
  hover: '#4096ff',
  active: '#0958d9',
};

export default {
  cssVar: true,
  hashed: false,
  token: {
    /** Tooltip 背景（antd 文档：该 token 目前仅用于 Tooltip；勿改 colorTextLightSolid，以免影响主按钮等） */
    colorBgSpotlight: '#ffffff',
    colorPrimary: designRed.primary,
    colorPrimaryHover: designRed.hover,
    colorPrimaryActive: designRed.active,
    colorPrimaryBg: designRed.bg,
    // 暂时屏蔽或者改为不透明的其他颜色，透明颜色会导致表格 hover 时背景颜色透明
    // colorPrimaryBgHover: designRed.bgHover,
    colorPrimaryBorder: designRed.border,
    colorPrimaryBorderHover: designRed.borderHover,
    colorPrimaryText: designRed.primary,
    colorPrimaryTextHover: designRed.hover,
    colorPrimaryTextActive: designRed.active,
    // 链接色：与主色解耦，避免 a 标签/上传文件名显示为红色
    colorLink: designLink.primary,
    colorLinkHover: designLink.hover,
    colorLinkActive: designLink.active,
    borderRadius: 4,
  },
  components: {
    Button: {
      colorBgContainerDisabled: designRed.disabledBg,
      colorTextDisabled: '#ffffff',
      borderColorDisabled: 'transparent',
    },
    Upload: {
      colorPrimary: designUpload.primary,
      colorPrimaryHover: designUpload.hover,
      colorPrimaryActive: designUpload.active,
      colorLink: designUpload.primary,
      colorLinkHover: designUpload.hover,
      colorLinkActive: designUpload.active,
    },
    /** hover 描边与主色一致（--ant-input-hover-border-color），区别于 Button 用的 colorPrimaryHover */
    /** 焦点/悬停描边 #5C59C6（与 variables @accent-purple 一致） */
    Input: {
      hoverBorderColor: '#5C59C6',
      activeBorderColor: '#5C59C6',
      activeShadow: '0 0 0 2px rgba(92, 89, 198, 0.12)',
      colorError: '#FE4E49',
      colorErrorBorder: '#FE4E49',
      colorErrorHover: '#FE4E49',
      errorActiveShadow: '0 0 0 2px rgba(254, 78, 73, 0.12)',
    },
  },
};
