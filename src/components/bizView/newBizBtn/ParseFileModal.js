import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Button } from 'antd';
import { CloseCircleOutlined, LoadingOutlined } from '@ant-design/icons';
import Modal from 'src/components/common/Modal/Modal';
import './ParseFileModal.less';

function tryParseTextToJson(text) {
    if (!text) return null;
    try {
        return JSON.parse(text);
    } catch (e) {
        return null;
    }
}

function formatTextLines(text) {
    const raw = String(text || '');
    const lines = raw.split(/\r?\n/);
    if (!lines.length) return [];
    return lines.map((line) => ({ line }));
}

function ParseFileModal(props) {
    const { visible, file, title = 'AI录入营业执照', dispatch, onCancel, onOk } = props;
    const sseCtrlRef = useRef(null);
    const sseAggRef = useRef({ texts: [], completed: false });

    const [phase, setPhase] = useState('idle');
    const [phaseDesc, setPhaseDesc] = useState('');
    const [displayText, setDisplayText] = useState('');

    const stopSSE = useCallback(() => {
        sseCtrlRef.current?.closeConnect?.();
        sseCtrlRef.current = null;
    }, []);

    const handleCancel = useCallback(() => {
        stopSSE();
        setPhase('idle');
        setPhaseDesc('');
        setDisplayText('');
        sseAggRef.current = { texts: [], completed: false };
        onCancel?.();
    }, [onCancel, stopSSE]);

    const startAnalyze = useCallback(async () => {
        if (!file?.url || !dispatch) return;

        stopSSE();
        setPhase('parsing');
        setPhaseDesc('');
        setDisplayText('');
        sseAggRef.current = { texts: [], completed: false };

        try {
            const ctrl = await dispatch({
                type: 'credit/analyzeBusinessLicense',
                payload: { file: file || {} },
                onMessage: (msg) => {
                    const event = String(msg?.event || '').toLowerCase();
                    const text = msg?.data?.text || '';

                    if (event === 'message') {
                        if (text) {
                            sseAggRef.current.texts.push(text);
                            setDisplayText((prev) => `${prev}${text}`);
                        }
                        return;
                    }

                    if (event === 'result') {
                        const jsonFromText = tryParseTextToJson(text);
                        if (jsonFromText == null) {
                            sseAggRef.current.completed = true;
                            setPhase('error');
                            setPhaseDesc('解析失败，请重试');
                            stopSSE();
                            return;
                        } 
                        sseAggRef.current.completed = true;
                        setPhase('success');
                        setDisplayText(text);
                        console.log('jsonFromText', jsonFromText);
                        onOk?.(jsonFromText);
                        return;
                    }

                    if (event === 'error') {
                        sseAggRef.current.completed = true;
                        setPhase('error');
                        setPhaseDesc(msg?.data?.message || msg?.desc || '识别失败');
                        stopSSE();
                        return;
                    }
                },
                onError: (err) => {
                    sseAggRef.current.completed = true;
                    setPhase('error');
                    setPhaseDesc('识别失败');
                    stopSSE();
                }
            });
            sseCtrlRef.current = ctrl;
        } catch (e) {
            setPhase('error');
            setPhaseDesc('识别失败');
            stopSSE();
        }
    }, [dispatch, file, handleCancel, onOk, stopSSE]);

    useEffect(() => {
        if (visible && file?.url) {
            startAnalyze();
        }
        return () => stopSSE();
    }, [visible, file?.url, startAnalyze, stopSSE]);

    const panelTitle = useMemo(() => {
        if (phase === 'parsing') return '正在解析的命令执行ing';
        if (phase === 'error') return '执行有误，请重试或取消识别';
        return '已完成命令执行';
    }, [phase]);

    const lineItems = useMemo(() => formatTextLines(displayText), [displayText]);

    return (
        <Modal
            open={visible}
            mask={{ closable: false }}
            closable={false}
            width={756}
            footer={null}
            className="parse-file-modal"
        >
            <div className="parse-file-header">
                <div className="parse-file-title-row">
                    <div className="parse-file-title">
                        {phase === 'parsing' ? <LoadingOutlined spin className="parse-file-title-icon" /> : null}
                        {phase === 'error' ? <CloseCircleOutlined className="parse-file-title-icon-error" /> : null}
                        <span>
                            {phase === 'error' ? (phaseDesc || '解析失败') : title}
                        </span>
                    </div>
                    {phase === 'parsing' ? <div className="parse-file-sub">解析中，请等待...</div> : null}
                </div>
            </div>

            <div className="parse-file-body">
                <div className="parse-file-panel">
                    <div className="parse-file-panel-title">
                        {phase === 'parsing' ? <LoadingOutlined spin className="parse-file-panel-title-icon" /> : null}
                        {phase === 'error' ? <CloseCircleOutlined className="parse-file-panel-title-icon-error" /> : null}
                        <span>{panelTitle}</span>
                    </div>
                    <div className="parse-file-code">
                        {lineItems.map((it, idx) => (
                            <div key={idx} className="parse-file-line">
                                <span className="parse-file-text">{it.line}</span>
                            </div>
                        ))}
                    </div>
                </div>
                <div className="parse-file-footer">
                    <Button onClick={handleCancel}>取消</Button>
                    {phase === 'error' ? (
                        <Button type="primary" onClick={startAnalyze}>重试</Button>
                    ) : null}
                </div>
            </div>
        </Modal>
    );
}

export default ParseFileModal;
