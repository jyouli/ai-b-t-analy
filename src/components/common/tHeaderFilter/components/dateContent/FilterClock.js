import { useState, useMemo } from 'react';
import { DatePicker, Segmented } from 'antd';
import initTimestampMap from './dateUtil';
import toolTime from 'src/lib/toolTime';

const { RangePicker } = DatePicker;

const DATE_MAP = {
    D: 'day',
    M: 'month',
    Y: 'year',
    Q: 'quarter',
};
const formatModeMap = {
    day: 'YYYY-MM-DD',
    month: 'YYYY-MM',
    quarter: 'YYYY-[Q]Q',
    year: 'YYYY',
};

const DEFAULT_EXTRAS = [
    { name: '今天', value: '0' },
    { name: '昨天', value: '1' },
    { name: '明天', value: '2' },
    { name: '本周', value: '10' },
    { name: '上周', value: '11' },
    { name: '下周', value: '12' },
    { name: '本月', value: '3' },
    { name: '上月', value: '4' },
    { name: '下月', value: '5' },
    { name: '本月至今', value: '21' },
    { name: '本月上半月', value: '24' },
    { name: '本月下半月', value: '25' },
    { name: '本季度', value: '6' },
    { name: '上季度', value: '7' },
    { name: '下季度', value: '8' },
    { name: '本季度至今', value: '22' },
    { name: '去年', value: '13' },
    { name: '今年', value: '14' },
    { name: '明年', value: '15' },
    { name: '今年至今', value: '23' },
];

const FormatTypeMap = {
    //根据字段配置的日期类型，显示对应的快捷筛选项
    D: ['0', '1', '10', '11', '3', '4', '21', '6', '7', '22', '14', '13', '23', '2', '12', '5', '8', '15', '24', '25'],
    M: ['3', '4', '5', '6', '7', '8', '13', '14', '15'],
    Q: ['6', '7'],
    Y: ['13', '14', '15'],
};

