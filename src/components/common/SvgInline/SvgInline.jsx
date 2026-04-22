import React from 'react';

/**
 * 将本地 SVG 字符串内联渲染，便于通过父级 color 控制 fill=currentColor 的图标。
 */
export default function SvgInline({ svg, className, title }) {
  const html = svg.replace(/<svg([^>]*)>/, (_, attrs) => {
    if (!className) return `<svg${attrs}>`;
    if (/\sclass=/.test(attrs)) {
      return `<svg${attrs.replace(/\sclass="([^"]*)"/, (_, existing) => ` class="${existing} ${className}"`)}>`;
    }
    return `<svg${attrs} class="${className}">`;
  });
  return (
    <span className="svg-inline-root" title={title} dangerouslySetInnerHTML={{ __html: html }} />
  );
}
