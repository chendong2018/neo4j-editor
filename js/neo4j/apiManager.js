/**
 * Neo4j Editor - Neo4j API管理器模块
 * 处理与Neo4j数据库的所有交互
 */

// 安全创建全局命名空间
window.neo4jEditor = window.neo4jEditor || {};

/**
 * 创建向后兼容函数
 * @param {string} deprecatedName - 旧函数名称
 * @param {Function} newFunction - 新函数实现
 * @param {Object} context - 函数执行上下文
 * @returns {Function|null} 包装后的兼容函数
 */
function createBackwardCompatibilityFunction(deprecatedName, newFunction, context) {
    try {
        // 参数安全检查
        if (typeof deprecatedName !== 'string' || deprecatedName.trim() === '') {
            console.error('createBackwardCompatibilityFunction: 无效的deprecatedName参数');
            return null;
        }
        
        if (typeof newFunction !== 'function') {
            console.error('createBackwardCompatibilityFunction: 无效的newFunction参数');
            return null;
        }
        
        return function() {
            if (typeof console !== 'undefined' && typeof console.warn === 'function') {
                console.warn(`警告: 直接调用 ${deprecatedName}() 已弃用，请使用适当的模块化方式调用`);
            }
            return newFunction.apply(context || null, arguments);
        };
    } catch (error) {
        console.error('createBackwardCompatibilityFunction: 创建兼容函数时出错:', error);
        return null;
    }
}

/**
 * Neo4j API管理器模块
 */
