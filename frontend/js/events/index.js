/**
 * 事件管理模块索引文件
 * 兼容AMD规范和ES模块，确保使用统一的事件总线单例
 */

// AMD模块定义
define([
    './eventManager.js',
    './eventSimulator.js',
    '../common/eventBus.js'
], function(EventManager, EventSimulator, EventBusModule) {
    // 确保使用事件总线的单例实例
    // 优先使用已经创建的全局实例，然后使用工厂方法
    const eventBusInstance = window.eventBus || 
                           (EventBusModule.getInstance ? 
                             EventBusModule.getInstance() : 
                             new EventBusModule());
    
    // 返回模块导出
    return {
        // 事件管理器类
        EventManager: EventManager,
        
        // 事件模拟器
        EventSimulator: EventSimulator,
        
        // 事件总线单例实例
        EventBus: eventBusInstance
    };
});

// 对于直接使用全局变量的代码，提供向后兼容
if (typeof window !== 'undefined') {
    // 确保window.eventBus存在并指向单例
    if (!window.eventBus && window.EventBus && window.EventBus.getInstance) {
        window.eventBus = window.EventBus.getInstance();
    }
}
