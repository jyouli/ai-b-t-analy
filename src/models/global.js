const MOCK_ACCOUNTS = [
  { id: '1', name: '伊国富', avatar: '' },
  { id: '2', name: '测试账号', avatar: '' },
];

function getInitialAccount() {
  try {
    const saved = localStorage.getItem('ai-b-t-current-account');
    if (saved) {
      const parsed = JSON.parse(saved);
      if (parsed?.id) return parsed;
    }
  } catch (e) {}
  return MOCK_ACCOUNTS[0];
}

export default {
  namespace: 'global',
  state: {
    currentAccount: getInitialAccount(),
    accounts: MOCK_ACCOUNTS,
  },
  reducers: {
    setCurrentAccount(state, { payload }) {
      localStorage.setItem('ai-b-t-current-account', JSON.stringify(payload));
      return { ...state, currentAccount: payload };
    },
  },
};
