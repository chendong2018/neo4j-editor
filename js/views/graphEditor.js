/**
 * Neo4j Editor - 图编辑器核心功能模块
 * 负责节点选择、属性编辑、元素操作等核心编辑功能
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
 * 图编辑器类 - 封装所有核心编辑功能
 */
class GraphEditor {
    constructor() {
        this.selectedNode = null;
        this.selectedEdge = null;
        this.propertyEditor = null;
        this.initialized = false;
    }

    /**
     * 初始化图编辑器
     * @returns {boolean} 初始化是否成功
     */
    initialize() {
        try {
            // 可以在这里初始化编辑器状态
            console.log('Neo4j Editor: Graph editor initialized');
            
            // 确保全局编辑器状态对象存在
            if (!window.neo4jEditor.editorState) {
                window.neo4jEditor.editorState = {
                    selectedElement: null,
                    selectedElementType: null
                };
            }
            
            // 标记为已初始化
            this.initialized = true;
            
            // 标记模块为已初始化
            if (window.neo4jEditor && window.neo4jEditor.modules && window.neo4jEditor.modules['views/graphEditor']) {
                window.neo4jEditor.modules['views/graphEditor'].initialized = true;
                window.neo4jEditor.modules['views/graphEditor'].module = this;
            }
            
            return true;
        } catch (error) {
            console.error('Neo4j Editor: Error initializing graph editor:', error);
            return false;
        }
    }

    /**
     * 选择节点
     * @param {string} nodeId - 节点ID
     * @returns {boolean} 选择是否成功
     */
    selectNode(nodeId) {
        try {
            // 参数安全检查
            if (!nodeId || typeof nodeId !== 'string') {
                console.warn('Neo4j Editor: Invalid nodeId provided to selectNode');
                return false;
            }
            
            console.log('Neo4j Editor: Selecting node:', nodeId);
            
            // 更新选择状态
            this.selectedNode = nodeId;
            this.selectedEdge = null;
            
            // 更新全局编辑器状态
            if (window.neo4jEditor && window.neo4jEditor.editorState) {
                window.neo4jEditor.editorState.selectedElement = nodeId;
                window.neo4jEditor.editorState.selectedElementType = 'node';
            }
            
            // 调用属性编辑器显示节点属性
            if (window.propertyEditor && typeof window.propertyEditor.showNodeProperties === 'function') {
                window.propertyEditor.showNodeProperties(nodeId);
            }
            
            return true;
        } catch (error) {
            console.error('Neo4j Editor: Error selecting node:', error);
            return false;
        }
    }

    /**
     * 选择边
     * @param {string} edgeId - 边ID
     * @returns {boolean} 选择是否成功
     */
    selectEdge(edgeId) {
        try {
            // 参数安全检查
            if (!edgeId || typeof edgeId !== 'string') {
                console.warn('Neo4j Editor: Invalid edgeId provided to selectEdge');
                return false;
            }
            
            console.log('Neo4j Editor: Selecting edge:', edgeId);
            
            // 更新选择状态
            this.selectedEdge = edgeId;
            this.selectedNode = null;
            
            // 更新全局编辑器状态
            if (window.neo4jEditor && window.neo4jEditor.editorState) {
                window.neo4jEditor.editorState.selectedElement = edgeId;
                window.neo4jEditor.editorState.selectedElementType = 'edge';
            }
            
            // 调用属性编辑器显示边属性
            if (window.propertyEditor && typeof window.propertyEditor.showEdgeProperties === 'function') {
                window.propertyEditor.showEdgeProperties(edgeId);
            }
            
            return true;
        } catch (error) {
            console.error('Neo4j Editor: Error selecting edge:', error);
            return false;
        }
    }

    /**
     * 清除选择
     * @returns {boolean} 操作是否成功
     */
    clearSelection() {
        try {
            console.log('Neo4j Editor: Clearing selection');
            
            // 清除选择状态
            this.selectedNode = null;
            this.selectedEdge = null;
            
            // 更新全局编辑器状态
            if (window.neo4jEditor && window.neo4jEditor.editorState) {
                window.neo4jEditor.editorState.selectedElement = null;
                window.neo4jEditor.editorState.selectedElementType = null;
            }
            
            // 清空属性编辑器
            if (window.propertyEditor && typeof window.propertyEditor.clear === 'function') {
                window.propertyEditor.clear();
            }
            
            return true;
        } catch (error) {
            console.error('Neo4j Editor: Error clearing selection:', error);
            return false;
        }
    }

