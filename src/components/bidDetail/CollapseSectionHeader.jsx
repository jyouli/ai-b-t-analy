import React from 'react';
import classNames from 'classnames';
import expandUp from 'src/assets/img/expand-up.png';
import HelpHoverPopover from 'src/components/common/HelpHoverPopover/HelpHoverPopover';
import './CollapseSectionHeader.less';

export default function CollapseSectionHeader({
  title,
  expanded,
  onToggle,
  showHelp = false,
  helpText,
  className,
}) {
  const onKeyDown = (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onToggle();
    }
  };

  return (
    <div className={classNames('bdd-collapse-section-header', 'bd-collapse-head', className)}>
      <div
        className="bd-collapse-head__main"
        role="button"
        tabIndex={0}
        onClick={onToggle}
        onKeyDown={onKeyDown}
      >
        <span className={classNames('bd-collapse-head__expand', !expanded && 'is-collapsed')}>
          <img src={expandUp} alt="" width={24} height={24} />
        </span>
        <span className="bd-collapse-head__title">{title}</span>
      </div>
      {showHelp ? (
        <HelpHoverPopover helpText={helpText} />
      ) : (
        <span className="bd-collapse-head__help-placeholder" />
      )}
    </div>
  );
}
