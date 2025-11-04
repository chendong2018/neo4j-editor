/**
 * Neo4j Editor - 模块化主入口文件
 * 导入并初始化所有重构后的模块
 */

// 安全创建命名空间，避免覆盖现有对象
window.neo4jEditor = window.neo4jEditor || {};

// 初始化模块配置对象
window.neo4jEditor.config = window.neo4jEditor.config || {
  modulePaths: {
    utils: '../js/utils',
    core: '../js/core',
    data: '../js/data',
    views: '../js/views'
  },
  // 默认配置参数
  defaults: {
    enableAnimations: true,
    autoSave: true,
    theme: 'default'
  }
};

/**
 * 模块注册函数
 * 用于统一注册所有模块到命名空间中
 * @param {Object} moduleInfo - 模块信息对象，包含name、version、dependencies和module属性
 */
window.neo4jEditor.registerModule = function(moduleInfo) {
    try {
        // 参数安全检查
        if (!moduleInfo || typeof moduleInfo !== 'object') {
            throw new Error('无效的模块信息');
        }
        
        if (!moduleInfo.name || typeof moduleInfo.name !== 'string') {
            throw new Error('模块必须有名称');
        }
        
        // 确保modules对象存在
        window.neo4jEditor.modules = window.neo4jEditor.modules || {};
        
        // 注册模块
        window.neo4jEditor.modules[moduleInfo.name] = {
            name: moduleInfo.name,
            version: moduleInfo.version || '1.0.0',
            dependencies: moduleInfo.dependencies || [],
            initialized: moduleInfo.module && typeof moduleInfo.module.initialized !== 'undefined' ? 
                         moduleInfo.module.initialized : false,
            module: moduleInfo.module
        };
        
        console.log(`Neo4j Editor: 模块 ${moduleInfo.name} 已注册，版本 ${moduleInfo.version || '1.0.0'}`);
        return true;
    } catch (error) {
        console.error('Neo4j Editor: 模块注册失败:', error);
        throw error;
    }
};

/**
 * 初始化所有注册的模块
 */
window.neo4jEditor.initializeModules = function() {
    try {
        console.log('Neo4j Editor: 开始初始化所有模块');
        
        const modules = window.neo4jEditor.modules || {};
        let success = true;
        
        // 按依赖顺序初始化模块
        Object.values(modules).forEach(moduleInfo => {
            try {
                if (moduleInfo.module && typeof moduleInfo.module.initialize === 'function' && !moduleInfo.initialized) {
                    moduleInfo.module.initialize();
                    moduleInfo.initialized = true;
                    console.log(`Neo4j Editor: 模块 ${moduleInfo.name} 初始化成功`);
                }
            } catch (error) {
                console.error(`Neo4j Editor: 模块 ${moduleInfo.name} 初始化失败:`, error);
                success = false;
            }
        });
        
        return success;
    } catch (error) {
        console.error('Neo4j Editor: 模块初始化过程出错:', error);
        return false;
    }
};

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
 * Neo4j Editor 模块化主入口
 * 负责初始化全局命名空间、加载模块和启动应用
 */
