/**
 * 图数据管理模块
 */

// 共享图数据存储
window.sharedGraphData = window.sharedGraphData || { 
    nodes: [], 
    edges: [],
    selectedElement: null,
    // 用于存储用户删除的关系，避免自动重新创建
    deletedEdges: [],
    // 节点模板配置
    nodeTemplates: {},
    // 已配置的Neo4j标签
    neo4jLabels: ['tree', 'network'],
    // 当前激活的标签过滤器
    activeLabelFilters: []
};

/**
 * 检查数组中是否包含元素（兼容Set功能）
 */
function arrayHasElement(arr, element) {
    if (!arr || arr.length === undefined) return false;
    for (var i = 0; i < arr.length; i++) {
        if (arr[i] === element) {
            return true;
        }
    }
    return false;
}

/**
 * 向数组添加唯一元素（兼容Set.add功能）
 */
function arrayAddUnique(arr, element) {
    if (!arr || arr.length === undefined) return;
    if (!arrayHasElement(arr, element)) {
        arr.push(element);
    }
}

/**
 * 获取数组大小（兼容Set.size功能）
 */
function arraySize(arr) {
    return arr && arr.length !== undefined ? arr.length : 0;
}

/**
 * 清空数组（兼容Set.clear功能）
 */
function arrayClear(arr) {
    if (arr && arr.length !== undefined) {
        arr.length = 0;
    }
}

/**
 * 检查节点code的唯一性
 * @param {string} code - 要检查的code值
 * @param {string} excludeNodeId - 要排除的节点ID（用于更新操作）
 * @returns {boolean} code是否唯一
 */
window.isNodeCodeUnique = function(code, excludeNodeId) {
    if (!code) return false;
    
    // 处理可选参数默认值
    if (excludeNodeId === undefined) {
        excludeNodeId = null;
    }
    
    var sharedData = window.sharedGraphData || { nodes: [] };
    // 使用传统for循环替代some方法
    var nodes = sharedData.nodes || [];
    for (var i = 0; i < nodes.length; i++) {
        var node = nodes[i];
        if (node && 
            node.data && 
            node.data.id !== excludeNodeId && 
            node.data.code === code) {
            return false;
        }
    }
    return true;
}

/**
 * 生成唯一的节点code
 * @returns {string} 唯一的code值
 */
window.generateUniqueNodeCode = function() {
    var code;
    var attempts = 0;
    var maxAttempts = 100;
    
    do {
        code = 'node_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
        attempts++;
    } while (!window.isNodeCodeUnique(code) && attempts < maxAttempts);
    
    return code;
}

/**
 * 配置Neo4j标签
 * @param {Array<string>} labels - 要配置的标签列表
 */
window.configureNeo4jLabels = function(labels) {
    if (!Array.isArray(labels)) return;
    
    var sharedData = window.sharedGraphData || {};
    // 替代展开运算符
    var newLabels = [];
    for (var i = 0; i < labels.length; i++) {
        newLabels.push(labels[i]);
    }
    sharedData.neo4jLabels = newLabels;
    
    console.log('Neo4j Editor: Neo4j labels configured:', labels);
}

/**
 * 设置标签过滤器
 * @param {Array<string>} labels - 要过滤的标签列表
 */
window.setLabelFilters = function(labels) {
    if (!Array.isArray(labels)) return;
    
    var sharedData = window.sharedGraphData || {};
    // 替代Set构造函数
    var filterSet = [];
    for (var i = 0; i < labels.length; i++) {
        arrayAddUnique(filterSet, labels[i]);
    }
    sharedData.activeLabelFilters = filterSet;
    
    // 应用过滤
    syncGraphData();
    
    console.log('Neo4j Editor: Label filters set:', labels);
}

/**
 * 导出图数据为可保存的格式
 * @returns {Object} 包含nodes和edges的图数据对象
 */
window.exportGraphData = function() {
    try {
        const sharedData = window.sharedGraphData || { nodes: [], edges: [] };
        const exportData = {
            nodes: [],
            edges: [],
            metadata: {
                exportDate: new Date().toISOString(),
                nodeCount: sharedData.nodes.length,
                edgeCount: sharedData.edges.length,
                neo4jLabels: sharedData.neo4jLabels || []
            }
        };
        
        // 导出节点 - 仅包含必要数据
        if (Array.isArray(sharedData.nodes)) {
            sharedData.nodes.forEach(node => {
                if (node && node.data) {
                    const exportNode = {
                        group: 'nodes',
                        data: {
                            id: node.data.id,
                            label: node.data.label || '',
                            code: node.data.code || '',
                            labels: node.data.labels || ['tree', 'network'],
                            level: node.data.level || 0,
                            properties: node.data.properties || {}
                        },
                        position: node.position || { x: 0, y: 0 }
                    };
                    exportData.nodes.push(exportNode);
                }
            });
        }
        
        // 导出边 - 仅包含必要数据
        if (Array.isArray(sharedData.edges)) {
            sharedData.edges.forEach(edge => {
                if (edge && edge.data) {
                    const exportEdge = {
                        group: 'edges',
                        data: {
                            id: edge.data.id,
                            source: edge.data.source,
                            target: edge.data.target,
                            type: edge.data.type || 'RELATES_TO',
                            properties: edge.data.properties || {}
                        }
                    };
                    exportData.edges.push(exportEdge);
                }
            });
        }
        
        console.log('Neo4j Editor: Graph data exported successfully');
        return exportData;
    } catch (error) {
        console.error('Neo4j Editor: Error exporting graph data:', error);
        return { nodes: [], edges: [], metadata: { error: error.message } };
    }
};

/**
 * 获取符合当前标签过滤条件的节点
 * @param {Array} nodes - 节点数组
 * @returns {Array} 过滤后的节点数组
 */
window.filterNodesByLabels = function(nodes) {
    if (!Array.isArray(nodes)) return [];
    
    var sharedData = window.sharedGraphData || {};
    var activeFilters = sharedData.activeLabelFilters || [];
    
    // 如果没有激活的过滤器，返回所有节点
    if (arraySize(activeFilters) === 0) return nodes;
    
    // 过滤包含任一激活标签的节点
    var filteredNodes = [];
    for (var i = 0; i < nodes.length; i++) {
        var node = nodes[i];
        if (!node || !node.data || !Array.isArray(node.data.labels)) {
            continue;
        }
        
        // 检查节点标签是否包含任一激活的过滤器标签
        var hasMatchingLabel = false;
        for (var j = 0; j < node.data.labels.length; j++) {
            var label = node.data.labels[j];
            if (arrayHasElement(activeFilters, label)) {
                hasMatchingLabel = true;
                break;
            }
        }
        
        if (hasMatchingLabel) {
            filteredNodes.push(node);
        }
    }
    
    return filteredNodes;
};

/**
 * 保存节点模板
 * @param {string} name - 模板名称
 * @param {Object} templateData - 模板数据
 */
