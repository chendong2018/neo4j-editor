/**
 * Event Bus Module
 * 
 * 提供基于发布-订阅模式的事件系统，作为应用程序各模块间通信的核心机制
 */
neo4jEditor.define('eventBus', [], function() {
    const module = {
        name: 'eventBus',
        version: '1.0.0',
        events: {},
        listeners: new Map(),
        listenersCounter: 0,
        logLevel: 'info' // 'debug', 'info', 'warn', 'error', 'none'
    };

    /**
     * 初始化事件总线
     */
    module.initialize = function() {
        console.log('Event Bus initialized');
        this.setupSystemEvents();
    };

    /**
     * 设置系统事件
     */
    module.setupSystemEvents = function() {
        // 预定义系统核心事件
        this.registerEvent('app:initialize');
        this.registerEvent('app:ready');
        this.registerEvent('app:shutdown');
        this.registerEvent('app:error');
        
        // 连接事件
        this.registerEvent('connection:attempt');
        this.registerEvent('connection:success');
        this.registerEvent('connection:error');
        this.registerEvent('connection:disconnect');
        this.registerEvent('connection:disconnected');
        this.registerEvent('connection:config:loaded');
        
        // 数据事件
        this.registerEvent('data:node:create');
        this.registerEvent('data:node:created');
        this.registerEvent('data:node:update');
        this.registerEvent('data:node:updated');
        this.registerEvent('data:node:delete');
        this.registerEvent('data:node:deleted');
        this.registerEvent('data:relationship:create');
        this.registerEvent('data:relationship:created');
        this.registerEvent('data:relationship:update');
        this.registerEvent('data:relationship:updated');
        this.registerEvent('data:relationship:delete');
        this.registerEvent('data:relationship:deleted');
        this.registerEvent('data:nodes:add');
        this.registerEvent('data:nodes:remove');
        this.registerEvent('data:edges:add');
        this.registerEvent('data:edges:remove');
        this.registerEvent('data:graph:loaded');
        this.registerEvent('data:cleared');
        this.registerEvent('data:error');
        this.registerEvent('data:import');
        this.registerEvent('data:imported');
        this.registerEvent('data:export');
        this.registerEvent('data:export:request');
        this.registerEvent('data:exported');
        this.registerEvent('data:operation:started');
        this.registerEvent('data:operation:completed');
        this.registerEvent('data:types:loaded');
        this.registerEvent('data:types:updated');
        this.registerEvent('data:node:type:added');
        this.registerEvent('data:node:type:updated');
        this.registerEvent('data:node:type:deleted');
        
        // 查询事件
        this.registerEvent('query:execute');
        this.registerEvent('query:result');
        
        // 图表事件
        this.registerEvent('graph:element:select');
        this.registerEvent('graph:element:selected');
        this.registerEvent('graph:element:unselected');
        this.registerEvent('graph:node:doubleclick');
        this.registerEvent('graph:contextmenu:node');
        this.registerEvent('graph:contextmenu:edge');
        this.registerEvent('graph:contextmenu:background');
        
        // 视图事件
        this.registerEvent('view:mode:change');
        this.registerEvent('view:mode:changed');
        
        // 配置事件
        this.registerEvent('config:changed');
        this.registerEvent('config:reset');
        
        // 用户事件
        this.registerEvent('user:login');
        this.registerEvent('user:logout');
        this.registerEvent('user:session:expired');
        this.registerEvent('user:preferences:updated');
        
        // UI事件
        this.registerEvent('ui:modal:open');
        this.registerEvent('ui:modal:close');
        this.registerEvent('ui:notification:show');
        this.registerEvent('ui:notification:hide');
        this.registerEvent('ui:sidebar:toggle');
        this.registerEvent('ui:toolbar:update');
    };

    /**
     * 注册事件
     * @param {string} eventName - 事件名称
     */
    module.registerEvent = function(eventName) {
        if (!this.events[eventName]) {
            this.events[eventName] = [];
            this.log('debug', `Event registered: ${eventName}`);
        }
    };

    /**
     * 订阅事件
     * @param {string} eventName - 事件名称
     * @param {Function} callback - 回调函数
     * @param {Object} options - 选项
     * @returns {string} 监听器ID
     */
    module.on = function(eventName, callback, options = {}) {
        if (typeof callback !== 'function') {
            this.log('error', `Callback for event ${eventName} must be a function`);
            return null;
        }

        // 如果事件未注册，自动注册
        if (!this.events[eventName]) {
            this.registerEvent(eventName);
            this.log('warn', `Auto-registered unlisted event: ${eventName}`);
        }

        // 生成监听器ID
        const listenerId = `listener_${Date.now()}_${this.listenersCounter++}`;
        
        // 存储监听器信息
        const listenerInfo = {
            id: listenerId,
            eventName,
            callback,
            once: options.once || false,
            priority: options.priority || 0,
            context: options.context || null
        };

        // 添加到事件列表
        this.events[eventName].push(listenerInfo);
        this.listeners.set(listenerId, listenerInfo);

        // 按优先级排序
        this.events[eventName].sort((a, b) => b.priority - a.priority);

        this.log('debug', `Listener registered for event ${eventName}: ${listenerId}`);
        return listenerId;
    };

    /**
     * 订阅一次性事件
     * @param {string} eventName - 事件名称
     * @param {Function} callback - 回调函数
     * @param {Object} options - 选项
     * @returns {string} 监听器ID
     */
    module.once = function(eventName, callback, options = {}) {
        return this.on(eventName, callback, { ...options, once: true });
    };

    /**
     * 取消订阅事件
     * @param {string} listenerId - 监听器ID
     * @returns {boolean} 是否成功取消订阅
     */
    module.off = function(listenerId) {
        const listener = this.listeners.get(listenerId);
        
        if (!listener) {
            this.log('warn', `Listener not found: ${listenerId}`);
            return false;
        }

        // 从事件列表中移除
        const eventName = listener.eventName;
        if (this.events[eventName]) {
            this.events[eventName] = this.events[eventName].filter(l => l.id !== listenerId);
        }

        // 从监听器映射中移除
        this.listeners.delete(listenerId);

        this.log('debug', `Listener removed: ${listenerId} (event: ${eventName})`);
        return true;
    };

    /**
     * 取消所有订阅
     * @param {string} [eventName] - 可选的事件名称，如果提供则只取消该事件的所有订阅
     */
    module.offAll = function(eventName) {
        if (eventName) {
            // 取消特定事件的所有订阅
            if (this.events[eventName]) {
                this.events[eventName].forEach(listener => {
                    this.listeners.delete(listener.id);
                });
                this.events[eventName] = [];
                this.log('debug', `All listeners removed for event: ${eventName}`);
            }
        } else {
            // 取消所有事件的所有订阅
            this.events = {};
            this.listeners.clear();
            this.log('debug', 'All listeners removed');
            this.setupSystemEvents(); // 重新设置系统事件
        }
    };

    /**
     * 触发事件
     * @param {string} eventName - 事件名称
     * @param {any} data - 要传递给监听器的数据
     * @returns {boolean} 是否有监听器处理了事件
     */
    module.emit = function(eventName, data) {
        const listeners = this.events[eventName] || [];
        let hasListeners = listeners.length > 0;

        if (!hasListeners) {
            this.log('debug', `No listeners for event: ${eventName}`);
            return false;
        }

        this.log('debug', `Emitting event: ${eventName} with ${listeners.length} listeners`);

        // 需要移除的一次性监听器ID
        const onceListenersToRemove = [];

        // 调用所有监听器
        for (const listener of listeners) {
            try {
                const context = listener.context || null;
                listener.callback.call(context, data);

                // 标记一次性监听器以便后续移除
                if (listener.once) {
                    onceListenersToRemove.push(listener.id);
                }
            } catch (error) {
                this.log('error', `Error in listener for event ${eventName}:`, error);
                // 继续执行其他监听器
            }
        }

        // 移除一次性监听器
        onceListenersToRemove.forEach(listenerId => {
            this.off(listenerId);
        });

        return true;
    };

    /**
     * 获取事件监听器数量
     * @param {string} [eventName] - 可选的事件名称
     * @returns {number} 监听器数量
     */
    module.getListenerCount = function(eventName) {
        if (eventName) {
            return (this.events[eventName] || []).length;
        }
        return this.listeners.size;
    };

    /**
     * 获取所有已注册的事件名称
     * @returns {string[]} 事件名称数组
     */
    module.getRegisteredEvents = function() {
        return Object.keys(this.events);
    };

    /**
     * 设置日志级别
     * @param {string} level - 日志级别
     */
    module.setLogLevel = function(level) {
        const validLevels = ['debug', 'info', 'warn', 'error', 'none'];
        if (validLevels.includes(level)) {
            this.logLevel = level;
            this.log('info', `Event bus log level set to: ${level}`);
        } else {
            this.log('error', `Invalid log level: ${level}. Valid levels: ${validLevels.join(', ')}`);
        }
    };

    /**
     * 日志函数
     * @param {string} level - 日志级别
     * @param  {...any} args - 日志参数
     */
    module.log = function(level, ...args) {
        const levelPriority = {
            'debug': 0,
            'info': 1,
            'warn': 2,
            'error': 3,
            'none': 4
        };

        if (levelPriority[level] >= levelPriority[this.logLevel]) {
            const timestamp = new Date().toISOString();
            const prefix = `[EventBus] [${level.toUpperCase()}] [${timestamp}]`;
            
            switch (level) {
                case 'debug':
                    if (console.debug) console.debug(prefix, ...args);
                    break;
                case 'info':
                    console.info(prefix, ...args);
                    break;
                case 'warn':
                    console.warn(prefix, ...args);
                    break;
                case 'error':
                    console.error(prefix, ...args);
                    break;
            }
        }
    };

    /**
     * 创建命名空间事件
     * @param {string} namespace - 命名空间
     * @returns {Object} 命名空间事件API
     */
    module.namespace = function(namespace) {
        const nsPrefix = `${namespace}:`;
        
        return {
            on: (event, callback, options) => module.on(nsPrefix + event, callback, options),
            once: (event, callback, options) => module.once(nsPrefix + event, callback, options),
            off: (listenerId) => module.off(listenerId),
            emit: (event, data) => module.emit(nsPrefix + event, data),
            getListenerCount: (event) => module.getListenerCount(nsPrefix + event)
        };
    };

    /**
     * 事件节流
     * @param {string} eventName - 事件名称
     * @param {number} delay - 延迟时间（毫秒）
     * @returns {Object} 节流事件API
     */
    module.throttle = function(eventName, delay) {
        let lastEmit = 0;
        let timeoutId = null;

        const throttledEmit = (data) => {
            const now = Date.now();
            const remaining = delay - (now - lastEmit);

            if (remaining <= 0) {
                if (timeoutId) {
                    clearTimeout(timeoutId);
                    timeoutId = null;
                }
                lastEmit = now;
                module.emit(eventName, data);
            } else if (!timeoutId) {
                timeoutId = setTimeout(() => {
                    lastEmit = Date.now();
                    timeoutId = null;
                    module.emit(eventName, data);
                }, remaining);
            }
        };

        return {
            emit: throttledEmit,
            clear: () => {
                if (timeoutId) {
                    clearTimeout(timeoutId);
                    timeoutId = null;
                }
            }
        };
    };

    /**
     * 事件防抖
     * @param {string} eventName - 事件名称
     * @param {number} delay - 延迟时间（毫秒）
     * @returns {Object} 防抖事件API
     */
    module.debounce = function(eventName, delay) {
        let timeoutId = null;

        const debouncedEmit = (data) => {
            if (timeoutId) {
                clearTimeout(timeoutId);
            }
            timeoutId = setTimeout(() => {
                module.emit(eventName, data);
                timeoutId = null;
            }, delay);
        };

        return {
            emit: debouncedEmit,
            clear: () => {
                if (timeoutId) {
                    clearTimeout(timeoutId);
                    timeoutId = null;
                }
            },
            flush: (data) => {
                if (timeoutId) {
                    clearTimeout(timeoutId);
                    timeoutId = null;
                }
                module.emit(eventName, data);
            }
        };
    };

    /**
     * 监听多个事件
     * @param {string[]} eventNames - 事件名称数组
     * @param {Function} callback - 回调函数
     * @param {Object} options - 选项
     * @returns {string[]} 监听器ID数组
     */
    module.onMultiple = function(eventNames, callback, options = {}) {
        if (!Array.isArray(eventNames)) {
            this.log('error', 'eventNames must be an array');
            return [];
        }

        const listenerIds = [];
        eventNames.forEach(eventName => {
            const id = this.on(eventName, callback, options);
            if (id) listenerIds.push(id);
        });

        return listenerIds;
    };

    /**
     * 取消多个监听器
     * @param {string[]} listenerIds - 监听器ID数组
     */
    module.offMultiple = function(listenerIds) {
        if (!Array.isArray(listenerIds)) {
            this.log('error', 'listenerIds must be an array');
            return;
        }

        listenerIds.forEach(id => this.off(id));
    };

    /**
     * 获取事件总线状态
     * @returns {Object} 状态信息
     */
    module.getStatus = function() {
        const eventStats = {};
        Object.keys(this.events).forEach(eventName => {
            eventStats[eventName] = this.events[eventName].length;
        });

        return {
            registeredEvents: Object.keys(this.events).length,
            totalListeners: this.listeners.size,
            eventStats,
            logLevel: this.logLevel
        };
    };

    return module;
});

// 为了向后兼容性，将eventBus也赋值给eventManager
neo4jEditor.eventManager = neo4jEditor.eventBus;