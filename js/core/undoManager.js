/**
 * Neo4j Editor - 撤销/重做管理器模块
 * 负责处理图形编辑的撤销和重做功能
 */
(function(neo4jEditor) {
    'use strict';

    // 确保命名空间存在
    if (typeof neo4jEditor === 'undefined') {
        window.neo4jEditor = {};
    }

    // 初始化状态
    let initialized = false;
    
    // 撤销栈和重做栈
    let undoStack = [];
    let redoStack = [];
    
    // 最大栈大小（防止内存泄漏）
    const MAX_STACK_SIZE = 100;
    
    // 批量操作状态
    let isBatchOperation = false;
    let currentBatch = [];
    
    // 是否在撤销/重做过程中
    let isUndoingOrRedoing = false;

    /**
     * 初始化撤销/重做管理器
     * @param {Object} config - 配置对象
     * @returns {boolean} 初始化是否成功
     */
    function initialize(config = {}) {
        try {
            console.log('Undo Manager Module: Initializing...');
            
            // 合并配置
            const mergedConfig = {
                maxStackSize: MAX_STACK_SIZE,
                ...config
            };
            
            // 重置栈
            undoStack = [];
            redoStack = [];
            
            // 重置批量操作状态
            isBatchOperation = false;
            currentBatch = [];
            isUndoingOrRedoing = false;
            
            // 设置事件监听
            setupEventListeners();
            
            // 标记为已初始化
            initialized = true;
            
            console.log('Undo Manager Module: Initialized successfully');
            
            // 触发初始化完成事件
            if (neo4jEditor.eventManager && typeof neo4jEditor.eventManager.trigger === 'function') {
                neo4jEditor.eventManager.trigger('undoManager:initialized', {
                    maxStackSize: mergedConfig.maxStackSize
                });
            }
            
            return true;
        } catch (error) {
            console.error('Undo Manager Module: Initialization error:', error);
            return false;
        }
    }

    /**
     * 设置事件监听
     */
    function setupEventListeners() {
        try {
            if (!neo4jEditor.eventManager || typeof neo4jEditor.eventManager.on !== 'function') {
                console.warn('Undo Manager: Event manager not available for event listeners');
                return;
            }
            
            // 监听节点添加事件
            neo4jEditor.eventManager.on('node:added', function(event) {
                if (!isUndoingOrRedoing && event.data && event.data.node) {
                    addUndoOperation({
                        type: 'node:added',
                        data: {
                            node: event.data.node
                        },
                        undo: function() {
                            if (neo4jEditor.eventManager && typeof neo4jEditor.eventManager.trigger === 'function') {
                                neo4jEditor.eventManager.trigger('node:deleted', {
                                    nodeId: event.data.node.data.id,
                                    source: 'undo'
                                });
                            }
                        },
                        redo: function() {
                            if (neo4jEditor.eventManager && typeof neo4jEditor.eventManager.trigger === 'function') {
                                neo4jEditor.eventManager.trigger('node:added', {
                                    node: event.data.node,
                                    source: 'redo'
                                });
                            }
                        }
                    });
                }
            });
            
            // 监听节点更新事件
            neo4jEditor.eventManager.on('node:updated', function(event) {
                if (!isUndoingOrRedoing && event.data && event.data.node) {
                    // 获取节点的前一个状态
                    const prevState = getNodePreviousState(event.data.node.data.id);
                    
                    if (prevState) {
                        addUndoOperation({
                            type: 'node:updated',
                            data: {
                                nodeId: event.data.node.data.id,
                                prevState: prevState,
                                newState: event.data.node
                            },
                            undo: function() {
                                if (neo4jEditor.eventManager && typeof neo4jEditor.eventManager.trigger === 'function') {
                                    neo4jEditor.eventManager.trigger('node:updated', {
                                        node: prevState,
                                        source: 'undo'
                                    });
                                }
                            },
                            redo: function() {
                                if (neo4jEditor.eventManager && typeof neo4jEditor.eventManager.trigger === 'function') {
                                    neo4jEditor.eventManager.trigger('node:updated', {
                                        node: event.data.node,
                                        source: 'redo'
                                    });
                                }
                            }
                        });
                    }
                }
            });
            
            // 监听节点删除事件
            neo4jEditor.eventManager.on('node:deleted', function(event) {
                if (!isUndoingOrRedoing && event.data && event.data.nodeId) {
                    // 保存节点数据以供恢复
                    const nodeData = saveNodeBeforeDelete(event.data.nodeId);
                    
                    if (nodeData) {
                        // 保存相关关系
                        const connectedEdges = saveEdgesBeforeDelete(event.data.nodeId);
                        
                        addUndoOperation({
                            type: 'node:deleted',
                            data: {
                                nodeId: event.data.nodeId,
                                nodeData: nodeData,
                                connectedEdges: connectedEdges
                            },
                            undo: function() {
                                // 恢复节点
                                if (neo4jEditor.eventManager && typeof neo4jEditor.eventManager.trigger === 'function') {
                                    // 先恢复节点
                                    neo4jEditor.eventManager.trigger('node:added', {
                                        node: nodeData,
                                        source: 'undo'
                                    });
                                    
                                    // 然后恢复关系
                                    connectedEdges.forEach(edge => {
                                        neo4jEditor.eventManager.trigger('edge:added', {
                                            edge: edge,
                                            source: 'undo'
                                        });
                                    });
                                }
                            },
                            redo: function() {
                                if (neo4jEditor.eventManager && typeof neo4jEditor.eventManager.trigger === 'function') {
                                    neo4jEditor.eventManager.trigger('node:deleted', {
                                        nodeId: event.data.nodeId,
                                        source: 'redo'
                                    });
                                }
                            }
                        });
                    }
                }
            });
            
            // 监听关系添加事件
            neo4jEditor.eventManager.on('edge:added', function(event) {
                if (!isUndoingOrRedoing && event.data && event.data.edge) {
                    addUndoOperation({
                        type: 'edge:added',
                        data: {
                            edge: event.data.edge
                        },
                        undo: function() {
                            if (neo4jEditor.eventManager && typeof neo4jEditor.eventManager.trigger === 'function') {
                                neo4jEditor.eventManager.trigger('edge:deleted', {
                                    edgeId: event.data.edge.data.id,
                                    source: 'undo'
                                });
                            }
                        },
                        redo: function() {
                            if (neo4jEditor.eventManager && typeof neo4jEditor.eventManager.trigger === 'function') {
                                neo4jEditor.eventManager.trigger('edge:added', {
                                    edge: event.data.edge,
                                    source: 'redo'
                                });
                            }
                        }
                    });
                }
            });
            
            // 监听关系更新事件
            neo4jEditor.eventManager.on('edge:updated', function(event) {
                if (!isUndoingOrRedoing && event.data && event.data.edge) {
                    // 获取关系的前一个状态
                    const prevState = getEdgePreviousState(event.data.edge.data.id);
                    
                    if (prevState) {
                        addUndoOperation({
                            type: 'edge:updated',
                            data: {
                                edgeId: event.data.edge.data.id,
                                prevState: prevState,
                                newState: event.data.edge
                            },
                            undo: function() {
                                if (neo4jEditor.eventManager && typeof neo4jEditor.eventManager.trigger === 'function') {
                                    neo4jEditor.eventManager.trigger('edge:updated', {
                                        edge: prevState,
                                        source: 'undo'
                                    });
                                }
                            },
                            redo: function() {
                                if (neo4jEditor.eventManager && typeof neo4jEditor.eventManager.trigger === 'function') {
                                    neo4jEditor.eventManager.trigger('edge:updated', {
                                        edge: event.data.edge,
                                        source: 'redo'
                                    });
                                }
                            }
                        });
                    }
                }
            });
            
            // 监听关系删除事件
            neo4jEditor.eventManager.on('edge:deleted', function(event) {
                if (!isUndoingOrRedoing && event.data && event.data.edgeId) {
                    // 保存关系数据以供恢复
                    const edgeData = saveEdgeBeforeDelete(event.data.edgeId);
                    
                    if (edgeData) {
                        addUndoOperation({
                            type: 'edge:deleted',
                            data: {
                                edgeId: event.data.edgeId,
                                edgeData: edgeData
                            },
                            undo: function() {
                                if (neo4jEditor.eventManager && typeof neo4jEditor.eventManager.trigger === 'function') {
                                    neo4jEditor.eventManager.trigger('edge:added', {
                                        edge: edgeData,
                                        source: 'undo'
                                    });
                                }
                            },
                            redo: function() {
                                if (neo4jEditor.eventManager && typeof neo4jEditor.eventManager.trigger === 'function') {
                                    neo4jEditor.eventManager.trigger('edge:deleted', {
                                        edgeId: event.data.edgeId,
                                        source: 'redo'
                                    });
                                }
                            }
                        });
                    }
                }
            });
            
            // 监听数据重置事件（清空图表）
            neo4jEditor.eventManager.on('data:reset', function(event) {
                if (!isUndoingOrRedoing && event.data && event.data.previousData) {
                    addUndoOperation({
                        type: 'data:reset',
                        data: {
                            previousData: event.data.previousData
                        },
                        undo: function() {
                            if (neo4jEditor.eventManager && typeof neo4jEditor.eventManager.trigger === 'function') {
                                neo4jEditor.eventManager.trigger('data:updated', {
                                    nodes: event.data.previousData.nodes,
                                    edges: event.data.previousData.edges,
                                    source: 'undo'
                                });
                            }
                        },
                        redo: function() {
                            if (neo4jEditor.eventManager && typeof neo4jEditor.eventManager.trigger === 'function') {
                                neo4jEditor.eventManager.trigger('data:reset', {
                                    source: 'redo'
                                });
                            }
                        }
                    });
                }
            });
            
            // 监听数据导入事件
            neo4jEditor.eventManager.on('data:imported', function(event) {
                if (!isUndoingOrRedoing && event.data) {
                    // 保存导入前的数据状态
                    const beforeImport = saveCurrentGraphState();
                    
                    addUndoOperation({
                        type: 'data:imported',
                        data: {
                            beforeImport: beforeImport,
                            importedData: event.data
                        },
                        undo: function() {
                            if (neo4jEditor.eventManager && typeof neo4jEditor.eventManager.trigger === 'function') {
                                neo4jEditor.eventManager.trigger('data:updated', {
                                    nodes: beforeImport.nodes,
                                    edges: beforeImport.edges,
                                    source: 'undo'
                                });
                            }
                        },
                        redo: function() {
                            if (neo4jEditor.eventManager && typeof neo4jEditor.eventManager.trigger === 'function') {
                                neo4jEditor.eventManager.trigger('data:imported', {
                                    nodes: event.data.nodes,
                                    edges: event.data.edges,
                                    source: 'redo'
                                });
                            }
                        }
                    });
                }
            });
            
            // 监听批量操作开始
            neo4jEditor.eventManager.on('operation:batch:start', function() {
                startBatchOperation();
            });
            
            // 监听批量操作结束
            neo4jEditor.eventManager.on('operation:batch:end', function(event) {
                if (event.data && event.data.name) {
                    endBatchOperation(event.data.name);
                } else {
                    endBatchOperation();
                }
            });
        } catch (error) {
            console.error('Error setting up undo manager event listeners:', error);
        }
    }

    /**
     * 获取节点的前一个状态
     * @param {string} nodeId - 节点ID
     * @returns {Object|null} 节点的前一个状态
     */
    function getNodePreviousState(nodeId) {
        try {
            // 从共享图数据中获取当前节点状态（作为前一个状态）
            if (neo4jEditor.sharedGraphData && neo4jEditor.sharedGraphData.nodes) {
                const node = neo4jEditor.sharedGraphData.nodes.find(n => n.data.id === nodeId);
                if (node) {
                    // 深拷贝以保存状态
                    return deepClone(node);
                }
            }
            return null;
        } catch (error) {
            console.error('Error getting node previous state:', error);
            return null;
        }
    }

    /**
     * 获取关系的前一个状态
     * @param {string} edgeId - 关系ID
     * @returns {Object|null} 关系的前一个状态
     */
    function getEdgePreviousState(edgeId) {
        try {
            // 从共享图数据中获取当前关系状态（作为前一个状态）
            if (neo4jEditor.sharedGraphData && neo4jEditor.sharedGraphData.edges) {
                const edge = neo4jEditor.sharedGraphData.edges.find(e => e.data.id === edgeId);
                if (edge) {
                    // 深拷贝以保存状态
                    return deepClone(edge);
                }
            }
            return null;
        } catch (error) {
            console.error('Error getting edge previous state:', error);
            return null;
        }
    }

    /**
     * 在删除前保存节点数据
     * @param {string} nodeId - 节点ID
     * @returns {Object|null} 保存的节点数据
     */
    function saveNodeBeforeDelete(nodeId) {
        try {
            if (neo4jEditor.sharedGraphData && neo4jEditor.sharedGraphData.nodes) {
                const node = neo4jEditor.sharedGraphData.nodes.find(n => n.data.id === nodeId);
                if (node) {
                    return deepClone(node);
                }
            }
            return null;
        } catch (error) {
            console.error('Error saving node before delete:', error);
            return null;
        }
    }

    /**
     * 在删除前保存与节点相关的关系
     * @param {string} nodeId - 节点ID
     * @returns {Array} 相关关系数组
     */
    function saveEdgesBeforeDelete(nodeId) {
        try {
            const edges = [];
            
            if (neo4jEditor.sharedGraphData && neo4jEditor.sharedGraphData.edges) {
                const connectedEdges = neo4jEditor.sharedGraphData.edges.filter(
                    e => e.data.source === nodeId || e.data.target === nodeId
                );
                
                connectedEdges.forEach(edge => {
                    edges.push(deepClone(edge));
                });
            }
            
            return edges;
        } catch (error) {
            console.error('Error saving edges before delete:', error);
            return [];
        }
    }

    /**
     * 在删除前保存关系数据
     * @param {string} edgeId - 关系ID
     * @returns {Object|null} 保存的关系数据
     */
    function saveEdgeBeforeDelete(edgeId) {
        try {
            if (neo4jEditor.sharedGraphData && neo4jEditor.sharedGraphData.edges) {
                const edge = neo4jEditor.sharedGraphData.edges.find(e => e.data.id === edgeId);
                if (edge) {
                    return deepClone(edge);
                }
            }
            return null;
        } catch (error) {
            console.error('Error saving edge before delete:', error);
            return null;
        }
    }

    /**
     * 保存当前图形状态
     * @returns {Object} 当前图形状态
     */
    function saveCurrentGraphState() {
        try {
            const state = {
                nodes: [],
                edges: []
            };
            
            if (neo4jEditor.sharedGraphData) {
                if (neo4jEditor.sharedGraphData.nodes) {
                    neo4jEditor.sharedGraphData.nodes.forEach(node => {
                        state.nodes.push(deepClone(node));
                    });
                }
                
                if (neo4jEditor.sharedGraphData.edges) {
                    neo4jEditor.sharedGraphData.edges.forEach(edge => {
                        state.edges.push(deepClone(edge));
                    });
                }
            }
            
            return state;
        } catch (error) {
            console.error('Error saving current graph state:', error);
            return { nodes: [], edges: [] };
        }
    }

    /**
     * 添加撤销操作
     * @param {Object} operation - 操作对象
     */
    function addUndoOperation(operation) {
        try {
            // 验证操作对象
            if (!operation || typeof operation.undo !== 'function' || typeof operation.redo !== 'function') {
                console.error('Invalid undo operation object');
                return;
            }
            
            // 记录操作时间
            operation.timestamp = new Date().getTime();
            
            // 处理批量操作
            if (isBatchOperation) {
                currentBatch.push(operation);
                return;
            }
            
            // 清空重做栈
            redoStack = [];
            
            // 添加到撤销栈
            undoStack.push(operation);
            
            // 检查栈大小限制
            if (undoStack.length > MAX_STACK_SIZE) {
                undoStack.shift(); // 移除最旧的操作
            }
            
            // 触发事件
            if (neo4jEditor.eventManager && typeof neo4jEditor.eventManager.trigger === 'function') {
                neo4jEditor.eventManager.trigger('undoStack:changed', {
                    undoStackSize: undoStack.length,
                    redoStackSize: redoStack.length
                });
            }
        } catch (error) {
            console.error('Error adding undo operation:', error);
        }
    }

    /**
     * 执行撤销操作
     * @returns {boolean} 是否成功执行撤销
     */
    function performUndo() {
        try {
            if (undoStack.length === 0) {
                return false;
            }
            
            // 获取最近的操作
            const operation = undoStack.pop();
            
            // 设置撤销/重做状态
            isUndoingOrRedoing = true;
            
            try {
                // 执行撤销
                if (operation.isBatch) {
                    // 批量操作需要反向执行每个子操作
                    for (let i = operation.operations.length - 1; i >= 0; i--) {
                        operation.operations[i].undo();
                    }
                } else {
                    operation.undo();
                }
                
                // 添加到重做栈
                redoStack.push(operation);
                
                // 检查重做栈大小限制
                if (redoStack.length > MAX_STACK_SIZE) {
                    redoStack.shift(); // 移除最旧的操作
                }
                
                // 触发事件
                if (neo4jEditor.eventManager && typeof neo4jEditor.eventManager.trigger === 'function') {
                    neo4jEditor.eventManager.trigger('operation:undone', {
                        operation: operation,
                        undoStackSize: undoStack.length,
                        redoStackSize: redoStack.length
                    });
                    
                    neo4jEditor.eventManager.trigger('undoStack:changed', {
                        undoStackSize: undoStack.length,
                        redoStackSize: redoStack.length
                    });
                }
                
                return true;
            } finally {
                // 重置状态
                isUndoingOrRedoing = false;
            }
        } catch (error) {
            console.error('Error performing undo operation:', error);
            
            // 重置状态
            isUndoingOrRedoing = false;
            
            return false;
        }
    }

    /**
     * 执行重做操作
     * @returns {boolean} 是否成功执行重做
     */
    function performRedo() {
        try {
            if (redoStack.length === 0) {
                return false;
            }
            
            // 获取最近的操作
            const operation = redoStack.pop();
            
            // 设置撤销/重做状态
            isUndoingOrRedoing = true;
            
            try {
                // 执行重做
                if (operation.isBatch) {
                    // 批量操作需要正向执行每个子操作
                    for (let i = 0; i < operation.operations.length; i++) {
                        operation.operations[i].redo();
                    }
                } else {
                    operation.redo();
                }
                
                // 添加回撤销栈
                undoStack.push(operation);
                
                // 检查撤销栈大小限制
                if (undoStack.length > MAX_STACK_SIZE) {
                    undoStack.shift(); // 移除最旧的操作
                }
                
                // 触发事件
                if (neo4jEditor.eventManager && typeof neo4jEditor.eventManager.trigger === 'function') {
                    neo4jEditor.eventManager.trigger('operation:redone', {
                        operation: operation,
                        undoStackSize: undoStack.length,
                        redoStackSize: redoStack.length
                    });
                    
                    neo4jEditor.eventManager.trigger('undoStack:changed', {
                        undoStackSize: undoStack.length,
                        redoStackSize: redoStack.length
                    });
                }
                
                return true;
            } finally {
                // 重置状态
                isUndoingOrRedoing = false;
            }
        } catch (error) {
            console.error('Error performing redo operation:', error);
            
            // 重置状态
            isUndoingOrRedoing = false;
            
            return false;
        }
    }

    /**
     * 开始批量操作
     */
    function startBatchOperation() {
        try {
            if (!isBatchOperation) {
                isBatchOperation = true;
                currentBatch = [];
            }
        } catch (error) {
            console.error('Error starting batch operation:', error);
        }
    }

    /**
     * 结束批量操作
     * @param {string} name - 批量操作名称（可选）
     */
    function endBatchOperation(name = 'batch') {
        try {
            if (isBatchOperation) {
                isBatchOperation = false;
                
                // 如果批量操作不为空，创建批量操作对象
                if (currentBatch.length > 0) {
                    const batchOperation = {
                        type: 'batch',
                        name: name,
                        isBatch: true,
                        operations: currentBatch,
                        timestamp: new Date().getTime(),
                        undo: function() {
                            // 反向执行每个操作的撤销
                            for (let i = currentBatch.length - 1; i >= 0; i--) {
                                try {
                                    currentBatch[i].undo();
                                } catch (err) {
                                    console.error('Error undoing batch operation step:', err);
                                }
                            }
                        },
                        redo: function() {
                            // 正向执行每个操作的重做
                            for (let i = 0; i < currentBatch.length; i++) {
                                try {
                                    currentBatch[i].redo();
                                } catch (err) {
                                    console.error('Error redoing batch operation step:', err);
                                }
                            }
                        }
                    };
                    
                    // 清空重做栈
                    redoStack = [];
                    
                    // 添加到撤销栈
                    undoStack.push(batchOperation);
                    
                    // 检查栈大小限制
                    if (undoStack.length > MAX_STACK_SIZE) {
                        undoStack.shift(); // 移除最旧的操作
                    }
                    
                    // 触发事件
                    if (neo4jEditor.eventManager && typeof neo4jEditor.eventManager.trigger === 'function') {
                        neo4jEditor.eventManager.trigger('batchOperation:added', {
                            operation: batchOperation,
                            operationCount: currentBatch.length
                        });
                        
                        neo4jEditor.eventManager.trigger('undoStack:changed', {
                            undoStackSize: undoStack.length,
                            redoStackSize: redoStack.length
                        });
                    }
                }
                
                // 清空当前批处理
                currentBatch = [];
            }
        } catch (error) {
            console.error('Error ending batch operation:', error);
            
            // 重置状态
            isBatchOperation = false;
            currentBatch = [];
        }
    }

    /**
     * 手动添加撤销操作
     * @param {Object} operation - 操作对象
     * @returns {boolean} 是否成功添加
     */
    function addOperation(operation) {
        try {
            if (!operation || typeof operation.undo !== 'function' || typeof operation.redo !== 'function') {
                console.error('Invalid operation object: must have undo and redo functions');
                return false;
            }
            
            addUndoOperation(operation);
            return true;
        } catch (error) {
            console.error('Error adding manual operation:', error);
            return false;
        }
    }

    /**
     * 清空撤销和重做栈
     */
    function clearStacks() {
        try {
            undoStack = [];
            redoStack = [];
            
            // 清空批量操作
            if (isBatchOperation) {
                isBatchOperation = false;
                currentBatch = [];
            }
            
            // 触发事件
            if (neo4jEditor.eventManager && typeof neo4jEditor.eventManager.trigger === 'function') {
                neo4jEditor.eventManager.trigger('undoStack:changed', {
                    undoStackSize: 0,
                    redoStackSize: 0
                });
            }
        } catch (error) {
            console.error('Error clearing undo/redo stacks:', error);
        }
    }

    /**
     * 获取撤销栈大小
     * @returns {number} 撤销栈大小
     */
    function getUndoStackSize() {
        return undoStack.length;
    }

    /**
     * 获取重做栈大小
     * @returns {number} 重做栈大小
     */
    function getRedoStackSize() {
        return redoStack.length;
    }

    /**
     * 检查是否可以撤销
     * @returns {boolean} 是否可以撤销
     */
    function canUndo() {
        return undoStack.length > 0;
    }

    /**
     * 检查是否可以重做
     * @returns {boolean} 是否可以重做
     */
    function canRedo() {
        return redoStack.length > 0;
    }

    /**
     * 获取最近的撤销操作
     * @returns {Object|null} 最近的撤销操作
     */
    function getLastUndoOperation() {
        if (undoStack.length > 0) {
            return undoStack[undoStack.length - 1];
        }
        return null;
    }

    /**
     * 获取最近的重做操作
     * @returns {Object|null} 最近的重做操作
     */
    function getLastRedoOperation() {
        if (redoStack.length > 0) {
            return redoStack[redoStack.length - 1];
        }
        return null;
    }

    /**
     * 深拷贝对象
     * @param {Object} obj - 要拷贝的对象
     * @returns {Object} 拷贝后的对象
     */
    function deepClone(obj) {
        try {
            if (obj === null || typeof obj !== 'object') {
                return obj;
            }
            
            if (obj instanceof Date) {
                return new Date(obj.getTime());
            }
            
            if (obj instanceof Array) {
                const cloneArr = [];
                for (let i = 0; i < obj.length; i++) {
                    cloneArr[i] = deepClone(obj[i]);
                }
                return cloneArr;
            }
            
            const cloneObj = {};
            for (const key in obj) {
                if (obj.hasOwnProperty(key)) {
                    cloneObj[key] = deepClone(obj[key]);
                }
            }
            
            return cloneObj;
        } catch (error) {
            console.error('Error in deep clone:', error);
            return obj;
        }
    }

    /**
     * 清理资源
     */
    function cleanup() {
        try {
            // 清空栈
            clearStacks();
            
            // 重置状态
            initialized = false;
            isBatchOperation = false;
            isUndoingOrRedoing = false;
            
            console.log('Undo Manager Module: Resources cleaned up');
        } catch (error) {
            console.error('Error cleaning up undo manager resources:', error);
        }
    }

    /**
     * 撤销/重做管理器模块
     */
    const undoManagerModule = {
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
            return initialize(config);
        },
        
        /**
         * 执行撤销操作
         * @returns {boolean} 是否成功执行撤销
         */
        undo: function() {
            return performUndo();
        },
        
        /**
         * 执行重做操作
         * @returns {boolean} 是否成功执行重做
         */
        redo: function() {
            return performRedo();
        },
        
        /**
         * 手动添加撤销操作
         * @param {Object} operation - 操作对象
         * @returns {boolean} 是否成功添加
         */
        addOperation: function(operation) {
            return addOperation(operation);
        },
        
        /**
         * 开始批量操作
         */
        startBatch: function() {
            startBatchOperation();
        },
        
        /**
         * 结束批量操作
         * @param {string} name - 批量操作名称
         */
        endBatch: function(name) {
            endBatchOperation(name);
        },
        
        /**
         * 清空撤销和重做栈
         */
        clear: function() {
            clearStacks();
        },
        
        /**
         * 获取撤销栈大小
         * @returns {number} 撤销栈大小
         */
        getUndoStackSize: function() {
            return getUndoStackSize();
        },
        
        /**
         * 获取重做栈大小
         * @returns {number} 重做栈大小
         */
        getRedoStackSize: function() {
            return getRedoStackSize();
        },
        
        /**
         * 检查是否可以撤销
         * @returns {boolean} 是否可以撤销
         */
        canUndo: function() {
            return canUndo();
        },
        
        /**
         * 检查是否可以重做
         * @returns {boolean} 是否可以重做
         */
        canRedo: function() {
            return canRedo();
        },
        
        /**
         * 获取最近的撤销操作
         * @returns {Object|null} 最近的撤销操作
         */
        getLastUndoOperation: function() {
            return getLastUndoOperation();
        },
        
        /**
         * 获取最近的重做操作
         * @returns {Object|null} 最近的重做操作
         */
        getLastRedoOperation: function() {
            return getLastRedoOperation();
        },
        
        /**
         * 清理资源
         */
        cleanup: function() {
            cleanup();
        }
    };
    
    // 导出模块到命名空间
    neo4jEditor.undoManager = undoManagerModule;
    
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
                console.warn(`警告: 直接调用 ${deprecatedName}() 已弃用，请使用 neo4jEditor.undoManager.${newFunction.name || 'method'}()`);
            }
            return newFunction.apply(context || null, arguments);
        };
    }
    
    // 注册向后兼容函数
    const backwardCompatibilityMapping = [
        { deprecatedName: 'undoLastOperation', newFunction: undoManagerModule.undo, context: undoManagerModule },
        { deprecatedName: 'redoLastOperation', newFunction: undoManagerModule.redo, context: undoManagerModule },
        { deprecatedName: 'registerUndoOperation', newFunction: undoManagerModule.addOperation, context: undoManagerModule },
        { deprecatedName: 'beginBatchOperation', newFunction: undoManagerModule.startBatch, context: undoManagerModule },
        { deprecatedName: 'commitBatchOperation', newFunction: undoManagerModule.endBatch, context: undoManagerModule },
        { deprecatedName: 'clearUndoStack', newFunction: undoManagerModule.clear, context: undoManagerModule },
        { deprecatedName: 'canUndoOperation', newFunction: undoManagerModule.canUndo, context: undoManagerModule },
        { deprecatedName: 'canRedoOperation', newFunction: undoManagerModule.canRedo, context: undoManagerModule },
        { deprecatedName: 'cleanupUndoManager', newFunction: undoManagerModule.cleanup, context: undoManagerModule }
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
    const moduleName = 'core/undoManager';
    const moduleRegistrationInfo = {
        name: moduleName,
        version: '1.0.0',
        dependencies: ['core/eventManager', 'core/dataModel'],
        module: undoManagerModule
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
                        initialized: undoManagerModule.initialized,
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
                window.appModule.undoManager = undoManagerModule;
                console.log(`Neo4j Editor: ${moduleName} module registered via final fallback to appModule`);
            }
        }
    } else {
        // 降级方案：直接挂载到全局
        if (typeof window.appModule === 'undefined') {
            window.appModule = {};
        }
        window.appModule.undoManager = undoManagerModule;
        console.log(`Neo4j Editor: ${moduleName} module registered via fallback to appModule`);
    }
    
    // 多模块系统支持 - 确保兼容性
    // CommonJS 模块支持
    if (typeof module !== 'undefined' && typeof module.exports !== 'undefined') {
        module.exports = undoManagerModule;
    }
    
    // ES 模块支持
    if (typeof exports !== 'undefined' && typeof exports === 'object') {
        Object.defineProperty(exports, '__esModule', { value: true });
        if (typeof module !== 'undefined') module.exports = undoManagerModule;
        exports.default = undoManagerModule;
    }
    
    // AMD 模块支持
    if (typeof define === 'function' && define.amd) {
        define(['core/eventManager', 'core/dataModel'], function() {
            return undoManagerModule;
        });
    }
    
    return undoManagerModule;
})(window.neo4jEditor || (window.neo4jEditor = {}));