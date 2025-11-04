/**
 * API管理器 - 处理与后端服务的所有通信
 */

// 全局状态标志
var isConnecting = false;
var isLoadingGraph = false;
var apiBaseUrl = ''; // 将在初始化时设置

/**
 * 为了兼容性，保留旧的httpRequest函数接口，但内部使用回调
 * @param {Object} config - 请求配置
 * @returns {Object} 包含then方法的对象用于链式调用
 */
function httpRequest(config) {
    console.log('Using compatibility HTTP request function');
    
    // 返回一个简单的对象，支持基本的then链式调用
    return {
        then: function(successCallback, errorCallback) {
            httpRequestCallback(config, successCallback, errorCallback);
            return this; // 支持链式调用
        },
        catch: function(errorCallback) {
            httpRequestCallback(config, null, errorCallback);
            return this;
        }
    };
}

/**
 * 通用HTTP请求函数，使用传统回调方式
 * @param {Object} config - 请求配置
 * @param {Function} successCallback - 成功回调函数
 * @param {Function} errorCallback - 错误回调函数
 */
function httpRequestCallback(config, successCallback, errorCallback) {
    console.log('Neo4j Editor: Making HTTP request to:', config.url);
    
    // 确保配置对象存在
    config = config || {};
    
    // 创建XMLHttpRequest对象
    var xhr = new XMLHttpRequest();
    
    // 设置超时
    if (config.timeout) {
        xhr.timeout = config.timeout;
    }
    
    // 处理请求完成
    xhr.onload = function() {
        if (xhr.status >= 200 && xhr.status < 400) {
            try {
                var response = JSON.parse(xhr.responseText);
                successCallback && successCallback(response);
            } catch (e) {
                // 如果不是JSON，直接返回文本
                successCallback && successCallback(xhr.responseText);
            }
        } else {
            var error = new Error('Request failed with status: ' + xhr.status);
            error.status = xhr.status;
            error.message = xhr.statusText || error.message;
            errorCallback && errorCallback(error);
        }
    };
    
    // 处理网络错误
    xhr.onerror = function() {
        var error = new Error('Network error');
        errorCallback && errorCallback(error);
    };
    
    // 处理超时
    xhr.ontimeout = function() {
        var error = new Error('Request timeout');
        error.timeout = true;
        errorCallback && errorCallback(error);
    };
    
    // 准备请求
    var method = config.method || 'GET';
    var url = config.url || '';
    var data = config.data;
    
    // 打开连接
    xhr.open(method, url, true);
    
    // 设置请求头
    if (config.headers) {
        for (var header in config.headers) {
            if (config.headers.hasOwnProperty(header)) {
                xhr.setRequestHeader(header, config.headers[header]);
            }
        }
    }
    
    // 默认设置Content-Type为JSON，除非另有指定
    if (data && typeof data === 'object' && (!config.headers || !config.headers['Content-Type'])) {
        xhr.setRequestHeader('Content-Type', 'application/json');
        data = JSON.stringify(data);
    }
    
    // 发送请求
    xhr.send(data);
}

/**
 * 初始化API管理器
 */
function initializeApiManager() {
    console.log('Neo4j Editor: Initializing API Manager');
    // 设置API基础URL
    apiBaseUrl = window.location.origin;
}

/**
 * 检查后端健康状态
 * @returns {Object} 包含success属性的结果对象
 */
function checkBackendHealth() {
    console.log('Neo4j Editor: Checking backend health status');
    var healthUrl = apiBaseUrl + '/api/health';
    
    // 创建一个简单的结果对象用于回调
    var result = { success: false };
    
    // 使用回调方式的HTTP请求
    httpRequestCallback({
        url: healthUrl,
        method: 'GET',
        timeout: 3000
    }, function(response) {
        console.log('Neo4j Editor: Backend health check successful:', response);
        result.success = true;
    }, function(error) {
        console.error('Neo4j Editor: Backend health check failed:', error);
        result.success = false;
    });
    
    return result;
}

/**
 * 连接到Neo4j数据库
 */
