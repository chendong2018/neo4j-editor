/**
 * API管理器模块 - 负责处理与后端的所有通信
 */

// 导入依赖
const utils = require('../utils/utils');

// 创建模块对象
const apiManager = {
    // 状态变量
    isConnecting: false,
    isLoadingGraph: false,
    apiBaseUrl: '/api',
    
    /**
     * 初始化API管理器
     * @param {string} baseUrl - API基础URL
     */
    initialize: function(baseUrl) {
        if (baseUrl) {
            this.apiBaseUrl = baseUrl;
        }
        utils.debugLog('API管理器已初始化，基础URL: ' + this.apiBaseUrl);
    },
    
    /**
     * 底层HTTP请求函数（回调版本）
     * @param {string} endpoint - API端点
     * @param {string} method - HTTP方法
     * @param {Object} data - 请求数据
     * @param {Function} callback - 回调函数(error, responseData)
     */
    httpRequestCallback: function(endpoint, method, data, callback) {
        // 默认值处理
        if (!callback) {
            callback = function() {};
        }
        
        try {
            const url = this.apiBaseUrl + endpoint;
            const xhr = new XMLHttpRequest();
            
            xhr.open(method, url, true);
            xhr.setRequestHeader('Content-Type', 'application/json');
            
            xhr.onreadystatechange = function() {
                if (xhr.readyState === 4) {
                    if (xhr.status >= 200 && xhr.status < 300) {
                        try {
                            const responseData = xhr.responseText ? JSON.parse(xhr.responseText) : {};
                            callback(null, responseData);
                        } catch (parseError) {
                            callback(new Error('响应解析错误: ' + parseError.message));
                        }
                    } else {
                        callback(new Error('HTTP错误: ' + xhr.status));
                    }
                }
            };
            
            xhr.onerror = function() {
                callback(new Error('网络请求失败'));
            };
            
            const sendData = data ? JSON.stringify(data) : null;
            xhr.send(sendData);
            
        } catch (error) {
            callback(error);
        }
    },
    
    /**
     * HTTP请求函数（链式调用版本）
     * @param {string} endpoint - API端点
     * @param {string} method - HTTP方法
     * @param {Object} data - 请求数据
     * @returns {Object} 包含then方法的对象
     */
    httpRequest: function(endpoint, method, data) {
        const self = this;
        
        return {
            then: function(successCallback, errorCallback) {
                self.httpRequestCallback(endpoint, method, data, function(error, responseData) {
                    if (error) {
                        if (errorCallback) {
                            errorCallback(error);
                        } else {
                            utils.handleError(error, 'API请求失败');
                        }
                    } else if (successCallback) {
                        successCallback(responseData);
                    }
                });
                
                return this; // 支持链式调用
            }
        };
    },
    
    /**
     * 检查后端健康状态
     * @returns {Object} 包含then方法的对象
     */
    checkBackendHealth: function() {
        return this.httpRequest('/health', 'GET');
    },
    
    /**
     * 连接到Neo4j数据库
     * @param {Object} connectionParams - 连接参数
     * @returns {Object} 包含then方法的对象
     */
    connectToNeo4j: function(connectionParams) {
        this.isConnecting = true;
        
        return this.httpRequest('/connect', 'POST', connectionParams).then(
            (response) => {
                this.isConnecting = false;
                // 保存连接状态
                if (response.success) {
                    localStorage.setItem('neo4jConnection', JSON.stringify(connectionParams));
                    utils.showToast('成功连接到Neo4j', 'success');
                }
                return response;
            },
            (error) => {
                this.isConnecting = false;
                utils.showToast('连接失败: ' + error.message, 'error');
                throw error;
            }
        );
    },
    
    /**
     * 执行Cypher查询
     * @param {string} query - Cypher查询语句
     * @returns {Object} 包含then方法的对象
     */
    executeCypherQuery: function(query) {
        return this.httpRequest('/query', 'POST', { query: query });
    },
    
    /**
     * 从Neo4j加载图形数据
     * @param {string} query - Cypher查询语句
     * @returns {Object} 包含then方法的对象
     */
    loadGraphFromNeo4j: function(query) {
        this.isLoadingGraph = true;
        
        return this.httpRequest('/load-graph', 'POST', { query: query }).then(
            (response) => {
                this.isLoadingGraph = false;
                if (response.success) {
                    utils.showToast('图形数据加载成功', 'success');
                }
                return response;
            },
            (error) => {
                this.isLoadingGraph = false;
                utils.showToast('图形数据加载失败: ' + error.message, 'error');
                throw error;
            }
        );
    },
    
    /**
     * 处理图形数据
     * @param {Object} rawData - 原始数据
     * @returns {Object} 处理后的节点和边数据
     */
    loadGraphData: function(rawData) {
        const nodes = [];
        const edges = [];
        
        if (rawData && rawData.nodes) {
            for (let i = 0; i < rawData.nodes.length; i++) {
                const node = rawData.nodes[i];
                nodes.push({
                    group: 'nodes',
                    data: {
                        id: node.id,
                        label: node.label || 'Node',
                        properties: node.properties || {}
                    }
                });
            }
        }
        
        if (rawData && rawData.relationships) {
            for (let i = 0; i < rawData.relationships.length; i++) {
                const rel = rawData.relationships[i];
                edges.push({
                    group: 'edges',
                    data: {
                        id: rel.id,
                        source: rel.startNodeId,
                        target: rel.endNodeId,
                        label: rel.type,
                        properties: rel.properties || {}
                    }
                });
            }
        }
        
        return { nodes: nodes, edges: edges };
    },
    
    /**
     * 获取数据库信息
     * @returns {Object} 包含then方法的对象
     */
    getDatabaseInfo: function() {
        return this.httpRequest('/database/info', 'GET');
    },
    
    /**
     * 执行事务
     * @param {Array} queries - 查询数组
     * @returns {Object} 包含then方法的对象
     */
    executeTransaction: function(queries) {
        return this.httpRequest('/transaction', 'POST', { queries: queries });
    },
    
    /**
     * 获取节点标签
     * @returns {Object} 包含then方法的对象
     */
    getNodeLabels: function() {
        return this.httpRequest('/database/labels', 'GET');
    },
    
    /**
     * 获取关系类型
     * @returns {Object} 包含then方法的对象
     */
    getRelationshipTypes: function() {
        return this.httpRequest('/database/relationship-types', 'GET');
    },
    
    /**
     * 断开与Neo4j的连接
     * @returns {Object} 包含then方法的对象
     */
    disconnectFromNeo4j: function() {
        return this.httpRequest('/disconnect', 'POST').then(
            (response) => {
                localStorage.removeItem('neo4jConnection');
                utils.showToast('已断开与Neo4j的连接', 'info');
                return response;
            }
        );
    }
};

module.exports = apiManager;
