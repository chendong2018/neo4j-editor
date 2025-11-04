/**
 * Neo4j编辑器事件管理器模块
 * 负责统一管理应用中的各类事件处理
 */

neo4jEditor.define('eventManager', [], function() {
    /**
     * 事件管理器模块
     * @namespace eventManagerModule
     */
    const module = {
    initialized: false,
    
    /**
     * 事件监听器存储对象
     * @private
     */
    _listeners: {},
    
    /**
     * 初始化事件管理器
     */
    initialize: function() {
        if (this.initialized) {
            console.warn('事件管理器已经初始化');
            return;
        }
        
        try {
            // 初始化监听器存储
            this._listeners = {};
            
            // 设置全局键盘事件
            this.setupGlobalKeyboardEvents();
            
            // 设置窗口事件
            this.setupWindowEvents();
            
            this.initialized = true;
            console.log('Neo4j Editor: 事件管理器初始化完成');
        } catch (error) {
            console.error('Neo4j Editor: 事件管理器初始化失败:', error);
            if (window.utilsModule && window.utilsModule.handleError) {
                window.utilsModule.handleError(error, '事件管理器初始化');
            }
        }
    },
    
    /**
     * 设置全局键盘事件
     * @private
     */
    setupGlobalKeyboardEvents: function() {
        try {
            // 键盘事件处理函数
            const handleKeyDown = function(event) {
                // 防止默认行为和冒泡
                const preventDefault = function() {
                    event.preventDefault();
                    event.stopPropagation();
                    return false;
                };
                
                // 删除键处理
                if (event.key === 'Delete' || event.key === 'Backspace') {
                    // 检查是否在输入框中
                    if (event.target.tagName === 'INPUT' || 
                        event.target.tagName === 'TEXTAREA' || 
                        event.target.isContentEditable) {
                        return true; // 允许默认行为
                    }
                    
                    // 触发删除元素事件
                    eventManagerModule.trigger('element.delete');
                    return preventDefault();
                }
                
                // Ctrl+S 保存
                if ((event.ctrlKey || event.metaKey) && event.key === 's') {
                    eventManagerModule.trigger('graph.save');
                    return preventDefault();
                }
                
                // Ctrl+Z 撤销
                if ((event.ctrlKey || event.metaKey) && event.key === 'z') {
                    eventManagerModule.trigger('graph.undo');
                    return preventDefault();
                }
                
                // Ctrl+Y 重做
                if ((event.ctrlKey || event.metaKey) && event.key === 'y') {
                    eventManagerModule.trigger('graph.redo');
                    return preventDefault();
                }
                
                // Ctrl+C 复制
                if ((event.ctrlKey || event.metaKey) && event.key === 'c') {
                    eventManagerModule.trigger('element.copy');
                    return preventDefault();
                }
                
                // Ctrl+V 粘贴
                if ((event.ctrlKey || event.metaKey) && event.key === 'v') {
                    eventManagerModule.trigger('element.paste');
                    return preventDefault();
                }
            };
            
            // 添加事件监听器
            document.addEventListener('keydown', handleKeyDown, true);
            
            // 存储引用以便后续清理
            this._globalKeydownHandler = handleKeyDown;
        } catch (error) {
            console.error('Neo4j Editor: 设置全局键盘事件失败:', error);
        }
    },
    
    /**
     * 设置窗口事件
     * @private
     */
    setupWindowEvents: function() {
        try {
            // 窗口大小变化
            const handleResize = function() {
                eventManagerModule.trigger('window.resize', {
                    width: window.innerWidth,
                    height: window.innerHeight
                });
            };
            
            // 添加节流处理
            const utils = window.utilsModule || {};
            const debouncedResize = utils.debounce ? 
                utils.debounce(handleResize, 200) : handleResize;
            
            window.addEventListener('resize', debouncedResize);
            
            // 存储引用
            this._windowResizeHandler = debouncedResize;
            
            // 页面卸载前确认
            const handleBeforeUnload = function(event) {
                // 触发确认事件，允许其他模块决定是否显示确认对话框
                let shouldConfirm = true;
                
                eventManagerModule.trigger('window.beforeunload', {
                    preventDefault: function() {
                        shouldConfirm = false;
                    }
                });
                
                if (shouldConfirm) {
                    event.preventDefault();
                    event.returnValue = '您有未保存的更改，确定要离开吗？';
                    return '您有未保存的更改，确定要离开吗？';
                }
            };
            
            window.addEventListener('beforeunload', handleBeforeUnload);
            this._windowBeforeUnloadHandler = handleBeforeUnload;
        } catch (error) {
            console.error('Neo4j Editor: 设置窗口事件失败:', error);
        }
    },
    
    /**
     * 添加事件监听器
     * @param {string} eventName - 事件名称
     * @param {Function} callback - 回调函数
     * @param {Object} context - 可选的回调上下文
     * @returns {Function} 用于移除监听器的函数
     */
    on: function(eventName, callback, context) {
        if (!eventName || typeof callback !== 'function') {
            console.error('Neo4j Editor: 无效的事件监听器参数');
            return null;
        }
        
        // 确保事件名称数组存在
        if (!this._listeners[eventName]) {
            this._listeners[eventName] = [];
        }
        
        // 创建监听器对象
        const listener = {
            callback: context ? callback.bind(context) : callback,
            originalCallback: callback,
            context: context
        };
        
        // 添加监听器
        this._listeners[eventName].push(listener);
        
        // 返回移除函数
        return () => {
            this.off(eventName, callback, context);
        };
    },
    
    /**
     * 移除事件监听器
     * @param {string} eventName - 事件名称
     * @param {Function} callback - 可选的回调函数，不提供则移除该事件的所有监听器
     * @param {Object} context - 可选的回调上下文
     */
    off: function(eventName, callback, context) {
        // 如果事件名称不存在，直接返回
        if (!this._listeners[eventName]) {
            return;
        }
        
        // 如果没有提供回调，移除所有监听器
        if (!callback) {
            this._listeners[eventName] = [];
            return;
        }
        
        // 过滤掉匹配的监听器
        this._listeners[eventName] = this._listeners[eventName].filter(listener => {
            return !(listener.originalCallback === callback && 
                     (context === undefined || listener.context === context));
        });
    },
    
    /**
     * 触发事件
     * @param {string} eventName - 事件名称
     * @param {...*} args - 传递给监听器的参数
     * @returns {boolean} 是否有监听器被触发
     */
    trigger: function(eventName, ...args) {
        const listeners = this._listeners[eventName];
        
        if (!listeners || listeners.length === 0) {
            return false;
        }
        
        // 触发所有监听器
        let triggered = false;
        listeners.forEach(listener => {
            try {
                listener.callback(...args);
                triggered = true;
            } catch (error) {
                console.error(`Neo4j Editor: 事件 ${eventName} 的监听器执行失败:`, error);
                if (window.utilsModule && window.utilsModule.handleError) {
                    window.utilsModule.handleError(error, `事件 ${eventName} 处理`);
                }
            }
        });
        
        return triggered;
    },
    
    /**
     * 只监听一次事件
     * @param {string} eventName - 事件名称
     * @param {Function} callback - 回调函数
     * @param {Object} context - 可选的回调上下文
     */
    once: function(eventName, callback, context) {
        const onceCallback = (...args) => {
            this.off(eventName, onceCallback);
            callback.apply(context || null, args);
        };
        
        this.on(eventName, onceCallback);
    },
    
    /**
     * 清理所有事件监听器
     */
    clear: function() {
        // 移除全局事件监听器
        if (this._globalKeydownHandler) {
            document.removeEventListener('keydown', this._globalKeydownHandler, true);
            this._globalKeydownHandler = null;
        }
        
        if (this._windowResizeHandler) {
            window.removeEventListener('resize', this._windowResizeHandler);
            this._windowResizeHandler = null;
        }
        
        if (this._windowBeforeUnloadHandler) {
            window.removeEventListener('beforeunload', this._windowBeforeUnloadHandler);
            this._windowBeforeUnloadHandler = null;
        }
        
        // 清空自定义事件监听器
        this._listeners = {};
        
        console.log('Neo4j Editor: 事件管理器已清理');
    },
    
    /**
     * 获取事件监听器数量
     * @param {string} eventName - 可选的事件名称，不提供则返回所有事件的监听器总数
     * @returns {number} 监听器数量
     */
    getListenerCount: function(eventName) {
        if (eventName) {
            return this._listeners[eventName] ? this._listeners[eventName].length : 0;
        }
        
        // 计算所有事件的监听器总数
        return Object.values(this._listeners).reduce((total, listeners) => {
            return total + listeners.length;
        }, 0);
    }
};

// 为了向后兼容，暴露到全局
window.eventManagerModule = eventManagerModule;

// 如果支持模块导出，则导出
if (typeof module !== 'undefined' && typeof module.exports !== 'undefined') {
    module.exports = eventManagerModule;
}

/**
 * 为旧版API提供兼容层
 * @deprecated 请使用 eventManagerModule 对象
 */
window.setupKeyboardEvents = function() {
    console.warn('setupKeyboardEvents 已弃用，请使用 eventManagerModule.setupGlobalKeyboardEvents()');
    if (window.eventManagerModule && !window.eventManagerModule.initialized) {
        window.eventManagerModule.initialize();
    };

    console.log('Neo4j Editor: 事件管理器模块已加载');
    return module;
});
