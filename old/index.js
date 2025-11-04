/**
 * Neo4j Editor - 主入口文件
 * 导入并初始化所有模块
 */

// 确保全局命名空间存在
window.neo4jEditor = window.neo4jEditor || {};
window.neo4jEditor.initialized = false;
window.neo4jEditor.modules = {};

/**
 * 加载模块
 * @param {string} moduleName - 模块名称
 * @param {Function} callback - 回调函数
 */
window.loadModule = function(moduleName, callback) {
    console.log(`Neo4j Editor: Loading module ${moduleName}`);
    
    // 定义模块路径映射
    const modulePaths = {
        'core/init': 'core/init.js',
        'utils': 'utils/utils.js',
        'data/graphDataManager': 'data/graphDataManager.js',
        'views/viewManager': 'views/viewManager.js',
        'views/viewSync': 'views/viewSync.js',
        'ui/contextMenuManager': 'ui/contextMenuManager.js',
        'neo4j/apiManager': 'neo4j/apiManager.js',
        'components/propertyEditor': 'components/propertyEditor.js'
    };
    
    const path = modulePaths[moduleName];
    if (!path) {
        console.error(`Neo4j Editor: Module ${moduleName} not found`);
        if (callback) callback(false);
        return;
    }
    
    // 检查是否已加载
    if (window.neo4jEditor.modules[moduleName]) {
        console.log(`Neo4j Editor: Module ${moduleName} already loaded`);
        if (callback) callback(true);
        return;
    }
    
    // 创建脚本元素
    const script = document.createElement('script');
    script.src = path;
    script.async = true;
    
    script.onload = function() {
        console.log(`Neo4j Editor: Module ${moduleName} loaded successfully`);
        window.neo4jEditor.modules[moduleName] = true;
        if (callback) callback(true);
    };
    
    script.onerror = function() {
        console.error(`Neo4j Editor: Failed to load module ${moduleName}`);
        if (callback) callback(false);
    };
    
    // 添加到文档
    document.head.appendChild(script);
};

/**
 * 顺序加载模块
 * @param {Array} modules - 模块数组
 * @param {Function} onComplete - 完成回调
 */
window.loadModulesSequentially = function(modules, onComplete) {
    let index = 0;
    
    function loadNext() {
        if (index >= modules.length) {
            if (onComplete) onComplete();
            return;
        }
        
        loadModule(modules[index], function(success) {
            if (success) {
                index++;
                loadNext();
            } else {
                // 即使失败也继续加载其他模块
                console.warn(`Neo4j Editor: Continuing despite failed module ${modules[index]}`);
                index++;
                loadNext();
            }
        });
    }
    
    loadNext();
};

/**
 * 初始化应用
 */
window.initializeApp = function() {
    console.log('Neo4j Editor: Starting initialization');
    
    if (window.neo4jEditor.initialized) {
        console.log('Neo4j Editor: Already initialized');
        return;
    }
    
    // 定义模块加载顺序
    const modules = [
        'utils',
        'core/init',
        'data/graphDataManager',
        'views/viewManager',
        'views/viewSync',
        'ui/contextMenuManager',
        'neo4j/apiManager',
        'components/propertyEditor'
    ];
    
    // 加载模块
    loadModulesSequentially(modules, function() {
        console.log('Neo4j Editor: All modules loaded, initializing components');
        
        try {
            // 初始化核心系统
            if (typeof window.neo4jEditor.initializeSystems === 'function') {
                window.neo4jEditor.initializeSystems();
            }
            
            // 初始化Neo4j API
            if (typeof window.initializeNeo4jApi === 'function') {
                window.initializeNeo4jApi();
            }
            
            // 初始化视图
            if (typeof window.viewManager !== 'undefined' && typeof window.viewManager.init === 'function') {
                window.viewManager.init();
            }
            
            // 初始化上下文菜单
            if (typeof window.initializeContextMenu === 'function') {
                window.initializeContextMenu();
            }
            
            // 初始化属性编辑器
            const propertyEditorContainer = document.getElementById('property-editor');
            if (propertyEditorContainer && typeof window.initializePropertyEditor === 'function') {
                window.initializePropertyEditor(propertyEditorContainer);
            }
            
            // 初始化双视图
            if (typeof window.initializeDualViews === 'function') {
                window.initializeDualViews({
                    treeStyle: getDefaultTreeStyle(),
                    networkStyle: getDefaultNetworkStyle()
                });
            }
            
            // 从本地存储加载数据
            if (typeof window.loadGraphFromLocalStorage === 'function') {
                window.loadGraphFromLocalStorage();
            }
            
            window.neo4jEditor.initialized = true;
            console.log('Neo4j Editor: Application initialized successfully');
            
            // 显示成功消息
            if (typeof window.showToast === 'function') {
                window.showToast('Neo4j编辑器已成功加载');
            }
            
        } catch (error) {
            console.error('Neo4j Editor: Error during initialization:', error);
            
            if (typeof window.showToast === 'function') {
                window.showToast('编辑器初始化失败: ' + error.message, 'error');
            }
        }
    });
};

