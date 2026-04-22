import { useCallback } from 'react';

/** 默认排除的 dataIndex（序号列等），不计入有效列 */
const DEFAULT_EXCLUDE_DATA_INDEXES = ['__sn'];

/** 滚动条占宽，均分列宽时从容器宽度中扣除 */
const SCROLLBAR_WIDTH = 10;


// ========================
// 2. columnUtils 相关的逻辑
// ========================

export function isFixedRightColumn({ fixed } = {}) {
    return fixed === 'right';
}

export function isBlankColumn({ key, dataIndex } = {}) {
    return dataIndex === '_blank' || key === '_blank';
}

export function getEffectiveColumnLength(columns, excludeDataIndexes = DEFAULT_EXCLUDE_DATA_INDEXES) {
    if (!Array.isArray(columns) || columns.length === 0) {
        return 0;
    }
    const excludeSet = Array.isArray(excludeDataIndexes) ? excludeDataIndexes : DEFAULT_EXCLUDE_DATA_INDEXES;
    let len = 0;
    for (const column of columns) {
        if (!column || excludeSet.includes(column.dataIndex)) {
            continue;
        }
        const children = column.children;
        if (Array.isArray(children) && children.length > 0) {
            len += getEffectiveColumnLength(children, excludeSet);
        } else {
            len += 1;
        }
    }
    return len;
}

const completeParentFixedProperty = (columns) => {
    const processColumn = (column) => {
        const children = column.children;
        if (!children || !Array.isArray(children) || children.length === 0) {
            return column;
        }
        const processedChildren = children.map(processColumn);
        const firstFixedChild = processedChildren.find(child => child.fixed);
        const needFillFixed = firstFixedChild && !column.fixed;

        return {
            ...column,
            ...(needFillFixed && { fixed: firstFixedChild.fixed }),
            children: processedChildren,
        };
    };
    return columns.map(processColumn);
};

export const completeColumnKeys = (columns, depth = 0, parentPath = '') => {
    if (!columns || !Array.isArray(columns)) {
        return columns;
    }

    return columns.map((column, index) => {
        const newColumn = { ...column };
        const currentPath = parentPath ? `${parentPath}_${index}` : `${index}`;

        const autoKey = `auto_col_d${depth}_i${index}_${currentPath}`;
        newColumn.customKey = autoKey;

        if (!newColumn.key && !newColumn.dataIndex) {
            newColumn.key = autoKey;
            newColumn.dataIndex = autoKey;
        } else if (newColumn.key && !newColumn.dataIndex) {
            newColumn.dataIndex = newColumn.key;
        } else if (!newColumn.key && newColumn.dataIndex) {
            newColumn.key = newColumn.dataIndex;
        }

        if (newColumn.children && Array.isArray(newColumn.children)) {
            newColumn.children = completeColumnKeys(newColumn.children, depth + 1, currentPath);
        }

        return newColumn;
    });
};

export const getWidthCache = (cacheKey) => {
    if (!cacheKey) {
        return null;
    }
    try {
        const cachedData = localStorage.getItem(cacheKey);
        if (!cachedData) {
            return null;
        }
        return JSON.parse(cachedData);
    } catch (error) {
        console.error('Failed to parse width cache:', error);
        return null;
    }
};

export const applyWidthCache = (columns, widthMap) => {
    if (!columns || !Array.isArray(columns) || !widthMap) {
        return columns;
    }

    const applyWidth = (cols, parentKeyPath = []) => {
        return cols.map(column => {
            const newColumn = { ...column };
            if (newColumn.key) {
                const currentKeyPath = [...parentKeyPath, newColumn.key];
                const finalKey = currentKeyPath.join('-');
                if (widthMap[finalKey] !== undefined) {
                    newColumn.width = widthMap[finalKey];
                }
            }
            if (newColumn.children && newColumn.children.length) {
                const newParentPath = newColumn.key ? [...parentKeyPath, newColumn.key] : parentKeyPath;
                newColumn.children = applyWidth(newColumn.children, newParentPath);
            }
            return newColumn;
        });
    };
    return applyWidth(columns);
};

