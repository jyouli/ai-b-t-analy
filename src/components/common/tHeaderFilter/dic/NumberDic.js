import NumberContent from '../components/NumberContent';
import { HEADER, VALUE_HUB } from './consts';

/**
 * 数值类筛选组件
 */
function NumberComponent(props) {
    const { fieldInfo, tempCondition } = props;

    const { type, subType } = fieldInfo || {};

    const showPercent = [type, subType].includes('Percent');

    const precision = fieldInfo?.fieldAttribute?.decimal || 0;

    const hub = [type, subType].includes('Percent') ? VALUE_HUB.Percent : a => a;

    const { realValue = [null, null] } = tempCondition?.right || {};

    const conditionHub = (realValue) => {
         const [small, big] = realValue || [];
         if (small === null && big === null) {
            return null;
         }
         if (small === big) {
            return {
                right: { 
                    type: 'value', 
                    value: hub(small), 
                    realValue, 
                    expression: '' 
                },
                op: 'eq',
                label: `等于${small}${showPercent ? '%' : ''}`,
            };
        }
        if (small === null) {
            return {
                right: { 
                    type: 'value', 
                    value: hub(big), 
                    realValue, 
                    expression: '' 
                },
                op: 'lte',
                label: `小于等于${big}${showPercent ? '%' : ''}`,
            };
        }
        if (big === null) {
            return {
                right: { 
                    type: 'value', 
                    value: hub(small), 
                    realValue, 
                    expression: '' 
                },
                op: 'gte',
                label: `大于等于${small}${showPercent ? '%' : ''}`,
            };
        }
        return {
            right: { 
                type: 'value', 
                value: (realValue || []).map(hub), 
                realValue, 
                expression: '' 
            },
            op: 'bte',
            label: showPercent ? (realValue || []).map(v => `${v}%`).join('-') : (realValue || []).join('-'),
        };
    }

    const handleChange = (number, index) => {
        realValue[index] = number;
        const values = conditionHub(realValue);
        props.handleChange({ values });
    }

    return (
        <NumberContent
            handleNumber={handleChange}
            showPercent={showPercent}
            precision={precision}
            value={realValue}
        />
    );
}

export default {
    match: ({ type, subType }) =>
        ['Integer', 'Real', 'Currency', 'Aggregation', 'Percent'].includes(type) ||
        (type === 'Expression' && ['Number', 'Currency', 'Percent'].includes(subType)) ||
        (type === 'TopAggregation' && ['Number', 'Currency', 'Percent'].includes(subType)),

    validate: value => {
        if(Array.isArray(value)) {
            return value?.every(v => typeof v == 'number');
        } 
        if(typeof value == 'number') {
            return true;
        }
        return false;
    },

    searchIsNull: 1,

    header: HEADER.NUMBER_RAGE,

    component: NumberComponent,
}
