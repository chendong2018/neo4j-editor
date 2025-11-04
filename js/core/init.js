/**
 * Neo4j Editor - 核心初始化模块
 * 负责初始化应用的核心系统和共享状态
 */

// 安全创建命名空间
window.neo4jEditor = window.neo4jEditor || {};

// 共享数据初始化
window.neo4jEditor.sharedGraphData = window.neo4jEditor.sharedGraphData || {
    nodes: [], 
    edges: [],
    deletedEdges: [] // 用于存储用户删除的关系，避免自动重新创建
};

// 编辑器配置
window.neo4jEditor.config = window.neo4jEditor.config || {
    enableDualViews: true,
    defaultLayout: 'cose',
    defaultTreeLayout: 'dagre',
    autoSaveInterval: 60000, // 60秒自动保存
    maxUndoSteps: 20,
    enableAnimation: true
};

// 编辑器状态
window.neo4jEditor.editorState = window.neo4jEditor.editorState || {
    selectedElement: null,
    selectedElementType: null, // 'node' 或 'edge'
    isDragging: false,
    isCreatingEdge: false,
    fromNodeId: null,
    currentMode: 'default' // 'default', 'pan', 'select', 'create'
};

// Cytoscape实例引用
window.neo4jEditor.instances = window.neo4jEditor.instances || {
    tree: null,
    network: null
};

// 模块加载状态
window.neo4jEditor.loadedModules = window.neo4jEditor.loadedModules || {};

/**
 * 创建向后兼容函数
 * @param {string} deprecatedName - 旧函数名称
 * @param {Function} newFunction - 新函数实现
 * @param {Object} context - 函数执行上下文
 * @returns {Function|null} 包装后的兼容函数
 */
function createBackwardCompatibilityFunction(deprecatedName, newFunction, context) {
    try {
        // 参数安全检查
        if (typeof deprecatedName !== 'string' || deprecatedName.trim() === '') {
            console.error('createBackwardCompatibilityFunction: 无效的deprecatedName参数');
            return null;
        }
        
        if (typeof newFunction !== 'function') {
            console.error('createBackwardCompatibilityFunction: 无效的newFunction参数');
            return null;
        }
        
        return function() {
            if (typeof console !== 'undefined' && typeof console.warn === 'function') {
                console.warn(`警告: 直接调用 ${deprecatedName}() 已弃用，请使用适当的模块化方式调用`);
            }
            return newFunction.apply(context || null, arguments);
        };
    } catch (error) {
        console.error('createBackwardCompatibilityFunction: 创建兼容函数时出错:', error);
        return null;
    }
}

/**
 * 核心初始化模块
 */
