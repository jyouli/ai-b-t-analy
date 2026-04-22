import React, { useEffect, useState } from 'react';
import { connect } from 'dva';
import { message } from 'antd';
import BizList from 'src/components/bizView/bizList/BizList';
import ThrottledInput from 'src/components/common/throttledInput/ThrottledInput';
import { SearchOutlined } from '@ant-design/icons';
import AiCreateBtn from 'src/components/bizView/newBizBtn/AiCreateBtn';
import EditBtn from 'src/components/bizView/newBizBtn/NewBizBtn';
import SpinSkeleton from 'src/components/common/SpinSkeleton/SpinSkeleton';
import { confirmModal } from 'src/components/common/Modal/confirmModal';
import { mergeFilter, deleteErrorHandle } from 'src/lib/tools';

/**
 * 关联企业列表（支持筛选/排序/分页）。
 */
function RelativeList(props) {
    const { metaName, dispatch, loading, currentCompany } = props;

    const pageSizeStorageKey = `${metaName || 'biz'}-bizlist:pageSize`;

    const getCachedPageSize = () => {
        return Number(localStorage.getItem(pageSizeStorageKey) || 20);
    }

    const [params, setParams] = useState({
        page: { pageNo: 1, pageSize: getCachedPageSize() },
        sorts: [],
        thConditions: [],
    });

    const [searchKey, setSearchKey] = useState('');
    const [selectedRowKeys, setSelectedRowKeys] = useState([]);

    const [metaInfo, setMetaInfo] = useState();
    const [records, setRecords] = useState([]);
    const [totalCount, setTotalCount] = useState(0);

    const { thConditions, sorts, page } = params;

    const getDefaultSorts = (bizInfo) => {
        const defaultLayout = bizInfo?.listLayout?.[0] || {};
        return [{ 
            field: defaultLayout.defaultSortField ?? 'createdOn', 
            orderType: defaultLayout.defaultSortType ?? 0 
        }];
    }

    const getMetaInfo = () => {
        dispatch({
            type: 'common/getMetaAllDetail',
            payload: { metaName },
            callback: (data) => {
                setMetaInfo(data);
                setSearchKey('');
                setParams((prev) => ({ ...prev, sorts: getDefaultSorts(data) }));
            }
        })
    }

    useEffect(getMetaInfo, []);

    const batchDeleteBizData = (codeList) => {
         confirmModal({
            title: "删除",
            content: `确认删除选中${codeList.length}项吗？`,
            onOk: () => {
                dispatch({
                    type: 'common/batchDeleteBizData',
                    payload: {
                        metaName: metaInfo?.meta?.name,
                        codeList: codeList,
                    },
                    callback: (data) => {
                        setTimeout(() => refresh(), 500);
                        if (data.failure.length === 0) {
                            message.success(`已成功删除${data.success.length}项数据`);
                        } else {
                            deleteErrorHandle({
                                failureList: data.failure,
                                successList: data.success,
                                isBatch: true,
                                onOk: () => setTimeout(() => refresh(), 1000),
                            });
                        }
                    }
                })  
            }
        })
    }

    const getList = () => {
        const baseFilter = {
            conditions: [
                {
                    key: 1,
                    left: { type: 'field', value: `${metaName}.company` },
                    right: { type: 'value', value: currentCompany?.code },
                    op: 'in',
                }
            ],
            conj: 'advance',
            expr: '1'
        }
        const filter = mergeFilter(baseFilter, thConditions || []);
        dispatch({
            type: 'common/getBizList',
            payload: {
                meta: { metaName },
                keyWord: (searchKey || '').trim(),
                page,
                sorts,
                filter,
            },
            callback: (data, total) => {
                setRecords(data || []);
                setTotalCount(total || 0);
                setSelectedRowKeys([]);
            }
        })
    }

    useEffect(() => {
        if (!metaInfo) {
            return;
        }
        getList();
    }, [metaInfo, page, sorts, thConditions, searchKey, currentCompany]);

    const refresh = () => {
        setSearchKey('');
        setParams((prev) => ({ ...prev, page: { ...prev.page, pageNo: 1 } }));
    }

    const tableChange = (key, nextValue) => {
        setParams((prev) => {
            if (key === 'page') {
                const prevPage = prev?.page || {};
                const isPageSizeChanged = nextValue.pageSize !== undefined && nextValue.pageSize !== prevPage.pageSize;
                if (isPageSizeChanged) {
                    localStorage.setItem(pageSizeStorageKey, String(nextValue.pageSize));
                }
                return {
                    ...prev,
                    page: {
                        ...prevPage,
                        pageNo: isPageSizeChanged ? 1 : nextValue.pageNo,
                        pageSize: nextValue.pageSize || prevPage.pageSize,
                    }
                };
            }
            if (key === 'thConditions' || key === 'sorts') {
                return {
                    ...prev,
                    [key]: Array.isArray(nextValue) ? nextValue : [],
                    page: { ...prev.page, pageNo: 1 },
                };
            }
            return prev;
        });
    };

    if (!metaInfo) {
        return (
            <SpinSkeleton />
        );
    }

    return (
        <div className="relative-list-container">
            <div className="relative-list-header">
                <div className="relative-list-header-search">
                    <ThrottledInput
                        prefix={<SearchOutlined />}
                        placeholder="搜索"
                        value={searchKey}
                        onChange={(val) => setSearchKey(val)}
                        allowClear
                    />
                </div>
                <div className="relative-list-header-actions">
                    <AiCreateBtn className="ai-create-biz">AI录入{metaInfo?.meta?.label || ''}</AiCreateBtn>
                    <EditBtn label="新建" metaInfo={metaInfo || {}} />
                </div>
            </div>
            <BizList
                metaInfo={metaInfo || {}}
                records={records}
                refresh={refresh}
                params={params}
                totalCount={totalCount}
                batchDelete={batchDeleteBizData}
                selectedRowKeys={selectedRowKeys}
                setSelectedRowKeys={setSelectedRowKeys}
                tableChange={tableChange}
                tableLoading={loading}
            />
        </div>
    )

}

const mapStateToProps = state => ({
    loading: state.loading.models.common,
});

export default connect(mapStateToProps)(RelativeList);
