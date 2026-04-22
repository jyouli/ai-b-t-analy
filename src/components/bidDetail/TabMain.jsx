import React from 'react';
import classNames from 'classnames';
import titleLeftDefault from 'src/assets/img/title-left.png';
import UnderlineTabs from './UnderlineTabs';
import ScanOverlay from './ScanOverlay';
import './TabMain.less';

const DEFAULT_TOP_BG = '/assets/images/top-bg-circle.png';

export default function TabMain({
  title,
  titleIcon,
  tabItems,
  activeTabKey,
  onTabChange,
  tabsDisabled = false,
  loading = false,
  topBgImageSrc = DEFAULT_TOP_BG,
  className,
  bodyClassName,
  children,
}) {
  const tabsBlocked = tabsDisabled || loading;
  const resolvedTitleIcon = titleIcon ?? (
    <img src={titleLeftDefault} alt="" width={20} height={20} />
  );

  return (
    <section className={classNames('bdd-tab-main', 'bd-card', className)}>
      <div className="bd-card__top-bg">
        <img className="bd-card__top-bg-img" src={topBgImageSrc} alt="" />
      </div>
      <div className="bd-card__head">
        <span className="bd-card__title-icon">{resolvedTitleIcon}</span>
        <span className="bd-card__title">{title}</span>
      </div>
      <UnderlineTabs
        items={tabItems}
        activeKey={activeTabKey}
        onChange={onTabChange}
        disabled={tabsBlocked}
        className="bd-card__tabs"
      />
      <div className={classNames('bd-card__body-wrap', bodyClassName)}>
        {children}
        {loading ? <ScanOverlay className="bd-card__overlay" /> : null}
      </div>
    </section>
  );
}
