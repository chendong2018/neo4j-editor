/**
 * Neo4j数据库连接管理模块
 */

// 数据库连接配置
window.dbConfig = null;
// 连接状态
window.isConnected = false;
// Neo4j驱动实例
window.neo4jDriver = null;

/**
 * 连接到Neo4j数据库
 * @param {Object} config - 数据库配置对象
 * @returns {Promise<boolean>} 连接是否成功
 */
window.connectToNeo4j = async function(config) {
    try {
        debugLog('Attempting to connect to Neo4j with config:', config);
        
        // 保存配置
        window.dbConfig = { ...config };
        
        // 在实际应用中，这里会使用neo4j-driver库来创建连接
        // 这里我们模拟连接过程
        
        // 模拟API调用（实际应该使用fetch或axios）
        const response = await fetch('http://localhost:5000/api/connect', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(config)
        });
        
        const result = await response.json();
        
        if (result.success) {
            window.isConnected = true;
            showToast('成功连接到Neo4j数据库', 'success');
            debugLog('Connected to Neo4j database successfully');
            
            // 更新UI状态
            updateConnectionStatusUI(true);
            
            return true;
        } else {
            throw new Error(result.error || '连接失败，未知错误');
        }
    } catch (error) {
        handleError('连接Neo4j数据库失败:', error);
        showToast(`连接失败: ${error.message}`, 'error');
        updateConnectionStatusUI(false);
        return false;
    }
}

/**
 * 断开与Neo4j数据库的连接
 */
window.disconnectFromNeo4j = function() {
    try {
        debugLog('Disconnecting from Neo4j database');
        
        // 在实际应用中，这里会关闭驱动实例
        if (neo4jDriver) {
            neo4jDriver.close();
            neo4jDriver = null;
        }
        
        window.isConnected = false;
        window.dbConfig = null;
        
        showToast('已断开与Neo4j数据库的连接', 'info');
        updateConnectionStatusUI(false);
        
    } catch (error) {
        handleError('断开连接失败:', error);
        showToast('断开连接失败', 'error');
    }
}

/**
 * 执行Cypher查询
 * @param {string} query - Cypher查询语句
 * @param {Object} params - 查询参数
 * @returns {Promise<Object>} 查询结果
 */
window.executeCypherQuery = async function(query, params = {}) {
    if (!window.isConnected) {
        throw new Error('未连接到Neo4j数据库');
    }
    
    try {
        debugLog('Executing Cypher query:', query);
        
        // 模拟API调用
        const response = await fetch('http://localhost:5000/api/execute-query', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                query,
                params
            })
        });
        
        const result = await response.json();
        
        if (result.success) {
            showToast(`查询成功，返回 ${result.data.length} 条结果`, 'success');
            return result.data;
        } else {
            throw new Error(result.error || '查询执行失败');
        }
    } catch (error) {
        handleError('Cypher查询执行失败:', error);
        showToast(`查询失败: ${error.message}`, 'error');
        throw error;
    }
}

/**
 * 加载图数据
 * @param {boolean} append - 是否追加到当前图中
 * @returns {Promise<Object>} 加载的图数据
 */
window.loadGraphData = async function(append = false) {
    if (!window.isConnected) {
        throw new Error('未连接到Neo4j数据库');
    }
    
    try {
        // 简单的查询，获取所有节点和关系
        const query = `
            MATCH (n)
            OPTIONAL MATCH (n)-[r]-(m)
            RETURN n, collect(r), collect(m)
        `;
        
        const result = await window.executeCypherQuery(query);
        
        // 将查询结果转换为Cytoscape可用的格式
        const graphData = convertNeo4jResultToGraphData(result);
        
        // 加载到图中
        window.loadGraphFromData(graphData, append);
        
        return graphData;
    } catch (error) {
        window.handleError('加载图数据失败:', error);
        throw error;
    }
}

/**
 * 保存图数据到Neo4j
 * @returns {Promise<boolean>} 保存是否成功
 */
window.saveGraphData = async function() {
    if (!window.isConnected) {
        throw new Error('未连接到Neo4j数据库');
    }
    
    try {
        // 获取当前图数据
        const graphData = window.cy?.elements().jsons() || [];
        
        // 保存到数据库
        const response = await fetch('http://localhost:5000/api/save-graph', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ graphData })
        });
        
        const result = await response.json();
        
        if (result.success) {
            showToast('图数据保存成功', 'success');
            return true;
        } else {
            throw new Error(result.error || '保存失败');
        }
    } catch (error) {
        handleError('保存图数据失败:', error);
        showToast(`保存失败: ${error.message}`, 'error');
        return false;
    }
}

/**
 * 更新连接状态UI
 * @param {boolean} connected - 是否已连接
 */
