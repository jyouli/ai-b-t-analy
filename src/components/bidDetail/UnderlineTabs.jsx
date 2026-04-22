import React, { useCallback, useEffect, useRef, useState } from 'react';
import classNames from 'classnames';
import './UnderlineTabs.less';

export default function UnderlineTabs({ items, activeKey, onChange, disabled = false, className }) {
  const scrollerRef = useRef(null);
  const [showLeft, setShowLeft] = useState(false);
  const [showRight, setShowRight] = useState(false);

  const updateArrows = useCallback(() => {
    const el = scrollerRef.current;
    if (!el) return;
    const { scrollLeft, scrollWidth, clientWidth } = el;
    setShowLeft(scrollLeft > 2);
    setShowRight(scrollLeft + clientWidth < scrollWidth - 2);
  }, []);

  useEffect(() => {
    updateArrows();
    const el = scrollerRef.current;
    if (!el) return undefined;
    const ro = new ResizeObserver(() => updateArrows());
    ro.observe(el);
    return () => ro.disconnect();
  }, [items, updateArrows]);

  const scrollPage = (dir) => {
    const el = scrollerRef.current;
    if (!el) return;
    el.scrollBy({ left: dir * el.clientWidth, behavior: 'smooth' });
    window.setTimeout(updateArrows, 320);
  };

  return (
    <div className={classNames('bdd-underline-tabs', 'bd-underline-tabs', className)}>
      {showLeft ? (
        <button
          type="button"
          className="bd-underline-tabs__arrow bd-underline-tabs__arrow--left"
          onClick={() => scrollPage(-1)}
          disabled={disabled}
          aria-label="prev"
        >
          ‹
        </button>
      ) : null}
      <div
        ref={scrollerRef}
        className="bd-underline-tabs__scroll"
        onScroll={updateArrows}
      >
        <div className="bd-underline-tabs__inner">
          {items.map((it) => {
            const active = it.key === activeKey;
            return (
              <button
                key={it.key}
                type="button"
                className={classNames('bd-underline-tabs__item', active && 'is-active')}
                onClick={() => !disabled && onChange?.(it.key)}
                disabled={disabled}
                aria-current={active ? 'true' : undefined}
              >
                <span className="bd-underline-tabs__label">{it.label}</span>
                {active ? <span className="bd-underline-tabs__underline" aria-hidden /> : null}
              </button>
            );
          })}
        </div>
      </div>
      {showRight ? (
        <button
          type="button"
          className="bd-underline-tabs__arrow bd-underline-tabs__arrow--right"
          onClick={() => scrollPage(1)}
          disabled={disabled}
          aria-label="next"
        >
          ›
        </button>
      ) : null}
    </div>
  );
}