function connectToNeo4j() {
    // 防止重复连接请求
    if (isConnecting) {
        console.log('Neo4j Editor: Connection in progress, please wait...');
        if (typeof window.showToast === 'function') {
            window.showToast('Connection in progress, please wait...');
        }
        return;
    }
    
    isConnecting = true;
    
    // 获取连接信息
    var uri = document.getElementById('neo4j-uri') ? document.getElementById('neo4j-uri').value : 'bolt://localhost:7687';
    var user = document.getElementById('neo4j-user') ? document.getElementById('neo4j-user').value : 'neo4j';
    var password = document.getElementById('neo4j-password') ? document.getElementById('neo4j-password').value : '';
    
    // 验证必填字段
    if (!uri || !user) {
        if (typeof window.showToast === 'function') {
            window.showToast('URI and username are required', 'error');
        }
        isConnecting = false;
        return;
    }
    
    // 准备请求数据
    var connectionData = {
        uri: uri,
        user: user,
        password: password
    };
    
    // 发送连接请求
    httpRequestCallback({
        url: apiBaseUrl + '/api/connect',
        method: 'POST',
        data: connectionData,
        timeout: 10000
    }, function(response) {
        console.log('Neo4j Editor: Connected successfully:', response);
        isConnecting = false;
        
        if (typeof window.showToast === 'function') {
            window.showToast('Connected to Neo4j database', 'success');
        }
        
        // 保存连接信息到localStorage
        try {
            var savedConnection = {
                uri: uri,
                user: user
                // 不保存密码
            };
            localStorage.setItem('neo4j-connection', JSON.stringify(savedConnection));
        } catch (e) {
            console.error('Neo4j Editor: Failed to save connection details:', e);
        }
        
        // 通知UI更新连接状态
        if (typeof window.updateConnectionStatusUI === 'function') {
            window.updateConnectionStatusUI(true);
        }
    }, function(error) {
        console.error('Neo4j Editor: Connection failed:', error);
        isConnecting = false;
        
        if (typeof window.showToast === 'function') {
            window.showToast('Failed to connect: ' + (error.message || 'Unknown error'), 'error');
        }
        
        // 通知UI更新连接状态
        if (typeof window.updateConnectionStatusUI === 'function') {
            window.updateConnectionStatusUI(false);
        }
    });
}

/**
 * 执行Cypher查询
 * @param {string} query - Cypher查询语句
 * @returns {Promise} 查询结果的Promise
 */
function executeCypherQuery(query) {
    // 返回一个简单的Promise-like对象
    return {
        then: function(successCallback, errorCallback) {
            httpRequestCallback({
                url: apiBaseUrl + '/api/query',
                method: 'POST',
                data: { query: query },
                timeout: 30000
            }, successCallback, errorCallback);
            return this;
        },
        catch: function(errorCallback) {
            httpRequestCallback({
                url: apiBaseUrl + '/api/query',
                method: 'POST',
                data: { query: query },
                timeout: 30000
            }, null, errorCallback);
            return this;
        }
    };
}

/**
 * 从Neo4j加载图形数据
 */
function loadGraphFromNeo4j() {
    if (isLoadingGraph) {
        console.log('Neo4j Editor: Graph loading already in progress');
        if (typeof window.showToast === 'function') {
            window.showToast('Graph loading already in progress');
        }
        return;
    }
    
    isLoadingGraph = true;
    
    httpRequestCallback({
        url: apiBaseUrl + '/api/graph',
        method: 'GET',
        timeout: 30000
    }, function(graphData) {
        console.log('Neo4j Editor: Graph data loaded successfully');
        isLoadingGraph = false;
        
        if (typeof window.showToast === 'function') {
            window.showToast('Loaded ' + graphData.nodes.length + ' nodes and ' + graphData.edges.length + ' relationships');
        }
        
        // 处理加载的图形数据
        if (typeof window.loadGraphData === 'function') {
            window.loadGraphData(graphData);
        }
    }, function(error) {
        console.error('Neo4j Editor: Failed to load graph data:', error);
        isLoadingGraph = false;
        
        if (typeof window.showToast === 'function') {
            window.showToast('Failed to load filtered data: ' + error.message, 'error');
        }
    });
}

