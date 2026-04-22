/**
 * 请求并发队列：限制同时进行的请求数量
 * - 正常请求：最多 maxConcurrent 个同时进行
 * - 闲时请求：正常请求空闲时执行，最多 idleMaxConcurrent 个同时进行
 */
class RequestQueue {
  constructor(maxConcurrent = 6) {
    this.maxConcurrent = maxConcurrent;
    this.currentCount = 0;
    this.queue = [];

    this.idleQueue = [];
    this.idleMaxConcurrent = 2;
    this.currentIdleCount = 0;
  }

  async add(requestFn, isIdle = false) {
    return new Promise((resolve, reject) => {
      const task = async () => {
        this.currentCount++;
        if (isIdle) this.currentIdleCount++;
        try {
          const result = await requestFn();
          resolve(result);
        } catch (err) {
          reject(err);
        } finally {
          this.currentCount--;
          if (isIdle) this.currentIdleCount--;
          this.next();
        }
      };

      if (!isIdle) {
        if (this.currentCount < this.maxConcurrent) {
          task();
        } else {
          this.queue.push(task);
        }
      } else {
        const canStartIdle =
          this.currentCount < this.maxConcurrent &&
          this.currentIdleCount < this.idleMaxConcurrent &&
          this.queue.length === 0;
        if (canStartIdle) {
          task();
        } else {
          this.idleQueue.push(task);
        }
      }
    });
  }

  next() {
    if (this.currentCount >= this.maxConcurrent) return;
    if (this.queue.length > 0) {
      const task = this.queue.shift();
      task();
    } else if (this.idleQueue.length > 0 && this.currentIdleCount < this.idleMaxConcurrent) {
      const task = this.idleQueue.shift();
      task();
    }
  }
}

export const requestQueue = new RequestQueue(6);
