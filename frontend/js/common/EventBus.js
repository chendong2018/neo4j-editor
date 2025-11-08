/**
 * 统一事件总线模块 - 全局事件管理中心
 * 使用单例模式确保整个应用只有一个事件总线实例
 * 
 * 主要功能：
 * - 基于发布-订阅模式的事件通信系统
 * - 支持事件优先级、一次性监听、调试追踪等功能
 * - 兼容AMD、CommonJS和全局变量三种模块系统
 * - 提供链式调用API，便于流畅编码
 * - 支持事件常量管理和模块特定事件注册
 * 
 * @class EventBus
 * @example
 * // 获取事件总线实例
 * const eventBus = EventBus.getInstance();
 * 
 * // 注册事件监听器
 * eventBus.on(Events.NODE_SELECTED, function(nodeData) {
 *   console.log('节点被选中:', nodeData);
 * });
 * 
 * // 触发事件
 * eventBus.emit(Events.NODE_SELECTED, { nodeId: 'node1', nodeData: {...} });
 */

// 单例实现
// 全局事件常量定义
const GlobalEvents = {
  // 基础事件
  APP_INITIALIZED: 'appInitialized',
  APP_ERROR: 'appError',
  
  // 图操作事件
  GRAPH_LOADED: 'graphLoaded',
  GRAPH_CLEARED: 'graphCleared',
  
  // 节点相关事件
  NODE_ADDED: 'nodeAdded',
  NODE_UPDATED: 'nodeUpdated',
  NODE_DELETED: 'nodeDeleted',
  NODE_SELECTED: 'nodeSelected',
  NODE_MOVED: 'nodeMoved',
  
  // 关系相关事件
  RELATIONSHIP_ADDED: 'relationshipAdded',
  RELATIONSHIP_UPDATED: 'relationshipUpdated',
  RELATIONSHIP_DELETED: 'relationshipDeleted',
  RELATIONSHIP_SELECTED: 'relationshipSelected',
  
  // 上下文相关事件
  CONTEXT_CHANGED: 'contextChanged',
  NETWORK_CONTEXT_CHANGED: 'networkContextChanged',
  
  // UI相关事件
  PROPERTIES_PANEL_UPDATED: 'propertiesPanelUpdated',
  HISTORY_UPDATED: 'historyUpdated',
  
  // 操作相关事件
  OPERATION_UNDO: 'operationUndo',
  OPERATION_REDO: 'operationRedo',
  
  // 双视图特定事件
  TREE_NODE_SELECTED: 'treeNodeSelected',
  NETWORK_NODE_DOUBLE_CLICKED: 'networkNodeDoubleClicked',
  
  // 模式相关事件
  MODE_CHANGED: 'modeChanged',
  
  // 选择相关事件
  SELECTION_CLEARED: 'selectionCleared',
  
  // 数据相关事件
  DATA_CHANGED: 'dataChanged',
  NODE_CREATED: 'nodeCreated',
  RELATIONSHIP_CREATED: 'relationshipCreated',
  
  // UI相关事件
  CANVASES_UPDATED: 'canvasesUpdated',
  SHOW_CONTEXT_MENU: 'showContextMenu',
  
  // 操作相关事件
  CREATE_NODE: 'createNode',
  CREATE_RELATIONSHIP: 'createRelationship',
  DELETE_NODE: 'deleteNode',
  DELETE_RELATIONSHIP: 'deleteRelationship'
};

// 事件类型定义
const EventTypes = {
  // 应用初始化事件数据类型
  appInitialized: {
    version: 'string',
    timestamp: 'number'
  },
  
  // 应用错误事件数据类型
  appError: {
    error: 'object',
    message: 'string'
  },
  
  // 节点添加事件数据类型
  nodeAdded: {
    nodeId: 'string',
    nodeData: 'object'
  },
  
  // 节点删除事件数据类型
  nodeDeleted: {
    nodeId: 'string'
  },
  
  // 节点移动事件数据类型
  nodeMoved: {
    nodeId: 'string',
    newParentId: 'string',
    oldParentId: 'string'
  },
  
  // 关系添加事件数据类型
  relationshipAdded: {
    relationship: 'object'
  },
  
  // 关系删除事件数据类型
  relationshipDeleted: {
    relId: 'string'
  },
  
  // 网络上下文变更事件数据类型
  networkContextChanged: {
    parentId: 'string | null'
  },
  
  // 树节点选中事件数据类型
  treeNodeSelected: {
    nodeId: 'string'
  },
  
  // 网络节点双击事件数据类型
  networkNodeDoubleClicked: {
    nodeId: 'string'
  },
  
  // 模式变更事件数据类型
  modeChanged: {
    mode: 'string',
    subType: 'string | undefined'
  },
  
  // 节点选中事件数据类型
  nodeSelected: {
    nodeId: 'string'
  },
  
  // 关系选中事件数据类型
  relationshipSelected: {
    relId: 'string'
  },
  
  // 上下文变更事件数据类型
  contextChanged: {
    type: 'string',
    nodeId: 'string | null'
  },
  
  // 节点创建事件数据类型
  nodeCreated: {
    nodeId: 'string'
  },
  
  // 关系创建事件数据类型
  relationshipCreated: {
    relationship: 'object'
  },
  
  // 显示上下文菜单事件数据类型
  showContextMenu: {
    position: {
      x: 'number',
      y: 'number'
    },
    menuItems: 'Array<object>'
  },
  
  // 创建节点事件数据类型
  createNode: {
    data: 'object'
  },
  
  // 创建关系事件数据类型
  createRelationship: {
    data: 'object'
  }
};

