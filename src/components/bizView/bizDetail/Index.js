import React, { useEffect, useMemo, useState } from 'react';
import { Button, Space, Spin } from 'antd';
import { useLocation, useNavigate } from 'react-router-dom';
import { CloseOutlined, LeftOutlined } from '@ant-design/icons';
import { useDvaDispatch, useDvaSelector } from 'src/hooks/useDva';
import { APP_DEFAULT_ROUTE } from 'src/routes/appDefaultRoute';
import BizDetail from './BizDetail';

/**
 * BizDetail 承载页
 * - 从 location.state（并兼容 query）获取 metaName/code
 * - 拉取 metaInfo + bizData
 * - 将数据传递给 BizDetail 展示
 */
function BizDetailIndex() {
    const dispatch = useDvaDispatch();
    const location = useLocation();
    const navigate = useNavigate();
    const isMultiTabMode = useDvaSelector((s) => s.multipleTabs?.isMultiTabMode);
    const tabsItems = useDvaSelector((s) => s.multipleTabs?.tabsItems || []);

    const searchParams = useMemo(() => new URLSearchParams(location?.search || ''), [location?.search]);
    const metaName = location?.state?.metaName || searchParams.get('metaName') || '';
    const code = location?.state?.code || searchParams.get('code') || '';
    const fromPath = location?.state?.fromPath;
    const fromTabKey = location?.state?.fromTabKey;
    const currentTabKey = location?.state?.tabKey;

    const [loading, setLoading] = useState(false);
    const [metaInfo, setMetaInfo] = useState();
    const [bizData, setBizData] = useState();

    /**
     * 拉取详情数据（metaInfo + bizData）
     */
    const fetchDetail = () => {
        if (!metaName || !code) {
            setMetaInfo(undefined);
            setBizData(undefined);
            return;
        }
        setLoading(true);

        let metaDone = false;
        let bizDone = false;
        const finish = () => {
            if (metaDone && bizDone) {
                setLoading(false);
            }
        };

        dispatch({
            type: 'common/getMetaAllDetail',
            payload: { metaName },
            callback: (data) => {
                setMetaInfo(data || undefined);
                metaDone = true;
                finish();
            },
        });

        dispatch({
            type: 'common/getBizDetail',
            payload: { metaName, code },
            callback: (detail) => {
                setBizData(detail || undefined);
                bizDone = true;
                finish();
            },
        });
    };

    useEffect(() => {
        fetchDetail();
    }, [metaName, code]);

    /**
     * 关闭/返回详情页
     * - 单页签：返回上一个路由（兜底到 /credit）
     * - 多页签：关闭当前详情页签并激活之前的页签（兜底到最后一个或审标列表）
     */
    const handleBackOrClose = () => {
        if (!isMultiTabMode) {
            if (fromPath) {
                navigate(fromPath);
                return;
            }
            if (window.history.length > 1) {
                navigate(-1);
                return;
            }
            navigate('/credit');
            return;
        }

        const meta = String(metaName || '').replace(/[^\w]/g, '_');
        const c = String(code || '').replace(/[^\w]/g, '_');
        const tabKey = currentTabKey || `bizDetail_${meta}_${c}`;

        dispatch({ type: 'multipleTabs/removeTab', payload: { tabKey } });

        const targetKey = fromTabKey;
        if (targetKey === APP_DEFAULT_ROUTE.tabKey || targetKey === 'home') {
            dispatch({ type: 'multipleTabs/setActiveTab', payload: APP_DEFAULT_ROUTE.tabKey });
            navigate(APP_DEFAULT_ROUTE.path);
            return;
        }
        if (targetKey) {
            const target = tabsItems.find((t) => t.key === targetKey);
            if (target?.path) {
                dispatch({ type: 'multipleTabs/setActiveTab', payload: targetKey });
                navigate(target.path);
                return;
            }
        }

        const remaining = tabsItems.filter((t) => t.key !== tabKey);
        const last = remaining[remaining.length - 1];
        if (last?.path) {
            dispatch({ type: 'multipleTabs/setActiveTab', payload: last.key });
            navigate(last.path);
            return;
        }
        dispatch({ type: 'multipleTabs/setActiveTab', payload: APP_DEFAULT_ROUTE.tabKey });
        navigate(APP_DEFAULT_ROUTE.path);
    };

    if (!metaName || !code) {
        return <div style={{ padding: 16 }}>缺少 metaName 或 code</div>;
    }

    return (
        <Spin className='biz-detail-container' spinning={loading}>
            <div className="biz-detail-header">
                <div className="detail-header-left">
                    <Space size={8} align="center">
                        <Button
                            type="text"
                            className="detail-header-back-btn"
                            icon={isMultiTabMode ? <CloseOutlined /> : <LeftOutlined />}
                            onClick={handleBackOrClose}
                        />
                        <div className="detail-header-title">{bizData?.name || ''}</div>
                        <div className="detail-header-desc">{metaInfo?.meta?.label || ''}</div>
                    </Space>
                </div>
            </div>
            <div className="biz-detail-content">
                <BizDetail bizData={bizData} metaInfo={metaInfo} />
            </div>
 
        </Spin>
    );
}

export default BizDetailIndex;