function updateConnectionStatusUI(connected) {
    const statusElement = document.getElementById('connection-status');
    const disconnectBtn = document.getElementById('disconnect-btn');
    const connectBtn = document.getElementById('connect-neo4j-btn');
    const executeQueryBtn = document.getElementById('execute-query-btn');
    const saveGraphBtn = document.getElementById('save-graph-btn');
    
    if (statusElement) {
        if (connected) {
            statusElement.classList.remove('bg-red-500');
            statusElement.classList.add('bg-green-500');
            statusElement.textContent = '已连接';
        } else {
            statusElement.classList.remove('bg-green-500');
            statusElement.classList.add('bg-red-500');
            statusElement.textContent = '未连接';
        }
    }
    
    if (disconnectBtn) {
        disconnectBtn.style.display = connected ? 'block' : 'none';
    }
    
    if (connectBtn) {
        connectBtn.style.display = connected ? 'none' : 'block';
    }
    
    if (executeQueryBtn) {
        executeQueryBtn.disabled = !connected;
    }
    
    if (saveGraphBtn) {
        saveGraphBtn.disabled = !connected;
    }
}

/**
 * 将Neo4j查询结果转换为Cytoscape图数据格式
 * @param {Array} neo4jResult - Neo4j查询结果
 * @returns {Object} Cytoscape图数据
 */
function convertNeo4jResultToGraphData(neo4jResult) {
    const nodes = new Map();
    const edges = [];
    
    neo4jResult.forEach(record => {
        // 处理节点
        const node = record.n || record.node;
        if (node) {
            const nodeId = node.id || node._id || generateId('node');
            
            // 提取节点标签（类型）
            let type = 'Generic';
            if (node.labels && node.labels.length > 0) {
                type = node.labels[0];
            } else if (node.type) {
                type = node.type;
            }
            
            // 创建节点对象
            const nodeObj = {
                group: 'nodes',
                data: {
                    id: nodeId,
                    label: node.properties?.name || node.name || type,
                    type: type,
                    ...(node.properties || node)
                }
            };
            
            nodes.set(nodeId, nodeObj);
        }
        
        // 处理关系
        if (record.r || record.relationships || record.collect_r) {
            const relationships = record.r 
                ? [record.r]
                : Array.isArray(record.relationships) 
                    ? record.relationships
                    : Array.isArray(record.collect_r) 
                        ? record.collect_r
                        : [];
            
            relationships.forEach(rel => {
                if (rel) {
                    // 获取目标节点
                    let targetNode = record.m || record.target;
                    if (!targetNode && Array.isArray(record.collect_m)) {
                        targetNode = record.collect_m.find(m => m && m.id === rel.end);
                    }
                    
                    if (targetNode) {
                        const targetId = targetNode.id || targetNode._id || generateId('node');
                        
                        // 提取目标节点标签（类型）
                        let targetType = 'Generic';
                        if (targetNode.labels && targetNode.labels.length > 0) {
                            targetType = targetNode.labels[0];
                        } else if (targetNode.type) {
                            targetType = targetNode.type;
                        }
                        
                        // 创建目标节点对象
                        const targetNodeObj = {
                            group: 'nodes',
                            data: {
                                id: targetId,
                                label: targetNode.properties?.name || targetNode.name || targetType,
                                type: targetType,
                                ...(targetNode.properties || targetNode)
                            }
                        };
                        
                        nodes.set(targetId, targetNodeObj);
                        
                        // 创建关系对象
                        const edgeId = rel.id || rel._id || generateId('edge');
                        const edgeType = rel.type || 'RELATES_TO';
                        
                        const edgeObj = {
                            group: 'edges',
                            data: {
                                id: edgeId,
                                source: node?.id || node?._id || generateId('node'),
                                target: targetId,
                                label: edgeType,
                                type: edgeType,
                                ...(rel.properties || {})
                            }
                        };
                        
                        edges.push(edgeObj);
                    }
                }
            });
        }
    });
    
    return {
        nodes: Array.from(nodes.values()),
        edges: edges
    };
}

// 使用utils.js中已定义的generateId函数

/**
 * 获取当前连接状态
 * @returns {boolean} 是否已连接
 */
window.getConnectionStatus = function() {
    return window.isConnected;
}

/**
 * 获取当前数据库配置
 * @returns {Object|null} 数据库配置
 */
window.getDatabaseConfig = function() {
    return window.dbConfig;
}

// 导出模块对象到全局
window.neo4jConnection = {
    get isConnected() { return window.isConnected; },
    get dbConfig() { return window.dbConfig; },
    connectToNeo4j,
    disconnectFromNeo4j,
    executeCypherQuery,
    loadGraphData,
    saveGraphData,
    getConnectionStatus,
    getDatabaseConfig
};

// 暴露为ES模块（如果支持）
if (typeof module !== 'undefined' && typeof module.exports !== 'undefined') {
    module.exports = window.neo4jConnection;
}