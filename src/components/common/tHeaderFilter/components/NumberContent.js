import React, { useCallback } from 'react';
import { InputNumber } from 'antd';

const MAX = 1000000000000000;

/**
 * NumberContentInput
 * 数值范围输入的单个输入框
 * @param {Object} props - 组件参数
 * @param {number} [props.precision=0] - 小数位
 * @param {boolean} [props.showPercent=false] - 是否展示百分号
 * @param {boolean} [props.disabled=false] - 是否禁用
 * @param {Array} props.value - 当前值数组 [from, to]
 * @param {Function} props.handleNumber - 值变更回调 (v, index)
 * @param {number} props.index - 当前输入框索引 0/1
 * @returns {React.ReactElement}
 */
function NumberContentInput({
    precision = 0,
    showPercent = false,
    disabled = false,
    value,
    handleNumber,
    index,
}) {
    const handleChange = useCallback((v) => handleNumber(v, index), [handleNumber, index]);

    return (
        <div style={{ display: 'flex', alignItems: 'center', position: 'relative', width: '120px' }}>
            <InputNumber
                max={MAX}
                min={-MAX}
                placeholder="请输入"
                precision={precision}
                value={value?.[index]}
                disabled={disabled}
                onChange={handleChange}
                style={{ width: '100%', paddingRight: showPercent ? 20 : undefined }}
            />
            {showPercent ? (
                <span style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)' }}>
                    %
                </span>
            ) : null}
        </div>
    );
}

/**
 * NumberContent
 * 数值范围筛选内容组件
 * @param {Object} props - 组件参数
 * @param {Function} props.handleNumber - 值变更回调 (v, index)
 * @param {boolean} props.showPercent - 是否展示百分号
 * @param {number} props.precision - 小数位
 * @param {boolean} props.disabled - 是否禁用
 * @param {Array} props.value - 当前值数组 [from, to]
 * @returns {React.ReactElement}
 */
function NumberContent({
    handleNumber,
    showPercent,
    precision,
    disabled,
    value,
}) {
    const prop = {
        showPercent,
        precision,
        value,
        handleNumber,
    };

    return (
        <div className="number-content-wrap">
            <NumberContentInput {...prop} index={0} key="from" disabled={disabled} />
            <span style={{ margin: '0 4px', display: 'inline-block', height: '28px', lineHeight: '28px', width: '8px' }}>
                -
            </span>
            <NumberContentInput {...prop} index={1} key="to" disabled={disabled} />
        </div>
    );
}

export default NumberContent;