window.saveNodeTemplate = function(name, templateData) {
    if (!name || !templateData) return;
    
    var sharedData = window.sharedGraphData || {};
    // 替代展开运算符进行对象复制
    sharedData.nodeTemplates = sharedData.nodeTemplates || {};
    var newTemplate = {};
    for (var key in templateData) {
        if (templateData.hasOwnProperty(key)) {
            newTemplate[key] = templateData[key];
        }
    }
    sharedData.nodeTemplates[name] = newTemplate;
    
    console.log('Neo4j Editor: Node template saved:', name);
}

/**
 * 获取节点模板
 * @param {string} name - 模板名称
 * @returns {Object|null} 模板数据或null
 */
window.getNodeTemplate = function(name) {
    if (!name) return null;
    
    var sharedData = window.sharedGraphData || {};
    if (sharedData.nodeTemplates && sharedData.nodeTemplates[name]) {
        // 替代展开运算符进行对象复制
        var templateCopy = {};
        var originalTemplate = sharedData.nodeTemplates[name];
        for (var key in originalTemplate) {
            if (originalTemplate.hasOwnProperty(key)) {
                templateCopy[key] = originalTemplate[key];
            }
        }
        return templateCopy;
    }
    return null;
}

/**
 * 保存图数据到本地存储
 * @param {Function} successCallback - 成功回调
 * @param {Function} errorCallback - 错误回调
 */
window.saveGraphToLocalStorage = function(successCallback, errorCallback) {
    try {
        // 使用新的进度指示器
        const progressId = 'saveGraphData';
        const progressMessage = '保存图数据中...';
        
        // 显示进度指示器
        if (typeof window.showProgressIndicator === 'function') {
            window.showProgressIndicator(progressId, progressMessage, 0);
        } else if (typeof window.viewManager === 'object' && typeof window.viewManager.showProgressToast === 'function') {
            // 降级方案
            window.viewManager.showProgressToast(progressId, progressMessage, 0);
        }
        
        // 获取要保存的数据
        const graphData = window.exportGraphData();
        
        // 清除旧数据
        localStorage.removeItem('graphData');
        localStorage.removeItem('graphData:metadata');
        
        // 清除所有分批数据键
        Object.keys(localStorage).forEach(key => {
            if (key.startsWith('graphData:nodes:') || key.startsWith('graphData:edges:')) {
                localStorage.removeItem(key);
            }
        });
        
        // 分批保存（防止大数据量超出localStorage限制）
        const BATCH_SIZE = 100; // 每批保存的节点/边数量
        
        // 保存元数据
        const metadata = {
            ...graphData.metadata,
            savedAt: new Date().toISOString(),
            nodeCount: graphData.nodes.length,
            edgeCount: graphData.edges.length,
            nodeBatches: Math.ceil(graphData.nodes.length / BATCH_SIZE),
            edgeBatches: Math.ceil(graphData.edges.length / BATCH_SIZE)
        };
        localStorage.setItem('graphData:metadata', JSON.stringify(metadata));
        
        // 保存节点数据（分批）
        for (let i = 0; i < graphData.nodes.length; i += BATCH_SIZE) {
            const batch = graphData.nodes.slice(i, i + BATCH_SIZE);
            const batchKey = `graphData:nodes:${i / BATCH_SIZE}`;
            localStorage.setItem(batchKey, JSON.stringify(batch));
            
            // 更新进度
            const progress = Math.floor((i / graphData.nodes.length) * 40);
            const currentMessage = `保存节点数据... (${Math.min(i + BATCH_SIZE, graphData.nodes.length)} / ${graphData.nodes.length})`;
            
            if (typeof window.showProgressIndicator === 'function') {
                window.showProgressIndicator(progressId, currentMessage, progress);
            } else if (typeof window.viewManager === 'object' && typeof window.viewManager.updateProgressToast === 'function') {
                window.viewManager.updateProgressToast(progressId, currentMessage, progress);
            }
        }
        
        // 保存边数据（分批）
        for (let i = 0; i < graphData.edges.length; i += BATCH_SIZE) {
            const batch = graphData.edges.slice(i, i + BATCH_SIZE);
            const batchKey = `graphData:edges:${i / BATCH_SIZE}`;
            localStorage.setItem(batchKey, JSON.stringify(batch));
            
            // 更新进度
            const progress = 40 + Math.floor((i / graphData.edges.length) * 40);
            const currentMessage = `保存关系数据... (${Math.min(i + BATCH_SIZE, graphData.edges.length)} / ${graphData.edges.length})`;
            
            if (typeof window.showProgressIndicator === 'function') {
                window.showProgressIndicator(progressId, currentMessage, progress);
            } else if (typeof window.viewManager === 'object' && typeof window.viewManager.updateProgressToast === 'function') {
                window.viewManager.updateProgressToast(progressId, currentMessage, progress);
            }
        }
        
        // 保存完成
        const completionMessage = `保存完成！共保存 ${graphData.nodes.length} 个节点和 ${graphData.edges.length} 个关系`;
        
        if (typeof window.hideProgressIndicator === 'function') {
            window.hideProgressIndicator(progressId, completionMessage, true);
        } else if (typeof window.viewManager === 'object' && typeof window.viewManager.updateProgressToast === 'function') {
            window.viewManager.updateProgressToast(progressId, completionMessage, 100);
            setTimeout(() => {
                if (typeof window.viewManager.removeProgressToast === 'function') {
                    window.viewManager.removeProgressToast(progressId);
                }
            }, 1500);
        }
        
        // 显示成功提示
        if (typeof window.showToast === 'function') {
            window.showToast(completionMessage, 'success');
        }
        
        console.log('Neo4j Editor: Graph data saved to localStorage successfully');
        
        // 触发保存完成事件
        if (typeof window.dispatchEvent === 'function') {
            const event = new CustomEvent('graphDataSaved', { detail: metadata });
            window.dispatchEvent(event);
        }
        
        if (typeof successCallback === 'function') {
            successCallback(metadata);
        }
        
    } catch (error) {
        console.error('Neo4j Editor: Error saving graph data to localStorage:', error);
        
        // 隐藏进度指示器并显示错误
        if (typeof window.hideProgressIndicator === 'function') {
            window.hideProgressIndicator('saveGraphData', '保存失败', false);
        } else if (typeof window.viewManager === 'object' && typeof window.viewManager.updateProgressToast === 'function') {
            window.viewManager.updateProgressToast('saveGraphData', '保存失败', 0, true);
        }
        
        // 显示错误提示
        const errorMessage = `保存图数据失败: ${error.message}`;
        if (typeof window.showToast === 'function') {
            window.showToast(errorMessage, 'error', 5000); // 错误消息显示更长时间
        }
        
        if (typeof errorCallback === 'function') {
            errorCallback(error);
        }
    }
};

/**
 * 记录已删除的关系
 * @param {string} edgeId - 关系ID
 */
window.recordDeletedEdge = function(edgeId) {
    if (!edgeId) return;
    
    var sharedData = window.sharedGraphData || {};
    sharedData.deletedEdges = sharedData.deletedEdges || [];
    arrayAddUnique(sharedData.deletedEdges, edgeId);
}

