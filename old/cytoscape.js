/**
 * Cytoscape图表管理模块
 */

/**
 * 创建Cytoscape实例的基础样式
 */
window.getBasicStyles = function() {
    return [
        {
            selector: 'node',
            style: {
                'background-color': '#2196F3',
                'label': 'data(label)',
                'color': '#ffffff',
                'width': 40,
                'height': 40,
                'font-size': '12px',
                'text-valign': 'center',
                'text-halign': 'center'
            }
        },
        {
            selector: 'node[test_node="true"]',
            style: {
                'background-color': '#FF0000',
                'color': '#FFFFFF',
                'width': 60,
                'height': 60,
                'font-size': '14px'
            }
        },
        {
            selector: 'edge',
            style: {
                'width': 3,
                'line-color': '#ccc',
                'target-arrow-color': '#ccc',
                'target-arrow-shape': 'triangle'
            }
        },
        {
            selector: 'node:selected',
            style: {
                'border-width': 3,
                'border-color': '#ffffff',
                'border-opacity': 0.8
            }
        },
        {
            selector: 'edge:selected',
            style: {
                'width': 4,
                'line-color': '#ffffff',
                'target-arrow-color': '#ffffff'
            }
        }
    ];
};

/**
 * 初始化双视图Cytoscape实例
 */
window.initializeDualViews = function() {
    // 检查Cytoscape是否已加载
    if (typeof cytoscape === 'undefined') {
        window.showToast('错误：Cytoscape库未加载', 'error');
        return false;
    }
    
    // 获取容器元素
    var treeContainer = document.getElementById('cy-tree');
    var networkContainer = document.getElementById('cy-network');
    
    if (!treeContainer || !networkContainer) {
        window.showToast('错误：未找到图表容器元素', 'error');
        return false;
    }
    
    // 创建基础样式
    var basicStyles = getBasicStyles();
    
    try {
        // 创建Tree视图实例
        if (!window.cyTree) {
            window.cyTree = cytoscape({
                container: treeContainer,
                style: basicStyles,
                elements: { nodes: [], edges: [] },
                layout: { 
                    name: 'breadthfirst',
                    directed: true,
                    padding: 30
                }
            });
          }
        
        // 创建Network视图实例
        if (!window.cyNetwork) {
            window.cyNetwork = cytoscape({
                container: networkContainer,
                style: basicStyles,
                elements: { nodes: [], edges: [] },
                layout: { 
                    name: 'cose',
                    idealEdgeLength: 100,
                    nodeOverlap: 20,
                    refresh: 20,
                    fit: true,
                    padding: 30,
                    randomize: false,
                    componentSpacing: 100,
                    nodeRepulsion: 100000,
                    edgeElasticity: 100,
                    nestingFactor: 5,
                    gravity: 80,
                    numIter: 1000,
                    initialTemp: 200,
                    coolingFactor: 0.95,
                    minTemp: 1.0
                }
            });
          }
        
        // 创建共享数据存储
        if (!window.sharedGraphData) {
            window.sharedGraphData = { 
                nodes: [], 
                edges: [],
                selectedElement: null
            };
        }
        
        // 初始化右键菜单、键盘事件和元素事件监听
        if (typeof window.initializeContextMenu === 'function') {
            window.initializeContextMenu();
        }
        if (typeof window.setupKeyboardEvents === 'function') {
            window.setupKeyboardEvents();
        }
        if (typeof window.setupElementContextMenu === 'function') {
            window.setupElementContextMenu();
        }
        
        // 初始化事件监听
        initializeEventListeners(window.cyTree, window.cyNetwork);
        
        return true;
    } catch (error) {
        handleError('初始化Cytoscape实例失败', error);
        return false;
    }
}

/**
 * 创建备用Cytoscape实例（简化版）
 */
window.createFallbackCytoscapeInstances = function() {
    // 检查基础依赖
    if (typeof cytoscape === 'undefined') {
        window.showToast('错误：Cytoscape库未加载', 'error');
        return false;
    }
    
    var basicStyles = getBasicStyles();
    var treeContainer = document.getElementById('cy-tree');
    var networkContainer = document.getElementById('cy-network');
    
    if (!treeContainer || !networkContainer) {
        window.showToast('错误：未找到图表容器元素', 'error');
        return false;
    }
    
    try {
        // 创建tree实例
        if (!window.cyTree) {
            window.cyTree = cytoscape({
                container: treeContainer,
                style: basicStyles,
                elements: { nodes: [], edges: [] },
                layout: { name: 'cose' }
            });
          }
        
        // 创建network实例
        if (!window.cyNetwork) {
            window.cyNetwork = cytoscape({
                container: networkContainer,
                style: basicStyles,
                elements: { nodes: [], edges: [] },
                layout: { name: 'cose' }
            });
          }
        
        // 确保共享数据存在
        if (!window.sharedGraphData) {
            window.sharedGraphData = { nodes: [], edges: [], selectedElement: null };
        }
        
        // 初始化右键菜单、键盘事件和元素事件监听
        if (typeof window.initializeContextMenu === 'function') {
            window.initializeContextMenu();
        }
        if (typeof window.setupKeyboardEvents === 'function') {
            window.setupKeyboardEvents();
        }
        if (typeof window.setupElementContextMenu === 'function') {
            window.setupElementContextMenu();
        }
        
        // 初始化事件监听
        initializeEventListeners(window.cyTree, window.cyNetwork);
        
        return true;
    } catch (error) {
        handleError('创建备用Cytoscape实例失败', error);
        return false;
    }
}

