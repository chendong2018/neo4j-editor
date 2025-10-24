// viewSync.js - 双视图同步管理模块

// 共享图数据存储
window.sharedGraphData = {
    nodes: [],
    edges: []
};

// 当前视图模式
window.currentViewMode = 'split'; // 默认分割视图

/**
 * 更新节点和边的计数显示
 */
function updateElementCounts() {
    try {
        // 检查树视图
        const treeNodesCount = window.cyTree ? window.cyTree.nodes().length : 0;
        const treeEdgesCount = window.cyTree ? window.cyTree.edges().length : 0;
        
        // 检查网络图视图
        const networkNodesCount = window.cyNetwork ? window.cyNetwork.nodes().length : 0;
        const networkEdgesCount = window.cyNetwork ? window.cyNetwork.edges().length : 0;
        
        // 更新DOM元素
        const treeStats = document.getElementById('tree-stats');
        const networkStats = document.getElementById('network-stats');
        
        if (treeStats) {
            treeStats.textContent = `树视图: ${treeNodesCount}个节点, ${treeEdgesCount}条边`;
        }
        
        if (networkStats) {
            networkStats.textContent = `网络图视图: ${networkNodesCount}个节点, ${networkEdgesCount}条边`;
        }
        
        console.log('Neo4j Editor: 元素计数已更新');
    } catch (err) {
        console.error('Neo4j Editor: 更新元素计数时出错:', err);
    }
}

/**
 * 切换视图模式
 * @param {string} mode - 视图模式: split, tree, network
 */
function switchViewMode(mode) {
    console.log(`Neo4j Editor: 切换视图模式到 ${mode}`);
    
    // 更新当前模式
    window.currentViewMode = mode;
    
    // 获取容器元素
    const treeContainer = document.getElementById('cy-tree-container');
    const networkContainer = document.getElementById('cy-network-container');
    
    if (!treeContainer || !networkContainer) {
        console.error('Neo4j Editor: 视图容器不存在');
        return;
    }
    
    // 重置所有按钮样式
    const splitBtn = document.getElementById('split-btn');
    const treeBtn = document.getElementById('tree-btn');
    const networkBtn = document.getElementById('network-btn');
    
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
    
    console.log(`Neo4j Editor: 视图模式切换完成 - ${mode}`);
}

/**
 * 同步图数据到不同视图
 * @param {Object} graphData - 包含节点和边的数据对象
 */
