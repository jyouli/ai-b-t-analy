import { Input } from 'antd';
import { HEADER } from './consts';

/**
 * 文本类筛选组件
 */
function TextComponent(props) {
    const { fieldInfo: { type, subType }, tempCondition } = props;

    const constructorFilterOp = ({ type, subType }, content, originOp = 'ct') => {
        const chansferOpMap = {
            ct: 'match',
            nct: 'nMatch',
        };
        if (!['ct', 'nct'].includes(originOp)) {
            return originOp;
        }
        let newOp = originOp;
        //所有文本类型字段
        if (type == 'Text' || subType == 'Text' || type == 'AutoCode' || type == 'Location') {
            //排除多行文本，单行文本（含编号）：只含符号｜只含英文和数字，改成match
            if (type != 'Expression') {
                if (/^[a-zA-Z0-9]+$/.test(content) || /^[~!@#$%^&*()_+`\-={}:";'<>?,./ 、|\\\[\]——……（）！￥]+$/.test(content)) {
                    newOp = chansferOpMap[originOp];
                }
            }
        }
        return newOp;
    }

    const handleChange = (e) => {
        const realValue = e.target.value || '';
        const trimmed = realValue.trim();
        const values = {
            op: constructorFilterOp({ type, subType }, realValue),
            label: HEADER.CONTAIN + trimmed,
            right: {
                type: 'value',
                value: trimmed,
                realValue,
                expression: '',
            }
        };
        props.handleChange({ values });
    }

    const value = tempCondition?.right?.realValue ?? tempCondition?.right?.value ?? '';

    return (
        <Input onChange={handleChange} value={value} placeholder="关键字" allowClear />
    );
}

export default {
    match: ({ type, subType }) =>
        (type === 'Text' && ['Short', 'Text', 'Phone', 'Email', 'URL', 'Long'].includes(subType)) ||
        ['AutoCode', 'Location'].includes(type) ||
        (['Expression', 'TopAggregation'].includes(type) && subType === 'Text'),
    searchIsNull: 1,
    validate: value => value && value.trim(),
    header: HEADER.CONTAIN,
    component: TextComponent,
}
