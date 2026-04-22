import { useCallback, useEffect, useMemo, useState, useRef } from 'react';
import { Pagination } from 'antd';
import BaseTable from 'src/components/common/baseTable/Index';
import ColumnHeader from 'src/components/common/baseTable/TColumnHeader';
import getInitColumnWidthFun, { getShowFields } from './tool';
import renderValue from '../renderValue';
import EditBtn from 'src/components/bizView/newBizBtn/NewBizBtn';
import DelBizBtn from 'src/components/bizView/DelBizBtn';
import BizListHeader from './BizListHeader';
import './bizList.less';

function BizList(props) {
    const {
        records,
        metaInfo,
        batchDelete, 
        refresh, 
        params = {},
        totalCount = 0,
        tableLoading = false,
        selectedRowKeys = [],
        setSelectedRowKeys = () => {},
        tableChange = () => {},
        readOnly = false,
        onRow,
        rowKey: rowKeyProp,
        /** @type {(fieldName: string, value: any, record: any, fieldInfo: any) => import('react').ReactNode|undefined} */
        renderCell,
    } = props;

    const cacheKey = `${metaInfo?.meta?.name || 'biz'}-bizlist`;
    const pinnedStorageKey = `${cacheKey}:pinnedLeftFields`;

    const tableWrapRef = useRef(null);

    const [ scrollY, setScrollY ] = useState(400);

    const [pinnedLeftFields, setPinnedLeftFields] = useState([]);

    const { thConditions = [], sorts = [], page } = params;


    const showFields = useMemo(() => getShowFields(metaInfo), [metaInfo]);

    const normalizePinnedLeftFields = useCallback((list) => {
        const arr = Array.isArray(list) ? list : [];
        const firstName = showFields?.[0]?.name;
        const allowed = new Set((showFields || []).map((f) => f.name));
        const out = [];
        const seen = new Set();
        arr.forEach((name) => {
            if (!name || name === firstName) return;
            if (!allowed.has(name)) return;
            if (seen.has(name)) return;
            seen.add(name);
            out.push(name);
        });
        return out;
    }, [showFields]);

    useEffect(() => {
        try {
            const raw = localStorage.getItem(pinnedStorageKey);
            const parsed = raw ? JSON.parse(raw) : [];
            setPinnedLeftFields(normalizePinnedLeftFields(parsed));
        } catch (e) {
            setPinnedLeftFields([]);
        }
    }, [pinnedStorageKey, normalizePinnedLeftFields]);

    useEffect(() => {
        setPinnedLeftFields((prev) => normalizePinnedLeftFields(prev));
    }, [normalizePinnedLeftFields]);

    useEffect(() => {
        try {
            localStorage.setItem(pinnedStorageKey, JSON.stringify(pinnedLeftFields));
        } catch (e) {}
    }, [pinnedStorageKey, pinnedLeftFields]);

    const handleToggleFixed = useCallback(({ fieldName, pinned }) => {
        if (!fieldName) return;
        setPinnedLeftFields((prev) => {
            const list = Array.isArray(prev) ? prev : [];
            if (pinned) {
                return list.includes(fieldName) ? list : [...list, fieldName];
            }
            return list.filter((n) => n !== fieldName);
        });
    }, []);

    const columns = useMemo(() => {
        const cols = [];
        const baseFirstFieldName = showFields?.[0]?.name;
        const pinnedList = Array.isArray(pinnedLeftFields) ? pinnedLeftFields : [];
        const pinnedListNoFirst = baseFirstFieldName ? pinnedList.filter((n) => n !== baseFirstFieldName) : pinnedList;
        const pinnedSet = new Set(pinnedListNoFirst);
        const nameToField = new Map((showFields || []).map((f) => [f.name, f]));
        const pinnedFieldInfos = pinnedListNoFirst.map((name) => nameToField.get(name)).filter(Boolean);
        const restFieldInfos = (showFields || []).filter((f) => !pinnedSet.has(f.name));
        const orderedFieldInfos = [...pinnedFieldInfos, ...restFieldInfos];

        orderedFieldInfos.forEach((fieldInfo) => {
            const isFirst = fieldInfo?.name === baseFirstFieldName;
            const isPinnedLeft = pinnedSet.has(fieldInfo.name);
            const fixed = isFirst || isPinnedLeft ? 'left' : undefined;
            let colWidth = getInitColumnWidthFun(fieldInfo);
            const n = fieldInfo.name;
            if (n === 'informContent' || n === 'content') colWidth = Math.max(colWidth, 350);
            else if (n === 'subject' || n === 'title') colWidth = Math.max(colWidth, 190);
            else if (n === 'createdOn') colWidth = Math.max(colWidth, 200);
            else if (n === 'isRead' || n === 'informStatus') colWidth = Math.max(colWidth, 70);
            cols.push({
                title: (
                    <ColumnHeader
                        sorts={sorts}
                        setSorts={next => tableChange('sorts', next)}
                        fieldInfo={fieldInfo}
                        thConditions={thConditions}
                        onChange={next => tableChange('thConditions', next)}
                        canToggleFixed={!isFirst}
                        isPinnedLeft={isPinnedLeft}
                        onToggleFixed={handleToggleFixed}
                    />
                ),
                fixed,
                dataIndex: fieldInfo.name,
                key: fieldInfo.name,
                width: colWidth,
                minWidth: 64,
                render: (value, record) => {
                    if (renderCell) {
                        const custom = renderCell(fieldInfo.name, value, record, fieldInfo);
                        if (custom !== undefined) return custom;
                    }
                    return renderValue({ value, record, fieldInfo });
                },
            });
        });
        if (!readOnly) {
            const actionsCol = {
                title: '操作',
                align: 'center',
                fixed: 'right',
                dataIndex: 'actions',
                key: 'actions',
                width: 96,
                minWidth: 82,
                render: (_, record) => (
                    <div className="biz-list-actions">
                        <EditBtn metaInfo={metaInfo} record={record}>编辑</EditBtn>
                        <DelBizBtn record={record} refresh={refresh}>删除</DelBizBtn>
                    </div>
                ),
            };
            cols.push(actionsCol);
        }
        return cols;
    }, [showFields, pinnedLeftFields, thConditions, sorts, metaInfo, refresh, handleToggleFixed, readOnly, renderCell]);

    const resolvedRowKey = rowKeyProp || ((record) => record.code ?? record.id);
    
    useEffect(() => {
        setScrollY((tableWrapRef.current?.clientHeight || 400) - 40);
    }, [selectedRowKeys, totalCount])

    return (
        <div className="biz-list-container">
            {!readOnly ? (
                <BizListHeader
                    selectedRowKeys={selectedRowKeys}
                    setSelectedRowKeys={setSelectedRowKeys}
                    batchDelete={batchDelete}
                />
            ) : null}
            <div className="biz-list-table">
                <div className="biz-list-table-content" ref={tableWrapRef}>
                    <BaseTable
                        loading={tableLoading}
                        cacheKey={cacheKey}
                        columns={columns}
                        dataSource={records || []}
                        pagination={false}
                        rowKey={resolvedRowKey}
                        scroll={{ y: scrollY }}
                        rowSelection={
                            readOnly
                                ? undefined
                                : {
                                      fixed: 'left',
                                      selectedRowKeys,
                                      onChange: (keys) => {
                                          setSelectedRowKeys(keys);
                                      },
                                  }
                        }
                        onRow={onRow}
                    />
                </div>
                {totalCount > 10 ? (
                    <div className="biz-list-pagination">
                        <Pagination
                            size="small"
                            showTotal={(total) => `共 ${total} 条`}
                            showSizeChanger={true}
                            current={page.pageNo}
                            pageSize={page.pageSize}
                            total={totalCount}
                            onChange={(current, pageSize) => tableChange('page', { pageNo: current, pageSize })}
                        />
                    </div>
                ) : null}
            </div>
        </div>
    );
}

export default BizList;
