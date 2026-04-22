import { Dropdown } from 'antd';
import { CaretDownOutlined } from '@ant-design/icons';
import { ExtraOpType } from '../dic/consts';
import { createTheaderMenu } from 'src/components/common/TheaderMenu/TheaderMenu';

const BlankOpe = ({ onChange, op, useExtraOpe }) => {

    const handleChange = newOp => {
        if (op === newOp) {
             onChange('');
        } else {
             onChange(newOp);
        }
    };

    const items = [
        {
            key: 'isNull',
            text: '仅筛选空白项',
            selected: op === 'isNull',
        },
        {
            key: 'exists',
            text: '仅筛选非空白项',
            selected: op === 'exists',
        },
    ];

    const menu = createTheaderMenu({
        items,
        onClick: ({ key }) => handleChange(key),
    });

    return (
        <Dropdown menu={menu}>
            <span className={`filter-blank-ope ${[ExtraOpType.isNull, ExtraOpType.exists].includes(op) ? 'is-selected' : ''}`}>
                更多
                <CaretDownOutlined />
            </span>
        </Dropdown>
    );
};
export default BlankOpe;
