import * as fileListService from 'src/services/fileList';

export default {
  namespace: 'fileList',
  state: {},
  effects: {
    *signatureUrl({ payload, callback }, { call }) {
      try {
        const res = yield call(fileListService.signatureUrl, payload);
        if (res?.data) callback && callback(res.data);
        else if (res && !res.result) callback && callback(res);
      } catch (e) {
        console.error('fileList.signatureUrl error:', e);
      }
    },
  },
};
