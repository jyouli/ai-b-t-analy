import React from 'react';
import { Spin, Skeleton } from 'antd';

/**
 * Spin + Skeleton 的通用加载占位组件（默认占满父容器宽高）。
 */
function SpinSkeleton(props) {
    const {
        className,
        style = {},
        spinning = true,
        rows = 10,
        spinProps,
        skeletonProps,
        size = 'medium',
    } = props || {};

    return (
        <Spin className={className} size={size} spinning={spinning} style={{ ...style }} {...(spinProps || {})}>
            <Skeleton
                active
                paragraph={{ rows }}
                {...(skeletonProps || {})}
            />
        </Spin>
    );
}

export default SpinSkeleton;

