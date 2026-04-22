import { t, getServerLanguage } from 'src/utils/i18n';
import { message } from 'antd';
import ENV, { universePath } from 'src/config/env';
import { requestQueue } from 'src/utils/RequestQueue';
import { getClientTag, showLogin } from 'src/utils/login';
import { getDvaStore } from 'src/utils/dvaRuntime';

let loginModalEmitted = false;

/** 与 foreground sessionCheck 一致：业务 result 表示登录失效时清理并弹登录框 */
function isSessionExpiredResult(r) {
	if (r == null || r === '') return false;
	const n = Number(r);
	return n === 51018 || n === -1 || n === -800;
}

function clearSessionAndShowLoginModal() {
	if (loginModalEmitted) return;
	loginModalEmitted = true;
	localStorage.removeItem('auth');
	localStorage.removeItem('my');
	localStorage.removeItem('userDetail');
	localStorage.removeItem('entDetails');
	const store = getDvaStore();
	store?.dispatch({
		type: 'account/saveReducer',
		payload: { my: null, auth: null, userDetail: null, entDetails: {}, authList: null, isLogined: false, entUserList: [] },
	});
	showLogin();
	setTimeout(() => {
		loginModalEmitted = false;
	}, 500);
}

const UNIVERSE_PREFIX = universePath.startsWith('/') ? universePath : `/${universePath}`;

/**
 * 将业务路径解析为可请求的 URL。
 * - 已是 http(s) → 原样
 * - 已以 /universe 开头 → 原样
 * - 以 /paas 开头 → 实为网关子路径，补成 /universe/paas/...
 * - 其余视为相对 universe 的路径（如 paas/env/... → /universe/paas/env/...）
 */
export function resolveRequestUrl(url) {
	if (url == null || url === '') return url;
	const u = String(url);
	if (u.startsWith('http://') || u.startsWith('https://')) return u;
	if (u.startsWith('/universe')) return u;
	if (u.startsWith('/paas')) {
		return `${UNIVERSE_PREFIX}${u}`;
	}
	return `${UNIVERSE_PREFIX}/${u.replace(/^\//, '')}`;
}

function parseJSON(response) {
	return response.json();
}

function checkStatus(response) {
	if (response.status >= 200 && response.status < 300) {
		return response;
	}
	if (response.status === 401) {
		clearSessionAndShowLoginModal();
		throw new Error(t('i18n_login_expired'));
	}
	if (response.status >= 500) {
		message.error(t('i18n_please_relogin'));
		throw new Error('Server Error');
	}
	throw new Error(response.statusText || 'Request failed');
}

const RESULT_PASS_THROUGH = new Set(['51044', '51045', '50030', '51022']);

/** 与 foreground request.js NoLocaleUrl 一致：部分接口不传 user-locale */
const NoLocaleUrl = ['/user/getSalt'];

function resultCheck(data, extraPassThroughResults = [], responseAll = false) {
	if (data == null) {
		return data;
	}
	const r = data.result;
	if (r == 0 || r === '0') {
		return data;
	}
	if (isSessionExpiredResult(r)) {
		message.error(data?.desc || t('i18n_login_expired'));
		clearSessionAndShowLoginModal();
		throw new Error(data?.desc || t('i18n_login_expired'));
	}
	const rStr = r != null ? String(r) : '';
	const passThroughExtra = extraPassThroughResults.some((x) => String(x) === rStr);
	if (RESULT_PASS_THROUGH.has(rStr) || passThroughExtra) {
		return data;
	}
	if (
		!responseAll &&
		r !== 500 &&
		r !== '500' &&
		r !== 50030 &&
		r !== '50030' &&
		r !== 51044 &&
		r !== '51044'
	) {
		message.error(data?.desc || 'Request failed');
	}
	if (responseAll) {
		return data;
	}
	throw new Error(data?.desc || 'Request failed');
}

function getAuthHeaders() {
	const authStr = localStorage.getItem('auth');
	if (!authStr) {
		return {};
	}
	try {
		const auth = JSON.parse(authStr);
		return {
			accessToken: auth.accessToken,
			entCode: auth.entCode,
			uid: auth.uid,
			empCode: auth.empCode,
		};
	} catch (e) {
		return {};
	}
}

