/**
 * Neo4j编辑器统一API接口
 * 作为系统的入口点，导出所有模块和功能
 */

// 定义API对象
const Neo4jEditor = {
  /**
   * 初始化编辑器
   * @param {Object} options - 配置选项
   * @returns {Promise} 初始化完成的Promise
   */
  async init(options = {}) {
    // 确保模块加载器已加载
    if (!window.Neo4jModuleLoader) {
      await this._loadModuleLoader();
    }

    // 设置调试模式
    this.debugMode = options.debugMode || false;
    
    // 初始化事件总线
    if (window.EventBus) {
      this.eventBus = new window.EventBus();
      this.eventBus.setDebugMode(this.debugMode);
    }

    // 等待所有模块加载完成
    return new Promise(resolve => {
      if (window.Neo4jModuleLoader) {
        window.Neo4jModuleLoader.ready(() => {
          // 初始化各模块
          this._initModules(options);
          resolve(this);
        });
      } else {
        // 降级处理
        this._initModules(options);
        resolve(this);
      }
    });
  },

  /**
   * 加载模块加载器
   * @private
   */
  _loadModuleLoader() {
    return new Promise((resolve, reject) => {
      try {
        // 检查是否已经加载
        if (window.Neo4jModuleLoader) {
          resolve();
          return;
        }

        // 创建script标签加载模块加载器
        const script = document.createElement('script');
        script.src = '../common/moduleLoader.js';
        script.onload = () => resolve();
        script.onerror = () => {
          console.warn('无法加载模块加载器，将使用降级方案');
          resolve();
        };
        document.head.appendChild(script);
      } catch (error) {
        console.warn('加载模块加载器失败:', error);
        resolve();
      }
    });
  },

  /**
   * 初始化各模块
   * @private
   */
  _initModules(options) {
    // 这里将在模块重构完成后填充
    console.log('Neo4jEditor: 开始初始化各模块...');
    
    // 注册核心事件
    this._registerCoreEvents();
  },

  /**
   * 注册核心事件
   * @private
   */
  _registerCoreEvents() {
    if (this.eventBus) {
      // 应用程序生命周期事件
      this.eventBus.on('app:initialized', () => {
        console.log('Neo4jEditor: 应用程序初始化完成');
      });
      
      this.eventBus.on('app:error', (error) => {
        console.error('Neo4jEditor: 应用程序错误:', error);
      });
    }
  },

  /**
   * 创建渲染器实例
   * @param {string} type - 渲染器类型 ('tree', 'network', 'dual')
   * @param {HTMLElement|string} container - 容器元素或选择器
   * @param {Object} options - 配置选项
   * @returns {Object} 渲染器实例
   */
  createRenderer(type, container, options = {}) {
    // 延迟实现，等待render模块重构完成
    console.warn('Neo4jEditor: createRenderer方法尚未实现');
    return null;
  },

  /**
   * 创建事件管理器实例
   * @param {Object} options - 配置选项
   * @returns {Object} 事件管理器实例
   */
  createEventManager(options = {}) {
    // 延迟实现，等待events模块重构完成
    console.warn('Neo4jEditor: createEventManager方法尚未实现');
    return null;
  },

  /**
   * 创建双画布编辑器实例
   * @param {Object} options - 配置选项
   * @returns {Object} 双画布编辑器实例
   */
  createDualCanvasEditor(options = {}) {
    // 延迟实现，等待dualCanvas模块重构完成
    console.warn('Neo4jEditor: createDualCanvasEditor方法尚未实现');
    return null;
  },

  /**
   * 获取事件总线实例
   * @returns {Object} 事件总线实例
   */
  getEventBus() {
    return this.eventBus;
  },

  /**
   * 获取工具函数集合
   * @returns {Object} 工具函数集合
   */
  getUtils() {
    return window.Neo4jUtils || {};
  },

  /**
   * 设置调试模式
   * @param {boolean} enabled - 是否开启调试模式
   */
  setDebugMode(enabled) {
    this.debugMode = enabled;
    if (this.eventBus) {
      this.eventBus.setDebugMode(enabled);
    }
    return this;
  },

  /**
   * 获取当前版本信息
   * @returns {Object} 版本信息
   */
  getVersion() {
    return {
      version: '1.0.0',
      buildDate: new Date().toISOString()
    };
  },

  /**
   * 销毁编辑器实例
   */
  destroy() {
    // 清理资源
    if (this.eventBus) {
      this.eventBus.clear();
      this.eventBus = null;
    }
    console.log('Neo4jEditor: 编辑器实例已销毁');
  }
};

// 暴露到全局作用域
window.Neo4jEditor = Neo4jEditor;

// 导出模块
if (typeof module !== 'undefined' && module.exports) {
  module.exports = Neo4jEditor;
}

// AMD模块定义
if (typeof define === 'function' && define.amd) {
  define([], function() {
    return Neo4jEditor;
  });
}

// 与Neo4j模块加载器集成
if (window.Neo4jModuleLoader) {
  window.Neo4jModuleLoader.define('api', [], () => Neo4jEditor);
}

// 导出默认实例
export default Neo4jEditor;
