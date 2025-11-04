/**
 * Neo4j Editor - 视图同步管理模块
 * 处理双视图之间的数据同步和事件协调
 * 根据开发计划实现：层级树视图(CHILD_OF)和同父节点关系网视图(RELATES_TO)
 */

// 创建安全的命名空间
if (typeof window.neo4jEditor === 'undefined') {
    window.neo4jEditor = {};
}

// 统一初始化全局共享数据
if (!window.neo4jEditor.sharedGraphData) {
    window.neo4jEditor.sharedGraphData = {
        nodes: [],
        edges: [],
        deletedEdges: [], // 存储用户手动删除的关系，防止自动重建
        lastSync: new Date().toISOString()
    };
}

// 初始化视图模式
if (!window.neo4jEditor.currentViewMode) {
    window.neo4jEditor.currentViewMode = 'dual';
}

// 创建安全的命名空间
if (typeof window.neo4jEditor === 'undefined') {
    window.neo4jEditor = {};
}

/**
 * 创建向后兼容函数
 * @param {Function} originalFunction - 原始函数
 * @param {string} oldName - 旧函数名
 * @param {string} newName - 新函数名
 * @returns {Function} 包装后的兼容函数
 */
function createBackwardCompatibilityFunction(originalFunction, oldName, newName) {
    return function() {
        console.warn(`Neo4j Editor: Using deprecated global function ${oldName}. Please use ${newName} instead.`);
        return originalFunction.apply(this, arguments);
    };
}

/**
 * 视图同步模块
 */
