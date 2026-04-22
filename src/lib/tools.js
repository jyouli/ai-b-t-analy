import { warningModal } from 'src/components/common/Modal/confirmModal';

export function toThousands(num) {
    if (!num && num !== 0) {
        return '';
    }
    num = num + '';
    const reg = /\d{1,3}(?=(\d{3})+$)/g;
    let intNum = '';
    let decimalNum = '';
    if (num.indexOf('.') > -1) {
        intNum = num.substring(0, num.indexOf('.'));
        decimalNum = num.substring(num.indexOf('.') + 1, num.length);
        return (intNum + '').replace(reg, '$&,') + '.' + decimalNum;
    } else {
        return (num + '').replace(reg, '$&,');
    }
}



export function mergeFilter(filter, conditions) {
    const baseFilter = filter && typeof filter === 'object' ? filter : {};
    const baseConditions = Array.isArray(baseFilter.conditions) ? baseFilter.conditions : [];
    const extraConditions = Array.isArray(conditions) ? conditions : [];

    if (extraConditions.length === 0) {
        return {
            ...baseFilter,
            conditions: baseConditions,
        };
    }

    const usedKeys = new Set();
    baseConditions.forEach((item) => {
        if (item?.key !== undefined && item?.key !== null && item?.key !== '') {
            usedKeys.add(Number(item.key));
        }
    });
    extraConditions.forEach((item) => {
        if (item?.key !== undefined && item?.key !== null && item?.key !== '') {
            usedKeys.add(Number(item.key));
        }
    });
    let nextKey = usedKeys.size > 0 ? Math.max(...Array.from(usedKeys)) + 1 : 1;

    const normalizedExtraConditions = extraConditions.map((item) => {
        if (item?.key !== undefined && item?.key !== null && item?.key !== '') {
            return item;
        }
        const withKey = { ...item, key: nextKey };
        nextKey += 1;
        return withKey;
    });

    const groupMap = new Map();
    normalizedExtraConditions.forEach((item) => {
        const fieldPath = item?.left?.value || item?.field?.name || '__unknown_field__';
        if (!groupMap.has(fieldPath)) {
            groupMap.set(fieldPath, []);
        }
        groupMap.get(fieldPath).push(item);
    });

    const extraExprList = [];
    groupMap.forEach((groupItems) => {
        if (!groupItems || groupItems.length === 0) return;

        const hasIsNull = groupItems.some((item) => item?.op === 'isNull');
        const orderedItems = hasIsNull
            ? [
                ...groupItems.filter((item) => item?.op === 'isNull'),
                ...groupItems.filter((item) => item?.op !== 'isNull'),
            ]
            : groupItems;
        const keys = orderedItems.map((item) => String(item.key));

        if (keys.length === 1) {
            extraExprList.push(keys[0]);
            return;
        }

        const joiner = hasIsNull ? ' or ' : ' and ';
        extraExprList.push(`(${keys.join(joiner)})`);
    });

    const extraExpr = extraExprList.join(' and ');
    const baseExpr = (baseFilter.expr || '').trim();

    let mergedExpr = baseExpr;
    if (extraExpr) {
        if (baseExpr) {
            mergedExpr = `(${baseExpr}) and (${extraExpr})`;
        } else {
            mergedExpr = extraExpr;
        }
    }

    return {
        ...baseFilter,
        conditions: [...baseConditions, ...normalizedExtraConditions],
        expr: mergedExpr,
        conj: mergedExpr ? 'advance' : baseFilter.conj,
    };
}

export const deleteErrorHandle = ({ isBatch, failureList, successList, onOk }) => {
    warningModal({
        title: isBatch
            ? `成功删除${(successList?.length || 0)}项，无法删除${failureList.length}项`
            : '删除失败',
        width: 700,
        content: (
            <>
                <Alert description="可能由于数据权限范围等原因无法删除数据" type='warning' showIcon />
                <Table
                    size='small'
                    columns={[{ title: '删除失败项', dataIndex: 'name', key: '删除失败项' }]}
                    dataSource={failureList}
                    scroll={{ y: 400 }}
                />
            </>
        ),

        onOk,
    });
}

export function toJson (jsonStr, defaultData = {}) {
    if (jsonStr) {
        try {
            return typeof jsonStr === 'string' ? JSON.parse(jsonStr) : jsonStr;
        } catch (e) {
            return jsonStr;
        }
    } else {
        return defaultData;
    }
}
