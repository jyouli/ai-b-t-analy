import * as uploadService from 'src/services/upload';
import fileOxs, {
  setLocalStorage,
  OSS_READ_PARAM_KEY,
  OSS_CONFIG_KEY,
  OSS_READ_TIME_KEY,
} from 'src/lib/fileOxs';

export default {
  namespace: 'upload',
  state: {},
  effects: {
    *initOssConfig({ payload, callback }, { call }) {
      try {
        const [ossRes, readRes] = yield [
          call(uploadService.getOssConfig, payload),
          call(uploadService.getReadParam, payload),
        ];
        if (ossRes?.data) {
          setLocalStorage(OSS_CONFIG_KEY, ossRes.data);
        }
        if (readRes?.data) {
          setLocalStorage(OSS_READ_PARAM_KEY, readRes.data);
          setLocalStorage(OSS_READ_TIME_KEY, Date.now());
        }
        fileOxs.refreshConfig();
        callback?.({ ossCfg: ossRes?.data, readCfg: readRes?.data });
      } catch (e) {
        console.error('upload.initOssConfig error:', e);
        callback?.(null);
      }
    },

    *getFileUploadParameter({ payload, callback }, { call }) {
      try {
        const res = yield call(uploadService.getFileUploadParameter, payload);
        if (res?.data) callback?.(res.data);
        else callback?.(null);
      } catch (e) {
        console.error('upload.getFileUploadParameter error:', e);
        callback?.(null);
      }
    },
  },
};
