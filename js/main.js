/**
 * Neo4j Editor 主应用入口文件
 * 整合所有模块并启动应用程序
 */

// 创建应用程序命名空间
window.neo4jEditor = window.neo4jEditor || {};

// 模块系统
(function(app) {
    'use strict';
    
    // 模块注册表
    const modules = {};
    
    // 模块依赖缓存
    const moduleCache = {};
    
    /**
     * 模块定义函数
     * @param {string} moduleName - 模块名称
     * @param {Array} dependencies - 模块依赖列表
     * @param {Function} factory - 模块工厂函数
     */
    app.define = function(moduleName, dependencies, factory) {
        if (typeof moduleName !== 'string') {
            console.error('Module name must be a string');
            return;
        }
        
        // 如果已存在同名模块，发出警告
        if (modules[moduleName]) {
            console.warn(`Module ${moduleName} is already defined and will be overwritten`);
        }
        
        // 存储模块定义
        modules[moduleName] = {
            dependencies: dependencies || [],
            factory: factory,
            instance: null
        };
        
        console.log(`Module ${moduleName} defined with dependencies:`, dependencies);
    };
    
    /**
     * 获取模块实例
     * @param {string} moduleName - 模块名称
     * @returns {*} 模块实例
     */
    app.getModule = function(moduleName) {
        // 如果模块已加载到缓存中，直接返回
        if (moduleCache[moduleName]) {
            return moduleCache[moduleName];
        }
        
        // 获取模块定义
        const module = modules[moduleName];
        if (!module) {
            console.error(`Module ${moduleName} not found`);
            return null;
        }
        
        // 递归获取所有依赖
        const dependencyInstances = [];
        for (const depName of module.dependencies) {
            const depInstance = app.getModule(depName);
            dependencyInstances.push(depInstance);
        }
        
        // 调用工厂函数创建模块实例
        try {
            const instance = module.factory.apply(null, dependencyInstances);
            
            // 缓存并返回实例
            moduleCache[moduleName] = instance;
            module.instance = instance;
            
            console.log(`Module ${moduleName} instantiated`);
            return instance;
        } catch (error) {
            console.error(`Error instantiating module ${moduleName}:`, error);
            return null;
        }
    };
    
    /**
     * 初始化所有已定义的模块
     */
    app.initializeAllModules = function() {
        Object.keys(modules).forEach(moduleName => {
            if (!moduleCache[moduleName]) {
                app.getModule(moduleName);
            }
        });
    };
    
    /**
     * 获取所有已定义的模块名称
     * @returns {Array} 模块名称数组
     */
    app.getDefinedModules = function() {
        return Object.keys(modules);
    };
    
    /**
     * 获取所有已加载的模块名称
     * @returns {Array} 已加载模块名称数组
     */
    app.getLoadedModules = function() {
        return Object.keys(moduleCache);
    };
})(neo4jEditor);

