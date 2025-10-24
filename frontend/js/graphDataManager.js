/**
 * 图数据管理模块
 */

// 共享图数据存储
window.sharedGraphData = window.sharedGraphData || { 
    nodes: [], 
    edges: [],
    selectedElement: null
};

/**
 * 同步图数据到两个视图
 */
window.syncGraphData = function() {
    try {
        // 确保共享数据存在
        const sharedData = window.sharedGraphData || { nodes: [], edges: [] };
        
        // 同步到树形图视图
        if (window.cyTree && typeof window.cyTree === 'object') {
            try {
                // 安全地清空树形图视图
                if (window.cyTree.elements && typeof window.cyTree.elements === 'function') {
                    const treeElements = window.cyTree.elements();
                    if (treeElements && typeof treeElements.remove === 'function') {
                        treeElements.remove();
                    }
                }
                
                // 克隆并添加节点和边到树形图视图 - 只显示带'tree'标签的节点
                const treeNodes = (sharedData.nodes || []).filter(node => {
                    // 安全检查节点和数据
                    if (!node || !node.data) return false;
                    // 只显示带有'tree'标签的节点
                    return Array.isArray(node.data.labels) && node.data.labels.includes('tree');
                }).map(node => ({...node}));
                
                // 过滤与树形图视图节点相关的边
                const treeNodeIds = new Set(treeNodes.map(node => node.data.id));
                const treeEdges = (sharedData.edges || []).filter(edge => 
                    edge && edge.data && 
                    (edge.data.type !== 'RELATES_TO' || 
                    (treeNodeIds.has(edge.data.source) && treeNodeIds.has(edge.data.target)))
                ).map(edge => ({...edge}));
                
                if (typeof window.cyTree.add === 'function') {
                    window.cyTree.add({ nodes: treeNodes, edges: treeEdges });
                }
                
                // 运行布局
                if (typeof window.cyTree.layout === 'function') {
                    try {
                        window.cyTree.layout({
                            name: 'breadthfirst',
                            directed: true,
                            padding: 150,
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
        
        // 同步到网络图视图
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
        if (typeof updateElementCounts === 'function') {
            try {
                updateElementCounts();
            } catch (countError) {
                console.warn('Neo4j Editor: Error updating element counts:', countError);
            }
        }
    } catch (error) {
        console.error('Neo4j Editor: Failed to sync graph data:', error);
    }
};

/**
 * 更新元素计数显示
 */
function updateElementCounts() {
    const sharedData = window.sharedGraphData || { nodes: [], edges: [] };
    const nodeCount = (sharedData.nodes || []).length;
    const edgeCount = (sharedData.edges || []).length;
    
    // 更新UI显示
    const nodeCountEl = document.getElementById('node-count');
    const edgeCountEl = document.getElementById('edge-count');
    
    if (nodeCountEl) {
        nodeCountEl.textContent = nodeCount;
    }
    if (edgeCountEl) {
        edgeCountEl.textContent = edgeCount;
    }
}

/**
 * 从共享数据中移除元素
 * @param {string} elementId - 要移除的元素ID
 */
window.removeElementFromViews = function(elementId) {
    try {
        const sharedData = window.sharedGraphData || { nodes: [], edges: [] };
        
        // 检查是节点还是边
        let isNode = false;
        let elementLabel = '';
        
        // 从节点数组中移除
        const nodeIndex = (sharedData.nodes || []).findIndex(node => node && node.data && node.data.id === elementId);
        if (nodeIndex !== -1) {
            isNode = true;
            elementLabel = sharedData.nodes[nodeIndex].data.label || 'Node';
            sharedData.nodes.splice(nodeIndex, 1);
            
            // 同时移除与该节点相关的所有边
            sharedData.edges = (sharedData.edges || []).filter(edge => 
                !(edge && edge.data && (edge.data.source === elementId || edge.data.target === elementId))
            );
        } else {
            // 从边数组中移除
            const edgeIndex = (sharedData.edges || []).findIndex(edge => edge && edge.data && edge.data.id === elementId);
            if (edgeIndex !== -1) {
                elementLabel = sharedData.edges[edgeIndex].data.label || 'Relationship';
                sharedData.edges.splice(edgeIndex, 1);
            }
        }
        
        // 同步到视图
        syncGraphData();
        
        // 显示提示
        if (typeof window.showToast === 'function') {
            window.showToast(`${elementLabel} deleted`);
        }
    } catch (error) {
        console.error('Neo4j Editor: Error removing element:', error);
        if (typeof window.showToast === 'function') {
            window.showToast('Failed to delete element');
        }
    }
};

/**
 * 从共享数据中查找元素
 * @param {string} elementId - 元素ID
 * @returns {Object|null} 找到的元素或null
 */
window.findElementInSharedData = function(elementId) {
    const sharedData = window.sharedGraphData || { nodes: [], edges: [] };
    
    // 查找节点
    const node = (sharedData.nodes || []).find(node => node && node.data && node.data.id === elementId);
    if (node) return node;
    
    // 查找边
    const edge = (sharedData.edges || []).find(edge => edge && edge.data && edge.data.id === elementId);
    return edge || null;
};

/**
 * 从图数据加载到共享数据结构
 * @param {Object} graphData - 包含nodes和edges的图数据
 * @param {boolean} append - 是否追加到现有数据
 */
window.loadGraphFromData = function(graphData, append = false) {
    try {
        const sharedData = window.sharedGraphData || { nodes: [], edges: [] };
        
        // 根据append参数决定是替换还是追加
        if (!append) {
            sharedData.nodes = [];
            sharedData.edges = [];
        }
        
        // 添加节点，确保不重复
        const existingNodeIds = new Set(sharedData.nodes.map(n => n && n.data ? n.data.id : null));
        if (Array.isArray(graphData.nodes)) {
            graphData.nodes.forEach(node => {
                if (node && node.data && node.data.id && !existingNodeIds.has(node.data.id)) {
                    // 确保每个节点都有正确的标签
                    if (!node.data.labels) {
                        node.data.labels = ['tree', 'network'];
                    } else if (!Array.isArray(node.data.labels)) {
                        node.data.labels = [node.data.labels];
                    } else if (!node.data.labels.includes('tree')) {
                        node.data.labels.push('tree');
                    } else if (!node.data.labels.includes('network')) {
                        node.data.labels.push('network');
                    }
                    
                    sharedData.nodes.push(node);
                    existingNodeIds.add(node.data.id);
                }
            });
        }
        
        // 添加边，确保不重复
        const existingEdgeIds = new Set(sharedData.edges.map(e => e && e.data ? e.data.id : null));
        if (Array.isArray(graphData.edges)) {
            graphData.edges.forEach(edge => {
                if (edge && edge.data && edge.data.id && !existingEdgeIds.has(edge.data.id)) {
                    // 确保边引用的节点存在
                    if (existingNodeIds.has(edge.data.source) && existingNodeIds.has(edge.data.target)) {
                        sharedData.edges.push(edge);
                        existingEdgeIds.add(edge.data.id);
                    }
                }
            });
        }
        
        // 同步到视图
        syncGraphData();
        
        // 显示提示
        if (typeof window.showToast === 'function') {
            const nodeCount = Array.isArray(graphData.nodes) ? graphData.nodes.length : 0;
            const edgeCount = Array.isArray(graphData.edges) ? graphData.edges.length : 0;
            window.showToast(`已加载 ${nodeCount} 个节点和 ${edgeCount} 个关系`, 'success');
        }
        
    } catch (error) {
        console.error('Neo4j Editor: Error loading graph data:', error);
        if (typeof window.showToast === 'function') {
            window.showToast('加载图数据失败: ' + error.message, 'error');
        }
    }
};

/**
 * 同步视图间的选择状态
 * @param {Object} target - 被选中的元素
 * @param {Object} sourceInstance - 源Cytoscape实例
 */
window.synchronizeSelection = function(target, sourceInstance) {
    try {
        const elementId = target.data('id');
        const sharedData = window.sharedGraphData || { nodes: [], edges: [] };
        
        // 更新共享数据中的选中元素
        sharedData.selectedElement = elementId;
        
        // 同步到其他视图
        const instances = [window.cyTree, window.cyNetwork];
        instances.forEach(instance => {
            if (instance && instance !== sourceInstance) {
                // 清除当前选择
                const selected = instance.elements('*:selected');
                if (selected && typeof selected.unselect === 'function') {
                    selected.unselect();
                }
                
                // 选择对应元素
                const element = instance.getElementById(elementId);
                if (element && element.length > 0 && typeof element.select === 'function') {
                    element.select();
                }
            }
        });
    } catch (error) {
        console.error('Neo4j Editor: Error synchronizing selection:', error);
    }
}