/**
 * Neo4j编辑器剪贴板管理器模块
 * 负责处理节点和关系的复制粘贴功能
 */

/**
 * 剪贴板管理器模块
 * @namespace clipboardManagerModule
 */
const clipboardManagerModule = {
    initialized: false,
    
    /**
     * 剪贴板数据
     * @private
     */
    _clipboard: null,
    
    /**
     * 剪贴板操作类型
     * @private
     */
    _clipboardType: null,
    
    /**
     * 初始化剪贴板管理器
     */
    initialize: function() {
        if (this.initialized) {
            console.warn('剪贴板管理器已经初始化');
            return;
        }
        
        try {
            this._clipboard = null;
            this._clipboardType = null;
            
            // 注册事件监听
            this.setupEventListeners();
            
            this.initialized = true;
            console.log('Neo4j Editor: 剪贴板管理器初始化完成');
        } catch (error) {
            console.error('Neo4j Editor: 剪贴板管理器初始化失败:', error);
            if (window.utilsModule && window.utilsModule.handleError) {
                window.utilsModule.handleError(error, '剪贴板管理器初始化');
            }
        }
    },
    
    /**
     * 设置事件监听器
     * @private
     */
    setupEventListeners: function() {
        try {
            // 监听全局事件管理器的复制粘贴事件
            if (window.eventManagerModule) {
                window.eventManagerModule.on('element.copy', this.copySelectedElements.bind(this));
                window.eventManagerModule.on('element.paste', this.pasteElements.bind(this));
            }
        } catch (error) {
            console.error('Neo4j Editor: 设置剪贴板事件监听失败:', error);
        }
    },
    
    /**
     * 复制选中的元素
     */
    copySelectedElements: function() {
        try {
            // 获取Cytoscape实例
            const cytoscapeModule = window.cytoscapeModule;
            if (!cytoscapeModule || !cytoscapeModule.getCy) {
                console.warn('Neo4j Editor: Cytoscape模块未初始化');
                return false;
            }
            
            const cy = cytoscapeModule.getCy();
            if (!cy) {
                console.warn('Neo4j Editor: 未找到Cytoscape实例');
                return false;
            }
            
            // 获取选中的元素
            const selectedElements = cy.elements('node:selected, edge:selected');
            
            if (selectedElements.length === 0) {
                if (window.utilsModule && window.utilsModule.showToast) {
                    window.utilsModule.showToast('没有选中任何元素可复制', 'warning');
                }
                return false;
            }
            
            // 序列化元素数据
            const elementsData = selectedElements.map(element => {
                const data = element.data();
                // 移除ID和位置信息（将在粘贴时重新生成）
                const copyData = JSON.parse(JSON.stringify(data));
                delete copyData.id;
                delete copyData.source;
                delete copyData.target;
                
                // 保存元素类型
                copyData._type = element.isNode() ? 'node' : 'edge';
                
                return copyData;
            });
            
            // 保存到剪贴板
            this._clipboard = elementsData;
            this._clipboardType = elementsData.length === 1 ? 
                elementsData[0]._type : 'mixed';
            
            // 显示成功提示
            const utils = window.utilsModule || {};
            if (utils.showToast) {
                utils.showToast(`已复制 ${elementsData.length} 个元素`, 'success');
            }
            
            console.log('Neo4j Editor: 元素已复制到剪贴板', elementsData);
            return true;
        } catch (error) {
            console.error('Neo4j Editor: 复制元素失败:', error);
            if (window.utilsModule && window.utilsModule.handleError) {
                window.utilsModule.handleError(error, '复制元素');
            }
            return false;
        }
    },
    
    /**
     * 粘贴元素
     * @param {Object} options - 粘贴选项
     * @param {number} [options.offsetX=50] - X轴偏移量
     * @param {number} [options.offsetY=50] - Y轴偏移量
     */
    pasteElements: function(options = {}) {
        try {
            // 检查剪贴板是否有数据
            if (!this._clipboard || this._clipboard.length === 0) {
                if (window.utilsModule && window.utilsModule.showToast) {
                    window.utilsModule.showToast('剪贴板为空', 'warning');
                }
                return false;
            }
            
            // 获取Cytoscape实例
            const cytoscapeModule = window.cytoscapeModule;
            if (!cytoscapeModule || !cytoscapeModule.getCy) {
                console.warn('Neo4j Editor: Cytoscape模块未初始化');
                return false;
            }
            
            const cy = cytoscapeModule.getCy();
            if (!cy) {
                console.warn('Neo4j Editor: 未找到Cytoscape实例');
                return false;
            }
            
            // 设置默认偏移量
            const offsetX = options.offsetX || 50;
            const offsetY = options.offsetY || 50;
            
            // 生成新ID映射
            const idMap = {};
            const newElements = [];
            
            // 生成节点
            const nodesData = this._clipboard.filter(item => item._type === 'node');
            const edgesData = this._clipboard.filter(item => item._type === 'edge');
            
            // 生成新节点并建立ID映射
            nodesData.forEach((nodeData, index) => {
                const newId = this._generateUniqueId();
                idMap[`temp_${index}`] = newId; // 使用临时ID建立映射
                
                // 创建新节点数据
                const newNodeData = JSON.parse(JSON.stringify(nodeData));
                newNodeData.id = newId;
                
                // 设置默认位置（如果没有提供）
                if (!newNodeData.position) {
                    // 获取画布中心或当前视图中心
                    const viewport = cy.viewport();
                    const center = viewport.center();
                    newNodeData.position = {
                        x: center.x + (index % 5) * offsetX,
                        y: center.y + Math.floor(index / 5) * offsetY
                    };
                }
                
                newElements.push({ data: newNodeData });
            });
            
            // 生成新边并更新源目标引用
            edgesData.forEach((edgeData, index) => {
                // 找到对应的节点
                // 注意：这里需要根据原始节点的属性来匹配，因为ID已经改变
                // 这是一个简化的实现，实际可能需要更复杂的匹配逻辑
                const newId = this._generateUniqueId();
                const newEdgeData = JSON.parse(JSON.stringify(edgeData));
                newEdgeData.id = newId;
                
                // 如果是从单个节点复制的边，需要特殊处理
                if (nodesData.length === 1) {
                    // 边连接到同一个节点（自环）
                    newEdgeData.source = idMap['temp_0'];
                    newEdgeData.target = idMap['temp_0'];
                } else if (nodesData.length >= 2 && index < nodesData.length - 1) {
                    // 连接不同的节点
                    newEdgeData.source = idMap[`temp_${index}`];
                    newEdgeData.target = idMap[`temp_${index + 1}`];
                } else {
                    // 默认连接到第一个和最后一个节点
                    newEdgeData.source = idMap['temp_0'];
                    newEdgeData.target = idMap[`temp_${nodesData.length - 1}`];
                }
                
                newElements.push({ data: newEdgeData });
            });
            
            // 添加新元素到图中
            if (newElements.length > 0) {
                cy.add(newElements);
                
                // 选中新添加的元素
                const newElementIds = newElements.map(el => el.data.id);
                cy.elements().unselect();
                cy.elements(`#${newElementIds.join(', #')}`).select();
                
                // 显示成功提示
                const utils = window.utilsModule || {};
                if (utils.showToast) {
                    utils.showToast(`已粘贴 ${newElements.length} 个元素`, 'success');
                }
                
                console.log('Neo4j Editor: 元素已粘贴', newElements);
                return true;
            }
            
            return false;
        } catch (error) {
            console.error('Neo4j Editor: 粘贴元素失败:', error);
            if (window.utilsModule && window.utilsModule.handleError) {
                window.utilsModule.handleError(error, '粘贴元素');
            }
            return false;
        }
    },
    
    /**
     * 剪切选中的元素
     * 复制并删除选中的元素
     */
    cutSelectedElements: function() {
        try {
            // 先复制
            const copied = this.copySelectedElements();
            
            if (copied) {
                // 然后删除
                const cytoscapeModule = window.cytoscapeModule;
                if (cytoscapeModule && cytoscapeModule.deleteSelectedElements) {
                    cytoscapeModule.deleteSelectedElements();
                }
                
                console.log('Neo4j Editor: 元素已剪切');
                return true;
            }
            
            return false;
        } catch (error) {
            console.error('Neo4j Editor: 剪切元素失败:', error);
            if (window.utilsModule && window.utilsModule.handleError) {
                window.utilsModule.handleError(error, '剪切元素');
            }
            return false;
        }
    },
    
    /**
     * 清空剪贴板
     */
    clearClipboard: function() {
        this._clipboard = null;
        this._clipboardType = null;
        console.log('Neo4j Editor: 剪贴板已清空');
    },
    
    /**
     * 获取剪贴板状态
     * @returns {Object} 剪贴板状态对象
     */
    getClipboardStatus: function() {
        return {
            hasData: !!this._clipboard,
            type: this._clipboardType,
            count: this._clipboard ? this._clipboard.length : 0
        };
    },
    
    /**
     * 生成唯一ID
     * @private
     * @returns {string} 唯一ID
     */
    _generateUniqueId: function() {
        const utils = window.utilsModule || {};
        if (utils.generateUniqueId) {
            return utils.generateUniqueId('neo4j');
        }
        return `neo4j_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
};

// 为了向后兼容，暴露到全局
window.clipboardManagerModule = clipboardManagerModule;

// 如果支持模块导出，则导出
if (typeof module !== 'undefined' && typeof module.exports !== 'undefined') {
    module.exports = clipboardManagerModule;
}

// 向后兼容的全局函数
window.copySelectedElements = function() {
    console.warn('copySelectedElements 已弃用，请使用 clipboardManagerModule.copySelectedElements()');
    return clipboardManagerModule.copySelectedElements();
};

window.pasteElements = function(options) {
    console.warn('pasteElements 已弃用，请使用 clipboardManagerModule.pasteElements()');
    return clipboardManagerModule.pasteElements(options);
};

console.log('Neo4j Editor: 剪贴板管理器模块已加载');
