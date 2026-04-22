import toolTime from 'src/lib/toolTime';

const ONE_DAY = 24 * 60 * 60 * 1000;
const STAGE_SIGN = {
    PER: -1,
    CUR: 0,
    NEXT: 1,
};

// 周获取
const getWeek = (offset = 0) => {
    const oneWeek = 7;
    let day = toolTime.getMom().day();
    day = day == 0 ? 6 : day - 1;

    const startTime = toolTime.getMom().add(-day, 'day').startOf('day') + offset * ONE_DAY * oneWeek;
    return [toolTime.getMom(startTime), toolTime.getMom(startTime + ONE_DAY * oneWeek - 1)];
};

const getTimestampArrayByType = type => {
    return (offset = 0, endToday) => {
        const startTime = toolTime.getMom().add(offset, type).startOf(type);
        const endTime = endToday ? toolTime.getMom().endOf('day') : toolTime.getMom().add(offset, type).endOf(type);
        return [startTime, endTime];
    };
};

const getHalfMonth = isUp => {
    if (isUp) {
        const startTime = toolTime.getMom().startOf('month');
        const endTime = toolTime.getMom(+startTime + 15 * ONE_DAY - 1);
        return [startTime, endTime];
    } else {
        const startMonth = toolTime.getMom().startOf('month');
        const startTime = toolTime.getMom(+startMonth + 15 * ONE_DAY);
        const endTime = toolTime.getMom().endOf('month');
        return [startTime, endTime];
    }
};

export default function initTimestampMap() {
    const getDate = getTimestampArrayByType('day');
    const getMonth = getTimestampArrayByType('month');
    const getQuarter = getTimestampArrayByType('quarter');
    const getYear = getTimestampArrayByType('year');
    const obj = {
        0: getDate(STAGE_SIGN.CUR),
        1: getDate(STAGE_SIGN.PER),
        2: getDate(STAGE_SIGN.NEXT),
        3: getMonth(STAGE_SIGN.CUR),
        4: getMonth(STAGE_SIGN.PER),
        5: getMonth(STAGE_SIGN.NEXT),
        6: getQuarter(STAGE_SIGN.CUR),
        7: getQuarter(STAGE_SIGN.PER),
        8: getQuarter(STAGE_SIGN.NEXT),
        10: getWeek(STAGE_SIGN.CUR),
        11: getWeek(STAGE_SIGN.PER),
        12: getWeek(STAGE_SIGN.NEXT),
        13: getYear(STAGE_SIGN.PER),
        14: getYear(STAGE_SIGN.CUR),
        15: getYear(STAGE_SIGN.NEXT),
        21: getMonth(STAGE_SIGN.CUR, true),
        22: getQuarter(STAGE_SIGN.CUR, true),
        23: getYear(STAGE_SIGN.CUR, true),
        24: getHalfMonth(true),
        25: getHalfMonth(false),
    };

    return obj;
}
