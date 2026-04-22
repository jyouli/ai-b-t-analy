import React, { useState } from 'react';
import { message } from 'antd';
import { t } from 'src/utils/i18n';
import closeRed from 'src/assets/img/close-red.png';
import pointLoc from 'src/assets/img/point-loation.png';
import CollapseSectionHeader from './CollapseSectionHeader';
import './TodoGroupsPanel.less';

export default function TodoGroupsPanel({ data }) {
  const [reqOpen, setReqOpen] = useState(true);
  const groups = data.todoGroups || [];

  const handleLocate = () => message.info(t('i18n_bd_locate_placeholder'));

  return (
    <div className="bdd-todo-groups-panel bd-todo-panel">
      <CollapseSectionHeader
        title={t('i18n_bd_section_todo')}
        expanded={reqOpen}
        onToggle={() => setReqOpen((v) => !v)}
        showHelp
        helpText={t('i18n_bd_help_todo_section')}
      />
      {reqOpen ? (
        <div className="bd-todo-panel__body">
          {groups.map((g) => (
            <div key={g.id} className="bd-todo-group">
              <div className="bd-todo-group__title">{g.title}</div>
              <ul className="bd-todo-group__list">
                {g.items.map((it) => (
                  <li key={it.id} className="bd-todo-group__item">
                    <img src={closeRed} alt="" width={16} height={16} />
                    <span className="bd-todo-group__page">
                      {t('i18n_bd_page_label', { page: it.page })}
                    </span>
                    <button type="button" className="bd-todo-group__loc" onClick={handleLocate}>
                      <img src={pointLoc} alt="" width={14} height={14} />
                      <span>{t('i18n_bd_locate_source')}</span>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}
