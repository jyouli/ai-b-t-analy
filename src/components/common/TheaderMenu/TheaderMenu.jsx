import React from 'react';

/**
 * 下拉菜单 label（带选中态与可选左侧图标）。
 */
export function TheaderMenuLabel(props) {
    const {
        text,
        selected = false,
        leftIcon,
        className = '',
        style,
    } = props || {};

    return (
        <span
            className={`theader-menu${selected ? ' is-selected' : ''}${className ? ` ${className}` : ''}`}
            style={style}
        >
            <span className="theader-menu-text">
                {leftIcon}
                {text}
            </span>
            {selected ? <i className="icon-yiwancheng theader-menu-check" /> : null}
        </span>
    );
}

/**
 * 将简化配置转换为 antd Dropdown 的 menu.items。
 * 支持 divider：{ type: 'divider' }
 * 支持 label item：{ key, text, selected, leftIcon, disabled, danger }
 */
export function createTheaderMenuItems(items) {
    const safeItems = Array.isArray(items) ? items : [];

    return safeItems.map((item) => {
        if (!item || item.type === 'divider') {
            return { type: 'divider' };
        }

        const { key, text, selected, leftIcon, ...rest } = item;

        return {
            key,
            ...rest,
            label: (
                <TheaderMenuLabel
                    text={text}
                    selected={selected}
                    leftIcon={leftIcon}
                />
            ),
        };
    });
}

/**
 * 创建 antd Dropdown 的 menu 对象。
 */
export function createTheaderMenu(config) {
    const { items, onClick } = config || {};
    return {
        items: createTheaderMenuItems(items),
        onClick,
    };
}