    /**
     * 创建节点
     * @param {Object} nodeData - 节点数据
     * @returns {string|null} 创建的节点ID或null
     */
    createNode(nodeData) {
        try {
            // 参数安全检查
            if (!nodeData || typeof nodeData !== 'object') {
                console.warn('Neo4j Editor: Invalid nodeData provided to createNode');
                return null;
            }
            
            console.log('Neo4j Editor: Creating node with data:', nodeData);
            
            // 使用graphDataManager创建节点
            if (window.graphDataManager && typeof window.graphDataManager.addNode === 'function') {
                return window.graphDataManager.addNode(nodeData);
            }
            
            console.error('Neo4j Editor: graphDataManager not available');
            return null;
        } catch (error) {
            console.error('Neo4j Editor: Error creating node:', error);
            return null;
        }
    }

    /**
     * 创建边
     * @param {Object} edgeData - 边数据
     * @returns {string|null} 创建的边ID或null
     */
    createEdge(edgeData) {
        try {
            // 参数安全检查
            if (!edgeData || typeof edgeData !== 'object') {
                console.warn('Neo4j Editor: Invalid edgeData provided to createEdge');
                return null;
            }
            
            console.log('Neo4j Editor: Creating edge with data:', edgeData);
            
            // 使用graphDataManager创建边
            if (window.graphDataManager && typeof window.graphDataManager.addEdge === 'function') {
                return window.graphDataManager.addEdge(edgeData);
            }
            
            console.error('Neo4j Editor: graphDataManager not available');
            return null;
        } catch (error) {
            console.error('Neo4j Editor: Error creating edge:', error);
            return null;
        }
    }

    /**
     * 删除节点
     * @param {string} nodeId - 节点ID
     * @returns {boolean} 是否删除成功
     */
    deleteNode(nodeId) {
        try {
            // 参数安全检查
            if (!nodeId || typeof nodeId !== 'string') {
                console.warn('Neo4j Editor: Invalid nodeId provided to deleteNode');
                return false;
            }
            
            console.log('Neo4j Editor: Deleting node:', nodeId);
            
            // 使用graphDataManager删除节点
            if (window.graphDataManager && typeof window.graphDataManager.deleteNode === 'function') {
                const result = window.graphDataManager.deleteNode(nodeId);
                
                // 如果删除成功且是当前选中的节点，则清除选择
                if (result && this.selectedNode === nodeId) {
                    this.clearSelection();
                }
                
                return result;
            }
            
            console.error('Neo4j Editor: graphDataManager not available');
            return false;
        } catch (error) {
            console.error('Neo4j Editor: Error deleting node:', error);
            return false;
        }
    }

    /**
     * 删除边
     * @param {string} edgeId - 边ID
     * @returns {boolean} 是否删除成功
     */
    deleteEdge(edgeId) {
        try {
            // 参数安全检查
            if (!edgeId || typeof edgeId !== 'string') {
                console.warn('Neo4j Editor: Invalid edgeId provided to deleteEdge');
                return false;
            }
            
            console.log('Neo4j Editor: Deleting edge:', edgeId);
            
            // 使用graphDataManager删除边
            if (window.graphDataManager && typeof window.graphDataManager.deleteEdge === 'function') {
                const result = window.graphDataManager.deleteEdge(edgeId);
                
                // 如果删除成功且是当前选中的边，则清除选择
                if (result && this.selectedEdge === edgeId) {
                    this.clearSelection();
                }
                
                return result;
            }
            
            console.error('Neo4j Editor: graphDataManager not available');
            return false;
        } catch (error) {
            console.error('Neo4j Editor: Error deleting edge:', error);
            return false;
        }
    }

    /**
     * 保存节点属性
     * @param {string} nodeId - 节点ID
     * @param {Object} newProperties - 新的属性对象
     * @returns {boolean} 是否保存成功
     */
    saveNodeProperties(nodeId, newProperties) {
        try {
            // 参数安全检查
            if (!nodeId || typeof nodeId !== 'string') {
                console.warn('Neo4j Editor: Invalid nodeId provided to saveNodeProperties');
                return false;
            }
            if (!newProperties || typeof newProperties !== 'object') {
                console.warn('Neo4j Editor: Invalid newProperties provided to saveNodeProperties');
                return false;
            }
            
            console.log('Neo4j Editor: Saving node properties for node:', nodeId);
            
            // 使用graphDataManager更新节点
            if (window.graphDataManager && typeof window.graphDataManager.updateNode === 'function') {
                return window.graphDataManager.updateNode(nodeId, newProperties);
            }
            
            console.error('Neo4j Editor: graphDataManager not available');
            return false;
        } catch (error) {
            console.error('Neo4j Editor: Error saving node properties:', error);
            return false;
        }
    }