function syncGraphData(graphData) {
    console.log('Neo4j Editor: 开始同步图数据到双视图');
    
    try {
        // 确保共享数据存在
        if (!window.sharedGraphData) {
            window.sharedGraphData = { nodes: [], edges: [] };
        }
        
        // 更新共享数据
        if (graphData.nodes) {
            window.sharedGraphData.nodes = [...graphData.nodes];
        }
        if (graphData.edges) {
            window.sharedGraphData.edges = [...graphData.edges];
        }
        
        // 处理树视图
        if (window.cyTree) {
            console.log('Neo4j Editor: 同步数据到树视图');
            
            // 清空当前元素
            window.cyTree.elements().remove();
            
            // 过滤树视图的节点和边
            const treeNodes = window.sharedGraphData.nodes.filter(node => 
                node.data && (node.data.tags && node.data.tags.includes('tree') || 
                node.data.type === 'tree')
            );
            
            const treeEdges = window.sharedGraphData.edges.filter(edge => 
                edge.data && (edge.data.type === 'CHILD_OF' || 
                (edge.data.source && edge.data.target && 
                treeNodes.find(n => n.data.id === edge.data.source) && 
                treeNodes.find(n => n.data.id === edge.data.target)))
            );
            
            // 添加到树视图
            window.cyTree.add([...treeNodes, ...treeEdges]);
            
            // 应用树布局
            try {
                window.cyTree.layout({
                    name: 'cose',
                    rankDir: 'TB', // 从上到下
                    rankSep: 100,
                    nodeSep: 50,
                    animationDuration: 500,
                    idealEdgeLength: 120,
                    edgeElasticity: 100,
                    numIter: 1000
                }).run();
            } catch (layoutErr) {
                console.error('Neo4j Editor: 树视图布局应用失败:', layoutErr);
            }
        }
        
        // 处理网络图视图
        if (window.cyNetwork) {
            console.log('Neo4j Editor: 同步数据到网络图视图');
            
            // 清空当前元素
            window.cyNetwork.elements().remove();
            
            // 过滤网络图视图的节点和边
            const networkNodes = window.sharedGraphData.nodes.filter(node => 
                node.data && (node.data.tags && node.data.tags.includes('network') || 
                node.data.type === 'network')
            );
            
            const networkEdges = window.sharedGraphData.edges.filter(edge => 
                edge.data && (edge.data.type === 'RELATES_TO' || 
                (edge.data.source && edge.data.target && 
                networkNodes.find(n => n.data.id === edge.data.source) && 
                networkNodes.find(n => n.data.id === edge.data.target)))
            );
            
            // 添加到网络图视图
            window.cyNetwork.add([...networkNodes, ...networkEdges]);
            
            // 应用网络布局
            try {
                window.cyNetwork.layout({
                    name: 'cose',
                    idealEdgeLength: 300,
                    animationDuration: 500,
                    componentSpacing: 1000,
                    nodeOverlap: 20,
                    randomize: false
                }).run();
            } catch (layoutErr) {
                console.error('Neo4j Editor: 网络图视图布局应用失败:', layoutErr);
            }
        }
        
        // 更新元素计数
        updateElementCounts();
        
        console.log('Neo4j Editor: 图数据同步完成');
        
    } catch (err) {
        console.error('Neo4j Editor: 同步图数据时出错:', err);
        showToast(`同步视图数据失败: ${err.message}`, 'error');
    }
}

/**
 * 创建所有同级关系
 * @param {Object} cy - Cytoscape实例
 */
function createAllSiblingRelationships(cy) {
    if (!cy) return;
    
    console.log('Neo4j Editor: 开始创建同级关系');
    
    try {
        // 按层级分组节点
        const nodesByLevel = {};
        
        cy.nodes().forEach(node => {
            const level = node.data('level') || 0;
            if (!nodesByLevel[level]) {
                nodesByLevel[level] = [];
            }
            nodesByLevel[level].push(node);
        });
        
        // 为每个层级创建同级关系
        Object.keys(nodesByLevel).forEach(level => {
            const nodes = nodesByLevel[level];
            
            // 为同一层级的每对节点创建双向关系
            for (let i = 0; i < nodes.length; i++) {
                for (let j = i + 1; j < nodes.length; j++) {
                    const node1 = nodes[i];
                    const node2 = nodes[j];
                    const relId1 = `sibling_${node1.id()}_${node2.id()}`;
                    const relId2 = `sibling_${node2.id()}_${node1.id()}`;
                    
                    // 检查关系是否已存在
                    if (!cy.getElementById(relId1).length && !cy.getElementById(relId2).length) {
                        // 创建双向同级关系
                        cy.add({
                            group: 'edges',
                            data: {
                                id: relId1,
                                source: node1.id(),
                                target: node2.id(),
                                type: 'SIBLING_OF',
                                label: '同级'
                            }
                        });
                    }
                }
            }
        });
        
        console.log('Neo4j Editor: 同级关系创建完成');
        
    } catch (err) {
        console.error('Neo4j Editor: 创建同级关系时出错:', err);
    }
}

/**
 * 初始化双视图
 * @param {Object} mainCy - 主Cytoscape实例
 */
