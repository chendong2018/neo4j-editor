/**
 * 应用程序管理器模块
 * 作为整个应用的主协调器，负责初始化所有其他模块和管理应用程序生命周期
 */
neo4jEditor.define('applicationManager', ['eventBus', 'configManager', 'userManager', 'dataManager', 'graphManager', 'dataStorageManager'], 
function(eventBus, configManager, userManager, dataManager, graphManager, dataStorageManager) {
    'use strict';
    
    // 应用程序状态
    const APP_STATE = {
        INITIALIZING: 'initializing',
        READY: 'ready',
        RUNNING: 'running',
        PAUSED: 'paused',
        ERROR: 'error',
        SHUTTING_DOWN: 'shuttingDown'
    };
    
    // 模块状态
    const MODULE_STATUS = {
        NOT_INITIALIZED: 'notInitialized',
        INITIALIZING: 'initializing',
        INITIALIZED: 'initialized',
        ERROR: 'error'
    };
    
    // 应用程序状态
    let appState = APP_STATE.INITIALIZING;
    
    // 模块注册表
    let modules = {};
    
    // 初始化选项
    let initOptions = {};
    
    // 初始化序列
    const INIT_SEQUENCE = [
        'configManager',
        'userManager',
        'dataStorageManager',
        'dataManager',
        'graphManager'
    ];
    
    // UI 模块初始化序列
    const UI_MODULES = [
        'styleEditor',
        'keyboardShortcuts',
        'searchPanel',
        'dataExporter',
        'dataImporter',
        'layoutManager'
    ];
    
    /**
     * 初始化应用程序
     */
    function initialize(options = {}) {
        try {
            console.log('Application Manager: Initializing...');
            
            // 保存初始化选项
            initOptions = { ...options };
            
            // 注册核心模块
            registerCoreModules();
            
            // 开始初始化序列
            return startInitSequence()
                .then(() => {
                    // 初始化完成后设置应用状态
                    appState = APP_STATE.READY;
                    console.log('Application Manager: Initialized successfully');
                    
                    // 触发应用初始化完成事件
                    if (eventBus && typeof eventBus.emit === 'function') {
                        eventBus.emit('app:initialized');
                    }
                    
                    return true;
                })
                .catch(error => {
                    console.error('Application Manager: Initialization failed:', error);
                    appState = APP_STATE.ERROR;
                    
                    // 触发初始化错误事件
                    if (eventBus && typeof eventBus.emit === 'function') {
                        eventBus.emit('app:initializationError', { error });
                    }
                    
                    return false;
                });
        } catch (error) {
            console.error('Application Manager: Error during initialization:', error);
            appState = APP_STATE.ERROR;
            return Promise.resolve(false);
        }
    }
    
    /**
     * 注册核心模块
     */
    function registerCoreModules() {
        try {
            // 注册核心模块到模块注册表
            modules = {
                configManager: {
                    instance: configManager,
                    status: MODULE_STATUS.NOT_INITIALIZED
                },
                userManager: {
                    instance: userManager,
                    status: MODULE_STATUS.NOT_INITIALIZED
                },
                dataManager: {
                    instance: dataManager,
                    status: MODULE_STATUS.NOT_INITIALIZED
                },
                graphManager: {
                    instance: graphManager,
                    status: MODULE_STATUS.NOT_INITIALIZED
                },
                dataStorageManager: {
                    instance: dataStorageManager,
                    status: MODULE_STATUS.NOT_INITIALIZED
                }
            };
            
            console.log('Application Manager: Core modules registered');
        } catch (error) {
            console.error('Application Manager: Error registering core modules:', error);
        }
    }
    
    /**
     * 开始初始化序列
     */
    function startInitSequence() {
        // 使用 Promise 链按顺序初始化模块
        let promise = Promise.resolve();
        
        INIT_SEQUENCE.forEach(moduleName => {
            promise = promise.then(() => {
                return initializeModule(moduleName);
            });
        });
        
        return promise;
    }
    
    /**
     * 初始化单个模块
     */
    function initializeModule(moduleName) {
        return new Promise((resolve, reject) => {
            try {
                const moduleEntry = modules[moduleName];
                
                if (!moduleEntry) {
                    console.warn(`Application Manager: Module ${moduleName} not registered`);
                    resolve(false);
                    return;
                }
                
                const moduleInstance = moduleEntry.instance;
                
                if (!moduleInstance || typeof moduleInstance.initialize !== 'function') {
                    console.warn(`Application Manager: Module ${moduleName} does not have initialize method`);
                    moduleEntry.status = MODULE_STATUS.ERROR;
                    resolve(false);
                    return;
                }
                
                // 更新模块状态为初始化中
                moduleEntry.status = MODULE_STATUS.INITIALIZING;
                console.log(`Application Manager: Initializing module ${moduleName}...`);
                
                // 调用模块的初始化方法
                const result = moduleInstance.initialize(getModuleInitOptions(moduleName));
                
                // 处理同步初始化结果
                if (typeof result === 'boolean') {
                    if (result) {
                        moduleEntry.status = MODULE_STATUS.INITIALIZED;
                        console.log(`Application Manager: Module ${moduleName} initialized successfully`);
                        resolve(true);
                    } else {
                        moduleEntry.status = MODULE_STATUS.ERROR;
                        console.error(`Application Manager: Module ${moduleName} initialization failed`);
                        resolve(false); // 继续初始化其他模块，但记录失败
                    }
                } 
                // 处理异步初始化结果
                else if (result && typeof result.then === 'function') {
                    result.then(success => {
                        if (success) {
                            moduleEntry.status = MODULE_STATUS.INITIALIZED;
                            console.log(`Application Manager: Module ${moduleName} initialized successfully`);
                            resolve(true);
                        } else {
                            moduleEntry.status = MODULE_STATUS.ERROR;
                            console.error(`Application Manager: Module ${moduleName} initialization failed`);
                            resolve(false);
                        }
                    }).catch(error => {
                        moduleEntry.status = MODULE_STATUS.ERROR;
                        console.error(`Application Manager: Error initializing module ${moduleName}:`, error);
                        resolve(false);
                    });
                } else {
                    // 未知的初始化结果类型
                    moduleEntry.status = MODULE_STATUS.INITIALIZED;
                    console.log(`Application Manager: Module ${moduleName} initialized (unknown result)`);
                    resolve(true);
                }
            } catch (error) {
                console.error(`Application Manager: Exception initializing module ${moduleName}:`, error);
                resolve(false);
            }
        });
    }
    
    /**
     * 获取模块初始化选项
     */
    function getModuleInitOptions(moduleName) {
        // 返回针对特定模块的初始化选项
        const moduleOptions = initOptions[moduleName] || {};
        
        // 添加全局选项
        return {
            appVersion: initOptions.version || '1.0.0',
            debug: initOptions.debug || false,
            ...moduleOptions
        };
    }
    
    /**
     * 启动应用程序
     */
    function start() {
        try {
            if (appState !== APP_STATE.READY) {
                throw new Error(`Cannot start application in ${appState} state`);
            }
            
            console.log('Application Manager: Starting application...');
            
            // 初始化 UI 模块
            initializeUIModules();
            
            // 更新应用状态为运行中
            appState = APP_STATE.RUNNING;
            
            // 注册全局事件监听器
            registerGlobalEventListeners();
            
            console.log('Application Manager: Application started');
            
            // 触发应用启动事件
            if (eventBus && typeof eventBus.emit === 'function') {
                eventBus.emit('app:started');
            }
            
            return true;
        } catch (error) {
            console.error('Application Manager: Error starting application:', error);
            appState = APP_STATE.ERROR;
            
            // 触发应用启动错误事件
            if (eventBus && typeof eventBus.emit === 'function') {
                eventBus.emit('app:startError', { error });
            }
            
            return false;
        }
    }
    
    /**
     * 初始化 UI 模块
     */
    function initializeUIModules() {
        try {
            console.log('Application Manager: Initializing UI modules...');
            
            UI_MODULES.forEach(moduleName => {
                try {
                    const moduleInstance = neo4jEditor.getModule(moduleName);
                    
                    if (moduleInstance && typeof moduleInstance.initialize === 'function') {
                        console.log(`Application Manager: Initializing UI module ${moduleName}...`);
                        moduleInstance.initialize({
                            appVersion: initOptions.version || '1.0.0',
                            debug: initOptions.debug || false
                        });
                    } else {
                        console.warn(`Application Manager: UI module ${moduleName} not available or does not have initialize method`);
                    }
                } catch (error) {
                    console.error(`Application Manager: Error initializing UI module ${moduleName}:`, error);
                }
            });
            
            console.log('Application Manager: UI modules initialization completed');
        } catch (error) {
            console.error('Application Manager: Error during UI modules initialization:', error);
        }
    }
    
    /**
     * 注册全局事件监听器
     */
    function registerGlobalEventListeners() {
        try {
            if (eventBus && typeof eventBus.on === 'function') {
                // 注册应用程序级别的事件监听器
                eventBus.on('app:pause', handleApplicationPause);
                eventBus.on('app:resume', handleApplicationResume);
                eventBus.on('app:shutdown', handleApplicationShutdown);
                eventBus.on('app:error', handleApplicationError);
                eventBus.on('app:reload', handleApplicationReload);
                
                // 注册窗口事件
                window.addEventListener('beforeunload', handleBeforeUnload);
                window.addEventListener('error', handleWindowError);
                window.addEventListener('unhandledrejection', handleUnhandledRejection);
                
                console.log('Application Manager: Global event listeners registered');
            }
        } catch (error) {
            console.error('Application Manager: Error registering global event listeners:', error);
        }
    }
    
    /**
     * 处理应用程序暂停
     */
    function handleApplicationPause() {
        if (appState === APP_STATE.RUNNING) {
            appState = APP_STATE.PAUSED;
            console.log('Application Manager: Application paused');
            
            if (eventBus && typeof eventBus.emit === 'function') {
                eventBus.emit('app:paused');
            }
        }
    }
    
    /**
     * 处理应用程序恢复
     */
    function handleApplicationResume() {
        if (appState === APP_STATE.PAUSED) {
            appState = APP_STATE.RUNNING;
            console.log('Application Manager: Application resumed');
            
            if (eventBus && typeof eventBus.emit === 'function') {
                eventBus.emit('app:resumed');
            }
        }
    }
    
    /**
     * 处理应用程序关闭
     */
    function handleApplicationShutdown() {
        shutdown();
    }
    
    /**
     * 处理应用程序错误
     */
    function handleApplicationError(event, data) {
        const { error } = data;
        console.error('Application Manager: Application error:', error);
        
        // 可以在这里实现错误报告、日志记录等
        if (eventBus && typeof eventBus.emit === 'function') {
                eventBus.emit('app:errorReported', { error });
            }
    }
    
    /**
     * 处理应用程序重载
     */
    function handleApplicationReload() {
        reload();
    }
    
    /**
     * 处理窗口关闭前事件
     */
    function handleBeforeUnload(event) {
        // 检查是否有未保存的更改
        if (hasUnsavedChanges()) {
            // 显示确认对话框
            event.preventDefault();
            event.returnValue = '';
            return '';
        }
    }
    
    /**
     * 处理窗口错误
     */
    function handleWindowError(error) {
        console.error('Application Manager: Uncaught window error:', error);
        
        if (eventBus && typeof eventBus.emit === 'function') {
            eventBus.emit('app:unhandledError', { error });
        }
    }
    
    /**
     * 处理未处理的 Promise 拒绝
     */
    function handleUnhandledRejection(event) {
        console.error('Application Manager: Unhandled promise rejection:', event.reason);
        
        if (eventBus && typeof eventBus.emit === 'function') {
            eventBus.emit('app:unhandledPromiseRejection', { reason: event.reason });
        }
    }
    
    /**
     * 暂停应用程序
     */
    function pause() {
        try {
            if (appState === APP_STATE.RUNNING) {
                // 通知所有模块应用程序即将暂停
                notifyModules('pause');
                
                // 更新状态
                appState = APP_STATE.PAUSED;
                console.log('Application Manager: Application paused');
                
                if (eventBus && typeof eventBus.emit === 'function') {
                    eventBus.emit('app:paused');
                }
                
                return true;
            }
        } catch (error) {
            console.error('Application Manager: Error pausing application:', error);
        }
        return false;
    }
    
    /**
     * 恢复应用程序
     */
    function resume() {
        try {
            if (appState === APP_STATE.PAUSED) {
                // 通知所有模块应用程序即将恢复
                notifyModules('resume');
                
                // 更新状态
                appState = APP_STATE.RUNNING;
                console.log('Application Manager: Application resumed');
                
                if (eventBus && typeof eventBus.emit === 'function') {
                    eventBus.emit('app:resumed');
                }
                
                return true;
            }
        } catch (error) {
            console.error('Application Manager: Error resuming application:', error);
        }
        return false;
    }
    
    /**
     * 关闭应用程序
     */
    function shutdown() {
        try {
            if (appState === APP_STATE.SHUTTING_DOWN || appState === APP_STATE.INITIALIZING) {
                return false;
            }
            
            console.log('Application Manager: Shutting down application...');
            appState = APP_STATE.SHUTTING_DOWN;
            
            // 通知所有模块应用程序即将关闭
            notifyModules('shutdown');
            
            // 移除全局事件监听器
            removeGlobalEventListeners();
            
            // 清除所有模块
            clearModules();
            
            console.log('Application Manager: Application shutdown completed');
            
            if (eventManager && typeof eventManager.trigger === 'function') {
                eventBus.emit('app:shutdownComplete');
            }
            
            return true;
        } catch (error) {
            console.error('Application Manager: Error during shutdown:', error);
            return false;
        }
    }
    
    /**
     * 重新加载应用程序
     */
    function reload() {
        try {
            console.log('Application Manager: Reloading application...');
            
            // 先关闭应用程序
            shutdown();
            
            // 然后重新初始化
            return initialize(initOptions)
                .then(success => {
                    if (success) {
                        return start();
                    }
                    return false;
                });
        } catch (error) {
            console.error('Application Manager: Error reloading application:', error);
            return Promise.resolve(false);
        }
    }
    
    /**
     * 通知所有模块
     */
    function notifyModules(eventName) {
        try {
            Object.keys(modules).forEach(moduleName => {
                const moduleEntry = modules[moduleName];
                if (moduleEntry.status === MODULE_STATUS.INITIALIZED) {
                    const moduleInstance = moduleEntry.instance;
                    
                    if (moduleInstance && typeof moduleInstance[eventName] === 'function') {
                        try {
                            moduleInstance[eventName]();
                        } catch (error) {
                            console.error(`Application Manager: Error notifying module ${moduleName} of ${eventName}:`, error);
                        }
                    }
                }
            });
        } catch (error) {
            console.error('Application Manager: Error notifying modules:', error);
        }
    }
    
    /**
     * 移除全局事件监听器
     */
    function removeGlobalEventListeners() {
        try {
            if (eventBus && typeof eventBus.off === 'function') {
                eventBus.off('app:pause', handleApplicationPause);
                eventBus.off('app:resume', handleApplicationResume);
                eventBus.off('app:shutdown', handleApplicationShutdown);
                eventBus.off('app:error', handleApplicationError);
                eventBus.off('app:reload', handleApplicationReload);
            }
            
            window.removeEventListener('beforeunload', handleBeforeUnload);
            window.removeEventListener('error', handleWindowError);
            window.removeEventListener('unhandledrejection', handleUnhandledRejection);
            
            console.log('Application Manager: Global event listeners removed');
        } catch (error) {
            console.error('Application Manager: Error removing global event listeners:', error);
        }
    }
    
    /**
     * 清除所有模块
     */
    function clearModules() {
        try {
            modules = {};
            console.log('Application Manager: Modules cleared');
        } catch (error) {
            console.error('Application Manager: Error clearing modules:', error);
        }
    }
    
    /**
     * 检查是否有未保存的更改
     */
    function hasUnsavedChanges() {
        // 实现检查未保存更改的逻辑
        // 这里可以调用各个模块的检查方法
        return false; // 默认返回 false，在真实实现中应该返回实际状态
    }
    
    /**
     * 获取应用程序状态
     */
    function getAppState() {
        return appState;
    }
    
    /**
     * 获取模块状态
     */
    function getModuleStatus(moduleName) {
        const moduleEntry = modules[moduleName];
        return moduleEntry ? moduleEntry.status : null;
    }
    
    /**
     * 获取所有模块状态
     */
    function getAllModuleStatuses() {
        const statuses = {};
        
        Object.keys(modules).forEach(moduleName => {
            statuses[moduleName] = modules[moduleName].status;
        });
        
        return statuses;
    }
    
    /**
     * 检查所有核心模块是否已初始化
     */
    function areAllCoreModulesInitialized() {
        return INIT_SEQUENCE.every(moduleName => {
            const moduleEntry = modules[moduleName];
            return moduleEntry && moduleEntry.status === MODULE_STATUS.INITIALIZED;
        });
    }
    
    /**
     * 注册新模块
     */
    function registerModule(moduleName, moduleInstance) {
        try {
            modules[moduleName] = {
                instance: moduleInstance,
                status: MODULE_STATUS.NOT_INITIALIZED
            };
            
            console.log(`Application Manager: Module ${moduleName} registered`);
            
            return true;
        } catch (error) {
            console.error(`Application Manager: Error registering module ${moduleName}:`, error);
            return false;
        }
    }
    
    /**
     * 获取已注册的模块
     */
    function getModule(moduleName) {
        const moduleEntry = modules[moduleName];
        return moduleEntry ? moduleEntry.instance : null;
    }
    
    /**
     * 导出公共API
     */
    return {
        initialize,
        start,
        pause,
        resume,
        shutdown,
        reload,
        getAppState,
        getModuleStatus,
        getAllModuleStatuses,
        areAllCoreModulesInitialized,
        registerModule,
        getModule,
        hasUnsavedChanges
    };
});