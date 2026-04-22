import React from 'react';
import { Tooltip, message } from 'antd';
import classNames from 'classnames';
import { t } from 'src/utils/i18n';
import SvgIcon from 'src/components/common/SvgIcon/SvgIcon';
import eyeCloseSvg from 'src/assets/svg/eye-close.svg?raw';
import rebackSvg from 'src/assets/svg/reback.svg?raw';
import './InspectionResultCard.less';

function LocateLink({ onLocate, showText = true }) {
  return (
    <button type="button" className="bd-result-card__action" onClick={onLocate}>
      <span className="icon-dingweiyuanwen" />
      <span>{showText ? t('i18n_bd_locate_source') : null}</span>
    </button>
  );
}

export default function InspectionResultCard({
  item,
  ignored,
  onIgnore,
  onRestore,
  onLocate,
}) {
  const handleLocate = (payload) => {
    if (onLocate) {
      onLocate(payload ?? item);
      return;
    }
    message.info(t('i18n_bd_locate_placeholder'));
  };

  if (ignored) {
    return (
      <div className={classNames('bdd-inspection-result-card', 'bd-result-card', 'bd-result-card--ignored')}>
        <div className="bd-result-card__ignored-body">
          <button type="button" className="bd-result-card__restore" onClick={() => onRestore?.(item.id)}>
            <SvgIcon svg={rebackSvg} size={16} color="#666" monochrome />
            <span>{t('i18n_bd_restore')}</span>
          </button>
        </div>
      </div>
    );
  }

  const { variant, tagKey, scoreTag, title, lines, topLocate = false, showIgnore = true } = item;

  const tagText = scoreTag || (tagKey ? t(tagKey) : '');
  const isScore = variant === 'scoreFail' || variant === 'scorePartial' || variant === 'scorePass';
  const stripClass = classNames(
    'bd-result-card__strip',
    variant === 'fail' && 'is-fail',
    variant === 'pass' && 'is-pass',
    variant === 'scoreFail' && 'is-fail',
    variant === 'scorePartial' && 'is-warn',
    variant === 'scorePass' && 'is-pass',
    variant === 'pending' && 'is-pending',
    variant === 'todo' && 'is-fail'
  );

  return (
    <div
      className={classNames(
        'bdd-inspection-result-card',
        'bd-result-card',
        variant === 'fail' && 'bd-result-card--theme-fail',
        variant === 'pass' && 'bd-result-card--theme-pass',
        variant === 'scoreFail' && 'bd-result-card--theme-fail',
        variant === 'scorePartial' && 'bd-result-card--theme-warn',
        variant === 'scorePass' && 'bd-result-card--theme-pass',
        variant === 'pending' && 'bd-result-card--theme-pending',
        variant === 'todo' && 'bd-result-card--theme-fail'
      )}
    >
      <div className="bd-result-card__row bd-result-card__row--top">
        {isScore ? (
          <span className="bd-result-card__score-tag">{tagText}</span>
        ) : (
          <span className={stripClass}>{tagText}</span>
        )}
        <div className="bd-result-card__title-wrap">
          <span className="bd-result-card__title">{title}</span>
        </div>
        {topLocate ? (
          <div className="bd-result-card__top-actions">
            <LocateLink onLocate={() => handleLocate()} />
          </div>
        ) : null}
      </div>

      <div className="bd-result-card__lines">
        {lines.map((line, i) => (
          <div key={i} className={classNames('bd-result-card__line', `is-${line.kind}`)}>
            {line.kind === 'error' || line.kind === 'todo' ? (
              <i className="icon-bufuhe1 bd-result-card__line-error" />
            ) : null}
            {line.kind === 'success' ? (
              <i className="icon-yiwancheng bd-result-card__line-check" />
            ) : null}
            <span className="bd-result-card__line-text">{line.text}</span>
            <LocateLink onLocate={() => handleLocate(line)} />
          </div>
        ))}
      </div>

      {(variant === 'fail' || variant === 'todo' || variant === 'scoreFail' || variant === 'scorePartial') &&
      showIgnore ? (
        <div className="bd-result-card__row bd-result-card__row--bottom">
          <Tooltip title={t('i18n_bd_ignore_tooltip')}>
            <button type="button" className="bd-result-card__action cancel" onClick={() => onIgnore?.(item.id)}>
              <SvgIcon svg={eyeCloseSvg} size={16} color="#333" monochrome />
              <span>{t('i18n_bd_ignore')}</span>
            </button>
          </Tooltip>
        </div>
      ) : variant === 'pass' || variant === 'scorePass' ? (
        <div className="bd-result-card__row bd-result-card__row--bottom bd-result-card__row--single">
          <LocateLink onLocate={() => handleLocate()} />
        </div>
      ) : variant === 'pending' ? (
        <div className="bd-result-card__row bd-result-card__row--bottom bd-result-card__row--single">
          <LocateLink onLocate={() => handleLocate()} />
        </div>
      ) : null}
    </div>
  );
}