export const fillColumnWidths = (columns, defaultWidth = 120, defaultMinWidth = 64) => {
    if (!columns || !Array.isArray(columns)) {
        return columns;
    }

    const fillWidth = (cols) => {
        return cols.map(column => {
            const newColumn = { ...column };

            if (newColumn.children && newColumn.children.length) {
                newColumn.children = fillWidth(newColumn.children);
                const childrenTotalWidth = newColumn.children.reduce((sum, child) => {
                    return sum + (child.width || defaultWidth);
                }, 0);
                const childrenTotalMinWidth = newColumn.children.reduce((sum, child) => {
                    return sum + (child.minWidth || defaultMinWidth);
                }, 0);

                newColumn.width = childrenTotalWidth;
                newColumn.minWidth = childrenTotalMinWidth;
            } else {
                if (!newColumn.width || typeof newColumn.width !== 'number') {
                    newColumn.width = defaultWidth;
                }
                if (!newColumn.minWidth || typeof newColumn.minWidth !== 'number') {
                    newColumn.minWidth = defaultMinWidth;
                }
            }

            return newColumn;
        });
    };

    return fillWidth(columns);
};

export function getOriginalColumns({
    columns,
    cacheKey
}) {
    if (!columns || !Array.isArray(columns) || columns.length === 0) return [];

    let newColumns = [...columns];

    newColumns = completeParentFixedProperty(newColumns);
    newColumns = completeColumnKeys(newColumns);

    newColumns = applyWidthCache(newColumns, getWidthCache(cacheKey));
    newColumns = fillColumnWidths(newColumns);

    return newColumns;
}


// ========================
// 3. columnBlankUtils 相关的逻辑
// ========================

const BLANK_COLUMN_WIDTH = 120;
const VALID_BLANK_COLUMN_WIDTH = 20;
const MIN_EFFECTIVE_COLUMN_COUNT_FOR_BLANK = 4;
const MIN_TABLE_WIDTH_FOR_BLANK = 824;

const getBlankColumn = (width = BLANK_COLUMN_WIDTH) => {
    return {
        title: '',
        dataIndex: '_blank',
        key: '_blank',
        className: '__noDrop__blank',
        width: Math.max(width, 0),
    }
}

const getTableContainerWidth = (containerRef) => {
    // 兼容 Table 的 ref 获取宽度，通常在 .ant-table 或 nativeElement 上
    // 如果 containerRef.current 是一个 DOM 元素，则直接取 clientWidth
    let targetNode = containerRef?.current;
    
    if (targetNode?.nativeElement) {
        targetNode = targetNode.nativeElement;
    }

    let clientWidth = 0;
    if (targetNode) {
        if (typeof targetNode.querySelector === 'function') {
            const antTableNode = targetNode.querySelector('.ant-table');
            clientWidth = antTableNode?.clientWidth || targetNode.clientWidth || 0;
        } else {
            clientWidth = targetNode.clientWidth || 0;
        }
    }
    
    return clientWidth - SCROLLBAR_WIDTH;
}

const getTotalColumnsWidth = (columns) => {
    return columns.reduce((sum, col) => sum + (col.width || 0), 0);
}

const getTotalNormalColumnsWidth = (cols) => {
    const sumColumnWidth = (col) => {
        if (col.fixed === 'right' || col.key === '__sn') return 0;
        if (col.children?.length) {
            return col.children.reduce((acc, c) => acc + sumColumnWidth(c), 0);
        }
        return col.width || 0;
    };
    return cols.reduce((acc, col) => acc + sumColumnWidth(col), 0);
};

const getScaledColumns = (columns, containerRef) => {
    if (!columns || !Array.isArray(columns) || !containerRef) {
        return columns;
    }
    const tableContainerWidth = getTableContainerWidth(containerRef);
    if (tableContainerWidth <= 0) {
        return columns;
    }
    const totalColumnsWidth = getTotalColumnsWidth(columns);
    if (totalColumnsWidth >= tableContainerWidth) {
        return columns;
    }
    const totalNormalColumnsWidth = getTotalNormalColumnsWidth(columns);
    if (totalNormalColumnsWidth <= 0) {
        return columns;
    }

    const totalSpecialColumnsWidth = totalColumnsWidth - totalNormalColumnsWidth;
    const scale = (tableContainerWidth - totalSpecialColumnsWidth) / totalNormalColumnsWidth;

    const originalWidths = [];
    const collectScalableWidths = (cols) => {
        cols.forEach((col) => {
            if (col.fixed === 'right' || col.key === '__sn') return;
            if (col.children?.length) {
                collectScalableWidths(col.children);
            } else {
                originalWidths.push(col.width || 0);
            }
        });
    };
    collectScalableWidths(columns);

    let remaining = tableContainerWidth - totalSpecialColumnsWidth;
    const newWidths = originalWidths.slice(0, -1).map((w) => {
        const newW = Math.floor(w * scale);
        remaining -= newW;
        return newW;
    });
    if (originalWidths.length > 0) {
        newWidths.push(Math.max(1, remaining));
    }

    let leafIndex = 0;
    const applyNewWidths = (cols) => {
        return cols.map((col) => {
            const newCol = { ...col };
            if (newCol.children?.length) {
                newCol.children = applyNewWidths(newCol.children);
                newCol.width = newCol.children.reduce((s, c) => s + (c.width || 0), 0);
            } else if (newCol.fixed !== 'right' && newCol.key !== '__sn') {
                newCol.width = newWidths[leafIndex++];
            }
            return newCol;
        });
    };

    return applyNewWidths(columns);
}

