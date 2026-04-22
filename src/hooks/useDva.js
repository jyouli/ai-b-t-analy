import { useCallback, useDebugValue, useRef, useSyncExternalStore } from 'react';
import { getDvaStore } from 'src/utils/dvaRuntime';

/**
 * 订阅 dva redux store（避免在 React 18 + Suspense/lazy 下使用 react-redux@5 的 connect 触发 trySubscribe 崩溃）
 */
export function useDvaDispatch() {
  const store = getDvaStore();
  if (!store) {
    throw new Error('[useDvaDispatch] DVA store 未就绪，请确认已在 main.jsx 中 registerDvaApp');
  }
  return store.dispatch;
}

export function useDvaSelector(selector) {
  const store = getDvaStore();
  if (!store) {
    throw new Error('[useDvaSelector] DVA store 未就绪');
  }

  const selectorRef = useRef(selector);
  selectorRef.current = selector;

  const getSnapshot = useCallback(() => selectorRef.current(store.getState()), [store]);

  const subscribe = useCallback(
    (onChange) => {
      const unsub = store.subscribe(onChange);
      return typeof unsub === 'function' ? unsub : () => {};
    },
    [store],
  );

  const slice = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
  useDebugValue(slice);
  return slice;
}
