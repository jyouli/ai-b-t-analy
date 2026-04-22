import React from 'react';
import classNames from 'classnames';
import SvgInline from '../SvgInline/SvgInline';

/**
 * 本地 SVG（?raw）包装：通过 color / 尺寸控制展示；monochrome 时将 path 等填色统一切到 currentColor。
 */
export default function SvgIcon({
  svg,
  className,
  color,
  size,
  width,
  height,
  title,
  monochrome = false,
  style,
}) {
  const w = width ?? size;
  const h = height ?? size;
  const processed = monochrome
    ? svg.replace(/fill="[^"]+"/g, 'fill="currentColor"').replace(/stroke="[^"]+"/g, 'stroke="currentColor"')
    : svg;

  return (
    <span
      className={classNames('svg-icon', monochrome && 'svg-icon--monochrome', className)}
      style={{
        display: 'inline-flex',
        lineHeight: 0,
        color: color || undefined,
        width: w,
        height: h,
        ...style,
      }}
      title={title}
    >
      <SvgInline svg={processed} />
    </span>
  );
}
