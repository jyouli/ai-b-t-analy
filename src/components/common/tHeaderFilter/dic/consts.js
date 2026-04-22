
export const HEADER = {
    INCLUDE: '包括',
    EQUAL: '等于',
    CONTAIN: '包含',
    CONTAIN_AND_SUB: '包括（含子集）',
    NUMBER_RAGE: '数值范围',
};

export function String2Array(value) {
    if (Array.isArray(value)) {
        return value;
    }
    if (value === null || value === undefined) {
        return [];
    }
    if (typeof value === 'string') {
        const trimmed = value.trim();
        if (trimmed === '') {
            return [];
        }
        return trimmed.split(',').filter(v => v !== '');
    }
    return [];
}

export const VALUE_HUB = {
    String2Array,
    Array2String: value => (Array.isArray(value) ? value.join(',') : value),
    Percent: value => value / 100,
};

export const SearchIsNullType = {
    NoCondition: 0,
    OrCondition: 1,
    EitherConditon: 2,
};

export const ExtraOps = ['isNull', 'exists', 'blank'];

export const DirectlyExtraOp = ['isNull', 'exists'];

export const ExtraOpType = {
    isNull: 'isNull',
    exists: 'exists',
    blank: 'blank',
};

export const ExtraOpLabel = {
    isNull: '[仅筛选空白项]',
    exists: '"[仅筛选非空白项]',
    blank: '[空白项]',
};

export const ExtraOpeShowType = {
    Only: 'only',
    Show: true,
    Hide: false,
};

export const Right = {
    type: 'value',
    value: '',
};

export const IsNullCondition = {
    label: ExtraOpLabel.isNull,
    op: 'isNull',
    right: {
        ...Right,
        extraOp: ExtraOpType.isNull,
    },
};
export const ExistsCondition = {
    label: ExtraOpLabel.exists,
    op: 'exists',
    right: {
        ...Right,
        extraOp: ExtraOpType.exists,
    },
};

export const BlankCondition = {
    label: ExtraOpLabel.blank,
    op: 'isNull',
    right: {
        ...Right,
        extraOp: ExtraOpType.blank,
    },
};

export const ExtraOpCondition = {
    isNull: IsNullCondition,
    exists: ExistsCondition,
    blank: BlankCondition,
};
