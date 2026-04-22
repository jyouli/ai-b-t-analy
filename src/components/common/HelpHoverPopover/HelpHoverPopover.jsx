import React from 'react';
import { Popover } from 'antd';
import classNames from 'classnames';
import './HelpHoverPopover.less';

function buildTriggerStyle({ marginLeft, fontSize, color, hoverColor }) {
  const style = {};
  if (marginLeft != null && marginLeft !== 0) {
    style.marginLeft = typeof marginLeft === 'number' ? `${marginLeft}px` : marginLeft;
  }
  if (fontSize != null) {
    style['--hh-popover-icon-size'] = typeof fontSize === 'number' ? `${fontSize}px` : fontSize;
  }
  if (color != null) {
    style['--hh-popover-icon-color'] = color;
  }
  if (hoverColor != null) {
    style['--hh-popover-icon-hover-color'] = hoverColor;
  }
  return style;
}

/**
 * 问号帮助图标，hover 时以 Popover 展示说明文案。
 * @param {React.ReactNode} helpText hover 时展示的提示内容
 * @param {number|string} [marginLeft=0] 左侧外边距；number 视为 px
 * @param {number|string} [fontSize] 图标字号；number 视为 px
 * @param {string} [color] 默认颜色（任意 CSS 颜色值）
 * @param {string} [hoverColor] hover 时颜色
 * @param {string} [className] 触发器外层 class
 */
export default function HelpHoverPopover({
  helpText,
  marginLeft = 0,
  fontSize,
  color,
  hoverColor,
  className,
}) {
  const triggerStyle = buildTriggerStyle({ marginLeft, fontSize, color, hoverColor });
  const triggerClass = classNames('help-hover-popover__trigger', className);
  const trigger = (
    <span className={triggerClass} style={triggerStyle} role="img" aria-label="帮助说明">
      <i className="icon-wenhao1" aria-hidden />
    </span>
  );

  if (helpText == null || helpText === '') {
    return trigger;
  }

  return (
    <Popover
      content={helpText}
      trigger="hover"
      placement="top"
      mouseEnterDelay={0.1}
      mouseLeaveDelay={0.1}
      // 与 antd 内置 placements 合并时仅覆盖 offset：负值越大气泡越上移，箭头与触发器间距越大（小图标上避免箭头压住图标）
      align={{ offset: [0, -20] }}
    >
      {trigger}
    </Popover>
  );
}