function buildCommonHeaders(fullUrl, headers = {}, requireLogin = true) {
	const pre = window.location.origin.includes('pre');
	const merged = {
		...(headers || {}),
		version: ENV.version,
	};

	if (requireLogin) {
		Object.assign(merged, getAuthHeaders(), {
			clientTag: getClientTag(pre ? 'web-pre' : 'web'),
		});
	}

	const authorizeLoginTag = localStorage.getItem('authorizeLoginTag');
	const tcBase = ENV.tcURL;
	if (fullUrl && authorizeLoginTag && (!tcBase || !String(fullUrl).includes(tcBase))) {
		if (authorizeLoginTag.includes('web_tal')) {
			try {
				const authReal = JSON.parse(localStorage.getItem('realAuthInfo') || '{}');
				Object.assign(merged, {
					...authReal,
					clientTag: authorizeLoginTag,
				});
			} catch (e) {
				Object.assign(merged, { clientTag: authorizeLoginTag });
			}
		} else {
			Object.assign(merged, { clientTag: authorizeLoginTag });
		}
	}

	if (!NoLocaleUrl.some((f) => fullUrl.includes(f))) {
		merged['user-locale'] = getServerLanguage(fullUrl);
	}

	return merged;
}

/**
 * 解析 SSE 单个事件块（以空行分隔），仅提取 data 字段。
 * - 支持 data: 多行（用 \n 拼接）
 * - data 优先尝试 JSON.parse，失败则返回原始字符串
 * @param {string} rawChunk SSE 事件原始文本（不包含结尾的空行分隔符）
 * @returns {any | null}
 */
function parseSSEChunk(rawChunk) {
	if (rawChunk == null) return null;
	const chunk = String(rawChunk).trim();
	if (!chunk) return null;

	const lines = chunk.split(/\r?\n/);
	let rawData = '';
	for (const line of lines) {
		if (!line || line.startsWith(':')) continue;
		if (line.startsWith('data:')) {
			const v = line.substring(5).trim();
			rawData = rawData ? `${rawData}\n${v}` : v;
		}
	}

	if (!rawData) return null;

	try {
		return JSON.parse(rawData);
	} catch (e) {
		return rawData;
	}
}

/**
 * 判断是否为“主动关闭 SSE 连接”导致的异常（不同 fetch/stream 实现的错误形态不一致）。
 * @param {any} err
 * @param {boolean} closed
 * @param {AbortController} controller
 * @returns {boolean}
 */
function isSSEClosedError(err, closed, controller) {
	if (closed) return true;
	if (controller?.signal?.aborted) return true;
	if (err?.name === 'AbortError') return true;

	const msg = String(err?.message || '');
	if (!msg) return false;

	if (msg.includes('BodyStreamBuffer') && msg.includes('aborted')) return true;
	if (/aborted|cancelled|canceled/i.test(msg)) return true;

	return false;
}

/**
 * 发起 SSE 请求（POST + text/event-stream），通过回调接收流式消息。
 * @param {string} url 业务路径或完整 URL
 * @param {object} data POST body（JSON）
 * @param {object} opts
 * @param {object} [opts.headers] 额外 headers
 * @param {boolean} [opts.requireLogin] 是否注入登录头
 * @param {(msg: any) => void} [opts.onMessage] 每条 SSE 消息回调（仅 data 字段解析结果）
 * @param {(response: Response) => void} [opts.onOpen] 连接建立回调
 * @param {(err: Error) => void} [opts.onError] 错误回调（AbortError 不回调）
 * @param {() => void} [opts.onComplete] 流结束回调
 * @param {() => void} [opts.onClose] 连接关闭回调（正常结束/异常/手动关闭都会触发）
 * @returns {{ closeConnect: () => void, done: Promise<void> }}
 */
