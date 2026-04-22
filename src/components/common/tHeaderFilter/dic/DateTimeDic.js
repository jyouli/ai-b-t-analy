import DateTimeContent from '../components/dateContent/Index';

const DATE_TIME_PICKER = {
    D: 'date',
    M: 'month',
    Y: 'year',
    Q: 'quarter',
    W: 'week',
};

function DateTimeComponent(props) {
    const { tempCondition, fieldInfo, confirm } = props;

    const { type, subType, fieldAttribute } = fieldInfo ?? {};
    
    const { op, right, label, clickItem = {} } = tempCondition || {};

    const { expression, value } = right || {};

    const setTimeState = data => {
        const { tempCondition } = data || {};
        let curClickItem = data.clickItem || clickItem || {};
        const right = {
            type: tempCondition.type,
            value: tempCondition.value,
            expression: tempCondition.expression
        };
        if(curClickItem?.mode) {
            right.mode = curClickItem.mode;
        }
        if(curClickItem.value !== 'customize') {
            right.type = 'expression';
        }
        const values =  {
            op: tempCondition.op,
            clickItem: curClickItem,
            label: tempCondition.label,
            right
        };
        props.handleChange({ values });
    };

    const cwcDateTimeContentProps = {
        clickItem,
        picker: DATE_TIME_PICKER[fieldInfo?.fieldAttribute?.dateFormatType || 'D'],
        value,
        type,
        label,
        subType,
        originTempCondition: { ...right, op, label },
        tempCondition: { expression, value, op },
        dateFormatType: fieldAttribute?.dateFormatType,
        setTimeState,
    };
    return (
        <DateTimeContent 
            multiTabUuid={props.multiTabUuid} 
            cwcDateTimeContentProps={cwcDateTimeContentProps}
        />
    );
}

export default {
    match: ({ type, subType }) => ['Date', 'Time'].includes(type) || ['Date', 'Time'].includes(subType),
    searchIsNull: 1,
    errorMsgHub: function (value) {
        return value[0] && value[1] && value[0] > value[1] ? '开始时间不能大于结束时间' : '';
    },
    validate: function (value, tempCondition) {
        const temp = { ...(tempCondition?.right || {}), op: tempCondition?.op };
        let isLegals = [];
        if (Array.isArray(value)) {
            for (const item of value) {
                isLegals.push(!!item);
            }
        }
        return !!temp?.expression || (isLegals.length && isLegals.every(v => v)) || (temp?.op == 'upTo' && value?.[1]);
    },
    header: '',
    component: DateTimeComponent,
};
