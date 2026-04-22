import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Input, message } from 'antd';
import { LoadingOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { t } from 'src/utils/i18n';
import { SingleBidFileSlot } from 'src/components/upload';
import { toAibidFilePayload } from 'src/components/aibid/toAibidFilePayload';
import AibidAnnouncementImages, {
  AibidAnnouncementFileCard,
} from 'src/components/aibid/AibidAnnouncementImages';
import { confirmModal } from 'src/components/common/Modal/confirmModal';
import RequiredEchoSelect from 'src/components/common/RequiredEchoSelect/RequiredEchoSelect';
import { useDvaDispatch, useDvaSelector } from 'src/hooks/useDva';
import { isLogined } from 'src/utils/login';
import checkBidingBg from 'src/assets/img/check-biding-bg.png';
import starColor from 'src/assets/img/star-color.png';
import starWhite from 'src/assets/img/star-white.png';
import '../../aibidReview/components/AddReview.less';
import './AddSelection.less';

/** 重新上传确认弹窗宽度（与审标 AddReview 一致） */
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

/** 与 YApi「前台-4-开始选标分析」一致：companyCode、companyName 必填；tenderFile / tenderImages / tenderText 按业务互斥择一 */
function buildStartSelectionBody({ companyCode, companyName, tenderFile, tenderImages, tenderText }) {
  const body = {
    companyCode,
    companyName,
  };
  if (tenderFile) body.tenderFile = tenderFile;
  if (Array.isArray(tenderImages) && tenderImages.length > 0) {
    body.tenderImages = tenderImages;
  }
  const txt = tenderText != null ? String(tenderText).trim() : '';
  if (txt) body.tenderText = txt;
  return body;
}

/**
 * 选标列表页顶部：默认白色遮罩盖在双区上，hover 遮罩隐藏；点击/触摸后保持露出双区；公告文本互斥 + 投标主体 + 开始分析
 */
export default function AddSelection({ onAnalyzeSuccessRefreshList }) {
  const navigate = useNavigate();
  const dispatch = useDvaDispatch();
  const accountLogined = useDvaSelector((s) => !!s.account?.isLogined);
  const analyzeLoading = useDvaSelector((s) => !!s.loading?.effects?.['aibidSelection/startAnalyzing'] || !!s.loading?.effects?.['aibidSelection/checkCompany'] || !!s.loading?.effects?.['aibidSelection/checkBiddingFile']);
  const companiesLoading = useDvaSelector((s) => !!s.loading?.effects?.['aibidSelection/listCompanies']);

  /** 点击/触摸遮罩后保持露出双区（无 hover 设备） */
  const [expanded, setExpanded] = useState(false);

  const [tenderFile, setTenderFile] = useState(null);
  const [announcementFiles, setAnnouncementFiles] = useState([]);
  const [announcementText, setAnnouncementText] = useState('');
  const [companyCode, setCompanyCode] = useState(undefined);
  const [companyOptions, setCompanyOptions] = useState([]);

  const [uploading, setUploading] = useState({ tender: false, ann: false });

  const beforeReuploadTender = useReuploadBeforeChooseFile('i18n_reupload_doc_tender');

  const removeAnnouncementFile = useCallback((uid) => {
    setAnnouncementFiles((prev) => prev.filter((x) => x.uid !== uid));
  }, []);

  const tenderDone = tenderFile?.status === 'done';
  const annDone = announcementFiles.some((f) => f.status === 'done');
  const textFilled = announcementText.trim().length > 0;

  const docDisabled = (annDone || textFilled) && !tenderDone;
  const annBlockDisabled = (tenderDone || textFilled) && !annDone;
  const textDisabled = tenderDone || annDone;

  /** 一方上传中禁用另一方，避免并发上传 */
  const tenderSlotDisabled = docDisabled || uploading.ann;
  const annSlotDisabled = annBlockDisabled || uploading.tender;

  const anyUploading = uploading.tender || uploading.ann;

  /** 任一侧上传中禁填文本，与三选一互斥一致（含列表内 uploading 态，与 canSubmit 一致） */
  const textAreaDisabled =
    textDisabled || anyUploading || announcementFiles.some((f) => f.status === 'uploading');

  const companySelectOptions = useMemo(
    () => companyOptions.map((o) => ({ value: o.value, label: o.label })),
    [companyOptions]
  );

  const canSubmit = useMemo(() => {
    if (!companyCode) return false;
    if (anyUploading) return false;
    if (announcementFiles.some((f) => f.status === 'uploading')) return false;

    const txt = announcementText.trim();
    const tOk = tenderFile?.status === 'done';
    const annOk =
      announcementFiles.length > 0 && announcementFiles.every((f) => f.status === 'done');

    if (tOk && !annOk && !txt) return true;
    if (annOk && !tOk && !txt) return true;
    if (txt && !tOk && !annOk) return true;
    return false;
  }, [companyCode, anyUploading, tenderFile, announcementFiles, announcementText]);

  const startDisabled = !canSubmit || analyzeLoading;

  const loadCompanies = useCallback(async () => {
    try {
      const res = await dispatch({ type: 'aibidSelection/listCompanies', payload: {} });
      const raw = res?.data?.records ?? res?.data?.list ?? res?.data ?? [];
      const list = Array.isArray(raw) ? raw : [];
      const arr = list.filter((r) => r.code !== '000000');
      setCompanyOptions(
        arr
          .map((r) => ({
            value: String(r.code ?? r.id ?? ''),
            label: String(r.name ?? r.companyName ?? ''),
            raw: r,
          }))
          .filter((o) => o.value && o.label)
      );
    } catch (e) {
      message.error(e?.message || t('i18n_request_failed'));
    }
  }, [dispatch]);

  useEffect(() => {
    if (accountLogined) {
      void loadCompanies();
    }
  }, [accountLogined, loadCompanies]);

  const handleStart = async () => {
    if (!isLogined(true)) return;
    if (!companyCode) {
      message.warning(t('i18n_selection_company_required'));
      return;
    }
    const companyName = companyOptions.find((o) => o.value === companyCode)?.label;
    if (!companyName) {
      message.warning(t('i18n_selection_company_required'));
      return;
    }

    // 校验主体与资质：result=10011 投标主体不存在；result=1 且 desc 含「公司资质不存在」跳转资信库
    let checkRes;
    try {
      checkRes = await dispatch({
        type: 'aibidSelection/checkCompany',
        payload: { companyCode, companyName },
      });
    } catch (e) {
      message.error(e?.message || t('i18n_request_failed'));
      return;
    }
    const r = checkRes?.result != null ? String(checkRes.result) : '';
    const desc = String(checkRes?.desc || '').trim();
    if (r !== '0') {
      if (r === '10011') {
        message.warning(desc || t('i18n_selection_company_invalid'));
        return;
      }
      if (r === '1') {
        confirmModal({
          title: t('i18n_tip'),
          content: desc || t('i18n_selection_qualification_missing'),
          okText: t('i18n_selection_go_credit'),
          onOk: () => {
            navigate(`/credit?companyCode=${encodeURIComponent(companyCode)}`);
          },
        });
        return;
      }
      message.error(desc || t('i18n_request_failed'));
      return;
    }

    // 如果有招标图片，则检查招标图片是否正常
    if (announcementFiles && announcementFiles.some((f) => f.status === 'done')) {
      const res = await dispatch({
        type: 'aibidSelection/checkBiddingFile',
        payload: {
          companyCode,
          companyName,
          tenderImages: announcementFiles
        }
      });
      if (res.result != 0) {
        confirmModal({
          title: t('i18n_tip'),
          content: e?.message || t('i18n_request_failed'),
          okText: t('i18n_confirm'),
          showCancel: false,
        });
        return;
      }
    }
    
    // 校验通过，开始提交
    const tenderPayload = toAibidFilePayload(tenderFile);
    const annPayloads = announcementFiles
      .filter((f) => f.status === 'done')
      .map((f) => toAibidFilePayload(f))
      .filter(Boolean);
    const txt = announcementText.trim();

    if (!tenderPayload && annPayloads.length === 0 && !txt) {
      message.warning(t('i18n_selection_input_required'));
      return;
    }

    const body = buildStartSelectionBody({
      companyCode,
      companyName,
      tenderFile: tenderPayload || undefined,
      tenderImages: annPayloads.length ? annPayloads : undefined,
      tenderText: txt || undefined,
    });

    try {
      const res = await dispatch({ type: 'aibidSelection/startAnalyzing', payload: body });
      if (res.result != 0) {
        throw new Error(res?.desc || t('i18n_request_failed'));
      }
      const selectionCode = res?.data;
      if (selectionCode == null || selectionCode === '') {
        throw new Error(t('i18n_selection_no_record_code'));
      }
      navigate(`/aibidSelection/${encodeURIComponent(selectionCode)}`, {
        state: {
          companyName,
          tenderDocName: tenderPayload?.name,
        },
      });
      onAnalyzeSuccessRefreshList?.();
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
    <section className="business-list-page__hero add-selection-hero">
      <img className="business-list-page__hero-bg" src={checkBidingBg} alt="" />
      <div className="business-list-page__hero-inner">
        <div className="business-list-page__title-block">
          <div className="flex-row">
            <span className="ai-title-star">
              <img className="star-animation" src={starColor} alt="" width={28} height={28} />
            </span>
            <h1 className="business-list-page__title-main">{t('i18n_selection_agent_title')}</h1>
          </div>
          <p className="business-list-page__title-sub">{t('i18n_selection_agent_subtitle')}</p>
        </div>

        <div className="business-list-page__upload-card add-selection-card">
          <div
            className={`add-selection-hover-zone${expanded ? ' add-selection-hover-zone--expanded' : ''}`}
            onTouchStart={() => setExpanded(true)}
          >
            <div className="add-selection-split">
              <div
                className={`add-selection-split__col${tenderSlotDisabled ? ' add-selection-split__col--disabled' : ''}`}
              >
                <SingleBidFileSlot
                  slotKey="selection-tender"
                  accept=".doc,.docx,.pdf"
                  hint=""
                  uploadLabel={t('i18n_selection_upload_tender_slot')}
                  required
                  variant="selection"
                  selectionHint={t('i18n_selection_upload_tender_slot_hint')}
                  selectionIconClass="icon-zhaobiaowenjian"
                  disabled={tenderSlotDisabled}
                  onBeforeChooseFile={beforeReuploadTender}
                  onChange={setTenderFile}
                  onUploadingChange={(v) => setUploading((s) => ({ ...s, tender: v }))}
                />
              </div>
              <div
                className={`add-selection-split__col${annSlotDisabled ? ' add-selection-split__col--disabled' : ''}`}
              >
                <AibidAnnouncementImages
                  value={announcementFiles}
                  onChange={setAnnouncementFiles}
                  onUploadingChange={(v) => setUploading((s) => ({ ...s, ann: v }))}
                  disabled={annSlotDisabled}
                  maxCount={5}
                  selectionMode
                  hideFileCards
                  selectionHint={t('i18n_selection_upload_ann_slot_hint')}
                  selectionIconClass="icon-zhaobiaogonggao"
                />
              </div>
            </div>
            {announcementFiles.length > 0 ? (
              <div className="add-selection-announcement-file-list">
                {announcementFiles.map((row) => (
                  <AibidAnnouncementFileCard key={row.uid} row={row} onRemove={removeAnnouncementFile} />
                ))}
              </div>
            ) : null}
            <button type="button" className="add-selection-default-dash" onClick={() => setExpanded(true)}>
              <p className="add-selection-default-hint">{t('i18n_selection_upload_hint_mixed')}</p>
              <span className="add-selection-default-btn">
                <i className="icon-shangchuan" aria-hidden />
                {t('i18n_selection_upload_main_btn')}
                <span className="single-bid-file-slot__star">*</span>
              </span>
            </button>
          </div>

          <div className="business-list-page__clarify-field add-selection-announcement-field">
            <Input.TextArea
              className="business-list-page__clarify-textarea"
              placeholder={t('i18n_selection_announcement_paste')}
              value={announcementText}
              onChange={(e) => setAnnouncementText(e.target.value)}
              disabled={textAreaDisabled}
              rows={4}
              maxLength={2000}
              showCount
            />
          </div>

          <div className="add-selection-footer-row">
            <RequiredEchoSelect
              className="add-selection-entity-select"
              variant="borderless"
              placeholder={t('i18n_selection_bidding_entity')}
              loading={companiesLoading}
              options={companySelectOptions}
              value={companyCode}
              onChange={setCompanyCode}
              showSearch={{ optionFilterProp: 'label' }}
              allowClear
              popupMatchSelectWidth={false}
            />
            <button
              type="button"
              className="business-list-page__start-btn add-selection-start-btn"
              disabled={startDisabled}
              onClick={handleStart}
            >
              {analyzeLoading ? (
                <LoadingOutlined />
              ) : (
                <span className="ai-start-btn-star">
                  <img src={starWhite} alt="" width={16} height={16} />
                </span>
              )}
              {analyzeLoading ? t('i18n_selection_analyzing') : t('i18n_selection_start')}
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
