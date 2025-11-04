/**
 * Data Manager Module
 * 
 * 负责与Neo4j数据库的通信、数据转换和CRUD操作
 */
neo4jEditor.define('dataManager', ['eventBus', 'configManager', 'userManager'], function(eventBus, configManager, userManager) {
    const module = {
        name: 'dataManager',
        version: '1.0.0',
        connectionConfig: null,
        isConnected: false,
        transactionStack: [],
        pendingOperations: 0,
        nodeTypes: new Map(),
        relationshipTypes: new Map(),
        lastOperationId: 0
    };

    /**
     * 初始化数据管理器
     */
    module.initialize = function() {
        console.log('Data Manager initialized');
        this.setupEventListeners();
        this.loadConnectionConfig();
        this.loadTypeDefinitions();
    };

    /**
     * 设置事件监听器
     */
    module.setupEventListeners = function() {
        // 连接事件
        eventBus.on('connection:attempt', (config) => {
            this.connect(config);
        });

        eventBus.on('connection:disconnect', () => {
            this.disconnect();
        });

        // 数据操作事件
        eventBus.on('data:node:create', (nodeData) => {
            this.createNode(nodeData);
        });

        eventBus.on('data:node:update', (nodeId, updates) => {
            this.updateNode(nodeId, updates);
        });

        eventBus.on('data:node:delete', (nodeId) => {
            this.deleteNode(nodeId);
        });

        eventBus.on('data:relationship:create', (relData) => {
            this.createRelationship(relData);
        });

        eventBus.on('data:relationship:update', (relId, updates) => {
            this.updateRelationship(relId, updates);
        });

        eventBus.on('data:relationship:delete', (relId) => {
            this.deleteRelationship(relId);
        });

        // 导入/导出事件
        eventBus.on('data:import', (data) => {
            this.importData(data);
        });

        eventBus.on('data:export', () => {
            this.exportData();
        });

        // 查询执行事件
        eventBus.on('query:execute', (query) => {
            this.executeQuery(query);
        });
    };

    /**
     * 加载连接配置
     */
    module.loadConnectionConfig = function() {
        try {
            const savedConfig = localStorage.getItem('neo4jConnectionConfig');
            if (savedConfig) {
                this.connectionConfig = JSON.parse(savedConfig);
                eventBus.emit('connection:config:loaded', this.connectionConfig);
            }
        } catch (error) {
            console.error('Failed to load connection config:', error);
        }
    };

    /**
     * 保存连接配置
     */
    module.saveConnectionConfig = function(config) {
        try {
            localStorage.setItem('neo4jConnectionConfig', JSON.stringify(config));
            this.connectionConfig = config;
            return true;
        } catch (error) {
            console.error('Failed to save connection config:', error);
            return false;
        }
    };

    /**
     * 连接到Neo4j数据库
     */
    module.connect = async function(config) {
        if (!config || !config.url || !config.username || !config.password) {
            eventBus.emit('connection:error', 'Missing connection parameters');
            return false;
        }

        this.startOperation();
        
        try {
            // 这里应该是实际的Neo4j驱动连接代码
            // 由于是模拟环境，我们将模拟连接成功
            console.log('Connecting to Neo4j at:', config.url);
            
            // 模拟连接延迟
            await new Promise(resolve => setTimeout(resolve, 1000));
            
            this.isConnected = true;
            this.saveConnectionConfig(config);
            
            eventBus.emit('connection:success', {
                url: config.url,
                username: config.username
            });
            
            // 加载节点和关系类型
            await this.refreshTypeDefinitions();
            
            // 加载示例数据
            await this.loadSampleData();
            
            return true;
        } catch (error) {
            console.error('Connection error:', error);
            this.isConnected = false;
            eventBus.emit('connection:error', error.message || 'Failed to connect to Neo4j');
            return false;
        } finally {
            this.endOperation();
        }
    };

    /**
     * 断开连接
     */
    module.disconnect = function() {
        this.isConnected = false;
        this.connectionConfig = null;
        this.transactionStack = [];
        
        eventBus.emit('connection:disconnected');
        eventBus.emit('data:cleared');
    };

    /**
     * 加载示例数据
     */
    module.loadSampleData = async function() {
        // 模拟加载示例数据
        const sampleData = {
            nodes: [
                {
                    group: 'nodes',
                    data: {
                        id: '1',
                        label: 'Person',
                        name: 'Alice',
                        age: 30,
                        type: 'person'
                    }
                },
                {
                    group: 'nodes',
                    data: {
                        id: '2',
                        label: 'Person',
                        name: 'Bob',
                        age: 25,
                        type: 'person'
                    }
                },
                {
                    group: 'nodes',
                    data: {
                        id: '3',
                        label: 'Company',
                        name: 'Acme Corp',
                        founded: 2000,
                        type: 'organization'
                    }
                },
                {
                    group: 'nodes',
                    data: {
                        id: '4',
                        label: 'Project',
                        name: 'Neo4j Editor',
                        started: '2023-01-01',
                        type: 'project'
                    }
                }
            ],
            edges: [
                {
                    group: 'edges',
                    data: {
                        id: 'e1',
                        source: '1',
                        target: '2',
                        label: 'KNOWS',
                        since: '2018-05-01',
                        type: 'knows'
                    }
                },
                {
                    group: 'edges',
                    data: {
                        id: 'e2',
                        source: '1',
                        target: '3',
                        label: 'WORKS_FOR',
                        since: '2020-01-15',
                        position: 'Developer',
                        type: 'works_for'
                    }
                },
                {
                    group: 'edges',
                    data: {
                        id: 'e3',
                        source: '2',
                        target: '3',
                        label: 'WORKS_FOR',
                        since: '2021-03-10',
                        position: 'Designer',
                        type: 'works_for'
                    }
                },
                {
                    group: 'edges',
                    data: {
                        id: 'e4',
                        source: '3',
                        target: '4',
                        label: 'OWNS',
                        since: '2023-01-01',
                        type: 'owns'
                    }
                }
            ]
        };

        // 将数据发送到图表管理器
        eventBus.emit('data:graph:loaded', sampleData);
        
        return true;
    };

    /**
     * 创建节点
     */
    module.createNode = async function(nodeData) {
        if (!this.isConnected) {
            eventBus.emit('data:error', 'Not connected to database');
            return null;
        }

        this.startOperation();
        
        try {
            // 生成唯一ID
            const nodeId = this.generateUniqueId();
            const newNode = {
                group: 'nodes',
                data: {
                    id: nodeId,
                    label: nodeData.label || 'Node',
                    type: nodeData.type || 'default',
                    ...nodeData.properties
                }
            };

            // 在实际应用中，这里应该执行Cypher查询创建节点
            console.log('Creating node:', newNode);
            
            // 模拟数据库操作延迟
            await new Promise(resolve => setTimeout(resolve, 300));
            
            // 通知其他模块
            eventBus.emit('data:nodes:add', newNode);
            eventBus.emit('data:node:created', newNode);
            
            return nodeId;
        } catch (error) {
            console.error('Failed to create node:', error);
            eventBus.emit('data:error', error.message || 'Failed to create node');
            return null;
        } finally {
            this.endOperation();
        }
    };

    /**
     * 更新节点
     */
    module.updateNode = async function(nodeId, updates) {
        if (!this.isConnected) {
            eventBus.emit('data:error', 'Not connected to database');
            return false;
        }

        this.startOperation();
        
        try {
            // 在实际应用中，这里应该执行Cypher查询更新节点
            console.log('Updating node:', nodeId, updates);
            
            // 模拟数据库操作延迟
            await new Promise(resolve => setTimeout(resolve, 200));
            
            // 通知其他模块
            eventBus.emit('data:node:updated', { id: nodeId, updates });
            
            return true;
        } catch (error) {
            console.error('Failed to update node:', error);
            eventBus.emit('data:error', error.message || 'Failed to update node');
            return false;
        } finally {
            this.endOperation();
        }
    };

    /**
     * 删除节点
     */
    module.deleteNode = async function(nodeId) {
        if (!this.isConnected) {
            eventBus.emit('data:error', 'Not connected to database');
            return false;
        }

        this.startOperation();
        
        try {
            // 在实际应用中，这里应该执行Cypher查询删除节点
            console.log('Deleting node:', nodeId);
            
            // 模拟数据库操作延迟
            await new Promise(resolve => setTimeout(resolve, 200));
            
            // 通知其他模块
            eventBus.emit('data:node:deleted', nodeId);
            eventBus.emit('data:nodes:remove', nodeId);
            
            return true;
        } catch (error) {
            console.error('Failed to delete node:', error);
            eventBus.emit('data:error', error.message || 'Failed to delete node');
            return false;
        } finally {
            this.endOperation();
        }
    };

    /**
     * 创建关系
     */
    module.createRelationship = async function(relData) {
        if (!this.isConnected) {
            eventBus.emit('data:error', 'Not connected to database');
            return null;
        }

        if (!relData.source || !relData.target) {
            eventBus.emit('data:error', 'Source and target nodes required');
            return null;
        }

        this.startOperation();
        
        try {
            // 生成唯一ID
            const relId = this.generateUniqueId();
            const newRelationship = {
                group: 'edges',
                data: {
                    id: relId,
                    source: relData.source,
                    target: relData.target,
                    label: relData.label || 'RELATED_TO',
                    type: relData.type || 'default',
                    ...relData.properties
                }
            };

            // 在实际应用中，这里应该执行Cypher查询创建关系
            console.log('Creating relationship:', newRelationship);
            
            // 模拟数据库操作延迟
            await new Promise(resolve => setTimeout(resolve, 300));
            
            // 通知其他模块
            eventBus.emit('data:edges:add', newRelationship);
            eventBus.emit('data:relationship:created', newRelationship);
            
            return relId;
        } catch (error) {
            console.error('Failed to create relationship:', error);
            eventBus.emit('data:error', error.message || 'Failed to create relationship');
            return null;
        } finally {
            this.endOperation();
        }
    };

    /**
     * 更新关系
     */
    module.updateRelationship = async function(relId, updates) {
        if (!this.isConnected) {
            eventBus.emit('data:error', 'Not connected to database');
            return false;
        }

        this.startOperation();
        
        try {
            // 在实际应用中，这里应该执行Cypher查询更新关系
            console.log('Updating relationship:', relId, updates);
            
            // 模拟数据库操作延迟
            await new Promise(resolve => setTimeout(resolve, 200));
            
            // 通知其他模块
            eventBus.emit('data:relationship:updated', { id: relId, updates });
            
            return true;
        } catch (error) {
            console.error('Failed to update relationship:', error);
            eventBus.emit('data:error', error.message || 'Failed to update relationship');
            return false;
        } finally {
            this.endOperation();
        }
    };

    /**
     * 删除关系
     */
    module.deleteRelationship = async function(relId) {
        if (!this.isConnected) {
            eventBus.emit('data:error', 'Not connected to database');
            return false;
        }

        this.startOperation();
        
        try {
            // 在实际应用中，这里应该执行Cypher查询删除关系
            console.log('Deleting relationship:', relId);
            
            // 模拟数据库操作延迟
            await new Promise(resolve => setTimeout(resolve, 200));
            
            // 通知其他模块
            eventBus.emit('data:relationship:deleted', relId);
            eventBus.emit('data:edges:remove', relId);
            
            return true;
        } catch (error) {
            console.error('Failed to delete relationship:', error);
            eventBus.emit('data:error', error.message || 'Failed to delete relationship');
            return false;
        } finally {
            this.endOperation();
        }
    };

    /**
     * 执行Cypher查询
     */
    module.executeQuery = async function(query) {
        if (!this.isConnected) {
            eventBus.emit('data:error', 'Not connected to database');
            return null;
        }

        if (!query || typeof query !== 'string') {
            eventBus.emit('data:error', 'Invalid query');
            return null;
        }

        this.startOperation();
        
        try {
            console.log('Executing query:', query);
            
            // 模拟查询执行延迟
            await new Promise(resolve => setTimeout(resolve, 500));
            
            // 模拟查询结果
            const result = {
                success: true,
                records: [],
                summary: {
                    query: query,
                    executionTime: '500ms'
                }
            };
            
            // 通知其他模块
            eventBus.emit('query:result', result);
            
            return result;
        } catch (error) {
            console.error('Query execution error:', error);
            const errorResult = {
                success: false,
                error: error.message || 'Query execution failed'
            };
            eventBus.emit('query:result', errorResult);
            eventBus.emit('data:error', errorResult.error);
            return errorResult;
        } finally {
            this.endOperation();
        }
    };

    /**
     * 导入数据
     */
    module.importData = async function(data) {
        this.startOperation();
        
        try {
            console.log('Importing data...');
            
            // 模拟导入延迟
            await new Promise(resolve => setTimeout(resolve, 1000));
            
            // 通知其他模块
            eventBus.emit('data:imported', data);
            
            return true;
        } catch (error) {
            console.error('Failed to import data:', error);
            eventBus.emit('data:error', error.message || 'Failed to import data');
            return false;
        } finally {
            this.endOperation();
        }
    };

    /**
     * 导出数据
     */
    module.exportData = async function() {
        this.startOperation();
        
        try {
            console.log('Exporting data...');
            
            // 触发数据导出请求
            eventBus.emit('data:export:request');
            
            // 模拟导出延迟
            await new Promise(resolve => setTimeout(resolve, 500));
            
            return true;
        } catch (error) {
            console.error('Failed to export data:', error);
            eventBus.emit('data:error', error.message || 'Failed to export data');
            return false;
        } finally {
            this.endOperation();
        }
    };

    /**
     * 加载类型定义
     */
    module.loadTypeDefinitions = function() {
        try {
            const savedNodeTypes = localStorage.getItem('neo4jNodeTypes');
            const savedRelTypes = localStorage.getItem('neo4jRelationshipTypes');
            
            if (savedNodeTypes) {
                const types = JSON.parse(savedNodeTypes);
                types.forEach(type => this.nodeTypes.set(type.name, type));
            }
            
            if (savedRelTypes) {
                const types = JSON.parse(savedRelTypes);
                types.forEach(type => this.relationshipTypes.set(type.name, type));
            }
            
            eventBus.emit('data:types:loaded', {
                nodeTypes: Array.from(this.nodeTypes.values()),
                relationshipTypes: Array.from(this.relationshipTypes.values())
            });
        } catch (error) {
            console.error('Failed to load type definitions:', error);
        }
    };

    /**
     * 保存类型定义
     */
    module.saveTypeDefinitions = function() {
        try {
            localStorage.setItem('neo4jNodeTypes', JSON.stringify(Array.from(this.nodeTypes.values())));
            localStorage.setItem('neo4jRelationshipTypes', JSON.stringify(Array.from(this.relationshipTypes.values())));
            return true;
        } catch (error) {
            console.error('Failed to save type definitions:', error);
            return false;
        }
    };

    /**
     * 刷新类型定义
     */
    module.refreshTypeDefinitions = async function() {
        // 模拟从数据库加载类型定义
        const defaultNodeTypes = [
            { name: 'Person', color: '#ff9500', icon: 'user' },
            { name: 'Organization', color: '#5856d6', icon: 'building' },
            { name: 'Location', color: '#4cd964', icon: 'map-marker' },
            { name: 'Event', color: '#ff2d55', icon: 'calendar' },
            { name: 'Document', color: '#007aff', icon: 'file' },
            { name: 'Concept', color: '#5856d6', icon: 'lightbulb-o' }
        ];

        const defaultRelTypes = [
            { name: 'KNOWS', color: '#32ade6', directed: true },
            { name: 'WORKS_FOR', color: '#4cd964', directed: true },
            { name: 'OWNS', color: '#ff2d55', directed: true },
            { name: 'LOCATED_IN', color: '#007aff', directed: true },
            { name: 'PART_OF', color: '#5856d6', directed: true }
        ];

        // 更新类型映射
        this.nodeTypes.clear();
        defaultNodeTypes.forEach(type => this.nodeTypes.set(type.name, type));
        
        this.relationshipTypes.clear();
        defaultRelTypes.forEach(type => this.relationshipTypes.set(type.name, type));

        // 保存并通知
        this.saveTypeDefinitions();
        eventBus.emit('data:types:updated', {
            nodeTypes: Array.from(this.nodeTypes.values()),
            relationshipTypes: Array.from(this.relationshipTypes.values())
        });
    };

    /**
     * 添加节点类型
     */
    module.addNodeType = function(type) {
        this.nodeTypes.set(type.name, type);
        this.saveTypeDefinitions();
        eventBus.emit('data:node:type:added', type);
        return true;
    };

    /**
     * 更新节点类型
     */
    module.updateNodeType = function(typeName, updates) {
        if (this.nodeTypes.has(typeName)) {
            const updatedType = { ...this.nodeTypes.get(typeName), ...updates };
            this.nodeTypes.set(typeName, updatedType);
            this.saveTypeDefinitions();
            eventBus.emit('data:node:type:updated', updatedType);
            return true;
        }
        return false;
    };

    /**
     * 删除节点类型
     */
    module.deleteNodeType = function(typeName) {
        if (this.nodeTypes.delete(typeName)) {
            this.saveTypeDefinitions();
            eventBus.emit('data:node:type:deleted', typeName);
            return true;
        }
        return false;
    };

    /**
     * 生成唯一ID
     */
    module.generateUniqueId = function() {
        return 'id_' + Date.now() + '_' + (++this.lastOperationId);
    };

    /**
     * 开始操作
     */
    module.startOperation = function() {
        this.pendingOperations++;
        eventBus.emit('data:operation:started');
    };

    /**
     * 结束操作
     */
    module.endOperation = function() {
        this.pendingOperations--;
        if (this.pendingOperations <= 0) {
            this.pendingOperations = 0;
            eventBus.emit('data:operation:completed');
        }
    };

    /**
     * 获取连接状态
     */
    module.getConnectionStatus = function() {
        return {
            isConnected: this.isConnected,
            config: this.connectionConfig
        };
    };

    /**
     * 获取节点类型
     */
    module.getNodeTypes = function() {
        return Array.from(this.nodeTypes.values());
    };

    /**
     * 获取关系类型
     */
    module.getRelationshipTypes = function() {
        return Array.from(this.relationshipTypes.values());
    };

    return module;
});