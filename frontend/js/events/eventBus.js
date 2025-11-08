/**
 * 事件总线适配器 - events目录
 * 
 * 此文件是一个轻量级适配器，直接使用公共模块中的EventBus实现和全局事件常量。
 * 保持向后兼容性，同时确保整个应用使用统一的事件总线实例和事件常量。
 */

// 确保公共EventBus模块已加载
if (typeof window === 'undefined' || !window.EventBus || !window.Events) {
  console.error('错误: 公共EventBus模块未正确加载，请确保在HTML中正确引入 ../common/EventBus.js');
}

// 直接导出全局事件常量的引用（保持向后兼容）
export const Events = window.Events || {};
export const EventTypes = window.EventTypes || {};

// 事件总线适配器 - 保持向后兼容性
class EventAdapter {
  constructor() {
    // 直接使用全局事件总线实例
    this._eventBus = window.eventBus;
  }
  
  /**
   * 获取事件总线实例的便捷方法
   */
  static getInstance() {
    if (!EventAdapter._instance) {
      EventAdapter._instance = new EventAdapter();
    }
    return EventAdapter._instance;
  }
  
  // 转发所有核心方法到全局事件总线
  on(...args) { return this._eventBus?.on(...args); }
  off(...args) { return this._eventBus?.off(...args); }
  emit(...args) { return this._eventBus?.emit(...args); }
  once(...args) { return this._eventBus?.once(...args); }
  clear(...args) { return this._eventBus?.clear(...args); }
  listenerCount(...args) { return this._eventBus?.listenerCount(...args); }
  eventNames(...args) { return this._eventBus?.eventNames(...args); }
  setDebugMode(...args) { return this._eventBus?.setDebugMode(...args); }
  getEventHistory(...args) { return this._eventBus?.getEventHistory(...args); }
  clearEventHistory(...args) { return this._eventBus?.clearEventHistory(...args); }
  
  // 增强方法
  isValidEvent(eventName) { return this._eventBus?.isValidEvent(eventName) || false; }
  getSupportedEvents() { return Object.values(Events); }
  getEventTypeInfo(eventName) { return this._eventBus?.getEventTypeInfo(eventName); }
  hasListeners(event) { return this._eventBus?.hasListeners(event) || false; }
}

// 为了向后兼容性，保留EnhancedEventBus名称
const EnhancedEventBus = EventAdapter;

// 暴露到全局作用域（保持向后兼容）
if (typeof window !== 'undefined') {
  // 确保全局事件常量已经存在
  if (!window.Events) {
    window.Events = Events;
  }
  if (!window.EventTypes) {
    window.EventTypes = EventTypes;
  }
  
  // 提供适配器实例，保持向后兼容
  window.EnhancedEventBus = EnhancedEventBus;
  window.enhancedEventBus = EnhancedEventBus.getInstance();
}

// AMD模块系统支持
if (typeof define === 'function' && define.amd) {
  define(['../common/EventBus'], function(commonEventBus) {
    return {
      EventBus: commonEventBus,
      Events: Events,
      EventTypes: EventTypes,
      EnhancedEventBus: EnhancedEventBus,
      getInstance: () => EnhancedEventBus.getInstance(),
      eventBus: window.eventBus
    };
  });
}

// CommonJS模块系统支持
if (typeof module !== 'undefined' && typeof module.exports !== 'undefined') {
  module.exports = {
    EventBus: window.EventBus,
    Events: Events,
    EventTypes: EventTypes,
    EnhancedEventBus: EnhancedEventBus,
    getInstance: () => EnhancedEventBus.getInstance(),
    eventBus: window.eventBus
  };
}

// 推荐使用方式：
// 1. 直接使用全局事件总线实例和常量
// const eventBus = window.eventBus;
// eventBus.emit(Events.NODE_ADDED, { nodeId: 'node1', nodeData: {...} });

// 2. 或者通过此适配器（保持向后兼容）
// const { Events, eventBus } = require('./eventBus');
// eventBus.emit(Events.NODE_ADDED, { nodeId: 'node1', nodeData: {...} });