    /**
     * 保存边属性
     * @param {string} edgeId - 边ID
     * @param {Object} newProperties - 新的属性对象
     * @returns {boolean} 是否保存成功
     */
    saveEdgeProperties(edgeId, newProperties) {
        try {
            // 参数安全检查
            if (!edgeId || typeof edgeId !== 'string') {
                console.warn('Neo4j Editor: Invalid edgeId provided to saveEdgeProperties');
                return false;
            }
            if (!newProperties || typeof newProperties !== 'object') {
                console.warn('Neo4j Editor: Invalid newProperties provided to saveEdgeProperties');
                return false;
            }
            
            console.log('Neo4j Editor: Saving edge properties for edge:', edgeId);
            
            // 使用graphDataManager更新边
            if (window.graphDataManager && typeof window.graphDataManager.updateEdge === 'function') {
                return window.graphDataManager.updateEdge(edgeId, newProperties);
            }
            
            console.error('Neo4j Editor: graphDataManager not available');
            return false;
        } catch (error) {
            console.error('Neo4j Editor: Error saving edge properties:', error);
            return false;
        }
    }

    /**
     * 更新节点标签
     * @param {string} nodeId - 节点ID
     * @param {Array} newLabels - 新的标签数组
     * @returns {boolean} 是否更新成功
     */
    updateNodeLabels(nodeId, newLabels) {
        try {
            // 参数安全检查
            if (!nodeId || typeof nodeId !== 'string') {
                console.warn('Neo4j Editor: Invalid nodeId provided to updateNodeLabels');
                return false;
            }
            if (!Array.isArray(newLabels)) {
                console.warn('Neo4j Editor: Invalid newLabels provided to updateNodeLabels');
                return false;
            }
            
            console.log('Neo4j Editor: Updating node labels for node:', nodeId);
            
            // 使用graphDataManager更新节点标签
            if (window.graphDataManager && typeof window.graphDataManager.updateNode === 'function') {
                return window.graphDataManager.updateNode(nodeId, { labels: newLabels });
            }
            
            console.error('Neo4j Editor: graphDataManager not available');
            return false;
        } catch (error) {
            console.error('Neo4j Editor: Error updating node labels:', error);
            return false;
        }
    }

    /**
     * 更新边类型
     * @param {string} edgeId - 边ID
     * @param {string} newType - 新的边类型
     * @returns {boolean} 是否更新成功
     */
    updateEdgeType(edgeId, newType) {
        try {
            // 参数安全检查
            if (!edgeId || typeof edgeId !== 'string') {
                console.warn('Neo4j Editor: Invalid edgeId provided to updateEdgeType');
                return false;
            }
            if (!newType || typeof newType !== 'string') {
                console.warn('Neo4j Editor: Invalid newType provided to updateEdgeType');
                return false;
            }
            
            console.log('Neo4j Editor: Updating edge type for edge:', edgeId);
            
            // 使用graphDataManager更新边类型
            if (window.graphDataManager && typeof window.graphDataManager.updateEdge === 'function') {
                return window.graphDataManager.updateEdge(edgeId, { type: newType });
            }
            
            console.error('Neo4j Editor: graphDataManager not available');
            return false;
        } catch (error) {
            console.error('Neo4j Editor: Error updating edge type:', error);
            return false;
        }
    }

    /**
     * 获取当前选中的元素
     * @returns {Object} 选中元素信息 {elementId, elementType}
     */
    getSelectedElement() {
        return {
            elementId: this.selectedNode || this.selectedEdge || null,
            elementType: this.selectedNode ? 'node' : (this.selectedEdge ? 'edge' : null)
        };
    }

    /**
     * 设置属性编辑器引用
     * @param {Object} editor - 属性编辑器实例
     * @returns {boolean} 设置是否成功
     */
    setPropertyEditor(editor) {
        try {
            if (!editor || typeof editor !== 'object') {
                console.warn('Neo4j Editor: Invalid property editor provided');
                return false;
            }
            
            this.propertyEditor = editor;
            return true;
        } catch (error) {
            console.error('Neo4j Editor: Error setting property editor:', error);
            return false;
        }
    }
}

// 创建图编辑器实例
const graphEditorInstance = new GraphEditor();

// 暴露到全局命名空间
window.graphEditor = graphEditorInstance;