const coreModule = {
    // 初始化状态
    initialized: false,
    
    /**
     * 主初始化函数
     * @returns {boolean} 初始化是否成功
     */
    init: function() {
        try {
            console.log('Neo4j Editor Core: Initializing...');
            return this.initializeSystems();
        } catch (error) {
            console.error('Neo4j Editor: Error in core initialization:', error);
            return false;
        }
    },
    
    /**
     * 初始化系统主函数
     * @returns {boolean} 初始化是否成功
     */
    initializeSystems: function() {
        try {
            console.log('Neo4j Editor: Initializing core systems');
            
            // 初始化工具函数
            this.initializeUtilityFunctions();
            
            // 启动自动保存
            this.startAutoSave();
            
            // 映射Cytoscape实例到全局变量
            this.mapCytoscapeInstances();
            
            // 初始化各个子系统
            this.initializeSubSystems();
            
            console.log('Neo4j Editor: Core systems initialized');
            
            // 标记核心模块为已初始化
            this.initialized = true;
            
            // 如果模块已经通过registerModule注册，更新其状态
            if (window.neo4jEditor.modules && window.neo4jEditor.modules['core/init']) {
                window.neo4jEditor.modules['core/init'].initialized = true;
            }
            
            return true;
        } catch (error) {
            console.error('Neo4j Editor: Error initializing core systems:', error);
            return false;
        }
    },

    /**
     * 初始化子系统
     */
    initializeSubSystems: function() {
        try {
            console.log('Neo4j Editor: Initializing subsystems...');
            
            // 初始化数据管理系统
            if (window.graphDataManager && typeof window.graphDataManager.initialize === 'function') {
                window.graphDataManager.initialize();
            }
            
            // 初始化视图系统
    console.log('🔍 尝试初始化视图系统...');
    console.log('window.viewManager存在:', !!window.viewManager);
    console.log('neo4jEditor.modules状态:', window.neo4jEditor && window.neo4jEditor.modules ? Object.keys(window.neo4jEditor.modules).join(', ') : '不存在');
    
    // 尝试通过两种方式初始化视图管理器
    if (window.viewManager && typeof window.viewManager.initialize === 'function') {
        console.log('✅ 通过window.viewManager初始化视图系统');
        window.viewManager.initialize();
    } else if (window.neo4jEditor && window.neo4jEditor.modules && window.neo4jEditor.modules['views/viewManager']) {
        console.log('✅ 通过neo4jEditor模块系统初始化视图系统');
        window.neo4jEditor.modules['views/viewManager'].initialize();
    } else {
        console.warn('⚠️  无法初始化视图管理器，请检查模块加载顺序');
        // 尝试直接加载和初始化viewManager模块
        setTimeout(() => {
            console.log('🔄 尝试延迟初始化视图管理器');
            if (window.viewManager) {
                console.log('window.viewManager可用，尝试初始化');
                if (typeof window.viewManager.initialize === 'function') {
                    window.viewManager.initialize();
                } else if (typeof window.viewManager.init === 'function') {
                    window.viewManager.init();
                }
            }
        }, 500);
    }
            
            // 初始化UI系统
            if (window.uiManager && typeof window.uiManager.initialize === 'function') {
                window.uiManager.initialize();
            }
        } catch (error) {
            console.error('Neo4j Editor: Error initializing subsystems:', error);
        }
    },

    /**
     * 初始化工具函数
     */
    initializeUtilityFunctions: function() {
        try {
            // 工具函数已移至对象顶层方法
            console.log('Neo4j Editor: Utility functions initialized');
        } catch (error) {
            console.error('Neo4j Editor: Error initializing utility functions:', error);
        }
    },

    /**
     * 显示提示信息
     * @param {string} message - 提示消息
     * @param {string} type - 消息类型 ('info', 'success', 'error', 'warning')
     * @param {number} duration - 显示时长（毫秒）
     */
    showToast: function(message, type = 'info', duration = 3000) {
        try {
            if (!message || typeof message !== 'string') {
                console.error('Neo4j Editor: Invalid toast message');
                return;
            }
            
            // 创建toast元素
            const toast = document.createElement('div');
            toast.className = `toast toast-${type}`;
            toast.textContent = message;
            
            // 添加样式
            toast.style.position = 'fixed';
            toast.style.top = '20px';
            toast.style.right = '20px';
            toast.style.padding = '12px 20px';
            toast.style.borderRadius = '4px';
            toast.style.color = '#fff';
            toast.style.fontWeight = '500';
            toast.style.zIndex = '9999';
            toast.style.opacity = '0';
            toast.style.transition = 'opacity 0.3s ease';
            
            // 设置背景色
            switch(type) {
                case 'success':
                    toast.style.backgroundColor = '#27ae60';
                    break;
                case 'error':
                    toast.style.backgroundColor = '#e74c3c';
                    break;
                case 'warning':
                    toast.style.backgroundColor = '#f39c12';
                    break;
                default:
                    toast.style.backgroundColor = '#3498db';
            }
            
            // 添加到文档
            document.body.appendChild(toast);
            
            // 显示toast
            setTimeout(() => {
                toast.style.opacity = '1';
            }, 10);
            
            // 设置自动消失
            setTimeout(() => {
                toast.style.opacity = '0';
                setTimeout(() => {
                    if (document.body.contains(toast)) {
                        document.body.removeChild(toast);
                    }
                }, 300);
            }, duration);
        } catch (error) {
            console.error('Neo4j Editor: Error showing toast:', error);
        }
    },

    /**
     * 将图形数据保存到本地存储
     * @returns {boolean} 保存是否成功
     */
    saveGraphToLocalStorage: function() {
        try {
            const dataToSave = JSON.stringify(window.neo4jEditor.sharedGraphData);
            localStorage.setItem('neo4j-editor-graph-data', dataToSave);
            console.log('Neo4j Editor: Graph data saved to local storage');
            return true;
        } catch (error) {
            console.error('Neo4j Editor: Failed to save graph data to local storage:', error);
            return false;
        }
    },
    
    /**
     * 从本地存储加载图形数据
     * @returns {boolean} 加载是否成功
     */
    loadGraphFromLocalStorage: function() {
        try {
            const savedData = localStorage.getItem('neo4j-editor-graph-data');
            if (savedData) {
                const data = JSON.parse(savedData);
                window.neo4jEditor.sharedGraphData = data;
                
                // 同步更新视图
                if (typeof window.syncGraphData === 'function') {
                    window.syncGraphData();
                }
                
                console.log('Neo4j Editor: Graph data loaded from local storage');
                return true;
            }
        } catch (error) {
            console.error('Neo4j Editor: Failed to load graph data from local storage:', error);
        }
        return false;
    },

    /**
     * 启动自动保存
     */
    startAutoSave: function() {
        try {
            // 确保autoSaveInterval是有效的数字值
            let interval = window.neo4jEditor.config.autoSaveInterval;
            if (typeof interval !== 'number' || interval <= 0) {
                interval = 60000; // 默认60秒
                window.neo4jEditor.config.autoSaveInterval = interval;
                console.log('Neo4j Editor: Using default auto-save interval of 60 seconds');
            }
            
            setInterval(() => {
                const success = this.saveGraphToLocalStorage();
                if (success) {
                    console.log('Neo4j Editor: Automatic save completed');
                }
            }, interval);
        } catch (error) {
            console.error('Neo4j Editor: Error starting auto-save:', error);
        }
    },
    
    /**
     * 映射Cytoscape实例到全局变量
     */
    mapCytoscapeInstances: function() {
        try {
            // 将instances映射到全局变量以兼容验证模块
            window.cyTree = window.neo4jEditor.instances.tree;
            window.cyNetwork = window.neo4jEditor.instances.network;
            console.log('Neo4j Editor: Cytoscape instances mapped to global variables');
        } catch (error) {
            console.error('Neo4j Editor: Error mapping Cytoscape instances:', error);
        }
    },

    /**
     * 清理资源
     * @returns {boolean} 清理是否成功
     */
    cleanup: function() {
        try {
            console.log('Neo4j Editor: Cleaning up resources');
            
            // 清理Cytoscape实例
            if (window.neo4jEditor.instances.tree) {
                window.neo4jEditor.instances.tree.destroy();
                window.neo4jEditor.instances.tree = null;
            }
            
            if (window.neo4jEditor.instances.network) {
                window.neo4jEditor.instances.network.destroy();
                window.neo4jEditor.instances.network = null;
            }
            
            window.cyTree = null;
            window.cyNetwork = null;
            
            console.log('Neo4j Editor: Resources cleaned up');
            return true;
        } catch (error) {
            console.error('Neo4j Editor: Error cleaning up resources:', error);
            return false;
        }
    },
    
    /**
     * 同步图形数据（添加此方法以确保向后兼容性）
     */
    syncGraphData: function() {
        try {
            console.log('Neo4j Editor: Syncing graph data');
            // 此方法在实际实现中可能会调用其他模块的同步功能
            // 这里提供基本实现以确保向后兼容性
            if (window.neo4jEditor.instances.tree) {
                window.neo4jEditor.instances.tree.refresh();
            }
            if (window.neo4jEditor.instances.network) {
                window.neo4jEditor.instances.network.refresh();
            }
            return true;
        } catch (error) {
            console.error('Neo4j Editor: Error syncing graph data:', error);
            return false;
        }
    }
};