const appModule = {
    initialized: false,
    
    /**
     * 初始化应用
     */
    initializeApp: function() {
        try {
            console.log('Neo4j Editor: Initializing application...');
            
            // 确保共享数据结构存在
            window.neo4jEditor.sharedGraphData = window.neo4jEditor.sharedGraphData || {
                nodes: [],
                edges: [],
                deletedEdges: []
            };
            
            // 初始化模块管理器
            window.neo4jEditor.modules = window.neo4jEditor.modules || {};
            
            // 加载必要的模块
            this.loadModulesSequentially([
                '../js/utils/utils.js',
                '../js/core/init.js',
                '../js/data/graphDataManager.js',
                '../js/views/viewManager.js',
                '../js/views/nodeTypeManager.js',
                '../js/views/connectionManager.js'
            ]).then(() => {
                console.log('Neo4j Editor: All core modules loaded successfully');
                
                // 标记应用已初始化
                this.initialized = true;
                
                // 如果core模块已加载，调用其初始化函数
                if (window.core && typeof window.core.init === 'function') {
                    window.core.init();
                }
                
                // 映射工具函数到全局命名空间
                this.mapUtilityFunctions();
                
                console.log('Neo4j Editor: Application initialization completed');
            }).catch(error => {
                console.error('Neo4j Editor: Failed to initialize application:', error);
                
                // 显示初始化错误提示
                try {
                    if (window.utils && typeof window.utils.showToast === 'function') {
                        window.utils.showToast('编辑器初始化失败: ' + (error.message || '未知错误'), 'error');
                    } else if (typeof window.showToast === 'function') {
                        window.showToast('编辑器初始化失败: ' + (error.message || '未知错误'), 'error');
                    }
                } catch (toastError) {
                    console.error('Failed to show error toast:', toastError);
                }
            });
        } catch (error) {
            console.error('Neo4j Editor: Critical error during initialization:', error);
            
            // 显示关键错误提示
            try {
                if (typeof window.showToast === 'function') {
                    window.showToast('编辑器初始化失败: ' + error.message, 'error');
                } else if (window.utils && typeof window.utils.showToast === 'function') {
                    window.utils.showToast('编辑器初始化失败: ' + error.message, 'error');
                }
            } catch (toastError) {
                console.error('Failed to show error toast:', toastError);
            }
        }
    },
    
    /**
     * 加载单个模块
     * @param {string} modulePath - 模块路径
     * @returns {Promise} 加载完成的Promise
     */
    loadModule: function(modulePath) {
        return new Promise((resolve, reject) => {
            try {
                // 参数安全检查
                if (!modulePath || typeof modulePath !== 'string') {
                    reject(new Error('Invalid module path'));
                    return;
                }
                
                console.log(`Neo4j Editor: Loading module ${modulePath}...`);
                
                // 检查模块是否已加载
                if (window.neo4jEditor.modules[modulePath]) {
                    console.log(`Neo4j Editor: Module ${modulePath} already loaded`);
                    resolve();
                    return;
                }
                
                // 创建script元素
                const script = document.createElement('script');
                script.src = modulePath;
                script.async = false; // 确保按顺序加载
                
                // 设置加载成功回调
                script.onload = () => {
                    console.log(`Neo4j Editor: Module ${modulePath} loaded successfully`);
                    window.neo4jEditor.modules[modulePath] = true;
                    resolve();
                };
                
                // 设置加载失败回调
                script.onerror = (error) => {
                    console.error(`Neo4j Editor: Failed to load module ${modulePath}`, error);
                    reject(new Error(`Failed to load module ${modulePath}`));
                };
                
                // 添加到DOM
                document.head.appendChild(script);
            } catch (error) {
                console.error(`Neo4j Editor: Error loading module ${modulePath}:`, error);
                reject(error);
            }
        });
    },
    
    /**
     * 顺序加载多个模块
     * @param {Array} modulePaths - 模块路径数组
     * @returns {Promise} 所有模块加载完成的Promise
     */
    loadModulesSequentially: function(modulePaths) {
        // 参数安全检查
        if (!Array.isArray(modulePaths)) {
            return Promise.reject(new Error('Invalid module paths format'));
        }
        
        let sequence = Promise.resolve();
        
        modulePaths.forEach(path => {
            sequence = sequence.then(() => this.loadModule(path));
        });
        
        return sequence;
    },
    
    /**
     * 获取默认树视图样式
     * @returns {Array} Cytoscape样式数组
     */
    getDefaultTreeStyle: function() {
        return [
            {
                selector: 'node',
                style: {
                    'background-color': '#666',
                    'label': 'data(code)',
                    'width': 30,
                    'height': 30,
                    'font-size': 10,
                    'color': '#fff',
                    'text-valign': 'center',
                    'text-halign': 'center'
                }
            },
            {
                selector: 'edge',
                style: {
                    'width': 2,
                    'line-color': '#ccc',
                    'target-arrow-color': '#ccc',
                    'target-arrow-shape': 'triangle',
                    'label': 'data(label)'
                }
            }
        ];
    },
    
    /**
     * 获取默认网络图视图样式
     * @returns {Array} Cytoscape样式数组
     */
    getDefaultNetworkStyle: function() {
        return [
            {
                selector: 'node',
                style: {
                    'background-color': '#3498db',
                    'label': 'data(code)',
                    'width': 40,
                    'height': 40,
                    'font-size': 12,
                    'color': '#fff',
                    'text-valign': 'center',
                    'text-halign': 'center'
                }
            },
            {
                selector: 'edge',
                style: {
                    'width': 3,
                    'line-color': '#2ecc71',
                    'target-arrow-color': '#2ecc71',
                    'target-arrow-shape': 'triangle',
                    'label': 'data(label)',
                    'font-size': 10
                }
            }
        ];
    },
    
    /**
     * 注册全局事件监听器
     */
    registerGlobalEventListeners: function() {
        try {
            // 页面加载完成后初始化
            if (document.readyState === 'loading') {
                document.addEventListener('DOMContentLoaded', () => {
                    this.initializeApp();
                });
            } else {
                // 如果DOM已经加载完成，直接初始化
                setTimeout(() => {
                    this.initializeApp();
                }, 0);
            }
            
            // 窗口大小变化时调整视图
            window.addEventListener('resize', () => {
                if (window.viewManager && typeof window.viewManager.adjustViewSize === 'function') {
                    window.viewManager.adjustViewSize();
                }
            });
            
            // 页面卸载前保存数据
            window.addEventListener('beforeunload', () => {
                if (window.core && typeof window.core.saveGraphToLocalStorage === 'function') {
                    window.core.saveGraphToLocalStorage();
                } else if (typeof window.saveGraphToLocalStorage === 'function') {
                    window.saveGraphToLocalStorage();
                }
            });
        } catch (error) {
            console.error('Neo4j Editor: Error registering global event listeners:', error);
        }
    },
    
    /**
     * 映射工具函数到全局命名空间
     */
    mapUtilityFunctions: function() {
        try {
            if (!window.arrayHasElement && window.utils && typeof window.utils.arrayHasElement === 'function') {
                // 映射常用工具函数到全局命名空间，保持向后兼容
                const utilsFunctions = [
                    'arrayHasElement', 'arrayAddUnique', 'arrayRemoveElement', 'arrayContainsElement',
                    'generateId', 'generateUniqueId', 'deepClone', 'debounce', 'throttle', 'showToast',
                    'getDefaultNodeProperties', 'getDefaultEdgeProperties'
                ];
                
                utilsFunctions.forEach(funcName => {
                    try {
                        if (typeof window.utils[funcName] === 'function' && typeof window[funcName] === 'undefined') {
                            // 使用向后兼容函数包装
                            window[funcName] = createBackwardCompatibilityFunction(
                                funcName,
                                window.utils[funcName],
                                window.utils
                            );
                        }
                    } catch (error) {
                        console.error(`映射工具函数 ${funcName} 失败:`, error);
                    }
                });
            }
        } catch (error) {
            console.error('Neo4j Editor: Error mapping utility functions:', error);
        }
    }
};