/**
 * 从本地存储加载图数据
 * @param {boolean} append - 是否追加到现有数据
 * @param {Function} successCallback - 成功回调
 * @param {Function} errorCallback - 错误回调
 */
window.loadGraphFromLocalStorage = function(append = false, successCallback, errorCallback) {
    try {
        // 使用新的进度指示器
        const progressId = 'loadGraphData';
        const progressMessage = append ? '追加加载图数据中...' : '加载图数据中...';
        
        // 显示进度指示器
        if (typeof window.showProgressIndicator === 'function') {
            window.showProgressIndicator(progressId, progressMessage, 0);
        } else if (typeof window.viewManager === 'object' && typeof window.viewManager.showProgressToast === 'function') {
            // 降级方案
            window.viewManager.showProgressToast(progressId, progressMessage, 0);
        }
        
        // 检查是否存在元数据
        const metadataStr = localStorage.getItem('graphData:metadata');
        if (!metadataStr) {
            throw new Error('未找到保存的图数据');
        }
        
        const metadata = JSON.parse(metadataStr);
        
        // 计算总节点数和边数
        const totalNodes = metadata.nodeCount || 0;
        const totalEdges = metadata.edgeCount || 0;
        
        // 更新进度 - 显示元数据信息
        const metadataMessage = `读取元数据完成 (上次保存时间: ${new Date(metadata.savedAt).toLocaleString()})`;
        if (typeof window.showProgressIndicator === 'function') {
            window.showProgressIndicator(progressId, metadataMessage, 10);
        }
        
        const graphData = {
            nodes: [],
            edges: [],
            metadata: metadata
        };
        
        // 加载节点数据（分批）
        const totalNodeBatches = metadata.nodeBatches || 0;
        let loadedNodes = 0;
        
        for (let i = 0; i < totalNodeBatches; i++) {
            const batchKey = `graphData:nodes:${i}`;
            const batchStr = localStorage.getItem(batchKey);
            if (batchStr) {
                try {
                    const batch = JSON.parse(batchStr);
                    if (Array.isArray(batch)) {
                        graphData.nodes = graphData.nodes.concat(batch);
                        loadedNodes += batch.length;
                    }
                } catch (parseError) {
                    console.warn('Neo4j Editor: Error parsing node batch', i, parseError);
                }
            }
            
            // 更新进度
            const progress = 10 + Math.floor((loadedNodes / Math.max(totalNodes, 1)) * 40);
            const nodeMessage = `加载节点数据... (${loadedNodes} / ${totalNodes})`;
            
            if (typeof window.showProgressIndicator === 'function') {
                window.showProgressIndicator(progressId, nodeMessage, progress);
            } else if (typeof window.viewManager === 'object' && typeof window.viewManager.updateProgressToast === 'function') {
                window.viewManager.updateProgressToast(progressId, `加载节点数据... ${i+1}/${totalNodeBatches}`, progress);
            }
        }
        
        // 加载边数据（分批）
        const totalEdgeBatches = metadata.edgeBatches || 0;
        let loadedEdges = 0;
        
        for (let i = 0; i < totalEdgeBatches; i++) {
            const batchKey = `graphData:edges:${i}`;
            const batchStr = localStorage.getItem(batchKey);
            if (batchStr) {
                try {
                    const batch = JSON.parse(batchStr);
                    if (Array.isArray(batch)) {
                        graphData.edges = graphData.edges.concat(batch);
                        loadedEdges += batch.length;
                    }
                } catch (parseError) {
                    console.warn('Neo4j Editor: Error parsing edge batch', i, parseError);
                }
            }
            
            // 更新进度
            const progress = 50 + Math.floor((loadedEdges / Math.max(totalEdges, 1)) * 40);
            const edgeMessage = `加载关系数据... (${loadedEdges} / ${totalEdges})`;
            
            if (typeof window.showProgressIndicator === 'function') {
                window.showProgressIndicator(progressId, edgeMessage, progress);
            } else if (typeof window.viewManager === 'object' && typeof window.viewManager.updateProgressToast === 'function') {
                window.viewManager.updateProgressToast(progressId, `加载关系数据... ${i+1}/${totalEdgeBatches}`, progress);
            }
        }
        
        // 更新进度 - 准备加载数据到编辑器
        if (typeof window.showProgressIndicator === 'function') {
            window.showProgressIndicator(progressId, '准备显示数据...', 90);
        }
        
        // 加载数据到编辑器
        window.loadGraphFromData(graphData, append);
        
        // 加载完成
        const completionMessage = append 
            ? `追加完成！已添加 ${graphData.nodes.length} 个节点和 ${graphData.edges.length} 个关系` 
            : `加载完成！共加载 ${graphData.nodes.length} 个节点和 ${graphData.edges.length} 个关系`;
        
        if (typeof window.hideProgressIndicator === 'function') {
            window.hideProgressIndicator(progressId, completionMessage, true);
        } else if (typeof window.viewManager === 'object' && typeof window.viewManager.updateProgressToast === 'function') {
            window.viewManager.updateProgressToast(progressId, completionMessage, 100);
            setTimeout(() => {
                if (typeof window.viewManager.removeProgressToast === 'function') {
                    window.viewManager.removeProgressToast(progressId);
                }
            }, 1500);
        }
        
        // 显示成功提示
        if (typeof window.showToast === 'function') {
            window.showToast(completionMessage, 'success');
        }
        
        console.log('Neo4j Editor: Graph data loaded from localStorage successfully');
        
        // 触发加载完成事件
        if (typeof window.dispatchEvent === 'function') {
            const event = new CustomEvent('graphDataLoadedFromStorage', { 
                detail: { 
                    nodeCount: graphData.nodes.length, 
                    edgeCount: graphData.edges.length,
                    savedAt: metadata.savedAt,
                    append: append
                } 
            });
            window.dispatchEvent(event);
        }
        
        if (typeof successCallback === 'function') {
            successCallback(graphData);
        }
        
    } catch (error) {
        console.error('Neo4j Editor: Error loading graph data from localStorage:', error);
        
        // 隐藏进度指示器并显示错误
        if (typeof window.hideProgressIndicator === 'function') {
            window.hideProgressIndicator('loadGraphData', '加载失败', false);
        } else if (typeof window.viewManager === 'object' && typeof window.viewManager.updateProgressToast === 'function') {
            window.viewManager.updateProgressToast('loadGraphData', '加载失败: ' + error.message, 0, true);
        }
        
        // 显示错误提示
        const errorMessage = `加载图数据失败: ${error.message}`;
        if (typeof window.showToast === 'function') {
            window.showToast(errorMessage, 'error', 5000); // 错误消息显示更长时间
        }
        
        if (typeof errorCallback === 'function') {
            errorCallback(error);
        }
    }
};

/**
 * 检查关系是否已被删除
 * @param {string} sourceId - 源节点ID
 * @param {string} targetId - 目标节点ID
 * @param {string} type - 关系类型
 * @returns {boolean} 关系是否已被删除
 */