// 导出到全局命名空间
window.core = coreModule;

// 定义全局向后兼容函数映射
const globalBackwardCompatibilityMapping = [
    { deprecatedName: 'initEditor', newFunction: coreModule.init, context: coreModule },
    { deprecatedName: 'showToast', newFunction: coreModule.showToast, context: coreModule },
    { deprecatedName: 'saveToLocalStorage', newFunction: coreModule.saveGraphToLocalStorage, context: coreModule },
    { deprecatedName: 'loadFromLocalStorage', newFunction: coreModule.loadGraphFromLocalStorage, context: coreModule },
    { deprecatedName: 'syncGraphData', newFunction: coreModule.syncGraphData, context: coreModule }
];

// 定义命名空间向后兼容函数映射
const namespaceBackwardCompatibilityMapping = [
    { deprecatedName: 'window.neo4jEditor.initializeApp', newFunction: coreModule.init, context: coreModule },
    { deprecatedName: 'window.neo4jEditor.syncData', newFunction: coreModule.syncGraphData, context: coreModule }
];

// 注册全局向后兼容函数
globalBackwardCompatibilityMapping.forEach(funcInfo => {
    try {
        // 确保函数名称有效
        if (!funcInfo.deprecatedName || typeof funcInfo.newFunction !== 'function') {
            console.error(`注册全局向后兼容函数失败: 无效的函数信息`, funcInfo);
            return;
        }
        
        if (typeof window[funcInfo.deprecatedName] === 'undefined') {
            window[funcInfo.deprecatedName] = createBackwardCompatibilityFunction(
                funcInfo.deprecatedName,
                funcInfo.newFunction,
                funcInfo.context
            );
        }
    } catch (error) {
        console.error(`注册全局向后兼容函数 ${funcInfo.deprecatedName || '未知函数'} 失败:`, error);
    }
});

