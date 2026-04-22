/** dva 应用引用，在 main.jsx 中 app.start() 之后注册，供 hooks 在非 connect 场景下访问 store */

let dvaAppRef = null;

export function registerDvaApp(app) {
  dvaAppRef = app;
}

export function getDvaApp() {
  return dvaAppRef;
}

export function getDvaStore() {
  const store = dvaAppRef?._store;
  if (!store) {
    return null;
  }
  return store;
}