/**
 * 选择节点
 * @param {Object} node - Cytoscape节点对象
 */
function selectNode(node) {
    // 参数安全检查
    if (!node) {
        console.error('Neo4j Editor: Invalid node parameter');
        return;
    }
    
    console.log('Neo4j Editor: Node selected', node.id ? node.id() : 'unknown');
    
    // 清除其他选择
    if (window.cyTree) {
        window.cyTree.elements().unselect();
    }
    if (window.cyNetwork) {
        window.cyNetwork.elements().unselect();
    }
    
    // 选中当前节点
    node.select();
    
    // 显示节点属性 - 使用模块化结构或全局函数
    if (window.propertyEditor && typeof window.propertyEditor.showNodeProperties === 'function') {
        window.propertyEditor.showNodeProperties(node);
    } else if (typeof window.showNodeProperties === 'function') {
        window.showNodeProperties(node);
    }
}

/**
 * 选择边
 * @param {Object} edge - Cytoscape边对象
 */
function selectEdge(edge) {
    // 参数安全检查
    if (!edge) {
        console.error('Neo4j Editor: Invalid edge parameter');
        return;
    }
    
    console.log('Neo4j Editor: Edge selected', edge.id ? edge.id() : 'unknown');
    
    // 清除其他选择
    if (window.cyTree) {
        window.cyTree.elements().unselect();
    }
    if (window.cyNetwork) {
        window.cyNetwork.elements().unselect();
    }
    
    // 选中当前边
    edge.select();
    
    // 显示边属性 - 使用模块化结构或全局函数
    if (window.propertyEditor && typeof window.propertyEditor.showEdgeProperties === 'function') {
        window.propertyEditor.showEdgeProperties(edge);
    } else if (typeof window.showEdgeProperties === 'function') {
        window.showEdgeProperties(edge);
    }
}