// 使用统一的向后兼容函数映射结构
const backwardCompatibilityMapping = [
    { deprecatedName: 'selectNode', newFunction: graphEditorInstance.selectNode, context: graphEditorInstance },
    { deprecatedName: 'selectEdge', newFunction: graphEditorInstance.selectEdge, context: graphEditorInstance },
    { deprecatedName: 'clearSelection', newFunction: graphEditorInstance.clearSelection, context: graphEditorInstance },
    { deprecatedName: 'createNode', newFunction: graphEditorInstance.createNode, context: graphEditorInstance },
    { deprecatedName: 'createEdge', newFunction: graphEditorInstance.createEdge, context: graphEditorInstance },
    { deprecatedName: 'deleteNode', newFunction: graphEditorInstance.deleteNode, context: graphEditorInstance },
    { deprecatedName: 'deleteEdge', newFunction: graphEditorInstance.deleteEdge, context: graphEditorInstance },
    { deprecatedName: 'saveNodeProperties', newFunction: graphEditorInstance.saveNodeProperties, context: graphEditorInstance },
    { deprecatedName: 'saveEdgeProperties', newFunction: graphEditorInstance.saveEdgeProperties, context: graphEditorInstance },
    { deprecatedName: 'updateNodeLabels', newFunction: graphEditorInstance.updateNodeLabels, context: graphEditorInstance },
    { deprecatedName: 'updateEdgeType', newFunction: graphEditorInstance.updateEdgeType, context: graphEditorInstance }
];

// 注册所有向后兼容函数
backwardCompatibilityMapping.forEach(funcInfo => {
    try {
        // 确保函数名称有效
        if (!funcInfo.deprecatedName || typeof funcInfo.newFunction !== 'function') {
            console.error(`注册向后兼容函数失败: 无效的函数信息`, funcInfo);
            return;
        }
        
        if (typeof window[funcInfo.deprecatedName] === 'undefined') {
            window[funcInfo.deprecatedName] = createBackwardCompatibilityFunction(
                funcInfo.deprecatedName,
                funcInfo.newFunction,
                funcInfo.context
            );
        }
    } catch (error) {
        console.error(`注册向后兼容函数 ${funcInfo.deprecatedName || '未知函数'} 失败:`, error);
    }
});

// 定义模块名称和注册信息
const moduleName = 'views/graphEditor';
const moduleRegistrationInfo = {
    name: moduleName,
    version: '1.0.1',
    dependencies: ['data/graphDataManager'],
    module: graphEditorInstance
};

// 确保modules对象存在
if (window.neo4jEditor && typeof window.neo4jEditor.modules === 'undefined') {
    window.neo4jEditor.modules = {};
}

// 使用统一的模块注册方法
if (window.neo4jEditor && typeof window.neo4jEditor.registerModule === 'function') {
    try {
        window.neo4jEditor.registerModule(moduleRegistrationInfo);
        console.log(`Neo4j Editor: views/graphEditor module registered successfully`);
    } catch (registrationError) {
        console.error(`Neo4j Editor: Failed to register views/graphEditor module:`, registrationError);
        
        // 降级方案：直接注册到modules对象
        try {
            if (!window.neo4jEditor.modules[moduleName]) {
                window.neo4jEditor.modules[moduleName] = {
                    name: moduleRegistrationInfo.name,
                    version: moduleRegistrationInfo.version,
                    initialized: graphEditorInstance.initialized,
                    dependencies: moduleRegistrationInfo.dependencies,
                    module: moduleRegistrationInfo.module
                };
                console.log(`Neo4j Editor: views/graphEditor module registered via fallback to modules object`);
            }
        } catch (fallbackError) {
            // 终极降级方案：直接挂载到全局
            if (typeof window.appModule === 'undefined') {
                window.appModule = {};
            }
            window.appModule.graphEditor = graphEditorInstance;
            console.log(`Neo4j Editor: views/graphEditor module registered via final fallback to appModule`);
        }
    }
} else {
    // 降级方案：直接挂载到全局
    if (typeof window.appModule === 'undefined') {
        window.appModule = {};
    }
    window.appModule.graphEditor = graphEditorInstance;
    console.log(`Neo4j Editor: views/graphEditor module registered via fallback to appModule`);
}

// 多模块系统支持 - 确保兼容性
// CommonJS 模块支持
if (typeof module !== 'undefined' && typeof module.exports !== 'undefined') {
    module.exports = graphEditorInstance;
}

// ES 模块支持
if (typeof exports !== 'undefined' && typeof exports === 'object') {
    Object.defineProperty(exports, '__esModule', { value: true });
    if (typeof module !== 'undefined') module.exports = graphEditorInstance;
    exports.default = graphEditorInstance;
}

// AMD 模块支持
if (typeof define === 'function' && define.amd) {
    define(['data/graphDataManager'], function() {
        return graphEditorInstance;
    });
}

// 修复ES模块导出错误
if (typeof export !== 'undefined') {
    try {
        // 尝试使用正确的ES模块导出语法
        if (typeof exports !== 'undefined' && typeof module !== 'undefined') {
            // 已经在上面处理
        }
    } catch (e) {
        // ES模块导出在不支持的环境下会报错，静默忽略
        console.debug('Neo4j Editor: ES module export not supported in this environment');
    }
}