const neo4jApiModule = {
    // 初始化状态
    initialized: false,
    
    /**
     * Neo4j API配置对象
     */
    config: {
        baseUrl: 'http://localhost:7474',
        username: '',
        password: '',
        timeout: 30000,
        retryCount: 3,
        retryDelay: 1000
    },
    
    /**
     * 初始化Neo4j API管理器
     * @returns {boolean} 初始化是否成功
     */
    initialize: function() {
        try {
            console.log('Neo4j Editor: Initializing Neo4j API manager');
            this.loadConfig();
            
            // 标记模块为已初始化
            this.initialized = true;
            
            // 如果模块已经通过registerModule注册，更新其状态
            if (window.neo4jEditor && window.neo4jEditor.modules && window.neo4jEditor.modules['neo4j/apiManager']) {
                window.neo4jEditor.modules['neo4j/apiManager'].initialized = true;
            }
            
            return true;
        } catch (error) {
            console.error('Neo4j Editor: Error initializing Neo4j API manager:', error);
            return false;
        }
    },
    
    /**
     * 设置Neo4j连接配置
     * @param {Object} config - 配置对象 {baseUrl, username, password}
     * @returns {boolean} 设置是否成功
     */
    setConfig: function(config) {
        try {
            console.log('Neo4j Editor: Setting Neo4j configuration', config);
            
            if (config && typeof config === 'object') {
                Object.assign(this.config, config);
            }
            
            // 保存配置到本地存储
            localStorage.setItem('neo4jApiConfig', JSON.stringify(this.config));
            return true;
        } catch (error) {
            console.error('Neo4j Editor: Failed to save Neo4j config:', error);
            return false;
        }
    },

    /**
     * 从本地存储加载Neo4j配置
     * @returns {boolean} 加载是否成功
     */
    loadConfig: function() {
        try {
            const savedConfig = localStorage.getItem('neo4jApiConfig');
            if (savedConfig) {
                const config = JSON.parse(savedConfig);
                Object.assign(this.config, config);
                console.log('Neo4j Editor: Neo4j config loaded from local storage');
                return true;
            }
        } catch (error) {
            console.error('Neo4j Editor: Failed to load Neo4j config:', error);
        }
        return false;
    },

    /**
     * 测试Neo4j连接
     * @returns {Promise<Object>} 连接测试结果
     */
    testConnection: async function() {
        try {
            console.log('Neo4j Editor: Testing Neo4j connection');
            
            const response = await this.executeQuery('RETURN 1 AS connected');
            return {
                success: true,
                message: '连接成功'
            };
        } catch (error) {
            console.error('Neo4j Editor: Connection test failed:', error);
            return {
                success: false,
                message: error.message || '连接失败'
            };
        }
    },

    /**
     * 执行Neo4j Cypher查询
     * @param {string} query - Cypher查询语句
     * @param {Object} params - 查询参数
     * @param {number} retryCount - 当前重试次数
     * @returns {Promise<Object>} 查询结果
     */
    executeQuery: async function(query, params = {}, retryCount = 0) {
        try {
            const { 
                baseUrl = 'http://localhost:7474', 
                username = '', 
                password = '', 
                timeout = 30000, 
                retryCount: maxRetries = 3, 
                retryDelay = 1000 
            } = this.config;
            
            const url = `${baseUrl}/db/data/transaction/commit`;
            
            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': 'Basic ' + btoa(username + ':' + password),
                    'Accept': 'application/json; charset=UTF-8'
                },
                body: JSON.stringify({
                    statements: [{
                        statement: query,
                        parameters: params,
                        resultDataContents: ['row', 'graph'],
                        includeStats: false
                    }]
                }),
                timeout
            });
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const data = await response.json();
            
            // 检查Neo4j错误
            if (data.errors && data.errors.length > 0) {
                throw new Error(data.errors[0].message);
            }
            
            return data;
        } catch (error) {
            // 重试逻辑
            if (retryCount < this.config.retryCount) {
                console.warn(`Neo4j Editor: Query failed, retrying (${retryCount + 1}/${this.config.retryCount})...`);
                await new Promise(resolve => setTimeout(resolve, this.config.retryDelay));
                return this.executeQuery(query, params, retryCount + 1);
            }
            throw error;
        }
    },

    /**
     * 从Neo4j导入图数据
     * @param {Object} options - 导入选项
     * @returns {Promise<Object>} 导入结果
     */
    importData: async function(options = {}) {
        try {
            console.log('Neo4j Editor: Importing data from Neo4j', options);
            
            // 构建查询 - 根据标签和关系类型过滤
            let query = 'MATCH (n)';
            const filters = [];
            const params = {};
            
            // 添加节点标签过滤
            if (options.nodeLabels && Array.isArray(options.nodeLabels) && options.nodeLabels.length > 0) {
                query += ' WHERE ';
                options.nodeLabels.forEach((label, index) => {
                    const paramName = `label${index}`;
                    filters.push(`n:${paramName}`);
                    params[paramName] = label;
                });
                query += filters.join(' OR ');
            }
            
            // 获取所有节点和关系
            query += ' OPTIONAL MATCH (n)-[r]-(m) RETURN n, r, m';
            
            const result = await this.executeQuery(query, params);
            
            // 处理结果数据
            const nodes = new Map();
            const edges = [];
            
            if (result.results && result.results[0] && result.results[0].data) {
                result.results[0].data.forEach(row => {
                    // 提取节点
                    if (row.graph && row.graph.nodes) {
                        row.graph.nodes.forEach(node => {
                            nodes.set(node.id, {
                                group: 'nodes',
                                data: {
                                    id: node.id,
                                    labels: node.labels,
                                    ...node.properties
                                }
                            });
                        });
                    }
                    
                    // 提取关系
                    if (row.graph && row.graph.relationships) {
                        row.graph.relationships.forEach(rel => {
                            edges.push({
                                group: 'edges',
                                data: {
                                    id: rel.id,
                                    source: rel.startNode,
                                    target: rel.endNode,
                                    type: rel.type,
                                    label: rel.type,
                                    ...rel.properties
                                }
                            });
                        });
                    }
                });
            }
            
            // 转换节点Map为数组
            const nodesArray = Array.from(nodes.values());
            
            console.log(`Neo4j Editor: Imported ${nodesArray.length} nodes and ${edges.length} edges from Neo4j`);
            
            // 触发导入完成事件
            if (window.neo4jEditor && typeof window.neo4jEditor.triggerEvent === 'function') {
                window.neo4jEditor.triggerEvent('neo4jImportComplete', {
                    nodes: nodesArray,
                    edges: edges
                });
            }
            
            return {
                success: true,
                data: {
                    nodes: nodesArray,
                    edges: edges
                }
            };
        } catch (error) {
            console.error('Neo4j Editor: Error importing from Neo4j:', error);
            return {
                success: false,
                error: error.message
            };
        }
    },

    /**
     * 导出图数据到Neo4j
     * @param {Object} graphData - 图数据 {nodes, edges}
     * @returns {Promise<Object>} 导出结果
     */
    exportData: async function(graphData) {
        try {
            console.log('Neo4j Editor: Exporting data to Neo4j', {
                nodesCount: graphData?.nodes?.length || 0,
                edgesCount: graphData?.edges?.length || 0
            });
            
            // 验证输入
            if (!graphData || typeof graphData !== 'object') {
                throw new Error('Invalid graph data format');
            }
            
            // 清空数据库（可选）
            if (graphData.clearDatabase) {
                await this.executeQuery('MATCH (n) DETACH DELETE n');
            }
            
            // 分批处理导入
            const batchSize = 100;
            const nodes = graphData.nodes || [];
            const edges = graphData.edges || [];
            
            // 导入节点
            for (let i = 0; i < nodes.length; i += batchSize) {
                const batch = nodes.slice(i, i + batchSize);
                await this.importNodesBatch(batch);
            }
            
            // 导入关系
            for (let i = 0; i < edges.length; i += batchSize) {
                const batch = edges.slice(i, i + batchSize);
                await this.importEdgesBatch(batch);
            }
            
            console.log(`Neo4j Editor: Exported ${nodes.length} nodes and ${edges.length} edges to Neo4j`);
            
            // 触发导出完成事件
            if (window.neo4jEditor && typeof window.neo4jEditor.triggerEvent === 'function') {
                window.neo4jEditor.triggerEvent('neo4jExportComplete', {
                    nodesCount: nodes.length,
                    edgesCount: edges.length
                });
            }
            
            return {
                success: true,
                message: `成功导入 ${nodes.length} 个节点和 ${edges.length} 条关系`
            };
        } catch (error) {
            console.error('Neo4j Editor: Error exporting to Neo4j:', error);
            return {
                success: false,
                error: error.message
            };
        }
    },

    /**
     * 批量导入节点
     * @param {Array} nodes - 节点数组
     */
    importNodesBatch: async function(nodes) {
        try {
            const queries = [];
            
            if (Array.isArray(nodes)) {
                nodes.forEach(node => {
                    const data = node.data || {};
                    const labels = data.labels || ['Node'];
                    const labelString = labels.map(l => `:${l}`).join('');
                    
                    // 构建属性字符串
                    const properties = {};
                    Object.keys(data).forEach(key => {
                        if (key !== 'id' && key !== 'labels') {
                            properties[key] = data[key];
                        }
                    });
                    
                    const query = `CREATE (n${labelString} $props) RETURN n`;
                    queries.push({ query, params: { props: properties } });
                });
            }
            
            // 执行批量导入
            for (const { query, params } of queries) {
                await this.executeQuery(query, params);
            }
        } catch (error) {
            console.error('Neo4j Editor: Error importing nodes batch:', error);
            throw error;
        }
    },

    /**
     * 批量导入关系
     * @param {Array} edges - 边数组
     */
    importEdgesBatch: async function(edges) {
        try {
            const queries = [];
            
            if (Array.isArray(edges)) {
                edges.forEach(edge => {
                    const data = edge.data || {};
                    const { source, target, type } = data;
                    
                    if (!source || !target || !type) {
                        console.warn('Neo4j Editor: Invalid edge data, skipping:', edge);
                        return;
                    }
                    
                    // 构建属性字符串
                    const properties = {};
                    Object.keys(data).forEach(key => {
                        if (key !== 'id' && key !== 'source' && key !== 'target' && key !== 'type') {
                            properties[key] = data[key];
                        }
                    });
                    
                    // 注意：这里使用了id来查找节点，实际Neo4j可能需要调整为其他查找方式
                    const query = `MATCH (a), (b) WHERE ID(a) = $sourceId AND ID(b) = $targetId CREATE (a)-[r:${type} $props]->(b) RETURN r`;
                    queries.push({ 
                        query, 
                        params: { 
                            sourceId: parseInt(source), 
                            targetId: parseInt(target), 
                            props: properties 
                        } 
                    });
                });
            }
            
            // 执行批量导入
            for (const { query, params } of queries) {
                try {
                    await this.executeQuery(query, params);
                } catch (error) {
                    console.warn('Neo4j Editor: Failed to import edge:', error);
                }
            }
        } catch (error) {
            console.error('Neo4j Editor: Error importing edges batch:', error);
            throw error;
        }
    },

    /**
     * 获取Neo4j中所有可用的标签
     * @returns {Promise<Array>} 标签数组
     */
    getLabels: async function() {
        try {
            const query = 'CALL db.labels()';
            const result = await this.executeQuery(query);
            
            return result.results && result.results[0] && result.results[0].data 
                ? result.results[0].data.map(row => row.row[0]) 
                : [];
        } catch (error) {
            console.error('Neo4j Editor: Error fetching Neo4j labels:', error);
            return [];
        }
    },

    /**
     * 获取Neo4j中所有可用的关系类型
     * @returns {Promise<Array>} 关系类型数组
     */
    getRelationshipTypes: async function() {
        try {
            const query = 'CALL db.relationshipTypes()';
            const result = await this.executeQuery(query);
            
            return result.results && result.results[0] && result.results[0].data 
                ? result.results[0].data.map(row => row.row[0]) 
                : [];
        } catch (error) {
            console.error('Neo4j Editor: Error fetching Neo4j relationship types:', error);
            return [];
        }
    },

    /**
     * 检查Neo4j连接状态
     * @returns {Promise<boolean>} 是否连接
     */
    isConnected: async function() {
        try {
            const result = await this.testConnection();
            return result.success;
        } catch (error) {
            return false;
        }
    }
};