function initializeDualViews(mainCy) {
    console.log('Neo4j Editor: 初始化双视图系统');
    
    try {
        // 验证Cytoscape是否已加载
        if (typeof cytoscape !== 'function') {
            console.error('Neo4j Editor: Cytoscape.js 未加载');
            return false;
        }
        
        // 获取容器元素
        const treeContainer = document.getElementById('cy-tree');
        const networkContainer = document.getElementById('cy-network');
        
        if (!treeContainer || !networkContainer) {
            console.error('Neo4j Editor: 视图容器元素不存在');
            return false;
        }
        
        // 设置容器样式 - 背景渐变
        treeContainer.style.background = 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)';
        networkContainer.style.background = 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)';
        
        // 共享样式定义
        const sharedStyle = [
            // 节点基础样式
            {
                selector: 'node',
                style: {
                    'background-color': '#666',
                    'label': 'data(label)',
                    'width': 40,
                    'height': 40,
                    'color': '#fff',
                    'text-valign': 'center',
                    'text-halign': 'center',
                    'font-size': 12
                }
            },
            // 节点悬停效果
            {
                selector: 'node:hover',
                style: {
                    'background-color': '#ff6b6b',
                    'width': 45,
                    'height': 45,
                    'font-size': 14,
                    'z-index': 9999
                }
            },
            // 节点选中状态
            {
                selector: 'node:selected',
                style: {
                    'background-color': '#2563eb',
                    'border-width': 2,
                    'border-color': '#fff'
                }
            },
            // 边基础样式
            {
                selector: 'edge',
                style: {
                    'width': 2,
                    'line-color': '#ccc',
                    'target-arrow-color': '#ccc',
                    'target-arrow-shape': 'triangle',
                    'label': 'data(label)',
                    'font-size': 10,
                    'color': '#666'
                }
            },
            // 层级关系样式
            {
                selector: 'edge[type="CHILD_OF"]',
                style: {
                    'line-color': '#4caf50',
                    'target-arrow-color': '#4caf50',
                    'width': 3
                }
            },
            // 同层关系样式
            {
                selector: 'edge[type="SIBLING_OF"]',
                style: {
                    'line-color': '#ff9800',
                    'target-arrow-color': '#ff9800',
                    'width': 2,
                    'line-style': 'dashed'
                }
            },
            // 网络关系样式
            {
                selector: 'edge[type="RELATES_TO"]',
                style: {
                    'line-color': '#2196f3',
                    'target-arrow-color': '#2196f3',
                    'width': 2
                }
            }
        ];
        
        // 创建树视图实例
        if (!window.cyTree && treeContainer) {
            try {
                window.cyTree = cytoscape({
                    container: treeContainer,
                    style: sharedStyle,
                    layout: {
                        name: 'cose',
                        rankDir: 'TB',
                        rankSep: 100,
                        nodeSep: 50,
                        animationDuration: 500,
                        idealEdgeLength: 120,
                        edgeElasticity: 100,
                        numIter: 1000
                    }
                });
                console.log('Neo4j Editor: 树视图实例创建成功');
            } catch (err) {
                console.error('Neo4j Editor: 创建树视图实例失败:', err);
            }
        }
        
        // 创建网络图视图实例
        if (!window.cyNetwork && networkContainer) {
            try {
                window.cyNetwork = cytoscape({
                    container: networkContainer,
                    style: sharedStyle,
                    layout: {
                        name: 'cose',
                        idealEdgeLength: 300,
                        animationDuration: 500,
                        componentSpacing: 1000,
                        nodeOverlap: 20,
                        randomize: false
                    }
                });
                console.log('Neo4j Editor: 网络图视图实例创建成功');
            } catch (err) {
                console.error('Neo4j Editor: 创建网络图视图实例失败:', err);
            }
        }
        
        // 验证全局变量
        console.log('Neo4j Editor: 双视图初始化状态:', {
            cyTree: !!window.cyTree,
            cyNetwork: !!window.cyNetwork
        });
        
        // 初始化共享数据存储
        if (!window.sharedGraphData) {
            window.sharedGraphData = { nodes: [], edges: [] };
        }
        
        // 设置视图事件监听器
        setupViewEventListeners();
        
        // 强制布局更新
        setTimeout(() => {
            if (window.cyTree) window.cyTree.layout().run();
            if (window.cyNetwork) window.cyNetwork.layout().run();
        }, 300);
        
        // 初始化视图模式
        if (!window.currentViewMode) {
            window.currentViewMode = 'split';
        }
        
        // 设置默认视图模式
        switchViewMode(window.currentViewMode);
        
        console.log('Neo4j Editor: 双视图初始化完成');
        return true;
        
    } catch (err) {
        console.error('Neo4j Editor: 初始化双视图时出错:', err);
        return false;
    }
}

