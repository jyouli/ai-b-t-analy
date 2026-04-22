import { t } from 'src/utils/i18n';

const Math = window.Math;
const head = document.getElementsByTagName('head')[0];
const TIMEOUT = 1e4;
const loadingText = t('i18n_920f94fc0ba84c88');
const TAC_LOADING_DIV = `<div id="tac-loading" style="\n    border: 1px solid #eee;\n    border-radius: 5px;\n    width: 318px;\n    height: 318px;\n    line-height: 318px;\n    color: #606266;\n    text-align: center;\n    position: relative;\n    box-sizing: border-box;\">${loadingText}</div>`;

function showLoading(e) {
  const tEl = document.querySelector(e);
  if (tEl) tEl.innerHTML = TAC_LOADING_DIV;
}
function hideLoading(e) {
  const tEl = document.querySelector(e);
  if (tEl) tEl.innerHTML = '';
}
function loadCaptchaScript(e, t, n, r, o) {
  const i = e.scriptUrls;
  const c = e.cssUrls;
  const s = e.timeout || TIMEOUT;
  let l = i.length + c.length;
  function a(e, i) {
    l--;
    if (e && l === 0) {
      hideLoading(t.bindEl);
      r(new TAC(t, n));
    } else if (!e) {
      hideLoading(t.bindEl);
      o(i);
    }
  }
  setTimeout(() => {
    if (l !== 0) showLoading(t.bindEl);
  }, 100);
  i.forEach(function (e) {
    loadResource(typeof e === 'string' ? { url: e } : e, a, 'script', s);
  });
  c.forEach(function (e) {
    loadResource(typeof e === 'string' ? { url: e } : e, a, 'link', s);
  });
}
function loadResource(e, t, n = 'script', r) {
  const attr = n === 'script' ? 'src' : 'href';
  if (document.querySelector(`${n}[${attr}="${e.url}"]`)) {
    t(true, e);
    return;
  }
  let o = false;
  const i = document.createElement(n);
  if (n === 'link') {
    i.rel = 'stylesheet';
  } else {
    i.async = true;
  }
  i[attr] = e.url;
  let c;
  i.onload = i.onreadystatechange = () => {
    if (
      o ||
      (i.readyState && i.readyState !== 'loaded' && i.readyState !== 'complete')
    ) {
      return;
    }
    (function tInner(nInner) {
      if (e.checkOnReady) {
        c = setTimeout(() => {
          if (e.checkOnReady()) nInner();
          else tInner(nInner);
        }, 10);
      } else {
        nInner();
      }
    })(() => {
      o = true;
      setTimeout(() => t(o, e), 0);
    });
  };
  i.onerror = () => {
    o = true;
    t(o, e);
  };
  head.appendChild(i);
  setTimeout(() => {
    if (!o) {
      if (c) clearTimeout(c);
      i.onload = i.onerror = null;
      if (i.remove) i.remove();
      t(o, e);
    }
  }, r || TIMEOUT);
}

export function loadTAC(e, t, n) {
  return new Promise((r, o) => {
    const i = { ...(typeof e === 'string' ? { url: e } : e) };
    if (i.url) {
      if (!i.url.endsWith('/')) i.url += '/';
      if (!i.scriptUrls) i.scriptUrls = [i.url + 'js/tac.min.js'];
      if (!i.cssUrls) i.cssUrls = [i.url + 'css/tac.css'];
    }
    if (i.scriptUrls && i.cssUrls) {
      loadCaptchaScript(i, t, n, r, o);
    } else {
      o(t('i18n_170b5d21bd663070'));
    }
  });
}

setTimeout(() => {
  const e = document.scripts;
  let t = null;
  for (let n = 0; n < e.length; n++) {
    if (e[n].src.indexOf('load.js') > 1 || e[n].src.indexOf('load.min.js') > 1) {
      t = e[n].src.substring(e[n].src.indexOf('/'), e[n].src.lastIndexOf('/'));
      break;
    }
  }
  if (t) loadResource({ url: t + '/wasm_exec.js' }, () => {}, 'script', 5e3);
}, 100);

window.loadCaptchaScript = loadCaptchaScript;
window.loadTAC = loadTAC;
window.initTAC = loadTAC;
