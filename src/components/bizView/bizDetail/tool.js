export function getDetailLayout(metaInfo, bizData) {
    const bizType = bizData?.bizType;
    let curBizType = metaInfo.metaBizTypes.find(item => item.objId == bizType);
    if (!curBizType) {
        curBizType = metaInfo.metaBizTypes.find(item => item.name === 'defaultBizType');
    }
    const curLayoutId = curBizType?.layoutId;
    let layoutDetail = (metaInfo.metaLayouts || []).find(item => item.objId == curLayoutId);
    if (!layoutDetail) {
        layoutDetail = metaInfo.metaLayouts[0];
    }
    return layoutDetail;
}

export function getPageLayout(metaInfo, bizData) {
    const layoutDetail = getDetailLayout(metaInfo, bizData);
    let pageFieldIds = [];
    let layoutFieldsColNum = 2;
    if (layoutDetail?.layoutWebFields) {
        pageFieldIds = layoutDetail?.layoutWebFields ? JSON.parse(layoutDetail.layoutWebFields).fieldsLayout : [];
        layoutFieldsColNum = layoutDetail?.layoutWebFields ? JSON.parse(layoutDetail.layoutWebFields).layoutFieldsColNum : 2;
    } else {
        pageFieldIds = layoutDetail?.layoutFields ? JSON.parse(layoutDetail.layoutFields).fieldsLayout : [];
        layoutFieldsColNum = layoutDetail?.layoutFields ? JSON.parse(layoutDetail.layoutFields).layoutFieldsColNum : 2;
    }
    const pageFields = layoutDetail.webFields || layoutDetail.fields;
    return { pageFieldIds, layoutFieldsColNum, pageFields };
}

export function getSpanCol({ fieldItem, colNum, order = 0 }) {
    if (fieldItem.spanColNum === 2) return 24;
    if (order == 2) return 12;
    return (fieldItem.spanNumInDetail || (colNum ? 12 / colNum : 6)) * 2;
}

export function getNumberFieldUnitTitle(item) {
    if (
        ['Integer', 'Currency', 'Real', 'Aggregation'].includes(item.type) ||
        (item.type === 'Expression' && ['Currency', 'Number'].includes(item.subType))
    ) {
        return item?.fieldAttribute?.unit ? '(' + item.fieldAttribute.unit + ')' : '';
    }
    return '';
}