window.isEdgeDeleted = function(sourceId, targetId, type) {
    var sharedData = window.sharedGraphData || {};
    var deletedEdges = sharedData.deletedEdges || [];
    
    // 检查正向和反向关系是否存在于删除数组中
    var forwardEdgeId = type + ':' + sourceId + ':' + targetId;
    var reverseEdgeId = type + ':' + targetId + ':' + sourceId;
    
    return arrayHasElement(deletedEdges, forwardEdgeId) || 
           arrayHasElement(deletedEdges, reverseEdgeId);
}

/**
 * 清除删除关系记录
 * @param {string} type - 可选，指定要清除的关系类型
 */
window.clearDeletedEdges = function(type) {
    // 处理可选参数默认值
    if (type === undefined) {
        type = null;
    }
    
    var sharedData = window.sharedGraphData || {};
    sharedData.deletedEdges = sharedData.deletedEdges || [];
    
    if (type) {
        // 只清除特定类型的删除记录
        var filteredEdges = [];
        var typePrefix = type + ':';
        for (var i = 0; i < sharedData.deletedEdges.length; i++) {
            var edge = sharedData.deletedEdges[i];
            // 检查是否不以指定类型开头
            if (typeof edge === 'string' && edge.indexOf(typePrefix) !== 0) {
                filteredEdges.push(edge);
            }
        }
        sharedData.deletedEdges = filteredEdges;
    } else {
        // 清除所有删除记录
        arrayClear(sharedData.deletedEdges);
    }
}


/**
 * 同步图数据到两个视图
 */
