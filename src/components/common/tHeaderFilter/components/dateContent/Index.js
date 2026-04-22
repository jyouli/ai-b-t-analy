
import { Checkbox } from 'antd';
import StandardClock from './FilterClock';
import { DATE_EXPR } from 'src/lib/constants';
import './index.less';

function DateContent({ cwcDateTimeContentProps }) {

    let { setTimeState, tempCondition, label, originTempCondition, clickItem } = cwcDateTimeContentProps;

    const isUpto = originTempCondition?.op === 'upTo';

    const handleCheckboxChange = e => {
        const isChecked = e.target.checked;
        const { value } = originTempCondition;
        let changeData = {};
        // i18n-ignore
        let newLabel = label?.replace('截止到', '');
        let newValue = value;
        if (isChecked) {
            if (Array.isArray(value) && value?.length === 2) {
                newValue = value.slice(1);
            }
        } else if (Array.isArray(value) && value?.length > 1) {
            newValue = [value[1], value[1]];
        } else if (Array.isArray(value) && value?.length === 1) {
            if (clickItem?.mode) {
                newValue = [+toolTime.startByMode(value[0], clickItem.mode), value[0]];
            } else {
                newValue = [value[0], value[0]];
            }
        }
        if (isChecked) {
            changeData = {
                op: 'upTo',
                value: newValue,
                label: '截止到' + (Array.isArray(value) ? '自定义' : newLabel),
            };
        } else {
            changeData = {
                op: 'bt',
                value: newValue,
                label: newLabel,
            };
        }

        setTimeState({
            tempCondition: {
                ...originTempCondition,
                ...changeData,
            },
        });
    };

    const handleDateList = (item, val) => {
        const value = val ?? '0';
        const label = item?.name;

        let upToValue = value;
        if (Array.isArray(value) && value?.length == 2) {
            upToValue = value.slice(1);
        } else if (value?.length == 1) {
            upToValue = value.slice(0);
        }

        const upToData = {
            op: 'upTo',
            value: upToValue,
            label: '截止到' + (Array.isArray(value) ? '自定义' : label),
        };
        const normalData = {
            op: 'bt',
            value,
            label,
        };

        const resultData = isUpto ? upToData : normalData;
        setTimeState({
            clickItem: item,
            showCustomize: item?.value === 'customize' ? true : false,
            isCustomizePeriod: false,
            upToTempCondition: {
                upToData,
                normalData,
            },
            tempCondition: {
                expression: DATE_EXPR[item.value],
                type: 'value',
                ...resultData,
            },
        });
    };

    const temValue = tempCondition.value;
    if (isUpto && Array.isArray(temValue) && temValue.length == 1) {
        tempCondition.value = ['', ...temValue];
    }

    return (
        <div className='filter-date-content'>
            <div className='date-content-header'>
                <span className='date-content-title'>自然日历</span>
                <Checkbox checked={isUpto} className='up-to' onChange={handleCheckboxChange}>
                    截止到
                </Checkbox>
            </div>
            <StandardClock
                {...cwcDateTimeContentProps}
                isUpto={isUpto}
                handleDateList={handleDateList}
            />
        </div>
    );
}

export default DateContent;