import { useState } from 'react';
import { Col, Row, Form } from 'antd';
import Modal from 'src/components/common/Modal/Modal.jsx';
import FieldItem from './FieldItem.js';
import { getLayoutData, checkFieldFilter, needShowWhenNewBizData } from './tool.js';
import './NewBizModal.less';

function NewBizModal(props) {
    const { metaInfo, visible, onCancel, onOk, title, okText, type = 'new', record, setVisible } = props;

    const { fieldList = [] } = metaInfo;
    
    const [ formData, setFormData ] = useState({ needAnnualReview: { name: 'no', id: 'no' } });

       const handleOk = () => {
        setVisible(false);
    }

    const renderItem = (item, span) => {
        const fieldNameArr = fieldList.map(item => item.name);
        const showConditionInfo = {
            fieldNameArr,
            showCondition: item.showCondition,
            showFilter: item.showFilter,
            formData,
            fieldList,
        };
        let showItem = needShowWhenNewBizData({ type, item, showConditionInfo });

        console.log(showItem);

        if(!showItem) {
            return null;
        }

        let readOnly = item.readOnly && checkFieldFilter(item.readOnlyFilter, formData, metaInfo?.fieldList);
        let disabled =(['edit'].includes(type) && !item.writable) || (['new', 'copy'].includes(type) && !item.creatable) || !!readOnly;
        let required = item.required || item.layoutRequired && checkFieldFilter(item.requiredFilter, formData, metaInfo?.fieldList);

        return (
            <Col key={item.name} span={span}>
                <div className="biz-form-item">
                    <FieldItem disabled={disabled} item={item} required={required} />
                </div>
            </Col>
        )
    }

    const renderDetail = () => {
        const { layoutFieldsColNum, webLayoutFieldsAlignType, bizLayout } = getLayoutData(metaInfo, record?.bizType);
        console.log(bizLayout, layoutFieldsColNum);
        return (
            <div className="new-biz-form">
                {bizLayout.map((ele, index) => {
                    const { group, showInNewEditPage, fields } = ele;
                    return (
                         <Row gutter={[12, 0]} className="biz-form-group">
                            {showInNewEditPage && <div className="biz-form-group-lable">{group}</div>}
                            {fields.map((field, index) => {
                                const span = (field.spanNumInDetail || (layoutFieldsColNum ? 12 / layoutFieldsColNum : 6)) * 2;
                                return renderItem(field, span);
                            })}
                        </Row>
                    )
                })}
            </div>
        )
    }

    return (
        <Modal
            open={true}
            onCancel={() => setVisible(false)}
            onOk={handleOk}
            title={title || '编辑'}
            width="80%"
        >
            <Form scrollToFirstError layout="vertical" className="new-biz-detail">
                {renderDetail()}
            </Form>
        </Modal>
    )
}
export default NewBizModal;