export function postSSE(url, data = {}, opts = {}) {
	const {
		headers = {},
		requireLogin = true,
		onMessage,
		onOpen,
		onError,
		onComplete,
		onClose,
	} = opts || {};

	const fullUrl = resolveRequestUrl(url);
	const controller = new AbortController();
	let reader = null;
	let closed = false;

	const closeConnect = () => {
		if (closed) return;
		closed = true;
		try {
			if (!controller?.signal?.aborted) {
				controller.abort();
			}
		} catch (e) {
			// ignore
		}
		try {
			const maybePromise = reader?.cancel?.();
			if (maybePromise && typeof maybePromise.catch === 'function') {
				maybePromise.catch(() => {});
			}
		} catch (e) {
			// ignore
		}
	};

	const mergedHeaders = buildCommonHeaders(
		fullUrl,
		{
			...(headers || {}),
			Accept: 'text/event-stream',
			'Content-Type': 'application/json',
		},
		requireLogin
	);

	const done = fetch(fullUrl, {
		method: 'POST',
		headers: mergedHeaders,
		body: JSON.stringify(data || {}),
		signal: controller.signal,
	})
		.then(checkStatus)
		.then(async (response) => {
			onOpen?.(response);
			if (!response.body || !response.body.getReader) {
				throw new Error('SSE stream is not supported in this browser');
			}
			reader = response.body.getReader();
			const decoder = new TextDecoder('utf-8');
			let buffer = '';

			while (true) {
				const { value, done: streamDone } = await reader.read();
				if (streamDone) break;
				buffer += decoder.decode(value, { stream: true });

				const chunks = buffer.split(/\r?\n\r?\n/);
				buffer = chunks.pop() || '';
				for (const rawChunk of chunks) {
					const msg = parseSSEChunk(rawChunk);
					if (msg != null) onMessage?.(msg);
				}
			}

			buffer += decoder.decode();
			const tail = buffer.trim();
			if (tail) {
				const msg = parseSSEChunk(tail);
				if (msg != null) onMessage?.(msg);
			}

			onComplete?.();
		})
		.catch((err) => {
			if (isSSEClosedError(err, closed, controller)) return;
			console.error('Request error:', err);
			onError?.(err);
			throw err;
		})
		.finally(() => {
			onClose?.();
		});

	return {
		closeConnect,
		done,
	};
}

/**
 * @param {string} url - 完整 URL、或以 /universe 开头、或相对 universe 的路径（含 paas/...）
 * @param {object} options - fetch options
 * @param {boolean} requireLogin
 * @param {boolean} isIdle - 是否闲时请求（低优先级，正常请求空闲时执行）
 * @param {object} requestExtra
 * @param {string[]} [requestExtra.extraPassThroughResults] - 与 RESULT_PASS_THROUGH 类似，额外允许透传的 result 字符串
 * @param {boolean} [requestExtra.responseAll] - 为 true 时业务错误不 message、不 throw，原样返回 body 供业务根据 result 处理（登录失效仍会提示并抛错）
 */
export default function request(url, options = {}, requireLogin = true, isIdle = false, requestExtra = {}) {
	const { extraPassThroughResults = [], responseAll = false } = requestExtra || {};
	const fullUrl = resolveRequestUrl(url);
	options.headers = buildCommonHeaders(fullUrl, options.headers || {}, requireLogin);

	return requestQueue.add(
		() =>
			fetch(fullUrl, options)
				.then(checkStatus)
				.then(parseJSON)
				.then((data) => resultCheck(data, extraPassThroughResults, responseAll))
				.catch((err) => {
					console.error('Request error:', err);
					throw err;
				}),
		isIdle
	);
}

export function get(url, params = {}, headers = {}, requireLogin = true, requestExtra = {}) {
	const query = new URLSearchParams(params).toString();
	const path = query ? `${url}?${query}` : url;
	return request(path, { method: 'GET', headers: { ...(headers || {}) } }, requireLogin, false, requestExtra);
}

/** @param {object} [requestExtra] 可含 extraPassThroughResults、responseAll（见 default request JSDoc） */
export function post(url, data = {}, headers = {}, requireLogin = true, requestExtra = {}) {
	return request(
		url,
		{
			method: 'POST',
			headers: { 'Content-Type': 'application/json', ...(headers || {}) },
			body: JSON.stringify(data),
		},
		requireLogin,
		false,
		requestExtra
	);
}
