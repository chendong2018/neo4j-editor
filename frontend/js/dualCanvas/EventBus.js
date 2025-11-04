/**
 * 事件总线类
 * 提供简单的发布-订阅模式实现组件间通信
 */
class EventBus {
  constructor() {
    this.listeners = {};
  }

  /**
   * 注册事件监听器
   * @param {string} event 事件名称
   * @param {Function} callback 回调函数
   */
  on(event, callback) {
    if (!this.listeners[event]) {
      this.listeners[event] = [];
    }
    this.listeners[event].push(callback);
  }

  /**
   * 移除事件监听器
   * @param {string} event 事件名称
   * @param {Function} callback 回调函数（可选，不提供则移除所有该事件的监听器）
   */
  off(event, callback) {
    if (!this.listeners[event]) return;
    
    if (callback) {
      this.listeners[event] = this.listeners[event].filter(cb => cb !== callback);
    } else {
      delete this.listeners[event];
    }
  }

  /**
   * 触发事件
   * @param {string} event 事件名称
   * @param {...*} args 传递给监听器的参数
   */
  emit(event, ...args) {
    if (!this.listeners[event]) return;
    
    this.listeners[event].forEach(callback => {
      try {
        callback(...args);
      } catch (error) {
        console.error(`事件监听器执行错误 [${event}]:`, error);
      }
    });
  }
}

// 暴露到全局作用域（避免重复声明）
if (!window.EventBus) {
  window.EventBus = EventBus;
}
