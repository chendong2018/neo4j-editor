/**
 * API管理器 - 处理与后端服务的所有通信
 */

// 全局状态标志
let isConnecting = false;
let isLoadingGraph = false;

/**
 * 初始化API管理器
 */
function initializeApiManager() {
    console.log('Neo4j Editor: Initializing API Manager');
    // 可以在这里设置全局配置或监听器
}

/**
 * 检查后端健康状态
 * @returns {Promise<boolean>} 后端是否健康
 */
function checkBackendHealth() {
    console.log('Neo4j Editor: Checking backend health status');
    const healthUrl = `${apiBaseUrl}/api/health`;
    
    // 使用通用HTTP请求函数
    return httpRequest({
        url: healthUrl,
        method: 'GET',
        timeout: 3000
    })
    .then(response => {
        console.log('Neo4j Editor: Backend health check successful:', response);
        return true;
    })
    .catch(error => {
        console.error('Neo4j Editor: Backend health check failed:', error);
        return false;
    });
}

/**
 * 通用HTTP请求函数，支持Axios和原生fetch作为回退
 * @param {Object} config - 请求配置
 * @param {string} config.url - 请求URL
 * @param {string} config.method - 请求方法
 * @param {Object} config.data - 请求数据
 * @param {Object} config.headers - 请求头
 * @param {number} config.timeout - 超时时间
 * @returns {Promise<any>} 请求结果
 */
function httpRequest(config) {
    const {
        url,
        method = 'GET',
        data,
        headers = {},
        timeout = 10000
    } = config;
    
    // 参数验证
    if (!url) {
        return Promise.reject(new Error('URL is required for HTTP request'));
    }
    
    // 尝试使用Axios
    if (typeof axios !== 'undefined') {
        console.log('Using Axios for HTTP request to:', url);
        return axios({
            url,
            method,
            data,
            headers: {
                'Content-Type': 'application/json',
                ...headers
            },
            timeout
        })
        .then(response => {
            // 为了保持一致性，返回response.data
            return response.data;
        })
        .catch(error => {
            console.error('Axios request failed:', error);
            // 增强错误处理，提供更详细的错误信息
            if (error.response) {
                throw new Error(`HTTP error ${error.response.status}: ${error.response.statusText}`);
            } else if (error.request) {
                throw new Error('Network error: No response received');
            } else {
                throw new Error(`Request error: ${error.message}`);
            }
        });
    } else {
        // 使用原生fetch作为回退
        console.log('Axios not available, using native fetch as fallback for:', url);
        const fetchOptions = {
            method,
            headers: {
                'Content-Type': 'application/json',
                ...headers
            },
            signal: timeout ? AbortSignal.timeout(timeout) : undefined
        };
        
        if (data && method !== 'GET' && method !== 'HEAD') {
            fetchOptions.body = JSON.stringify(data);
        }
        
        return fetch(url, fetchOptions)
            .then(response => {
                if (!response.ok) {
                    return response.json()
                        .catch(() => ({}))
                        .then(data => {
                            const errorMessage = data.message || `HTTP error! status: ${response.status}`;
                            const error = new Error(errorMessage);
                            error.response = response;
                            error.response.data = data;
                            error.status = response.status;
                            throw error;
                        });
                }
                return response.json();
            })
            .catch(error => {
                console.error('Fetch request failed:', error);
                if (error.name === 'AbortError') {
                    throw new Error(`Request timeout after ${timeout}ms`);
                }
                throw error;
            });
    }
}

/**
 * 连接到Neo4j数据库
 * @returns {Promise<void>}
 */
