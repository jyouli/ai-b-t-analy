import { Row, Col } from 'antd';
import renderValue from 'src/components/bizView/renderValue';
import Downloader from 'src/lib/Downloader';
import { getNumberFieldUnitTitle, getPageLayout, getSpanCol } from './tool';
import './bizDetail.less';

/**
 * BizDetail
 * 业务详情页，通过路由参数获取 metaName 和 code
 */
function BizDetail(props) {
    const { bizData, metaInfo } = props;

    if (!bizData || !metaInfo) {
        return null;
    }

    const fieldList = metaInfo.fieldList || [];
    const { pageFieldIds, layoutFieldsColNum, pageFields } = getPageLayout(metaInfo, bizData);

    const renderLabel = (item, bizData) => {
        const titleUnit = getNumberFieldUnitTitle(item);
        let value = bizData[item.name];
        let hasBatchDownLoad = item.type === 'Image' && !!value?.length;
        let title = `${item.label}${titleUnit}`;
        return (
            <div className="item-label" title={title}>
                <span className="label-text">{title}</span>
                {hasBatchDownLoad ? <a className="detail-batch-download" onClick={() => Downloader.openBatchDownload(value)} >批量下载</a> : null}
            </div>
        );
    }

    const renderItem = ({ colNum = layoutFieldsColNum, order = 0, groupIdx = 0, index, item, fieldItem = {} }) => {
        if (!(item && item.objId) || item?.hidden === 1) {
            return null;
        }

        if (!(fieldItem && fieldItem.hideInRead == 1)) {

            let value = renderValue({
                value: bizData[item.name],
                record: bizData,
                fieldInfo: item,
                isDetail: true
            });

            const spanCol = getSpanCol({ fieldItem, colNum, order });

            return (
                <Col span={spanCol} key={index + '-' + groupIdx} className='detail-item-wrap' >
                    <div className="detail-item" key={index} >
                        {renderLabel(item, bizData)}
                        <div className="item-value" >
                            {value}
                        </div>
                    </div>
                </Col>
            );
        }
        return null;
    };

    return (
        <div className="detail-group-box">
            {(pageFieldIds || []).map((groupInfo, groupIndex) => (
                <div key={groupIndex} className="detail-group-wrap">
                    {groupInfo.showInDetailPage ? (
                        <div className="detail-group-header">
                            {groupInfo.group}
                        </div>
                    ) : null}
                    <Row className="detail-group-content" gutter={[24, 16]} data-colnum={layoutFieldsColNum || 2}>
                        {groupInfo.fields.map((field, fieldIndex) => {
                            const fieldInfo = fieldList.find(item => item.objId == field);
                            const fieldItem = pageFields.find(item => item.fieldId == field);
                            if (!fieldInfo) return null;

                            return renderItem({ groupIdx: groupIndex, index: fieldIndex, item: fieldInfo, fieldItem });
                        })}
                    </Row>
                </div>
            ))}
        </div>
    );
}

export default BizDetail;
