import FilterRegionCascade from 'src/components/common/FilterRegionCascade/FilterRegionCascade';
import { HEADER } from './consts';

function DistrictComponent(props) {
    const { tempCondition, fieldInfo: { name, metaName } } = props;

    const handleChange = (value, label) => {
        const index = value?.length - 1;
        const districtType = ['province', 'city', 'district'][index];
        const values = !!value?.length ? {
            op: 'eq',
            label,
            left: {type: 'field', value: `${metaName}.${name}.${districtType}` },
            right: {
                type: 'value',
                value: value[index],
                expression: value,

            }
        } : null
        props.handleChange({ values });
    };

    const value = tempCondition?.right || { expression: [] };

    return (
        <FilterRegionCascade multiTabUuid={props.multiTabUuid} value={value} disabled={false} cascadeChange={handleChange} />
    );
}

export default {
    match: ({ type }) => type === 'District',
    validate: value => !value.expression,
    searchIsNull: 1,
    header: HEADER.EQUAL,
    component: DistrictComponent,
}