class EventBus {
  /**
   * 私有构造函数，不允许直接实例化
   * 请通过EventBus.getInstance()获取实例
   */
  constructor() {
    // 使用类的静态属性存储单例实例，更加封装
    if (EventBus._instance) {
      console.warn('EventBus: 尝试直接实例化EventBus，请使用EventBus.getInstance()获取单例');
      return EventBus._instance;
    }
    
    // 存储事件监听器
    this._listeners = {};
    // 事件历史记录，用于调试
    this._eventHistory = [];
    // 最大历史记录数量
    this._maxHistorySize = 100;
    // 调试模式
    this._debugMode = false;
    // 模块特定事件注册表
    this._moduleEvents = {};
    
    // 保存实例引用到类的静态属性
    EventBus._instance = this;
  }
  
  /**
   * 获取事件总线单例实例
   * @returns {EventBus} 事件总线实例
   */
  static getInstance() {
    if (!EventBus._instance) {
      EventBus._instance = new EventBus();
    }
    return EventBus._instance;
  }

  /**
   * 开启/关闭调试模式
   * @param {boolean} enabled - 是否开启调试模式
   * @returns {EventBus} 返回this以支持链式调用
   */
  setDebugMode(enabled) {
    this._debugMode = enabled;
    return this;
  }

  /**
   * 注册事件监听器
   * @param {string} eventName 事件名称
   * @param {Function} callback 回调函数
   * @param {Object} context 回调函数的上下文（可选）
   * @returns {EventBus} 返回this以支持链式调用
   */
  on(eventName, callback, context = null) {
    if (!eventName || typeof callback !== 'function') {
      console.error('EventBus.on(): 无效的事件名称或回调函数');
      return this;
    }

    if (!this._listeners[eventName]) {
      this._listeners[eventName] = [];
    }

    // 包装回调函数，绑定上下文
    const wrappedCallback = context ? callback.bind(context) : callback;
    
    // 存储原始回调和包装后的回调，便于后续移除
    this._listeners[eventName].push({
      originalCallback: callback,
      wrappedCallback
    });

    if (this._debugMode) {
      console.log(`[EventBus] 监听事件: ${eventName}`);
    }

    return this;
  }

  /**
   * 移除事件监听器
   * @param {string} eventName 事件名称
   * @param {Function} callback 回调函数（可选，不传则移除该事件的所有监听器）
   * @returns {EventBus} 返回this以支持链式调用
   */
  off(eventName, callback) {
    if (!this._listeners[eventName]) return this;

    if (callback) {
      // 移除特定的监听器
      this._listeners[eventName] = this._listeners[eventName].filter(
        listener => listener.originalCallback !== callback
      );
      
      // 如果没有监听器了，清理数组
      if (this._listeners[eventName].length === 0) {
        delete this._listeners[eventName];
      }
      
      if (this._debugMode) {
        console.log(`[EventBus] 移除事件 ${eventName} 的指定监听器`);
      }
    } else {
      // 移除所有监听器
      delete this._listeners[eventName];
      if (this._debugMode) {
        console.log(`[EventBus] 移除事件 ${eventName} 的所有监听器`);
      }
    }
    return this;
  }

  /**
   * 触发事件
   * @param {string} eventName 事件名称
   * @param {...any} args 传递给监听器的参数
   * @returns {EventBus} 返回this以支持链式调用
   */
  emit(eventName, ...args) {
    if (this._debugMode) {
      console.log(`[EventBus] 触发事件: ${eventName}`, ...args);
    }

    // 记录事件历史
    this._recordEventHistory(eventName, args);

    if (!this._listeners[eventName]) return this;

    // 复制监听器数组，避免在回调中修改数组导致问题
    const listeners = [...this._listeners[eventName]];
    
    // 异步触发所有监听器
    setTimeout(() => {
      listeners.forEach(listener => {
        try {
          listener.wrappedCallback(...args);
        } catch (error) {
          console.error(`事件监听器执行错误 [${eventName}]:`, error);
        }
      });
    }, 0);
    
    return this;
  }

