import TextDic from './TextDic';

/**
 * 人员类 Lookup / MultiLookup：表头筛选与 TextDic 一致（关键字），避免缺失模块导致构建失败。
 * 顺序需在 TextDic 之前（见 dic/Index.js），否则会落到文本规则。
 */
export default {
  ...TextDic,
  match: ({ type, subType }) =>
    (type === 'Lookup' && subType === 'User') ||
    (type === 'MultiLookup' && subType === 'User'),
};
