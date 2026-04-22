/**
 * 华为云 OBS / 阿里云 OSS 上传封装（剥离业务，仅保留上传功能）
 */
import ObsClient from 'esdk-obs-browserjs';
import OSS from 'ali-oss';

const OSS_READ_PARAM_KEY = 'crmyun.oss.readParam';
const OSS_CONFIG_KEY = 'crmyun.oss.config';
const OSS_READ_TIME_KEY = 'crmyun.oss.readTime';
const Expires = 1800;

function getLocalStorage(key) {
	if (typeof window === 'undefined') return null;
	const str = window.localStorage.getItem(key) || '';
	try {
		return str && (str.indexOf('{') !== -1 || str.indexOf('[') !== -1) ? JSON.parse(str) : str;
	} catch {
		return str;
	}
}

function setLocalStorage(key, value) {
	if (typeof window === 'undefined') return;
	window.localStorage.setItem(key, typeof value === 'string' ? value : JSON.stringify(value));
}

const strategyType = {
	imFileBucket: 'imFileEndPoint',
	imImgBucket: 'imImgEndPoint',
	privateFileBucket: 'privateFileEndPoint',
	privateImgBucket: 'privateImgEndPoint',
	publicFileBucket: 'publicFileEndPoint',
	publicImgBucket: 'publicImgEndPoint',
};

const encodeURIComponentUrl = url => {
	if (url && url.includes('.com/') && !url.includes('%2') && !url.includes('minio')) {
		const pathList = url.split('/');
		pathList[pathList.length - 1] = encodeURIComponent(pathList[pathList.length - 1]);
		return pathList.join('/');
	}
	return url;
};