export const getBlankedColumns = (columnsData, containerRef, cacheKey) => {
    let columns = [...columnsData];
    const tableContainerWidth = getTableContainerWidth(containerRef);

    if (tableContainerWidth && tableContainerWidth > 0 && columns.length > 0) {
        const cacheWidth = getWidthCache(cacheKey);
        const columnsTotalWidth = getTotalColumnsWidth(columns);

        if (!cacheWidth) {
            const effectiveColumnCount = getEffectiveColumnLength(columns);
            if (
                effectiveColumnCount < MIN_EFFECTIVE_COLUMN_COUNT_FOR_BLANK &&
                tableContainerWidth > MIN_TABLE_WIDTH_FOR_BLANK &&
                columnsTotalWidth < tableContainerWidth
            ) {
                const blankColumn = getBlankColumn(BLANK_COLUMN_WIDTH);
                const targetIndex = columns.findIndex(isFixedRightColumn);
                if (targetIndex === -1) {
                    columns.push(blankColumn);
                } else {
                    columns.splice(targetIndex, 0, blankColumn);
                }
            }
            columns = getScaledColumns(columns, containerRef);
            return columns;
        } else {
            const isExistBlankColumn = columns.find(isBlankColumn);
            const totalWidth = columnsTotalWidth - (isExistBlankColumn ? isExistBlankColumn.width : 0);
            const remainingWidth = tableContainerWidth - totalWidth;
            const blankWidth = Math.max(remainingWidth, 0);

            if (isExistBlankColumn) {
                if (blankWidth <= VALID_BLANK_COLUMN_WIDTH) {
                    columns = columns.filter(column => !isBlankColumn(column));
                    return columns;
                } else {
                    columns.find(isBlankColumn).width = blankWidth;
                    return columns;
                }
            }

            if (blankWidth <= VALID_BLANK_COLUMN_WIDTH) return columns;

            const blankColumn = getBlankColumn(blankWidth);
            const targetIndex = columns.findIndex(isFixedRightColumn);
            if (targetIndex === -1) {
                columns.push(blankColumn);
            } else {
                columns.splice(targetIndex, 0, blankColumn);
            }
        }
    }

    return columns;
};


// ========================
// 4. columnResizeUtils 相关的逻辑
// ========================

export const getResizedColumnPath = (columns, key) => {
    if (!columns?.length) return [];

    const dfs = (cols, prePath) => {
        for (let i = 0; i < cols.length; i++) {
            const col = cols[i];
            if (!col) continue;
            const currentPath = [...prePath, i];
            if (col.customKey === key) return currentPath;
            if (col.children?.length) {
                const found = dfs(col.children, currentPath);
                if (found.length) return found;
            }
        }
        return [];
    };

    return dfs(columns, []);
};

export const getResizeWidthedColumns = ({ idxArr, addWidth, settedWidth, columns }) => {
    if (idxArr.length == 0) return [...columns];

    function getFullPathAlongResizedColumn(cols, path) {
        const fullPath = [...path];
        if (!path.length) return fullPath;
        let col = cols[path[0]];
        for (let i = 1; i < path.length && col; i++) {
            col = col.children ? col.children[path[i]] : null;
        }
        while (col && col.children && col.children.length) {
            const lastIdx = col.children.length - 1;
            fullPath.push(lastIdx);
            col = col.children[lastIdx];
        }
        return fullPath;
    }

    const allArrs = getFullPathAlongResizedColumn(columns, idxArr);

    function setcol(cols, arr, idx) {
        const cur = cols[arr[idx]];
        const isResizedColumn = idx === idxArr.length - 1;
        if (isResizedColumn) {
            const baseWidth = typeof cur.width !== 'number' ? settedWidth : cur.width + addWidth;
            cur.width = Math.max(baseWidth, cur.minWidth || 0);
        } else {
            cur.width = Math.max((cur.width || 0) + addWidth, cur.minWidth || 0);
        }
        if (idx < arr.length - 1 && cur.children) {
            setcol(cur.children, arr, idx + 1);
        }
    }
    let newColumns = [...columns];
    setcol(newColumns, allArrs, 0);
    return newColumns;
};

