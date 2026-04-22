import React, { useState } from 'react';
import { Modal, Button, Checkbox } from 'antd';
import CloudUpload from '../../upload/CloudUpload';
import './AIImportModal.less';

const SCOPE_OPTIONS = [
    { label: '公司资质', value: 'company' },
    { label: '人员信息', value: 'personnel' },
    { label: '人员证件', value: 'certificate' },
    { label: '项目业绩', value: 'performance' },
    { label: '财务信誉', value: 'finance' }
];

const AIImportModal = ({
    visible,
    onCancel,
    onOk,
    title = '',
    accept = '.jpg,.jpeg,.png',
    tipsTitle = '',
    uploadTips = '',
    submitText = '识别录入',
    isSubmitting = false,
    maxLength = 1,
    showScopeSelection = false,
    children
}) => {

    const [fileList, setFileList] = useState([]);

    const [selectedScopes, setSelectedScopes] = useState(SCOPE_OPTIONS.map(opt => opt.value));

    const [uploading, setUploading] = useState(false);

    const handleUploadChange = (newFileList) => {
        setFileList(newFileList);
        setUploading((newFileList || []).some((f) => f?.status === 'uploading'));
    };

    const handleOk = () => {
        onOk?.({ fileList, selectedScopes: showScopeSelection ? selectedScopes : undefined });
    };

    return (
        <Modal
            title={title}
            open={visible}
            mask={{ closable: false }}
            onCancel={onCancel}
            width={720}
            className="ai-upload-modal"
            footer={
                <div className="upload-modal-footer">
                    <Button onClick={onCancel}>取消</Button>
                    <Button 
                        type="primary"
                        onClick={handleOk} 
                        loading={isSubmitting || uploading}
                        disabled={fileList.length === 0 || isSubmitting || uploading}
                        className="submit-btn"
                    >
                        {submitText}
                    </Button>
                </div>
            }
        >
            <div className="upload-modal-content">
                <div className="upload-tips">
                    <div className="tips-title">{tipsTitle}</div>
                    <div className="tips-desc">{uploadTips}</div>
                </div>

                <div className="upload-dragger-wrapper">
                    <CloudUpload
                        fileList={fileList}
                        onChange={handleUploadChange}
                        accept={accept}
                        maxLength={maxLength}
                        maxFileSizeMB={10}
                        listType="text"
                        isDragger={true}
                    />
                </div>
                
                {showScopeSelection && (
                    <div className="scope-selection-wrapper">
                        <div className="scope-title">请选择本次需要识别的范围 (已存在的数据将被覆盖) :</div>
                        <Checkbox.Group 
                            options={SCOPE_OPTIONS} 
                            value={selectedScopes}
                            onChange={setSelectedScopes}
                            className="scope-checkbox-group"
                        />
                    </div>
                )}

                {children && (
                    <div className="upload-extra-content">
                        {children}
                    </div>
                )}
            </div>
        </Modal>
    );
};

export default AIImportModal;
