import React, { Component } from 'react';
import { Button, Upload, message } from 'antd';
import { PaperClipOutlined, UploadOutlined } from '@ant-design/icons';
import { connect } from 'dva';
import { t } from 'src/utils/i18n';
import CryptoJS from 'crypto-js';
import fileOxs from 'src/lib/fileOxs';
import { normalizeOssObjectKey, resolveUploadMaxFileSizeMB } from 'src/components/upload/uploadHelpers';
import './CloudUpload.less';

const { Dragger } = Upload;

/**
 * 华为云/阿里云上传组件（剥离业务，仅上传功能）
 * @param {Array} fileList - 已上传文件列表 [{ name, size, url, ... }]
 * @param {Function} onChange - (fileList, fromRemove?) => void
 * @param {number} maxLength - 最大文件数，默认 15
 * @param {number} maxFileSizeMB - 单文件最大大小（MB），默认 100；传 0 表示不限制
 * @param {string} accept - 接受的文件类型
 * @param {string} bucketType - 存储桶类型 'privateFileBucket' | 'privateImgBucket'
 * @param {boolean} disabled
 * @param {boolean} isDragger - 是否使用拖拽上传样式
 * @param {string} draggerBtnText - 拖拽上传时的按钮文字
 * @param {ReactNode} children - 自定义上传按钮
 */
class CloudUpload extends Component {
	componentDidMount() {
		this.props.dispatch({ type: 'upload/initOssConfig' });
		this.props.onRef?.(this);
	}

	/**
	 * 同步上传列表（支持 uploading / progress）
	 * @param {object} nextItem 文件项（至少包含 uid）
	 */
	upsertFileItem = (nextItem) => {
		const { fileList = [], onChange } = this.props;
		if (!nextItem?.uid) return;
		const idx = fileList.findIndex((row) => row?.uid === nextItem.uid);
		let nextList;
		if (idx >= 0) {
			nextList = [...fileList];
			nextList[idx] = { ...nextList[idx], ...nextItem };
		} else {
			nextList = [...fileList, nextItem];
		}
		onChange?.(nextList);
	};

	beforeUpload = (file, newFileList) => {
		const { fileList, maxLength = 15, maxFileSizeMB } = this.props;
		const limitMb = resolveUploadMaxFileSizeMB(maxFileSizeMB);
		if (limitMb != null && file?.size > limitMb * 1024 * 1024) {
			message.warning(t('i18n_upload_file_max_mb', { mb: limitMb }));
			return false;
		}
		const total = (fileList?.length || 0) + newFileList.length;
		if (total > maxLength) {
			message.warning(t('i18n_upload_max_count', { count: maxLength }));
			return false;
		}
		return true;
	};

	handlePut = ({ file, onProgress, onSuccess, onError }) => {
		const { dispatch, bucketType = 'privateFileBucket' } = this.props;

		this.upsertFileItem({
			uid: file.uid,
			name: file.name,
			size: file.size,
			lastModified: file.lastModified,
			type: file.type,
			status: 'uploading',
			percent: 0,
		});

		const getUploadParams = (params) =>
			new Promise((resolve, reject) => {
				dispatch({
					type: 'upload/getFileUploadParameter',
					payload: params,
					callback: (data) => (data ? resolve(data) : reject(new Error('noData'))),
				});
			});

		fileOxs.handleUpload(
			{
				file,
				uploadSessionId: file.uid,
				onProgress: (percent) => {
					const pct = Math.max(0, Math.min(100, percent * 100));
					this.upsertFileItem({
						uid: file.uid,
						status: 'uploading',
						percent: pct,
					});
					onProgress?.({ percent: pct });
				},
				onSuccess: (result) => {
					const fileEndPoint = fileOxs.getEndPoint(bucketType);
					const objectKey = normalizeOssObjectKey(result, '');
					const fileData = {
						uid: file.uid,
						name: file.name,
						size: file.size,
						lastModified: file.lastModified,
						type: file.type,
						status: 'done',
						percent: 100,
						md5: CryptoJS.MD5(file.name).toString(),
						url: fileEndPoint ? `${fileEndPoint}/${objectKey}` : objectKey,
					};
					this.upsertFileItem(fileData);
					onSuccess?.(fileData);
				},
				onError: (err) => {
					this.upsertFileItem({
						uid: file.uid,
						status: 'error',
					});
					if (err === 'noData') {
						dispatch({ type: 'upload/initOssConfig' });
						message.warning(t('i18n_oss_config_missing'));
					} else {
						message.warning(t('i18n_upload_failed'));
					}
					onError?.(err);
				},
				getUploadParams,
			},
			{ bucketType, timeout: 120000 }
		);
	};

	onRemove = (file) => {
		if (file.status === 'uploading' && file.uid != null) {
			fileOxs.cancelOssUpload(file.uid);
		}
		const { fileList, onChange } = this.props;
		const uid = file?.uid;
		const url = file?.unsignNatureUrl || file?.url;
		const newList = (fileList || []).filter((row) => {
			if (uid != null) return row?.uid !== uid;
			return row?.url !== url;
		});
		onChange?.(newList, true);
	};

	render() {
		const {
			fileList = [],
			maxLength = 15,
			accept,
			disabled,
			isDragger = false,
			draggerBtnText = '上传文件',
			children,
			listType = 'text',
		} = this.props;

		const showList = fileList.map((item, idx) => ({
			uid: item.uid || item.url || `${item.name || 'file'}-${idx}`,
			name: item.name,
			status: item.status || 'done',
			url: item.url,
			...item,
		}));

		const isFull = (fileList?.length || 0) >= maxLength;

		const uploadProps = {
			accept,
			listType,
			fileList: showList,
			multiple: maxLength > 1,
			maxCount: maxLength,
			disabled,
			openFileDialogOnClick: !(disabled || isFull),
			beforeUpload: this.beforeUpload,
			customRequest: this.handlePut,
			onRemove: this.onRemove,
			showUploadList: {
				showPreviewIcon: false,
				showRemoveIcon: !disabled,
			}
		};

		if (isDragger) {
			return (
				<div className="cloud-upload is-dragger">
					<Dragger {...uploadProps} className="custom-dragger">
						<p className="ant-upload-text">拖拽或单击后粘贴 ({fileList.length}/{maxLength})</p>
						<Button disabled={disabled || isFull} icon={<UploadOutlined />}>{draggerBtnText}</Button>
					</Dragger>
				</div>
			);
		}

		return (
			<div className="cloud-upload">
				<Upload {...uploadProps}>
					{children ?? (
						<Button
							disabled={disabled || isFull}
							icon={<PaperClipOutlined />}
						>
							{t('i18n_upload')} ({fileList.length}/{maxLength})
						</Button>
					)}
				</Upload>
			</div>
		);
	}
}

export default connect()(CloudUpload);