function FilterClock(props) {
    const { handleDateList, value, clickItem, dateFormatType, label, isUpto, confirm, hiddenToNow, isRadio, extras = DEFAULT_EXTRAS } = props;
        const formatTypeMap = FormatTypeMap;
        const defaultMode = DATE_MAP[dateFormatType] || 'day';
        const [mode, setMode] = useState(defaultMode);
        const [startDate, setStartDate] = useState();
        const [endDate, setEndDate] = useState();
    
        const dateMap = initTimestampMap();

    const onChangeRange = (e) => {
        setMode(e);
    }

    const changeExpr = (item, e) => {
        const [startMo, endMo] = dateMap[item.value] ?? [];
        let matchMode;
        if (['3', '4', '5'].includes(item.value)) {
            matchMode = 'month';
        } else if (['6', '7', '8'].includes(item.value)) {
            matchMode = 'quarter';
        } else if (['13', '14', '15'].includes(item.value)) {
            matchMode = 'year';
        } else {
            matchMode = 'day';
        }
        setMode(matchMode);
        setStartDate(+startMo);
        setEndDate(+endMo);
        handleDateList({ ...item, mode: matchMode }, [+startMo, +endMo]);
    };

    const onChangeDate = (dateMo, dateStr) => {
        console.log(dateMo, dateStr, typeof dateMo?.[0], dateMo?.[0]?.constructor.name);
            if (!dateStr) {
                setStartDate();
                setEndDate();
                handleDateList({ name: '自定义', value: 'customize' }, undefined);
                return;
            }
            if (isUpto) {
                const timeStamp = dateMo ? +dateMo.startOf(mode).format('x') : +toolTime.startByMode(dateStr, mode);
                setStartDate(timeStamp);
                setEndDate();
                const newStartTime = toolTime.getMom(timeStamp);
                const newEndTime = toolTime.getMom(+toolTime.endByMode(timeStamp, mode));
                handleDateList({ name: '自定义', value: 'customize', mode }, [newStartTime, newEndTime]);
                return;
            }
            if (!startDate) {
                const timeStamp = +toolTime.startByMode(dateStr, mode);
                setStartDate(timeStamp);
                const endStamp = +toolTime.endByMode(timeStamp, mode);
                const newStartTime = toolTime.transferLocalDate28(timeStamp);
                const newEndTime = toolTime.transferLocalDate28(endStamp);
                handleDateList({ name: '自定义', value: 'customize', mode }, [newStartTime, newEndTime]);
            } else if (endDate) {
                const timeStamp = dateMo ? +dateMo.startOf(mode).format('x') : +toolTime.startByMode(dateStr, mode);
                const endStamp = +toolTime.endByMode(timeStamp, mode);
                setStartDate(timeStamp);
                setEndDate();
                const newStartTime = toolTime.transferLocalDate28(timeStamp);
                const newEndTime = toolTime.transferLocalDate28(endStamp);
                handleDateList({ name: '自定义', value: 'customize', mode }, [newStartTime, newEndTime]);
            } else {
                const timeStamp = +toolTime.startByMode(dateStr, mode);
                if (startDate === timeStamp) {
                    return;
                } else if (startDate > timeStamp) {
                    setStartDate(timeStamp);
                    const endStamp = +toolTime.endByMode(startDate, mode);
                    setEndDate(endStamp);
                    const newStartTime = toolTime.transferLocalDate28(timeStamp);
                    const newEndTime = toolTime.transferLocalDate28(endStamp);
                    handleDateList({ name: '自定义', value: 'customize', mode }, [newStartTime, newEndTime]);
                } else {
                    const timeStamp = +toolTime.endByMode(dateStr, mode);
                    setEndDate(timeStamp);
                    const newStartTime = toolTime.transferLocalDate28(startDate);
                    const newEndTime = toolTime.transferLocalDate28(timeStamp);
                    handleDateList({ name: '自定义', value: 'customize', mode }, [newStartTime, newEndTime]);
                }
            }
        };
    const pickProps = {
        format: formatModeMap[mode],
        value: isUpto ? toolTime.getMom(endDate) : [toolTime.getMom(startDate), toolTime.getMom(endDate)],
        picker: mode === 'day' ? 'date' : mode,
        onChange: onChangeDate,
    }


    const filterExtras = useMemo(() => {
        return extras.filter(item =>
            dateFormatType && formatTypeMap[dateFormatType]
                ? formatTypeMap[dateFormatType].includes(item.value) && (hiddenToNow ? !['21', '22', '23'].includes(item.value) : true)
                : true
        );
    }, [dateFormatType]);

    console.log(toolTime.getMom(startDate).format('YYYY-MM-DD HH:mm:ss'));
    console.log(toolTime.getMom(endDate).format('YYYY-MM-DD HH:mm:ss'));

    return (
       <div className="filter-standard-clock">
            {dateFormatType === 'Y' ? null : (
                <div className="standard-clock-tab">
                    <Segmented
                        block
                        onChange={onChangeRange}
                        value={mode}
                        options={[
                            ...(dateFormatType && dateFormatType !== 'D' ? [] : [{ label: '日', value: 'day' }]),
                            ...(dateFormatType === 'Q' ? [] : [{ label: '月', value: 'month' }]),
                            { label: '季', value: 'quarter' },
                            { label: '年', value: 'year' },
                        ]}
                    />
                </div>
            )}
            <div className="standard-clock-items">
                {filterExtras.map(item => (
                    <div key={item.value} className={`standard-clock-item ${item.value === clickItem.value ? 'active' : ''}`} onClick={e => changeExpr(item, e)}>
                        {item.name}
                    </div>
                ))}
            </div>
            <div className="standard-clock-picker">
                {isUpto ? <DatePicker {...pickProps} /> : <RangePicker {...pickProps} />}
            </div>
       </div>
    );
}

export default FilterClock