// 注册命名空间向后兼容函数
namespaceBackwardCompatibilityMapping.forEach(funcInfo => {
    try {
        // 确保函数名称有效
        if (!funcInfo.deprecatedName || typeof funcInfo.newFunction !== 'function') {
            console.error(`注册命名空间向后兼容函数失败: 无效的函数信息`, funcInfo);
            return;
        }
        
        const namespaceFunc = funcInfo.deprecatedName.replace('window.neo4jEditor.', '');
        if (typeof window.neo4jEditor[namespaceFunc] === 'undefined') {
            window.neo4jEditor[namespaceFunc] = createBackwardCompatibilityFunction(
                funcInfo.deprecatedName,
                funcInfo.newFunction,
                funcInfo.context
            );
        }
    } catch (error) {
        console.error(`注册命名空间向后兼容函数 ${funcInfo.deprecatedName || '未知函数'} 失败:`, error);
    }
});

// 确保modules对象存在
if (window.neo4jEditor && typeof window.neo4jEditor.modules === 'undefined') {
    window.neo4jEditor.modules = {};
}

// 定义模块名称和注册信息
const coreModuleName = 'core/init';
const coreModuleRegistrationInfo = {
    name: coreModuleName,
    version: '1.0.0',
    dependencies: ['utils/utils'],
    module: coreModule
};

// 使用统一的模块注册方法
if (window.neo4jEditor && typeof window.neo4jEditor.registerModule === 'function') {
    try {
        window.neo4jEditor.registerModule(coreModuleRegistrationInfo);
        console.log(`Neo4j Editor: core/init module registered successfully`);
    } catch (registrationError) {
        console.error(`Neo4j Editor: Failed to register core/init module:`, registrationError);
        
        // 降级方案：直接注册到modules对象
        try {
            const coreModuleName = 'core/init';
            const coreModuleRegistrationInfo = {
                name: coreModuleName,
                version: '1.0.0',
                dependencies: ['utils/utils'],
                module: coreModule
            };
            
            if (typeof window.neo4jEditor.modules[coreModuleName] === 'undefined') {
                window.neo4jEditor.modules[coreModuleName] = {
                    name: coreModuleRegistrationInfo.name,
                    version: coreModuleRegistrationInfo.version,
                    initialized: coreModule.initialized,
                    dependencies: coreModuleRegistrationInfo.dependencies,
                    module: coreModuleRegistrationInfo.module
                };
                console.log(`Neo4j Editor: core/init module registered via fallback to modules object`);
            }
        } catch (fallbackError) {
            // 终极降级方案：直接挂载到全局
            if (typeof window.appModule === 'undefined') {
                window.appModule = {};
            }
            window.appModule.core = coreModule;
            console.log(`Neo4j Editor: core/init module registered via final fallback to appModule`);
        }
    }
} else {
    // 降级方案：直接挂载到全局
    if (typeof window.appModule === 'undefined') {
        window.appModule = {};
    }
    window.appModule.core = coreModule;
    console.log(`Neo4j Editor: core/init module registered via fallback to appModule`);
}

/**
 * 应用程序初始化
 */
const initializeApp = function() {
    try {
        // 检查是否已经通过模块系统初始化
        if (!window.neo4jEditor.modules || !window.neo4jEditor.modules['core/init'] || !window.neo4jEditor.modules['core/init'].initialized) {
            window.core.init();
        }
    } catch (error) {
        console.error('Neo4j Editor: Error in app initialization:', error);
    }
};

// 安全绑定初始化事件
if (typeof window.addEventListener !== 'undefined') {
    window.addEventListener('DOMContentLoaded', initializeApp);
} else if (typeof window.attachEvent !== 'undefined') {
    // 兼容IE
    window.attachEvent('onload', initializeApp);
}

// 多模块系统支持 - 确保兼容性
// CommonJS 模块支持
if (typeof module !== 'undefined' && typeof module.exports !== 'undefined') {
    module.exports = coreModule;
}

// ES 模块支持
if (typeof exports !== 'undefined' && typeof exports === 'object') {
    Object.defineProperty(exports, '__esModule', { value: true });
    if (typeof module !== 'undefined') module.exports = coreModule;
    exports.default = coreModule;
}

// AMD 模块支持
if (typeof define === 'function' && define.amd) {
    define(['utils/utils'], function() {
        return coreModule;
    });
}