/**
 * 加载图形数据到编辑器
 * @param {Object} graphData - 图形数据对象
 */
function loadGraphData(graphData) {
    console.log('Neo4j Editor: Loading graph data into editor');
    // 这个函数会被其他模块实现
}

/**
 * 获取数据库信息
 */
function getDatabaseInfo() {
    return {
        then: function(successCallback, errorCallback) {
            httpRequestCallback({
                url: apiBaseUrl + '/api/database/info',
                method: 'GET',
                timeout: 5000
            }, successCallback, errorCallback);
            return this;
        },
        catch: function(errorCallback) {
            httpRequestCallback({
                url: apiBaseUrl + '/api/database/info',
                method: 'GET',
                timeout: 5000
            }, null, errorCallback);
            return this;
        }
    };
}

/**
 * 执行事务
 * @param {Array} queries - 查询数组
 */
function executeTransaction(queries) {
    return {
        then: function(successCallback, errorCallback) {
            httpRequestCallback({
                url: apiBaseUrl + '/api/transaction',
                method: 'POST',
                data: { queries: queries },
                timeout: 60000
            }, successCallback, errorCallback);
            return this;
        },
        catch: function(errorCallback) {
            httpRequestCallback({
                url: apiBaseUrl + '/api/transaction',
                method: 'POST',
                data: { queries: queries },
                timeout: 60000
            }, null, errorCallback);
            return this;
        }
    };
}

/**
 * 获取节点标签
 */
function getNodeLabels() {
    return {
        then: function(successCallback, errorCallback) {
            httpRequestCallback({
                url: apiBaseUrl + '/api/node/labels',
                method: 'GET',
                timeout: 5000
            }, successCallback, errorCallback);
            return this;
        },
        catch: function(errorCallback) {
            httpRequestCallback({
                url: apiBaseUrl + '/api/node/labels',
                method: 'GET',
                timeout: 5000
            }, null, errorCallback);
            return this;
        }
    };
}

/**
 * 获取关系类型
 */
function getRelationshipTypes() {
    return {
        then: function(successCallback, errorCallback) {
            httpRequestCallback({
                url: apiBaseUrl + '/api/relationship/types',
                method: 'GET',
                timeout: 5000
            }, successCallback, errorCallback);
            return this;
        },
        catch: function(errorCallback) {
            httpRequestCallback({
                url: apiBaseUrl + '/api/relationship/types',
                method: 'GET',
                timeout: 5000
            }, null, errorCallback);
            return this;
        }
    };
}

/**
 * 断开与Neo4j的连接
 */
function disconnectFromNeo4j() {
    httpRequestCallback({
        url: apiBaseUrl + '/api/disconnect',
        method: 'POST',
        timeout: 5000
    }, function() {
        console.log('Neo4j Editor: Disconnected successfully');
        
        if (typeof window.showToast === 'function') {
            window.showToast('Disconnected from Neo4j database', 'success');
        }
        
        // 更新连接状态UI
        if (typeof window.updateConnectionStatusUI === 'function') {
            window.updateConnectionStatusUI(false);
        }
    }, function(error) {
        console.error('Neo4j Editor: Disconnect failed:', error);
        
        if (typeof window.showToast === 'function') {
            window.showToast('Failed to disconnect: ' + (error.message || 'Unknown error'));
        }
    });
}

// 暴露公共函数到window对象
window.initializeApiManager = initializeApiManager;
window.checkBackendHealth = checkBackendHealth;
window.httpRequest = httpRequest;
window.httpRequestCallback = httpRequestCallback;
window.connectToNeo4j = connectToNeo4j;
window.executeCypherQuery = executeCypherQuery;
window.loadGraphFromNeo4j = loadGraphFromNeo4j;
window.loadGraphData = loadGraphData;
window.getDatabaseInfo = getDatabaseInfo;
window.executeTransaction = executeTransaction;
window.getNodeLabels = getNodeLabels;
window.getRelationshipTypes = getRelationshipTypes;
window.disconnectFromNeo4j = disconnectFromNeo4j;

// 初始化API管理器
if (typeof document !== 'undefined') {
    document.addEventListener('DOMContentLoaded', initializeApiManager);
}