// 导出到window对象
window.neo4jApi = neo4jApiModule;

// 向后兼容：保留原有的全局函数，但重定向到新的命名空间函数
const backwardCompatibilityMappings = [
    { oldName: 'setNeo4jConfig', newMethod: 'setConfig' },
    { oldName: 'loadNeo4jConfig', newMethod: 'loadConfig' },
    { oldName: 'testNeo4jConnection', newMethod: 'testConnection' },
    { oldName: 'importFromNeo4j', newMethod: 'importData' },
    { oldName: 'exportToNeo4j', newMethod: 'exportData' },
    { oldName: 'getNeo4jLabels', newMethod: 'getLabels' },
    { oldName: 'getNeo4jRelationshipTypes', newMethod: 'getRelationshipTypes' },
    { oldName: 'initializeNeo4jApi', newMethod: 'initialize' }
];

// 注册所有向后兼容函数
backwardCompatibilityMappings.forEach(({ oldName, newMethod }) => {
    if (typeof window[oldName] === 'undefined') {
        window[oldName] = createBackwardCompatibilityFunction(
            neo4jApiModule[newMethod].bind(neo4jApiModule),
            oldName,
            `window.neo4jApi.${newMethod}`
        );
    }
});

// 确保modules对象存在
if (window.neo4jEditor && typeof window.neo4jEditor.modules === 'undefined') {
    window.neo4jEditor.modules = {};
}

