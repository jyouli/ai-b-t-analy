import { useState } from 'react';
import { Button } from 'antd';
import NewBizModal from './NewBizModal';

function NewBizBtn(props) {
    const { metaInfo, onCancel, onOk, label, okText, cancelText, buttonProps = {}, record, children } = props;
    const [visible, setVisible] = useState(false);
    return (
        <>
            {children ? (
                <span className="action-biz-edit" onClick={() => setVisible(true)}> {children}</span>
            ) : (
                <Button onClick={() => setVisible(true)} {...buttonProps}>
                    {label}
                </Button>
            )}
            
            {visible && (
                <NewBizModal metaInfo={metaInfo} onCancel={onCancel} onOk={onOk} title={label} okText={okText} cancelText={cancelText} record={record} setVisible={setVisible} />
            )}
        </>
    )
}
export default NewBizBtn;