/**
 * 获取默认树视图样式
 * @returns {Array} Cytoscape样式数组
 */
function getDefaultTreeStyle() {
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
}

/**
 * 获取默认网络图视图样式
 * @returns {Array} Cytoscape样式数组
 */
function getDefaultNetworkStyle() {
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
}

/**
 * 注册全局事件监听器
 */
function registerGlobalEventListeners() {
    // 页面加载完成后初始化
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', window.initializeApp);
    } else {
        // 如果DOM已经加载完成，直接初始化
        setTimeout(window.initializeApp, 0);
    }
    
    // 窗口大小变化时调整视图
    window.addEventListener('resize', function() {
        if (window.viewManager && typeof window.viewManager.adjustViewSize === 'function') {
            window.viewManager.adjustViewSize();
        }
    });
    
    // 页面卸载前保存数据
    window.addEventListener('beforeunload', function() {
        if (typeof window.saveGraphToLocalStorage === 'function') {
            window.saveGraphToLocalStorage();
        }
    });
}

// 注册全局事件监听器
registerGlobalEventListeners();

// 提供常用的便捷函数

/**
 * 选择节点
 * @param {Object} node - Cytoscape节点对象
 */
window.selectNode = function(node) {
    console.log('Neo4j Editor: Node selected', node.id());
    
    // 清除其他选择
    if (window.cyTree) {
        window.cyTree.elements().unselect();
    }
    if (window.cyNetwork) {
        window.cyNetwork.elements().unselect();
    }
    
    // 选中当前节点
    node.select();
    
    // 显示节点属性
    if (typeof window.showNodeProperties === 'function') {
        window.showNodeProperties(node);
    }
};

/**
 * 选择边
 * @param {Object} edge - Cytoscape边对象
 */
window.selectEdge = function(edge) {
    console.log('Neo4j Editor: Edge selected', edge.id());
    
    // 清除其他选择
    if (window.cyTree) {
        window.cyTree.elements().unselect();
    }
    if (window.cyNetwork) {
        window.cyNetwork.elements().unselect();
    }
    
    // 选中当前边
    edge.select();
    
    // 显示边属性
    if (typeof window.showEdgeProperties === 'function') {
        window.showEdgeProperties(edge);
    }
};

/**
 * 清空图表
 */
window.clearGraph = function() {
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
        if (typeof window.initializePropertyEditor === 'function' && 
            window.neo4jEditor.propertyEditorContainer) {
            window.initializePropertyEditor(window.neo4jEditor.propertyEditorContainer);
        }
        
        // 显示提示
        if (typeof window.showToast === 'function') {
            window.showToast('图表已清空');
        }
    }
};

/**
 * 导出图表数据
 */
window.exportGraphData = function() {
    console.log('Neo4j Editor: Exporting graph data');
    
    const sharedData = window.neo4jEditor.sharedGraphData || { nodes: [], edges: [] };
    const dataStr = JSON.stringify(sharedData, null, 2);
    
    // 创建下载链接
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
    const exportFileDefaultName = `neo4j-graph-${new Date().toISOString().slice(0,10)}.json`;
    
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
};

/**
 * 导入图表数据
 */
window.importGraphData = function() {
    // 创建文件输入元素
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    
    input.onchange = function(event) {
        const file = event.target.files[0];
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
                    if (typeof window.showToast === 'function') {
                        window.showToast(`成功导入 ${data.nodes ? data.nodes.length : 0} 个节点和 ${data.edges ? data.edges.length : 0} 条关系`);
                    }
                    
                } catch (error) {
                    console.error('Neo4j Editor: Error parsing imported data:', error);
                    
                    if (typeof window.showToast === 'function') {
                        window.showToast('导入失败: 无效的JSON文件', 'error');
                    }
                }
            };
            
            reader.readAsText(file);
        }
    };
    
    input.click();
};