window.syncGraphData = function() {
    // 防止循环调用导致栈溢出
    if (window.isSyncingGraphData) {
        return;
    }
    
    try {
        window.isSyncingGraphData = true;
        console.log('Neo4j Editor: Starting graph data sync');
        
        // 确保必要组件存在
        if (!window.cyTree || !window.cyNetwork || !window.sharedGraphData) {
            console.error('Neo4j Editor: Missing required components for sync');
            return;
        }
        
        // 确保共享数据存在
        var sharedData = window.sharedGraphData || { nodes: [], edges: [] };
        const { nodes, edges } = sharedData;
        
        // 获取所有节点，应用标签过滤
        var allNodes = window.filterNodesByLabels(nodes) || [];
        
        // ===== 树形图视图同步 =====
        if (window.cyTree && typeof window.cyTree === 'object') {
            try {
                // 安全地清空树形图视图
                if (window.cyTree.elements && typeof window.cyTree.elements === 'function') {
                    const treeElements = window.cyTree.elements();
                    if (treeElements && typeof treeElements.remove === 'function') {
                        treeElements.remove();
                    }
                }
                
                // 过滤并添加节点 - 只显示带'tree'标签的节点
                const treeNodes = allNodes.filter(node => 
                    node && node.data && Array.isArray(node.data.labels) && 
                    node.data.labels.includes('tree')
                );
                
                // 过滤相关边 - 只显示CHILD_OF关系
                const treeNodeIds = new Set(treeNodes.map(n => n.data.id));
                const treeEdges = edges.filter(edge => 
                    edge && edge.data && 
                    treeNodeIds.has(edge.data.source) && 
                    treeNodeIds.has(edge.data.target) &&
                    edge.data.type === 'CHILD_OF'
                );
                
                // 添加到树形图视图
                if (treeNodes.length > 0) {
                    window.cyTree.add(treeNodes);
                }
                if (treeEdges.length > 0) {
                    window.cyTree.add(treeEdges);
                }
                
                // 运行布局 - 使用适合树状结构的布局
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
                
                console.log(`Neo4j Editor: Synced ${treeNodes.length} nodes and ${treeEdges.length} edges to tree view`);
            } catch (treeError) {
                console.warn('Neo4j Editor: Error syncing tree view:', treeError);
            }
        }
        
        // ===== 网络图视图同步 =====
        if (window.cyNetwork && typeof window.cyNetwork === 'object') {
            try {
                // 安全地清空网络图视图
                if (window.cyNetwork.elements && typeof window.cyNetwork.elements === 'function') {
                    const networkElements = window.cyNetwork.elements();
                    if (networkElements && typeof networkElements.remove === 'function') {
                        networkElements.remove();
                    }
                }
                
                // 过滤并添加节点 - 只显示带'network'标签的节点
                const networkNodes = allNodes.filter(node => 
                    node && node.data && Array.isArray(node.data.labels) && 
                    node.data.labels.includes('network')
                );
                
                // 过滤相关边 - 显示所有与网络节点相关的边
                const networkNodeIds = new Set(networkNodes.map(n => n.data.id));
                const networkEdges = edges.filter(edge => 
                    edge && edge.data && 
                    networkNodeIds.has(edge.data.source) && 
                    networkNodeIds.has(edge.data.target)
                );
                
                // 添加到网络图视图
                if (networkNodes.length > 0) {
                    window.cyNetwork.add(networkNodes);
                }
                if (networkEdges.length > 0) {
                    window.cyNetwork.add(networkEdges);
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
                
                console.log(`Neo4j Editor: Synced ${networkNodes.length} nodes and ${networkEdges.length} edges to network view`);
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
        
        // 触发同步完成事件
        if (typeof window.onSyncComplete === 'function') {
            window.onSyncComplete();
        }
        
    } catch (error) {
        console.error('Neo4j Editor: Failed to sync graph data:', error);
        if (typeof window.showToast === 'function') {
            window.showToast('Failed to synchronize graph data: ' + error.message, 'error');
        }
    } finally {
        // 使用setTimeout确保当前同步完成后再重置标志
        setTimeout(() => {
            window.isSyncingGraphData = false;
        }, 0);
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
            
            // 收集要移除的边
            const edgesToRemove = [];
            sharedData.edges = (sharedData.edges || []).filter((edge, index) => {
                if (edge && edge.data && (edge.data.source === elementId || edge.data.target === elementId)) {
                    // 对于RELATES_TO类型的边，记录删除状态
                    if (edge.data.type === 'RELATES_TO') {
                        window.recordDeletedEdge(`${edge.data.type}:${edge.data.source}:${edge.data.target}`);
                    }
                    return false;
                }
                return true;
            });
        } else {
            // 从边数组中移除
            const edgeIndex = (sharedData.edges || []).findIndex(edge => edge && edge.data && edge.data.id === elementId);
            if (edgeIndex !== -1) {
                const edge = sharedData.edges[edgeIndex];
                elementLabel = edge.data.label || 'Relationship';
                
                // 记录已删除的RELATES_TO关系
                if (edge.data.type === 'RELATES_TO') {
                    window.recordDeletedEdge(`${edge.data.type}:${edge.data.source}:${edge.data.target}`);
                }
                
                sharedData.edges.splice(edgeIndex, 1);
            }
        }
        
        // 同步到视图
        syncGraphData();
        
        // 显示提示
        if (typeof window.showToast === 'function') {
            window.showToast(elementLabel + ' deleted');
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
        const sharedData = window.sharedGraphData || { 
            nodes: [], 
            edges: [],
            neo4jLabels: [],
            activeLabelFilters: [],
            deletedEdges: [],
            nodeTemplates: {}
        };
        
        // 根据append参数决定是替换还是追加
        if (!append) {
            sharedData.nodes = [];
            sharedData.edges = [];
            sharedData.deletedEdges = [];
        }
        
        // 添加节点，确保不重复
        const existingNodeIds = new Set();
        if (Array.isArray(sharedData.nodes)) {
            for (var i = 0; i < sharedData.nodes.length; i++) {
                if (sharedData.nodes[i] && sharedData.nodes[i].data && sharedData.nodes[i].data.id) {
                    existingNodeIds.add(sharedData.nodes[i].data.id);
                }
            }
        }
        
        let nodeCount = 0;
        if (Array.isArray(graphData.nodes)) {
            graphData.nodes.forEach(node => {
                if (node && node.data && node.data.id && !existingNodeIds.has(node.data.id)) {
                    // 确保每个节点都有正确的标签
                    if (!node.data.labels) {
                        node.data.labels = ['tree', 'network'];
                    } else if (!Array.isArray(node.data.labels)) {
                        node.data.labels = [node.data.labels];
                    }
                    
                    // 确保节点同时具有tree和network标签
                    if (!node.data.labels.includes('tree')) {
                        node.data.labels.push('tree');
                    }
                    if (!node.data.labels.includes('network')) {
                        node.data.labels.push('network');
                    }
                    
                    // 收集所有Neo4j标签
                    if (Array.isArray(node.data.labels)) {
                        node.data.labels.forEach(label => {
                            if (label && label !== 'tree' && label !== 'network' && !sharedData.neo4jLabels.includes(label)) {
                                sharedData.neo4jLabels.push(label);
                            }
                        });
                    }
                    
                    // 确保节点有基本属性
                    if (!node.data.properties) {
                        node.data.properties = {};
                    }
                    
                    // 确保节点有code属性且唯一
                    if (!node.data.code || !window.checkNodeCodeUnique(node.data.code, node.data.id)) {
                        node.data.code = window.generateUniqueNodeCode();
                    }
                    
                    // 添加到共享数据
                    sharedData.nodes.push(node);
                    existingNodeIds.add(node.data.id);
                    nodeCount++;
                }
            });
        }
        
        // 添加边，确保不重复
        const existingEdgeIds = new Set();
        // 收集现有边的ID
        if (Array.isArray(sharedData.edges)) {
            for (var i = 0; i < sharedData.edges.length; i++) {
                if (sharedData.edges[i] && sharedData.edges[i].data && sharedData.edges[i].data.id) {
                    existingEdgeIds.add(sharedData.edges[i].data.id);
                }
            }
        }
        
        let edgeCount = 0;
        // 添加新边
        if (Array.isArray(graphData.edges)) {
            graphData.edges.forEach(edge => {
                if (edge && edge.data && edge.data.id && !existingEdgeIds.has(edge.data.id)) {
                    // 确保边引用的节点存在
                    if (existingNodeIds.has(edge.data.source) && existingNodeIds.has(edge.data.target)) {
                        // 确保关系有类型
                        if (!edge.data.type) {
                            edge.data.type = 'RELATES_TO';
                        }
                        
                        // 确保关系有属性对象
                        if (!edge.data.properties) {
                            edge.data.properties = {};
                        }
                        
                        // 添加到共享数据
                        sharedData.edges.push(edge);
                        existingEdgeIds.add(edge.data.id);
                        edgeCount++;
                    }
                }
            });
        }
        
        // 更新节点层级信息
        updateNodeHierarchy();
        
        // 同步到视图
        syncGraphData();
        
        // 显示提示
        if (typeof window.showToast === 'function') {
            window.showToast('已加载 ' + nodeCount + ' 个节点和 ' + edgeCount + ' 个关系', 'success');
        }
        
        // 触发数据加载完成事件
        if (typeof window.dispatchEvent === 'function') {
            const event = new CustomEvent('graphDataLoaded', { 
                detail: { nodeCount, edgeCount, append } 
            });
            window.dispatchEvent(event);
        }
        
    } catch (error) {
        console.error('Neo4j Editor: Error loading graph data:', error);
        if (typeof window.showToast === 'function') {
            window.showToast('加载图数据失败: ' + error.message, 'error');
        }
    }
};

/**
 * 更新节点层级信息
 */
function updateNodeHierarchy() {
    const sharedData = window.sharedGraphData || {};
    const nodes = sharedData.nodes || [];
    const edges = sharedData.edges || [];
    
    // 重置所有节点层级
    nodes.forEach(node => {
        if (node && node.data) {
            node.data.level = 0;
        }
    });
    
    // 查找所有根节点（没有CHILD_OF入边的节点）
    const hasIncomingChildOf = {};
    edges.forEach(edge => {
        if (edge && edge.data && edge.data.type === 'CHILD_OF') {
            hasIncomingChildOf[edge.data.target] = true;
        }
    });
    
    // 设置根节点层级为0，然后递归更新子节点
    nodes.forEach(node => {
        if (node && node.data && !hasIncomingChildOf[node.data.id]) {
            window.updateNodeLevel(node.data.id, 0);
        }
    });
}

/**
 * 同步选中元素到所有视图
 * @param {Object} target - 被选中的元素
 * @param {Object} sourceInstance - 源Cytoscape实例
 */
window.synchronizeSelection = function(target, sourceInstance) {
    // 添加标志防止循环调用
    if (window.isSynchronizingSelection) {
        return;
    }
    
    try {
        window.isSynchronizingSelection = true;
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
    } finally {
        // 确保在任何情况下都重置标志
        setTimeout(() => {
            window.isSynchronizingSelection = false;
        }, 0);
    }
}

/**
 * 管理同一父节点下节点之间的关系
 * @param {string} parentId - 父节点ID
 */
function manageSiblingRelationships(parentId) {
    try {
        const sharedData = window.sharedGraphData || { nodes: [], edges: [] };
        
        // 找出所有具有相同父节点的子节点
        const siblings = [];
        const childEdges = (sharedData.edges || []).filter(edge => 
            edge && edge.data && 
            edge.data.type === 'CHILD_OF' && 
            edge.data.target === parentId
        );
        
        // 获取所有子节点
        childEdges.forEach(edge => {
            const childNode = (sharedData.nodes || []).find(node => 
                node && node.data && node.data.id === edge.data.source
            );
            if (childNode) {
                siblings.push(childNode);
            }
        });
        
        // 为每对子节点创建RELATES_TO关系
        for (let i = 0; i < siblings.length; i++) {
            for (let j = i + 1; j < siblings.length; j++) {
                const nodeA = siblings[i];
                const nodeB = siblings[j];
                
                // 检查正向和反向关系是否已存在或已被删除
                const forwardExists = (sharedData.edges || []).some(edge => 
                    edge && edge.data && 
                    edge.data.type === 'RELATES_TO' && 
                    edge.data.source === nodeA.data.id && 
                    edge.data.target === nodeB.data.id
                );
                
                const backwardExists = (sharedData.edges || []).some(edge => 
                    edge && edge.data && 
                    edge.data.type === 'RELATES_TO' && 
                    edge.data.source === nodeB.data.id && 
                    edge.data.target === nodeA.data.id
                );
                
                // 检查是否已被删除
                const forwardDeleted = window.isEdgeDeleted(nodeA.data.id, nodeB.data.id, 'RELATES_TO');
                const backwardDeleted = window.isEdgeDeleted(nodeB.data.id, nodeA.data.id, 'RELATES_TO');
                
                // 如果不存在且未被删除，则创建关系
                if (!forwardExists && !forwardDeleted) {
                    const edgeId = `rel_${nodeA.data.id}_${nodeB.data.id}`;
                    sharedData.edges.push({
                        group: 'edges',
                        data: {
                            id: edgeId,
                            source: nodeA.data.id,
                            target: nodeB.data.id,
                            type: 'RELATES_TO',
                            label: 'RELATES_TO'
                        }
                    });
                }
                
                if (!backwardExists && !backwardDeleted) {
                    const edgeId = `rel_${nodeB.data.id}_${nodeA.data.id}`;
                    sharedData.edges.push({
                        group: 'edges',
                        data: {
                            id: edgeId,
                            source: nodeB.data.id,
                            target: nodeA.data.id,
                            type: 'RELATES_TO',
                            label: 'RELATES_TO'
                        }
                    });
                }
            }
        }
        
        // 同步到视图
        window.syncGraphData();
    } catch (error) {
        console.error('Neo4j Editor: Error managing sibling relationships:', error);
    }
}

/**
 * 检查父子关系是否会形成循环
 * @param {string} childId - 子节点ID
 * @param {string} parentId - 父节点ID
 * @returns {boolean} 是否存在循环
 */
function checkForCircularReference(childId, parentId) {
    if (childId === parentId) return true;
    
    const sharedData = window.sharedGraphData || { edges: [] };
    const visited = new Set();
    
    function dfs(currentId, targetId) {
        if (currentId === targetId) return true;
        if (visited.has(currentId)) return false;
        
        visited.add(currentId);
        
        // 找到所有父节点
        const parentEdges = (sharedData.edges || []).filter(edge => 
            edge && edge.data && 
            edge.data.type === 'CHILD_OF' && 
            edge.data.source === currentId
        );
        
        for (const edge of parentEdges) {
            if (dfs(edge.data.target, targetId)) {
                return true;
            }
        }
        
        return false;
    }
    
    // 检查从父节点到子节点是否有路径
    return dfs(parentId, childId);
}

/**
 * 设置节点的父节点
 * @param {string} childId - 子节点ID
 * @param {string} newParentId - 新父节点ID
 * @returns {boolean} 是否设置成功
 */
window.setNodeParent = function(childId, newParentId) {
    try {
        const sharedData = window.sharedGraphData || { nodes: [], edges: [] };
        
        // 验证节点存在
        const childNode = (sharedData.nodes || []).find(node => 
            node && node.data && node.data.id === childId
        );
        const parentNode = (sharedData.nodes || []).find(node => 
            node && node.data && node.data.id === newParentId
        );
        
        if (!childNode || !parentNode) {
            throw new Error('子节点或父节点不存在');
        }
        
        // 检查循环引用
        if (checkForCircularReference(childId, newParentId)) {
            throw new Error('设置此父节点会导致循环引用');
        }
        
        // 删除现有的父子关系
        const existingEdges = (sharedData.edges || []).filter(edge => 
            edge && edge.data && 
            edge.data.type === 'CHILD_OF' && 
            edge.data.source === childId
        );
        
        existingEdges.forEach(edge => {
            const index = sharedData.edges.indexOf(edge);
            if (index > -1) {
                sharedData.edges.splice(index, 1);
            }
        });
        
        // 添加新的父子关系
        const edgeId = `child_of_${childId}_${newParentId}`;
        sharedData.edges.push({
            group: 'edges',
            data: {
                id: edgeId,
                source: childId,
                target: newParentId,
                type: 'CHILD_OF',
                label: 'CHILD_OF'
            }
        });
        
        // 更新同级关系
        if (existingEdges.length > 0) {
            // 更新旧父节点的同级关系
            existingEdges.forEach(edge => {
                manageSiblingRelationships(edge.data.target);
            });
        }
        // 更新新父节点的同级关系
        manageSiblingRelationships(newParentId);
        
        // 应用属性继承规则
        applyNodeInheritanceRules(childId);
        
        // 同步到视图
        window.syncGraphData();
        
        return true;
    } catch (error) {
        console.error('Neo4j Editor: Error setting node parent:', error);
        if (typeof window.showToast === 'function') {
            window.showToast('设置父节点失败: ' + error.message, 'error');
        }
        return false;
    }
}

/**
 * 应用节点属性继承规则
 * @param {string} nodeId - 要应用继承规则的节点ID
 */
function applyNodeInheritanceRules(nodeId) {
    try {
        console.log(`Neo4j Editor: Applying inheritance rules for node ${nodeId}...`);
        
        // 查找节点及其父节点
        const node = findNodeById(nodeId);
        if (!node || !node.data || !node.data.properties) {
            console.warn(`Neo4j Editor: Node ${nodeId} not found or has no properties`);
            return;
        }
        
        // 查找CHILD_OF关系
        const parentEdges = (window.sharedGraphData && window.sharedGraphData.edges) ? 
            window.sharedGraphData.edges.filter(edge => 
                edge && edge.data && edge.data.target === nodeId && edge.data.type === 'CHILD_OF'
            ) : [];
        
        // 对每个父节点应用继承
        parentEdges.forEach(edge => {
            const parentId = edge.data.source;
            const parentNode = findNodeById(parentId);
            
            if (parentNode && parentNode.data && parentNode.data.properties) {
                // 应用属性继承
                applyPropertiesInheritance(node.data.properties, parentNode.data.properties);
                console.log(`Neo4j Editor: Applied inheritance from parent ${parentId} to child ${nodeId}`);
            }
        });
        
        // 递归应用到子节点
        const childEdges = (window.sharedGraphData && window.sharedGraphData.edges) ? 
            window.sharedGraphData.edges.filter(edge => 
                edge && edge.data && edge.data.source === nodeId && edge.data.type === 'CHILD_OF'
            ) : [];
        
        childEdges.forEach(edge => {
            applyNodeInheritanceRules(edge.data.target);
        });
        
    } catch (error) {
        console.error(`Neo4j Editor: Error applying inheritance rules for node ${nodeId}:`, error);
    }
}

/**
 * 应用属性继承
 * @param {Object} childProps - 子节点属性
 * @param {Object} parentProps - 父节点属性
 */
function applyPropertiesInheritance(childProps, parentProps) {
    try {
        // 遍历父节点的所有属性
        for (const [key, value] of Object.entries(parentProps)) {
            // 只继承子节点没有的属性，避免覆盖
            if (childProps[key] === undefined || childProps[key] === null) {
                // 深拷贝，避免引用问题
                childProps[key] = JSON.parse(JSON.stringify(value));
                console.log(`Neo4j Editor: Inherited property ${key} from parent`);
            }
        }
    } catch (error) {
        console.error('Neo4j Editor: Error applying properties inheritance:', error);
    }
}

/**
 * 根据ID查找节点
 * @param {string} nodeId - 节点ID
 * @returns {Object|null} - 找到的节点或null
 */
function findNodeById(nodeId) {
    if (!window.sharedGraphData || !window.sharedGraphData.nodes) {
        return null;
    }
    return window.sharedGraphData.nodes.find(node => node && node.data && node.data.id === nodeId) || null;
}

// 创建CHILD_OF关系
window.createChildOfRelationship = function(childId, parentId, properties = {}) {
    try {
        // 检查参数
        if (!childId || !parentId) {
            console.error('Neo4j Editor: Missing required relationship IDs');
            return null;
        }
        
        // 防止自环
        if (childId === parentId) {
            console.error('Neo4j Editor: Cannot create self-referential CHILD_OF relationship');
            return null;
        }
        
        // 检查是否会创建循环引用 - 参数顺序：childId, parentId
        if (window.wouldCreateCycle(childId, parentId)) {
            console.error('Neo4j Editor: Relationship would create a cycle');
            if (typeof window.showToast === 'function') {
                window.showToast('Cannot create relationship: Would create a cycle', 'error');
            }
            return null;
        }
        
        // 生成关系ID
        const edgeId = `edge_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        
        // 创建关系数据 - source是父节点，target是子节点
        const edgeData = {
            id: edgeId,
            source: parentId,
            target: childId,
            type: 'CHILD_OF',
            label: 'CHILD_OF',
            properties: properties || {}
        };
        
        // 创建关系对象
        const newEdge = {
            group: 'edges',
            data: edgeData
        };
        
        // 添加到共享数据
        window.sharedGraphData = window.sharedGraphData || { nodes: [], edges: [] };
        window.sharedGraphData.edges.push(newEdge);
        
        // 更新相关节点的层级
        window.updateNodeLevel(childId, parentId);
        
        // 管理兄弟节点关系
        window.manageSiblingRelationships(parentId, childId);
        
        // 同步数据
        if (typeof window.syncGraphData === 'function') {
            window.syncGraphData();
        }
        
        console.log(`Neo4j Editor: Created CHILD_OF relationship from ${parentId} to ${childId}`);
        return newEdge;
    } catch (error) {
        console.error('Neo4j Editor: Error creating CHILD_OF relationship:', error);
        if (typeof window.showToast === 'function') {
            window.showToast('Failed to create relationship: ' + error.message, 'error');
        }
        return null;
    }
};

// 更新节点层级
window.updateNodeLevel = function(nodeId, parentId) {
    try {
        const sharedData = window.sharedGraphData || { nodes: [], edges: [] };
        const node = sharedData.nodes.find(n => n && n.data && n.data.id === nodeId);
        
        if (!node) {
            return;
        }
        
        // 找到父节点的层级
        const parentNode = sharedData.nodes.find(n => n && n.data && n.data.id === parentId);
        const parentLevel = parentNode && parentNode.data && parentNode.data.level ? 
            parentNode.data.level : 0;
        
        // 设置子节点层级
        if (!node.data) node.data = {};
        node.data.level = parentLevel + 1;
        
        // 递归更新所有子节点
        const childEdges = sharedData.edges.filter(e => 
            e && e.data && e.data.type === 'CHILD_OF' && e.data.source === nodeId
        );
        
        childEdges.forEach(edge => {
            window.updateNodeLevel(edge.data.target, nodeId);
        });
    } catch (error) {
        console.error('Neo4j Editor: Error updating node level:', error);
    }
};

// 管理同父节点之间的关系
window.manageSiblingRelationships = function(parentId, newChildId = null) {
    try {
        const sharedData = window.sharedGraphData || { nodes: [], edges: [] };
        
        // 获取指定父节点的所有子节点
        const siblingNodeIds = sharedData.edges
            .filter(e => e && e.data && e.data.type === 'CHILD_OF' && e.data.source === parentId)
            .map(e => e.data.target)
            .filter(id => id); // 过滤掉无效ID
        
        if (siblingNodeIds.length < 2) {
            // 子节点少于2个，不需要创建RELATES_TO关系
            return;
        }
        
        // 获取现有RELATES_TO关系
        const existingRelatesEdges = sharedData.edges.filter(e => 
            e && e.data && e.data.type === 'RELATES_TO'
        );
        
        // 创建关系映射，方便快速查找
        const edgeMap = new Map();
        existingRelatesEdges.forEach(edge => {
            const key = `${edge.data.source}_${edge.data.target}`;
            edgeMap.set(key, edge);
        });
        
        // 为每对兄弟节点创建RELATES_TO关系（双向）
        for (let i = 0; i < siblingNodeIds.length; i++) {
            for (let j = i + 1; j < siblingNodeIds.length; j++) {
                const nodeId1 = siblingNodeIds[i];
                const nodeId2 = siblingNodeIds[j];
                
                // 检查正向关系
                const forwardKey = `${nodeId1}_${nodeId2}`;
                if (!edgeMap.has(forwardKey)) {
                    window.createRelatesToRelationship(nodeId1, nodeId2);
                }
                
                // 检查反向关系
                const backwardKey = `${nodeId2}_${nodeId1}`;
                if (!edgeMap.has(backwardKey)) {
                    window.createRelatesToRelationship(nodeId2, nodeId1);
                }
            }
        }
        
        // 如果指定了新子节点，触发通知
        if (newChildId) {
            console.log(`Neo4j Editor: Managed sibling relationships for new child ${newChildId} under parent ${parentId}`);
        }
        
    } catch (error) {
        console.error('Neo4j Editor: Error managing sibling relationships:', error);
    }
};

// 创建RELATES_TO关系
window.createRelatesToRelationship = function(sourceId, targetId, properties = {}) {
    try {
        // 检查参数
        if (!sourceId || !targetId || sourceId === targetId) {
            return null;
        }
        
        const sharedData = window.sharedGraphData || { nodes: [], edges: [] };
        
        // 检查关系是否已存在
        const exists = sharedData.edges.some(e => 
            e && e.data && e.data.type === 'RELATES_TO' &&
            e.data.source === sourceId && e.data.target === targetId
        );
        
        if (exists) {
            return null; // 关系已存在
        }
        
        // 生成关系ID
        const edgeId = `rel_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        
        // 创建关系数据
        const edgeData = {
            id: edgeId,
            source: sourceId,
            target: targetId,
            type: 'RELATES_TO',
            label: 'RELATES_TO',
            properties: properties || {}
        };
        
        // 创建关系对象
        const newEdge = {
            group: 'edges',
            data: edgeData
        };
        
        // 添加到共享数据
        sharedData.edges.push(newEdge);
        
        console.log(`Neo4j Editor: Created RELATES_TO relationship between ${sourceId} and ${targetId}`);
        return newEdge;
    } catch (error) {
        console.error('Neo4j Editor: Error creating RELATES_TO relationship:', error);
        return null;
    }
};

// 检查是否会创建循环引用
window.wouldCreateCycle = function(sourceId, targetId) {
    try {
        // 防止自环
        if (sourceId === targetId) {
            return true;
        }
        
        const sharedData = window.sharedGraphData || { nodes: [], edges: [] };
        const visited = new Set();
        
        // 从targetId开始，向上遍历父节点链，检查是否能到达sourceId
        function dfsCheckCycle(currentId) {
            if (currentId === sourceId) {
                return true;
            }
            
            if (visited.has(currentId)) {
                return false;
            }
            
            visited.add(currentId);
            
            // 查找当前节点的所有父节点（通过CHILD_OF关系）
            const parentEdges = sharedData.edges.filter(e => 
                e && e.data && e.data.type === 'CHILD_OF' && e.data.target === currentId
            );
            
            for (const edge of parentEdges) {
                if (dfsCheckCycle(edge.data.source)) {
                    return true;
                }
            }
            
            return false;
        }
        
        return dfsCheckCycle(targetId);
    } catch (error) {
        console.error('Neo4j Editor: Error checking for cycles:', error);
        // 安全起见，出错时返回true（防止创建可能的循环）
        return true;
    }
};

// 导出核心功能
window.graphDataManager = {
    sharedGraphData: window.sharedGraphData,
    isNodeCodeUnique: window.isNodeCodeUnique,
    generateUniqueNodeCode: window.generateUniqueNodeCode,
    configureNeo4jLabels: window.configureNeo4jLabels,
    setLabelFilters: window.setLabelFilters,
    filterNodesByLabels: window.filterNodesByLabels,
    saveNodeTemplate: window.saveNodeTemplate,
    getNodeTemplate: window.getNodeTemplate,
    recordDeletedEdge: window.recordDeletedEdge,
    isEdgeDeleted: window.isEdgeDeleted,
    clearDeletedEdges: window.clearDeletedEdges,
    syncGraphData: window.syncGraphData,
    removeElementFromViews: window.removeElementFromViews,
    findElementInSharedData: window.findElementInSharedData,
    loadGraphFromData: window.loadGraphFromData,
    synchronizeSelection: window.synchronizeSelection,
    setupDataChangeListeners: setupDataChangeListeners,
    notifyDataChanged: notifyDataChanged,
    isGraphModified: false,
    manageSiblingRelationships: window.manageSiblingRelationships,
    checkForCircularReference: checkForCircularReference,
    setNodeParent: window.setNodeParent,
    applyNodeInheritanceRules: applyNodeInheritanceRules,
    createChildOfRelationship: window.createChildOfRelationship,
    updateNodeLevel: window.updateNodeLevel,
    wouldCreateCycle: window.wouldCreateCycle,
    createRelatesToRelationship: window.createRelatesToRelationship,
    // 数据持久化API
    exportGraphData: window.exportGraphData,
    saveGraphToLocalStorage: window.saveGraphToLocalStorage,
    loadGraphFromLocalStorage: window.loadGraphFromLocalStorage
};

/**
 * 设置数据变更监听器
 */
function setupDataChangeListeners() {
    console.log('设置图表数据变更监听器');
    
    // 为每个Cytoscape实例设置监听器
    [window.cyTree, window.cyNetwork].forEach(cy => {
        if (!cy) return;
        
        // 监听节点和边的添加
        cy.on('add', 'node,edge', (evt) => {
            const element = evt.target;
            console.log(`元素添加: ${element.id()} (${element.isNode() ? '节点' : '边'})`);
            
            // 特别处理CHILD_OF关系
            if (element.isEdge() && element.data().type === 'CHILD_OF') {
                const parentId = element.data().target;
                // 管理同级关系
                manageSiblingRelationships(parentId);
            }
            
            window.graphDataManager.isGraphModified = true;
            notifyDataChanged('add', element);
        });
        
        // 监听节点和边的移除
        cy.on('remove', 'node,edge', (evt) => {
            const element = evt.target;
            console.log(`元素移除: ${element.id()} (${element.isNode() ? '节点' : '边'})`);
            
            // 特别处理CHILD_OF关系
            if (element.isEdge() && element.data().type === 'CHILD_OF') {
                const parentId = element.data().target;
                // 管理同级关系
                manageSiblingRelationships(parentId);
            }
            
            // 如果是边，记录到删除的边列表中
            if (element.isEdge()) {
                const edgeData = element.data();
                const sharedData = window.sharedGraphData || {};
                sharedData.deletedEdges = sharedData.deletedEdges || new Set();
                sharedData.deletedEdges.add(`${edgeData.type}:${edgeData.source}:${edgeData.target}`);
            }
            
            window.graphDataManager.isGraphModified = true;
            notifyDataChanged('remove', element);
        });
        
        // 监听元素数据的变更
        cy.on('data', 'node,edge', (evt, property, previousValue) => {
            const element = evt.target;
            console.log(`元素数据变更: ${element.id()}, 属性: ${property}, 旧值: ${previousValue}`);
            
            // 当边的源或目标改变时，可能影响CHILD_OF关系
            if (element.isEdge() && element.data().type === 'CHILD_OF' && 
                (property === 'source' || property === 'target')) {
                // 处理旧的父节点
                if (property === 'target' && previousValue) {
                    manageSiblingRelationships(previousValue);
                }
                // 处理新的父节点
                manageSiblingRelationships(element.data().target);
            }
            
            window.graphDataManager.isGraphModified = true;
            notifyDataChanged('update', element, { property, previousValue });
        });
        
        // 监听样式变更
        cy.on('style', 'node,edge', (evt, property, value) => {
            const element = evt.target;
            console.log(`元素样式变更: ${element.id()}, 属性: ${property}, 值: ${value}`);
            notifyDataChanged('style', element, { property, value });
        });
    });
}

/**
 * 通知数据已变更
 * @param {string} action - 动作类型: add, remove, update, style
 * @param {Object} element - 变更的元素
 * @param {Object} details - 变更详情
 */
function notifyDataChanged(action, element, details = {}) {
    console.log('通知数据变更:', { action, element: element.id(), details });
    
    // 同步更新其他视图
    if (typeof window.syncGraphData === 'function') {
        window.syncGraphData();
    }
    
    // 更新元素计数
    if (typeof window.updateElementCounts === 'function') {
        window.updateElementCounts();
    }
    
    // 如果是网络图视图的元素，更新样式
    if (typeof window.viewManager !== 'undefined' && typeof window.viewManager.updateElementStyles === 'function') {
        window.viewManager.updateElementStyles();
    }
}