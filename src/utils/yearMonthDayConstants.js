import { LangCN, getCurrentShowLanguage } from 'src/utils/i18n';
const notChinese = getCurrentShowLanguage() !== LangCN;
export const YEAR = notChinese ? '-' : '年';
export const MONTH = notChinese ? '-' : '月';
export const DAY = notChinese ? '' : '日';
export const WEEK = notChinese ? '周' : '周'; // i18n-ignore
export const QUARTER = notChinese ? '季度' : '季度'; // i18n-ignore
export const YEAR_FORMAT = `YYYY${notChinese ? '' : YEAR}`; // 2023年
export const YEAR_MONTH_FORMAT = `YYYY${YEAR}MM${notChinese ? '' : MONTH}`; // 2023年01月
export const YEAR_MONTH_DAY_FORMAT = `YYYY${YEAR}MM${MONTH}DD${notChinese ? '' : DAY}`; // 2023年01月01日
export const YEAR_MONTH_DAY_HOUR_MINUTE_FORMAT = `YYYY${YEAR}MM${MONTH}DD${notChinese ? '' : DAY} HH:mm`; // 2023年01月01日 10:00
export const YEAR_WEEK_FORMAT = `${YEAR_FORMAT}-W${WEEK}`; // 2023年第1周
export const YEAR_QUARTER_FORMAT = `${YEAR_FORMAT}-Q${QUARTER}`; // 2023年第1季度
export const MONTH_DAY_FORMAT = `MM${MONTH}DD${notChinese ? '' : DAY}`; // 01月01日
export const MONTH_DAY_HOUR_MINUTE_FORMAT = `${MONTH_DAY_FORMAT} HH:mm`; // 01月01日 10:00
