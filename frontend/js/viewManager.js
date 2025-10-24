/**
 * 视图管理器 - 处理双视图切换和同步
 */

/**
 * 视图管理器对象
 */
window.viewManager = window.viewManager || {};

/**
 * 当前视图模式
 * @type {string} 'split', 'tree', 'network'
 */
window.viewManager.currentViewMode = 'split';

/**
 * 初始化视图管理器
 */
window.viewManager.init = function() {
    console.log('Neo4j Editor: Initializing view manager');
    
    // 确保全局sharedGraphData存在
    if (!window.sharedGraphData) {
        window.sharedGraphData = { nodes: [], edges: [] };
    }
    
    // 初始化视图模式按钮事件
    this.setupViewModeButtons();
    
    // 设置缩放控制按钮事件
    this.setupZoomControlListeners();
    
    // 初始更新元素计数
    this.updateElementCounts();
    
    // 覆盖节点和关系创建函数以支持双视图
    this.overrideCreateFunctions();
    
    console.log('View manager initialized successfully');
};

/**
 * 初始化视图管理器（与init.js调用匹配的别名）
 */
window.viewManager.initialize = function() {
    // 调用实际的初始化函数
    this.init();
};

/**
 * 同步数据到两个视图
 */
window.viewManager.syncGraphData = function() {
    try {
        // 确保sharedGraphData存在
        const sharedData = window.sharedGraphData || { nodes: [], edges: [] };
        
        // 对每个视图单独进行处理，避免一个视图失败影响另一个
        if (window.cyTree && typeof window.cyTree === 'object') {
            try {
                // 安全地清空树视图
                if (window.cyTree.elements && typeof window.cyTree.elements === 'function') {
                    const treeElements = window.cyTree.elements();
                    if (treeElements && typeof treeElements.remove === 'function') {
                        treeElements.remove();
                    }
                }
                
                // 克隆并添加节点和边到树视图 - 只显示带'tree'标签的节点
                const treeNodes = (sharedData.nodes || []).filter(node => {
                    // 安全检查节点和数据
                    if (!node || !node.data) return false;
                    // 只显示带有'tree'标签的节点
                    return Array.isArray(node.data.labels) && node.data.labels.includes('tree');
                }).map(node => ({...node}));
                
                // 过滤与树视图节点相关的边
                const treeNodeIds = new Set(treeNodes.map(node => node.data.id));
                const treeEdges = (sharedData.edges || []).filter(edge => 
                    edge && edge.data && 
                    (edge.data.type === 'CHILD_OF' || 
                    (treeNodeIds.has(edge.data.source) && treeNodeIds.has(edge.data.target)))
                ).map(edge => ({...edge}));
                
                if (typeof window.cyTree.add === 'function') {
                    window.cyTree.add({ nodes: treeNodes, edges: treeEdges });
                }
                
                // 运行布局
                if (typeof window.cyTree.layout === 'function') {
                    try {
                        window.cyTree.layout({
                            name: 'cose', // 使用cose替代dagre
                            rankDir: 'TB',
                            rankSep: 100,
                            nodeSep: 50,
                            fit: true,
                            idealEdgeLength: 100,
                            nodeOverlap: 0,
                            refresh: 20,
                            padding: 50,
                            randomize: false,
                            componentSpacing: 500,
                            nodeRepulsion: 1000000,
                            edgeElasticity: 100,
                            nestingFactor: 1,
                            gravity: 50,
                            numIter: 1000,
                            initialTemp: 100,
                            coolingFactor: 0.95,
                            minTemp: 0.1
                        }).run();
                    } catch (layoutError) {
                        console.warn('Neo4j Editor: Failed to run tree layout:', layoutError);
                    }
                }
            } catch (treeError) {
                console.warn('Neo4j Editor: Error syncing tree view:', treeError);
            }
        }
        
        if (window.cyNetwork && typeof window.cyNetwork === 'object') {
            try {
                // 安全地清空网络图视图
                if (window.cyNetwork.elements && typeof window.cyNetwork.elements === 'function') {
                    const networkElements = window.cyNetwork.elements();
                    if (networkElements && typeof networkElements.remove === 'function') {
                        networkElements.remove();
                    }
                }
                
                // 克隆并添加节点和边到网络图视图 - 只显示带'network'标签的节点
                const networkNodes = (sharedData.nodes || []).filter(node => {
                    // 安全检查节点和数据
                    if (!node || !node.data) return false;
                    // 只显示带有'network'标签的节点
                    return Array.isArray(node.data.labels) && node.data.labels.includes('network');
                }).map(node => ({...node}));
                
                // 过滤与网络图视图节点相关的边
                const networkNodeIds = new Set(networkNodes.map(node => node.data.id));
                const networkEdges = (sharedData.edges || []).filter(edge => 
                    edge && edge.data && 
                    (edge.data.type === 'RELATES_TO' || 
                    (networkNodeIds.has(edge.data.source) && networkNodeIds.has(edge.data.target)))
                ).map(edge => ({...edge}));
                
                if (typeof window.cyNetwork.add === 'function') {
                    window.cyNetwork.add({ nodes: networkNodes, edges: networkEdges });
                }
                
                // 运行布局
                if (typeof window.cyNetwork.layout === 'function') {
                    try {
                        window.cyNetwork.layout({
                            name: 'cose',
                            idealEdgeLength: 300,
                            nodeOverlap: 0,
                            refresh: 20,
                            fit: true,
                            padding: 150,
                            randomize: true,
                            componentSpacing: 1000,
                            nodeRepulsion: 3000000,
                            edgeElasticity: 200,
                            nestingFactor: 1,
                            gravity: 150,
                            numIter: 5000,
                            initialTemp: 150,
                            coolingFactor: 0.9,
                            minTemp: 0.5
                        }).run();
                    } catch (layoutError) {
                        console.warn('Neo4j Editor: Failed to run network layout:', layoutError);
                    }
                }
            } catch (networkError) {
                console.warn('Neo4j Editor: Error syncing network view:', networkError);
            }
        }
        
        // 更新计数
        this.updateElementCounts();
    } catch (error) {
        console.error('Neo4j Editor: Failed to sync graph data:', error);
    }
};

