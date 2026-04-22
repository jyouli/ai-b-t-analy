/* 全局闲时任务队列（Idle-Time Task Queue）
 * - 在浏览器空闲时执行非紧急任务，避免阻塞正常请求
 * - 优先使用 requestIdleCallback，自动回退 setTimeout
 * - 提供 enqueue、enqueueFetch、pause/resume、flush、cancel 等方法
 */

const DEFAULTS = {
  idleTimeoutMs: 2000,
  fallbackFrameBudgetMs: 12,
  maxTasksPerIdleTick: 10,
};

let TASK_ID_SEQ = 1;

const hasRIC =
  typeof window !== 'undefined' &&
  typeof window.requestIdleCallback === 'function' &&
  typeof window.cancelIdleCallback === 'function';

function requestIdle(fn, opts = {}) {
  const { idleTimeoutMs = DEFAULTS.idleTimeoutMs } = opts;
  if (hasRIC) {
    const id = window.requestIdleCallback(fn, { timeout: idleTimeoutMs });
    return { id, cancel: () => window.cancelIdleCallback(id) };
  }
  const start = now();
  const id = setTimeout(() => {
    const deadline = {
      didTimeout: false,
      timeRemaining: () => {
        const elapsed = now() - start;
        const remaining = DEFAULTS.fallbackFrameBudgetMs - elapsed;
        return remaining > 0 ? remaining : 0;
      },
    };
    try {
      fn(deadline);
    } catch (e) {
      console.error('[IdleQueue] Fallback idle callback error:', e);
    }
  }, Math.min(50, idleTimeoutMs));
  return { id, cancel: () => clearTimeout(id) };
}

function now() {
  if (typeof performance !== 'undefined' && performance.now) return performance.now();
  return Date.now();
}

function createAbortError(message = 'Aborted') {
  try {
    return new DOMException(message, 'AbortError');
  } catch (_) {
    const err = new Error(message);
    err.name = 'AbortError';
    return err;
  }
}

class QueueItem {
  constructor(fn, options = {}) {
    this.id = TASK_ID_SEQ++;
    this.fn = fn;
    this.priority =
      typeof options.priority === 'number' ? options.priority : options.priority === 'high' ? 1 : 0;
    this.label = options.label || '';
    this.signal = options.signal;
    this.enqueuedAt = now();
    this.resolver = null;
    this.rejecter = null;
    this.canceled = false;
  }
}

const IdleTimeTaskQueue = (() => {
  const queue = [];
  let scheduled = false;
  let paused = false;
  let currentScheduler = null;

  function schedule() {
    if (scheduled || paused || queue.length === 0) return;
    scheduled = true;
    currentScheduler = requestIdle(process, { idleTimeoutMs: DEFAULTS.idleTimeoutMs });
  }

  function pickNextTask() {
    if (queue.length === 0) return null;
    let bestIdx = 0;
    let bestPriority = queue[0].priority;
    for (let i = 1; i < queue.length; i++) {
      if (queue[i].priority > bestPriority) {
        bestPriority = queue[i].priority;
        bestIdx = i;
      }
    }
    return queue.splice(bestIdx, 1)[0];
  }

  function process(deadline) {
    scheduled = false;
    currentScheduler = null;
    let processed = 0;

    while (
      queue.length > 0 &&
      processed < DEFAULTS.maxTasksPerIdleTick &&
      (!deadline || typeof deadline.timeRemaining !== 'function' || deadline.timeRemaining() > 1)
    ) {
      const item = pickNextTask();
      if (!item) break;

      if (item.canceled || (item.signal && item.signal.aborted)) {
        item.rejecter(createAbortError('Task canceled before start'));
        continue;
      }

      try {
        const result = item.fn();
        processed++;
        if (result && typeof result.then === 'function') {
          result.then(item.resolver).catch(item.rejecter);
        } else {
          item.resolver(result);
        }
      } catch (e) {
        item.rejecter(e);
      }
    }

    if (queue.length > 0 && !paused) {
      schedule();
    }
  }

  function enqueue(fn, options = {}) {
    if (typeof fn !== 'function') {
      throw new TypeError('enqueue expects a function that returns a value or Promise.');
    }
    const item = new QueueItem(fn, options);
    const promise = new Promise((resolve, reject) => {
      item.resolver = resolve;
      item.rejecter = reject;
    });

    if (item.signal) {
      if (item.signal.aborted) {
        item.canceled = true;
        queue.push(item);
        item.rejecter(createAbortError('Task aborted before enqueue'));
        const idx = queue.findIndex((q) => q.id === item.id);
        if (idx >= 0) queue.splice(idx, 1);
        return { id: item.id, promise, cancel: () => {} };
      }
      const onAbort = () => {
        const idx = queue.findIndex((q) => q.id === item.id);
        if (idx >= 0) {
          queue.splice(idx, 1);
          item.canceled = true;
          item.rejecter(createAbortError('Task aborted'));
        }
      };
      item.signal.addEventListener('abort', onAbort, { once: true });
    }

    queue.push(item);
    schedule();

    const cancel = () => {
      if (item.canceled) return;
      const idx = queue.findIndex((q) => q.id === item.id);
      if (idx >= 0) {
        queue.splice(idx, 1);
        item.canceled = true;
        item.rejecter(createAbortError('Task canceled'));
      }
    };

    return { id: item.id, promise, cancel };
  }

  function enqueueFetch(input, init = {}, options = {}) {
    const fn = () => fetch(input, init);
    return enqueue(fn, { priority: options.priority, label: options.label, signal: options.signal });
  }

  function flush(maxTasks = Infinity) {
    if (paused) return 0;
    let processed = 0;
    while (queue.length > 0 && processed < maxTasks) {
      const item = pickNextTask();
      if (!item) break;
      if (item.canceled || (item.signal && item.signal.aborted)) {
        item.rejecter(createAbortError('Task canceled before flush'));
        continue;
      }
      try {
        const result = item.fn();
        processed++;
        if (result && typeof result.then === 'function') {
          result.then(item.resolver).catch(item.rejecter);
        } else {
          item.resolver(result);
        }
      } catch (e) {
        item.rejecter(e);
      }
    }
    return processed;
  }

  function pause() {
    paused = true;
    if (currentScheduler) {
      currentScheduler.cancel();
      currentScheduler = null;
      scheduled = false;
    }
  }

  function resume() {
    if (!paused) return;
    paused = false;
    schedule();
  }

  function clear() {
    for (const item of queue.splice(0, queue.length)) {
      item.canceled = true;
      item.rejecter(createAbortError('Queue cleared'));
    }
    if (currentScheduler) {
      currentScheduler.cancel();
      currentScheduler = null;
      scheduled = false;
    }
  }

  function size() {
    return queue.length;
  }

  function isPaused() {
    return paused;
  }

  return {
    enqueue,
    enqueueFetch,
    flush,
    pause,
    resume,
    clear,
    size,
    isPaused,
    _defaults: DEFAULTS,
  };
})();

export default IdleTimeTaskQueue;