const viewSyncModule = {
    initialized: false,
    
    /**
     * 同步图数据到不同视图
     * 按照开发计划要求：
     * 1. 树视图：显示完整的所有节点父子关系（CHILD_OF关系）
     * 2. 同父节点关系网：显示当前节点的所有同父节点，以及与他们的RELATES_TO关系
     * @param {Object} graphData - 可选，包含节点和边的数据对象
     * @returns {boolean} 是否同步成功
     */
    syncData: function(graphData) {
        console.log('Neo4j Editor: Starting to sync graph data to dual views');
        
        try {
            // 参数验证
            if (graphData && typeof graphData !== 'object') {
                console.error('Neo4j Editor: Invalid graphData parameter');
                return false;
            }
            
            const sharedData = window.neo4jEditor.sharedGraphData;
            
            // 更新共享数据（如果提供了新数据）
            if (graphData) {
                if (graphData.nodes && Array.isArray(graphData.nodes)) {
                    // 确保每个节点都有唯一的code属性
                    graphData.nodes.forEach(node => {
                        if (!node.data.code) {
                            console.warn('Neo4j Editor: Node missing code attribute:', node.data.id);
                        }
                    });
                    sharedData.nodes = [...graphData.nodes];
                }
                if (graphData.edges && Array.isArray(graphData.edges)) {
                    sharedData.edges = [...graphData.edges];
                }
            }
            
            // 应用标签过滤
            let filteredNodes = sharedData.nodes || [];
            if (typeof window.filterNodesByLabels === 'function') {
                filteredNodes = window.filterNodesByLabels(filteredNodes);
            }
            
            // 处理树视图 - 显示CHILD_OF关系
            if (window.cyTree) {
                console.log('Neo4j Editor: Syncing data to tree view (CHILD_OF relationships)');
                
                try {
                    // 过滤树视图的边（只显示CHILD_OF关系）
                    const treeEdges = (sharedData.edges || []).filter(edge => 
                        edge.data && edge.data.type === 'CHILD_OF'
                    );
                    
                    // 更新树视图
                    this._updateView(window.cyTree, filteredNodes, treeEdges);
                    
                    // 应用树形布局
                    window.cyTree.layout({
                        name: 'klay',
                        klay: {
                            direction: 'DOWN',
                            spacing: 100,
                            nodeDimensionsIncludeLabels: true
                        },
                        animate: true,
                        animationDuration: 500
                    }).run();
                } catch (layoutErr) {
                    console.error('Neo4j Editor: Failed to apply tree view layout:', layoutErr);
                }
            }
            
            // 处理网络图视图 - 显示RELATES_TO关系
            if (window.cyNetwork) {
                console.log('Neo4j Editor: Syncing data to network view (RELATES_TO relationships)');
                
                try {
                    // 过滤网络图视图的边（只显示RELATES_TO关系）
                    const networkEdges = (sharedData.edges || []).filter(edge => 
                        edge.data && edge.data.type === 'RELATES_TO'
                    );
                    
                    // 更新网络图视图
                    this._updateView(window.cyNetwork, filteredNodes, networkEdges);
                    
                    // 应用网络布局
                    window.cyNetwork.layout({
                        name: 'cose',
                        animate: true,
                        animationDuration: 1000,
                        randomize: true,
                        idealEdgeLength: 150,
                        nodeOverlap: 20,
                        refresh: 20,
                        fit: true,
                        padding: 30
                    }).run();
                } catch (layoutErr) {
                    console.error('Neo4j Editor: Failed to apply network view layout:', layoutErr);
                }
            }
            
            // 更新元素计数
            this._updateElementCount();
            
            console.log('Neo4j Editor: Graph data sync completed');
            return true;
        } catch (error) {
            console.error('Neo4j Editor: Error syncing graph data:', error);
            return false;
        }
    },
    
    /**
     * 初始化双视图
     * @param {Object} options - 初始化选项
     * @returns {boolean} 是否初始化成功
     */
    initializeDualViews: function(options) {
        console.log('Neo4j Editor: Initializing dual views');
        
        options = options || {};
        
        try {
            // 验证Cytoscape库是否存在
            if (typeof cytoscape !== 'function') {
                console.error('Neo4j Editor: Cytoscape library not found');
                return false;
            }
            
            // 获取视图容器
            const treeContainer = document.getElementById('cy-tree');
            const networkContainer = document.getElementById('cy-network');
            
            if (!treeContainer || !networkContainer) {
                console.error('Neo4j Editor: View containers not found');
                return false;
            }
            
            // 定义Cytoscape默认样式
            const defaultNodeStyle = {
                'background-color': '#666',
                'label': 'data(label)',
                'color': '#fff',
                'text-outline-width': 2,
                'text-outline-color': '#666',
                'width': '60px',
                'height': '60px',
                'font-size': '14px',
                'text-valign': 'center',
                'text-halign': 'center'
            };
            
            const defaultEdgeStyle = {
                'width': 3,
                'line-color': '#ccc',
                'target-arrow-color': '#ccc',
                'target-arrow-shape': 'triangle',
                'curve-style': 'bezier',
                'label': 'data(type)',
                'font-size': '10px'
            };
            
            // 初始化树视图
            window.cyTree = cytoscape({
                container: treeContainer,
                boxSelectionEnabled: true,
                autounselectify: false,
                style: options.treeStyle || [
                    // 节点样式
                    {
                        selector: 'node',
                        style: defaultNodeStyle
                    },
                    // 边样式
                    {
                        selector: 'edge',
                        style: defaultEdgeStyle
                    },
                    // 选中样式
                    {
                        selector: ':selected',
                        style: {
                            'background-color': '#0088cc',
                            'line-color': '#0088cc',
                            'target-arrow-color': '#0088cc',
                            'source-arrow-color': '#0088cc'
                        }
                    }
                ],
                layout: {
                    name: 'cose',
                    rankDir: 'TB'
                }
            });
            
            // 初始化网络图视图
            window.cyNetwork = cytoscape({
                container: networkContainer,
                boxSelectionEnabled: true,
                autounselectify: false,
                style: options.networkStyle || [
                    // 节点样式
                    {
                        selector: 'node',
                        style: defaultNodeStyle
                    },
                    // 边样式
                    {
                        selector: 'edge',
                        style: defaultEdgeStyle
                    },
                    // 选中样式
                    {
                        selector: ':selected',
                        style: {
                            'background-color': '#0088cc',
                            'line-color': '#0088cc',
                            'target-arrow-color': '#0088cc',
                            'source-arrow-color': '#0088cc'
                        }
                    }
                ],
                layout: {
                    name: 'cose'
                }
            });
            
            // 保存对实例的引用
            window.neo4jEditor.cytoscapeInstances = {
                tree: window.cyTree,
                network: window.cyNetwork
            };
            
            // 设置事件监听器以同步操作
            this._setupViewEventListeners();
            
            // 初始化共享数据
            if (!window.neo4jEditor.sharedGraphData) {
                window.neo4jEditor.sharedGraphData = {
                    nodes: [],
                    edges: []
                };
            }
            
            console.log('Neo4j Editor: Dual views initialized successfully');
            return true;
        } catch (error) {
            console.error('Neo4j Editor: Error initializing dual views:', error);
            return false;
        }
    },
    
    /**
     * 设置视图事件监听器
     * @private
     */
    _setupViewEventListeners: function() {
        if (!window.cyTree || !window.cyNetwork) {
            console.warn('Neo4j Editor: Cannot set up event listeners - views not initialized');
            return;
        }
        
        console.log('Neo4j Editor: Setting up view event listeners');
        
        // 为树视图设置事件监听
        window.cyTree.on('tap', 'node', function(evt) {
            const node = evt.target;
            viewSyncModule._handleNodeSelection(node);
        });
        
        window.cyTree.on('tap', 'edge', function(evt) {
            const edge = evt.target;
            viewSyncModule._handleEdgeSelection(edge);
        });
        
        window.cyTree.on('drag', function(evt) {
            viewSyncModule._syncElementPosition(evt.target);
        });
        
        window.cyTree.on('add', function(evt) {
            viewSyncModule._propagateChange('add', evt.target);
        });
        
        window.cyTree.on('remove', function(evt) {
            viewSyncModule._propagateChange('remove', evt.target);
        });
        
        window.cyTree.on('data', function(evt) {
            viewSyncModule._propagateChange('update', evt.target);
        });
        
        // 为网络图视图设置事件监听
        window.cyNetwork.on('tap', 'node', function(evt) {
            const node = evt.target;
            viewSyncModule._handleNodeSelection(node);
        });
        
        window.cyNetwork.on('tap', 'edge', function(evt) {
            const edge = evt.target;
            viewSyncModule._handleEdgeSelection(edge);
        });
        
        window.cyNetwork.on('drag', function(evt) {
            viewSyncModule._syncElementPosition(evt.target);
        });
        
        window.cyNetwork.on('add', function(evt) {
            viewSyncModule._propagateChange('add', evt.target);
        });
        
        window.cyNetwork.on('remove', function(evt) {
            viewSyncModule._propagateChange('remove', evt.target);
        });
        
        window.cyNetwork.on('data', function(evt) {
            viewSyncModule._propagateChange('update', evt.target);
        });
        
        // 监听自定义数据更新事件
        document.addEventListener('neo4j-editor:data-update', function(event) {
            console.log('Neo4j Editor: Received data update event:', event.detail?.eventName);
            
            // 可以根据事件类型执行特定操作
            switch(event.detail?.eventName) {
                case 'nodeAdded':
                case 'nodeDeleted':
                case 'edgeAdded':
                case 'edgeDeleted':
                case 'dataImported':
                case 'dataCleared':
                    // 同步更新两个视图
                    viewSyncModule.syncData();
                    break;
                case 'viewModeChanged':
                    // 视图模式切换
                    if (event.detail?.mode) {
                        viewSyncModule.switchViewMode(event.detail.mode);
                    }
                    break;
                // 其他事件处理...
            }
        });
        
        // 监听视图模式切换事件
        document.addEventListener('neo4j-editor:view-mode-switch', function(event) {
            const mode = event.detail?.mode;
            if (mode) {
                viewSyncModule.switchViewMode(mode);
            }
        });
        
        // 监听选中元素变化事件
        document.addEventListener('neo4j-editor:selection-changed', function(event) {
            const elementId = event.detail?.elementId;
            if (elementId) {
                viewSyncModule._syncSelectionById(elementId);
            }
        });
    },
    
    /**
     * 处理节点选择
     * @private
     * @param {Object} node - 选中的节点
     */
    _handleNodeSelection: function(node) {
        try {
            const nodeId = node.data('id');
            if (!nodeId) {
                return;
            }
            
            // 同步选择
            this._syncSelectionById(nodeId);
            
            // 触发节点选择事件
            const event = new CustomEvent('neo4j-editor:node-selected', {
                detail: { nodeId: nodeId, nodeData: node.data() }
            });
            document.dispatchEvent(event);
        } catch (error) {
            console.error('Neo4j Editor: Error handling node selection:', error);
        }
    },
    
    /**
     * 处理边选择
     * @private
     * @param {Object} edge - 选中的边
     */
    _handleEdgeSelection: function(edge) {
        try {
            const edgeId = edge.data('id');
            if (!edgeId) {
                return;
            }
            
            // 同步选择
            this._syncSelectionById(edgeId);
            
            // 触发边选择事件
            const event = new CustomEvent('neo4j-editor:edge-selected', {
                detail: { edgeId: edgeId, edgeData: edge.data() }
            });
            document.dispatchEvent(event);
        } catch (error) {
            console.error('Neo4j Editor: Error handling edge selection:', error);
        }
    },
    
    /**
     * 自动维护同父节点关系网
     * 当节点添加到某个父节点下时，自动与该父节点的所有其他子节点建立关系
     * 按照开发计划要求：确保同一父节点下的所有节点之间都有双向的RELATES_TO关系
     * @param {string} nodeId - 节点ID
     * @param {string} parentId - 父节点ID
     * @returns {boolean} 是否维护成功
     */
    maintainSiblingRelationships: function(nodeId, parentId) {
        console.log(`Neo4j Editor: Maintaining sibling relationships for node ${nodeId} with parent ${parentId}`);
        
        try {
            // 参数验证
            if (!nodeId || !parentId) {
                console.error('Neo4j Editor: Node ID and parent ID are required');
                return false;
            }
            
            const sharedData = window.neo4jEditor.sharedGraphData;
            if (!sharedData.deletedEdges) {
                sharedData.deletedEdges = [];
            }
            
            // 找到所有与同一父节点相连的其他子节点
            const siblingNodeIds = [];
            
            (sharedData.edges || []).forEach(edge => {
                if (edge.data && 
                    edge.data.type === 'CHILD_OF' && 
                    edge.data.target === parentId && 
                    edge.data.source !== nodeId) {
                    siblingNodeIds.push(edge.data.source);
                }
            });
            
            // 为每个兄弟节点创建RELATES_TO关系
            siblingNodeIds.forEach(siblingId => {
                // 检查是否已经存在关系
                const hasExistingEdge = (sharedData.edges || []).some(edge => 
                    edge.data && 
                    edge.data.type === 'RELATES_TO' && 
                    ((edge.data.source === nodeId && edge.data.target === siblingId) ||
                     (edge.data.source === siblingId && edge.data.target === nodeId))
                );
                
                // 检查是否在删除记录中
                const isDeleted = sharedData.deletedEdges.some(deleted => 
                    deleted.type === 'RELATES_TO' && 
                    ((deleted.source === nodeId && deleted.target === siblingId) ||
                     (deleted.source === siblingId && deleted.target === nodeId))
                );
                
                if (!hasExistingEdge && !isDeleted) {
                    // 确保generateUniqueId函数可用
                    const generateId = typeof window.generateUniqueId === 'function' ? 
                                      window.generateUniqueId : 
                                      (prefix) => `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
                    
                    // 创建双向关系
                    sharedData.edges.push({
                        group: 'edges',
                        data: {
                            id: generateId('rel'),
                            source: nodeId,
                            target: siblingId,
                            type: 'RELATES_TO',
                            label: 'RELATES_TO'
                        }
                    });
                    
                    sharedData.edges.push({
                        group: 'edges',
                        data: {
                            id: generateId('rel'),
                            source: siblingId,
                            target: nodeId,
                            type: 'RELATES_TO',
                            label: 'RELATES_TO'
                        }
                    });
                }
            });
            
            // 同步更新视图
            this.syncData();
            
            console.log(`Neo4j Editor: Sibling relationships maintained for node ${nodeId}`);
            return true;
        } catch (error) {
            console.error('Neo4j Editor: Error maintaining sibling relationships:', error);
            return false;
        }
    },
    
    /**
     * 当节点父节点变更时，自动更新其在关系网中的连接
     * @param {string} nodeId - 节点ID
     * @param {string} oldParentId - 旧父节点ID
     * @param {string} newParentId - 新父节点ID
     * @returns {boolean} 是否更新成功
     */
    updateNodeParent: function(nodeId, oldParentId, newParentId) {
        console.log(`Neo4j Editor: Updating node ${nodeId} parent from ${oldParentId} to ${newParentId}`);
        
        try {
            // 参数验证
            if (!nodeId) {
                console.error('Neo4j Editor: Node ID is required');
                return false;
            }
            
            const sharedData = window.neo4jEditor.sharedGraphData;
            
            // 检查循环引用
            if (newParentId && this._checkCircularReference(nodeId, newParentId)) {
                console.error('Neo4j Editor: Circular reference detected');
                return false;
            }
            
            // 删除旧的CHILD_OF关系
            if (oldParentId) {
                sharedData.edges = (sharedData.edges || []).filter(edge => 
                    !(edge.data && edge.data.type === 'CHILD_OF' && 
                      edge.data.source === nodeId && edge.data.target === oldParentId)
                );
                
                // 删除与旧兄弟节点的RELATES_TO关系
                const oldSiblings = (sharedData.edges || [])
                    .filter(edge => 
                        edge.data && edge.data.type === 'CHILD_OF' && 
                        edge.data.target === oldParentId && edge.data.source !== nodeId
                    )
                    .map(edge => edge.data.source);
                
                sharedData.edges = (sharedData.edges || []).filter(edge => {
                    if (edge.data && edge.data.type === 'RELATES_TO') {
                        const connectsToOldSibling = oldSiblings.some(siblingId => 
                            (edge.data.source === nodeId && edge.data.target === siblingId) ||
                            (edge.data.source === siblingId && edge.data.target === nodeId)
                        );
                        
                        if (connectsToOldSibling) {
                            // 记录到已删除关系，防止自动重建
                            sharedData.deletedEdges.push({
                                type: 'RELATES_TO',
                                source: edge.data.source,
                                target: edge.data.target
                            });
                            return false;
                        }
                    }
                    return true;
                });
            }
            
            // 创建新的CHILD_OF关系
            if (newParentId) {
                // 确保generateUniqueId函数可用
                const generateId = typeof window.generateUniqueId === 'function' ? 
                                  window.generateUniqueId : 
                                  (prefix) => `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
                
                sharedData.edges.push({
                    group: 'edges',
                    data: {
                        id: generateId('child'),
                        source: nodeId,
                        target: newParentId,
                        type: 'CHILD_OF',
                        label: 'CHILD_OF'
                    }
                });
                
                // 维护与新兄弟节点的RELATES_TO关系
                this.maintainSiblingRelationships(nodeId, newParentId);
            }
            
            // 同步更新视图
            this.syncData();
            
            console.log(`Neo4j Editor: Node ${nodeId} parent updated successfully`);
            return true;
        } catch (error) {
            console.error('Neo4j Editor: Error updating node parent:', error);
            return false;
        }
    },
    
    /**
     * 检查是否存在循环引用
     * @private
     * @param {string} nodeId - 节点ID
     * @param {string} parentId - 父节点ID
     * @returns {boolean} 是否存在循环引用
     */
    _checkCircularReference: function(nodeId, parentId) {
        try {
            if (!nodeId || !parentId) {
                return false;
            }
            
            const sharedData = window.neo4jEditor.sharedGraphData;
            const visited = new Set();
            let currentId = parentId;
            
            // 沿着父节点链向上查找，如果回到当前节点，则存在循环
            while (currentId) {
                if (currentId === nodeId) {
                    return true;
                }
                
                if (visited.has(currentId)) {
                    break; // 防止无限循环
                }
                
                visited.add(currentId);
                
                // 查找当前节点的父节点
                const parentEdge = (sharedData.edges || []).find(edge => 
                    edge.data && edge.data.type === 'CHILD_OF' && edge.data.source === currentId
                );
                
                currentId = parentEdge ? parentEdge.data.target : null;
            }
            
            return false;
        } catch (error) {
            console.error('Neo4j Editor: Error checking circular reference:', error);
            return false;
        }
    },
    
    /**
     * 清除视图内容
     */
    clearViews: function() {
        try {
            if (window.cyTree) {
                window.cyTree.elements().remove();
            }
            if (window.cyNetwork) {
                window.cyNetwork.elements().remove();
            }
            console.log('Neo4j Editor: Both views cleared');
        } catch (error) {
            console.error('Neo4j Editor: Error clearing views:', error);
        }
    },
    
    /**
     * 销毁视图实例
     */
    destroyViews: function() {
        try {
            if (window.cyTree) {
                window.cyTree.destroy();
                window.cyTree = null;
            }
            if (window.cyNetwork) {
                window.cyNetwork.destroy();
                window.cyNetwork = null;
            }
            if (window.neo4jEditor) {
                window.neo4jEditor.cytoscapeInstances = null;
            }
            console.log('Neo4j Editor: Both views destroyed');
        } catch (error) {
            console.error('Neo4j Editor: Error destroying views:', error);
        }
    },
    
    /**
     * 获取视图的统计信息
     * @returns {Object} 视图统计信息
     */
    getViewStats: function() {
        const stats = {
            tree: { nodes: 0, edges: 0 },
            network: { nodes: 0, edges: 0 }
        };
        
        try {
            if (window.cyTree) {
                stats.tree.nodes = window.cyTree.nodes().length;
                stats.tree.edges = window.cyTree.edges().length;
            }
            
            if (window.cyNetwork) {
                stats.network.nodes = window.cyNetwork.nodes().length;
                stats.network.edges = window.cyNetwork.edges().length;
            }
        } catch (error) {
            console.error('Neo4j Editor: Error getting view stats:', error);
        }
        
        return stats;
    },
    
    /**
     * 初始化视图同步管理器
     * @returns {boolean} 是否初始化成功
     */
    initialize: function() {
        try {
            if (this.initialized) {
                console.log('Neo4j Editor: View sync manager already initialized');
                return true;
            }
            
            console.log('Neo4j Editor: View sync manager initialized');
            this.initialized = true;
            
            // 创建全局引用，便于访问
            window.viewSync = viewSyncModule;
            
            // 初始化视图模式
            if (!window.neo4jEditor.currentViewMode) {
                window.neo4jEditor.currentViewMode = 'dual';
            }
            
            // 初始化共享数据
            if (!window.neo4jEditor.sharedGraphData) {
                window.neo4jEditor.sharedGraphData = {
                    nodes: [],
                    edges: []
                };
            }
            
            return true;
        } catch (error) {
            console.error('Neo4j Editor: Error initializing view sync manager:', error);
            return false;
        }
    },
    
    /**
     * 切换视图模式
     * @param {string} mode - 视图模式: 'tree', 'network', 'dual'
     * @returns {boolean} 是否切换成功
     */
    switchViewMode: function(mode) {
        console.log(`Neo4j Editor: Switching view mode to ${mode}`);
        
        try {
            // 参数验证
            const validModes = ['tree', 'network', 'dual'];
            if (!validModes.includes(mode)) {
                console.error(`Neo4j Editor: Invalid view mode: ${mode}`);
                return false;
            }
            
            // 更新当前模式
            if (!window.neo4jEditor) {
                window.neo4jEditor = {};
            }
            window.neo4jEditor.currentViewMode = mode;
            
            // 获取容器元素
            const treeContainer = document.getElementById('cy-tree');
            const networkContainer = document.getElementById('cy-network');
            
            if (!treeContainer || !networkContainer) {
                console.error('Neo4j Editor: View containers not found');
                return false;
            }
            
            // 根据模式设置容器显示/隐藏
            switch(mode) {
                case 'tree':
                    treeContainer.style.display = 'block';
                    treeContainer.style.width = '100%';
                    treeContainer.style.height = '100%';
                    networkContainer.style.display = 'none';
                    break;
                case 'network':
                    treeContainer.style.display = 'none';
                    networkContainer.style.display = 'block';
                    networkContainer.style.width = '100%';
                    networkContainer.style.height = '100%';
                    break;
                case 'dual':
                    treeContainer.style.display = 'block';
                    treeContainer.style.width = '50%';
                    treeContainer.style.height = '100%';
                    networkContainer.style.display = 'block';
                    networkContainer.style.width = '50%';
                    networkContainer.style.height = '100%';
                    break;
            }
            
            // 触发视图模式变化事件
            const event = new CustomEvent('neo4j-editor:view-mode-changed', {
                detail: { mode: mode }
            });
            document.dispatchEvent(event);
            
            // 重新应用布局
            this._applyLayouts();
            
            console.log(`Neo4j Editor: View mode switched to ${mode} successfully`);
            return true;
        } catch (error) {
            console.error(`Neo4j Editor: Error switching view mode to ${mode}:`, error);
            return false;
        }
    },
    
    /**
     * 应用布局到视图
     * @private
     */
    _applyLayouts: function() {
        try {
            // 应用树视图布局
            if (window.cyTree && window.cyTree.nodes().length > 0) {
                window.cyTree.layout({
                    name: 'klay',
                    klay: {
                        direction: 'DOWN',
                        spacing: 100,
                        nodeDimensionsIncludeLabels: true
                    }
                }).run();
            }
            
            // 应用网络图视图布局
            if (window.cyNetwork && window.cyNetwork.nodes().length > 0) {
                window.cyNetwork.layout({
                    name: 'cose',
                    animate: true,
                    animationDuration: 500
                }).run();
            }
        } catch (error) {
            console.error('Neo4j Editor: Error applying layouts:', error);
        }
    },
    
    /**
     * 同步元素位置
     * @private
     * @param {Object} element - Cytoscape元素
     */
    _syncElementPosition: function(element) {
        try {
            if (!element || !element.data || !window.cyTree || !window.cyNetwork) {
                return;
            }
            
            const elementId = element.data('id');
            if (!elementId) {
                return;
            }
            
            // 确定源视图和目标视图
            const sourceView = element.cy();
            const targetView = (sourceView === window.cyTree) ? window.cyNetwork : window.cyTree;
            
            // 查找目标视图中的对应元素
            const targetElement = targetView.getElementById(elementId);
            if (targetElement.length === 0) {
                return;
            }
            
            // 同步位置
            if (element.isNode()) {
                const position = element.position();
                targetElement.position(position);
            }
        } catch (error) {
            console.error('Neo4j Editor: Error syncing element position:', error);
        }
    },
    
    /**
     * 传播更改到另一个视图
     * 增强版：支持add、remove、update操作，并根据关系类型决定是否在另一视图中显示
     * @private
     * @param {string} action - 操作类型: 'add', 'remove', 'update'
     * @param {Object} element - Cytoscape元素
     */
    _propagateChange: function(action, element) {
        try {
            if (!element || !element.data || !window.cyTree || !window.cyNetwork) {
                return;
            }
            
            const elementId = element.data('id');
            if (!elementId) {
                return;
            }
            
            // 确定源视图和目标视图
            const sourceView = element.cy();
            const targetView = (sourceView === window.cyTree) ? window.cyNetwork : window.cyTree;
            
            // 获取元素关系类型（如果是边）
            const relationshipType = element.isEdge() ? element.data('type') : null;
            
            // 根据关系类型决定是否需要同步到另一视图
            let shouldSync = true;
            if (element.isEdge()) {
                if (sourceView === window.cyTree && relationshipType !== 'CHILD_OF') {
                    shouldSync = false; // 树视图中只有CHILD_OF关系需要同步
                } else if (sourceView === window.cyNetwork && relationshipType !== 'RELATES_TO') {
                    shouldSync = false; // 网络图视图中只有RELATES_TO关系需要同步
                }
            }
            
            if (!shouldSync) {
                return;
            }
            
            // 防止循环同步
            const syncLockKey = `syncing_${elementId}`;
            if (window[syncLockKey]) {
                return;
            }
            window[syncLockKey] = true;
            
            try {
                switch(action) {
                    case 'add':
                        // 检查目标视图中是否已存在
                        if (targetView.getElementById(elementId).length === 0) {
                            // 创建元素数据
                            const elementData = {
                                group: element.isNode() ? 'nodes' : 'edges',
                                data: element.data()
                            };
                            
                            // 添加到目标视图
                            targetView.add(elementData);
                        }
                        break;
                    case 'remove':
                        // 从目标视图中移除
                        const targetElementRemove = targetView.getElementById(elementId);
                        if (targetElementRemove.length > 0) {
                            targetElementRemove.remove();
                        }
                        
                        // 如果是手动删除的RELATES_TO关系，记录到deletedEdges
                        if (element.isEdge() && relationshipType === 'RELATES_TO') {
                            const sharedData = window.neo4jEditor.sharedGraphData;
                            if (!sharedData.deletedEdges) {
                                sharedData.deletedEdges = [];
                            }
                            
                            sharedData.deletedEdges.push({
                                type: 'RELATES_TO',
                                source: element.data('source'),
                                target: element.data('target')
                            });
                        }
                        break;
                    case 'update':
                        // 更新目标视图中的元素数据
                        const targetElementUpdate = targetView.getElementById(elementId);
                        if (targetElementUpdate.length > 0) {
                            targetElementUpdate.data(element.data());
                        }
                        break;
                }
                
                // 如果是节点父关系变更，维护兄弟关系
                if (element.isEdge() && relationshipType === 'CHILD_OF' && action === 'add') {
                    this.maintainSiblingRelationships(element.data('source'), element.data('target'));
                }
            } finally {
                // 释放锁
                setTimeout(() => {
                    window[syncLockKey] = false;
                }, 100);
            }
        } catch (error) {
            console.error(`Neo4j Editor: Error propagating ${action} change:`, error);
        }
    },
    
    /**
     * 通过ID同步选择
     * @private
     * @param {string} elementId - 元素ID
     */
    _syncSelectionById: function(elementId) {
        try {
            if (!elementId || !window.cyTree || !window.cyNetwork) {
                return;
            }
            
            // 在两个视图中查找元素并选择
            const treeElement = window.cyTree.getElementById(elementId);
            const networkElement = window.cyNetwork.getElementById(elementId);
            
            // 清除当前选择
            window.cyTree.elements().unselect();
            window.cyNetwork.elements().unselect();
            
            // 选择元素
            if (treeElement.length > 0) {
                treeElement.select();
            }
            if (networkElement.length > 0) {
                networkElement.select();
            }
        } catch (error) {
            console.error('Neo4j Editor: Error syncing selection by ID:', error);
        }
    },
    
    /**
     * 更新视图内容
     * @private
     * @param {Object} view - Cytoscape视图实例
     * @param {Array} nodes - 节点数据
     * @param {Array} edges - 边数据
     */
    _updateView: function(view, nodes, edges) {
        try {
            // 收集所有现有元素ID
            const existingIds = new Set();
            view.elements().forEach(el => {
                const id = el.data('id');
                if (id) existingIds.add(id);
            });
            
            // 要添加的元素集合
            const elementsToAdd = [];
            
            // 添加新节点
            nodes.forEach(node => {
                if (node.data && !existingIds.has(node.data.id)) {
                    elementsToAdd.push(node);
                } else if (node.data) {
                    // 更新现有节点
                    const existingNode = view.getElementById(node.data.id);
                    if (existingNode.length > 0) {
                        existingNode.data(node.data);
                    }
                }
            });
            
            // 添加新边
            edges.forEach(edge => {
                if (edge.data && !existingIds.has(edge.data.id)) {
                    // 确保源节点和目标节点存在
                    if (view.getElementById(edge.data.source).length > 0 && 
                        view.getElementById(edge.data.target).length > 0) {
                        elementsToAdd.push(edge);
                    }
                } else if (edge.data) {
                    // 更新现有边
                    const existingEdge = view.getElementById(edge.data.id);
                    if (existingEdge.length > 0) {
                        existingEdge.data(edge.data);
                    }
                }
            });
            
            // 批量添加新元素
            if (elementsToAdd.length > 0) {
                view.add(elementsToAdd);
            }
            
            // 删除不存在的元素
            view.elements().forEach(el => {
                const id = el.data('id');
                if (id) {
                    const isNode = el.isNode();
                    const existsInData = isNode ? 
                        nodes.some(n => n.data && n.data.id === id) :
                        edges.some(e => e.data && e.data.id === id);
                    
                    if (!existsInData) {
                        el.remove();
                    }
                }
            });
        } catch (error) {
            console.error('Neo4j Editor: Error updating view:', error);
        }
    },
    
    /**
     * 更新元素计数
     * @private
     */
    _updateElementCount: function() {
        try {
            const stats = this.getViewStats();
            
            // 更新树视图计数
            const treeCountElement = document.getElementById('tree-element-count');
            if (treeCountElement) {
                treeCountElement.textContent = `Nodes: ${stats.tree.nodes}, Edges: ${stats.tree.edges}`;
            }
            
            // 更新网络图视图计数
            const networkCountElement = document.getElementById('network-element-count');
            if (networkCountElement) {
                networkCountElement.textContent = `Nodes: ${stats.network.nodes}, Edges: ${stats.network.edges}`;
            }
            
            // 触发计数更新事件
            const event = new CustomEvent('neo4j-editor:element-count-updated', {
                detail: stats
            });
            document.dispatchEvent(event);
        } catch (error) {
            console.error('Neo4j Editor: Error updating element count:', error);
        }
    },
    
    /**
     * 增强syncData函数，支持更复杂的数据过滤和布局
     */
    syncData: function() {
        console.log('Neo4j Editor: Syncing data between views...');
        
        try {
            // 确保共享数据对象存在
            if (!window.neo4jEditor || !window.neo4jEditor.sharedGraphData) {
                console.warn('Neo4j Editor: No shared graph data available');
                return false;
            }
            
            const sharedData = window.neo4jEditor.sharedGraphData;
            
            // 确保视图实例存在
            if (!window.cyTree || !window.cyNetwork) {
                console.warn('Neo4j Editor: View instances not available');
                return false;
            }
            
            // 过滤树视图数据（仅保留CHILD_OF关系）
            const treeNodes = sharedData.nodes || [];
            const treeEdges = (sharedData.edges || []).filter(edge => 
                edge.data && edge.data.type === 'CHILD_OF'
            );
            
            // 过滤网络图视图数据（仅保留RELATES_TO关系）
            const networkNodes = sharedData.nodes || [];
            const networkEdges = (sharedData.edges || []).filter(edge => 
                edge.data && edge.data.type === 'RELATES_TO'
            );
            
            // 更新树视图
            this._updateView(window.cyTree, treeNodes, treeEdges);
            
            // 更新网络图视图
            this._updateView(window.cyNetwork, networkNodes, networkEdges);
            
            // 应用布局
            setTimeout(() => {
                this._applyLayouts();
            }, 100);
            
            // 更新元素计数
            this._updateElementCount();
            
            console.log('Neo4j Editor: Data synced successfully');
            return true;
        } catch (error) {
            console.error('Neo4j Editor: Error syncing data:', error);
            return false;
        }
    }
};

// 暴露模块到全局
window.viewSync = viewSyncModule;

// 使用映射数组统一管理向后兼容函数
// 确保不会重复声明
if (typeof backwardCompatibilityMapping === 'undefined') {
    const backwardCompatibilityMapping = [
        { globalFunc: 'syncGraphData', moduleFunc: 'syncData' },
        { globalFunc: 'initializeDualViews', moduleFunc: 'initializeDualViews' },
        { globalFunc: 'maintainSiblingRelationships', moduleFunc: 'maintainSiblingRelationships' },
        { globalFunc: 'initializeViewSync', moduleFunc: 'initialize' },
        { globalFunc: 'switchViewMode', moduleFunc: 'switchViewMode' }
    ];
}

// 覆盖createNode和createRelationship函数以支持双视图
if (typeof window.createNode === 'function') {
    const originalCreateNode = window.createNode;
    window.createNode = function(nodeData) {
        console.log('Neo4j Editor: Creating node with dual view support');
        const result = originalCreateNode.apply(this, arguments);
        
        // 同步到两个视图
        if (window.viewSync && typeof window.viewSync.syncData === 'function') {
            window.viewSync.syncData();
        }
        
        // 触发节点添加事件
        const event = new CustomEvent('neo4j-editor:data-update', {
            detail: { eventName: 'nodeAdded', nodeData: nodeData }
        });
        document.dispatchEvent(event);
        
        return result;
    };
}

if (typeof window.createRelationship === 'function') {
    const originalCreateRelationship = window.createRelationship;
    window.createRelationship = function(relationshipData) {
        console.log('Neo4j Editor: Creating relationship with dual view support', relationshipData);
        
        // 确保关系数据包含类型信息
        if (!relationshipData.type && !relationshipData.data?.type) {
            // 默认使用RELATES_TO作为关系类型
            if (!relationshipData.data) relationshipData.data = {};
            relationshipData.data.type = 'RELATES_TO';
            console.log('Neo4j Editor: Defaulting relationship type to RELATES_TO');
        }
        
        // 执行原始创建关系操作
        const result = originalCreateRelationship.apply(this, arguments);
        
        // 确保共享数据对象存在并更新
        if (window.neo4jEditor && window.neo4jEditor.sharedGraphData) {
            if (!window.neo4jEditor.sharedGraphData.edges) {
                window.neo4jEditor.sharedGraphData.edges = [];
            }
            
            // 确保关系有唯一ID
            if (!relationshipData.id && !relationshipData.data?.id) {
                const edgeId = 'edge_' + Date.now() + '_' + Math.floor(Math.random() * 1000);
                if (relationshipData.data) {
                    relationshipData.data.id = edgeId;
                } else {
                    relationshipData.id = edgeId;
                }
            }
            
            // 添加到共享数据（避免重复）
            const existingEdge = window.neo4jEditor.sharedGraphData.edges.find(
                e => e.data?.id === relationshipData.data?.id || e.id === relationshipData.id
            );
            
            if (!existingEdge) {
                window.neo4jEditor.sharedGraphData.edges.push(relationshipData);
                console.log('Neo4j Editor: Relationship added to shared data');
            }
        }
        
        // 同步到两个视图
        if (window.viewSync && typeof window.viewSync.syncData === 'function') {
            window.viewSync.syncData();
        }
        
        // 触发关系添加事件
        const event = new CustomEvent('neo4j-editor:data-update', {
            detail: { eventName: 'edgeAdded', relationshipData: relationshipData }
        });
        document.dispatchEvent(event);
        
        return result;
    };
}

// 添加专门用于双视图的关系创建函数
window._createRelationshipForDualViews = function(sourceId, targetId, relationshipType = 'RELATES_TO', properties = {}) {
    console.log('Neo4j Editor: Creating relationship for dual views', {sourceId, targetId, relationshipType, properties});
    
    try {
        // 创建关系数据对象
        const relationshipData = {
            data: {
                id: 'edge_' + Date.now() + '_' + Math.floor(Math.random() * 1000),
                source: sourceId,
                target: targetId,
                type: relationshipType,
                label: relationshipType,
                ...properties
            }
        };
        
        // 调用createRelationship函数
        const result = window.createRelationship(relationshipData);
        
        // 更新视图
        if (window.viewSync && typeof window.viewSync.syncData === 'function') {
            window.viewSync.syncData();
        }
        
        return result;
    } catch (error) {
        console.error('Neo4j Editor: Error creating relationship for dual views:', error);
        throw error;
    }
}

// 使用标准的模块注册方法
if (window.neo4jEditor && typeof window.neo4jEditor.registerModule === 'function') {
    try {
        window.neo4jEditor.registerModule('viewSync', viewSyncModule, {
            version: '1.0.2',
            dependencies: ['core/init', 'utils/utils']
        });
        console.log('Neo4j Editor: View sync module registered successfully');
    } catch (registrationError) {
        console.error('Neo4j Editor: Failed to register view sync module:', registrationError);

        // 降级方案：直接注册到modules对象
        if (typeof window.neo4jEditor.modules === 'undefined') {
            window.neo4jEditor.modules = {};
        }
        window.neo4jEditor.modules['views/viewSync'] = {
            name: 'views/viewSync',
            version: '1.0.2',
            initialized: viewSyncModule.initialized,
            dependencies: ['core/init', 'utils/utils'],
            module: viewSyncModule
        };
    }
}

// 多模块系统支持 - 确保兼容性
// CommonJS 模块支持
if (typeof module !== 'undefined' && typeof module.exports !== 'undefined') {
    module.exports = viewSyncModule;
}

// ES 模块支持
if (typeof exports !== 'undefined' && typeof exports === 'object') {
    Object.defineProperty(exports, '__esModule', { value: true });
    if (typeof module !== 'undefined') module.exports = viewSyncModule;
    exports.default = viewSyncModule;
}

// AMD 模块支持
if (typeof define === 'function' && define.amd) {
    define(['core/init', 'utils/utils'], function(initModule, utilsModule) {
        return viewSyncModule;
    });
}

// 在文档加载完成后自动初始化视图同步管理器
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function() {
        if (typeof window.viewSync !== 'undefined' && typeof window.viewSync.initialize === 'function') {
            window.viewSync.initialize();
        }
    });
} else {
    // 文档已加载完成，直接初始化
    if (typeof window.viewSync !== 'undefined' && typeof window.viewSync.initialize === 'function') {
        window.viewSync.initialize();
    }
}