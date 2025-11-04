// neo4jApi.js - Neo4j API模块

/**
 * Neo4j API模块
 * 提供与Neo4j数据库交互的核心功能
 */
const neo4jApi = {
    // 数据库配置
    dbConfig: null,
    
    // 连接状态
    isConnected: false,
    
    // Neo4j驱动实例
    neo4jDriver: null,

    /**
     * 初始化Neo4j API模块
     */
    initialize: function() {
        console.log('Neo4j Editor: Neo4j API module initialized');
        
        // 初始化全局配置
        window.dbConfig = window.dbConfig || {
            uri: 'bolt://localhost:7687',
            user: 'neo4j',
            password: 'password'
        };
        
        this.dbConfig = window.dbConfig;
        this.isConnected = window.isConnected || false;
        this.neo4jDriver = window.neo4jDriver || null;
        
        // 注册全局函数
        this.registerGlobalFunctions();
    },

    /**
     * 注册全局函数
     */
    registerGlobalFunctions: function() {
        // 保存原始引用
        window._neo4jApi = this;
        
        // 注册全局函数供其他模块使用
        window.connectToNeo4j = this.connectToNeo4j.bind(this);
        window.disconnectFromNeo4j = this.disconnectFromNeo4j.bind(this);
        window.executeCypherQuery = this.executeCypherQuery.bind(this);
        window.loadGraphData = this.loadGraphData.bind(this);
        window.saveGraphData = this.saveGraphData.bind(this);
        window.getConnectionStatus = this.getConnectionStatus.bind(this);
        window.getDatabaseConfig = this.getDatabaseConfig.bind(this);
    },

    /**
     * 连接到Neo4j数据库
     * @param {Object} config - 数据库配置对象
     * @returns {Promise<boolean>} 连接成功返回true
     */
    connectToNeo4j: function(config) {
        console.log('Neo4j Editor: Connecting to Neo4j database', config);
        
        return new Promise((resolve) => {
            try {
                // 更新配置
                if (config) {
                    this.dbConfig = config;
                    window.dbConfig = config;
                }
                
                // 模拟连接请求
                // 在实际实现中，这里应该使用官方Neo4j驱动
                setTimeout(() => {
                    this.isConnected = true;
                    window.isConnected = true;
                    
                    // 模拟驱动实例
                    this.neo4jDriver = { config: this.dbConfig };
                    window.neo4jDriver = this.neo4jDriver;
                    
                    console.log('Neo4j Editor: Connected to Neo4j database successfully');
                    
                    // 更新UI状态
                    this.updateConnectionStatusUI(true);
                    
                    // 显示成功消息
                    if (window.showToast) {
                        window.showToast('Connected to Neo4j database successfully', 'success');
                    }
                    
                    resolve(true);
                }, 800); // 模拟连接延迟
                
            } catch (err) {
                console.error('Neo4j Editor: Failed to connect to Neo4j database:', err);
                
                this.isConnected = false;
                window.isConnected = false;
                
                // 更新UI状态
                this.updateConnectionStatusUI(false);
                
                // 显示错误消息
                if (window.showToast) {
                    window.showToast('Failed to connect to Neo4j: ' + err.message, 'error');
                }
                
                resolve(false);
            }
        });
    },

    /**
     * 断开与Neo4j数据库的连接
     * @returns {Promise<boolean>} 断开成功返回true
     */
    disconnectFromNeo4j: function() {
        console.log('Neo4j Editor: Disconnecting from Neo4j database');
        
        return new Promise((resolve) => {
            try {
                // 关闭驱动实例
                if (this.neo4jDriver) {
                    // 在实际实现中，这里应该调用driver.close()
                    this.neo4jDriver = null;
                    window.neo4jDriver = null;
                }
                
                this.isConnected = false;
                window.isConnected = false;
                
                console.log('Neo4j Editor: Disconnected from Neo4j database');
                
                // 更新UI状态
                this.updateConnectionStatusUI(false);
                
                // 显示成功消息
                if (window.showToast) {
                    window.showToast('Disconnected from Neo4j database', 'info');
                }
                
                resolve(true);
            } catch (err) {
                console.error('Neo4j Editor: Error disconnecting from Neo4j:', err);
                resolve(false);
            }
        });
    },

    /**
     * 执行Cypher查询
     * @param {string} query - Cypher查询语句
     * @param {Object} params - 查询参数
     * @returns {Promise<Object>} 查询结果
     */
    executeCypherQuery: function(query, params = {}) {
        console.log('Neo4j Editor: Executing Cypher query', { query, params });
        
        // 自定义Promise实现
        const CustomPromise = function(executor) {
            let resolve, reject, state = 'pending';
            
            const resolveFn = function(value) {
                if (state === 'pending') {
                    state = 'fulfilled';
                    if (resolve) resolve(value);
                }
            };
            
            const rejectFn = function(reason) {
                if (state === 'pending') {
                    state = 'rejected';
                    if (reject) reject(reason);
                }
            };
            
            try {
                executor(resolveFn, rejectFn);
            } catch (err) {
                rejectFn(err);
            }
            
            return {
                then: function(onFulfilled, onRejected) {
                    return CustomPromise(function(resolveNext, rejectNext) {
                        const fulfillHandler = function(value) {
                            if (typeof onFulfilled === 'function') {
                                try {
                                    resolveNext(onFulfilled(value));
                                } catch (err) {
                                    rejectNext(err);
                                }
                            } else {
                                resolveNext(value);
                            }
                        };
                        
                        const rejectHandler = function(reason) {
                            if (typeof onRejected === 'function') {
                                try {
                                    resolveNext(onRejected(reason));
                                } catch (err) {
                                    rejectNext(err);
                                }
                            } else {
                                rejectNext(reason);
                            }
                        };
                        
                        if (state === 'fulfilled') {
                            setTimeout(() => fulfillHandler(value), 0);
                        } else if (state === 'rejected') {
                            setTimeout(() => rejectHandler(reason), 0);
                        } else {
                            resolve = fulfillHandler;
                            reject = rejectHandler;
                        }
                    });
                }
            };
        };
        
        return new CustomPromise((resolve, reject) => {
            // 检查连接状态
            if (!this.isConnected) {
                const error = new Error('Not connected to Neo4j database');
                console.error('Neo4j Editor:', error.message);
                reject(error);
                return;
            }
            
            try {
                // 模拟查询执行
                // 在实际实现中，这里应该使用驱动执行查询
                setTimeout(() => {
                    // 模拟结果
                    const mockResult = {
                        records: [],
                        summary: {
                            query: { text: query },
                            parameters: params,
                            plan: { operatorType: 'MockPlan' }
                        }
                    };
                    
                    console.log('Neo4j Editor: Query executed successfully');
                    resolve(mockResult);
                }, 500);
                
            } catch (err) {
                console.error('Neo4j Editor: Query execution error:', err);
                reject(err);
            }
        });
    },

    /**
     * 加载图数据
     * @param {string} query - 可选的自定义查询
     * @returns {Promise<Object>} 图数据
     */
    loadGraphData: function(query = null) {
        console.log('Neo4j Editor: Loading graph data');
        
        // 自定义Promise实现
        const CustomPromise = function(executor) {
            let resolve, reject, state = 'pending', value, reason;
            
            const resolveFn = function(val) {
                if (state === 'pending') {
                    state = 'fulfilled';
                    value = val;
                    if (resolve) resolve(value);
                }
            };
            
            const rejectFn = function(err) {
                if (state === 'pending') {
                    state = 'rejected';
                    reason = err;
                    if (reject) reject(reason);
                }
            };
            
            try {
                executor(resolveFn, rejectFn);
            } catch (err) {
                rejectFn(err);
            }
            
            return {
                then: function(onFulfilled, onRejected) {
                    return CustomPromise(function(resolveNext, rejectNext) {
                        const fulfillHandler = function(val) {
                            if (typeof onFulfilled === 'function') {
                                try {
                                    resolveNext(onFulfilled(val));
                                } catch (err) {
                                    rejectNext(err);
                                }
                            } else {
                                resolveNext(val);
                            }
                        };
                        
                        const rejectHandler = function(err) {
                            if (typeof onRejected === 'function') {
                                try {
                                    resolveNext(onRejected(err));
                                } catch (e) {
                                    rejectNext(e);
                                }
                            } else {
                                rejectNext(err);
                            }
                        };
                        
                        if (state === 'fulfilled') {
                            setTimeout(() => fulfillHandler(value), 0);
                        } else if (state === 'rejected') {
                            setTimeout(() => rejectHandler(reason), 0);
                        } else {
                            resolve = fulfillHandler;
                            reject = rejectHandler;
                        }
                    });
                }
            };
        };
        
        return new CustomPromise((resolve, reject) => {
            try {
                // 使用默认查询或自定义查询
                const cypherQuery = query || `
                    MATCH (n)
                    OPTIONAL MATCH (n)-[r]->(m)
                    RETURN n, r, m
                    LIMIT 100
                `;
                
                // 执行查询
                this.executeCypherQuery(cypherQuery).then(result => {
                    // 转换结果为图数据
                    const graphData = this.convertNeo4jResultToGraphData(result);
                    
                    // 加载到视图中
                    if (window.viewSync && window.viewSync.syncGraphData) {
                        window.viewSync.syncGraphData(graphData);
                    }
                    
                    console.log('Neo4j Editor: Graph data loaded successfully', {
                        nodes: graphData.nodes.length,
                        edges: graphData.edges.length
                    });
                    
                    // 显示成功消息
                    if (window.showToast) {
                        window.showToast(`Loaded ${graphData.nodes.length} nodes and ${graphData.edges.length} relationships`, 'success');
                    }
                    
                    resolve(graphData);
                }).catch(err => {
                    console.error('Neo4j Editor: Error loading graph data:', err);
                    
                    if (window.showToast) {
                        window.showToast('Failed to load graph data: ' + err.message, 'error');
                    }
                    
                    reject(err);
                });
                
            } catch (err) {
                console.error('Neo4j Editor: Unexpected error loading graph data:', err);
                reject(err);
            }
        });
    },

    /**
     * 保存图数据
     * @param {Object} graphData - 图数据对象
     * @returns {Promise<boolean>} 保存成功返回true
     */
    saveGraphData: function(graphData) {
        console.log('Neo4j Editor: Saving graph data', {
            nodes: graphData.nodes?.length || 0,
            edges: graphData.edges?.length || 0
        });
        
        return new Promise((resolve, reject) => {
            try {
                // 模拟保存请求
                const xhr = new XMLHttpRequest();
                
                // 使用本地API端点
                xhr.open('POST', '/api/neo4j/save', true);
                xhr.setRequestHeader('Content-Type', 'application/json');
                
                xhr.onload = function() {
                    if (xhr.status >= 200 && xhr.status < 300) {
                        let response;
                        try {
                            response = JSON.parse(xhr.responseText);
                        } catch (e) {
                            response = { success: true };
                        }
                        
                        console.log('Neo4j Editor: Graph data saved successfully');
                        
                        if (window.showToast) {
                            window.showToast('Graph data saved successfully', 'success');
                        }
                        
                        resolve(true);
                    } else {
                        const error = new Error('Failed to save graph data: ' + xhr.statusText);
                        console.error('Neo4j Editor:', error.message);
                        
                        if (window.showToast) {
                            window.showToast('Failed to save graph data', 'error');
                        }
                        
                        resolve(false);
                    }
                };
                
                xhr.onerror = function() {
                    console.error('Neo4j Editor: Network error when saving graph data');
                    resolve(false);
                };
                
                // 发送请求
                xhr.send(JSON.stringify(graphData));
                
            } catch (err) {
                console.error('Neo4j Editor: Error saving graph data:', err);
                reject(err);
            }
        });
    },

    /**
     * 更新连接状态UI
     * @param {boolean} connected - 是否已连接
     */
    updateConnectionStatusUI: function(connected) {
        const statusElement = document.getElementById('connection-status');
        const connectButton = document.getElementById('connect-button');
        const disconnectButton = document.getElementById('disconnect-button');
        
        if (statusElement) {
            statusElement.textContent = connected ? 'Connected' : 'Disconnected';
            statusElement.className = connected ? 'connection-status connected' : 'connection-status disconnected';
        }
        
        if (connectButton) {
            connectButton.disabled = connected;
        }
        
        if (disconnectButton) {
            disconnectButton.disabled = !connected;
        }
    },

    /**
     * 将Neo4j查询结果转换为图数据格式
     * @param {Object} result - Neo4j查询结果
     * @returns {Object} Cytoscape兼容的图数据
     */
    convertNeo4jResultToGraphData: function(result) {
        const nodes = [];
        const edges = [];
        const nodeMap = new Map();
        const edgeMap = new Map();
        
        if (!result || !result.records) {
            return { nodes, edges };
        }
        
        // 处理记录
        result.records.forEach(record => {
            // 提取节点和关系
            const recordObj = record.toObject ? record.toObject() : record;
            
            // 处理节点n
            if (recordObj.n) {
                this.processNeo4jNode(recordObj.n, nodes, nodeMap);
            }
            
            // 处理节点m
            if (recordObj.m) {
                this.processNeo4jNode(recordObj.m, nodes, nodeMap);
            }
            
            // 处理关系r
            if (recordObj.r && recordObj.n && recordObj.m) {
                this.processNeo4jRelationship(recordObj.r, recordObj.n, recordObj.m, edges, edgeMap);
            }
        });
        
        return { nodes, edges };
    },

    /**
     * 处理Neo4j节点
     * @param {Object} neoNode - Neo4j节点对象
     * @param {Array} nodesArray - 节点数组
     * @param {Map} nodeMap - 节点映射
     */
    processNeo4jNode: function(neoNode, nodesArray, nodeMap) {
        // 获取节点ID和标签
        let id, labels, properties;
        
        // 支持不同格式的节点对象
        if (neoNode.identity) {
            id = neoNode.identity.toString();
            labels = neoNode.labels || [];
            properties = neoNode.properties || {};
        } else {
            // 模拟格式
            id = neoNode.id || `node_${Date.now()}_${Math.random()}`;
            labels = neoNode.labels || ['Node'];
            properties = neoNode.properties || neoNode.data || neoNode;
        }
        
        // 避免重复
        if (!nodeMap.has(id)) {
            const nodeData = {
                id: id,
                label: labels[0] || 'Node',
                ...properties,
                tags: ['tree', 'network']
            };
            
            nodesArray.push({
                group: 'nodes',
                data: nodeData,
                position: {
                    x: Math.random() * 500,
                    y: Math.random() * 400
                }
            });
            
            nodeMap.set(id, nodeData);
        }
    },

    /**
     * 处理Neo4j关系
     * @param {Object} neoRel - Neo4j关系对象
     * @param {Object} startNode - 起始节点
     * @param {Object} endNode - 结束节点
     * @param {Array} edgesArray - 边数组
     * @param {Map} edgeMap - 边映射
     */
    processNeo4jRelationship: function(neoRel, startNode, endNode, edgesArray, edgeMap) {
        // 获取关系数据
        let id, type, properties, startId, endId;
        
        // 支持不同格式的关系对象
        if (neoRel.identity) {
            id = neoRel.identity.toString();
            type = neoRel.type || 'RELATES_TO';
            properties = neoRel.properties || {};
            
            // 获取节点ID
            startId = startNode.identity ? startNode.identity.toString() : startNode.id;
            endId = endNode.identity ? endNode.identity.toString() : endNode.id;
        } else {
            // 模拟格式
            id = neoRel.id || `rel_${Date.now()}_${Math.random()}`;
            type = neoRel.type || neoRel.relationshipType || 'RELATES_TO';
            properties = neoRel.properties || neoRel.data || neoRel;
            startId = startNode.id || properties.source;
            endId = endNode.id || properties.target;
        }
        
        // 避免重复
        const edgeKey = `${startId}_${endId}_${type}`;
        if (!edgeMap.has(edgeKey)) {
            const edgeData = {
                id: id,
                source: startId,
                target: endId,
                type: type,
                label: type,
                ...properties
            };
            
            edgesArray.push({
                group: 'edges',
                data: edgeData
            });
            
            edgeMap.set(edgeKey, edgeData);
        }
    },

    /**
     * 获取连接状态
     * @returns {boolean} 连接状态
     */
    getConnectionStatus: function() {
        return this.isConnected;
    },

    /**
     * 获取数据库配置
     * @returns {Object} 数据库配置
     */
    getDatabaseConfig: function() {
        return { ...this.dbConfig };
    }
};

// 注册到全局命名空间
if (typeof window.neo4jEditor === 'object') {
    window.neo4jEditor.neo4jApi = neo4jApi;
} else {
    window.neo4jApi = neo4jApi;
}

// 自动初始化
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', neo4jApi.initialize.bind(neo4jApi));
} else {
    neo4jApi.initialize();
}

console.log('Neo4j Editor: neo4jApi module loaded');

// 模块已通过全局变量方式导出