/**
 * 清空图表
 */
function clearGraph() {
    if (confirm('确定要清空所有图表数据吗？此操作不可撤销。')) {
        console.log('Neo4j Editor: Clearing graph data');
        
        // 清空共享数据
        window.neo4jEditor.sharedGraphData = {
            nodes: [],
            edges: [],
            deletedEdges: []
        };
        
        // 同步更新视图
        if (typeof window.syncGraphData === 'function') {
            window.syncGraphData();
        }
        
        // 清空属性编辑器
        const emptyPropertyEditor = function() {
            if (window.neo4jEditor.propertyEditorContainer) {
                if (window.propertyEditor && typeof window.propertyEditor.initialize === 'function') {
                    window.propertyEditor.initialize(window.neo4jEditor.propertyEditorContainer);
                } else if (typeof window.initializePropertyEditor === 'function') {
                    window.initializePropertyEditor(window.neo4jEditor.propertyEditorContainer);
                }
            }
        };
        
        emptyPropertyEditor();
        
        // 显示提示
        try {
            if (window.utils && typeof window.utils.showToast === 'function') {
                window.utils.showToast('图表已清空');
            } else if (typeof window.showToast === 'function') {
                window.showToast('图表已清空');
            }
        } catch (toastError) {
            console.error('Failed to show toast:', toastError);
        }
    }
}

/**
 * 导出图表数据
 */
function exportGraphData() {
    console.log('Neo4j Editor: Exporting graph data');
    
    try {
        const sharedData = window.neo4jEditor.sharedGraphData || { nodes: [], edges: [] };
        const dataStr = JSON.stringify(sharedData, null, 2);
        
        // 创建下载链接
        const dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr);
        const exportFileDefaultName = `neo4j-graph-${new Date().toISOString().slice(0,10)}.json`;
        
        const linkElement = document.createElement('a');
        linkElement.setAttribute('href', dataUri);
        linkElement.setAttribute('download', exportFileDefaultName);
        linkElement.click();
    } catch (error) {
        console.error('Neo4j Editor: Error exporting graph data:', error);
        
        try {
            if (window.utils && typeof window.utils.showToast === 'function') {
                window.utils.showToast('导出失败: ' + error.message, 'error');
            } else if (typeof window.showToast === 'function') {
                window.showToast('导出失败: ' + error.message, 'error');
            }
        } catch (toastError) {
            console.error('Failed to show error toast:', toastError);
        }
    }
}

/**
 * 导入图表数据
 */
function importGraphData() {
    try {
        // 创建文件输入元素
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.json';
        
        input.onchange = function(event) {
            const file = event.target.files && event.target.files[0];
            if (file) {
                const reader = new FileReader();
                
                reader.onload = function(e) {
                    try {
                        const data = JSON.parse(e.target.result);
                        
                        // 更新共享数据
                        window.neo4jEditor.sharedGraphData = data;
                        
                        // 同步更新视图
                        if (typeof window.syncGraphData === 'function') {
                            window.syncGraphData();
                        }
                        
                        // 显示提示
                        try {
                            const nodeCount = data.nodes ? data.nodes.length : 0;
                            const edgeCount = data.edges ? data.edges.length : 0;
                            
                            if (window.utils && typeof window.utils.showToast === 'function') {
                                window.utils.showToast(`成功导入 ${nodeCount} 个节点和 ${edgeCount} 条关系`);
                            } else if (typeof window.showToast === 'function') {
                                window.showToast(`成功导入 ${nodeCount} 个节点和 ${edgeCount} 条关系`);
                            }
                        } catch (toastError) {
                            console.error('Failed to show success toast:', toastError);
                        }
                        
                    } catch (error) {
                        console.error('Neo4j Editor: Error parsing imported data:', error);
                        
                        try {
                            if (window.utils && typeof window.utils.showToast === 'function') {
                                window.utils.showToast('导入失败: 无效的JSON文件', 'error');
                            } else if (typeof window.showToast === 'function') {
                                window.showToast('导入失败: 无效的JSON文件', 'error');
                            }
                        } catch (toastError) {
                            console.error('Failed to show error toast:', toastError);
                        }
                    }
                };
                
                reader.readAsText(file);
            }
        };
        
        input.click();
    } catch (error) {
        console.error('Neo4j Editor: Error initiating import:', error);
    }
}

