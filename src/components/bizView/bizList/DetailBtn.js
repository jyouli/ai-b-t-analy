import React, { useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useDvaDispatch, useDvaSelector } from 'src/hooks/useDva';

/**
 * DetailBtn
 * name 字段的详情跳转入口
 */
function DetailBtn(props) {
    const { value, record } = props;
    const navigate = useNavigate();
    const location = useLocation();
    const dispatch = useDvaDispatch();
    const isMultiTabMode = useDvaSelector((s) => s.multipleTabs?.isMultiTabMode);
    const activeTabKey = useDvaSelector((s) => s.multipleTabs?.activeTabKey);

    /**
     * 使用路由跳转到详情页（支持按住 Ctrl/Cmd 或鼠标中键打开新标签）
     */
    const handleClick = useCallback((e) => {
        if (e?.metaKey || e?.ctrlKey || e?.button === 1) {
            return;
        }
        e?.preventDefault?.();
        e?.stopPropagation?.();
        const metaName = record?.metaName;
        const code = record?.code;
        const path = `/bizDetail?metaName=${metaName}&code=${code}`;
        const fromPath = `${location.pathname || ''}${location.search || ''}`;

        if (isMultiTabMode) {
            const safeMeta = String(metaName || '').replace(/[^\w]/g, '_');
            const safeCode = String(code || '').replace(/[^\w]/g, '_');
            const tabKey = `bizDetail_${safeMeta}_${safeCode}`;
            dispatch({
                type: 'multipleTabs/addTab',
                payload: {
                    key: tabKey,
                    path,
                    label: value || code || '详情',
                    tabInfo: { metaName, code, fromTabKey: activeTabKey, fromPath },
                },
            });

            navigate(path, { state: { metaName, code, fromTabKey: activeTabKey, fromPath, tabKey } });
            return;
        }

        navigate(path, { state: { metaName, code, fromPath } });
    }, [record, navigate, dispatch, isMultiTabMode, value, activeTabKey, location.pathname, location.search]);

    return (
        <a onClick={handleClick}>
            {value}
        </a>
    );
}

export default DetailBtn;
