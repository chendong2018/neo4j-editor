/**
 * Neo4j编辑器应用主入口模块
 * 负责初始化整个应用的各个组件和模块
 */

// 导入依赖
const utils = require('../utils/utils');
const cytoscapeModule = require('../graph/cytoscape').cytoscapeModule;
const contextMenuManager = require('../ui/contextMenuManager');
const nodePropertiesModule = require('../ui/nodeProperties');
const apiManager = require('../api/apiManager');

const appModule = {
    /**
     * 应用初始化状态
     */
    initialized: false,
    
    /**
     * 初始化Neo4j编辑器应用
     */
    initialize: function() {
        try {
            utils.debugLog('开始初始化Neo4j编辑器应用');
            
            // 检查是否已初始化
            if (this.initialized) {
                utils.debugLog('应用已初始化，跳过重复初始化');
                return true;
            }
            
            // 1. 初始化工具函数模块
            this._initializeUtils();
            
            // 2. 初始化API管理器
            this._initializeApiManager();
            
            // 3. 初始化右键菜单管理器
            this._initializeContextMenu();
            
            // 4. 初始化Cytoscape视图
            this._initializeGraphViews();
            
            // 5. 设置全局事件监听
            this._setupGlobalEventListeners();
            
            // 6. 初始化UI组件
            this._initializeUIComponents();
            
            // 7. 加载初始数据（如果有）
            this._loadInitialData();
            
            this.initialized = true;
            utils.debugLog('Neo4j编辑器应用初始化完成');
            utils.showToast('Neo4j编辑器已成功初始化');
            
            return true;
        } catch (error) {
            utils.handleError(error, '初始化Neo4j编辑器应用失败');
            return false;
        }
    },
    
    /**
     * 初始化工具函数模块
     * @private
     */
    _initializeUtils: function() {
        utils.debugLog('初始化工具函数模块');
        // utils模块已经在导入时自动初始化
    },
    
    /**
     * 初始化API管理器
     * @private
     */
    _initializeApiManager: function() {
        utils.debugLog('初始化API管理器');
        apiManager.initialize();
    },
    
    /**
     * 初始化右键菜单
     * @private
     */
    _initializeContextMenu: function() {
        utils.debugLog('初始化右键菜单管理器');
        contextMenuManager.initialize();
    },
    
    /**
     * 初始化图形视图
     * @private
     */
    _initializeGraphViews: function() {
        utils.debugLog('初始化图形视图');
        
        // 等待DOM加载完成
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => {
                cytoscapeModule.initializeDualViews();
            });
        } else {
            // DOM已加载完成，直接初始化
            setTimeout(() => {
                cytoscapeModule.initializeDualViews();
            }, 100); // 小延迟确保所有DOM元素都已渲染
        }
    },
    
    /**
     * 设置全局事件监听
     * @private
     */
    _setupGlobalEventListeners: function() {
        utils.debugLog('设置全局事件监听');
        
        // 窗口大小变化时重新调整布局
        window.addEventListener('resize', utils.debounce(() => {
            if (window.cyTree) {
                window.cyTree.resize();
            }
            if (window.cyNetwork) {
                window.cyNetwork.resize();
            }
        }, 200));
        
        // 页面卸载前的处理
        window.addEventListener('beforeunload', (event) => {
            // 检查是否有未保存的更改
            if (this.hasUnsavedChanges()) {
                event.preventDefault();
                event.returnValue = '您有未保存的更改，确定要离开吗？';
                return event.returnValue;
            }
        });
    },
    
    /**
     * 初始化UI组件
     * @private
     */
    _initializeUIComponents: function() {
        utils.debugLog('初始化UI组件');
        
        // 为主要操作按钮添加事件监听
        this._setupToolbarButtons();
        
        // 设置面板切换功能
        this._setupPanelSwitching();
    },
    
    /**
     * 设置工具栏按钮
     * @private
     */
    _setupToolbarButtons: function() {
        // 清空图表按钮
        const clearBtn = document.getElementById('clear-graph-btn');
        if (clearBtn) {
            clearBtn.addEventListener('click', () => {
                if (confirm('确定要清空所有图表数据吗？此操作不可撤销。')) {
                    cytoscapeModule.clearAllViews();
                    this._setUnsavedChanges(false);
                }
            });
        }
        
        // 保存图表按钮
        const saveBtn = document.getElementById('save-graph-btn');
        if (saveBtn) {
            saveBtn.addEventListener('click', () => {
                this.saveGraph();
            });
        }
        
        // 加载图表按钮
        const loadBtn = document.getElementById('load-graph-btn');
        if (loadBtn) {
            loadBtn.addEventListener('click', () => {
                this.loadGraph();
            });
        }
    },
    
    /**
     * 设置面板切换
     * @private
     */
    _setupPanelSwitching: function() {
        // 这里可以添加面板切换的逻辑
        // 例如：属性面板、关系面板等的显示/隐藏
    },
    
    /**
     * 加载初始数据
     * @private
     */
    _loadInitialData: function() {
        utils.debugLog('尝试加载初始数据');
        
        // 从URL参数或localStorage加载初始数据
        const urlParams = new URLSearchParams(window.location.search);
        const initialDataParam = urlParams.get('initialData');
        
        if (initialDataParam) {
            try {
                const initialData = JSON.parse(decodeURIComponent(initialDataParam));
                this._loadGraphData(initialData);
            } catch (error) {
                utils.handleError(error, '解析初始数据失败');
            }
        } else {
            // 尝试从localStorage加载上次保存的数据
            this._loadFromLocalStorage();
        }
    },
    
    /**
     * 保存图表数据
     */
    saveGraph: function() {
        try {
            utils.debugLog('保存图表数据');
            
            const graphData = cytoscapeModule.getGraphData();
            
            // 保存到localStorage
            localStorage.setItem('neo4jEditorGraphData', JSON.stringify(graphData));
            
            // 调用API保存到服务器（如果需要）
            apiManager.saveGraph(graphData)
                .then(() => {
                    utils.showToast('图表数据已成功保存');
                    this._setUnsavedChanges(false);
                })
                .catch(error => {
                    utils.handleError(error, '保存到服务器失败，但已保存到本地');
                    // 即使服务器保存失败，也标记为已保存（本地保存成功）
                    this._setUnsavedChanges(false);
                });
            
        } catch (error) {
            utils.handleError(error, '保存图表数据失败');
        }
    },
    
    /**
     * 加载图表数据
     */
    loadGraph: function() {
        try {
            utils.debugLog('加载图表数据');
            
            // 先尝试从API加载
            apiManager.loadGraph()
                .then(graphData => {
                    this._loadGraphData(graphData);
                    utils.showToast('成功从服务器加载图表数据');
                    this._setUnsavedChanges(false);
                })
                .catch(error => {
                    utils.handleError(error, '从服务器加载失败，尝试从本地加载');
                    // 如果API加载失败，尝试从localStorage加载
                    this._loadFromLocalStorage();
                });
            
        } catch (error) {
            utils.handleError(error, '加载图表数据失败');
        }
    },
    
    /**
     * 从localStorage加载数据
     * @private
     */
    _loadFromLocalStorage: function() {
        try {
            const savedData = localStorage.getItem('neo4jEditorGraphData');
            if (savedData) {
                const graphData = JSON.parse(savedData);
                this._loadGraphData(graphData);
                utils.showToast('已加载上次保存的图表数据');
                this._setUnsavedChanges(false);
            }
        } catch (error) {
            utils.handleError(error, '从本地加载数据失败');
        }
    },
    
    /**
     * 加载图表数据到视图
     * @private
     * @param {Object} graphData - 图表数据
     */
    _loadGraphData: function(graphData) {
        if (!graphData || (!graphData.nodes && !graphData.edges)) {
            utils.showToast('没有有效的图表数据可加载');
            return;
        }
        
        // 清空现有数据
        cytoscapeModule.clearAllViews();
        
        // 添加节点数据
        if (graphData.nodes && Array.isArray(graphData.nodes)) {
            graphData.nodes.forEach(node => {
                cytoscapeModule.addNodeToViews(node);
            });
        }
        
        // 添加边数据
        if (graphData.edges && Array.isArray(graphData.edges)) {
            graphData.edges.forEach(edge => {
                cytoscapeModule.addEdgeToViews(edge);
            });
        }
        
        // 重新布局
        if (window.cyTree) {
            window.cyTree.layout({ name: 'breadthfirst', directed: true }).run();
        }
        if (window.cyNetwork) {
            window.cyNetwork.layout({ name: 'cose' }).run();
        }
    },
    
    /**
     * 检查是否有未保存的更改
     * @returns {boolean} 是否有未保存的更改
     */
    hasUnsavedChanges: function() {
        return window._hasUnsavedChanges === true;
    },
    
    /**
     * 设置未保存更改状态
     * @private
     * @param {boolean} value - 未保存更改状态
     */
    _setUnsavedChanges: function(value) {
        window._hasUnsavedChanges = value;
        
        // 更新页面标题，显示未保存状态
        const originalTitle = window._originalPageTitle || document.title;
        if (!window._originalPageTitle) {
            window._originalPageTitle = originalTitle;
        }
        
        if (value) {
            document.title = '• ' + originalTitle;
        } else {
            document.title = originalTitle;
        }
    },
    
    /**
     * 关闭应用
     */
    shutdown: function() {
        utils.debugLog('关闭Neo4j编辑器应用');
        
        // 清理资源
        this.initialized = false;
        
        // 移除事件监听器
        // 这里可以添加清理代码
        
        utils.showToast('Neo4j编辑器已关闭');
    }
};

// 为了向后兼容，暴露应用初始化函数到window对象
window.initializeNeo4jEditor = window.initializeNeo4jEditor || function() {
    return appModule.initialize();
};

// 暴露常用方法
window.saveNeo4jGraph = window.saveNeo4jGraph || function() {
    appModule.saveGraph();
};

window.loadNeo4jGraph = window.loadNeo4jGraph || function() {
    appModule.loadGraph();
};

// 当DOM加载完成时自动初始化
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        // 延迟初始化，确保所有依赖都已加载
        setTimeout(() => {
            appModule.initialize();
        }, 500);
    });
} else {
    // 如果DOM已经加载完成，立即初始化
    setTimeout(() => {
        appModule.initialize();
    }, 500);
}

module.exports = appModule;