/**
 * 设置视图事件监听器
 */
function setupViewEventListeners() {
    console.log('Neo4j Editor: 设置视图事件监听器');
    
    // 重新安装所有点击监听器的全局函数
    window.reinstallAllTapListeners = function() {
        console.log('Neo4j Editor: 重新安装所有点击监听器');
        
        // 特殊处理节点模式
        const isNodeMode = window.currentMode === 'node';
        console.log('Neo4j Editor: 当前是否为节点模式:', isNodeMode);
        
        // 辅助函数：为单个视图安装监听器
        const installTapListeners = function(cyInstance, viewName) {
            if (!cyInstance) return;
            
            try {
                // 移除现有监听器
                cyInstance.off('tap');
                
                // 添加新的监听器
                cyInstance.on('tap', function(evt) {
                    console.log(`Neo4j Editor: ${viewName} 视图点击事件`);
                    
                    // 根据不同模式处理
                    if (window.currentMode === 'node') {
                        // 节点创建模式
                        if (!evt.target || evt.target === cyInstance) {
                            // 点击背景，创建节点
                            console.log(`Neo4j Editor: 在${viewName}视图背景创建节点`);
                            
                            // 使用全局createNode函数
                            if (window.createNode) {
                                window.createNode(cyInstance, evt.position, viewName);
                            }
                        }
                    } else if (window.currentMode === 'relationship') {
                        // 关系创建模式
                        console.log(`Neo4j Editor: ${viewName}视图关系创建模式`);
                        // 这里可以添加关系创建逻辑
                    }
                });
                
                console.log(`Neo4j Editor: ${viewName}视图监听器安装成功`);
                
            } catch (err) {
                console.error(`Neo4j Editor: 安装${viewName}视图监听器失败:`, err);
            }
        };
        
        // 为Tree视图安装监听器
        installTapListeners(window.cyTree, 'Tree');
        
        // 为Network视图安装监听器
        installTapListeners(window.cyNetwork, 'Network');
        
        // 为主视图安装监听器
        installTapListeners(window.cy, 'Main');
        
        // 设置光标样式
        const setCursorStyle = function(viewType, isNodeMode) {
            const views = {
                Tree: window.cyTree,
                Network: window.cyNetwork,
                Main: window.cy
            };
            
            const view = views[viewType];
            if (!view || !view.container) return;
            
            view.container.style.cursor = isNodeMode ? 'crosshair' : 'default';
        };
        
        // 为所有视图设置光标
        setCursorStyle('Tree', isNodeMode);
        setCursorStyle('Network', isNodeMode);
        setCursorStyle('Main', isNodeMode);
        
        console.log('Neo4j Editor: 全局监听器重新安装完成');
    };
    
    // 视图切换按钮事件监听
    const splitBtn = document.getElementById('split-btn');
    const treeBtn = document.getElementById('tree-btn');
    const networkBtn = document.getElementById('network-btn');
    
    if (splitBtn) {
        splitBtn.addEventListener('click', () => {
            console.log('Neo4j Editor: 分割视图按钮点击');
            switchViewMode('split');
        });
    }
    
    if (treeBtn) {
        treeBtn.addEventListener('click', () => {
            console.log('Neo4j Editor: 树视图按钮点击');
            switchViewMode('tree');
        });
    }
    
    if (networkBtn) {
        networkBtn.addEventListener('click', () => {
            console.log('Neo4j Editor: 网络图视图按钮点击');
            switchViewMode('network');
        });
    }
    
    console.log('Neo4j Editor: 视图事件监听器设置完成');
}

/**
 * 覆盖默认的createNode函数以支持双视图
 */
