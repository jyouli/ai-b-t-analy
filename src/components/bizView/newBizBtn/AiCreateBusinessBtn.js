import { useState } from 'react';
import { connect } from 'dva';
import { message } from 'antd';
import AIBtn from 'src/components/common/AIBtn/AIBtn';
import AIImportModal from './AIImportModal';
import ParseFileModal from './ParseFileModal';

function AiCreateBusinessBtn(props) {
    const { children, metaInfo, refresh, dispatch, onOk } = props;
    const [aiImportVisible, setAiImportVisible] = useState(false);
    const [parseVisible, setParseVisible] = useState(false);
    const [parseFile, setParseFile] = useState(null);

    const handleUploadCancel = () => {
        setAiImportVisible(false);
    };

    const handleUploadOk = (data) => {
        const file = data?.fileList?.[0] || null;
        if (!file?.url) {
            message.warning('请先上传营业执照');
            return;
        }
        setParseFile(file);
        setAiImportVisible(false);
        setParseVisible(true);
    };

    const handleParseCancel = () => {
        setParseVisible(false);
        setParseFile(null);
    };

    const handleParseOk = (json) => {
        // onOk?.(json);
        // refresh?.();
    };

    return (
        <>
            <AIBtn className="ai-create-btn" onClick={() => setAiImportVisible(true)}>{children}</AIBtn>
            {aiImportVisible && (
                <AIImportModal
                    visible={aiImportVisible}
                    onCancel={handleUploadCancel}
                    onOk={handleUploadOk}
                    title="AI录入-新建企业"
                    tipsTitle="请上传营业执照："
                    submitText="识别录入"
                    uploadTips="请上传需要识别录入的营业执照（正本或副本），识别后请仔细核对数据是否正确。仅可上传jpg/jpeg/png格式文件。文件上传大小限制10MB。"
                    maxLength={1}
                    accept=".jpg,.jpeg,.png"
                />
            )}
            {parseVisible && (
                <ParseFileModal
                    visible={parseVisible}
                    file={parseFile}
                    dispatch={dispatch}
                    onCancel={handleParseCancel}
                    onOk={handleParseOk}
                    title="AI录入营业执照"
                />
            )}
        </>

    );
}

export default connect()(AiCreateBusinessBtn);