// 定义向后兼容函数数组
const appBackwardCompatibilityFunctions = [
    { deprecatedName: 'selectNode', newFunction: selectNode },
    { deprecatedName: 'selectEdge', newFunction: selectEdge },
    { deprecatedName: 'clearGraph', newFunction: clearGraph },
    { deprecatedName: 'exportGraphData', newFunction: exportGraphData },
    { deprecatedName: 'importGraphData', newFunction: importGraphData }
];

// 注册向后兼容函数到全局
appBackwardCompatibilityFunctions.forEach(funcInfo => {
    try {
        // 确保函数名称有效
        if (!funcInfo.deprecatedName || typeof funcInfo.newFunction !== 'function') {
            console.error(`Neo4j Editor: 注册向后兼容函数失败: 无效的函数信息`, funcInfo);
            return;
        }
        
        // 检查是否存在全局createBackwardCompatibilityFunction函数
        if (typeof createBackwardCompatibilityFunction === 'function') {
            window[funcInfo.deprecatedName] = createBackwardCompatibilityFunction(
                funcInfo.deprecatedName,
                funcInfo.newFunction
            );
        } else {
            // 降级方案：直接使用函数本身
            console.warn(`Neo4j Editor: 未找到createBackwardCompatibilityFunction函数，直接注册原始函数`);
            window[funcInfo.deprecatedName] = funcInfo.newFunction;
        }
    } catch (error) {
        console.error(`Neo4j Editor: 注册向后兼容函数 ${funcInfo.deprecatedName} 失败:`, error);
    }
});

// 尝试导入并注册我们重构的所有核心模块
(function() {
    try {
        // 工具模块
        if (typeof window.utilsModule !== 'undefined') {
            const utilsModuleRegistration = {
                name: 'utils',
                version: '1.0.0',
                dependencies: [],
                module: window.utilsModule
            };
            if (typeof window.neo4jEditor.registerModule === 'function') {
                window.neo4jEditor.registerModule(utilsModuleRegistration);
            }
            window.neo4jEditor.utils = window.utilsModule;
            console.log('Neo4j Editor: utils module registered');
        }
        
        // API模块
        if (typeof window.apiManager !== 'undefined') {
            const apiModuleRegistration = {
                name: 'api',
                version: '1.0.0',
                dependencies: ['utils'],
                module: window.apiManager
            };
            if (typeof window.neo4jEditor.registerModule === 'function') {
                window.neo4jEditor.registerModule(apiModuleRegistration);
            }
            window.neo4jEditor.api = window.apiManager;
            console.log('Neo4j Editor: api module registered');
        }
        
        // 数据模型模块
        if (typeof window.dataModelModule !== 'undefined') {
            const dataModelRegistration = {
                name: 'dataModel',
                version: '1.0.0',
                dependencies: ['utils'],
                module: window.dataModelModule
            };
            if (typeof window.neo4jEditor.registerModule === 'function') {
                window.neo4jEditor.registerModule(dataModelRegistration);
            }
            window.neo4jEditor.dataModel = window.dataModelModule;
            console.log('Neo4j Editor: dataModel module registered');
        }
        
        // 上下文菜单模块
        if (typeof window.contextMenuManagerModule !== 'undefined') {
            const contextMenuRegistration = {
                name: 'contextMenu',
                version: '1.0.0',
                dependencies: ['utils'],
                module: window.contextMenuManagerModule
            };
            if (typeof window.neo4jEditor.registerModule === 'function') {
                window.neo4jEditor.registerModule(contextMenuRegistration);
            }
            window.neo4jEditor.contextMenu = window.contextMenuManagerModule;
            console.log('Neo4j Editor: contextMenu module registered');
        }
        
        // 节点属性模块
        if (typeof window.nodePropertiesModule !== 'undefined') {
            const nodePropsRegistration = {
                name: 'nodeProperties',
                version: '1.0.0',
                dependencies: ['utils'],
                module: window.nodePropertiesModule
            };
            if (typeof window.neo4jEditor.registerModule === 'function') {
                window.neo4jEditor.registerModule(nodePropsRegistration);
            }
            window.neo4jEditor.nodeProperties = window.nodePropertiesModule;
            console.log('Neo4j Editor: nodeProperties module registered');
        }
        
        // Cytoscape图形模块
        if (typeof window.cytoscapeModule !== 'undefined') {
            const cytoscapeRegistration = {
                name: 'cytoscape',
                version: '1.0.0',
                dependencies: ['utils', 'contextMenu', 'dataModel'],
                module: window.cytoscapeModule
            };
            if (typeof window.neo4jEditor.registerModule === 'function') {
                window.neo4jEditor.registerModule(cytoscapeRegistration);
            }
            window.neo4jEditor.cytoscape = window.cytoscapeModule;
            console.log('Neo4j Editor: cytoscape module registered');
        }
    } catch (error) {
        console.error('Neo4j Editor: Error registering core modules:', error);
    }
})();

