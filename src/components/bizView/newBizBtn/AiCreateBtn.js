import { useEffect, useRef, useState } from 'react';
import { connect } from 'dva';
import { message } from 'antd';
import AIBtn from 'src/components/common/AIBtn/AIBtn';
import AIImportModal from './AIImportModal';

function AiCreateBtn(props) {
    const { children, metaInfo, showScopeSelection = false, refresh, dispatch, onOk } = props;
    const [aiImportVisible, setAiImportVisible] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleCancel = () => {
        setIsSubmitting(false);
        setAiImportVisible(false);
    };

    const handleAnalyze = async (data) => {
        if (isSubmitting) return;
        const file = data?.fileList?.[0];
        if (!file?.url) {
            message.warning('请先上传营业执照');
            return;
        }

        setIsSubmitting(true);


    };


    return (
        <>
            <AIBtn className="ai-create-btn" onClick={() => setAiImportVisible(true)}>{children}</AIBtn>
            <AIImportModal
				visible={aiImportVisible}
				onCancel={handleCancel}
				onOk={handleAnalyze}
				title="AI录入公司资料"
				tipsTitle="请上传营业执照："
				uploadTips="上传后将进行识别并自动录入公司信息"
                isSubmitting={isSubmitting}
				maxLength={1}
				showScopeSelection={showScopeSelection}
			/>
        </>
        
    );
}

export default connect()(AiCreateBtn);
