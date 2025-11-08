/**
 * 通用工具函数模块
 * 提供各模块共用的辅助方法
 */

const utils = {
  /**
   * 获取元素相对于画布的坐标
   * @param {Event} event - 鼠标事件对象
   * @param {HTMLElement} canvas - 画布元素
   * @returns {Object} 包含x和y坐标的对象
   */
  getCanvasCoordinates(event, canvas) {
    const rect = canvas.getBoundingClientRect();
    return {
      x: event.clientX - rect.left,
      y: event.clientY - rect.top
    };
  },

  /**
   * 深拷贝对象
   * @param {*} obj - 要拷贝的对象
   * @returns {*} 拷贝后的对象
   */
  deepClone(obj) {
    if (obj === null || typeof obj !== 'object') {
      return obj;
    }

    if (obj instanceof Date) {
      return new Date(obj.getTime());
    }

    if (obj instanceof Array) {
      const cloneArr = [];
      for (let i = 0; i < obj.length; i++) {
        cloneArr[i] = this.deepClone(obj[i]);
      }
      return cloneArr;
    }

    if (typeof obj === 'object') {
      const cloneObj = {};
      for (const key in obj) {
        if (obj.hasOwnProperty(key)) {
          cloneObj[key] = this.deepClone(obj[key]);
        }
      }
      return cloneObj;
    }
  },

  /**
   * 防抖函数
   * @param {Function} func - 要防抖的函数
   * @param {number} wait - 等待时间（毫秒）
   * @returns {Function} 防抖后的函数
   */
  debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
      const later = () => {
        clearTimeout(timeout);
        func(...args);
      };
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
    };
  },

  /**
   * 节流函数
   * @param {Function} func - 要节流的函数
   * @param {number} limit - 时间限制（毫秒）
   * @returns {Function} 节流后的函数
   */
  throttle(func, limit) {
    let inThrottle;
    return function(...args) {
      if (!inThrottle) {
        func.apply(this, args);
        inThrottle = true;
        setTimeout(() => inThrottle = false, limit);
      }
    };
  },

  /**
   * 生成唯一ID
   * @returns {string} 唯一ID
   */
  generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  },

  /**
   * 检查是否为空对象
   * @param {Object} obj - 要检查的对象
   * @returns {boolean} 是否为空对象
   */
  isEmptyObject(obj) {
    return Object.keys(obj).length === 0 && obj.constructor === Object;
  },

  /**
   * 获取两点之间的距离
   * @param {number} x1 - 第一个点的x坐标
   * @param {number} y1 - 第一个点的y坐标
   * @param {number} x2 - 第二个点的x坐标
   * @param {number} y2 - 第二个点的y坐标
   * @returns {number} 两点之间的距离
   */
  getDistance(x1, y1, x2, y2) {
    const dx = x2 - x1;
    const dy = y2 - y1;
    return Math.sqrt(dx * dx + dy * dy);
  },

  /**
   * 格式化时间戳
   * @param {number} timestamp - 时间戳
   * @returns {string} 格式化后的时间字符串
   */
  formatTimestamp(timestamp) {
    const date = new Date(timestamp);
    return date.toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  },

  /**
   * 安全地解析JSON
   * @param {string} jsonString - JSON字符串
   * @param {*} defaultValue - 解析失败时的默认值
   * @returns {*} 解析后的对象或默认值
   */
  safeJsonParse(jsonString, defaultValue = null) {
    try {
      return JSON.parse(jsonString);
    } catch (e) {
      console.error('JSON解析失败:', e);
      return defaultValue;
    }
  },

  /**
   * 将对象转换为查询字符串
   * @param {Object} params - 参数对象
   * @returns {string} 查询字符串
   */
  objectToQueryString(params) {
    return Object.keys(params)
      .map(key => `${encodeURIComponent(key)}=${encodeURIComponent(params[key])}`)
      .join('&');
  },

  /**
   * 获取浏览器支持的最佳请求动画帧方法
   * @returns {Function} 请求动画帧方法
   */
  requestAnimationFrame() {
    return window.requestAnimationFrame ||
           window.webkitRequestAnimationFrame ||
           window.mozRequestAnimationFrame ||
           function(callback) {
             window.setTimeout(callback, 1000 / 60);
           };
  },

  /**
   * 计算两点之间的角度
   * @param {number} x1 - 第一个点的x坐标
   * @param {number} y1 - 第一个点的y坐标
   * @param {number} x2 - 第二个点的x坐标
   * @param {number} y2 - 第二个点的y坐标
   * @returns {number} 角度（弧度）
   */
  getAngle(x1, y1, x2, y2) {
    return Math.atan2(y2 - y1, x2 - x1);
  },

  /**
   * 限制值在指定范围内
   * @param {number} value - 要限制的值
   * @param {number} min - 最小值
   * @param {number} max - 最大值
   * @returns {number} 限制后的值
   */
  clamp(value, min, max) {
    return Math.min(Math.max(value, min), max);
  },

  /**
   * 线性插值
   * @param {number} start - 起始值
   * @param {number} end - 结束值
   * @param {number} t - 插值因子（0-1）
   * @returns {number} 插值结果
   */
  lerp(start, end, t) {
    return start + (end - start) * this.clamp(t, 0, 1);
  },

  /**
   * 延迟执行
   * @param {number} ms - 延迟时间（毫秒）
   * @returns {Promise} Promise对象
   */
  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  },

  /**
   * 批量执行Promise
   * @param {Array<Function>} tasks - 返回Promise的函数数组
   * @param {number} concurrency - 并发数
   * @returns {Promise} Promise对象
   */
  async batchPromises(tasks, concurrency = 5) {
    const results = [];
    const running = [];
    const taskQueue = [...tasks];

    while (taskQueue.length > 0 || running.length > 0) {
      while (running.length < concurrency && taskQueue.length > 0) {
        const task = taskQueue.shift();
        const promise = task().then(result => {
          results.push(result);
          running.splice(running.indexOf(promise), 1);
        });
        running.push(promise);
      }

      if (running.length > 0) {
        await Promise.race(running);
      }
    }

    return results;
  }
};

// ES6 模块导出
export default utils;

// 暴露到全局作用域
window.Neo4jUtils = utils;

// 导出模块
if (typeof module !== 'undefined' && module.exports) {
  module.exports = utils;
  module.exports.default = utils;
}

// AMD模块定义
if (typeof define === 'function' && define.amd) {
  define([], function() {
    return utils;
  });
}

// 与Neo4j模块加载器集成
if (window.Neo4jModuleLoader) {
  Neo4jModuleLoader.define('common/utils', [], () => utils);
}
