/**
 * 视图管理器 - 处理双视图切换和同步
 */

// 安全创建命名空间
window.neo4jEditor = window.neo4jEditor || {};
// 确保viewManager可以在全局访问
window.viewManager = window.viewManager || {};
// 调试日志
console.log('viewManager命名空间已安全创建');
// 初始化neo4jEditor.views命名空间
window.neo4jEditor.views = window.neo4jEditor.views || {};

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

// 安全创建视图管理器模块
const viewManagerModule = {
    // 初始化状态
    initialized: false,
    
    /**
     * 当前视图模式
     * @type {string} 'split', 'tree', 'network'
     */
    currentViewMode: 'split',
    
    /**
     * 调整视图大小
     */
    adjustViewSize: function() {
        try {
            if (window.cyTree) window.cyTree.resize();
            if (window.cyNetwork) window.cyNetwork.resize();
            if (window.cy) window.cy.resize();
        } catch (error) {
            console.error('Neo4j Editor: Error adjusting view size:', error);
        }
    },
    
    /**
     * 重新定位所有提示框
     */
    repositionToasts: function() {
        try {
            const toasts = document.querySelectorAll('.neo4j-toast, .neo4j-progress-toast');
            let offset = 10;
            
            toasts.forEach(toast => {
                toast.style.top = `${offset}px`;
                offset += toast.offsetHeight + 10;
            });
        } catch (error) {
            console.error('Neo4j Editor: Error repositioning toasts:', error);
        }
    },

    /**
     * 显示进度通知
     * @param {string} message - 提示消息
     * @returns {string|null} 提示框ID或null
     */
    showProgressToast: function(message) {
        try {
            // 安全检查message参数
            if (!message || typeof message !== 'string') {
                message = '操作进行中...';
            }
            
            // 生成唯一ID
            const toastId = `progress-toast-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
            
            // 创建进度提示框
            const toast = document.createElement('div');
            toast.id = toastId;
            toast.className = 'neo4j-progress-toast position-fixed top-3 right-3 px-4 py-3 rounded-md shadow-lg z-50 bg-blue-600 text-white transition-all duration-300 transform translate-x-full opacity-0';
            
            // 进度条HTML
            toast.innerHTML = `
                <div class="toast-message mb-2 font-medium">${message}</div>
                <div class="progress-bar bg-blue-300 h-2 rounded-full overflow-hidden">
                    <div class="progress-fill bg-white h-full rounded-full transition-all duration-300" style="width: 0%"></div>
                </div>
                <div class="progress-text text-xs mt-1 text-blue-100">0%</div>
            `;
            
            if (document.body) {
                document.body.appendChild(toast);
            }
            
            // 重新定位所有提示框
            this.repositionToasts();
            
            // 显示动画
            setTimeout(() => {
                if (toast) {
                    toast.classList.remove('translate-x-full', 'opacity-0');
                    toast.classList.add('translate-x-0', 'opacity-100');
                }
            }, 10);
            
            return toastId;
        } catch (error) {
            console.error('Neo4j Editor: Error showing progress toast:', error);
            return null;
        }
    },

    /**
     * 更新进度通知
     * @param {string} toastId - 提示框ID
     * @param {number} progress - 进度值(0-100)
     * @param {string} [message] - 可选的更新消息
     * @returns {boolean} 更新是否成功
     */
    updateProgressToast: function(toastId, progress, message) {
        try {
            // 安全检查参数
            if (!toastId || typeof toastId !== 'string') return false;
            if (typeof progress !== 'number' || progress < 0 || progress > 100) {
                progress = 0;
            }
            
            const toast = document.getElementById(toastId);
            if (!toast) return false;
            
            // 更新进度条
            const progressFill = toast.querySelector('.progress-fill');
            const progressText = toast.querySelector('.progress-text');
            const toastMessage = toast.querySelector('.toast-message');
            
            if (progressFill) progressFill.style.width = `${progress}%`;
            if (progressText) progressText.textContent = `${progress}%`;
            if (message && toastMessage && typeof message === 'string') toastMessage.textContent = message;
            
            return true;
        } catch (error) {
            console.error('Neo4j Editor: Error updating progress toast:', error);
            return false;
        }
    },

    /**
     * 移除进度通知
     * @param {string} toastId - 提示框ID
     */
    removeProgressToast: function(toastId) {
        try {
            if (!toastId || typeof toastId !== 'string') return;
            
            const toast = document.getElementById(toastId);
            if (!toast) return;
            
            // 添加移除动画
            toast.classList.add('translate-x-full', 'opacity-0');
            
            setTimeout(() => {
                if (toast.parentNode) {
                    toast.parentNode.removeChild(toast);
                    // 重新定位剩余的提示框
                    this.repositionToasts();
                }
            }, 300);
        } catch (error) {
            console.error('Neo4j Editor: Error removing progress toast:', error);
        }
    },

    /**
     * 初始化视图管理器
     * @returns {boolean} 初始化是否成功
     */
    initialize: function() {
        try {
            console.log('Neo4j Editor: Initializing view manager');
            console.log('🔄 初始化视图管理器...');
            console.log('当前viewManager状态:', window.viewManager);
            console.log('neo4jEditor.modules状态:', window.neo4jEditor && window.neo4jEditor.modules || '未初始化');
            
            // 确保全局sharedGraphData存在
            if (!window.neo4jEditor) {
                window.neo4jEditor = {};
            }
            
            if (!window.neo4jEditor.sharedGraphData) {
                window.neo4jEditor.sharedGraphData = { nodes: [], edges: [] };
            }
            
            // 设置视图模式按钮事件
            this.setupViewModeButtons();
            
            // 设置缩放控制按钮事件
            this.setupZoomControlListeners();
            
            // 初始更新元素计数
            this.updateElementCounts();
            
            // 设置标签过滤UI
            this.setupLabelFilterUI();
            
            // 设置保存按钮
            this.setupSaveButtons();
            
            // 设置批量关系编辑UI
            this.setupBatchRelationEditor();
            
            // 设置视图事件监听器，实现实时同步
            this.setupViewEventListeners();
            
            // 标记为已初始化
            this.initialized = true;
            
            // 如果模块已经通过registerModule注册，更新其状态
            if (window.neo4jEditor && window.neo4jEditor.modules && window.neo4jEditor.modules['views/viewManager']) {
                window.neo4jEditor.modules['views/viewManager'].initialized = true;
                console.log('✅ 视图管理器模块已注册到neo4jEditor.modules');
            }
            
            // 确保viewManager可全局访问
            window.viewManager = viewManagerModule;
            console.log('✅ 视图管理器已导出到全局window.viewManager');
            console.log('✅ View manager initialized successfully');
            return true;
        } catch (error) {
            console.error('❌ Neo4j Editor: Error initializing view manager:', error);
            return false;
        }
    },
    
    /**
     * init函数 - initialize函数的别名，用于兼容验证要求
     * @returns {boolean} 初始化是否成功
     */
    init: function() {
        return this.initialize();
    },

    /**
     * 设置视图模式按钮事件
     */
    setupViewModeButtons: function() {
        // 设置视图模式切换函数
        window.switchViewMode = function(mode) {
            console.log(`Neo4j Editor: Switching view mode to ${mode}`);
            
            // 安全检查模式参数
            const validModes = ['split', 'tree', 'network'];
            if (!validModes.includes(mode)) {
                console.warn('Neo4j Editor: Invalid view mode:', mode);
                mode = 'split';
            }
            
            // 更新当前模式
            viewManagerModule.currentViewMode = mode;
            
            // 获取视图容器
            const treeContainer = document.getElementById('cy-tree');
            const networkContainer = document.getElementById('cy-network');
            
            if (!treeContainer || !networkContainer) {
                console.error('Neo4j Editor: View container not found');
                return;
            }
            
            // 重置所有按钮样式
            const splitBtn = document.getElementById('split-view-btn');
            const treeBtn = document.getElementById('tree-only-btn');
            const networkBtn = document.getElementById('network-only-btn');
            
            [splitBtn, treeBtn, networkBtn].forEach(btn => {
                if (btn) {
                    btn.classList.remove('bg-accent');
                    btn.classList.remove('active');
                }
            });
            
            // 根据模式设置容器和按钮样式
            switch (mode) {
                case 'split':
                    // 分割视图 - 两个容器都显示，各占50%
                    treeContainer.style.display = 'block';
                    networkContainer.style.display = 'block';
                    treeContainer.style.width = '50%';
                    networkContainer.style.width = '50%';
                    
                    if (splitBtn) {
                        splitBtn.classList.add('active');
                    }
                    break;
                    
                case 'tree':
                    // 仅树视图 - 树容器100%，网络图容器隐藏
                    treeContainer.style.display = 'block';
                    networkContainer.style.display = 'none';
                    treeContainer.style.width = '100%';
                    
                    if (treeBtn) {
                        treeBtn.classList.add('active');
                    }
                    break;
                    
                case 'network':
                    // 仅网络图视图 - 网络图容器100%，树容器隐藏
                    treeContainer.style.display = 'none';
                    networkContainer.style.display = 'block';
                    networkContainer.style.width = '100%';
                    
                    if (networkBtn) {
                        networkBtn.classList.add('active');
                    }
                    break;
            }
            
            // 调整视图大小
            setTimeout(() => {
                if (window.cyTree) window.cyTree.resize();
                if (window.cyNetwork) window.cyNetwork.resize();
                if (window.cy) window.cy.resize();
            }, 100);
            
            console.log(`Neo4j Editor: View mode switch completed - ${mode}`);
        };
        
        // 注册changeViewMode向后兼容函数
        if (typeof window.changeViewMode === 'undefined' && typeof createBackwardCompatibilityFunction === 'function') {
            window.changeViewMode = createBackwardCompatibilityFunction(
                'changeViewMode',
                window.switchViewMode,
                null
            );
        }
        
        // 添加按钮点击事件
            if (typeof document !== 'undefined' && typeof document.getElementById !== 'undefined') {
                const splitBtn = document.getElementById('split-view-btn');
                const treeBtn = document.getElementById('tree-only-btn');
                const networkBtn = document.getElementById('network-only-btn');
                
                if (splitBtn) splitBtn.onclick = () => window.switchViewMode('split');
                if (treeBtn) treeBtn.onclick = () => window.switchViewMode('tree');
                if (networkBtn) networkBtn.onclick = () => window.switchViewMode('network');
            }
    },

    /**
     * 设置缩放控制按钮事件
     */
    setupZoomControlListeners: function() {
        // 缩放控制函数
        window.zoomIn = function() {
            if (window.cyTree) window.cyTree.zoom({ level: window.cyTree.zoom() * 1.2 });
            if (window.cyNetwork) window.cyNetwork.zoom({ level: window.cyNetwork.zoom() * 1.2 });
            // 更新缩放百分比显示
            viewManagerModule.updateZoomPercentage();
        };
        
        window.zoomOut = function() {
            if (window.cyTree) window.cyTree.zoom({ level: window.cyTree.zoom() * 0.8 });
            if (window.cyNetwork) window.cyNetwork.zoom({ level: window.cyNetwork.zoom() * 0.8 });
            // 更新缩放百分比显示
            viewManagerModule.updateZoomPercentage();
        };
        
        window.resetZoom = function() {
            if (window.cyTree) window.cyTree.zoom({ level: 1 });
            if (window.cyNetwork) window.cyNetwork.zoom({ level: 1 });
            // 更新缩放百分比显示
            viewManagerModule.updateZoomPercentage();
        };
        
        // 添加按钮事件 - 使用HTML中已有的特定视图缩放按钮
        if (typeof document !== 'undefined' && typeof document.getElementById !== 'undefined') {
            // 树视图缩放按钮
            const zoomInTreeBtn = document.getElementById('zoom-in-tree-btn');
            const zoomOutTreeBtn = document.getElementById('zoom-out-tree-btn');
            const fitTreeBtn = document.getElementById('fit-tree-btn');
            
            // 网络图视图缩放按钮
            const zoomInNetworkBtn = document.getElementById('zoom-in-network-btn');
            const zoomOutNetworkBtn = document.getElementById('zoom-out-network-btn');
            const fitNetworkBtn = document.getElementById('fit-network-btn');
            
            // 通用缩放按钮（如果存在）
            const zoomInBtn = document.getElementById('zoom-in-btn');
            const zoomOutBtn = document.getElementById('zoom-out-btn');
            const resetZoomBtn = document.getElementById('reset-zoom-btn');
            
            // 为树视图按钮添加事件
            if (zoomInTreeBtn) zoomInTreeBtn.onclick = window.zoomIn;
            if (zoomOutTreeBtn) zoomOutTreeBtn.onclick = window.zoomOut;
            if (fitTreeBtn) fitTreeBtn.onclick = function() {
                if (window.cyTree) window.cyTree.fit();
                viewManagerModule.updateZoomPercentage();
            };
            
            // 为网络图按钮添加事件
            if (zoomInNetworkBtn) zoomInNetworkBtn.onclick = window.zoomIn;
            if (zoomOutNetworkBtn) zoomOutNetworkBtn.onclick = window.zoomOut;
            if (fitNetworkBtn) fitNetworkBtn.onclick = function() {
                if (window.cyNetwork) window.cyNetwork.fit();
                viewManagerModule.updateZoomPercentage();
            };
            
            // 为通用按钮添加事件（如果存在）
            if (zoomInBtn) zoomInBtn.onclick = window.zoomIn;
            if (zoomOutBtn) zoomOutBtn.onclick = window.zoomOut;
            if (resetZoomBtn) resetZoomBtn.onclick = window.resetZoom;
        }
        
        // 设置滚轮缩放
        this.setupWheelZoom();
    },
    
    /**
     * 设置滚轮缩放功能
     */
    setupWheelZoom: function() {
        // 为现有实例设置滚轮事件监听器，确保缩放同步
        if (window.cyTree) {
            window.cyTree.on('zoom', function() {
                viewManagerModule.updateZoomPercentage();
            });
        }
        
        if (window.cyNetwork) {
            window.cyNetwork.on('zoom', function() {
                viewManagerModule.updateZoomPercentage();
            });
        }
    },
    
    /**
     * 更新缩放百分比显示
     */
    updateZoomPercentage: function() {
        try {
            // 获取当前活动视图的缩放级别
            let zoomLevel = 1;
            const viewMode = this.currentViewMode || 'split';
            
            if (viewMode === 'tree' && window.cyTree) {
                zoomLevel = window.cyTree.zoom();
            } else if (viewMode === 'network' && window.cyNetwork) {
                zoomLevel = window.cyNetwork.zoom();
            } else if (window.cyTree) { // 默认使用树视图
                zoomLevel = window.cyTree.zoom();
            }
            
            // 计算百分比
            const percentage = Math.round(zoomLevel * 100);
            
            // 更新所有缩放百分比显示元素（如果存在）
            const zoomPercentElements = document.querySelectorAll('.zoom-percentage');
            zoomPercentElements.forEach(el => {
                el.textContent = percentage + '%';
            });
            
        } catch (error) {
            console.error('Neo4j Editor: 更新缩放百分比失败:', error);
        }
    },

    /**
     * 更新元素计数
     */
    updateElementCounts: function() {
        try {
            const sharedData = window.neo4jEditor && window.neo4jEditor.sharedGraphData ? 
                window.neo4jEditor.sharedGraphData : { nodes: [], edges: [] };
            
            // 安全检查数据结构
            const nodes = Array.isArray(sharedData.nodes) ? sharedData.nodes : [];
            const edges = Array.isArray(sharedData.edges) ? sharedData.edges : [];
            
            // 更新DOM元素
            const treeStats = document.getElementById('tree-stats');
            const networkStats = document.getElementById('network-stats');
            
            if (treeStats) {
                treeStats.textContent = `Tree View: ${nodes.length} nodes, ${edges.filter(e => e && e.data && e.data.type === 'CHILD_OF').length} edges`;
            }
            
            if (networkStats) {
                networkStats.textContent = `Network View: ${nodes.length} nodes, ${edges.filter(e => e && e.data && e.data.type === 'RELATES_TO').length} edges`;
            }
            
            console.log('Neo4j Editor: Element counts updated');
        } catch (err) {
            console.error('Neo4j Editor: Error updating element counts:', err);
        }
    },

    /**
     * 设置标签过滤UI
     */
    setupLabelFilterUI: function() {
        // 实现标签过滤UI相关功能
    },

    /**
     * 设置保存按钮
     */
    setupSaveButtons: function() {
        // 实现保存按钮相关功能
    },

    /**
     * 设置批量关系编辑UI
     */
    setupBatchRelationEditor: function() {
        // 实现批量关系编辑UI相关功能
    },

    /**
     * 设置视图事件监听器，实现实时同步
     */
    setupViewEventListeners: function() {
        // 实现视图事件监听器相关功能
    }
};

// 导出到window对象
window.viewManager = viewManagerModule;

// 定义向后兼容函数映射数组
const backwardCompatibilityMapping = [
    { deprecatedName: 'adjustViewSize', newFunction: viewManagerModule.adjustViewSize, context: viewManagerModule },
    { deprecatedName: 'showProgressToast', newFunction: viewManagerModule.showProgressToast, context: viewManagerModule },
    { deprecatedName: 'updateProgressToast', newFunction: viewManagerModule.updateProgressToast, context: viewManagerModule },
    { deprecatedName: 'removeProgressToast', newFunction: viewManagerModule.removeProgressToast, context: viewManagerModule }
];

// 注册向后兼容函数
backwardCompatibilityMapping.forEach(funcInfo => {
    try {
        // 确保函数名称有效
        if (!funcInfo.deprecatedName || typeof funcInfo.newFunction !== 'function') {
            console.error(`注册向后兼容函数失败: 无效的函数信息`, funcInfo);
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
        console.error(`注册向后兼容函数 ${funcInfo.deprecatedName || '未知函数'} 失败:`, error);
    }
});

// 确保modules对象存在
if (window.neo4jEditor && typeof window.neo4jEditor.modules === 'undefined') {
    window.neo4jEditor.modules = {};
}

// 定义模块名称和注册信息
const moduleName = 'views/viewManager';
const moduleRegistrationInfo = {
    name: moduleName,
    version: '1.1.0',
    dependencies: ['core/init'],
    module: viewManagerModule
};

// 使用统一的模块注册方法
if (window.neo4jEditor && typeof window.neo4jEditor.registerModule === 'function') {
    try {
        window.neo4jEditor.registerModule(moduleRegistrationInfo);
        console.log(`Neo4j Editor: views/viewManager module registered successfully`);
    } catch (registrationError) {
        console.error(`Neo4j Editor: Failed to register views/viewManager module:`, registrationError);
        
        // 降级方案：直接注册到modules对象
        try {
            if (typeof window.neo4jEditor.modules[moduleName] === 'undefined') {
                window.neo4jEditor.modules[moduleName] = {
                    name: moduleRegistrationInfo.name,
                    version: moduleRegistrationInfo.version,
                    initialized: viewManagerModule.initialized,
                    dependencies: moduleRegistrationInfo.dependencies,
                    module: moduleRegistrationInfo.module
                };
                console.log(`Neo4j Editor: views/viewManager module registered via fallback to modules object`);
            }
        } catch (fallbackError) {
            // 终极降级方案：直接挂载到全局
            if (typeof window.appModule === 'undefined') {
                window.appModule = {};
            }
            window.appModule.viewManager = viewManagerModule;
            console.log(`Neo4j Editor: views/viewManager module registered via final fallback to appModule`);
        }
    }
} else {
    // 降级方案：直接挂载到全局
    if (typeof window.appModule === 'undefined') {
        window.appModule = {};
    }
    window.appModule.viewManager = viewManagerModule;
    console.log(`Neo4j Editor: views/viewManager module registered via fallback to appModule`);
}

// 多模块系统支持 - 确保兼容性
// 将viewManagerModule导出到全局
window.viewManager = viewManagerModule;

// CommonJS 模块支持
if (typeof module !== 'undefined' && typeof module.exports !== 'undefined') {
    module.exports = viewManagerModule;
}

// ES 模块支持
if (typeof exports !== 'undefined' && typeof exports === 'object') {
    Object.defineProperty(exports, '__esModule', { value: true });
    if (typeof module !== 'undefined') module.exports = viewManagerModule;
    exports.default = viewManagerModule;
}

// AMD 模块支持
if (typeof define === 'function' && define.amd) {
    define(['core/init'], function() {
        return viewManagerModule;
    });
}