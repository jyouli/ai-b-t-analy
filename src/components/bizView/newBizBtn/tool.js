import { FilterExecutor } from '@hecom/paas-logic';
import * as ExpressionPass from 'paas-expression-calculation';
import { toJson } from 'src/lib/tools';

function mergeFieldData({ fieldsLayout, pageFields, fieldList, authFields }) {
    return fieldsLayout.map(group => {
        let fields = group.fields || [];
        let fieldsArr = [];
        fields.forEach(fieldId => {
            let field = fieldList.find(item => item.objId == fieldId);
            if (field) {
                let layoutItem = pageFields.find(row => row.fieldId == fieldId);
                let auth = authFields[field?.name] || {};
                const merged = {
                    ...layoutItem,
                    ...field,
                    creatable: auth.c == 1,
                    writable: auth.w == 1,
                    readable: auth.r == 1,
                    required: field.required,
                    fieldRequired: field.required,
                    layoutRequired: layoutItem.required,
                };
                fieldsArr.push(merged);
            }
        });
        return {
            ...group,
            fields: fieldsArr,
        }
    })
}

function getLayoutDetail(bizMeta, bizType) {
    if(!bizMeta) return null;
    let curBizType = bizMeta.metaBizTypes.find(item => item.objId == bizType);
    if (!curBizType) {
        curBizType = bizMeta.metaBizTypes.find(item => item.name === 'defaultBizType');
    }
    const curLayoutId = curBizType?.layoutId;
    let layoutDetail = (bizMeta.metaLayouts || []).find(item => item.objId == curLayoutId);
    if (!layoutDetail) {
        layoutDetail = bizMeta.metaLayouts[0];
    }
    return layoutDetail;
}

export function getLayoutData  (bizMeta, bizType) {
    const layoutDetail = getLayoutDetail(bizMeta, bizType);
    const pageFields = layoutDetail?.webFields || layoutDetail?.fields || [];
    const layoutFieldsInfo = layoutDetail ? JSON.parse(layoutDetail?.layoutWebFields || layoutDetail?.layoutFields || '{}') : {};
    const { fieldsLayout, layoutFieldsColNum, webLayoutFieldsAlignType } = layoutFieldsInfo;
    return { 
        layoutFieldsColNum, 
        webLayoutFieldsAlignType, 
        bizLayout: mergeFieldData({ 
            fieldsLayout, 
            pageFields, 
            fieldList: bizMeta?.fieldList || [],
            authFields: bizMeta?.auth?.fields
        }) 
    };
}

export function createExpressionCalculator (metaName, config, metaInfo) {
    let newConfig = {};
    // 有config代表不属于新建
    if (config) {
        const useRecomputed = metaInfo?.metaFieldDefaultValueSetting?.recomputed;
        const hideRecomputed = metaInfo?.metaFieldDefaultValueSetting?.hideRecomputed;
        newConfig = useRecomputed ? config : { fieldType: ExpressionPass.ComputableType.Ref | ExpressionPass.ComputableType.Expression };
        if (useRecomputed && hideRecomputed) {
            //开了默认值重计算开关并且开启了隐藏的字段也参与默认值计算config传空对象
            delete newConfig.fieldType;
            delete newConfig.fields;
        }
    }
    const calculator = new ExpressionPass.ExpressionCalculator(metaName, newConfig);
    return calculator;
}

//字段是否应该显示
export function checkFieldFilter(showFilter, formData, fieldList) {
    if (showFilter) {
        const filter = toJson(showFilter);
        // 字段筛选条件校验
        if (filter?.conditions?.length !== 0 && filter?.conditions?.[0].left) {
            const res = new FilterExecutor(filter, fieldList, { metaName: formData.metaName || fieldList[0].metaName }).check(_formatBizRecord(formData));
            return res;
        }
    }
    return true;
}
export function _formatBizRecord(formData) {
    let res = {};
    for (let key in formData) {
        let sourceVal = formData[key];
        if (formData[key] !== '') {
            //为了和后台返回兼容，只保留非空串字段
            res[key] = sourceVal;
        }
        if (sourceVal?.defaultItem !== undefined && sourceVal?.id && sourceVal?.name) {
            res[key] = {
                ...res[key],
                path: (sourceVal.path || sourceVal.id).replace(new RegExp('(.*)' + sourceVal.name), '$1').replace(/(.*)\//, '$1'), // source.id
            };
        }
    }
    return res;
}

function handleLayoutShow({ type, item }) {
    if (!(['edit'].includes(type) ? (item.writable && !item.hideInWrite) : item.creatable && !item.hideInCreate)) {
        return false;
    }
    //系统字段，item.name为空的字段过滤不显示。
    return item.name && !item.hidden && (!item.isSys || (item.metaName === 'User' && item.name === 'dept' && type === 'new'));
}

export function needShowWhenNewBizData({ type, item, showConditionInfo }) {
    const layoutShow = handleLayoutShow({ type, item });
    if (layoutShow) {
        if (showConditionInfo) {
            const { showCondition, fieldNameArr, formData, showFilter, fieldList } = showConditionInfo;
            if (showCondition) {
                const res = ExpressionUtil.calculate(showCondition, fieldNameArr, formData, 'Boolean');
                return res;
            }
            if (showFilter) {
                const filter = toJson(showFilter);
                // 字段筛选条件校验
                if (filter?.conditions?.length !== 0 && filter?.conditions?.[0].left) {
                    const res = new FilterExecutor(filter, fieldList, { metaName: formData.metaName || item.metaName }).check(_formatBizRecord(formData));
                    return res;
                }
            }
        }
        return layoutShow;
    }
    return layoutShow;
}
