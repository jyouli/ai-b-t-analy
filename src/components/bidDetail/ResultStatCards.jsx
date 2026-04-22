import React from 'react';
import classNames from 'classnames';
import { t } from 'src/utils/i18n';
import './ResultStatCards.less';

export default function ResultStatCards({
  cards,
  mode = 'triple',
  activeFilter,
  onFilterChange,
  className,
}) {
  return (
    <div className={classNames('bdd-result-stat-cards', 'bd-stat-cards', `bd-stat-cards--${mode}`, className)}>
      {cards.map((card, idx) => {
        const { type, value, labelKey, primary, secondary, subLabelKey, active } = card;
        const label = subLabelKey ? t(subLabelKey) : labelKey ? t(labelKey) : '';
        const isScore = mode === 'score';
        const selected = activeFilter == type;
        const displayPrimary = isScore ? primary : value;
        return (
          <button
            key={idx}
            type="button"
            className={classNames(
              'bd-stat-card',
              `bd-stat-card--${type}`,
              selected && 'is-selected',
              onFilterChange && 'is-clickable'
            )}
            onClick={() => {
              if (!onFilterChange) return;
              onFilterChange(type);
            }}
            disabled={!onFilterChange}
          >
            <div className="bd-stat-card__value">
              {displayPrimary === undefined ? <span className="bd-stat-card__num">--</span> : (
                <span className="bd-stat-card__num">
                  <span>{displayPrimary}</span>
                  <span className="bd-stat-card__num-unit">分</span>
                </span>
              )}
              {(isScore && !!secondary) && <>
                <span className="bd-stat-card__num-unit">/</span>
                <span className="bd-stat-card__num">
                  <span>{secondary}</span>
                  <span className="bd-stat-card__num-unit">分</span>
                </span>
              </>}
            </div>
            <div className="bd-stat-card__label">{label}</div>
          </button>
        );
      })}
    </div>
  );
}
