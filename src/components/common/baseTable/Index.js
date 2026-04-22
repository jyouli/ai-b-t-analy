import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Table } from 'antd';
import ResizeableTh from './resizeableTh/ResizeableTh';
import './baseTable.less';

// 引入表格相关功能工具函数
import { 
    getOriginalColumns, 
    getBlankedColumns, 
    useColumnResize, 
    addResizeHandlerToColumns,
    getTableScrollProp
} from './tableUtils';

const defaultColumns = [];

/**
 * 基础表格组件，支持列宽拖拽、空白补位
 * @param {Object} props - 组件属性
 * @returns {React.ReactElement}
 */
export default function BaseTable(props) {
    const { 
        cacheKey, 
        columns = defaultColumns, 
        components, 
        scroll,
        ...restProps 
    } = props;

    const tableRef = useRef(null);
    const [resizableColumns, setResizableColumns] = useState([]);

    // 1. 初始化和处理列配置 (均分、空白列)
    useEffect(() => {
        // 获取原始列（包含宽度缓存、均分等）
        const originalColumns = getOriginalColumns({ 
            columns, 
            cacheKey
        });

        // 获取“空白化”处理后的列
        const blankedColumns = getBlankedColumns(originalColumns, tableRef, cacheKey);
        
        setResizableColumns(blankedColumns);
    }, [columns, cacheKey]);

    // 2. 列宽拖拽 Hook
    const { handleResize } = useColumnResize({ 
        resizableColumns, 
        setResizableColumns, 
        cacheKey, 
        containerRef: tableRef 
    });

    // 3. 为列注入 resize 处理器
    const processedColumns = useMemo(() => {
        if (!resizableColumns || resizableColumns.length === 0) return [];
        return addResizeHandlerToColumns(resizableColumns, handleResize);
    }, [resizableColumns, handleResize]);

    // 4. 计算表格的滚动配置 scrollProp
    const scrollProp = useMemo(() => {
        return getTableScrollProp(processedColumns, scroll);
    }, [processedColumns, scroll]);

    // 5. 替换默认表头单元格
    const customComponents = {
        ...components,
        header: {
            ...components?.header,
            cell: p => ResizeableTh(p, tableRef),
        },
    };

    return (
        <Table
            className={`base-table-container ${restProps.className || ''}`}
            ref={tableRef}
            components={customComponents}
            columns={processedColumns}
            scroll={scrollProp}
            listItemHeight={36}
            {...restProps}
        />
    );
}
