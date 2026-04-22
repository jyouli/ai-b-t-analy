import React from 'react';
import scanGif from 'src/assets/img/scan-animtion.gif';
import classNames from 'classnames';
import './ScanOverlay.less';

export default function ScanOverlay({ className }) {
  return (
    <div className={classNames('bdd-scan-overlay', 'bd-scan-overlay', className)} aria-busy="true" role="status">
      <div className="bd-scan-overlay__inner">
        <img src={scanGif} alt="" className="bd-scan-overlay__gif" />
      </div>
    </div>
  );
}