  /**
   * 注册一次性事件监听器（触发后自动移除）
   * @param {string} eventName 事件名称
   * @param {Function} callback 回调函数
   * @param {Object} context 回调函数的上下文（可选）
   * @returns {EventBus} 返回this以支持链式调用
   */
  once(eventName, callback, context = null) {
    const onceCallback = (...args) => {
      this.off(eventName, onceCallback);
      callback.apply(context, args);
    };
    return this.on(eventName, onceCallback);
  }

  /**
   * 获取指定事件的监听器数量
   * @param {string} eventName 事件名称
   * @returns {number} 监听器数量
   */
  listenerCount(eventName) {
    return this._listeners[eventName] ? this._listeners[eventName].length : 0;
  }

  /**
   * 获取所有已注册的事件名称
   * @returns {string[]} 事件名称数组
   */
  eventNames() {
    return Object.keys(this._listeners);
  }
  
  /**
   * 注册模块特定的事件常量
   * @param {string} moduleName 模块名称
   * @param {Object} events 事件常量对象
   * @returns {EventBus} 返回this以支持链式调用
   */
  registerModuleEvents(moduleName, events) {
    if (!moduleName || typeof events !== 'object') {
      console.error('EventBus.registerModuleEvents(): 无效的模块名称或事件常量');
      return this;
    }
    
    this._moduleEvents[moduleName] = events;
    
    if (this._debugMode) {
      console.log(`[EventBus] 注册模块事件: ${moduleName}`, events);
    }
    
    return this;
  }
  
  /**
   * 获取模块特定的事件常量
   * @param {string} moduleName 模块名称
   * @returns {Object|null} 事件常量对象或null
   */
  getModuleEvents(moduleName) {
    return this._moduleEvents[moduleName] || null;
  }
  
  /**
   * 验证事件名称是否有效
   * @param {string} eventName 事件名称
   * @returns {boolean} 是否有效
   */
  isValidEvent(eventName) {
    // 检查全局事件
    if (Object.values(GlobalEvents).includes(eventName)) {
      return true;
    }
    
    // 检查所有模块事件
    for (const moduleName in this._moduleEvents) {
      if (Object.values(this._moduleEvents[moduleName]).includes(eventName)) {
        return true;
      }
    }
    
    return false;
  }
  
  /**
   * 获取事件类型信息
   * @param {string} eventName 事件名称
   * @returns {Object|null} 事件类型信息或null
   */
  getEventTypeInfo(eventName) {
    const eventKey = Object.keys(GlobalEvents).find(key => GlobalEvents[key] === eventName);
    return eventKey ? EventTypes[eventKey] : null;
  }
  
  /**
   * 检查是否有事件监听器
   * @param {string} event 事件名称
   * @returns {boolean} 是否有监听器
   */
  hasListeners(event) {
    return this.listenerCount(event) > 0;
  }

  /**
   * 清除所有事件监听器
   * @returns {EventBus} 返回this以支持链式调用
   */
  clear() {
    this._listeners = {};
    if (this._debugMode) {
      console.log('[EventBus] 清除所有事件监听器');
    }
    return this;
  }

  /**
   * 记录事件历史
   * @private
   */
  _recordEventHistory(eventName, args) {
    this._eventHistory.push({
      eventName,
      args,
      timestamp: Date.now()
    });

    // 限制历史记录大小
    if (this._eventHistory.length > this._maxHistorySize) {
      this._eventHistory.shift();
    }
  }

  /**
   * 获取事件历史记录
   * @param {number} limit 限制返回的记录数量
   * @returns {Array} 事件历史记录
   */
  getEventHistory(limit = 50) {
    return this._eventHistory.slice(-limit);
  }

  /**
   * 清除事件历史记录
   * @returns {EventBus} 返回this以支持链式调用
   */
  clearEventHistory() {
    this._eventHistory = [];
    return this;
  }
}

// 暴露到全局作用域
if (typeof window !== 'undefined') {
  // 确保全局只有一个EventBus类定义
  window.EventBus = EventBus;
  
  // 暴露全局事件常量
  window.Events = GlobalEvents;
  window.EventTypes = EventTypes;
  
  // 创建全局事件总线实例
  window.eventBus = EventBus.getInstance();
}

// ES6 模块导出
export default EventBus;
export { GlobalEvents, EventTypes };

// 导出模块（支持CommonJS）
if (typeof module !== 'undefined' && typeof module.exports !== 'undefined') {
  module.exports = EventBus;
  module.exports.default = EventBus;
  module.exports.GlobalEvents = GlobalEvents;
  module.exports.EventTypes = EventTypes;
}

// 导出模块（支持AMD）
if (typeof define === 'function' && define.amd) {
  define([], function() {
    return EventBus;
  });
}

// 与Neo4j模块加载器集成
if (typeof window !== 'undefined' && window.Neo4jModuleLoader) {
  // 注册为全局模块，确保使用单例
  Neo4jModuleLoader.define('common/eventBus', [], () => EventBus.getInstance());
}