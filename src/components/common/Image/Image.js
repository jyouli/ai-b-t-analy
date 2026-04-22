import React from 'react';
import { Image as AntdImage, Space } from "antd";
import fileOxs from 'src/lib/fileOxs';
import Downloader from 'src/lib/Downloader';
import imageError from 'src/assets/img/image-error.jpg';

import { DownloadOutlined } from '@ant-design/icons';


const AntdPreviewGroup = AntdImage.PreviewGroup;

function getFileNameFromUrl(url) {
    const clean = String(url || '').split('?')[0].split('#')[0];
    return Downloader.getFileDescByUrl(clean);
}

function injectDownloadIntoToolbar(toolbarNode, onDownload) {
    if (!React.isValidElement(toolbarNode)) {
        return toolbarNode;
    }

    const children = React.Children.toArray(toolbarNode.props?.children || []);
    const firstButton = children.find(item => React.isValidElement(item));
    const buttonType = firstButton?.type || 'li';
    const buttonClassName = firstButton?.props?.className || 'ant-image-preview-operations-operation';

    children.push(
        React.createElement(
            buttonType,
            {
                key: 'download-op',
                className: buttonClassName,
                onClick: (e) => {
                    e?.stopPropagation?.();
                    onDownload();
                },
                title: '下载',
            },
            <DownloadOutlined />
        )
    );

    return React.cloneElement(toolbarNode, undefined, children);
}

function withDownloadToolbar(preview, getFilePath) {
    if (preview === false) {
        return false;
    }

    const basePreview = preview || {};
    const userToolbarRender = basePreview.actionsRender;

    return {
        ...basePreview,
        actionsRender: (originalNode, info) => {
            const toolbarNode = userToolbarRender ? userToolbarRender(originalNode, info) : originalNode;
            const onDownload = () => {
                const raw = getFilePath?.(info);
                const rawUrl = typeof raw === 'string' ? raw : raw?.url;
                const fileDesc = typeof raw === 'string' ? undefined : raw?.name;
                const resolvedFileDesc = fileDesc || getFileNameFromUrl(rawUrl);
                const filePath = fileOxs.signFile(rawUrl, resolvedFileDesc, 'download');
                if (filePath) {
                    Downloader.open({ filePath, fileDesc: resolvedFileDesc });
                }
            };
            return injectDownloadIntoToolbar(toolbarNode, onDownload);
        },
    };
}

export function PreviewGroup(props) {
    const { items, preview, ...restProps } = props;
    const urls = (items || []).map((item) => {
        const rawUrl = typeof item === 'string' ? item : item?.url;
        return fileOxs.signFile(rawUrl, '', 'image');
    });

    return (
        <AntdPreviewGroup
            items={urls}
            fallback={imageError}
            preview={withDownloadToolbar(preview, (info) => {
                const current = typeof info?.current === 'number' ? info.current : 0;
                return items?.[current] || items?.[0];
            })}
            {...restProps}
        />
    )
}

function Image(props) {
    const { src, item, preview, ...restProps } = props;
    const rawUrl = item?.url || src;
    const thumbUrl = fileOxs.signFile(rawUrl, '', 'image', '', true);
    const url = fileOxs.signFile(rawUrl, '', 'image');

    const basePreview = preview === undefined ? { src: url, cover: <Space vertical align="center">预览</Space> } : preview;
    const restPreview = withDownloadToolbar(basePreview, () => item || rawUrl);
    return (
        <AntdImage
            src={thumbUrl}
            fallback={imageError}
            preview={restPreview}
            {...restProps}
        />
    )
}
export default Image;
