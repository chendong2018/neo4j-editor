/**
 * Neo4j编辑器历史记录管理器模块
 * 负责处理图形操作的撤销/重做功能
 */

/**
 * 历史记录管理器模块
 * @namespace historyManagerModule
 */
const historyManagerModule = {
    initialized: false,
    
    /**
     * 历史记录堆栈
     * @private
     */
    _historyStack: [],
    
    /**
     * 当前历史记录索引
     * @private
     */
    _currentIndex: -1,
    
    /**
     * 最大历史记录数量
     * @private
     */
    _maxHistorySize: 50,
    
    /**
     * 初始化历史记录管理器
     * @param {Object} options - 初始化选项
     * @param {number} [options.maxHistorySize=50] - 最大历史记录数量
     */
    initialize: function(options = {}) {
        if (this.initialized) {
            console.warn('历史记录管理器已经初始化');
            return;
        }
        
        try {
            this._historyStack = [];
            this._currentIndex = -1;
            this._maxHistorySize = options.maxHistorySize || 50;
            
            // 注册事件监听
            this.setupEventListeners();
            
            this.initialized = true;
            console.log('Neo4j Editor: 历史记录管理器初始化完成');
        } catch (error) {
            console.error('Neo4j Editor: 历史记录管理器初始化失败:', error);
            if (window.utilsModule && window.utilsModule.handleError) {
                window.utilsModule.handleError(error, '历史记录管理器初始化');
            }
        }
    },
    
    /**
     * 设置事件监听器
     * @private
     */
    setupEventListeners: function() {
        try {
            // 监听全局事件管理器的撤销/重做事件
            if (window.eventManagerModule) {
                window.eventManagerModule.on('graph.undo', this.undo.bind(this));
                window.eventManagerModule.on('graph.redo', this.redo.bind(this));
                
                // 监听图形变化事件
                window.eventManagerModule.on('graph.changed', this._handleGraphChange.bind(this));
            }
        } catch (error) {
            console.error('Neo4j Editor: 设置历史记录事件监听失败:', error);
        }
    },
    
    /**
     * 处理图形变化
     * @private
     * @param {Object} eventData - 事件数据
     */
    _handleGraphChange: function(eventData) {
        try {
            if (!eventData || !eventData.action) {
                return;
            }
            
            // 记录操作到历史
            this.recordAction(eventData);
        } catch (error) {
            console.error('Neo4j Editor: 处理图形变化失败:', error);
        }
    },
    
    /**
     * 记录操作到历史
     * @param {Object} actionData - 操作数据
     * @param {string} actionData.action - 操作类型：add, remove, update, move
     * @param {Object} actionData.elements - 受影响的元素
     * @param {Object} actionData.previousState - 操作前的状态
     */
    recordAction: function(actionData) {
        try {
            // 检查参数
            if (!actionData || !actionData.action) {
                console.warn('Neo4j Editor: 无效的操作数据');
                return;
            }
            
            // 如果当前不是在历史记录的末尾，清除后面的记录
            if (this._currentIndex < this._historyStack.length - 1) {
                this._historyStack = this._historyStack.slice(0, this._currentIndex + 1);
            }
            
            // 添加新操作到历史栈
            const timestamp = new Date().getTime();
            const historyItem = {
                id: this._generateHistoryId(),
                timestamp: timestamp,
                ...actionData
            };
            
            this._historyStack.push(historyItem);
            this._currentIndex++;
            
            // 限制历史记录数量
            if (this._historyStack.length > this._maxHistorySize) {
                this._historyStack.shift();
                this._currentIndex--;
            }
            
            console.log('Neo4j Editor: 记录操作到历史', historyItem);
            
            // 触发历史变化事件
            if (window.eventManagerModule) {
                window.eventManagerModule.trigger('history.changed', {
                    canUndo: this.canUndo(),
                    canRedo: this.canRedo()
                });
            }
        } catch (error) {
            console.error('Neo4j Editor: 记录操作失败:', error);
            if (window.utilsModule && window.utilsModule.handleError) {
                window.utilsModule.handleError(error, '记录操作到历史');
            }
        }
    },
    
    /**
     * 撤销上一步操作
     * @returns {boolean} 是否撤销成功
     */
    undo: function() {
        try {
            if (!this.canUndo()) {
                if (window.utilsModule && window.utilsModule.showToast) {
                    window.utilsModule.showToast('没有可撤销的操作', 'info');
                }
                return false;
            }
            
            const historyItem = this._historyStack[this._currentIndex];
            
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
            
            // 执行撤销操作
            let success = false;
            
            switch (historyItem.action) {
                case 'add':
                    success = this._undoAdd(cy, historyItem);
                    break;
                case 'remove':
                    success = this._undoRemove(cy, historyItem);
                    break;
                case 'update':
                    success = this._undoUpdate(cy, historyItem);
                    break;
                case 'move':
                    success = this._undoMove(cy, historyItem);
                    break;
                default:
                    console.warn(`Neo4j Editor: 未知的操作类型: ${historyItem.action}`);
                    success = false;
            }
            
            if (success) {
                this._currentIndex--;
                
                // 显示成功提示
                const utils = window.utilsModule || {};
                if (utils.showToast) {
                    utils.showToast('撤销成功', 'info');
                }
                
                // 触发历史变化事件
                if (window.eventManagerModule) {
                    window.eventManagerModule.trigger('history.changed', {
                        canUndo: this.canUndo(),
                        canRedo: this.canRedo()
                    });
                }
            }
            
            return success;
        } catch (error) {
            console.error('Neo4j Editor: 撤销操作失败:', error);
            if (window.utilsModule && window.utilsModule.handleError) {
                window.utilsModule.handleError(error, '撤销操作');
            }
            return false;
        }
    },
    
    /**
     * 重做操作
     * @returns {boolean} 是否重做成功
     */
    redo: function() {
        try {
            if (!this.canRedo()) {
                if (window.utilsModule && window.utilsModule.showToast) {
                    window.utilsModule.showToast('没有可重做的操作', 'info');
                }
                return false;
            }
            
            this._currentIndex++;
            const historyItem = this._historyStack[this._currentIndex];
            
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
            
            // 执行重做操作
            let success = false;
            
            switch (historyItem.action) {
                case 'add':
                    success = this._redoAdd(cy, historyItem);
                    break;
                case 'remove':
                    success = this._redoRemove(cy, historyItem);
                    break;
                case 'update':
                    success = this._redoUpdate(cy, historyItem);
                    break;
                case 'move':
                    success = this._redoMove(cy, historyItem);
                    break;
                default:
                    console.warn(`Neo4j Editor: 未知的操作类型: ${historyItem.action}`);
                    success = false;
            }
            
            if (success) {
                // 显示成功提示
                const utils = window.utilsModule || {};
                if (utils.showToast) {
                    utils.showToast('重做成功', 'info');
                }
                
                // 触发历史变化事件
                if (window.eventManagerModule) {
                    window.eventManagerModule.trigger('history.changed', {
                        canUndo: this.canUndo(),
                        canRedo: this.canRedo()
                    });
                }
            } else {
                // 回滚索引
                this._currentIndex--;
            }
            
            return success;
        } catch (error) {
            console.error('Neo4j Editor: 重做操作失败:', error);
            if (window.utilsModule && window.utilsModule.handleError) {
                window.utilsModule.handleError(error, '重做操作');
            }
            return false;
        }
    },
    
    /**
     * 撤销添加操作
     * @private
     */
    _undoAdd: function(cy, historyItem) {
        try {
            if (historyItem.elements && historyItem.elements.length > 0) {
                const ids = historyItem.elements.map(el => el.data.id);
                cy.elements(`#${ids.join(', #')}`).remove();
                return true;
            }
            return false;
        } catch (error) {
            console.error('Neo4j Editor: 撤销添加操作失败:', error);
            return false;
        }
    },
    
    /**
     * 重做添加操作
     * @private
     */
    _redoAdd: function(cy, historyItem) {
        try {
            if (historyItem.elements && historyItem.elements.length > 0) {
                cy.add(historyItem.elements);
                return true;
            }
            return false;
        } catch (error) {
            console.error('Neo4j Editor: 重做添加操作失败:', error);
            return false;
        }
    },
    
    /**
     * 撤销删除操作
     * @private
     */
    _undoRemove: function(cy, historyItem) {
        try {
            if (historyItem.previousState && historyItem.previousState.elements) {
                cy.add(historyItem.previousState.elements);
                return true;
            }
            return false;
        } catch (error) {
            console.error('Neo4j Editor: 撤销删除操作失败:', error);
            return false;
        }
    },
    
    /**
     * 重做删除操作
     * @private
     */
    _redoRemove: function(cy, historyItem) {
        try {
            if (historyItem.elements && historyItem.elements.length > 0) {
                const ids = historyItem.elements.map(el => el.data.id);
                cy.elements(`#${ids.join(', #')}`).remove();
                return true;
            }
            return false;
        } catch (error) {
            console.error('Neo4j Editor: 重做删除操作失败:', error);
            return false;
        }
    },
    
    /**
     * 撤销更新操作
     * @private
     */
    _undoUpdate: function(cy, historyItem) {
        try {
            if (historyItem.previousState && historyItem.previousState.elements) {
                historyItem.previousState.elements.forEach(element => {
                    const el = cy.getElementById(element.data.id);
                    if (el.length > 0) {
                        el.data(element.data);
                    }
                });
                return true;
            }
            return false;
        } catch (error) {
            console.error('Neo4j Editor: 撤销更新操作失败:', error);
            return false;
        }
    },
    
    /**
     * 重做更新操作
     * @private
     */
    _redoUpdate: function(cy, historyItem) {
        try {
            if (historyItem.elements && historyItem.elements.length > 0) {
                historyItem.elements.forEach(element => {
                    const el = cy.getElementById(element.data.id);
                    if (el.length > 0) {
                        el.data(element.data);
                    }
                });
                return true;
            }
            return false;
        } catch (error) {
            console.error('Neo4j Editor: 重做更新操作失败:', error);
            return false;
        }
    },
    
    /**
     * 撤销移动操作
     * @private
     */
    _undoMove: function(cy, historyItem) {
        try {
            if (historyItem.previousState && historyItem.previousState.positions) {
                Object.keys(historyItem.previousState.positions).forEach(id => {
                    const el = cy.getElementById(id);
                    if (el.length > 0 && el.isNode()) {
                        el.position(historyItem.previousState.positions[id]);
                    }
                });
                return true;
            }
            return false;
        } catch (error) {
            console.error('Neo4j Editor: 撤销移动操作失败:', error);
            return false;
        }
    },
    
    /**
     * 重做移动操作
     * @private
     */
    _redoMove: function(cy, historyItem) {
        try {
            if (historyItem.positions) {
                Object.keys(historyItem.positions).forEach(id => {
                    const el = cy.getElementById(id);
                    if (el.length > 0 && el.isNode()) {
                        el.position(historyItem.positions[id]);
                    }
                });
                return true;
            }
            return false;
        } catch (error) {
            console.error('Neo4j Editor: 重做移动操作失败:', error);
            return false;
        }
    },
    
    /**
     * 检查是否可以撤销
     * @returns {boolean} 是否可以撤销
     */
    canUndo: function() {
        return this._currentIndex >= 0;
    },
    
    /**
     * 检查是否可以重做
     * @returns {boolean} 是否可以重做
     */
    canRedo: function() {
        return this._currentIndex < this._historyStack.length - 1;
    },
    
    /**
     * 清空历史记录
     */
    clearHistory: function() {
        this._historyStack = [];
        this._currentIndex = -1;
        
        console.log('Neo4j Editor: 历史记录已清空');
        
        // 触发历史变化事件
        if (window.eventManagerModule) {
            window.eventManagerModule.trigger('history.changed', {
                canUndo: false,
                canRedo: false
            });
        }
    },
    
    /**
     * 获取历史记录状态
     * @returns {Object} 历史记录状态
     */
    getState: function() {
        return {
            canUndo: this.canUndo(),
            canRedo: this.canRedo(),
            historyCount: this._historyStack.length,
            currentIndex: this._currentIndex
        };
    },
    
    /**
     * 生成历史记录ID
     * @private
     * @returns {string} 唯一ID
     */
    _generateHistoryId: function() {
        const utils = window.utilsModule || {};
        if (utils.generateUniqueId) {
            return utils.generateUniqueId('history');
        }
        return `history_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
};

// 为了向后兼容，暴露到全局
window.historyManagerModule = historyManagerModule;

// 如果支持模块导出，则导出
if (typeof module !== 'undefined' && typeof module.exports !== 'undefined') {
    module.exports = historyManagerModule;
}

console.log('Neo4j Editor: 历史记录管理器模块已加载');
