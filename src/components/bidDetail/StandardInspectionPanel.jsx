import React, { useMemo, useState } from 'react';
import { t } from 'src/utils/i18n';
import CollapseSectionHeader from './CollapseSectionHeader';
import ResultStatCards from './ResultStatCards';
import InspectionResultCard from './InspectionResultCard';
import './StandardInspectionPanel.less';

export default function StandardInspectionPanel({ tabData, ignoredIds, onIgnore, onRestore }) {
  const [reqOpen, setReqOpen] = useState(true);
  const [resOpen, setResOpen] = useState(true);
  const [filter, setFilter] = useState('all');

  const { requirements, stats, results, sectionRequirementTitleKey, sectionResultTitleKey } = tabData;

  const filteredResults = useMemo(() => {
    if (!results) return results || [];
    if (filter === 'all') return results;
    return results.filter((r) => {
      if (filter === 'fail') {
        return r.variant === 'fail' || r.variant === 'todo' || r.variant === 'scoreFail' || r.variant === 'scorePartial';
      }
      if (filter === 'pass') return r.variant === 'pass' || r.variant === 'scorePass';
      if (filter === 'pending') return r.variant === 'pending';
      return true;
    });
  }, [results, filter, stats?.mode]);

  const reqTitle = sectionRequirementTitleKey ? t(sectionRequirementTitleKey) : '';
  const resTitle = sectionResultTitleKey ? t(sectionResultTitleKey) : t('i18n_bd_section_check_result');

  return (
    <div className="bdd-standard-inspection-panel bd-standard-panel">
      {!tabData.hideRequirementSection ? (
        <>
          <CollapseSectionHeader
            title={reqTitle}
            expanded={reqOpen}
            onToggle={() => setReqOpen((v) => !v)}
            showHelp
            helpText={t('i18n_bd_help_requirement_section')}
          />
          {reqOpen ? (<div className="bd-standard-panel__req">
            {`一、资格证明文件
（一）法人或者其他组织的宫业执照，自然人的身份证（复印件）；
（二）參加本次采购活动前的会计报表（复印件，成立不满一年不需提供）；
（三）參加本次来购活动前一年内至少一个月缴纳增值税、营业税或者企业所得税的凭据，以及缴红
社会保险的凭据（专用收据或者社会保险嫩纳活单）（复印件）
（四）根据项目需求提供履行合同必需的设备和专业技术能力的声明及证明材料；
（五）然加大近政安亚阶还动前？年内你级要深斗面治肯场十海洋记加的我尚击阳：`}
          </div>) : null}
        </>
      ) : null}

      {!tabData.hideStats ? (
        <>
          <CollapseSectionHeader
            title={resTitle}
            expanded={resOpen}
            onToggle={() => setResOpen((v) => !v)}
            showHelp={false}
          />
          {resOpen ? (
            <div className="bd-standard-panel__results">
              {stats ? (
                <ResultStatCards
                  cards={stats.cards}
                  mode={stats.mode}
                  activeFilter={filter}
                  onFilterChange={setFilter}
                />
              ) : null}
              <div className="bd-standard-panel__cards">
                {filteredResults.map((item) => (
                  <InspectionResultCard
                    key={item.id}
                    item={item}
                    ignored={ignoredIds.has(item.id)}
                    onIgnore={onIgnore}
                    onRestore={onRestore}
                  />
                ))}
              </div>
            </div>
          ) : null}
        </>
      ) : null}
    </div>
  );
}