/**
 * 设置缩放控制按钮事件
 */
window.viewManager.setupZoomControlListeners = function() {
    const treeZoomInBtn = document.getElementById('zoom-in-tree-btn');
    const treeZoomOutBtn = document.getElementById('zoom-out-tree-btn');
    const treeZoomFitBtn = document.getElementById('fit-tree-btn');
    const networkZoomInBtn = document.getElementById('zoom-in-network-btn');
    const networkZoomOutBtn = document.getElementById('zoom-out-network-btn');
    const networkZoomFitBtn = document.getElementById('fit-network-btn');
    
    if (treeZoomInBtn) treeZoomInBtn.addEventListener('click', () => window.cyTree && window.cyTree.zoom({ level: window.cyTree.zoom() * 1.2 }));
    if (treeZoomOutBtn) treeZoomOutBtn.addEventListener('click', () => window.cyTree && window.cyTree.zoom({ level: window.cyTree.zoom() * 0.8 }));
    if (treeZoomFitBtn) treeZoomFitBtn.addEventListener('click', () => window.cyTree && window.cyTree.fit());
    if (networkZoomInBtn) networkZoomInBtn.addEventListener('click', () => window.cyNetwork && window.cyNetwork.zoom({ level: window.cyNetwork.zoom() * 1.2 }));
    if (networkZoomOutBtn) networkZoomOutBtn.addEventListener('click', () => window.cyNetwork && window.cyNetwork.zoom({ level: window.cyNetwork.zoom() * 0.8 }));
    if (networkZoomFitBtn) networkZoomFitBtn.addEventListener('click', () => window.cyNetwork && window.cyNetwork.fit());
};

/**
 * 覆盖节点和关系创建函数以支持双视图
 */