function overrideCreateNodeForDualViews() {
    // 保存原始的createNode函数
    const originalCreateNode = window.createNode;
    
    // 覆盖函数
    window.createNode = function(cyInstance, position, viewType = 'main') {
        console.log(`Neo4j Editor: 双视图节点创建 - 视图类型: ${viewType}`);
        
        try {
            // 调用原始函数创建节点
            const nodeData = originalCreateNode ? 
                originalCreateNode(cyInstance, position, viewType) : 
                null;
            
            if (!nodeData) {
                console.error('Neo4j Editor: 原始节点创建失败');
                return null;
            }
            
            // 确保节点数据格式正确
            const node = {
                group: 'nodes',
                data: {
                    id: nodeData.data?.id || `node_${Date.now()}`,
                    label: nodeData.data?.label || '节点',
                    type: nodeData.data?.type || 'default',
                    tags: nodeData.data?.tags || []
                },
                position: position
            };
            
            // 添加到共享数据
            if (!window.sharedGraphData) {
                window.sharedGraphData = { nodes: [], edges: [] };
            }
            
            // 确保标签数组存在并添加相应的视图标签
            if (!node.data.tags) {
                node.data.tags = [];
            }
            
            // 根据视图类型添加标签
            if (viewType === 'tree' || viewType === 'both') {
                if (!node.data.tags.includes('tree')) {
                    node.data.tags.push('tree');
                }
            }
            
            if (viewType === 'network' || viewType === 'both') {
                if (!node.data.tags.includes('network')) {
                    node.data.tags.push('network');
                }
            }
            
            // 添加到共享数据
            window.sharedGraphData.nodes.push(node);
            
            // 同步到所有视图
            syncGraphData(window.sharedGraphData);
            
            // 显示成功消息
            showToast(`节点已创建并同步到${viewType === 'both' ? '所有' : viewType}视图`, 'success');
            
            return node;
            
        } catch (err) {
            console.error('Neo4j Editor: 双视图节点创建失败:', err);
            showToast(`创建节点失败: ${err.message}`, 'error');
            return null;
        }
    };
}

/**
 * 覆盖默认的createRelationship函数以支持双视图
 */
function overrideCreateRelationshipForDualViews() {
    // 保存原始的createRelationship函数
    const originalCreateRelationship = window.createRelationship;
    
    // 覆盖函数
    window.createRelationship = function(sourceNode, targetNode, relationshipType = 'RELATES_TO', relationshipLabel = '') {
        console.log('Neo4j Editor: 双视图关系创建');
        
        try {
            // 调用原始函数创建关系
            const relData = originalCreateRelationship ? 
                originalCreateRelationship(sourceNode, targetNode, relationshipType, relationshipLabel) : 
                null;
            
            if (!relData) {
                console.error('Neo4j Editor: 原始关系创建失败');
                return null;
            }
            
            // 确保关系数据格式正确
            const relationship = {
                group: 'edges',
                data: {
                    id: relData.data?.id || `rel_${Date.now()}`,
                    source: sourceNode.id(),
                    target: targetNode.id(),
                    type: relationshipType,
                    label: relationshipLabel || relationshipType
                }
            };
            
            // 添加到共享数据
            if (!window.sharedGraphData) {
                window.sharedGraphData = { nodes: [], edges: [] };
            }
            
            window.sharedGraphData.edges.push(relationship);
            
            // 同步到所有视图
            syncGraphData(window.sharedGraphData);
            
            // 显示成功消息
            showToast('关系已创建并同步到所有视图', 'success');
            
            return relationship;
            
        } catch (err) {
            console.error('Neo4j Editor: 双视图关系创建失败:', err);
            showToast(`创建关系失败: ${err.message}`, 'error');
            return null;
        }
    };
}

// 定义公共API对象
window.viewSync = {
    initializeDualViews: initializeDualViews,
    syncGraphData: syncGraphData,
    switchViewMode: switchViewMode,
    createAllSiblingRelationships: createAllSiblingRelationships,
    updateElementCounts: updateElementCounts,
    overrideCreateNodeForDualViews: overrideCreateNodeForDualViews,
    overrideCreateRelationshipForDualViews: overrideCreateRelationshipForDualViews
};

console.log('Neo4j Editor: viewSync.js 模块加载完成');