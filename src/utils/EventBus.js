/**
 * 实现任意组件间通信
 */
class EventBus {
  constructor() {
    this.events = this.events || {};
  }
}

const eventBus = new EventBus();
export default eventBus;
export { EventBus };

/**
 * @name emit
 * @description 广播事件
 * @param {*} name 事件名字
 * @param  {...any} args 参数
 */
EventBus.prototype.emit = function (name, ...args) {
  const eventFuncs = this.events[name];
  if (Array.isArray(eventFuncs)) {
    eventFuncs.forEach((func) => {
      func.apply(this, args);
    });
  } else {
    eventFuncs && eventFuncs.apply(this, args);
  }
};

/**
 * @name add
 * @description 增加监听函数
 * @param {*} name 事件名字
 * @param {*} func 执行事件
 */
EventBus.prototype.add = function (name, func) {
  const eventFuncs = this.events[name];
  if (!eventFuncs) {
    this.events[name] = [func];
  } else {
    eventFuncs.push(func);
  }
};

/**
 * @name remove
 * @description 删除监听事件
 * @param {*} name 事件名字
 * @param {*} func 要移除的函数
 */
EventBus.prototype.remove = function (name, func) {
  if (this.events[name]) {
    const eventFuncs = this.events[name];
    if (Array.isArray(eventFuncs)) {
      if (func) {
        const funcIndex = eventFuncs.findIndex((eventFunc) => func === eventFunc);
        if (funcIndex !== -1) {
          eventFuncs.splice(funcIndex, 1);
        } else {
          console.warn(`eventBus may remove unexit func(${name})`);
        }
      } else {
        delete this.events[name];
      }
    } else {
      delete this.events[name];
    }
  }
};

EventBus.prototype.removeAll = function () {
  this.events = {};
};