const fileOxs = {
	/** 阿里云 multipart 客户端（按会话 id），支持多槽并行上传 */
	_ossClients: new Map(),

	get readCfg() {
		return getLocalStorage(OSS_READ_PARAM_KEY);
	},
	get ossCfg() {
		return getLocalStorage(OSS_CONFIG_KEY);
	},

	/**
	 * 取消 OSS 分片上传
	 * @param {string} [sessionId] - 传入则只取消该次上传；不传则取消全部（兼容旧调用）
	 */
	cancelOssUpload(sessionId) {
		if (sessionId == null) {
			this._ossClients.forEach((c) => {
				try {
					c?.cancel?.();
				} catch {
					/* ignore */
				}
			});
			this._ossClients.clear();
			return;
		}
		const c = this._ossClients.get(sessionId);
		try {
			c?.cancel?.();
		} catch {
			/* ignore */
		}
		this._ossClients.delete(sessionId);
	},

	/** @deprecated 使用 cancelOssUpload(sessionId) 或 cancelOssUpload() */
	cancelActiveOssUpload() {
		this.cancelOssUpload();
	},

	getBucketName(ossCfg, bucketType) {
		if (!ossCfg) return bucketType || 'privateFileBucket';
		if (ossCfg.filesPublic && bucketType === 'privateFileBucket') return 'publicFileBucket';
		if (ossCfg.filesPublic && bucketType === 'privateImgBucket') return 'publicImgBucket';
		return bucketType || 'privateFileBucket';
	},

	getEndPoint(bucketType) {
		const ossCfg = this.ossCfg;
		if (!ossCfg?.strategy) return '';
		const name = this.getBucketName(ossCfg, bucketType);
		return ossCfg.strategy[strategyType[name]] || ossCfg.strategy.privateFileEndPoint || '';
	},

	getObsClient(bucket, ossCfg, readCfg, { bucketType } = {}) {
		if (!ossCfg?.strategy || !readCfg) return null;
		let server = ossCfg.strategy.endPoint;
		if (readCfg.endpoint) server = readCfg.endpoint;
		const readConfig = {
			access_key_id: readCfg.huaweiAccessKeyId || readCfg.accessKeyId,
			secret_access_key: readCfg.huaweiAccessKeySecret || readCfg.accessKeySecret,
			server,
			security_token: readCfg.huaweiSecurityToken || readCfg.securityToken,
			timeout: Expires,
		};
		return new ObsClient(readConfig);
	},

	getOssClient(bucket, ossCfg, readCfg, timeout) {
		if (!ossCfg?.strategy || !readCfg) return null;
		const region =
			ossCfg.name === 'OSS' && ossCfg.strategy.endPoint
				? ossCfg.strategy.endPoint.replace(/(http(s)?:\/\/)|(.aliyuncs.com)/g, '')
				: 'oss-cn-beijing';
		const config = {
			region,
			accessKeyId: readCfg.aliyunAccessKeyId || readCfg.accessKeyId,
			accessKeySecret: readCfg.aliyunAccessKeySecret || readCfg.accessKeySecret,
			stsToken: readCfg.aliyunSecurityToken || readCfg.securityToken,
			bucket,
		};
		if (timeout) config.timeout = timeout;
		if (typeof window !== 'undefined' && window.location?.origin?.indexOf('https') !== -1) {
			config.secure = true;
		}
		return new OSS(config);
	},

	refreshConfig() {
		// readCfg/ossCfg 通过 getter 从 localStorage 读取，无需额外刷新
	},

	getFileBucket(fileUrl) {
		return fileUrl.replace(/(http(s)?:\/\/)/g, '').split('.')[0];
	},

	getFileName(fileUrl) {
		const url = fileUrl.replace(/(http(s)?:\/\/)/g, '');
		const name = url.substring(url.indexOf('/') + 1);
		return name;
	},

	getImgExtra(resizeInfo = {}) {
		let { resize, resizeType, width, height } = resizeInfo;
		let process = 'image/resize,m_fixed';
		if (resize !== undefined) {
			process = process + `,w_${resize},h_${resize}`;
		} else if (resizeType === 'withHeight') {
			if (width && height) {
				process = `image/resize,m_fixed,w_${width},h_${height}`;
			} else if (width && !height) {
				process = `image/resize,w_${width},m_lfit`;
			} else if (!width && height) {
				process = `image/resize,h_${height},m_lfit`;
			} else {
				process = '';
			}
		} else if (resizeType === 'percent') {
			process = width ? `image/resize,p_${width}` : '';
		} else {
			process = `image/resize,m_lfit,h_100`;
		}
		return process;
	},

	checkOssFile(url, bucket) {
		if (!url) {
			return;
		}
		const alibabaRegex = /^(https?:\/\/(test-|cloud-).*\.cloud\.hecom\.cn)|aliyuncs\.com/;
		return alibabaRegex.test(url) || (bucket && !/^hw/.test(bucket));
	},

	checkUrlOrigin(url = '') {
		if (url.includes('file-proxy-server')) {
			return 'minio';
		}
		const domain = url.split('.')[0];
		if (domain.includes('minio')) {
			return 'minio';
		} else if (domain.includes('hw')) {
			return 'obs';
		} else {
			return 'oss';
		}
	},

	checkReadTime(dispatch, callback, payload) {
		const readTime = getLocalStorage(OSS_READ_TIME_KEY) || 0;
		const timeInterval = new Date().getTime() - parseInt(readTime, 10);
		if (!readTime || timeInterval >= Expires * 1000) {
			if (typeof dispatch !== 'function') {
				callback?.(null);
				return;
			}
			dispatch({
				type: 'upload/initOssConfig',
				payload: payload || {},
				callback: (res) => {
					this.refreshConfig();
					callback?.(res);
				},
			});
			return;
		}
		callback?.();
	},

	signFile(fileUri, fileDesc, type, extra, addProcessToUrl) {
		const self = this;
		if (fileUri && self.readCfg && self.ossCfg) {
			const bucket = self.getFileBucket(fileUri);
			if (bucket.indexOf('private') !== -1) {
				let resultUrl = '';
				const fileName = self.getFileName(fileUri);
				function signOss() {
					const client = self.getOssClient(bucket, self.ossCfg, self.readCfg);
					if (type === 'image') {
						if (addProcessToUrl) {
							const process = self.getImgExtra(extra || {});
							return client.signatureUrl(fileName, { expires: Expires, process });
						} else {
							return client.signatureUrl(fileName, { expires: Expires });
						}
					} else if (type === 'video' || type?.includes('preview')) {
						return client.signatureUrl(fileName);
					} else {
						const fileArr = fileName.split('/');
						const name = fileDesc || fileArr[fileArr.length - 1] || fileName;
						const response = { 'content-disposition': `attachment; filename=${encodeURIComponent(name)}` };
						if (addProcessToUrl) {
							const process = self.getImgExtra(extra || {});
							return client.signatureUrl(fileName, { response, process, expires: Expires });
						} else {
							return client.signatureUrl(fileName, { response, expires: Expires });
						}
					}
				}
				if (this.checkOssFile(fileUri, bucket)) {
					resultUrl = signOss();
				} else {
					const client = self.getObsClient(fileUri, self.ossCfg, self.readCfg, { type });
					const fileArr = fileName.split('/');
					const name = fileDesc || fileArr[fileArr.length - 1] || fileName;
					const QueryParams = addProcessToUrl
						? { 'x-image-process': 'image/resize,m_lfit,h_100' }
						: type === 'preview'
							? undefined
							: { 'response-content-disposition': `attachment; filename=${encodeURIComponent(name)}` };
					const res = client.createSignedUrlSync({
						Method: 'GET',
						Bucket: bucket,
						Key: fileName,
						Expires: Expires,
						QueryParams,
					});
					resultUrl = res.SignedUrl;
					if (type?.includes('preview')) {
						resultUrl = resultUrl.replace('obs.cn-north-4.myhuaweicloud.com', 'cloud.hecom.cn');
					}
				}
				return resultUrl;
			} else {
				const fileOrigin = fileOxs.checkUrlOrigin(fileUri);
				if (type?.includes('preview')) {
					if (fileOrigin === 'minio') {
						return fileUri + (fileUri.includes('?') ? '&' : '?') + 'isPreview=1';
					} else if (fileOrigin === 'obs') {
						return fileUri.replace('obs.cn-north-4.myhuaweicloud.com', 'cloud.hecom.cn');
					} else {
						return encodeURIComponentUrl(fileUri);
					}
				} else if (type === 'download') {
					if (fileOrigin === 'minio') {
						return fileUri;
					} else if (fileOrigin === 'obs') {
						return fileUri.replace('cloud.hecom.cn', 'obs.cn-north-4.myhuaweicloud.com');
					} else {
						return encodeURIComponentUrl(fileUri);
					}
				} else {
					return encodeURIComponentUrl(fileUri);
				}
			}
		} else {
			return encodeURIComponentUrl(fileUri);
		}
	},

	/**
	 * 执行上传
	 * @param {Object} options
	 * @param {File} options.file
	 * @param {Function} options.onProgress (percent) => void
	 * @param {Function} options.onSuccess (result) => void  result: { name: objectKey }
	 * @param {Function} options.onError (err) => void
	 * @param {Function} options.onBeforeUpload
	 * @param {Function} options.getUploadParams 获取上传参数的异步函数 (file) => Promise<{ accessKeyId, objectKey, bucket, ... }>
	 * @param {string} [options.uploadSessionId] - 用于取消本次 OSS 上传的唯一 id（建议 file.uid）
	 * @param {string} options.bucketType 如 'privateFileBucket' | 'privateImgBucket'
	 * @param {number} options.timeout
	 */
	async handleUpload(
		{ file, onProgress, onSuccess, onError, onBeforeUpload, getUploadParams, uploadSessionId },
		{ bucketType = 'privateFileBucket', timeout = 120000 } = {}
	) {
		const fileName = file.name.replace(/[^\u4E00-\u9FA5A-Za-z0-9.]/g, '');
		const ossCfg = this.ossCfg;
		const readCfg = this.readCfg;

		if (!ossCfg?.strategy || !readCfg) {
			onError?.('noData');
			return;
		}

		let data;
		try {
			data = await getUploadParams({
				fileName,
				fileSize: file.size,
				bucket: ossCfg.strategy[this.getBucketName(ossCfg, bucketType)] || bucketType,
				originalFileName: file.name,
			});
		} catch (e) {
			onError?.(e);
			return;
		}

		if (!data?.accessKeyId && !ossCfg?.customConfig) {
			onError?.('noData');
			return;
		}

		onBeforeUpload?.();
		const sessionId =
			uploadSessionId ?? `up-${file.name}-${file.size}-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
		this.uploadByConfig(
			{ file, data, onProgress, onSuccess, onError, uploadSessionId: sessionId },
			{ bucketType, timeout }
		);
	},

	uploadByConfig(
		{ file, data, onProgress, onSuccess, onError, uploadSessionId },
		{ bucketType, timeout } = {}
	) {
		const ossCfg = this.ossCfg;
		const readCfg = this.readCfg;
		const bucket = ossCfg.strategy[this.getBucketName(ossCfg, bucketType)] || data.bucket || bucketType;

		if (ossCfg?.customConfig) {
			console.warn('fileOxs: customConfig 暂不支持，请使用 OBS/OSS');
			onError?.('customConfig not supported');
			return;
		}

		if (ossCfg.name === 'OSS') {
			this.ossUpload(
				{ file, data, onProgress, onSuccess, onError, uploadSessionId },
				bucket,
				timeout
			);
		} else if (ossCfg.name === 'OBS') {
			this.obsUpload({ file, data, onProgress, onSuccess, onError }, bucket, bucketType);
		} else {
			onError?.('Unknown oss config name: ' + ossCfg?.name);
		}
	},

	obsUpload({ file, data, onProgress, onSuccess, onError }, bucket, bucketType) {
		try {
			const client = this.getObsClient(data.bucket || bucket, this.ossCfg, data, { bucketType });
			if (!client) {
				onError?.('noData');
				return;
			}
			const fileObj = {
				Bucket: data.bucket || bucket,
				Key: data.objectKey,
				SourceFile: file,
				ContentType: file.type,
				ProgressCallback: (transferredAmount, totalAmount) => {
					onProgress?.(totalAmount > 0 ? transferredAmount / totalAmount : 0);
				},
			};
			client.putObject(fileObj, (err, result) => {
				if (err) {
					onError?.(err);
				} else if (result?.CommonMsg?.Status < 300) {
					onSuccess?.({ name: data.objectKey });
				} else {
					onError?.(err || result);
				}
			});
		} catch (e) {
			onError?.(e);
		}
	},

	ossUpload({ file, data, onProgress, onSuccess, onError, uploadSessionId }, bucket, timeout) {
		const sid =
			uploadSessionId ??
			`up-${data.objectKey}-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
		try {
			const client = this.getOssClient(data.bucket || bucket, this.ossCfg, data, timeout);
			if (!client) {
				onError?.('noData');
				return;
			}
			this._ossClients.set(sid, client);
			client
				.multipartUpload(data.objectKey, file, {
					progress: (percent) => onProgress?.(percent),
				})
				.then((result) => {
					this._ossClients.delete(sid);
					onSuccess?.(result);
				})
				.catch((err) => {
					this._ossClients.delete(sid);
					if (!client?.isCancel?.()) onError?.(err);
				});
		} catch (e) {
			this._ossClients.delete(sid);
			onError?.(e);
		}
	},
};

export { setLocalStorage, getLocalStorage, OSS_READ_PARAM_KEY, OSS_CONFIG_KEY, OSS_READ_TIME_KEY };
export default fileOxs;
