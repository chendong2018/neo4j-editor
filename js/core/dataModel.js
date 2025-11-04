/**
 * Neo4j Editor - 数据模型管理模块
 * 负责图形数据的结构定义、数据验证和核心操作
 */
(function(neo4jEditor) {
    'use strict';

    // 确保命名空间存在
    if (typeof neo4jEditor === 'undefined') {
        window.neo4jEditor = {};
    }

    // 初始化状态
    let initialized = false;
    
    // 默认数据结构
    const defaultNodeStructure = {
        data: {
            id: '',
            label: 'Node',
            properties: {}
        }
    };
    
    const defaultEdgeStructure = {
        data: {
            id: '',
            source: '',
            target: '',
            label: 'RELATED_TO',
            properties: {}
        }
    };

    /**
     * 数据验证函数
     */
    const DataValidator = {
        /**
         * 验证节点对象
         * @param {Object} node - 节点对象
         * @returns {Object} 验证结果 {valid: boolean, errors: string[]}
         */
        validateNode: function(node) {
            const errors = [];
            
            // 基本结构检查
            if (!node || typeof node !== 'object') {
                errors.push('节点必须是有效的对象');
                return { valid: false, errors };
            }
            
            if (!node.data || typeof node.data !== 'object') {
                errors.push('节点必须包含data属性');
                return { valid: false, errors };
            }
            
            // 必需字段检查
            if (!node.data.id) {
                errors.push('节点必须包含id属性');
            }
            
            if (!node.data.label) {
                errors.push('节点必须包含label属性');
            }
            
            // 属性类型检查
            if (node.data.properties && typeof node.data.properties !== 'object') {
                errors.push('节点properties必须是对象类型');
            }
            
            return {
                valid: errors.length === 0,
                errors: errors
            };
        },
        
        /**
         * 验证关系对象
         * @param {Object} edge - 关系对象
         * @returns {Object} 验证结果 {valid: boolean, errors: string[]}
         */
        validateEdge: function(edge) {
            const errors = [];
            
            // 基本结构检查
            if (!edge || typeof edge !== 'object') {
                errors.push('关系必须是有效的对象');
                return { valid: false, errors };
            }
            
            if (!edge.data || typeof edge.data !== 'object') {
                errors.push('关系必须包含data属性');
                return { valid: false, errors };
            }
            
            // 必需字段检查
            if (!edge.data.id) {
                errors.push('关系必须包含id属性');
            }
            
            if (!edge.data.source) {
                errors.push('关系必须包含source属性');
            }
            
            if (!edge.data.target) {
                errors.push('关系必须包含target属性');
            }
            
            if (!edge.data.label) {
                errors.push('关系必须包含label属性');
            }
            
            // 属性类型检查
            if (edge.data.properties && typeof edge.data.properties !== 'object') {
                errors.push('关系properties必须是对象类型');
            }
            
            return {
                valid: errors.length === 0,
                errors: errors
            };
        },
        
        /**
         * 验证完整的图形数据
         * @param {Object} graphData - 图形数据对象
         * @returns {Object} 验证结果 {valid: boolean, errors: string[]}
         */
        validateGraphData: function(graphData) {
            const errors = [];
            
            // 基本结构检查
            if (!graphData || typeof graphData !== 'object') {
                errors.push('图形数据必须是有效的对象');
                return { valid: false, errors };
            }
            
            // 必需字段检查
            if (!Array.isArray(graphData.nodes)) {
                errors.push('图形数据必须包含nodes数组');
            }
            
            if (!Array.isArray(graphData.edges)) {
                errors.push('图形数据必须包含edges数组');
            }
            
            // 验证每个节点
            if (Array.isArray(graphData.nodes)) {
                graphData.nodes.forEach((node, index) => {
                    const nodeValidation = this.validateNode(node);
                    if (!nodeValidation.valid) {
                        errors.push(`节点[${index}]验证失败: ${nodeValidation.errors.join(', ')}`);
                    }
                });
            }
            
            // 验证每个关系
            if (Array.isArray(graphData.edges)) {
                graphData.edges.forEach((edge, index) => {
                    const edgeValidation = this.validateEdge(edge);
                    if (!edgeValidation.valid) {
                        errors.push(`关系[${index}]验证失败: ${edgeValidation.errors.join(', ')}`);
                    }
                });
            }
            
            return {
                valid: errors.length === 0,
                errors: errors
            };
        }
    };

    /**
     * 数据操作函数
     */
    const DataOperations = {
        /**
         * 创建新节点
         * @param {Object} nodeData - 节点数据
         * @returns {Object} 新创建的节点对象
         */
        createNode: function(nodeData = {}) {
            try {
                const nodeId = neo4jEditor.utils && neo4jEditor.utils.generateId ? 
                    neo4jEditor.utils.generateId() : 
                    `node_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
                
                const newNode = JSON.parse(JSON.stringify(defaultNodeStructure));
                
                // 合并节点数据
                newNode.data.id = nodeId;
                newNode.data.label = nodeData.label || 'Node';
                newNode.data.properties = nodeData.properties || {};
                
                // 添加位置信息（如果提供）
                if (nodeData.position) {
                    newNode.position = { ...nodeData.position };
                }
                
                return newNode;
            } catch (error) {
                console.error('Error creating new node:', error);
                throw error;
            }
        },
        
        /**
         * 创建新关系
         * @param {string} sourceId - 源节点ID
         * @param {string} targetId - 目标节点ID
         * @param {Object} edgeData - 关系数据
         * @returns {Object} 新创建的关系对象
         */
        createEdge: function(sourceId, targetId, edgeData = {}) {
            try {
                if (!sourceId || !targetId) {
                    throw new Error('源节点ID和目标节点ID是必需的');
                }
                
                const edgeId = neo4jEditor.utils && neo4jEditor.utils.generateId ? 
                    neo4jEditor.utils.generateId() : 
                    `edge_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
                
                const newEdge = JSON.parse(JSON.stringify(defaultEdgeStructure));
                
                // 设置关系数据
                newEdge.data.id = edgeId;
                newEdge.data.source = sourceId;
                newEdge.data.target = targetId;
                newEdge.data.label = edgeData.label || 'RELATED_TO';
                newEdge.data.properties = edgeData.properties || {};
                
                return newEdge;
            } catch (error) {
                console.error('Error creating new edge:', error);
                throw error;
            }
        },
        
        /**
         * 更新节点
         * @param {string} nodeId - 节点ID
         * @param {Object} updates - 更新数据
         * @returns {Object|null} 更新后的节点对象或null
         */
        updateNode: function(nodeId, updates = {}) {
            try {
                const graphData = neo4jEditor.sharedGraphData;
                if (!graphData || !Array.isArray(graphData.nodes)) {
                    return null;
                }
                
                const nodeIndex = graphData.nodes.findIndex(node => node.data.id === nodeId);
                if (nodeIndex === -1) {
                    return null;
                }
                
                const node = graphData.nodes[nodeIndex];
                
                // 更新节点数据
                if (updates.label) {
                    node.data.label = updates.label;
                }
                
                if (updates.properties) {
                    node.data.properties = { ...node.data.properties, ...updates.properties };
                }
                
                if (updates.position) {
                    node.position = { ...node.position, ...updates.position };
                }
                
                return node;
            } catch (error) {
                console.error('Error updating node:', error);
                return null;
            }
        },
        
        /**
         * 更新关系
         * @param {string} edgeId - 关系ID
         * @param {Object} updates - 更新数据
         * @returns {Object|null} 更新后的关系对象或null
         */
        updateEdge: function(edgeId, updates = {}) {
            try {
                const graphData = neo4jEditor.sharedGraphData;
                if (!graphData || !Array.isArray(graphData.edges)) {
                    return null;
                }
                
                const edgeIndex = graphData.edges.findIndex(edge => edge.data.id === edgeId);
                if (edgeIndex === -1) {
                    return null;
                }
                
                const edge = graphData.edges[edgeIndex];
                
                // 更新关系数据
                if (updates.label) {
                    edge.data.label = updates.label;
                }
                
                if (updates.properties) {
                    edge.data.properties = { ...edge.data.properties, ...updates.properties };
                }
                
                return edge;
            } catch (error) {
                console.error('Error updating edge:', error);
                return null;
            }
        },
        
        /**
         * 删除节点及其相关关系
         * @param {string} nodeId - 节点ID
         * @returns {boolean} 删除是否成功
         */
        deleteNode: function(nodeId) {
            try {
                const graphData = neo4jEditor.sharedGraphData;
                if (!graphData) {
                    return false;
                }
                
                // 删除节点
                const nodeIndex = graphData.nodes.findIndex(node => node.data.id === nodeId);
                if (nodeIndex === -1) {
                    return false;
                }
                
                graphData.nodes.splice(nodeIndex, 1);
                
                // 删除相关关系
                if (Array.isArray(graphData.edges)) {
                    graphData.edges = graphData.edges.filter(edge => 
                        edge.data.source !== nodeId && edge.data.target !== nodeId
                    );
                }
                
                return true;
            } catch (error) {
                console.error('Error deleting node:', error);
                return false;
            }
        },
        
        /**
         * 删除关系
         * @param {string} edgeId - 关系ID
         * @returns {boolean} 删除是否成功
         */
        deleteEdge: function(edgeId) {
            try {
                const graphData = neo4jEditor.sharedGraphData;
                if (!graphData || !Array.isArray(graphData.edges)) {
                    return false;
                }
                
                const edgeIndex = graphData.edges.findIndex(edge => edge.data.id === edgeId);
                if (edgeIndex === -1) {
                    return false;
                }
                
                // 保存删除的关系到deletedEdges（用于撤销）
                const deletedEdge = graphData.edges[edgeIndex];
                if (!graphData.deletedEdges) {
                    graphData.deletedEdges = [];
                }
                graphData.deletedEdges.push(deletedEdge);
                
                // 删除关系
                graphData.edges.splice(edgeIndex, 1);
                
                return true;
            } catch (error) {
                console.error('Error deleting edge:', error);
                return false;
            }
        },
        
        /**
         * 查找节点
         * @param {string} nodeId - 节点ID
         * @returns {Object|null} 找到的节点或null
         */
        findNode: function(nodeId) {
            try {
                const graphData = neo4jEditor.sharedGraphData;
                if (!graphData || !Array.isArray(graphData.nodes)) {
                    return null;
                }
                
                return graphData.nodes.find(node => node.data.id === nodeId) || null;
            } catch (error) {
                console.error('Error finding node:', error);
                return null;
            }
        },
        
        /**
         * 查找关系
         * @param {string} edgeId - 关系ID
         * @returns {Object|null} 找到的关系或null
         */
        findEdge: function(edgeId) {
            try {
                const graphData = neo4jEditor.sharedGraphData;
                if (!graphData || !Array.isArray(graphData.edges)) {
                    return null;
                }
                
                return graphData.edges.find(edge => edge.data.id === edgeId) || null;
            } catch (error) {
                console.error('Error finding edge:', error);
                return null;
            }
        },
        
        /**
         * 查找节点的所有关系
         * @param {string} nodeId - 节点ID
         * @returns {Array} 找到的关系数组
         */
        findNodeEdges: function(nodeId) {
            try {
                const graphData = neo4jEditor.sharedGraphData;
                if (!graphData || !Array.isArray(graphData.edges)) {
                    return [];
                }
                
                return graphData.edges.filter(edge => 
                    edge.data.source === nodeId || edge.data.target === nodeId
                );
            } catch (error) {
                console.error('Error finding node edges:', error);
                return [];
            }
        },
        
        /**
         * 导出图形数据为标准格式
         * @returns {Object} 导出的图形数据
         */
        exportGraphData: function() {
            try {
                const graphData = neo4jEditor.sharedGraphData;
                if (!graphData) {
                    return { nodes: [], edges: [] };
                }
                
                // 深度克隆以避免引用问题
                return {
                    nodes: JSON.parse(JSON.stringify(graphData.nodes || [])),
                    edges: JSON.parse(JSON.stringify(graphData.edges || []))
                };
            } catch (error) {
                console.error('Error exporting graph data:', error);
                return { nodes: [], edges: [] };
            }
        },
        
        /**
         * 导入图形数据
         * @param {Object} graphData - 要导入的图形数据
         * @returns {boolean} 导入是否成功
         */
        importGraphData: function(graphData) {
            try {
                // 验证导入数据
                const validation = DataValidator.validateGraphData(graphData);
                if (!validation.valid) {
                    console.error('Invalid graph data:', validation.errors);
                    return false;
                }
                
                // 清空现有数据
                neo4jEditor.sharedGraphData = {
                    nodes: [],
                    edges: [],
                    deletedEdges: []
                };
                
                // 导入新数据
                neo4jEditor.sharedGraphData.nodes = JSON.parse(JSON.stringify(graphData.nodes || []));
                neo4jEditor.sharedGraphData.edges = JSON.parse(JSON.stringify(graphData.edges || []));
                
                return true;
            } catch (error) {
                console.error('Error importing graph data:', error);
                return false;
            }
        },
        
        /**
         * 清空图形数据
         * @returns {boolean} 清空是否成功
         */
        clearGraphData: function() {
            try {
                neo4jEditor.sharedGraphData = {
                    nodes: [],
                    edges: [],
                    deletedEdges: []
                };
                return true;
            } catch (error) {
                console.error('Error clearing graph data:', error);
                return false;
            }
        },
        
        /**
         * 计算图形统计信息
         * @returns {Object} 图形统计信息
         */
        calculateGraphStats: function() {
            try {
                const graphData = neo4jEditor.sharedGraphData;
                if (!graphData) {
                    return { nodeCount: 0, edgeCount: 0 };
                }
                
                const nodeCount = Array.isArray(graphData.nodes) ? graphData.nodes.length : 0;
                const edgeCount = Array.isArray(graphData.edges) ? graphData.edges.length : 0;
                
                // 计算节点标签统计
                const nodeLabelStats = {};
                if (Array.isArray(graphData.nodes)) {
                    graphData.nodes.forEach(node => {
                        const label = node.data.label || 'Unlabeled';
                        nodeLabelStats[label] = (nodeLabelStats[label] || 0) + 1;
                    });
                }
                
                // 计算关系类型统计
                const edgeLabelStats = {};
                if (Array.isArray(graphData.edges)) {
                    graphData.edges.forEach(edge => {
                        const label = edge.data.label || 'Unlabeled';
                        edgeLabelStats[label] = (edgeLabelStats[label] || 0) + 1;
                    });
                }
                
                return {
                    nodeCount,
                    edgeCount,
                    nodeLabelStats,
                    edgeLabelStats
                };
            } catch (error) {
                console.error('Error calculating graph stats:', error);
                return { nodeCount: 0, edgeCount: 0 };
            }
        }
    };

    /**
     * 数据模型管理模块
     */
    const dataModelModule = {
        // 模块版本
        version: '1.0.0',
        
        // 初始化状态
        initialized: initialized,
        
        /**
         * 初始化模块
         * @param {Object} config - 配置对象
         * @returns {boolean} 初始化是否成功
         */
        initialize: function(config = {}) {
            try {
                console.log('Data Model Module: Initializing...');
                
                // 确保共享数据对象存在
                if (!neo4jEditor.sharedGraphData) {
                    neo4jEditor.sharedGraphData = {
                        nodes: [],
                        edges: [],
                        deletedEdges: []
                    };
                }
                
                // 初始化数据验证器
                this.validator = DataValidator;
                
                // 标记为已初始化
                initialized = true;
                this.initialized = true;
                
                console.log('Data Model Module: Initialized successfully');
                
                // 触发初始化完成事件
                if (neo4jEditor.eventManager && typeof neo4jEditor.eventManager.trigger === 'function') {
                    neo4jEditor.eventManager.trigger('dataModel:initialized');
                }
                
                return true;
            } catch (error) {
                console.error('Data Model Module: Initialization error:', error);
                return false;
            }
        },
        
        // 数据验证方法
        validate: DataValidator,
        
        // 数据操作方法
        operations: DataOperations,
        
        // 便捷方法（直接暴露常用操作）
        createNode: DataOperations.createNode,
        createEdge: DataOperations.createEdge,
        updateNode: DataOperations.updateNode,
        updateEdge: DataOperations.updateEdge,
        deleteNode: DataOperations.deleteNode,
        deleteEdge: DataOperations.deleteEdge,
        findNode: DataOperations.findNode,
        findEdge: DataOperations.findEdge,
        findNodeEdges: DataOperations.findNodeEdges,
        exportGraphData: DataOperations.exportGraphData,
        importGraphData: DataOperations.importGraphData,
        clearGraphData: DataOperations.clearGraphData,
        calculateGraphStats: DataOperations.calculateGraphStats,
        
        /**
         * 获取默认节点结构
         * @returns {Object} 默认节点结构
         */
        getDefaultNodeStructure: function() {
            return JSON.parse(JSON.stringify(defaultNodeStructure));
        },
        
        /**
         * 获取默认关系结构
         * @returns {Object} 默认关系结构
         */
        getDefaultEdgeStructure: function() {
            return JSON.parse(JSON.stringify(defaultEdgeStructure));
        }
    };
    
    // 导出模块到命名空间
    neo4jEditor.dataModel = dataModelModule;
    
    // 创建向后兼容函数
    /**
     * 创建向后兼容函数
     * @param {string} deprecatedName - 旧函数名称
     * @param {Function} newFunction - 新函数实现
     * @param {Object} context - 函数执行上下文
     */
    function createBackwardCompatibilityFunction(deprecatedName, newFunction, context) {
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
                console.warn(`警告: 直接调用 ${deprecatedName}() 已弃用，请使用 neo4jEditor.dataModel.${newFunction.name || 'method'}()`);
            }
            return newFunction.apply(context || null, arguments);
        };
    }
    
    // 注册向后兼容函数
    const backwardCompatibilityMapping = [
        { deprecatedName: 'createNewNode', newFunction: DataOperations.createNode, context: dataModelModule },
        { deprecatedName: 'createNewEdge', newFunction: DataOperations.createEdge, context: dataModelModule },
        { deprecatedName: 'updateGraphNode', newFunction: DataOperations.updateNode, context: dataModelModule },
        { deprecatedName: 'updateGraphEdge', newFunction: DataOperations.updateEdge, context: dataModelModule },
        { deprecatedName: 'removeGraphNode', newFunction: DataOperations.deleteNode, context: dataModelModule },
        { deprecatedName: 'removeGraphEdge', newFunction: DataOperations.deleteEdge, context: dataModelModule },
        { deprecatedName: 'findGraphNode', newFunction: DataOperations.findNode, context: dataModelModule },
        { deprecatedName: 'findGraphEdge', newFunction: DataOperations.findEdge, context: dataModelModule },
        { deprecatedName: 'getNodeEdges', newFunction: DataOperations.findNodeEdges, context: dataModelModule },
        { deprecatedName: 'exportData', newFunction: DataOperations.exportGraphData, context: dataModelModule },
        { deprecatedName: 'importData', newFunction: DataOperations.importGraphData, context: dataModelModule },
        { deprecatedName: 'clearData', newFunction: DataOperations.clearGraphData, context: dataModelModule },
        { deprecatedName: 'getGraphStats', newFunction: DataOperations.calculateGraphStats, context: dataModelModule },
        { deprecatedName: 'validateGraph', newFunction: DataValidator.validateGraphData, context: dataModelModule }
    ];
    
    // 注册全局向后兼容函数
    backwardCompatibilityMapping.forEach(funcInfo => {
        try {
            if (typeof window[funcInfo.deprecatedName] === 'undefined') {
                window[funcInfo.deprecatedName] = createBackwardCompatibilityFunction(
                    funcInfo.deprecatedName,
                    funcInfo.newFunction,
                    funcInfo.context
                );
            }
        } catch (error) {
            console.error(`注册向后兼容函数 ${funcInfo.deprecatedName} 失败:`, error);
        }
    });
    
    // 定义模块名称和注册信息
    const moduleName = 'core/dataModel';
    const moduleRegistrationInfo = {
        name: moduleName,
        version: '1.0.0',
        dependencies: ['utils/utils'],
        module: dataModelModule
    };
    
    // 使用统一的模块注册方法
    if (window.neo4jEditor && typeof window.neo4jEditor.registerModule === 'function') {
        try {
            window.neo4jEditor.registerModule(moduleRegistrationInfo);
            console.log(`Neo4j Editor: ${moduleName} module registered successfully`);
        } catch (registrationError) {
            console.error(`Neo4j Editor: Failed to register ${moduleName} module:`, registrationError);
            
            // 降级方案：直接注册到modules对象
            try {
                if (typeof window.neo4jEditor.modules[moduleName] === 'undefined') {
                    window.neo4jEditor.modules[moduleName] = {
                        name: moduleRegistrationInfo.name,
                        version: moduleRegistrationInfo.version,
                        initialized: dataModelModule.initialized,
                        dependencies: moduleRegistrationInfo.dependencies,
                        module: moduleRegistrationInfo.module
                    };
                    console.log(`Neo4j Editor: ${moduleName} module registered via fallback to modules object`);
                }
            } catch (fallbackError) {
                // 终极降级方案：直接挂载到全局
                if (typeof window.appModule === 'undefined') {
                    window.appModule = {};
                }
                window.appModule.dataModel = dataModelModule;
                console.log(`Neo4j Editor: ${moduleName} module registered via final fallback to appModule`);
            }
        }
    } else {
        // 降级方案：直接挂载到全局
        if (typeof window.appModule === 'undefined') {
            window.appModule = {};
        }
        window.appModule.dataModel = dataModelModule;
        console.log(`Neo4j Editor: ${moduleName} module registered via fallback to appModule`);
    }
    
    // 多模块系统支持 - 确保兼容性
    // CommonJS 模块支持
    if (typeof module !== 'undefined' && typeof module.exports !== 'undefined') {
        module.exports = dataModelModule;
    }
    
    // ES 模块支持
    if (typeof exports !== 'undefined' && typeof exports === 'object') {
        Object.defineProperty(exports, '__esModule', { value: true });
        if (typeof module !== 'undefined') module.exports = dataModelModule;
        exports.default = dataModelModule;
    }
    
    // AMD 模块支持
    if (typeof define === 'function' && define.amd) {
        define(['utils/utils'], function() {
            return dataModelModule;
        });
    }
    
    return dataModelModule;
})(window.neo4jEditor || (window.neo4jEditor = {}));