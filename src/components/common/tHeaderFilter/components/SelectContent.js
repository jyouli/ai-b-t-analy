import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Checkbox, Input } from 'antd';
import './SelectContent.less';

const CheckboxGroup = Checkbox.Group;

/**
 * SelectContent
 * 通用选择内容组件：支持搜索、全选、仅筛选此项（用于 tHeaderFilter）
 * @param {Object} props - 组件参数
 * @param {Array} [props.value=[]] - 选中值数组
 * @param {Array} [props.options=[]] - 选项数组，形如 { label, value }
 * @param {Function} props.onChange - 变更回调 (valueArr, labelArr, isDirectFilter)
 * @returns {import('react').ReactElement}
 */
function SelectContent(props) {
    const { value = [], options = [], onChange } = props;
    const [searchValue, setSearchValue] = useState('');
    const [newOptions, setNewOptions] = useState([]);

    const normalizedValue = useMemo(() => (Array.isArray(value) ? value : []), [value]);

    /**
     * changeOptions
     * 打开筛选器弹框/清空内容时，将已选项排到前面
     * @returns {void}
     */
    const changeOptions = useCallback(() => {
        const selectedOptions = normalizedValue?.length
            ? (options || []).filter((item) => normalizedValue.includes(item.value))
            : [];
        const restOptions = (options || []).filter((item) => !normalizedValue.includes(item.value));
        setNewOptions(selectedOptions?.length ? selectedOptions.concat(restOptions) : options || []);
    }, [normalizedValue, options]);

    useEffect(() => {
        changeOptions();
    }, [changeOptions]);

    /**
     * handleSearch
     * 搜索内容变更；清空时重置选项排序
     * @param {string} nextSearchValue - 搜索内容
     * @param {Object} [event] - 事件对象
     * @returns {void}
     */
    const handleSearch = useCallback((nextSearchValue = '', event) => {
        if (!nextSearchValue && event?.type === 'click') {
            changeOptions();
        }
        setSearchValue(nextSearchValue);
    }, [changeOptions]);

    /**
     * handleSelect
     * 勾选变更，透传已选 value 与 label
     * @param {Array} nextValue - 勾选后的 value 数组
     * @returns {void}
     */
    const handleSelect = useCallback((nextValue) => {
        const set = new Set(nextValue || []);
        const label = (options || []).reduce((arr, op) => {
            if (set.has(op.value)) {
                arr.push(op.label);
            }
            return arr;
        }, []);
        onChange?.(nextValue || [], label, false);
    }, [onChange, options]);

    /**
     * onCheckAllChange
     * 全选/反选当前搜索过滤后的选项（只影响当前过滤集合）
     * @param {boolean} checked - 是否勾选全选
     * @returns {void}
     */
    const onCheckAllChange = useCallback((checked) => {
        const filterOptions = (options || []).filter((item) => (item?.label || '').includes(searchValue));
        let newValue = (normalizedValue || []).slice();
        if (checked) {
            filterOptions.forEach((item) => {
                if (!newValue.includes(item.value)) {
                    newValue.push(item.value);
                }
            });
        } else {
            newValue = newValue.filter((v) => {
                if (filterOptions.find((a) => a.value === v)) {
                    return false;
                }
                return true;
            });
        }
        const labels = (options || []).filter((option) => newValue.includes(option.value)).map((o) => o.label);
        onChange?.(newValue, labels, false);
    }, [normalizedValue, onChange, options, searchValue]);

    /**
     * handleOnlySelectCurItem
     * 仅筛选当前项：直接回传单个 value，并标记为 direct filter
     * @param {Object} event - 鼠标事件
     * @param {Object} selectItem - 当前项 { value, label }
     * @returns {boolean}
     */
    const handleOnlySelectCurItem = useCallback((event, selectItem) => {
        const { value: v, label } = selectItem || {};
        onChange?.([v], [label], true);
        event?.stopPropagation?.();
        event?.preventDefault?.();
        event?.nativeEvent?.stopImmediatePropagation?.();
        return false;
    }, [onChange]);

    /**
     * getCheckboxStatus
     * 根据当前过滤列表计算全选 checkbox 的 checked/indeterminate
     * @param {Array} showOptions - 当前展示 options
     * @returns {{checked: boolean, indeterminate: boolean}}
     */
    const getCheckboxStatus = useCallback((showOptions) => {
        const allValue = (showOptions || []).map((item) => item.value);
        const existCount = allValue.filter((item) => (normalizedValue || []).includes(item)).length;
        const result = { checked: false, indeterminate: false };
        if (allValue.length === 0) {
            return result;
        }
        if (existCount === allValue.length) {
            result.checked = true;
        } else if (existCount === 0) {
            return result;
        } else {
            result.indeterminate = true;
        }
        return result;
    }, [normalizedValue]);

    const filterOptions = useMemo(() => {
        return (newOptions || []).filter((item) => (item?.label || '').includes(searchValue || ''));
    }, [newOptions, searchValue]);

    const { indeterminate, checked } = useMemo(() => getCheckboxStatus(filterOptions), [filterOptions, getCheckboxStatus]);

    return (
        <div className="select-content-div-container">
            <span style={{ fontSize: '12px', display: 'inline-block' }}>{`已选中 ${(normalizedValue || []).length} 项`}</span>
            <Input.Search
                placeholder="搜索"
                value={searchValue}
                onSearch={(v, event) => handleSearch(v, event)}
                onChange={(e) => handleSearch(e.target.value, e)}
                style={{ width: '100%' }}
                allowClear
            />
            <div className="site-checkbox-all-wrapper theaderFilter-check">
                <Checkbox
                    indeterminate={indeterminate}
                    onChange={(e) => onCheckAllChange(e.target.checked)}
                    checked={checked}
                >
                    全选
                </Checkbox>
                <CheckboxGroup style={{ width: '100%' }} onChange={(v) => handleSelect(v)} value={normalizedValue}>
                    {(newOptions || []).map((item) => {
                        const isHidden = searchValue && !(item?.label || '').includes(searchValue);
                        return (
                            <Checkbox value={item?.value} key={item?.value} className={`select-content-option${isHidden ? ' hidden' : ''}`} data-hidden={isHidden}>
                                <span className="select-content">
                                    <span>{item?.label}</span>
                                    <span className="only-select-cur-item" onClick={(e) => handleOnlySelectCurItem(e, item)}>
                                        仅筛选此项
                                    </span>
                                </span>
                            </Checkbox>
                        );
                    })}
                </CheckboxGroup>
            </div>
        </div>
    );
}

export default SelectContent;
