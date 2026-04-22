import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { connect } from 'dva';
import { useLocation } from 'react-router-dom';
import { Modal, Form, Input, Button, Checkbox, message, Tooltip } from 'antd';
import HcModal from 'src/components/common/Modal/Modal';
import { CloseOutlined } from '@ant-design/icons';
import HelpHoverPopover from 'src/components/common/HelpHoverPopover/HelpHoverPopover';
import { t } from 'src/utils/i18n';
import loginVisual from 'src/assets/img/login-img.jpeg';
import ENV from 'src/config/env';
import LoginAddon from 'src/components/common/LoginAddon/LoginAddon';
import {
  checkPass,
  encodePasswordForLogin,
  encodePasswordPlainForSmsReset,
  formatLoginAccount,
  getClientTag,
} from 'src/utils/login';
import { initTacCaptcha } from './tacCaptcha';
import { pathnameMatchesMenuRoute } from 'src/layouts/menuConfig';
import './LoginModal.less';

const USER_AGREEMENT_URL = 'https://cloud.hecom.cn/service.html';
const PRIVACY_URL = 'https://cloud.hecom.cn/privacy.html';
/** Tab 下指示条宽度（px），与样式 .ai-login-modal__tab-indicator 一致 */
const LOGIN_TAB_INDICATOR_WIDTH = 16;

function initialPhonePrefixRef() {
  if (typeof window === 'undefined') return '+86';
  const p = localStorage.getItem('loginPrefix');
  return p && p !== 'email' ? p : '+86';
}

/**
 * 手机号 Tab：`Form.Item` 只会给「直接子节点」注入 value/onChange。
 * 若直接子节点是包裹层 div，内层 Input 无法受控，记住的手机号 / initialValues 不会显示。
 */
const LoginPhoneAccountComposite = React.forwardRef(function LoginPhoneAccountComposite(
  { value, onChange, loginPrefix, onPrefixChange, placeholder, forgotFlow, onRawAccount },
  ref
) {
  return (
    <div className="ai-login-phone-composite ant-input ant-input-lg">
      <div className="ai-login-phone-composite__addon">
        <LoginAddon hideEmailOption value={loginPrefix} onChange={onPrefixChange} />
      </div>
      <span className="ai-login-phone-composite__divider" aria-hidden />
      <Input
        ref={ref}
        variant="borderless"
        size="large"
        className="ai-login-phone-composite__input"
        placeholder={placeholder}
        value={value ?? ''}
        onChange={(e) => {
          onChange?.(e);
          onRawAccount?.(e.target.value);
        }}
        {...(forgotFlow ? {} : { allowClear: true })}
      />
    </div>
  );
});

