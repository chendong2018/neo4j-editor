/**
 * 模块加载器
 * 提供统一的模块定义和依赖管理机制
 */

// 模块缓存
const modules = {};

// 正在加载的模块
const loadingModules = new Set();

// 模块加载完成的回调队列
const readyCallbacks = [];

/**
 * 定义一个模块
 * 支持两种格式：
 * 1. define(dependencies, factory) - 标准AMD格式
 * 2. define(moduleName, dependencies, factory) - 带模块名的格式
 */
function define() {
  let moduleName, dependencies, factory;
  
  // 解析参数
  if (arguments.length === 2) {
    // 标准AMD格式: define(dependencies, factory)
    dependencies = arguments[0];
    factory = arguments[1];
    // 生成一个唯一的模块名
    moduleName = `anonymous_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  } else if (arguments.length === 3) {
    // 带模块名的格式: define(moduleName, dependencies, factory)
    moduleName = arguments[0];
    dependencies = arguments[1];
    factory = arguments[2];
  } else {
    console.error('define函数参数错误，支持格式: define(dependencies, factory) 或 define(moduleName, dependencies, factory)');
    return;
  }
  
  // 确保dependencies是数组
  if (!Array.isArray(dependencies)) {
    console.error('dependencies必须是数组，当前类型:', typeof dependencies);
    dependencies = [];
  }
  
  // 如果已经定义过该模块，直接返回
  if (modules[moduleName]) {
    console.warn(`模块 ${moduleName} 已存在，将被覆盖`);
  }

  // 检查依赖是否都已加载
  const missingDependencies = dependencies.filter(dep => !modules[dep]);
  
  if (missingDependencies.length > 0) {
    // 延迟加载，等待所有依赖可用
    setTimeout(() => {
      define(moduleName, dependencies, factory);
    }, 0);
    return;
  }

  // 加载依赖
  const resolvedDependencies = dependencies.map(dep => modules[dep]);
  
  // 执行工厂函数，创建模块实例
  try {
    const moduleExports = factory(...resolvedDependencies);
    modules[moduleName] = moduleExports;
    console.log(`模块 ${moduleName} 加载完成`);
    
    // 检查是否所有加载中的模块都已完成
    checkAllModulesLoaded();
  } catch (error) {
    console.error(`模块 ${moduleName} 加载失败:`, error);
  }
}

/**
 * 注册模块加载完成后的回调
 * @param {Function} callback - 回调函数
 */
function ready(callback) {
  if (loadingModules.size === 0) {
    // 如果没有加载中的模块，立即执行回调
    callback();
  } else {
    // 否则加入回调队列
    readyCallbacks.push(callback);
  }
}

/**
 * 标记模块开始加载
 * @param {string} moduleName - 模块名称
 */
function markModuleLoading(moduleName) {
  loadingModules.add(moduleName);
}

/**
 * 标记模块加载完成
 * @param {string} moduleName - 模块名称
 */
function markModuleLoaded(moduleName) {
  loadingModules.delete(moduleName);
  checkAllModulesLoaded();
}

/**
 * 检查是否所有模块都已加载完成
 */
function checkAllModulesLoaded() {
  if (loadingModules.size === 0 && readyCallbacks.length > 0) {
    // 所有模块都已加载完成，执行回调队列
    const callbacks = [...readyCallbacks];
    readyCallbacks.length = 0;
    
    callbacks.forEach(callback => {
      try {
        callback();
      } catch (error) {
        console.error('模块加载完成回调执行失败:', error);
      }
    });
  }
}

/**
 * 获取已加载的模块
 * @param {string} moduleName - 模块名称
 * @returns {*} 模块导出的内容
 */
function getModule(moduleName) {
  return modules[moduleName];
}

/**
 * 导出模块加载器API
 */
const Neo4jModuleLoader = {
  define,
  ready,
  getModule,
  markModuleLoading,
  markModuleLoaded,
  modules
};

// 暴露到全局作用域
window.Neo4jModuleLoader = Neo4jModuleLoader;

// 导出到CommonJS（如果在Node.js环境中）
if (typeof module !== 'undefined' && module.exports) {
  module.exports = Neo4jModuleLoader;
}

// 提供简单的AMD兼容接口
window.define = define;
window.requirejs = {
  define,
  ready
};
window.require = getModule;
