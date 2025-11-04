/**
 * 数据模型管理模块
 * 负责处理Neo4j图数据的模型定义和数据操作
 */

// 导入依赖
const utils = require('../utils/utils');

const dataModelModule = {
    /**
     * 节点类型定义
     */
    nodeTypes: [
        { value: 'default', label: '默认节点' },
        { value: 'person', label: '人物' },
        { value: 'organization', label: '组织' },
        { value: 'location', label: '位置' },
        { value: 'event', label: '事件' },
        { value: 'document', label: '文档' }
    ],
    
    /**
     * 关系类型定义
     */
    relationshipTypes: [
        { value: 'relation', label: '相关' },
        { value: 'knows', label: '认识' },
        { value: 'works_for', label: '工作于' },
        { value: 'located_at', label: '位于' },
        { value: 'participates_in', label: '参与' },
        { value: 'created', label: '创建' },
        { value: 'contains', label: '包含' }
    ],
    
    /**
     * 创建新节点
     * @param {Object} properties - 节点属性
     * @returns {Object} 节点数据对象
     */
    createNode: function(properties) {
        try {
            // 确保属性对象存在
            properties = properties || {};
            
            // 生成唯一ID（如果没有提供）
            const id = properties.id || utils.generateUniqueId('node');
            
            // 创建标准节点数据结构
            const node = {
                group: 'nodes',
                data: {
                    id: id,
                    label: properties.label || 'Node',
                    type: properties.type || 'default',
                    // 添加其他属性
                    ...properties
                },
                classes: properties.type || 'default'
            };
            
            // 如果提供了位置信息，添加到position
            if (properties.position) {
                node.position = {
                    x: properties.position.x || Math.random() * 100,
                    y: properties.position.y || Math.random() * 100
                };
            }
            
            utils.debugLog('创建新节点:', node.data.id);
            return node;
            
        } catch (error) {
            utils.handleError(error, '创建节点失败');
            return null;
        }
    },
    
    /**
     * 创建新关系（边）
     * @param {string} sourceId - 源节点ID
     * @param {string} targetId - 目标节点ID
     * @param {Object} properties - 关系属性
     * @returns {Object} 边数据对象
     */
    createEdge: function(sourceId, targetId, properties) {
        try {
            // 验证必要参数
            if (!sourceId || !targetId) {
                throw new Error('创建边时必须提供源节点ID和目标节点ID');
            }
            
            // 确保属性对象存在
            properties = properties || {};
            
            // 生成唯一ID（如果没有提供）
            const id = properties.id || utils.generateUniqueId('edge');
            
            // 创建标准边数据结构
            const edge = {
                group: 'edges',
                data: {
                    id: id,
                    source: sourceId,
                    target: targetId,
                    label: properties.label || 'relation',
                    // 添加其他属性
                    ...properties
                },
                classes: properties.label || 'relation'
            };
            
            utils.debugLog('创建新关系:', edge.data.id, `(${sourceId} -> ${targetId})`);
            return edge;
            
        } catch (error) {
            utils.handleError(error, '创建关系失败');
            return null;
        }
    },
    
    /**
     * 验证节点数据
     * @param {Object} node - 节点数据
     * @returns {Object} 验证结果 { valid: boolean, errors: Array }
     */
    validateNode: function(node) {
        const errors = [];
        
        // 基本验证
        if (!node || typeof node !== 'object') {
            errors.push('节点数据必须是一个对象');
            return { valid: false, errors };
        }
        
        if (!node.group || node.group !== 'nodes') {
            errors.push('节点必须具有group属性且值为"nodes"');
        }
        
        if (!node.data || typeof node.data !== 'object') {
            errors.push('节点必须包含data属性');
            return { valid: false, errors };
        }
        
        // 数据属性验证
        if (!node.data.id) {
            errors.push('节点必须具有ID');
        }
        
        if (!node.data.label) {
            errors.push('节点必须具有标签');
        }
        
        // 类型验证
        const type = node.data.type || 'default';
        const validType = this.nodeTypes.some(t => t.value === type);
        if (!validType) {
            errors.push(`无效的节点类型: ${type}`);
        }
        
        return {
            valid: errors.length === 0,
            errors
        };
    },
    
    /**
     * 验证边数据
     * @param {Object} edge - 边数据
     * @returns {Object} 验证结果 { valid: boolean, errors: Array }
     */
    validateEdge: function(edge) {
        const errors = [];
        
        // 基本验证
        if (!edge || typeof edge !== 'object') {
            errors.push('边数据必须是一个对象');
            return { valid: false, errors };
        }
        
        if (!edge.group || edge.group !== 'edges') {
            errors.push('边必须具有group属性且值为"edges"');
        }
        
        if (!edge.data || typeof edge.data !== 'object') {
            errors.push('边必须包含data属性');
            return { valid: false, errors };
        }
        
        // 数据属性验证
        if (!edge.data.id) {
            errors.push('边必须具有ID');
        }
        
        if (!edge.data.source) {
            errors.push('边必须具有源节点');
        }
        
        if (!edge.data.target) {
            errors.push('边必须具有目标节点');
        }
        
        if (edge.data.source === edge.data.target) {
            errors.push('边的源节点和目标节点不能相同');
        }
        
        // 关系类型验证
        const label = edge.data.label || 'relation';
        const validLabel = this.relationshipTypes.some(r => r.value === label);
        if (!validLabel) {
            errors.push(`无效的关系类型: ${label}`);
        }
        
        return {
            valid: errors.length === 0,
            errors
        };
    },
    
    /**
     * 序列化图数据用于保存
     * @param {Object} graphData - 图数据对象
     * @returns {Object} 序列化后的数据
     */
    serializeGraphData: function(graphData) {
        try {
            if (!graphData) {
                return { nodes: [], edges: [] };
            }
            
            const serializedData = {
                version: '1.0',
                timestamp: new Date().toISOString(),
                nodes: [],
                edges: []
            };
            
            // 序列化节点
            if (graphData.nodes && Array.isArray(graphData.nodes)) {
                serializedData.nodes = graphData.nodes.map(node => {
                    // 深拷贝节点数据
                    const serializedNode = utils.deepClone(node);
                    // 移除可能导致问题的字段
                    delete serializedNode.position;
                    return serializedNode;
                });
            }
            
            // 序列化边
            if (graphData.edges && Array.isArray(graphData.edges)) {
                serializedData.edges = graphData.edges.map(edge => {
                    return utils.deepClone(edge);
                });
            }
            
            return serializedData;
            
        } catch (error) {
            utils.handleError(error, '序列化图数据失败');
            return { nodes: [], edges: [] };
        }
    },
    
    /**
     * 反序列化图数据用于加载
     * @param {Object} serializedData - 序列化的数据
     * @returns {Object} 反序列化后的图数据
     */
    deserializeGraphData: function(serializedData) {
        try {
            if (!serializedData) {
                return { nodes: [], edges: [] };
            }
            
            const graphData = {
                nodes: [],
                edges: []
            };
            
            // 反序列化节点
            if (serializedData.nodes && Array.isArray(serializedData.nodes)) {
                graphData.nodes = serializedData.nodes.map(node => {
                    // 验证并修复节点数据
                    const validation = this.validateNode(node);
                    if (!validation.valid) {
                        utils.debugLog('节点验证失败:', validation.errors);
                        // 尝试修复基本问题
                        if (!node.group) node.group = 'nodes';
                        if (!node.data) node.data = {};
                        if (!node.data.id) node.data.id = utils.generateUniqueId('node');
                        if (!node.data.label) node.data.label = 'Node';
                    }
                    return node;
                });
            }
            
            // 反序列化边
            if (serializedData.edges && Array.isArray(serializedData.edges)) {
                graphData.edges = serializedData.edges.map(edge => {
                    // 验证并修复边数据
                    const validation = this.validateEdge(edge);
                    if (!validation.valid) {
                        utils.debugLog('边验证失败:', validation.errors);
                        // 尝试修复基本问题
                        if (!edge.group) edge.group = 'edges';
                        if (!edge.data) edge.data = {};
                        if (!edge.data.id) edge.data.id = utils.generateUniqueId('edge');
                        if (!edge.data.label) edge.data.label = 'relation';
                    }
                    return edge;
                });
            }
            
            return graphData;
            
        } catch (error) {
            utils.handleError(error, '反序列化图数据失败');
            return { nodes: [], edges: [] };
        }
    },
    
    /**
     * 添加自定义节点类型
     * @param {string} value - 类型值
     * @param {string} label - 显示标签
     * @returns {boolean} 添加是否成功
     */
    addNodeType: function(value, label) {
        try {
            if (!value || !label) {
                throw new Error('添加节点类型时必须提供值和标签');
            }
            
            // 检查是否已存在
            const exists = this.nodeTypes.some(type => type.value === value);
            if (exists) {
                utils.debugLog(`节点类型 ${value} 已存在`);
                return false;
            }
            
            // 添加新类型
            this.nodeTypes.push({ value, label });
            utils.debugLog(`添加新节点类型: ${value} (${label})`);
            
            // 保存到localStorage以便下次使用
            this._saveCustomTypes();
            
            return true;
            
        } catch (error) {
            utils.handleError(error, '添加自定义节点类型失败');
            return false;
        }
    },
    
    /**
     * 添加自定义关系类型
     * @param {string} value - 类型值
     * @param {string} label - 显示标签
     * @returns {boolean} 添加是否成功
     */
    addRelationshipType: function(value, label) {
        try {
            if (!value || !label) {
                throw new Error('添加关系类型时必须提供值和标签');
            }
            
            // 检查是否已存在
            const exists = this.relationshipTypes.some(type => type.value === value);
            if (exists) {
                utils.debugLog(`关系类型 ${value} 已存在`);
                return false;
            }
            
            // 添加新类型
            this.relationshipTypes.push({ value, label });
            utils.debugLog(`添加新关系类型: ${value} (${label})`);
            
            // 保存到localStorage以便下次使用
            this._saveCustomTypes();
            
            return true;
            
        } catch (error) {
            utils.handleError(error, '添加自定义关系类型失败');
            return false;
        }
    },
    
    /**
     * 保存自定义类型到localStorage
     * @private
     */
    _saveCustomTypes: function() {
        try {
            const customTypes = {
                nodeTypes: this.nodeTypes,
                relationshipTypes: this.relationshipTypes
            };
            localStorage.setItem('neo4jEditorCustomTypes', JSON.stringify(customTypes));
        } catch (error) {
            utils.handleError(error, '保存自定义类型失败');
        }
    },
    
    /**
     * 从localStorage加载自定义类型
     */
    loadCustomTypes: function() {
        try {
            const savedTypes = localStorage.getItem('neo4jEditorCustomTypes');
            if (savedTypes) {
                const customTypes = JSON.parse(savedTypes);
                
                if (customTypes.nodeTypes && Array.isArray(customTypes.nodeTypes)) {
                    this.nodeTypes = customTypes.nodeTypes;
                }
                
                if (customTypes.relationshipTypes && Array.isArray(customTypes.relationshipTypes)) {
                    this.relationshipTypes = customTypes.relationshipTypes;
                }
                
                utils.debugLog('已加载自定义类型定义');
            }
        } catch (error) {
            utils.handleError(error, '加载自定义类型失败');
            // 保留默认类型
        }
    }
};

// 加载自定义类型
dataModelModule.loadCustomTypes();

// 为了向后兼容，暴露关键功能到window对象
window.createNode = window.createNode || function(properties) {
    return dataModelModule.createNode(properties);
};

window.createEdge = window.createEdge || function(sourceId, targetId, properties) {
    return dataModelModule.createEdge(sourceId, targetId, properties);
};

window.validateNode = window.validateNode || function(node) {
    return dataModelModule.validateNode(node);
};

window.validateEdge = window.validateEdge || function(edge) {
    return dataModelModule.validateEdge(edge);
};

// 暴露自定义类型管理函数
window.addNodeType = window.addNodeType || function(value, label) {
    return dataModelModule.addNodeType(value, label);
};

window.addRelationshipType = window.addRelationshipType || function(value, label) {
    return dataModelModule.addRelationshipType(value, label);
};

module.exports = dataModelModule;