/**
 * 同步两个视图的数据
 * @param {Array} nodes - 节点数组
 * @param {Array} edges - 边数组
 */
window.syncViews = function(nodes, edges) {
    // 设置默认参数值
    if (!nodes) nodes = [];
    if (!edges) edges = [];
    if (window.cyTree && window.cyNetwork) {
        // 清空现有元素
        window.cyTree.remove(window.cyTree.elements());
        window.cyNetwork.remove(window.cyNetwork.elements());
        
        // 添加新元素
            if (nodes.length > 0 || edges.length > 0) {
                // 合并节点和边数组
                var allElements = [];
                for (var i = 0; i < nodes.length; i++) {
                    allElements.push(nodes[i]);
                }
                for (var j = 0; j < edges.length; j++) {
                    allElements.push(edges[j]);
                }
                window.cyTree.add(allElements);
                // 创建新数组以避免引用问题
                var allElementsCopy = [];
                for (var k = 0; k < allElements.length; k++) {
                    allElementsCopy.push(JSON.parse(JSON.stringify(allElements[k])));
                }
                window.cyNetwork.add(allElementsCopy);
            
            // 重新运行布局
            window.cyTree.layout({ name: 'breadthfirst' }).run();
            window.cyNetwork.layout({ name: 'cose' }).run();
        }
        
        // 更新共享数据
        var selectedElement = null;
        if (window.sharedGraphData && window.sharedGraphData.selectedElement) {
            selectedElement = window.sharedGraphData.selectedElement;
        }
        window.sharedGraphData = {
            nodes: nodes,
            edges: edges,
            selectedElement: selectedElement
        };
        
        // 更新元素计数
        updateElementCounts();
    }
}

/**
 * 更新界面上的元素计数
 */
window.updateElementCounts = function() {
    var nodeCountEl = document.getElementById('node-count');
    var edgeCountEl = document.getElementById('edge-count');
    
    if (nodeCountEl && edgeCountEl) {
        var nodeCount = 0;
        var edgeCount = 0;
        
        if (window.sharedGraphData && window.sharedGraphData.nodes && window.sharedGraphData.edges) {
            nodeCount = window.sharedGraphData.nodes.length;
            edgeCount = window.sharedGraphData.edges.length;
        } else if (window.cyTree) {
            nodeCount = window.cyTree.nodes().length;
            edgeCount = window.cyTree.edges().length;
        }
        
        nodeCountEl.textContent = nodeCount + ' nodes';
            edgeCountEl.textContent = edgeCount + ' edges';
    }
}

/**
 * 在两个视图中添加节点
 * @param {Object} node - 节点对象
 */
window.addNodeToViews = function(node) {
    if (window.cyTree && window.cyNetwork) {
        try {
            // 复制节点对象以避免引用问题
            var nodeCopy = JSON.parse(JSON.stringify(node));
            
            window.cyTree.add(node);
            window.cyNetwork.add(nodeCopy);
            
            // 更新共享数据
            ensureSharedGraphData();
            window.sharedGraphData.nodes.push(node);
            
            // 更新计数
            updateElementCounts();
            
            return true;
        } catch (error) {
            handleError('添加节点失败', error);
            return false;
        }
    }
    return false;
}

/**
 * 确保共享数据对象正确初始化
 */
window.ensureSharedGraphData = function() {
    if (!window.sharedGraphData) {
        window.sharedGraphData = { nodes: [], edges: [], selectedElement: null };
    } else {
        if (!Array.isArray(window.sharedGraphData.nodes)) {
            window.sharedGraphData.nodes = [];
        }
        if (!Array.isArray(window.sharedGraphData.edges)) {
            window.sharedGraphData.edges = [];
        }
    }
};

/**
 * 初始化事件监听
 */