// 导出应用模块到命名空间
window.neo4jEditor.app = appModule;

// 定义模块名称和注册信息
const appModuleName = 'app';
const appModuleRegistrationInfo = {
    name: appModuleName,
    version: '1.0.0',
    dependencies: ['utils/utils'],
    module: appModule
};

// 注册模块
if (window.neo4jEditor && typeof window.neo4jEditor.registerModule === 'function') {
    try {
        window.neo4jEditor.registerModule(appModuleRegistrationInfo);
        console.log(`Neo4j Editor: ${appModuleName} module registered successfully`);
    } catch (registrationError) {
        console.error(`Neo4j Editor: Failed to register ${appModuleName} module:`, registrationError);
        
        // 降级方案：直接注册到modules对象
        try {
            if (typeof window.neo4jEditor.modules === 'undefined') {
                window.neo4jEditor.modules = {};
            }
            window.neo4jEditor.modules[appModuleName] = {
                name: appModuleRegistrationInfo.name,
                version: appModuleRegistrationInfo.version,
                initialized: appModule.initialized,
                dependencies: appModuleRegistrationInfo.dependencies,
                module: appModuleRegistrationInfo.module
            };
            console.log(`Neo4j Editor: ${appModuleName} module registered via fallback to modules object`);
        } catch (fallbackError) {
            // 终极降级方案：直接挂载到全局
            if (typeof window.appModule === 'undefined') {
                window.appModule = appModule;
            }
            console.log(`Neo4j Editor: ${appModuleName} module registered via final fallback to global`);
        }
    }
} else {
    // 降级方案：直接挂载到全局
    if (typeof window.appModule === 'undefined') {
        window.appModule = appModule;
    }
    console.log(`Neo4j Editor: ${appModuleName} module registered via fallback to global`);
}

// 注册全局事件监听器
appModule.registerGlobalEventListeners();

/**
 * 导出应用信息到控制台
 */
console.log('Neo4j Editor: Modular structure initialized');
if (window.neo4jEditor) {
    console.log('Neo4j Editor: Available modules:', Object.keys(window.neo4jEditor.modules || {}));
}

// 支持CommonJS模块导出
if (typeof module !== 'undefined' && typeof module.exports !== 'undefined') {
    module.exports = appModule;
}

// 支持AMD模块导出
if (typeof define === 'function' && define.amd) {
    define(['utils/utils', 'core/init', 'data/graphDataManager', 'views/viewManager'], function() {
        return appModule;
    });
}

// 支持ES模块导出
if (typeof exports !== 'undefined' && typeof exports === 'object') {
    module.exports = appModule;
}