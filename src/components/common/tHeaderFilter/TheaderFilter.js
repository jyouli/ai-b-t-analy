import { useState, useEffect } from 'react';
import { Popover } from 'antd';
import FilterContent from './components/FilterContent';
import FilterFooter from './components/FilterFooter';
import { DIC } from './dic/Index';
import { ExtraOpCondition, DirectlyExtraOp, ExtraOpType } from './dic/consts';
import SvgInline from 'src/components/common/SvgInline/SvgInline';
import sortAscSvg from 'src/assets/svg/icon-a-guolvshengxuxuanzhong.svg?raw';
import sortDescSvg from 'src/assets/svg/icon-a-guolvjiangxuxuanzhong.svg?raw';

import './theaderFilter.less';

function TheaderFilter(props) {
    const { 
        thConditions = [], 
        onChange = () => {},
        // 字段名称相同，字段中加个setUniqueName用于判断
        fieldInfo, 
        useExtraOpe = true,  // true: 显示 空白项 + 更多操作  false: 不展示 only: 仅展示 空白项, onlyDirectly: 仅展示 直接操作项

        // 是否显示清空按钮
        showClear = true,

        sorts = [],  // 排序
         
        popoverProps = {}, 
        children, 
    } = props;

    if (!fieldInfo) {
        return null;
    }

    const config = DIC.find(p => p.match(fieldInfo)) || {};

    const conditionKey = `${fieldInfo.metaName}.${fieldInfo.name}`;

    const matchCondition = (condition, fieldInfo = {}) => {
        return (
            condition.field?.name === fieldInfo?.name &&
            condition.field?.metaName === fieldInfo?.metaName
        );
    }
    
    const curConditions = thConditions.filter((condition) => {
        return matchCondition(condition, fieldInfo);
    });

    const [ active, setActive ] = useState(false);

    const [ tempCondition, setTempCondition ] = useState(null);
    const [ extraOp, setExtraOp ] = useState('');
    const [ errorMsg, setErrorMsg ] = useState('');

    const initTempCondition = () => {
        const extraCondition = curConditions.find((condition) => !!condition.right.extraOp);
        const normalCondition = curConditions.find((condition) => !condition.right.extraOp);
        setExtraOp(extraCondition?.right?.extraOp || '');    
        setTempCondition(normalCondition || null);
    }

    const handleVisible = (visible) => {
        if (!visible) {
            setErrorMsg('');
            setExtraOp('');
            setTempCondition(null);
        } else {
            initTempCondition();
        }
        setActive(visible);
    };

    const clear = () => {
        handleVisible(false);
        const newConditions = thConditions.filter((condition) => {
            return !matchCondition(condition, fieldInfo);
        });
        onChange(newConditions, [], fieldInfo);
    };

    const formatConditionLabel = (label, extraOp) => {
        return extraOp === ExtraOpType.blank ? `${label || ''},[空白项]` : label;
    }

    const postProcessLabels = (currentConditions, extraOp) => {
        const normal = currentConditions.find(c => !c?.right?.extraOp);
        if (!normal) {
            return currentConditions;
        }
        const baseLabel = normal.curLabel ?? normal.label ?? '';
        if (extraOp === ExtraOpType.blank) {
            const combinedLabel = formatConditionLabel(baseLabel, extraOp);
            return currentConditions.map(c => ({ ...c, label: combinedLabel, curLabel: baseLabel }));
        }
        return currentConditions.map(c => ({ ...c, label: baseLabel, curLabel: baseLabel }));
    }

    const formatConditions = (extraOp, curTempCondition) => {
        const otherConditions = thConditions.filter((condition) => {
            return !matchCondition(condition, fieldInfo);
        });
        const conditionBase = {
            field: fieldInfo,
            left: { type: 'field', value: conditionKey },
        }
        const currentConditions = [
            ...(curTempCondition ? [curTempCondition] : []),
            ...(extraOp ? [{ ...conditionBase, ...ExtraOpCondition[extraOp] }] : [])
        ];
        const processedCurrent = postProcessLabels(currentConditions, extraOp);
        return {
             newThConditions: [ ...otherConditions, ...processedCurrent ],
             newCurrentConditions: currentConditions
        };
    }

    const validateCondition = (condition, extraOp) => {
        const { validate = () => true, invalidWarning = '' } = config;
        const value = condition?.right?.value;
        if (!extraOp && !validate(value, condition)) {
            setErrorMsg(invalidWarning || '筛选条件的值不能为空');
            return false;
        }
        return true;
    }

    const confirm = () => {
        if (!validateCondition(tempCondition, extraOp)) {
            return;
        }
        const { newThConditions, newCurrentConditions } = formatConditions(extraOp, tempCondition);
        onChange(newThConditions, newCurrentConditions, fieldInfo);
        handleVisible(false);
    };

    const handleKeyDown = (e) => {
        if (e.keyCode === 13) {
            confirm();
        }
    };

    useEffect(() => {
        if (active) {
            window.addEventListener('keydown', handleKeyDown);
        } else {
            window.removeEventListener('keydown', handleKeyDown);
        }
        return () => {
            window.removeEventListener('keydown', handleKeyDown);
        };
    }, [active, handleKeyDown]);

    const changeExtraOpe = (ope) => {
        setErrorMsg('');
        if(ope === 'clear') {
            setExtraOp('');
            clear();
            return;
        }
        setExtraOp(ope);
        if(DirectlyExtraOp.includes(ope)) {
            const { newThConditions, newCurrentConditions } = formatConditions(ope, null);
            onChange(newThConditions, newCurrentConditions, fieldInfo);
            handleVisible(false);
        }
    };

    const handleValueChange = ({ values, isDirectFilter }) => {
        setErrorMsg('');
        const conditionBase = {
            field: fieldInfo,
            left: { type: 'field', value: conditionKey },
        }
        const tempConditionNew = values && { ...conditionBase, ...values, curLabel: values?.label };
        const isSpecial = extraOp === 'exists' || extraOp === 'isNull';
        if (isSpecial) {
            setExtraOp('');
        }
        const extraOpNew = isDirectFilter ? '' : (isSpecial ? '' : extraOp);
        if(isDirectFilter) {
            const { newThConditions, newCurrentConditions } = formatConditions(extraOpNew, tempConditionNew);
            onChange(newThConditions, newCurrentConditions, fieldInfo);
            handleVisible(false);
        } else {
            setTempCondition(tempConditionNew);
        }
    }

    const content = (
            <div className='popover-content'>
                <FilterContent
                    multiTabUuid={props.multiTabUuid}
                    {...props}
                    tempCondition={tempCondition}
                    errorMsg={errorMsg}
                    contentConfig={config}
                    handleChange={handleValueChange} />
                <FilterFooter
                    multiTabUuid={props.multiTabUuid}
                    config={config}
                    showClear={showClear}
                    clear={clear}
                    useExtraOpe={useExtraOpe}
                    extraOp={extraOp}
                    changeExtraOpe={changeExtraOpe}
                    confirm={confirm} />
            </div>
        );

    const getFilterIcon = ({ sorts = [], fieldInfo }) => {
        const sort = sorts.find(item => item.field == fieldInfo.name);
        const orderType = sort?.orderType || null;
        if (!!sort) {
            const svg = orderType == 1 ? sortAscSvg : sortDescSvg;
            return <SvgInline title="筛选" svg={svg} className="thead-filter-icon-svg" />;
        }
        return <i title="筛选" className="thead-filter-icon icon-shaixuan" />;
    }

    const childrenContent = children ? children : getFilterIcon({ fieldInfo, sorts });

    const triggerNode = (
        <span className={`theader-filter-trigger ${children ? '' : 'theader-filter-trigger-icon'}`} onClick={(e) => { e.stopPropagation(); handleVisible(!active); }}>
            {childrenContent}
        </span>
    );

    return (
        <div className={`tHeader-filter-wrap ${active ? 'showTHeader' : ''} ${!!curConditions?.length ? 'hasSet' : ''}`}>
            <Popover
                placement='bottom'
                {...popoverProps}
                content={content}
                trigger='click'
                open={active}
                destroyOnHidden={true}
                rootClassName={`theader-filter-popover ${popoverProps?.extendOverlayClassName}`}
                onOpenChange={handleVisible}
            >
                {triggerNode}
            </Popover>
        </div>
    );
}

export default TheaderFilter;
