import { Radio } from 'antd';
import { HEADER } from './consts';

/**
 * 布尔型筛选组件
 */
function BooleanComponent(props) {
    const { tempCondition } = props;

    const value = tempCondition?.right?.value;

    const handleChange = (e) => {
        const value = e.target.value;
        console.log(value, typeof value);
        const values = {
            op: 'eq',
            label: value === 1 ? '已选' : '未选',
            right: {
                type: 'value',
                value,
                expression: ''
            }
        };
        props.handleChange({ values });
    };

    return (
        <Radio.Group onChange={handleChange} value={value}>
            <Radio.Button value={1}>已选</Radio.Button>
            <Radio.Button value={0}>未选</Radio.Button>
        </Radio.Group>
    );
}

export default {
    match: ({ type }) => type === 'Boolean',
    header: HEADER.EQUAL,
    component: BooleanComponent,
}
