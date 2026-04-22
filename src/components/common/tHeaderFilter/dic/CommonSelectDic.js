import SelectContent from '../components/SelectContent';

/**
 * 通用选择/业务类型/多选组件
 */
function CommonSelectComponent(props) {

    const { 
        fieldInfo: { type, fieldAttribute, name }, 
        tempCondition,
        lookupBizTypes, bizTypeList, selectKey
    } = props;

    const getOptions = () => {
        if (type !== 'MultiSelect') {
            if (type === 'BizType') {
                const arr = (lookupBizTypes?.length > 0 ? lookupBizTypes : bizTypeList) || [];
                return arr
                    .filter(item => item?.filterAble != 0)
                    .map(item => ({ label: item.label, value: item.id + '' }));
            }
        }
        const arr = (fieldAttribute?.selectItems || []).filter(item => !!item?.label && !!item?.name);
        return arr.map(item => ({ label: item.label, value: item.name }));
    };

    const handleChange = (value, label, isDirectFilter) => {
        const values = value?.length ? {
            op: 'in',
            label: label.join(','),
            right: {
                type: 'value',
                value: value,
                expression: '',
                labels: label
            }
        } : null;
        props.handleChange({ values, isDirectFilter });
    };

    const value = tempCondition?.right?.value || [];

    return (
        <SelectContent value={value} options={getOptions()} onChange={handleChange} />
    );
}

export default {
    match: ({ type }) => ['Select', 'BizType', 'MultiSelect'].includes(type),
    getConditionFns: [
        (value, label, isDirectFilter) => ({
            value,
            label: label.join(','),
            labels: label,
            op: 'in',
            isDirectFilter,
        }),
    ],
    searchIsNull: 1,
    component: CommonSelectComponent,
}