// 全局工具函数
(function(app) {
    'use strict';
    
    /**
     * 工具函数命名空间
     */
    app.utils = {
        /**
         * 深拷贝对象
         */
        deepClone: function(obj) {
            if (obj === null || typeof obj !== 'object') {
                return obj;
            }
            
            if (obj instanceof Date) {
                return new Date(obj.getTime());
            }
            
            if (obj instanceof Array) {
                return obj.map(item => app.utils.deepClone(item));
            }
            
            const clonedObj = {};
            for (const key in obj) {
                if (obj.hasOwnProperty(key)) {
                    clonedObj[key] = app.utils.deepClone(obj[key]);
                }
            }
            
            return clonedObj;
        },
        
        /**
         * 防抖函数
         */
        debounce: function(func, wait) {
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
         */
        throttle: function(func, limit) {
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
         */
        generateId: function() {
            return 'id_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
        },
        
        /**
         * 验证邮箱
         */
        validateEmail: function(email) {
            const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            return re.test(email);
        },
        
        /**
         * 格式化日期
         */
        formatDate: function(date) {
            if (!(date instanceof Date)) {
                date = new Date(date);
            }
            
            return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
        },
        
        /**
         * 显示通知
         */
        notify: function(message, type = 'info', duration = 3000) {
            // 简单的通知实现
            console[type === 'error' ? 'error' : type === 'warn' ? 'warn' : 'log'](`[Notification] ${message}`);
            
            // 在实际应用中，这里可以实现更复杂的通知系统
        },
        
        /**
         * 检查浏览器支持
         */
        checkBrowserSupport: function() {
            const supports = {
                localStorage: typeof localStorage !== 'undefined',
                sessionStorage: typeof sessionStorage !== 'undefined',
                fetch: typeof fetch !== 'undefined',
                promise: typeof Promise !== 'undefined',
                es6: typeof Symbol !== 'undefined',
                canvas: typeof document !== 'undefined' && typeof document.createElement('canvas').getContext === 'function'
            };
            
            return supports;
        },
        
        /**
         * 安全地解析JSON
         */
        safeJsonParse: function(jsonString, defaultValue = null) {
            try {
                return JSON.parse(jsonString);
            } catch (error) {
                console.error('Error parsing JSON:', error);
                return defaultValue;
            }
        },
        
        /**
         * 截断文本
         */
        truncateText: function(text, maxLength, suffix = '...') {
            if (typeof text !== 'string' || text.length <= maxLength) {
                return text;
            }
            return text.substring(0, maxLength - suffix.length) + suffix;
        }
    };
})(neo4jEditor);

// 等待DOM加载完成
document.addEventListener('DOMContentLoaded', function() {
    'use strict';
    
    console.log('Neo4j Editor: DOM loaded, initializing application...');
    
    // 简化的浏览器支持检查
    const checkBrowserSupport = function() {
        return {
            promise: typeof Promise !== 'undefined',
            es6: typeof Symbol !== 'undefined' && typeof Array.from !== 'undefined'
        };
    };
    
    const browserSupport = checkBrowserSupport();
    console.log('Browser support:', browserSupport);
    
    // 如果不支持必要的功能，显示错误信息
    if (!browserSupport.promise || !browserSupport.es6) {
        const appContainer = document.getElementById('app-container');
        if (appContainer) {
            appContainer.innerHTML = `
                <div class="browser-error">
                    <h2>Browser Not Supported</h2>
                    <p>Your browser does not support required features to run this application.</p>
                    <p>Please update to a modern browser like Chrome, Firefox, Safari, or Edge.</p>
                </div>
            `;
        }
        return;
    }
    
    // 生产环境：加载必要的模块
    const requiredModules = [
        'js/core/eventBus.js',
        'js/core/graphManager.js'
    ];
    
    // 加载必要模块
    loadModules(requiredModules)
        .then(() => {
            console.log('Neo4j Editor: 核心模块加载完成');
            
            // 初始化应用
            initializeApplication();
        })
        .catch(error => {
            console.error('Neo4j Editor: Error loading modules:', error);
        });
    
    /**
     * 初始化应用程序
     */
    function initializeApplication() {
        try {
            console.log('Neo4j Editor: 初始化应用程序...');
            
            // 获取graphManager实例
            const graphManager = neo4jEditor.getModule('graphManager');
            if (!graphManager) {
                console.error('Neo4j Editor: graphManager模块未找到');
                return;
            }
            
            // 初始化graphManager
            graphManager.initialize();
            
            // 为节点类型按钮添加点击事件监听器
            setupNodeTypeButtons();
            
            console.log('Neo4j Editor: 应用程序初始化完成');
        } catch (error) {
            console.error('Neo4j Editor: 应用程序初始化失败:', error);
        }
    }
    
    /**
     * 设置节点类型按钮的点击事件
     */
    function setupNodeTypeButtons() {
        const nodeTypeButtons = document.querySelectorAll('.node-type-btn');
        nodeTypeButtons.forEach(button => {
            button.addEventListener('click', function() {
                // 移除其他按钮的active状态
                nodeTypeButtons.forEach(btn => btn.classList.remove('active'));
                // 添加当前按钮的active状态
                this.classList.add('active');
                
                // 获取选中的节点类型
                const nodeType = this.getAttribute('data-type');
                console.log('Neo4j Editor: 节点类型选择:', nodeType);
                
                // 通过graphManager设置当前节点类型
                const graphManager = neo4jEditor.getModule('graphManager');
                if (graphManager) {
                    graphManager.setCurrentNodeType(nodeType);
                }
            });
        });
    }
    
    /**
     * 动态加载JavaScript模块
     */
    function loadModules(modulePaths) {
        const loadPromises = modulePaths.map(path => {
            return new Promise((resolve, reject) => {
                const script = document.createElement('script');
                script.src = path;
                script.onload = () => {
                    console.log(`Module loaded: ${path}`);
                    resolve();
                };
                script.onerror = () => {
                    console.error(`Failed to load module: ${path}`);
                    reject(new Error(`Failed to load module: ${path}`));
                };
                document.head.appendChild(script);
            });
        });
        
        return Promise.all(loadPromises);
    }
    
    // 全局错误处理
    window.onerror = function(message, source, lineno, colno, error) {
        console.error('Global error:', { message, source, lineno, colno, error });
        
        // 可以在这里发送错误报告到服务器
        return true;
    };
    
    // 未处理的Promise拒绝处理
    window.addEventListener('unhandledrejection', function(event) {
        console.error('Unhandled Promise rejection:', event.reason);
    });

    // 全局错误恢复
    window.addEventListener('error', function(e) {
        console.error('Window error:', e.error);
        
        // 在生产环境中，可以实现错误恢复逻辑
        const isDevelopment = true; // 手动设置开发环境标志
        if (!isDevelopment) {
            // 尝试恢复应用
            setTimeout(() => {
                if (neo4jEditor.applicationManager) {
                    neo4jEditor.applicationManager.reload();
                }
            }, 5000);
        }
    });
}); // DOMContentLoaded事件监听器的闭合