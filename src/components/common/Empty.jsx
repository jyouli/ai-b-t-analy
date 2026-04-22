import React from 'react';
import emptyRed from 'src/assets/img/empty-red.png';

/**
 * 通用空状态：插图 + 文案（样式由外层 className 控制）
 */
export default function Empty({ description, className }) {
  return (
    <div className={className}>
      <img src={emptyRed} alt="" />
      <p>{description}</p>
    </div>
  );
}