window.viewManager.overrideCreateFunctions = function() {
    // 保存原始函数
    this.originalCreateNode = window.createNode;
    this.originalCreateRelationship = window.createRelationship;
    
    // 覆盖createNode函数
    window.createNode = function(type, position) {
        try {
            // 调用原函数创建节点
            let node;
            if (typeof window.viewManager.originalCreateNode === 'function') {
                node = window.viewManager.originalCreateNode(type, position);
            } else {
                // 如果没有原始函数，直接创建节点
                const nodeId = `node_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
                const nodeType = type || window.selectedNodeType || 'default';
                const nodeTypeStyles = window.nodeTypeStyles || {};
                const style = nodeTypeStyles[nodeType] || { 'background-color': '#2196F3', 'icon': 'fa-circle' };
                const cy = window.cy || window.cyNetwork;
                
                if (cy && typeof cy.add === 'function') {
                    // 直接在主图中创建节点
                    node = cy.add({
                        group: 'nodes',
                        data: {
                            id: nodeId,
                            label: nodeType,
                            type: nodeType,
                            level: 1,
                            'background-color': style['background-color'],
                            icon: style.icon,
                            labels: ['tree', 'network'] // 添加到两个视图
                        },
                        position: position || { x: 0, y: 0 }
                    });
                } else {
                    throw new Error('No valid Cytoscape instance found');
                }
            }
            
            if (!node) {
                throw new Error('Failed to create node');
            }
            
            // 获取节点数据
            const nodeData = node.data();
            // 确保节点有labels属性且包含'tree'和'network'
            if (!nodeData.labels || !Array.isArray(nodeData.labels)) {
                nodeData.labels = ['tree', 'network'];
            } else {
                if (!nodeData.labels.includes('tree')) nodeData.labels.push('tree');
                if (!nodeData.labels.includes('network')) nodeData.labels.push('network');
            }
            
            // 确保sharedGraphData存在
            if (!window.sharedGraphData) {
                window.sharedGraphData = { nodes: [], edges: [] };
            }
            
            const newNode = {
                group: 'nodes',
                data: {
                    id: nodeData.id,
                    label: nodeData.label,
                    type: nodeData.type,
                    level: nodeData.level || 1,
                    'background-color': nodeData['background-color'],
                    icon: nodeData.icon,
                    labels: nodeData.labels,
                    properties: nodeData.properties || {}
                },
                position: position || { x: 0, y: 0 }
            };
            
            // 添加到共享数据
            window.sharedGraphData.nodes.push(newNode);
            
            // 同步到两个视图
            window.viewManager.syncGraphData();
            
            // 显示提示
            if (typeof window.showToast === 'function') {
                window.showToast(`Node ${nodeData.label} created`);
            }
            
            return node;
        } catch (error) {
            console.error('Neo4j Editor: Error creating node:', error);
            if (typeof window.showToast === 'function') {
                window.showToast('Failed to create node');
            }
            return null;
        }
    };
    
    // 覆盖createRelationship函数
    window.createRelationship = function(sourceNode, targetNode, relationshipType) {
        try {
            // 调用原函数创建关系
            let relationship;
            if (typeof window.viewManager.originalCreateRelationship === 'function') {
                relationship = window.viewManager.originalCreateRelationship(sourceNode, targetNode, relationshipType);
            } else {
                // 如果没有原始函数，直接创建关系
                const edgeId = `edge_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
                const relType = relationshipType || window.selectedRelationshipType || 'RELATES_TO';
                const relationshipTypeStyles = window.relationshipTypeStyles || {};
                const style = relationshipTypeStyles[relType] || { 'line-color': '#00BCD4', 'target-arrow-color': '#00BCD4' };
                const cy = window.cy || window.cyNetwork;
                
                if (cy && typeof cy.add === 'function') {
                    // 确定关系类型和样式
                    let type = relType;
                    let lineColor = style['line-color'];
                    let targetArrowColor = style['target-arrow-color'];
                    
                    // 为主图创建关系
                    relationship = cy.add({
                        group: 'edges',
                        data: {
                            id: edgeId,
                            source: sourceNode.id(),
                            target: targetNode.id(),
                            label: relType,
                            type: type,
                            'line-color': lineColor,
                            'target-arrow-color': targetArrowColor
                        }
                    });
                } else {
                    throw new Error('No valid Cytoscape instance found');
                }
            }
            
            if (!relationship) {
                throw new Error('Failed to create relationship');
            }
            
            // 获取关系数据
            const relData = relationship.data();
            
            // 确保sharedGraphData存在
            if (!window.sharedGraphData) {
                window.sharedGraphData = { nodes: [], edges: [] };
            }
            
            const newEdge = {
                group: 'edges',
                data: {
                    id: relData.id,
                    source: relData.source,
                    target: relData.target,
                    label: relData.label,
                    type: relData.type || 'RELATES_TO',
                    'line-color': relData['line-color'] || '#00BCD4',
                    'target-arrow-color': relData['target-arrow-color'] || '#00BCD4'
                }
            };
            
            // 添加到共享数据
            window.sharedGraphData.edges.push(newEdge);
            
            // 同步到两个视图
            window.viewManager.syncGraphData();
            
            // 显示提示
            if (typeof window.showToast === 'function') {
                window.showToast(`Relationship ${relData.label} created`);
            }
            
            return relationship;
        } catch (error) {
            console.error('Neo4j Editor: Error creating relationship:', error);
            if (typeof window.showToast === 'function') {
                window.showToast('Failed to create relationship');
            }
            return null;
        }
    };
};