// 使用标准的模块注册方法
const moduleName = 'neo4j/apiManager';
if (window.neo4jEditor && typeof window.neo4jEditor.registerModule === 'function') {
    try {
        window.neo4jEditor.registerModule(moduleName, neo4jApiModule, {
            version: '1.1.1',
            dependencies: ['core/init']
        });
        console.log('Neo4j Editor: Neo4j API Manager module registered successfully');
    } catch (registrationError) {
        console.error('Neo4j Editor: Failed to register Neo4j API Manager module:', registrationError);
        
        // 降级方案：直接注册到modules对象
        if (typeof window.neo4jEditor.modules[moduleName] === 'undefined') {
            window.neo4jEditor.modules[moduleName] = {
                name: moduleName,
                version: '1.1.1',
                initialized: neo4jApiModule.initialized,
                dependencies: ['core/init'],
                module: neo4jApiModule
            };
            console.log('Neo4j Editor: Neo4j API Manager module registered via fallback');
        }
    }
}

// 多模块系统支持 - 确保兼容性
// CommonJS 模块支持
if (typeof module !== 'undefined' && typeof module.exports !== 'undefined') {
    module.exports = neo4jApiModule;
}

// ES 模块支持
if (typeof exports !== 'undefined' && typeof exports === 'object') {
    Object.defineProperty(exports, '__esModule', { value: true });
    if (typeof module !== 'undefined') module.exports = neo4jApiModule;
    exports.default = neo4jApiModule;
}

// AMD 模块支持
if (typeof define === 'function' && define.amd) {
    define(['core/init'], function() {
        return neo4jApiModule;
    });
}