function connectToNeo4j() {
    // 防止重复连接请求
    if (isConnecting) {
        console.log('Neo4j Editor: Connection in progress, please wait...');
        showToast('Connection in progress, please wait...');
        return Promise.resolve();
    }
    
    console.log('Neo4j Editor: Attempting to connect to Neo4j');
    const uri = document.getElementById('neo4j-uri')?.value;
    const user = document.getElementById('neo4j-user')?.value;
    const password = document.getElementById('neo4j-password')?.value;
    
    // 表单验证
    if (!uri || !user || !password) {
        showToast('All fields are required');
        return Promise.resolve();
    }
    
    // 先检查后端健康状态
    return checkBackendHealth()
        .then(isHealthy => {
            if (!isHealthy) {
                showToast('Error: Cannot connect to backend service. Please check if the server is running.');
                return;
            }
            
            // 设置连接中状态
            isConnecting = true;
            
            // Show toast
            showToast('Connecting to Neo4j...');
        
            // Send connection request to backend - 使用apiBaseUrl
            const connectUrl = `${apiBaseUrl}/api/connect`;
            console.log('Neo4j Editor: Sending connection request to:', connectUrl);
            
            // 使用通用HTTP请求函数
            return httpRequest({
                url: connectUrl,
                method: 'POST',
                data: {
                    uri,
                    user,
                    password
                }
            });
        })
        .then(response => {
            console.log('Neo4j Editor: Connected to Neo4j successfully:', response);
            showToast('Connected to Neo4j successfully!');
            
            // 可以在这里触发连接成功后的操作
            if (typeof onNeo4jConnected === 'function') {
                onNeo4jConnected(response);
            }
        })
        .catch(error => {
            console.error('Neo4j Editor: Failed to connect to Neo4j:', error);
            showToast(`Connection failed: ${error.message}`);
        })
        .finally(() => {
            // 重置连接状态
            isConnecting = false;
        });
}

/**
 * 执行Cypher查询
 * @param {string} cypher - Cypher查询语句
 * @returns {Promise<Object>} 查询结果
 */
function executeCypherQuery(cypher) {
    if (!cypher) {
        return Promise.reject(new Error('Cypher query is required'));
    }
    
    console.log('Neo4j Editor: Executing Cypher query');
    const queryUrl = `${apiBaseUrl}/api/query`;
    
    return httpRequest({
        url: queryUrl,
        method: 'POST',
        data: { cypher }
    });
}

/**
 * 执行Cypher查询
 * @param {string} query - Cypher查询语句
 * @param {number} timeout - 查询超时时间(ms)
 * @returns {Promise<Object>} 查询结果
 */
async function runCypherQuery(query, timeout = 30000) {
    if (!neo4jConnection) {
        throw new Error('Not connected to Neo4j');
    }
    
    try {
        const response = await httpRequest(`${apiBaseUrl}/query`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${neo4jConnection.token}`
            },
            data: {
                query: query,
                timeout: timeout
            },
            timeout: timeout
        });
        
        return response.data;
    } catch (error) {
        console.error('API Manager: Cypher query error:', error);
        throw error;
    }
}

/**
 * 从Neo4j加载图数据
 * @returns {Promise<Object>} 图数据
 */
async function loadGraphFromNeo4j() {
    if (isLoadingGraph) {
        console.log('Neo4j Editor: Graph loading in progress');
        showToast('Graph loading in progress...');
        return Promise.resolve();
    }
    
    if (!neo4jConnection) {
        throw new Error('Not connected to Neo4j');
    }
    
    console.log('Neo4j Editor: Loading graph from Neo4j');
    isLoadingGraph = true;
    showToast('Loading graph data...');
    
    try {
        // 使用与原index.html相同的查询逻辑
        const query = `
            MATCH (n)
            OPTIONAL MATCH (n)-[r]->(m)
            RETURN n, r, m
            LIMIT 1000
        `;
        
        const response = await runCypherQuery(query, 30000);
        
        console.log('Neo4j Editor: Graph loaded successfully');
        showToast(`Graph loaded successfully`);
        
        // 触发图加载完成事件
        if (typeof onGraphLoaded === 'function') {
            onGraphLoaded(response);
        }
        
        return response;
    } catch (error) {
        console.error('Neo4j Editor: Failed to load graph:', error);
        showToast(`Failed to load graph: ${error.message}`);
        throw error;
    } finally {
        isLoadingGraph = false;
    }
}

// 暴露公共函数到window对象
window.initializeApiManager = initializeApiManager;
window.checkBackendHealth = checkBackendHealth;
window.httpRequest = httpRequest;
window.connectToNeo4j = connectToNeo4j;
window.executeCypherQuery = executeCypherQuery;
window.loadGraphFromNeo4j = loadGraphFromNeo4j;

// 初始化API管理器
if (typeof document !== 'undefined') {
    document.addEventListener('DOMContentLoaded', initializeApiManager);
}