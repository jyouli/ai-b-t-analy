import { YEAR_MONTH_DAY_HOUR_MINUTE_FORMAT, YEAR_MONTH_DAY_FORMAT, YEAR_MONTH_FORMAT, YEAR_FORMAT } from '../utils/yearMonthDayConstants';
import dayjs from 'dayjs';
import isoWeek from 'dayjs/plugin/isoWeek';
import quarterOfYear from 'dayjs/plugin/quarterOfYear';

dayjs.extend(isoWeek);
dayjs.extend(quarterOfYear);

function cloneDeep(value) {
    if (typeof structuredClone === 'function') {
        return structuredClone(value);
    }
    return JSON.parse(JSON.stringify(value));
}

const TimeDimension = {
    quarter: 'quarter',
    week: 'week',
    year: 'year',
    month: 'month',
    day: 'day',
};
const fixEntTimeZone = 8;
const fixZone = 'Asia/Shanghai';

const toolTime = {
    format: (time, format = YEAR_MONTH_DAY_HOUR_MINUTE_FORMAT) => {
        return dayjs(time).format(format);
    },
    formatMom: (timeMom, format = YEAR_MONTH_DAY_HOUR_MINUTE_FORMAT) => {
        return dayjs.isDayjs(timeMom) ? timeMom.format(format) : dayjs(timeMom).format(format);
    },
    formatTime: timeStamp => {
        return dayjs(timeStamp).format('YYYY-MM-DD HH:mm');
    },
    formatDate: timeStamp => {
        return dayjs(timeStamp).format('YYYY-MM-DD');
    },
    formatDateLocal: timeStamp => {
        return dayjs(timeStamp).format('YYYY-MM-DD');
    },
    formatMonthCn: timeStamp => {
        return dayjs(timeStamp).format(YEAR_MONTH_FORMAT);
    },
    getMom: timeConst => {
        return timeConst ? dayjs(timeConst) : dayjs();
    },
    transferStr: timeStr => {
        if (!timeStr.includes('/')) {
            return timeStr;
        }
        const [year, month, day] = timeStr.split('/');
        return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    },
    getMomLocal: timeConst => {
        const timeStr = typeof timeConst === 'string' ? toolTime.transferStr(timeConst) : timeConst;
        return timeConst ? dayjs(timeStr) : dayjs();
    },
    getMomLocalDate: timeStamp => {
        return dayjs(timeStamp);
    },
    getMomLocalNew: timeStr => {
        timeStr = toolTime.transferStr(timeStr);
        return dayjs(timeStr).valueOf();
    },
    timeStrTransfer: timeStr => {
        timeStr = toolTime.transferStr(timeStr.replace(/\-/g, '/'));
        return dayjs(timeStr).valueOf();
    },
    getMomTransfer: timeConst => {
        return dayjs(timeConst).valueOf();
    },
    getLocalToday: () => {
        return dayjs().startOf('day');
    },
    startWeek: () => {
        return dayjs().startOf('isoWeek');
    },
    endWeek: () => {
        return dayjs().endOf('isoWeek');
    },
    startByMode: (time, mode) => {
        return dayjs(time).startOf(mode);
    },
    startByMode8: (time, mode) => {
        return dayjs(time).startOf(mode);
    },
    startByModeLocal: (time, mode) => {
        return dayjs(time).startOf(mode);
    },
    endByMode: (time, mode) => {
        return dayjs(time).endOf(mode);
    },
    startDay: time => {
        return dayjs(time).startOf('day');
    },
    startDayForDisabled: () => {
        return dayjs().format('YYYY/MM/DD');
    },
    startDayValue: time => {
        return dayjs(time).startOf('day').valueOf();
    },
    startMonth: time => {
        return dayjs(time).startOf('month');
    },
    endMonth: time => {
        return dayjs(time).endOf('month');
    },
    startYear: () => {
        return dayjs().startOf('year');
    },
    endYear: () => {
        return dayjs().endOf('year');
    },
    startYearWidthVal: time => {
        return dayjs(time).startOf('year').valueOf();
    },
    endYearWidthVal: time => {
        return dayjs(time).endOf('year').valueOf();
    },
    endDay: time => {
        return dayjs(time).endOf('day');
    },
    startMinute: time => {
        return dayjs(time).startOf('minute');
    },
    endMinute: time => {
        return dayjs(time).endOf('minute');
    },
    subtract: (amount, unit) => {
        return dayjs().subtract(amount, unit);
    },
    add: (amount, unit) => {
        return dayjs().add(amount, unit);
    },
    addFormatDate: (timeStr, amount, unit) => {
        return dayjs(timeStr).add(amount, unit).format('YYYY-MM-DD');
    },
    formatSimpleTime: text => {
        return dayjs(text).format('YY-MM-DD HH:mm');
    },
    getCurTimeStamp: () => {
        return dayjs().valueOf();
    },
    lastThreeMonth: () => {
        return dayjs().add(-3, 'month').startOf('day');
    },
    isMomValue: time => {
        return dayjs.isDayjs(time);
    },
    getEndTime: (start, type) => {
        const time = dayjs(Number(start));
        switch (type) {
            case TimeDimension.day:
                return time.endOf('day').valueOf();
            case TimeDimension.week:
                return time.endOf('week').valueOf();
            case TimeDimension.month:
                return time.endOf('month').valueOf();
            case TimeDimension.quarter:
                return time.endOf('quarter').valueOf();
            case TimeDimension.year:
                return time.endOf('year').valueOf();
            default:
                return start;
        }
    },
    getLastMonthValue: isStart => {
        return isStart ? dayjs().subtract(1, 'month').startOf('month').valueOf() : dayjs().subtract(1, 'month').endOf('month').valueOf();
    },
    getDataLabel: (dateString, type) => {
        let res;
        switch (type) {
            case 'dayWork':
                res = dayjs(dateString).format(YEAR_MONTH_DAY_FORMAT);
                break;
            case 'monthWork':
                res = dayjs(dateString).format(YEAR_MONTH_FORMAT);
                break;
            case 'weekWork':
                res = dayjs(dateString).format(t('i18n_c5ede8d72797d43c'));
                break;
            default:
                break;
        }
        return res;
    },
    dateFormat: (times, dateType, format) => {
        if ((!times && times !== 0) || isNaN(Number(times))) {
            return undefined;
        }
        let dateFormatStr = format;
        if (typeof dateFormatStr === 'undefined' || dateFormatStr.length === 0) {
            if (dateType === 'Date') {
                dateFormatStr = YEAR_MONTH_DAY_FORMAT;
            } else if (dateType === 'Month') {
                dateFormatStr = YEAR_MONTH_FORMAT;
            } else if (dateType === 'Year') {
                dateFormatStr = YEAR_FORMAT;
            } else {
                dateFormatStr = YEAR_MONTH_DAY_HOUR_MINUTE_FORMAT;
            }
        }
        return dayjs(Number(times)).format(dateFormatStr);
    },
    transferFilterDate: filter => {
        const newFilter = cloneDeep(filter);
        if (newFilter && newFilter.conditions && newFilter.conditions.length > 0) {
            newFilter.conditions.forEach(item => {
                if (
                    (item.field?.type === 'Time' || item.field?.subType === 'Time' || item.right?.isTime) &&
                    !item.right.apiName &&
                    (item.op === 'bt' || item.op === 'upTo') &&
                    item.right.expression
                ) {
                    const value = toolTime.tranferExpressionTime(item.right.expression);
                    if (value) {
                        item.right.value = item.op === 'bt' ? value : value[1];
                        item.right.type = 'value';
                    }
                } else if ((item.op === 'bt' || item.op === 'upTo') && item.right.expression && !item.right.apiName) {
                    const value = toolTime.tranferExpression(item.right.expression);
                    if (value) {
                        item.right.value = item.op === 'bt' ? value : value[1];
                        item.right.type = 'value';
                    }
                }
            });
        }
        return newFilter;
    },
    transferReportFilterDate: filters => {
        const newFilter = cloneDeep(filters);
        if (newFilter && newFilter.length > 0) {
            newFilter.forEach(item => {
                if (item.value?.right?.expression && item.value.op && ['firstHalfMonth', 'lastHalfMonth'].includes(item.value.right.expression)) {
                    const value = toolTime.tranferExpression(item.value.right.expression);
                    if (value) {
                        item.value.right.value = item.value.op === 'bt' ? value : value[1];
                        item.value.right.type = 'value';
                    }
                }
            });
        }
        return newFilter;
    },
    tranferExpression: expression => {
        const cur = dayjs();
        if (expression === 'today') {
            return [cur.startOf('day').valueOf(), cur.endOf('day').valueOf()];
        } else if (expression === 'yesterday') {
            const d = cur.subtract(1, 'day');
            return [d.startOf('day').valueOf(), d.endOf('day').valueOf()];
        } else if (expression === 'tomorrow') {
            const d = cur.add(1, 'day');
            return [d.startOf('day').valueOf(), d.endOf('day').valueOf()];
        } else if (expression === 'thisWeek') {
            return [cur.startOf('week').valueOf(), cur.endOf('week').valueOf()];
        } else if (expression === 'lastWeek') {
            const d = cur.subtract(1, 'week');
            return [d.startOf('week').valueOf(), d.endOf('week').valueOf()];
        } else if (expression === 'nextWeek') {
            const d = cur.add(1, 'week');
            return [d.startOf('week').valueOf(), d.endOf('week').valueOf()];
        } else if (expression === 'thisMonth') {
            return [cur.startOf('month').valueOf(), cur.endOf('month').valueOf()];
        } else if (expression === 'lastMonth') {
            const d = cur.subtract(1, 'month');
            return [d.startOf('month').valueOf(), d.endOf('month').valueOf()];
        } else if (expression === 'nextMonth') {
            const d = cur.add(1, 'month');
            return [d.startOf('month').valueOf(), d.endOf('month').valueOf()];
        } else if (expression === 'thisQuarter') {
            return [cur.startOf('quarter').valueOf(), cur.endOf('quarter').valueOf()];
        } else if (expression === 'lastQuarter') {
            const d = cur.subtract(1, 'quarter');
            return [d.startOf('quarter').valueOf(), d.endOf('quarter').valueOf()];
        } else if (expression === 'nextQuarter') {
            const d = cur.add(1, 'quarter');
            return [d.startOf('quarter').valueOf(), d.endOf('quarter').valueOf()];
        } else if (expression === 'lastYear') {
            const d = cur.subtract(1, 'year');
            return [d.startOf('year').valueOf(), d.endOf('year').valueOf()];
        } else if (expression === 'nextYear') {
            const d = cur.add(1, 'year');
            return [d.startOf('year').valueOf(), d.endOf('year').valueOf()];
        } else if (expression === 'thisYear') {
            return [cur.startOf('year').valueOf(), cur.endOf('year').valueOf()];
        } else if (expression === 'thisMonthToToday') {
            return [cur.startOf('month').valueOf(), cur.endOf('day').valueOf()];
        } else if (expression === 'thisQuarterToToday') {
            return [cur.startOf('quarter').valueOf(), cur.endOf('day').valueOf()];
        } else if (expression === 'thisYearToToday') {
            return [cur.startOf('year').valueOf(), cur.endOf('day').valueOf()];
        } else if (expression === 'firstHalfMonth') {
            const d = cur.date(15);
            return [d.startOf('month').valueOf(), d.endOf('day').valueOf()];
        } else if (expression === 'lastHalfMonth') {
            const d = cur.date(16);
            return [d.startOf('day').valueOf(), d.endOf('month').valueOf()];
        } else if (expression === 'thisYearToThisMonth') {
            return [cur.startOf('year').valueOf(), cur.endOf('month').valueOf()];
        } else if (expression === 'firstDayOfMonth') {
            const d = cur.startOf('month');
            return [d.startOf('day').valueOf(), d.endOf('day').valueOf()];
        } else if (expression === 'firstDayOfYear') {
            const d = cur.startOf('year');
            return [d.startOf('day').valueOf(), d.endOf('day').valueOf()];
        } else if (expression === 'firstMonthOfYear') {
            const d = cur.startOf('year').startOf('month');
            return [d.startOf('day').valueOf(), d.endOf('month').endOf('day').valueOf()];
        }
    },
    tranferExpressionTime: expression => {
        const cur = dayjs();
        if (expression === 'today') {
            return [cur.startOf('day').valueOf(), cur.endOf('day').valueOf()];
        } else if (expression === 'yesterday') {
            const d = cur.subtract(1, 'day');
            return [d.startOf('day').valueOf(), d.endOf('day').valueOf()];
        } else if (expression === 'tomorrow') {
            const d = cur.add(1, 'day');
            return [d.startOf('day').valueOf(), d.endOf('day').valueOf()];
        } else if (expression === 'thisWeek') {
            return [cur.startOf('week').valueOf(), cur.endOf('week').valueOf()];
        } else if (expression === 'lastWeek') {
            const d = cur.subtract(1, 'week');
            return [d.startOf('week').valueOf(), d.endOf('week').valueOf()];
        } else if (expression === 'nextWeek') {
            const d = cur.add(1, 'week');
            return [d.startOf('week').valueOf(), d.endOf('week').valueOf()];
        } else if (expression === 'thisMonth') {
            return [cur.startOf('month').valueOf(), cur.endOf('month').valueOf()];
        } else if (expression === 'lastMonth') {
            const d = cur.subtract(1, 'month');
            return [d.startOf('month').valueOf(), d.endOf('month').valueOf()];
        } else if (expression === 'nextMonth') {
            const d = cur.add(1, 'month');
            return [d.startOf('month').valueOf(), d.endOf('month').valueOf()];
        } else if (expression === 'thisQuarter') {
            return [cur.startOf('quarter').valueOf(), cur.endOf('quarter').valueOf()];
        } else if (expression === 'lastQuarter') {
            const d = cur.subtract(1, 'quarter');
            return [d.startOf('quarter').valueOf(), d.endOf('quarter').valueOf()];
        } else if (expression === 'nextQuarter') {
            const d = cur.add(1, 'quarter');
            return [d.startOf('quarter').valueOf(), d.endOf('quarter').valueOf()];
        } else if (expression === 'lastYear') {
            const d = cur.subtract(1, 'year');
            return [d.startOf('year').valueOf(), d.endOf('year').valueOf()];
        } else if (expression === 'nextYear') {
            const d = cur.add(1, 'year');
            return [d.startOf('year').valueOf(), d.endOf('year').valueOf()];
        } else if (expression === 'thisYear') {
            return [cur.startOf('year').valueOf(), cur.endOf('year').valueOf()];
        } else if (expression === 'thisMonthToToday') {
            return [cur.startOf('month').valueOf(), cur.endOf('day').valueOf()];
        } else if (expression === 'thisQuarterToToday') {
            return [cur.startOf('quarter').valueOf(), cur.endOf('day').valueOf()];
        } else if (expression === 'thisYearToToday') {
            return [cur.startOf('year').valueOf(), cur.endOf('day').valueOf()];
        } else if (expression === 'firstHalfMonth') {
            const d = cur.date(15);
            return [d.startOf('month').valueOf(), d.endOf('day').valueOf()];
        } else if (expression === 'lastHalfMonth') {
            const d = cur.date(16);
            return [d.startOf('day').valueOf(), d.endOf('month').valueOf()];
        }
    }
};

export default toolTime;