/**
 * 设置视图模式切换按钮事件
 */
window.viewManager.setupViewModeButtons = function() {
    const buttonMap = {
        'split-view-btn': 'split',
        'tree-only-btn': 'tree',
        'network-only-btn': 'network'
    };
    
    Object.entries(buttonMap).forEach(([btnId, mode]) => {
        const button = document.getElementById(btnId);
        if (button) {
            button.addEventListener('click', () => {
                this.switchViewMode(mode);
            });
        }
    });
};

/**
 * 切换视图模式
 * @param {string} mode - 视图模式: 'split', 'tree', 'network'
 */
window.viewManager.switchViewMode = function(mode) {
    console.log('Neo4j Editor: Switching to view mode:', mode);
    this.currentViewMode = mode;
    
    const treeContainer = document.getElementById('cy-tree');
    const networkContainer = document.getElementById('cy-network');
    
    if (!treeContainer || !networkContainer) {
        console.error('Neo4j Editor: View containers not found');
        return;
    }
    
    switch(mode) {
        case 'split':
            treeContainer.style.display = 'block';
            networkContainer.style.display = 'block';
            treeContainer.style.width = '50%';
            networkContainer.style.width = '50%';
            break;
        case 'tree':
            treeContainer.style.display = 'block';
            networkContainer.style.display = 'none';
            treeContainer.style.width = '100%';
            break;
        case 'network':
            treeContainer.style.display = 'none';
            networkContainer.style.display = 'block';
            networkContainer.style.width = '100%';
            break;
        default:
            console.warn('Neo4j Editor: Invalid view mode:', mode);
            return;
    }
    
    // 更新按钮样式
    this.updateViewModeButtonStyles();
    
    // 触发视图切换事件，让其他组件可以响应
    if (typeof window.dispatchEvent === 'function') {
        window.dispatchEvent(new CustomEvent('viewModeChanged', { detail: { mode } }));
    }
};

/**
 * 更新视图模式按钮样式
 */
window.viewManager.updateViewModeButtonStyles = function() {
    const buttonMap = {
        'split': 'split-view-btn',
        'tree': 'tree-only-btn',
        'network': 'network-only-btn'
    };
    
    // 先重置所有视图按钮
    Object.values(buttonMap).forEach(btnId => {
        const btn = document.getElementById(btnId);
        if (btn) {
            btn.classList.remove('active');
        }
    });
    
    // 然后激活当前模式按钮
    const activeBtnId = buttonMap[this.currentViewMode];
    if (activeBtnId) {
        const activeBtn = document.getElementById(activeBtnId);
        if (activeBtn) {
            activeBtn.classList.add('active');
        }
    }
};

/**
 * 更新节点和边计数显示
 */
window.viewManager.updateElementCounts = function() {
    // 安全获取共享数据
    const sharedData = window.sharedGraphData || { nodes: [], edges: [] };
    const nodeCount = Array.isArray(sharedData.nodes) ? sharedData.nodes.length : 0;
    const edgeCount = Array.isArray(sharedData.edges) ? sharedData.edges.length : 0;
    
    const countElement = document.getElementById('element-counts');
    if (countElement) {
        countElement.textContent = `Nodes: ${nodeCount} | Edges: ${edgeCount}`;
    }
};

/**
 * 获取当前视图模式
 * @returns {string} 当前视图模式
 */
window.viewManager.getCurrentViewMode = function() {
    return this.currentViewMode;
};

/**
 * 同步两个视图的节点和边数据
 */
window.viewManager.syncViews = function() {
    // 这个方法可以与viewSync.js配合使用
    // 或者直接调用window.syncGraphData()如果已定义
    if (typeof window.syncGraphData === 'function') {
        try {
            window.syncGraphData();
        } catch (error) {
            console.error('Neo4j Editor: Error syncing views:', error);
        }
    }
};

/**
 * 重新调整视图以适应内容
 */
window.viewManager.zoomToFit = function() {
    // 为两个视图调用zoomToFit
    [window.cyTree, window.cyNetwork].forEach(cy => {
        if (cy && typeof cy.fit === 'function') {
            try {
                cy.fit(50);
                if (typeof cy.center === 'function') {
                    cy.center();
                }
            } catch (error) {
                console.warn('Neo4j Editor: Failed to fit view:', error);
            }
        }
    });
};
