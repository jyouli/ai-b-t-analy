import { Radio } from 'antd';
import { HEADER } from './consts';

/**
 * 图片/文件存在性筛选组件
 */
function ImageFileComponent(props) {
    const { tempCondition } = props;

    const value = tempCondition?.right?.value;

    const handleChange = (e) => {
        const value = e.target.value;
        const values = {
            op: value === 1 ? 'exists' : 'isNull',
            label: value === 1 ? '有' : '无',
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
            <Radio.Button value={1}>有</Radio.Button>
            <Radio.Button value={0}>无</Radio.Button>
        </Radio.Group>
    );
}

export default {
    match: ({ type }) => ['Image', 'File'].includes(type),
    header: HEADER.EQUAL,
    component: ImageFileComponent,
}
