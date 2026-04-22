import React, { useCallback, useMemo, useRef, useState } from 'react';
import { Input, Select, message } from 'antd';
import { LoadingOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { t } from 'src/utils/i18n';
import { SingleBidFileSlot } from 'src/components/upload';
import { toAibidFilePayload } from 'src/components/aibid/toAibidFilePayload';
import { confirmModal } from 'src/components/common/Modal/confirmModal';
import Modal from 'src/components/common/Modal/Modal';
import { useDvaDispatch, useDvaSelector } from 'src/hooks/useDva';
import { isLogined } from 'src/utils/login';
import checkBidingBg from 'src/assets/img/check-biding-bg.png';
import starColor from 'src/assets/img/star-color.png';
import starWhite from 'src/assets/img/star-white.png';
import './AddReview.less';

/**
 * 组装「前台-开始审标分析」请求体：必填双文件、公司名、项目名、标段名、两份 keyInfo；澄清文件/文本可选。
 */
function buildStartAnalyzeBody({
  tenderFile,
  bidderFile,
  clarifyFile,
  clarifyText,
  companyName,
  projectName,
  sectionName,
  tenderKeyInfo,
  bidderKeyInfo,
}) {
  const body = {
    tenderFile,
    bidderFile,
    companyName,
    projectName: projectName ?? '',
    sectionName: sectionName ?? '',
    tenderKeyInfo,
    bidderKeyInfo,
  };
  const text = clarifyText != null ? String(clarifyText).trim() : '';
  if (text !== '') {
    body.clarifyText = text;
  }
  if (clarifyFile) {
    body.clarifyFile = clarifyFile;
  }
  return body;
}

/**
 * 商务标创建审标入口：上传招标/投标/澄清 → 并发「提取标段」「提取主体」→ 弹窗确认公司与标段 →
 * 「开始审标分析」成功后携带 state 跳转 /aibidReview/:code（审标记录编码 reviewCode）。
 */
/** 澄清说明粘贴框最大字符数 */
const CLARIFY_PASTE_MAX_LEN = 2000;
/** 重新上传确认弹窗宽度 */
const REUPLOAD_CONFIRM_WIDTH = 480;

/** 已有文件再次点击上传：业务侧 confirm，返回 Promise，resolve(true/false) 供 SingleBidFileSlot 使用 */
function useReuploadBeforeChooseFile(docNameKey) {
  return useCallback(
    () =>
      new Promise((resolve) => {
        confirmModal({
          title: t('i18n_reupload_title'),
          className: 'reupload-confirm-modal',
          width: REUPLOAD_CONFIRM_WIDTH,
          content: (
            <>
              {t('i18n_reupload_body_before')}
              <strong className="reupload-confirm-modal__doc">{t(docNameKey)}</strong>
              {t('i18n_reupload_body_after')}
            </>
          ),
          okButtonProps: { className: 'reupload-confirm-modal__ok' },
          onOk: () => resolve(true),
          onCancel: () => resolve(false),
        });
      }),
    [docNameKey]
  );
}

/**
 * 列表页顶部「开始审标」区域。
 * @param {{ onAnalyzeSuccessRefreshList?: () => void }} props 跳转详情成功后刷新列表第一页
 */
export default function AddReview({ onAnalyzeSuccessRefreshList }) {
  const navigate = useNavigate();
  const dispatch = useDvaDispatch();
  /** 并发提取标段 / 主体：任一 effect 在途即视为提取中（dva-loading） */
  const extractLoading = useDvaSelector(
    (s) =>
      !!(
        s.loading?.effects?.['aibidReview/extractTenderSection'] ||
        s.loading?.effects?.['aibidReview/extractBidderCompany']
      )
  );
  const analyzeLoading = useDvaSelector((s) => !!s.loading?.effects?.['aibidReview/startAnalyze']);
  /** 弹窗打开期间缓存两次提取接口的响应与文件 payload，供「确定」时拼 startAnalyze */
  const extractCtxRef = useRef(null);

  /** 澄清粘贴区是否聚焦（卡片高亮） */
  const [clarifyPasteFocused, setClarifyPasteFocused] = useState(false);
  /** 澄清文字说明（可与澄清文件二选一或并存，由 canStartInspection 约束） */
  const [clarifyPasteText, setClarifyPasteText] = useState('');
  /** 投标文件槽位状态 */
  const [businessFile, setBusinessFile] = useState(null);
  /** 招标文件槽位状态 */
  const [tenderFile, setTenderFile] = useState(null);
  /** 澄清文件槽位状态（可选） */
  const [clarifyFile, setClarifyFile] = useState(null);
  /** 各槽位是否正在上传 */
  const [uploading, setUploading] = useState({
    business: false,
    tender: false,
    clarify: false,
  });

  /** 公司/标段确认弹窗是否打开 */
  const [confirmOpen, setConfirmOpen] = useState(false);
  /** 标段下拉选项（来自 extractTenderSection） */
  const [sectionOptions, setSectionOptions] = useState([]);
  /** 弹窗内公司名称（可编辑） */
  const [modalCompany, setModalCompany] = useState('');
  /** 弹窗内选中标段 */
  const [modalSection, setModalSection] = useState('');

  /** 任一档位上传中则禁用「开始检查」等 */
  const anyUploading = uploading.business || uploading.tender || uploading.clarify;

  const beforeReuploadBusiness = useReuploadBeforeChooseFile('i18n_reupload_doc_business');
  const beforeReuploadTender = useReuploadBeforeChooseFile('i18n_reupload_doc_tender');
  const beforeReuploadClarify = useReuploadBeforeChooseFile('i18n_reupload_doc_clarify');

  /** 招标+投标已就绪且无上传中，且澄清为文字或文件其一 */
  const canStartInspection = useMemo(() => {
    const businessOk = businessFile?.status === 'done';
    const tenderOk = tenderFile?.status === 'done';
    const clarifyOk = clarifyPasteText.trim() !== '';
    const clarifyFileOk = clarifyFile?.status === 'done';

    return businessOk && tenderOk && !anyUploading && (clarifyOk || clarifyFileOk);
  }, [businessFile, tenderFile, clarifyFile, clarifyPasteText, anyUploading]);

  /** 主按钮禁用：条件未满足或提取/分析中或确认弹窗打开 */
  const startDisabled = !canStartInspection || extractLoading || analyzeLoading || confirmOpen;

  /** 开始检查：并发 extractTenderSection + extractBidderCompany，成功则打开确认弹窗 */
  const handleStartClick = async () => {
    if (!isLogined(true)) return;
    const tenderF = toAibidFilePayload(tenderFile);
    const bidderF = toAibidFilePayload(businessFile);
    if (!tenderF || !bidderF) {
      message.warning(t('i18n_upload_wait_done'));
      return;
    }

    try {
      // 前台-从招标文件中提取标段信息 + 前台-从投标文件中提取投标主体
      const [tRes, bRes] = await Promise.all([
        dispatch({ type: 'aibidReview/extractTenderSection', payload: { tenderFile: tenderF } }),
        dispatch({ type: 'aibidReview/extractBidderCompany', payload: { bidderFile: bidderF } }),
      ]);

      // 接口标识联合体投标：仅提示，不进入确认公司与审标流程
      if (bRes?.data?.isJointVenture) {
        confirmModal({
          title: t('i18n_bid_joint_venture_title'),
          content: t('i18n_bid_joint_venture_body'),
          okText: t('i18n_bid_joint_venture_ok'),
          showCancel: false,
          onOk: () => {},
        });
        return;
      }

      const sections = Array.isArray(tRes?.data?.sections) ? tRes.data.sections : [];
      const clarifyPayload = toAibidFilePayload(clarifyFile);

      extractCtxRef.current = {
        tRes,
        bRes,
        tenderF,
        bidderF,
        clarifyPayload,
        clarifyPasteText,
      };

      setSectionOptions(sections);
      setModalCompany(String(bRes?.data?.companyName ?? ''));
      if (sections.length > 1) {
        setModalSection('');
      } else {
        setModalSection(sections[0] ?? '');
      }
      setConfirmOpen(true);
    } catch (e) {
      message.error(e?.message || t('i18n_request_failed'));
    }
  };

  /** 关闭确认弹窗并清空提取上下文 */
  const closeConfirm = () => {
    setConfirmOpen(false);
    extractCtxRef.current = null;
  };

  /** 弹窗确定：校验后调用前台-开始审标分析，用路由 state 带主体与文件名进详情 */
  const handleConfirmAnalyze = async () => {
    const ctx = extractCtxRef.current;
    if (!ctx) return;

    const companyName = String(modalCompany ?? '').trim();
    if (!companyName) {
      message.warning(t('i18n_bid_company_required'));
      return;
    }

    const sections = Array.isArray(ctx.tRes?.data?.sections) ? ctx.tRes.data.sections : [];
    let sectionName = modalSection;
    if (sections.length > 1) {
      const s = String(sectionName ?? '').trim();
      if (!s) {
        message.warning(t('i18n_bid_section_required'));
        return;
      }
      sectionName = s;
    } else {
      sectionName = sections[0] ?? '';
    }

    try {
      const body = buildStartAnalyzeBody({
        tenderFile: ctx.tenderF,
        bidderFile: ctx.bidderF,
        clarifyFile: ctx.clarifyPayload || undefined,
        clarifyText: ctx.clarifyPasteText,
        companyName,
        projectName: ctx.bRes?.data?.projectName,
        sectionName,
        tenderKeyInfo: ctx.tRes?.data?.keyInfo ?? {},
        bidderKeyInfo: ctx.bRes?.data?.keyInfo ?? {},
      });
      const res = await dispatch({ type: 'aibidReview/startAnalyze', payload: body });
      if (res.result != 0) {
        throw new Error(res?.desc || t('i18n_request_failed'));
      }
      const reviewCode = res?.data;
      if (reviewCode == null || reviewCode === '') {
        throw new Error(t('i18n_bid_no_review_code'));
      }

      navigate(`/aibidReview/${encodeURIComponent(reviewCode)}`, {
        state: {
          companyName,
          projectName: ctx.bRes?.data?.projectName ?? '',
          sectionName,
          bidDocName: businessFile?.name,
          tenderDocName: tenderFile?.name,
        },
      });
      onAnalyzeSuccessRefreshList?.();
      closeConfirm();
    } catch (e) {
      confirmModal({
        title: t('i18n_tip'),
        content: e?.message || t('i18n_request_failed'),
        okText: t('i18n_confirm'),
        showCancel: false,
      });
      return;
    }
  };

  return (
    <section className="business-list-page__hero">
      <img className="business-list-page__hero-bg" src={checkBidingBg} alt="" />
      <div className="business-list-page__hero-inner">
        <div className="business-list-page__title-block">
          <div className="flex-row">
            <span className="ai-title-star">
              <img className="star-animation" src={starColor} alt="" width={28} height={28} />
            </span>
            <h1 className="business-list-page__title-main">{t('i18n_business_agent_title')}</h1>
          </div>
          <p className="business-list-page__title-sub">{t('i18n_business_agent_subtitle')}</p>
        </div>

        <div
          className={
            clarifyPasteFocused
              ? 'business-list-page__upload-card business-list-page__upload-card--within-focus'
              : 'business-list-page__upload-card'
          }
        >
          <div className="business-list-page__upload-grid">
            <div className="business-list-page__upload-slot">
              <SingleBidFileSlot
                slotKey="business"
                accept=".doc,.docx"
                hint={t('i18n_upload_hint_business')}
                uploadLabel={t('i18n_upload_business_bid')}
                required
                onBeforeChooseFile={beforeReuploadBusiness}
                onChange={setBusinessFile}
                onUploadingChange={(v) => setUploading((s) => ({ ...s, business: v }))}
              />
            </div>
            <div className="business-list-page__upload-slot">
              <SingleBidFileSlot
                slotKey="tender"
                accept=".doc,.docx,.pdf"
                hint={t('i18n_upload_hint_tender')}
                uploadLabel={t('i18n_upload_tender_doc')}
                required
                onBeforeChooseFile={beforeReuploadTender}
                onChange={setTenderFile}
                onUploadingChange={(v) => setUploading((s) => ({ ...s, tender: v }))}
              />
            </div>
            <div className="business-list-page__upload-slot">
              <SingleBidFileSlot
                slotKey="clarify"
                accept=".doc,.docx,.pdf,.txt"
                hint={t('i18n_upload_hint_clarify')}
                uploadLabel={t('i18n_upload_clarify_doc')}
                onBeforeChooseFile={beforeReuploadClarify}
                onChange={setClarifyFile}
                onUploadingChange={(v) => setUploading((s) => ({ ...s, clarify: v }))}
              />
            </div>
          </div>
          <div className="business-list-page__clarify-field">
            <Input.TextArea
              className="business-list-page__clarify-textarea"
              placeholder={t('i18n_clarify_paste_hint')}
              value={clarifyPasteText}
              onChange={(e) => setClarifyPasteText(e.target.value)}
              onFocus={() => setClarifyPasteFocused(true)}
              onBlur={() => setClarifyPasteFocused(false)}
              maxLength={CLARIFY_PASTE_MAX_LEN}
              showCount
            />
          </div>
          <div className="business-list-page__submit-wrap">
            <button
              type="button"
              className="business-list-page__start-btn"
              disabled={startDisabled}
              onClick={handleStartClick}
            >
              {extractLoading ? (
                <LoadingOutlined />
              ) : (
                <span className="ai-start-btn-star">
                  <img src={starWhite} alt="" width={16} height={16} />
                </span>
              )}
              {extractLoading ? t('i18n_bid_extracting') : t('i18n_start_inspection')}
            </button>
          </div>
        </div>
      </div>

      {/* 确认投标公司：公司名默认来自 extractBidderCompany；标段选项来自 extractTenderSection.sections */}
      <Modal
        title={t('i18n_bid_confirm_company_title')}
        open={confirmOpen}
        maskClosable={false}
        width={520}
        wrapClassName="business-bid-confirm-modal-wrap"
        onCancel={closeConfirm}
        onOk={handleConfirmAnalyze}
        confirmLoading={analyzeLoading}
        okText={t('i18n_confirm')}
        cancelText={t('i18n_cancel')}
        okButtonProps={{ className: 'business-list-page__confirm-modal-ok' }}
      >
        <div className="bid-confirm-modal">
          <div className="bid-confirm-modal__field">
            <div className="bid-confirm-modal__label">{t('i18n_bid_company_name_label')}</div>
            <Input value={modalCompany} onChange={(e) => setModalCompany(e.target.value)} allowClear />
          </div>
          {sectionOptions.length > 1 ? (
            <div className="bid-confirm-modal__field">
              <div className="bid-confirm-modal__label">{t('i18n_bid_section_select_label')}</div>
              <Select
                className="bid-confirm-modal__select"
                allowClear
                placeholder={t('i18n_bid_section_placeholder')}
                options={sectionOptions.map((s, i) => ({ value: s, label: s, key: `${i}-${s}` }))}
                value={modalSection || undefined}
                onChange={(v) => setModalSection(v ?? '')}
              />
            </div>
          ) : null}
        </div>
      </Modal>
    </section>
  );
}