/** 记住我：与 foreground 一致，会在 localStorage 存明文密码 rem_wordpas（仅迁移，请注意风险）。 */
function LoginModal({ visible, onClose, dispatch, entList, loading }) {
  const location = useLocation();
  const [form] = Form.useForm();
  const savedPhonePrefixRef = useRef(initialPhonePrefixRef());
  const [loginTab, setLoginTab] = useState(() => {
    if (typeof window === 'undefined') return 'account';
    const p = localStorage.getItem('loginPrefix');
    return p === 'email' ? 'email' : 'account';
  });
  const [loginPrefix, setLoginPrefix] = useState(() => localStorage.getItem('loginPrefix') || '+86');
  const [remember, setRemember] = useState(() => !!localStorage.getItem('remember'));
  const [viewKey, setViewKey] = useState(2);
  const [rawAccount, setRawAccount] = useState('');
  const [loginData, setLoginData] = useState(null);
  const [entModalOpen, setEntModalOpen] = useState(false);
  const [entSearch, setEntSearch] = useState('');
  const [codeUrl, setCodeUrl] = useState('');
  const [errSts, setErrSts] = useState(0);
  const [showPass, setShowPass] = useState(false);
  const [smsCode, setSmsCode] = useState('');
  const [smsErr, setSmsErr] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [resPassword, setResPassword] = useState('');
  const [policy, setPolicy] = useState({});
  const [sended, setSended] = useState(false);
  const [seconds, setSeconds] = useState(60);
  const [smsEverSent, setSmsEverSent] = useState(false);
  const [tacOpen, setTacOpen] = useState(false);
  const [smsEnt, setSmsEnt] = useState(null);
  const timerRef = useRef(null);
  const showPassRef = useRef(false);
  const accountInputRef = useRef(null);
  const tabAccountRef = useRef(null);
  const tabEmailRef = useRef(null);
  const tabsTrackRef = useRef(null);
  const loginModalWasVisibleRef = useRef(false);
  /** 当前这次打开弹窗内是否已用 rem_account 拉过 loginFailStatus，避免切 Tab 时因 fetchLoginFailStatus 引用变化重复请求 */
  const remAccountHydratedForOpenRef = useRef(false);
  const [tabIndicatorLeft, setTabIndicatorLeft] = useState(80.5);

  useEffect(() => {
    showPassRef.current = showPass;
  }, [showPass]);

  const updateTabIndicator = useCallback(() => {
    const track = tabsTrackRef.current;
    const activeEl = loginTab === 'account' ? tabAccountRef.current : tabEmailRef.current;
    if (!track || !activeEl) return;
    const tr = track.getBoundingClientRect();
    const r = activeEl.getBoundingClientRect();
    const layoutW = track.clientWidth;
    const scale = layoutW > 0 ? tr.width / layoutW : 1;
    // 将视口差值还原为 track 本地坐标（处理 Modal zoom 等祖先 transform）；避免 flex+居中 首帧 offsetLeft 不可靠
    const center = scale ? ((r.left - tr.left) + r.width / 2) / scale : 0;
    setTabIndicatorLeft(center - LOGIN_TAB_INDICATOR_WIDTH / 2);
  }, [loginTab]);

  useLayoutEffect(() => {
    if (!visible || (viewKey !== 1 && viewKey !== 2)) return;
    const id = window.requestAnimationFrame(() => updateTabIndicator());
    return () => window.cancelAnimationFrame(id);
  }, [visible, viewKey, loginTab, updateTabIndicator]);

  const onModalAfterOpenChange = useCallback(
    (open) => {
      if (!open) return;
      window.requestAnimationFrame(() => {
        window.requestAnimationFrame(() => updateTabIndicator());
      });
    },
    [updateTabIndicator]
  );

  useEffect(() => {
    if (!visible || (viewKey !== 1 && viewKey !== 2)) return;
    const track = tabsTrackRef.current;
    const acc = tabAccountRef.current;
    const em = tabEmailRef.current;
    if (!track || typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(() => updateTabIndicator());
    ro.observe(track);
    if (acc) ro.observe(acc);
    if (em) ro.observe(em);
    return () => ro.disconnect();
  }, [visible, viewKey, updateTabIndicator]);

  useEffect(() => {
    if (!visible || (viewKey !== 1 && viewKey !== 2)) return;
    document.fonts?.ready?.then(() => updateTabIndicator());
  }, [visible, viewKey, updateTabIndicator]);

  useEffect(() => {
    if (!visible) return;
    const onResize = () => updateTabIndicator();
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, [visible, updateTabIndicator]);

  const refreshCodeUrl = useCallback(() => {
    setCodeUrl(String(Math.floor(Math.random() * 1e9)));
  }, []);

  const fetchLoginFailStatus = useCallback(
    (accountVal) => {
      const formatted = formatLoginAccount(loginPrefix, accountVal);
      dispatch({
        type: 'account/loginFailStatus',
        payload: { account: formatted },
        callback: (sts) => {
          setErrSts(Number(sts) || 0);
          if (Number(sts) === 1 || Number(sts) === 2 || Number(sts) > 2) {
            refreshCodeUrl();
          }
        },
      });
    },
    [dispatch, loginPrefix, refreshCodeUrl]
  );

  useEffect(() => {
    if (!visible) {
      remAccountHydratedForOpenRef.current = false;
      return;
    }
    const rem = localStorage.getItem('rem_account');
    if (!rem) return;
    if (remAccountHydratedForOpenRef.current) return;
    remAccountHydratedForOpenRef.current = true;
    fetchLoginFailStatus(rem);
    form.setFieldsValue({ account: rem });
    setRawAccount(rem);
  }, [visible, fetchLoginFailStatus, form]);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  const switchLoginTab = (tab) => {
    if (tab === loginTab) return;
    if (tab === 'email') {
      if (loginPrefix !== 'email') savedPhonePrefixRef.current = loginPrefix;
      setLoginPrefix('email');
    } else {
      setLoginPrefix(savedPhonePrefixRef.current || '+86');
    }
    // form?.resetFields?.();
    setLoginTab(tab);
    setSmsErr('');
  };

  const onAddonPrefixChange = (v) => {
    savedPhonePrefixRef.current = v;
    setLoginPrefix(v);
  };

  /** 打开弹窗后延迟聚焦账号/手机号输入框（避免焦点落在 addonBefore 的区号 Select 上） */
  useEffect(() => {
    if (!visible) {
      loginModalWasVisibleRef.current = false;
      return;
    }
    if (viewKey !== 1 && viewKey !== 2) return;
    const justOpened = !loginModalWasVisibleRef.current;
    loginModalWasVisibleRef.current = true;
    const delay = justOpened ? 800 : 50;
    const timer = window.setTimeout(() => {
      const el = accountInputRef.current?.input ?? accountInputRef.current;
      el?.focus?.({ preventScroll: true });
    }, delay);
    return () => clearTimeout(timer);
  }, [visible, viewKey, loginTab]);

  const countDown = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    setSeconds(60);
    timerRef.current = setInterval(() => {
      setSeconds((prev) => {
        if (prev > 1 && !showPassRef.current) {
          return prev - 1;
        }
        clearInterval(timerRef.current);
        setSended(false);
        return 60;
      });
    }, 1000);
  };

  const finishLoginOk = () => {
    localStorage.setItem('loginPrefix', loginPrefix);
    if (!pathnameMatchesMenuRoute(location.pathname)) {
      window.location.reload();
      return;
    }
    onClose();
  };

  const runLoginEntInfo = (entInfo, session) => {
    const ld = session;
    if (!ld?.uid) return;
    dispatch({
      type: 'account/loginEntInfo',
      payload: {
        entInfo,
        uid: ld.uid,
        account: ld.account,
        accessToken: ld.accessToken,
        accessCode: ld.accessCode,
      },
      query: {},
      callback: (errResult) => {
        const code = errResult != null ? String(errResult) : '';
        setEntModalOpen(false);

        if (code === '51044') {
          setSmsEverSent(false);
          setSended(false);
          setViewKey(5);
          setSmsEnt(entInfo);
          setSmsCode('');
          return;
        }
        if (errResult == null || errResult === '') {
          finishLoginOk();
          return;
        }
        message.warning(t('i18n_login_failed'));
      },
    });
  };

  const onSubmitLogin = (values) => {
    const acc = (values.account || '').trim();
    setRawAccount(acc);
    const formatted = formatLoginAccount(loginPrefix, acc);
    localStorage.removeItem('authorizeLoginTag');
    if (remember) {
      localStorage.setItem('remember', '1');
      localStorage.setItem('rem_account', acc);
      localStorage.setItem('rem_wordpas', values.password || '');
    } else {
      localStorage.removeItem('remember');
      localStorage.removeItem('rem_account');
      localStorage.removeItem('rem_wordpas');
    }

    dispatch({
      type: 'account/getSalt',
      payload: { account: formatted },
      callback: (salt) => {
        if (!salt) return;
        const password = encodePasswordForLogin(values.password, salt);
        const payload = {
          account: formatted,
          password,
          clientTag: getClientTag(window.location.origin.includes('pre') ? 'web-pre' : 'web'),
        };
        if (errSts === 1) {
          payload.captchaCode = values.captchaCode;
          payload.captchaEnv = codeUrl;
        }
        dispatch({
          type: 'account/tcLogin',
          payload,
          callback: (data, errorCode) => {
            if (errorCode) {
              if (String(errorCode) === '2015') {
                message.warning(t('i18n_login_qr_required_tip'));
              }
              fetchLoginFailStatus(acc);
            } else {
              const ld = { ...data, account: formatted };
              setLoginData(ld);
              if (data.entInfo) {
                runLoginEntInfo(data.entInfo, ld);
              } else {
                setEntModalOpen(true);
              }
            }
          },
        });
      },
    });
  };

  /** 登录页不通过 Form onFinish 提交，仅在「登录」点击或密码框回车时触发 */
  const submitLoginFromForm = () => {
    form.validateFields().then((values) => {
      onSubmitLogin(values);
    });
  };

  const goForgot = () => {
    setViewKey(1);
    setShowPass(false);
    setSmsCode('');
    setSmsErr('');
    setSmsEverSent(false);
    setSended(false);
  };

  const goBackToLogin = () => {
    setViewKey(2);
    setShowPass(false);
    refreshCodeUrl();
    setErrSts(0);
    setSmsEverSent(false);
    setSended(false);
  };

  const openTacThen = (next) => {
    form.validateFields(['account']).then(() => {
      const acc = (form.getFieldValue('account') || '').trim();
      if (!acc) {
        message.warning(t('i18n_9547dea2977c6d8c'));
        return;
      }
      setRawAccount(acc);
      initTacCaptcha(
        setTacOpen,
        (id) => {
          next(id);
        },
        {}
      );
    });
  };

  const sendSmsAfterTac = (tacId) => {
    const acc = (form.getFieldValue('account') || '').trim();
    const formatted = formatLoginAccount(loginPrefix, acc);
    setSended(true);
    dispatch({
      type: 'account/isExistAccount',
      payload: { account: formatted },
      callback: (isExistAccount) => {
        if (isExistAccount) {
          dispatch({
            type: 'account/sendSms',
            payload: {
              account: formatted,
              bizType: 'cloud',
              vCodeType: '0',
              id: tacId,
            },
            callback: (sendSucc) => {
              if (sendSucc == '0' || sendSucc === 0) {
                setSmsEverSent(true);
                countDown();
              } else {
                setSended(false);
              }
            },
          });
        } else {
          message.warning(t('i18n_b35ac02ea7d81c0b'));
          setSended(false);
        }
      },
    });
  };

  const handleShowPass = () => {
    form.validateFields(['account']).then(() => {
      if (!smsCode) {
        setSmsErr(t('i18n_db0b98dd46b037eb'));
        return;
      }
      if (!/^\d{4,6}$/.test(smsCode)) {
        setSmsErr(t('i18n_5429edf21879e989'));
        return;
      }
      setSmsErr('');
      const formatted = formatLoginAccount(loginPrefix, rawAccount || form.getFieldValue('account'));
      dispatch({
        type: 'account/getPolicy',
        payload: { account: formatted },
        callback: (p) => setPolicy(p || {}),
      });
      dispatch({
        type: 'account/verifyCode',
        payload: {
          account: formatted,
          bizType: 'cloud',
          verifyCode: smsCode,
        },
        callback: (codeRight) => {
          if (codeRight) {
            setShowPass(true);
            setSmsErr('');
          } else {
            setSmsErr(t('i18n_1a1bb4005404d83e'));
          }
        },
      });
    });
  };

  const handlePassChange = () => {
    const acc = (rawAccount || form.getFieldValue('account') || '').trim();
    const formatted = formatLoginAccount(loginPrefix, acc);
    if (!newPassword) {
      message.warning(t('i18n_c90fd1b53f3523cc'));
      return;
    }
    if (newPassword !== resPassword) {
      message.warning(t('i18n_e5f759de3e206217'));
      return;
    }
    checkPass(
      '',
      newPassword,
      (err) => {
        if (err) {
          message.warning(err);
          return;
        }
        const password = encodePasswordPlainForSmsReset(newPassword);
        dispatch({
          type: 'account/tcSmsLogin',
          payload: {
            account: formatted,
            password,
            clientTag: getClientTag(window.location.origin.includes('pre') ? 'web-pre' : 'web'),
            bizType: 'cloud',
            vCode: smsCode,
          },
          callback: () => {
            message.success(t('i18n_96fbc3a9ac87f038'));
            setViewKey(4);
            setShowPass(false);
            setNewPassword('');
            setResPassword('');
            setSmsCode('');
          },
        });
      },
      policy,
      acc
    );
  };

  const recheckAccountParam = () => {
    if (viewKey === 5 && loginData?.account) {
      return loginData.account;
    }
    const raw = rawAccount || (form.getFieldValue('account') || '').trim();
    return formatLoginAccount(loginPrefix, raw);
  };

  const sendSmsRecheck = () => {
    const formatted = recheckAccountParam();
    setSended(true);
    dispatch({
      type: 'account/sendSmsNoImgCode',
      payload: { account: formatted, bizType: 'msgRecheckLogin', vCodeType: '0' },
      callback: (ok) => {
        if (ok) {
          setSmsEverSent(true);
          countDown();
        } else {
          setSended(false);
        }
      },
    });
  };

  const verifyCodeAndLogin = () => {
    if (!loginData || !smsEnt) return;
    dispatch({
      type: 'account/loginEntInfo',
      payload: {
        entInfo: smsEnt,
        uid: loginData.uid,
        accessToken: loginData.accessToken,
        accessCode: loginData.accessCode,
        smsBizType: 'cloud',
        verifyCode: smsCode,
        account: loginData.account,
      },
      query: {},
      callback: (result) => {
        if (result === '51045' || result === 51045) return;
        if (result != null && result !== '') {
          setSmsErr(t('i18n_1a1bb4005404d83e'));
          return;
        }
        finishLoginOk();
      },
    });
  };

  const cancelRecheck = () => {
    dispatch({
      type: 'account/saveReducer',
      payload: { my: null, auth: null, userDetail: null, authList: null, isLogined: false },
    });
    localStorage.removeItem('my');
    localStorage.removeItem('userDetail');
    localStorage.removeItem('auth');
    setViewKey(2);
    setSmsCode('');
    setSmsErr('');
    setSmsEverSent(false);
    setSended(false);
  };

  const sortEntList = (list, q) => {
    const use = q
      ? list.filter(
          (item) =>
            (item.name || '').toUpperCase().includes(q.toUpperCase()) ||
            (item.namePinyin || '').toUpperCase().includes(q.toUpperCase()) ||
            (item.entCode || '').toUpperCase().includes(q.toUpperCase())
        )
      : list;
    return [...use].sort((a, b) => (a.name || '').localeCompare(b.name || ''));
  };

  const suffixImg =
    codeUrl === '' ? null : (
      <img
        loading="lazy"
        alt=""
        role="presentation"
        onClick={() => refreshCodeUrl()}
        style={{ cursor: 'pointer', maxHeight: 32 }}
        src={`${ENV.tcURL}cloud/user/getVerifyCodeImg.do?env=${codeUrl}`}
      />
    );

  const remAccount = localStorage.getItem('rem_account') || '';
  const remPass = localStorage.getItem('rem_wordpas') || '';

  const accountRules = [
    {
      validator: (_, value) => {
        const v = (value || '').trim();
        if (!v) return Promise.reject(new Error(t('i18n_390ccdec9f3fef4c')));
        const emailReg = /^[a-zA-Z0-9_.-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+$/;
        let phoneReg = /^1[3-9]\d{9}$/;
        if (loginPrefix === 'email') {
          if (emailReg.test(v)) return Promise.resolve();
        } else {
          if (loginPrefix !== '+86') {
            phoneReg = /^\+?(?!(?:.*-.*-))(?=.*\d)[\d-]{1,120}$/;
          }
          if (phoneReg.test(v)) return Promise.resolve();
        }
        return Promise.reject(
          new Error(loginPrefix === 'email' ? t('i18n_f941bc85446d893e') : t('i18n_f2a3913f6de60053'))
        );
      },
    },
  ];

  const filteredEnts = sortEntList(entList || [], entSearch);

  const accountPlaceholder =
    loginTab === 'email' ? t('i18n_login_email_placeholder') : t('i18n_phone_placeholder');

  const renderLoginTabs = () => (
    <div className="ai-login-modal__tabs" role="tablist">
      <div className="ai-login-modal__tabs-track" ref={tabsTrackRef}>
        <button
          ref={tabAccountRef}
          type="button"
          role="tab"
          aria-selected={loginTab === 'account'}
          className={`ai-login-modal__tab ${loginTab === 'account' ? 'ai-login-modal__tab--active' : ''}`}
          onClick={() => switchLoginTab('account')}
        >
          {t('i18n_login_tab_account')}
        </button>
        <button
          ref={tabEmailRef}
          type="button"
          role="tab"
          aria-selected={loginTab === 'email'}
          className={`ai-login-modal__tab ${loginTab === 'email' ? 'ai-login-modal__tab--active' : ''}`}
          onClick={() => switchLoginTab('email')}
        >
          {t('i18n_login_tab_email')}
        </button>
        <span
          className="ai-login-modal__tab-indicator"
          style={{ left: tabIndicatorLeft }}
          aria-hidden
        />
      </div>
    </div>
  );

  const renderAccountField = (opts = {}) => {
    const { forgotFlow } = opts;
    const onAccountChange = (e) => setRawAccount(e.target.value);
    if (loginTab === 'email') {
      return (
        <Input
          ref={accountInputRef}
          size="large"
          placeholder={accountPlaceholder}
          onChange={onAccountChange}
          {...(forgotFlow ? {} : { allowClear: true })}
        />
      );
    }
    return (
      <LoginPhoneAccountComposite
        ref={accountInputRef}
        loginPrefix={loginPrefix}
        onPrefixChange={onAddonPrefixChange}
        placeholder={accountPlaceholder}
        forgotFlow={!!forgotFlow}
        onRawAccount={setRawAccount}
      />
    );
  };

  return (
    <Modal
      open={visible}
      onCancel={onClose}
      afterOpenChange={onModalAfterOpenChange}
      footer={null}
      closable={false}
      width={750}
      centered
      destroyOnHidden
      maskClosable
      className="ai-login-modal"
      styles={{
        mask: { background: 'rgba(0, 0, 0, 0.52)' },
      }}
    >
      <div className="ai-login-modal__card">
        <div
          className="ai-login-modal__visual"
          style={{ backgroundImage: `url(${loginVisual})` }}
          role="img"
          aria-hidden
        />
        <div className="ai-login-modal__form-col">
          <button type="button" className="ai-login-modal__close" aria-label={t('i18n_close')} onClick={onClose}>
            <CloseOutlined style={{ fontSize: 14 }} />
          </button>

          <h1 className="ai-login-modal__title">{t('i18n_app_name')}</h1>

          <Form
            className="ai-login-modal__form"
            form={form}
            layout="vertical"
            requiredMark={false}
            initialValues={{
              account: remAccount,
              password: remPass,
            }}
          >
            {viewKey === 1 && (
              <>
                {renderLoginTabs()}
                <div
                  id="captcha-box"
                  className={tacOpen ? 'tac-captcha-open' : 'tac-captcha-close'}
                  style={{ minHeight: tacOpen ? 8 : 0 }}
                />
                <Form.Item name="account" rules={accountRules}>
                  {renderAccountField({ forgotFlow: true })}
                </Form.Item>
                <Form.Item validateStatus={smsErr ? 'error' : ''} help={smsErr}>
                  <div className="ai-login-combined-input">
                    <Input
                      className="ai-login-combined-input__field"
                      size="large"
                      autoComplete="off"
                      value={smsCode}
                      onChange={(e) => setSmsCode(e.target.value)}
                      maxLength={6}
                      placeholder={t('i18n_bb015c60bafc8a96')}
                    />
                    <span className="ai-login-combined-input__divider" aria-hidden />
                    <div className="ai-login-combined-input__action">
                      {sended ? (
                        <span className="ai-login-combined-input__timer">
                          {seconds}
                          {t('i18n_2d84a86705b57fa7')}
                        </span>
                      ) : (
                        <button
                          type="button"
                          className="ai-login-combined-input__btn"
                          onClick={() => openTacThen(sendSmsAfterTac)}
                        >
                          {smsEverSent ? t('i18n_login_resend') : t('i18n_3b91d186d44ec881')}
                        </button>
                      )}
                    </div>
                  </div>
                </Form.Item>
                {showPass && (
                  <>
                    <Form.Item>
                      <Tooltip
                        title={
                          <div className="ai-login-pwd-tip">
                            {policy.pwdMinLength
                              ? t('i18n_b0b36037b246f227', { MemberExpression1: policy.pwdMinLength })
                              : t('i18n_a0f185950f6a3997')}
                          </div>
                        }
                      >
                        <Input.Password
                          autoComplete="new-password"
                          value={newPassword}
                          onChange={(e) => setNewPassword(e.target.value)}
                          placeholder={t('i18n_4d78d03b322ebfd9')}
                        />
                      </Tooltip>
                    </Form.Item>
                    <Form.Item>
                      <Input.Password
                        autoComplete="new-password"
                        value={resPassword}
                        onChange={(e) => setResPassword(e.target.value)}
                        placeholder={t('i18n_322ded8bb2ccdf23')}
                      />
                    </Form.Item>
                  </>
                )}
                {showPass ? (
                  <Button type="primary" danger block loading={loading} className="ai-login-modal__submit" onClick={handlePassChange}>
                    {t('i18n_fac2a67ad87807c4')}
                  </Button>
                ) : (
                  <Button type="primary" danger block loading={loading} className="ai-login-modal__submit" onClick={handleShowPass}>
                    {t('i18n_36fc206409742b7f')}
                  </Button>
                )}
                <div className="ai-login-modal__switch-tip">
                  <span className="ai-login-modal__switch-hint">{t('i18n_4df50975df188897')}</span>
                  <button type="button" className="ai-login-link-btn" onClick={goBackToLogin}>
                    {t('i18n_1e2df9c3075ae9e4')}
                  </button>
                </div>
              </>
            )}

            {viewKey === 2 && (
              <>
                {renderLoginTabs()}
                <Form.Item name="account" rules={accountRules}>
                  {renderAccountField()}
                </Form.Item>
                <Form.Item name="password" rules={[{ required: true, message: t('i18n_3aa7a9e035a45598') }]}>
                  <Input.Password
                    size="large"
                    autoComplete="off"
                    placeholder={t('i18n_password_placeholder')}
                    onPressEnter={() => submitLoginFromForm()}
                  />
                </Form.Item>
                {(errSts === 1 || errSts === 2) && (
                  <Form.Item name="captchaCode" rules={[{ required: true, message: t('i18n_db0b98dd46b037eb') }]}>
                    <Input autoComplete="off" placeholder={t('i18n_739336ea98b3939c')} suffix={suffixImg} />
                  </Form.Item>
                )}
                <div className="ai-login-modal__remember">
                  <Checkbox
                    checked={remember}
                    onChange={(e) => {
                      const c = e.target.checked;
                      setRemember(c);
                      if (c) localStorage.setItem('remember', '1');
                      else localStorage.removeItem('remember');
                    }}
                  >
                    {t('i18n_ae03aad7142e33e9')}
                  </Checkbox>
                  <span className="ai-login-modal__forgot-wrap">
                    <button type="button" className="ai-login-link-btn ai-login-modal__forgot-text" onClick={goForgot}>
                      {t('i18n_d832a97894fce78b')}
                    </button>
                    <HelpHoverPopover
                      helpText={t('i18n_a3407450b62127a5')}
                      fontSize={14}
                      color="#999999"
                      hoverColor="#5C59C6"
                      className="ai-login-modal__forgot-help"
                    />
                  </span>
                </div>
                <Button
                  type="primary"
                  danger
                  block
                  loading={loading}
                  disabled={errSts === 2}
                  className="ai-login-modal__submit"
                  onClick={submitLoginFromForm}
                >
                  {t('i18n_login')}
                </Button>
              </>
            )}

            {viewKey === 4 && (
              <>
                <p className="ai-login-center-tip">{t('i18n_96fbc3a9ac87f038')}</p>
                <Button type="primary" danger block className="ai-login-modal__submit" onClick={goBackToLogin}>
                  {t('i18n_b6fde766c4a24a90')}
                </Button>
              </>
            )}

            {viewKey === 5 && loginData && (
              <>
                <p className="ai-login-center-tip">
                  {t('i18n_83d3c248bde116d3')}
                  <br />
                  {sended
                    ? t('i18n_ded7da794593f1b7', {
                        a: String(rawAccount).slice(0, 3),
                        b: String(rawAccount).slice(-4),
                      })
                    : t('i18n_2fdc151915350ca4', {
                        a: String(rawAccount).slice(0, 3),
                        b: String(rawAccount).slice(-4),
                      })}
                </p>
                <Form.Item validateStatus={smsErr ? 'error' : ''} help={smsErr}>
                  <div className="ai-login-combined-input">
                    <Input
                      className="ai-login-combined-input__field"
                      size="large"
                      autoComplete="off"
                      value={smsCode}
                      onChange={(e) => setSmsCode(e.target.value)}
                      maxLength={6}
                      placeholder={t('i18n_bb015c60bafc8a96')}
                    />
                    <span className="ai-login-combined-input__divider" aria-hidden />
                    <div className="ai-login-combined-input__action">
                      {sended ? (
                        <span className="ai-login-combined-input__timer">
                          {seconds}
                          {t('i18n_2d84a86705b57fa7')}
                        </span>
                      ) : (
                        <button type="button" className="ai-login-combined-input__btn" onClick={sendSmsRecheck}>
                          {smsEverSent ? t('i18n_login_resend') : t('i18n_3b91d186d44ec881')}
                        </button>
                      )}
                    </div>
                  </div>
                </Form.Item>
                <Button type="primary" danger block disabled={!smsCode} className="ai-login-modal__submit" onClick={verifyCodeAndLogin}>
                  {t('i18n_fac2a67ad87807c4')}
                </Button>
                <Button block className="ai-login-modal__submit-secondary" onClick={cancelRecheck}>
                  {t('i18n_2cd0f3be8738a86c')}
                </Button>
              </>
            )}
          </Form>

          {(viewKey === 1 || viewKey === 2) && (
            <div className="ai-login-modal__agreement">
              {t('i18n_login_agreement_prefix')}
              <a className="ai-login-modal__link" href={USER_AGREEMENT_URL} target="_blank" rel="noopener noreferrer">
                {t('i18n_user_agreement')}
              </a>
              {t('i18n_login_agreement_and')}
              <a className="ai-login-modal__link" href={PRIVACY_URL} target="_blank" rel="noopener noreferrer">
                {t('i18n_privacy_policy')}
              </a>
            </div>
          )}
        </div>
      </div>

      <HcModal
        noDrag
        title={(
          <div className="ai-login-modal__ent-title">
            <span>{t('i18n_41afc2dcea9a0d8f')}</span>
            <Input
              className="ai-login-modal__ent-input"
              allowClear
              placeholder={t('i18n_44ce7ae909bbb28b')}
              value={entSearch}
              onChange={(e) => setEntSearch(e.target.value)}
            />
          </div>
        )}
        open={entModalOpen}
        onCancel={() => setEntModalOpen(false)}
        footer={null}
        destroyOnHidden
        className="ai-login-modal__ent"
      >
        <div className="ai-login-ent-list">
          {filteredEnts.map((item) => (
            <Button
              key={item.entCode || item.code}
              block
              style={{ marginBottom: 8 }}
              loading={loading}
              onClick={() => runLoginEntInfo(item, loginData)}
            >
              {item.name}
            </Button>
          ))}
        </div>
      </HcModal>
    </Modal>
  );
}

export default connect(({ account, loading }) => ({
  entList: account.entList,
  loading: !!loading.models?.account,
}))(LoginModal);
