import toolTime from 'src/lib/toolTime';
import { Popover, Checkbox } from 'antd';
import { YEAR_MONTH_DAY_FORMAT, YEAR_MONTH_FORMAT, YEAR_FORMAT } from 'src/utils/yearMonthDayConstants';
import DetailBtn from './bizList/DetailBtn';
import Image, { PreviewGroup } from 'src/components/common/Image/Image';
import './renderValue.less';
import { toThousands } from 'src/lib/tools';

function renderImageThumbList(images) {
    return images.map((item, index) => (
        <div key={item.md5 || item.url || index} className="image-item">
            <Image width={60} height={60} item={item} />
        </div>
    ));
}

function FieldTag(props) {
    const { color, text, background } = props;
    return (
        <span
            className="field-tag-span"
            title={text}
            style={{
                color,
                background: background || 'transparent',
            }}
        >
            {text}
        </span>
    );
}

function ImageFieldValue(props) {
    const { value, isDetail } = props;

    if (!value || !Array.isArray(value) || value.length === 0) {
        return '--';
    }

    const images = value.filter(item => item.type && item.type.startsWith('image/'));
    if (images.length === 0) {
        return '--';
    }

    if (!isDetail && images.length > 3) {
        const previewImages = images.slice(0, 3);
        const popoverContent = (
            <div className="image-popover-content">
                <PreviewGroup items={images}>
                    <div className="image-file-container image-popover-grid">
                        {renderImageThumbList(images)}
                    </div>
                </PreviewGroup>
            </div>
        );
        return (
            <div className="image-file-container">
                <PreviewGroup items={previewImages}>
                    {renderImageThumbList(previewImages)}
                </PreviewGroup>
                <Popover trigger="click" content={popoverContent}>
                    <span className="image-more-trigger">共{images.length}张</span>
                </Popover>
            </div>
        );
    }

    return (
        <div className="image-file-container">
            <PreviewGroup items={images}>
                {renderImageThumbList(images)}
            </PreviewGroup>
        </div>
    );
}

function getStyle(fieldInfo) {
    return fieldInfo?.fieldAttribute?.style ? typeof fieldInfo?.fieldAttribute?.style === 'string' ? JSON.parse(fieldInfo?.fieldAttribute?.style)
        : fieldInfo?.fieldAttribute?.style
        : [];
}

function renderValue({ value, record, fieldInfo, isDetail }) {
    if (value === null || value === undefined) {
        return '--';
    }

    if (fieldInfo.name === 'name' && !isDetail) {
        return <DetailBtn value={value} record={record} />;
    }

    let style = getStyle(fieldInfo);

    if (fieldInfo.type === 'Date' || fieldInfo.subType === 'Date') {
        let formatType = YEAR_MONTH_DAY_FORMAT;
        if (fieldInfo.fieldAttribute && fieldInfo.fieldAttribute.dateFormatType == 'M') {
            formatType = YEAR_MONTH_FORMAT;
        } else if (fieldInfo.fieldAttribute && fieldInfo.fieldAttribute.dateFormatType == 'Y') {
            formatType = YEAR_FORMAT;
        }
        return (value && toolTime.formatDate(+value, formatType)) || '--';
    }

    if (fieldInfo.type === 'Time' || fieldInfo.subType === 'Time') {
        return (value && toolTime.formatTime(+value)) || '';
    }

    if (fieldInfo.type === 'Lookup' && (['Org', 'User'].includes(fieldInfo.subType))) {
        return value?.name || '--';
    }

    if (['Image'].includes(fieldInfo.type)) {
        return <ImageFieldValue value={value} isDetail={isDetail} />;
    }

    if (fieldInfo.type === 'Text') {
        return value || '--';
    }

    if (fieldInfo.type === 'Select') {
        const item = (style || []).find(row => value && row.name === value.name);
        let text = value?.label || '--';
        if (item?.color) {
            return <FieldTag color={item?.color} background={item.backgroundColor} text={text} />;
        }
        return text;
    }
    if (fieldInfo.type == 'District') {
        let text = '';
        if (value) {
            if (value.formatValue) {
                text = value.formatValue;
            } else {
                if (value.province) {
                    text = '';
                }
                text += value.province ? value.province.name || '' : '';
                text += value.city ? value.city.name || '' : '';
                text += value.district ? value.district.name || '' : '';
            }
        }
        return text;
    }

    if(fieldInfo.type === 'Boolean') {
        return <Checkbox disabled={true} checked={!!value} />
    }

    if (
        ['Integer', 'Currency', 'Real', 'Aggregation', 'Numeric'].includes(fieldInfo.type) ||
        (fieldInfo.type == 'Expression' && ['Currency', 'Number'].includes(fieldInfo.subType))
    ) {
        const item = Array.isArray(style)
            ? style.find(row => (row.left ? value >= Number(row.left) : true) && (row.right ? value <= Number(row.right) : true))
            : undefined;
        let text = value;

        if(fieldInfo.type !== 'Integer') {
            if (fieldInfo.fieldAttribute.decimal && typeof value === 'number') {
                text = (value || 0.0).toFixedByRounding(fieldInfo.fieldAttribute.decimal);
            }
        }
        if(value && fieldInfo?.fieldAttribute?.thousandsSupported) {
            text = toThousands(text);
        }
        if (item?.color) {
            return <FieldTag color={item?.color} background={item.backgroundColor} text={text} />;
        }
        return text;
    }

    return typeof value === 'string' ? value : JSON.stringify(value);
}

export default renderValue;