function initializeEventListeners(cyTree, cyNetwork) {
    // 节点选中事件同步
    if (cyTree) {
        cyTree.on('select', 'node', function(event) {
            var element = event.target;
            synchronizeSelection(element, cyTree);
            // 显示节点属性面板
            if (typeof window.selectNode === 'function') {
                window.selectNode(element);
            }
        });
        
        cyTree.on('unselect', 'node', function() {
            if (window.cyNetwork) {
                window.cyNetwork.nodes().unselect();
            }
        });
        
        // 边选中事件
        cyTree.on('select', 'edge', function(event) {
            var element = event.target;
            synchronizeSelection(element, cyTree);
            // 显示边属性面板
            if (typeof window.selectEdge === 'function') {
                window.selectEdge(element);
            }
        });
        
        cyTree.on('unselect', 'edge', function() {
            if (window.cyNetwork) {
                window.cyNetwork.edges().unselect();
            }
        });
    }
    
    if (cyNetwork) {
        cyNetwork.on('select', 'node', function(event) {
            var element = event.target;
            synchronizeSelection(element, cyNetwork);
            // 显示节点属性面板
            if (typeof window.selectNode === 'function') {
                window.selectNode(element);
            }
        });
        
        cyNetwork.on('unselect', 'node', function() {
            if (window.cyTree) {
                window.cyTree.nodes().unselect();
            }
        });
        
        // 边选中事件
        cyNetwork.on('select', 'edge', function(event) {
            var element = event.target;
            synchronizeSelection(element, cyNetwork);
            // 显示边属性面板
            if (typeof window.selectEdge === 'function') {
                window.selectEdge(element);
            }
        });
        
        cyNetwork.on('unselect', 'edge', function() {
            if (window.cyTree) {
                window.cyTree.edges().unselect();
            }
        });
    }
}

/**
 * 同步选中状态
 */
function synchronizeSelection(element, sourceCy) {
    var targetCy = sourceCy === window.cyTree ? window.cyNetwork : window.cyTree;
    
    if (targetCy) {
        // 根据元素类型取消对应的选中
        if (element.isNode()) {
            targetCy.nodes().unselect();
        } else if (element.isEdge()) {
            targetCy.edges().unselect();
        }
        
        // 选中对应元素
        const correspondingElement = targetCy.getElementById(element.id());
        if (correspondingElement) {
            correspondingElement.select();
        }
    }
    
    // 更新共享数据中的选中元素
    if (window.sharedGraphData) {
        window.sharedGraphData.selectedElement = element;
    }
}

/**
 * 在两个视图中添加边
 * @param {Object} edge - 边对象
 */
window.addEdgeToViews = function(edge) {
    if (window.cyTree && window.cyNetwork) {
        var edgeCopy = JSON.parse(JSON.stringify(edge));
        
        window.cyTree.add(edge);
        window.cyNetwork.add(edgeCopy);
        
        // 更新共享数据
        ensureSharedGraphData();
        window.sharedGraphData.edges.push(edge);
        
        // 更新计数
        updateElementCounts();
        
        return true;
    }
    return false;
}

/**
 * 在两个视图中删除元素
 * @param {string} elementId - 元素ID
 */
window.removeElementFromViews = function(elementId) {
    if (window.cyTree && window.cyNetwork) {
        // 删除视图中的元素
        var treeElement = window.cyTree.getElementById(elementId);
        var networkElement = window.cyNetwork.getElementById(elementId);
        
        if (treeElement) treeElement.remove();
        if (networkElement) networkElement.remove();
        
        // 更新共享数据
        if (window.sharedGraphData) {
            // 使用传统循环替代filter方法
            var filteredNodes = [];
            for (var i = 0; i < window.sharedGraphData.nodes.length; i++) {
                if (window.sharedGraphData.nodes[i].data.id !== elementId) {
                    filteredNodes.push(window.sharedGraphData.nodes[i]);
                }
            }
            window.sharedGraphData.nodes = filteredNodes;
            
            var filteredEdges = [];
            for (var j = 0; j < window.sharedGraphData.edges.length; j++) {
                var edge = window.sharedGraphData.edges[j];
                if (edge.data.id !== elementId && edge.data.source !== elementId && edge.data.target !== elementId) {
                    filteredEdges.push(edge);
                }
            }
            window.sharedGraphData.edges = filteredEdges;
        }
        
        // 更新计数
        updateElementCounts();
        
        return true;
    }
    return false;
}

/**
 * 清空所有视图
 */
window.clearAllViews = function() {
    if (window.cyTree && window.cyNetwork) {
        window.cyTree.remove(window.cyTree.elements());
        window.cyNetwork.remove(window.cyNetwork.elements());
        
        // 重置共享数据
        window.sharedGraphData = { nodes: [], edges: [], selectedElement: null };
        
        // 更新计数
        updateElementCounts();
        
        window.showToast('所有元素已清空');
    }
}

/**
 * 获取图数据（用于内部使用）
 * @returns {Object} 包含nodes和edges的对象
 */
function getGraphData() {
    if (window.sharedGraphData) {
        return {
            nodes: window.sharedGraphData.nodes,
            edges: window.sharedGraphData.edges
        };
    } else if (window.cyTree) {
        return {
            nodes: window.cyTree.nodes().jsons(),
            edges: window.cyTree.edges().jsons()
        };
    }
    return { nodes: [], edges: [] };
};

// 导出模块对象到全局
window.cytoscapeModule = {
    getBasicStyles: window.getBasicStyles,
    initializeDualViews: window.initializeDualViews,
    createFallbackCytoscapeInstances: window.createFallbackCytoscapeInstances,
    syncViews: window.syncViews,
    updateElementCounts: window.updateElementCounts,
    addNodeToViews: window.addNodeToViews,
    addEdgeToViews: window.addEdgeToViews,
    removeElementFromViews: window.removeElementFromViews,
    clearAllViews: window.clearAllViews,
    getGraphData: getGraphData
};