export const persistColumnWidths = (cacheKey, columns) => {
    if (!cacheKey) return;

    const widthMap = {};
    const collectWidths = (cols, parentKeyPath = []) => {
        cols.forEach((column) => {
            if (column.key) {
                const keyPath = [...parentKeyPath, column.key];
                widthMap[keyPath.join('-')] = column.width;
            }
            if (column.children) {
                const nextPath = column.key ? [...parentKeyPath, column.key] : parentKeyPath;
                collectWidths(column.children, nextPath);
            }
        });
    };
    collectWidths(columns);
    localStorage.setItem(cacheKey, JSON.stringify(widthMap));
};

export function useColumnResize({ resizableColumns, setResizableColumns, cacheKey, containerRef }) {
    const handleResize = useCallback(
        (indexArr, minWidth, leafKey, customKey) => (width, addWidth) => {
            const resizedColumnPath = getResizedColumnPath(resizableColumns, customKey);
            const idxArr = resizedColumnPath?.length ? resizedColumnPath : [...indexArr];

            if (minWidth !== undefined && width < minWidth) {
                addWidth = addWidth + (minWidth - width);
                width = minWidth;
            }

            let nextColumns = getResizeWidthedColumns({
                idxArr,
                addWidth,
                settedWidth: width,
                columns: resizableColumns,
            });
            persistColumnWidths(cacheKey, nextColumns);
            nextColumns = getBlankedColumns(nextColumns, containerRef, cacheKey);
            setResizableColumns(nextColumns);
        },
        [resizableColumns, cacheKey]
    );

    return { handleResize };
}


// ========================
// 5. tools 相关的逻辑 (给列绑定 resize 事件)
// ========================

export const addHeaderCellHandler = (column, handleResize, ...indexArr) => {
    if (!column.children) {
        return {
            ...column,
            onHeaderCell: (col) => {
                return {
                    width: col.width,
                    onResize: handleResize(indexArr, col.minWidth, col.key, col.customKey),
                };
            },
        };
    }
    return {
        ...column,
        onHeaderCell: (col) => ({
            width: col.width,
            onResize: handleResize(indexArr, col.minWidth, col.key, col.customKey),
        }),
        children: column.children.map((child, idx) => addHeaderCellHandler(child, handleResize, ...indexArr, idx)),
    };
};

export const addResizeHandlerToColumns = (virtualizedColumns, handleResize) => {
    return virtualizedColumns.map((column, index) => {
        if (column.key === '__virtual_left_placeholder' || 
            column.key === '__virtual_right_placeholder' ||
            column.key === '__sn' ||
            column.key === '_blank' ||
            column.key === 'adapt-column-last') {
            return column;
        }

        return addHeaderCellHandler(column, handleResize, index);
    });
};

// ========================
// 6. scroll 相关的逻辑
// ========================

/**
 * 计算所有列的总宽度
 * @param {Array} columns - 列配置数组
 * @returns {number} 所有列的总宽度
 */
export const calculateTotalWidth = columns => {
    if (!columns || columns.length === 0) {
        return 0;
    }

    return columns.reduce((total, column) => {
        return total + (column.width || 100); // 默认宽度100
    }, 0);
};

/**
 * 获取表格的滚动配置
 * @param {Array} columns - 列配置数组
 * @param {Object} scrollFromProps - 外部传入的 scroll 配置
 * @returns {Object} 组合后的 scroll 配置
 */
export const getTableScrollProp = (columns, scrollFromProps = {}) => {
    return {
        x: calculateTotalWidth(columns),
        scrollToFirstRowOnChange: true,
        ...scrollFromProps,
    };
};

export const getSortMap = (fieldInfo) => {
    const isNumber =
        ['Integer', 'Real', 'Currency', 'Aggregation', 'Percent'].includes(fieldInfo.type) ||
        (fieldInfo.type == 'Expression' && ['Number', 'Currency', 'Percent'].includes(fieldInfo.subType));
    if(isNumber) {
        return { ascend: '按 0-9 排序', descend: '按 9-0 排序' }
    }
    const isDate = fieldInfo.type == 'Date' || fieldInfo.subType == 'Date' || fieldInfo.type == 'Time' || fieldInfo.subType == 'Time';
    if(isDate) {
        return { ascend: '按旧的在前排序', descend: '按新的在前排序' }
    }
    const isText = fieldInfo.type == 'Text' || fieldInfo.subType == 'Text';
    if(isText) {
        return { ascend: '按 a-z 排序', descend: '按 z-a 排序' };
    }
     return { ascend: '升序', descend: '降序' };
}