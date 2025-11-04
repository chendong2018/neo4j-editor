/**
 * Neo4j Editor - 图表数据管理模块
 * 负责管理和操作共享的图表数据
 */

// 安全创建命名空间
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
 * 图表数据管理模块
 */
const graphDataManagerModule = {
    // 初始化状态标记
    initialized: false,
    
    /**
     * 初始化数据管理器
     * @param {Object} options - 初始化选项
     * @returns {boolean} 初始化是否成功
     */
    initialize: function(options) {
        try {
            if (this.initialized) {
                console.warn('Neo4j Editor: Graph Data Manager is already initialized');
                return true;
            }
            
            this.ensureDataStructure();
            this.initialized = true;
            
            // 更新模块注册信息中的初始化状态
            if (window.neo4jEditor && window.neo4jEditor.modules && window.neo4jEditor.modules['data/graphDataManager']) {
                window.neo4jEditor.modules['data/graphDataManager'].initialized = true;
            }
            
            console.log('Neo4j Editor: Graph Data Manager initialized');
            return true;
        } catch (error) {
            console.error('Neo4j Editor: Error initializing Graph Data Manager:', error);
            return false;
        }
    },
    
    /**
     * 确保数据结构存在
     * @returns {boolean} 操作是否成功
     */
    ensureDataStructure: function() {
        try {
            window.neo4jEditor.sharedGraphData = window.neo4jEditor.sharedGraphData || {
                nodes: [],
                edges: [],
                deletedEdges: [],
                nodeTemplates: {},
                neo4jLabels: ['tree', 'network'],
                activeLabelFilters: []
            };
            return true;
        } catch (error) {
            console.error('Neo4j Editor: Error ensuring data structure:', error);
            return false;
        }
    },
    
    /**
     * 获取所有节点
     * @returns {Array} 节点数组
     */
    getNodes: function() {
        try {
            this.ensureDataStructure();
            return window.neo4jEditor.sharedGraphData.nodes || [];
        } catch (error) {
            console.error('Neo4j Editor: Error getting nodes:', error);
            return [];
        }
    },
    
    /**
     * 获取所有边
     * @returns {Array} 边数组
     */
    getEdges: function() {
        try {
            this.ensureDataStructure();
            return window.neo4jEditor.sharedGraphData.edges || [];
        } catch (error) {
            console.error('Neo4j Editor: Error getting edges:', error);
            return [];
        }
    },
    
    /**
     * 配置Neo4j标签
     * @param {Array} labels - 标签数组
     * @returns {boolean} 配置是否成功
     */
    configureNeo4jLabels: function(labels) {
        try {
            if (!Array.isArray(labels)) {
                console.error('Neo4j Editor: Labels must be an array');
                return false;
            }
            
            const sharedData = window.neo4jEditor.sharedGraphData || {};
            sharedData.neo4jLabels = labels;
            
            console.log('Neo4j Editor: Neo4j labels configured');
            return true;
        } catch (error) {
            console.error('Neo4j Editor: Error configuring Neo4j labels:', error);
            return false;
        }
    },
    
    /**
     * 获取节点通过ID
     * @param {string} nodeId - 节点ID
     * @returns {Object|null} 节点对象或null
     */
    getNodeById: function(nodeId) {
        try {
            if (!nodeId) return null;
            
            const nodes = this.getNodes();
            return nodes.find(node => node && node.data && node.data.id === nodeId) || null;
        } catch (error) {
            console.error('Neo4j Editor: Error getting node by ID:', error);
            return null;
        }
    },
    
    /**
     * 获取边通过ID
     * @param {string} edgeId - 边ID
     * @returns {Object|null} 边对象或null
     */
    getEdgeById: function(edgeId) {
        try {
            if (!edgeId) return null;
            
            const edges = this.getEdges();
            return edges.find(edge => edge && edge.data && edge.data.id === edgeId) || null;
        } catch (error) {
            console.error('Neo4j Editor: Error getting edge by ID:', error);
            return null;
        }
    },
    
    /**
     * 设置标签过滤器
     * @param {Array} filters - 过滤器数组
     * @returns {boolean} 设置是否成功
     */
    setLabelFilters: function(filters) {
        try {
            if (!Array.isArray(filters)) {
                console.error('Neo4j Editor: Filters must be an array');
                return false;
            }
            
            const sharedData = window.neo4jEditor.sharedGraphData || {};
            sharedData.activeLabelFilters = filters;
            
            console.log('Neo4j Editor: Label filters set');
            return true;
        } catch (error) {
            console.error('Neo4j Editor: Error setting label filters:', error);
            return false;
        }
    },
    
    /**
     * 检查节点代码是否唯一
     * @param {string} code - 节点代码
     * @param {string} excludeId - 要排除的节点ID
     * @returns {boolean} 代码是否唯一
     */
    isNodeCodeUnique: function(code, excludeId) {
        try {
            if (!code || typeof code !== 'string') {
                return false;
            }
            
            const nodes = this.getNodes();
            return !nodes.some(node => 
                node && node.data && node.data.code === code && node.data.id !== excludeId
            );
        } catch (error) {
            console.error('Neo4j Editor: Error checking node code uniqueness:', error);
            return false;
        }
    },
    
    /**
     * 生成唯一的节点代码
     * @returns {string} 唯一的节点代码
     */
    generateUniqueNodeCode: function() {
        try {
            let code;
            let counter = 1;
            
            do {
                code = `node_${counter}`;
                counter++;
            } while (!this.isNodeCodeUnique(code));
            
            return code;
        } catch (error) {
            console.error('Neo4j Editor: Error generating unique node code:', error);
            return `node_${Date.now()}`;
        }
    },
    
    /**
     * 根据标签过滤节点
     * @param {Array} nodeArray - 节点数组
     * @param {Array} filters - 过滤器数组
     * @returns {Array} 过滤后的节点数组
     */
    filterNodesByLabels: function(nodeArray, filters) {
        try {
            if (!Array.isArray(nodeArray) || !Array.isArray(filters) || filters.length === 0) {
                return nodeArray;
            }
            
            return nodeArray.filter(node => {
                if (!node || !node.data || !Array.isArray(node.data.labels)) {
                    return false;
                }
                return node.data.labels.some(label => filters.includes(label));
            });
        } catch (error) {
            console.error('Neo4j Editor: Error filtering nodes by labels:', error);
            return nodeArray || [];
        }
    },
    
    /**
     * 添加节点
     * @param {Object} nodeData - 节点数据
     * @returns {Object|null} 添加的节点或null
     */
    addNode: function(nodeData) {
        try {
            if (!nodeData || typeof nodeData !== 'object') {
                console.error('Neo4j Editor: Invalid node data');
                return null;
            }
            
            this.ensureDataStructure();
            
            // 确保节点有ID和基本数据结构
            const node = {
                group: 'nodes',
                data: {
                    id: nodeData.data && nodeData.data.id || 'node_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9),
                    label: nodeData.data && nodeData.data.label || '',
                    code: nodeData.data && nodeData.data.code || this.generateUniqueNodeCode(),
                    labels: nodeData.data && nodeData.data.labels || ['tree', 'network'],
                    level: nodeData.data && nodeData.data.level || 0,
                    properties: nodeData.data && nodeData.data.properties || {},
                    ...(nodeData.data || {})
                },
                position: nodeData.position || { x: 0, y: 0 }
            };
            
            // 添加到节点列表
            const nodes = this.getNodes();
            nodes.push(node);
            
            console.log('Neo4j Editor: Node added:', node.data.id);
            
            // 触发数据更新事件
            this.triggerDataUpdate('nodeAdded', { node: node });
            
            return node;
        } catch (error) {
            console.error('Neo4j Editor: Error adding node:', error);
            return null;
        }
    },
    
    /**
     * 添加边
     * @param {Object} edgeData - 边数据
     * @returns {Object|null} 添加的边或null
     */
    addEdge: function(edgeData) {
        try {
            if (!edgeData || typeof edgeData !== 'object') {
                console.error('Neo4j Editor: Invalid edge data');
                return null;
            }
            
            // 验证源节点和目标节点存在
            const source = edgeData.data && edgeData.data.source;
            const target = edgeData.data && edgeData.data.target;
            
            if (!source || !target) {
                console.error('Neo4j Editor: Edge must have source and target');
                return null;
            }
            
            if (!this.getNodeById(source) || !this.getNodeById(target)) {
                console.error('Neo4j Editor: Source or target node not found');
                return null;
            }
            
            // 确保边有ID和基本数据结构
            const edge = {
                group: 'edges',
                data: {
                    id: edgeData.data && edgeData.data.id || 'edge_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9),
                    source: source,
                    target: target,
                    type: edgeData.data && edgeData.data.type || 'RELATES_TO',
                    properties: edgeData.data && edgeData.data.properties || {},
                    ...(edgeData.data || {})
                }
            };
            
            // 添加到边列表
            const edges = this.getEdges();
            edges.push(edge);
            
            console.log('Neo4j Editor: Edge added:', edge.data.id);
            
            // 触发数据更新事件
            this.triggerDataUpdate('edgeAdded', { edge: edge });
            
            return edge;
        } catch (error) {
            console.error('Neo4j Editor: Error adding edge:', error);
            return null;
        }
    },
    
    /**
     * 更新节点
     * @param {string} nodeId - 节点ID
     * @param {Object} updates - 要更新的属性
     * @returns {Object|null} 更新后的节点或null（如果节点不存在）
     */
    updateNode: function(nodeId, updates) {
        try {
            if (!nodeId || !updates || typeof updates !== 'object') {
                console.error('Neo4j Editor: Invalid node ID or updates');
                return null;
            }
            
            const node = this.getNodeById(nodeId);
            if (!node || !node.data) {
                console.error('Neo4j Editor: Node not found');
                return null;
            }
            
            // 保留旧数据的副本
            const oldNodeData = JSON.parse(JSON.stringify(node.data));
            
            // 如果更新中包含properties对象，单独处理它
            if (updates.properties && typeof updates.properties === 'object') {
                node.data.properties = node.data.properties || {};
                Object.assign(node.data.properties, updates.properties);
                // 移除updates中的properties，避免重复更新
                delete updates.properties;
            }
            
            // 更新其他属性
            Object.assign(node.data, updates);
            
            console.log('Neo4j Editor: Node updated:', nodeId);
            
            // 触发数据更新事件
            this.triggerDataUpdate('nodeUpdated', { 
                node: node, 
                oldData: oldNodeData 
            });
            
            return node;
        } catch (error) {
            console.error('Neo4j Editor: Error updating node:', error);
            return null;
        }
    },
    
    /**
     * 更新边
     * @param {string} edgeId - 边ID
     * @param {Object} updates - 要更新的属性
     * @returns {Object|null} 更新后的边或null（如果边不存在）
     */
    updateEdge: function(edgeId, updates) {
        try {
            if (!edgeId) {
                console.error('Neo4j Editor: Edge ID is required for update');
                return null;
            }
            
            if (!updates || typeof updates !== 'object') {
                console.error('Neo4j Editor: Updates must be an object');
                return null;
            }
            
            const edge = this.getEdgeById(edgeId);
            if (!edge || !edge.data) {
                console.error('Neo4j Editor: Edge not found');
                return null;
            }
            
            // 保留旧数据的副本
            const oldEdgeData = JSON.parse(JSON.stringify(edge.data));
            
            // 如果更新中包含properties对象，单独处理它
            if (updates.properties && typeof updates.properties === 'object') {
                edge.data.properties = edge.data.properties || {};
                Object.assign(edge.data.properties, updates.properties);
                // 移除updates中的properties，避免重复更新
                delete updates.properties;
            }
            
            // 更新其他属性
            Object.assign(edge.data, updates);
            
            console.log('Neo4j Editor: Edge updated:', edgeId);
            
            // 触发数据更新事件
            this.triggerDataUpdate('edgeUpdated', { 
                edge: edge, 
                oldData: oldEdgeData 
            });
            
            return edge;
        } catch (error) {
            console.error('Neo4j Editor: Error updating edge:', error);
            return null;
        }
    },
    
    /**
     * 删除节点
     * @param {string} nodeId - 要删除的节点ID
     * @returns {boolean} 删除是否成功
     */
    deleteNode: function(nodeId) {
        try {
            if (!nodeId) {
                console.error('Neo4j Editor: Node ID is required for deletion');
                return false;
            }
            
            const nodes = this.getNodes();
            const nodeIndex = nodes.findIndex(node => node && node.data && node.data.id === nodeId);
            
            if (nodeIndex === -1) {
                console.error('Neo4j Editor: Node not found');
                return false;
            }
            
            // 存储被删除的节点信息
            const deletedNode = nodes[nodeIndex];
            
            // 删除节点
            nodes.splice(nodeIndex, 1);
            
            // 删除所有连接到该节点的边
            this.deleteEdgesConnectedToNode(nodeId);
            
            console.log('Neo4j Editor: Node deleted:', nodeId);
            
            // 触发数据更新事件
            this.triggerDataUpdate('nodeDeleted', { nodeId: nodeId, node: deletedNode });
            
            return true;
        } catch (error) {
            console.error('Neo4j Editor: Error deleting node:', error);
            return false;
        }
    },
    
    /**
     * 删除边
     * @param {string} edgeId - 要删除的边ID
     * @returns {boolean} 删除是否成功
     */
    deleteEdge: function(edgeId) {
        try {
            if (!edgeId) {
                console.error('Neo4j Editor: Edge ID is required for deletion');
                return false;
            }
            
            const edges = this.getEdges();
            const edgeIndex = edges.findIndex(edge => edge && edge.data && edge.data.id === edgeId);
            
            if (edgeIndex === -1) {
                console.error('Neo4j Editor: Edge not found');
                return false;
            }
            
            // 存储被删除的边信息
            const deletedEdge = edges[edgeIndex];
            
            // 将被删除的边添加到deletedEdges数组（用于可能的撤销操作）
            const sharedData = window.neo4jEditor.sharedGraphData || {};
            sharedData.deletedEdges = sharedData.deletedEdges || [];
            sharedData.deletedEdges.push(deletedEdge);
            
            // 删除边
            edges.splice(edgeIndex, 1);
            
            console.log('Neo4j Editor: Edge deleted:', edgeId);
            
            // 触发数据更新事件
            this.triggerDataUpdate('edgeDeleted', { edgeId: edgeId, edge: deletedEdge });
            
            return true;
        } catch (error) {
            console.error('Neo4j Editor: Error deleting edge:', error);
            return false;
        }
    },
    
    /**
     * 删除连接到指定节点的所有边
     * @param {string} nodeId - 节点ID
     * @returns {Array} 被删除的边数组
     */
    deleteEdgesConnectedToNode: function(nodeId) {
        try {
            if (!nodeId) {
                console.error('Neo4j Editor: Node ID is required');
                return [];
            }
            
            const edges = this.getEdges();
            const deletedEdges = [];
            
            // 找出所有连接到该节点的边
            const connectedEdges = edges.filter(edge => 
                edge && edge.data && 
                (edge.data.source === nodeId || edge.data.target === nodeId)
            );
            
            // 删除这些边
            connectedEdges.forEach(edge => {
                const edgeId = edge.data.id;
                const edgeIndex = edges.findIndex(e => e && e.data && e.data.id === edgeId);
                if (edgeIndex !== -1) {
                    edges.splice(edgeIndex, 1);
                    deletedEdges.push(edge);
                    console.log('Neo4j Editor: Edge connected to node deleted:', edgeId);
                }
            });
            
            return deletedEdges;
        } catch (error) {
            console.error('Neo4j Editor: Error deleting edges connected to node:', error);
            return [];
        }
    },
    
    /**
     * 获取指向节点的所有边
     * @param {string} nodeId - 节点ID
     * @returns {Array} 入边数组
     */
    getIncomingEdges: function(nodeId) {
        try {
            if (!nodeId) {
                console.error('Neo4j Editor: Node ID is required');
                return [];
            }
            
            const edges = this.getEdges();
            return edges.filter(edge => 
                edge && edge.data && edge.data.target === nodeId
            );
        } catch (error) {
            console.error('Neo4j Editor: Error getting incoming edges:', error);
            return [];
        }
    },
    
    /**
     * 获取从节点发出的所有边
     * @param {string} nodeId - 节点ID
     * @returns {Array} 出边数组
     */
    getOutgoingEdges: function(nodeId) {
        try {
            if (!nodeId) {
                console.error('Neo4j Editor: Node ID is required');
                return [];
            }
            
            const edges = this.getEdges();
            return edges.filter(edge => 
                edge && edge.data && edge.data.source === nodeId
            );
        } catch (error) {
            console.error('Neo4j Editor: Error getting outgoing edges:', error);
            return [];
        }
    },
    
    /**
     * 清空所有图表数据
     * @returns {boolean} 清空是否成功
     */
    clearAll: function() {
        try {
            window.neo4jEditor.sharedGraphData = {
                nodes: [],
                edges: [],
                deletedEdges: [],
                nodeTemplates: {},
                neo4jLabels: ['tree', 'network'],
                activeLabelFilters: []
            };
            
            console.log('Neo4j Editor: All graph data cleared');
            
            // 触发数据更新事件
            this.triggerDataUpdate('dataCleared', {});
            return true;
        } catch (error) {
            console.error('Neo4j Editor: Error clearing graph data:', error);
            return false;
        }
    },
    
    /**
     * 导入数据
     * @param {Object} data - 要导入的数据对象，包含nodes和edges
     * @returns {boolean} 导入是否成功
     */
    importData: function(data) {
        try {
            if (!data || typeof data !== 'object') {
                console.error('Neo4j Editor: Invalid data for import');
                return false;
            }
            
            // 清空现有数据
            this.clearAll();
            
            // 导入节点
            if (Array.isArray(data.nodes)) {
                data.nodes.forEach(node => {
                    if (node && typeof node === 'object') {
                        this.addNode(node);
                    }
                });
            }
            
            // 导入边
            if (Array.isArray(data.edges)) {
                data.edges.forEach(edge => {
                    if (edge && typeof edge === 'object') {
                        this.addEdge(edge);
                    }
                });
            }
            
            console.log('Neo4j Editor: Graph data imported successfully');
            
            // 触发数据更新事件
            this.triggerDataUpdate('dataImported', { data: data });
            return true;
        } catch (error) {
            console.error('Neo4j Editor: Error importing graph data:', error);
            return false;
        }
    },
    
    /**
     * 导出数据
     * @returns {Object} 包含nodes和edges的对象
     */
    exportData: function() {
        try {
            const sharedData = window.neo4jEditor.sharedGraphData || { nodes: [], edges: [] };
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
    },
    
    /**
     * 保存节点模板
     * @param {string} name - 模板名称
     * @param {Object} templateData - 模板数据
     * @returns {boolean} 保存是否成功
     */
    saveNodeTemplate: function(name, templateData) {
        try {
            if (!name || !templateData || typeof templateData !== 'object') {
                console.error('Neo4j Editor: Invalid template name or data');
                return false;
            }
            
            var sharedData = window.neo4jEditor.sharedGraphData || {};
            sharedData.nodeTemplates = sharedData.nodeTemplates || {};
            
            const deepClone = window.deepClone && typeof window.deepClone === 'function' ? 
                window.deepClone : 
                (obj) => JSON.parse(JSON.stringify(obj));
            
            sharedData.nodeTemplates[name] = deepClone(templateData);
            
            console.log('Neo4j Editor: Node template saved:', name);
            return true;
        } catch (error) {
            console.error('Neo4j Editor: Error saving node template:', error);
            return false;
        }
    },
    
    /**
     * 获取节点模板
     * @param {string} name - 模板名称
     * @returns {Object|null} 模板数据或null
     */
    getNodeTemplate: function(name) {
        try {
            if (!name) return null;
            
            var sharedData = window.neo4jEditor.sharedGraphData || {};
            if (sharedData.nodeTemplates && sharedData.nodeTemplates[name]) {
                const deepClone = window.deepClone && typeof window.deepClone === 'function' ? 
                    window.deepClone : 
                    (obj) => JSON.parse(JSON.stringify(obj));
                
                return deepClone(sharedData.nodeTemplates[name]);
            }
            return null;
        } catch (error) {
            console.error('Neo4j Editor: Error getting node template:', error);
            return null;
        }
    },
    
    /**
     * 触发数据更新事件
     * @param {string} eventName - 事件名称
     * @param {Object} eventData - 事件数据
     * @returns {boolean} 触发是否成功
     */
    triggerDataUpdate: function(eventName, eventData) {
        try {
            // 安全检查参数
            if (!eventName || typeof eventName !== 'string') {
                console.error('Neo4j Editor: Invalid event name');
                return false;
            }
            
            // 触发自定义事件
            const event = new CustomEvent('neo4j-editor:data-update', {
                detail: {
                    eventName: eventName,
                    data: eventData || {}
                }
            });
            
            if (document && typeof document.dispatchEvent === 'function') {
                document.dispatchEvent(event);
            }
            
            // 如果有同步函数，调用它 - 优先使用viewSync.syncData
            if (window.viewSync && typeof window.viewSync.syncData === 'function') {
                window.viewSync.syncData();
            } else if (typeof window.syncGraphData === 'function') {
                window.syncGraphData();
            }
            
            return true;
        } catch (error) {
            console.error('Neo4j Editor: Error triggering data update event:', error);
            return false;
        }
    },
    
    /**
     * 计算图的统计信息
     * @returns {Object} 统计信息
     */
    getStatistics: function() {
        try {
            const nodes = this.getNodes();
            const edges = this.getEdges();
            
            // 计算度分布
            const degreeDistribution = {};
            nodes.forEach(node => {
                if (node && node.data) {
                    const inDegree = this.getIncomingEdges(node.data.id).length;
                    const outDegree = this.getOutgoingEdges(node.data.id).length;
                    const totalDegree = inDegree + outDegree;
                    
                    if (!degreeDistribution[totalDegree]) {
                        degreeDistribution[totalDegree] = 0;
                    }
                    degreeDistribution[totalDegree]++;
                }
            });
            
            return {
                nodeCount: nodes.length,
                edgeCount: edges.length,
                density: nodes.length > 1 ? edges.length / (nodes.length * (nodes.length - 1)) : 0,
                averageDegree: nodes.length > 0 ? (2 * edges.length) / nodes.length : 0,
                degreeDistribution: degreeDistribution
            };
        } catch (error) {
            console.error('Neo4j Editor: Error getting graph statistics:', error);
            return {
                nodeCount: 0,
                edgeCount: 0,
                density: 0,
                averageDegree: 0,
                degreeDistribution: {}
            };
        }
    }
};

// 导出到window对象
window.graphDataManager = graphDataManagerModule;

// 使用映射数组统一管理向后兼容函数
const graphDataBackwardCompatibilityFunctions = [
    { deprecatedName: 'addNode', newFunction: graphDataManager.addNode, context: graphDataManager },
    { deprecatedName: 'addEdge', newFunction: graphDataManager.addEdge, context: graphDataManager },
    { deprecatedName: 'removeNode', newFunction: graphDataManager.removeNode, context: graphDataManager },
    { deprecatedName: 'removeEdge', newFunction: graphDataManager.removeEdge, context: graphDataManager },
    { deprecatedName: 'updateNode', newFunction: graphDataManager.updateNode, context: graphDataManager },
    { deprecatedName: 'updateEdge', newFunction: graphDataManager.updateEdge, context: graphDataManager },
    { deprecatedName: 'getNodeById', newFunction: graphDataManager.findNodeById, context: graphDataManager },
    { deprecatedName: 'getEdgeById', newFunction: graphDataManager.findEdgeById, context: graphDataManager },
    { deprecatedName: 'getConnectedEdges', newFunction: graphDataManager.getConnectedEdges, context: graphDataManager },
    { deprecatedName: 'validateGraphData', newFunction: graphDataManager.validateGraphData, context: graphDataManager }
];

// 注册向后兼容函数
if (window.neo4jEditor && typeof window.neo4jEditor.createBackwardCompatibilityFunction === 'function') {
    graphDataBackwardCompatibilityFunctions.forEach(funcInfo => {
        try {
            // 确保函数名称有效
            if (!funcInfo.deprecatedName || typeof funcInfo.newFunction !== 'function') {
                console.error(`注册向后兼容函数失败: 无效的函数信息`, funcInfo);
                return;
            }
            
            if (typeof window[funcInfo.deprecatedName] === 'undefined') {
                window[funcInfo.deprecatedName] = window.neo4jEditor.createBackwardCompatibilityFunction(
                    funcInfo.deprecatedName,
                    funcInfo.newFunction,
                    funcInfo.context
                );
            }
        } catch (error) {
            console.error(`注册向后兼容函数 ${funcInfo.deprecatedName || '未知函数'} 失败:`, error);
        }
    });
}

// 确保modules对象存在
if (window.neo4jEditor && typeof window.neo4jEditor.modules === 'undefined') {
    window.neo4jEditor.modules = {};
}

// 使用标准的模块注册方法
const graphDataModuleName = 'data/graphDataManager';
const graphDataModuleRegistrationInfo = {
    name: graphDataModuleName,
    version: '1.1.0',
    dependencies: ['core/init'],
    module: graphDataManagerModule
};

// 使用标准的模块注册方法
if (window.neo4jEditor && typeof window.neo4jEditor.registerModule === 'function') {
    try {
        window.neo4jEditor.registerModule(graphDataModuleRegistrationInfo);
        console.log(`Neo4j Editor: ${graphDataModuleName} module registered successfully`);
    } catch (registrationError) {
        console.error(`Neo4j Editor: Failed to register ${graphDataModuleName} module:`, registrationError);
        
        // 降级方案：直接注册到modules对象
        try {
            if (typeof window.neo4jEditor.modules[graphDataModuleName] === 'undefined') {
                window.neo4jEditor.modules[graphDataModuleName] = {
                    name: graphDataModuleRegistrationInfo.name,
                    initialized: graphDataManagerModule.initialized,
                    version: graphDataModuleRegistrationInfo.version,
                    dependencies: graphDataModuleRegistrationInfo.dependencies,
                    module: graphDataModuleRegistrationInfo.module
                };
                console.log(`Neo4j Editor: ${graphDataModuleName} module registered via fallback to modules object`);
            }
        } catch (fallbackError) {
            // 终极降级方案：直接挂载到全局
            if (typeof window.appModule === 'undefined') {
                window.appModule = {};
            }
            window.appModule.graphDataManager = graphDataManagerModule;
            console.log(`Neo4j Editor: ${graphDataModuleName} module registered via final fallback to appModule`);
        }
    }
} else {
    // 降级方案：直接挂载到全局
    if (typeof window.appModule === 'undefined') {
        window.appModule = {};
    }
    window.appModule.graphDataManager = graphDataManagerModule;
    console.log(`Neo4j Editor: ${graphDataModuleName} module registered via fallback to appModule`);
}

// 多模块系统支持 - 确保兼容性
// CommonJS 模块支持
if (typeof module !== 'undefined' && typeof module.exports !== 'undefined') {
    module.exports = graphDataManagerModule;
}

// ES 模块支持
if (typeof exports !== 'undefined' && typeof exports === 'object') {
    Object.defineProperty(exports, '__esModule', { value: true });
    if (typeof module !== 'undefined') module.exports = graphDataManagerModule;
    exports.default = graphDataManagerModule;
}

// AMD 模块支持
if (typeof define === 'function' && define.amd) {
    define(['core/init'], function() {
        return graphDataManagerModule;
    });
}