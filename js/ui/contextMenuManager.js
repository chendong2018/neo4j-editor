/**
 * 上下文菜单管理器模块 - 负责处理Neo4j编辑器中的上下文菜单功能
 */

// 确保命名空间存在
if (typeof window.neo4jEditor === 'undefined') {
    window.neo4jEditor = {};
}

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
            console.warn(`警告: 直接调用 ${deprecatedName}() 已弃用，请使用适当的模块化方式调用`);
        }
        return newFunction.apply(context || null, arguments);
    };
}

/**
 * 上下文菜单管理器模块
 */
const contextMenuManagerModule = {
    /**
     * 初始化状态标记
     */
    initialized: false,
    
    /**
     * 初始化上下文菜单功能
     * @returns {boolean} 初始化是否成功
     */
    initialize: function() {
        console.log('Neo4j Editor: Initializing context menu');
        
        try {
            // 创建上下文菜单元素
            this.createContextMenuElement();
            
            // 设置全局点击事件来关闭菜单
            document.addEventListener('click', function() {
                contextMenuManagerModule.hide();
            });
            
            console.log('Neo4j Editor: Context menu initialized successfully');
            
            // 标记模块为已初始化
            this.initialized = true;
            return true;
        } catch (error) {
            console.error('Neo4j Editor: Error initializing context menu:', error);
            return false;
        }
    },

    /**
     * 创建上下文菜单DOM元素
     * @returns {HTMLElement|null} 创建的菜单元素或null（如果失败）
     */
    createContextMenuElement: function() {
        try {
            // 检查是否已存在
            let contextMenu = document.getElementById('neo4j-editor-context-menu');
            if (contextMenu) {
                contextMenu.remove();
            }
            
            // 创建新的菜单元素
            contextMenu = document.createElement('div');
            contextMenu.id = 'neo4j-editor-context-menu';
            contextMenu.className = 'neo4j-editor-context-menu';
            contextMenu.style.position = 'fixed';
            contextMenu.style.display = 'none';
            contextMenu.style.backgroundColor = '#fff';
            contextMenu.style.border = '1px solid #ddd';
            contextMenu.style.borderRadius = '4px';
            contextMenu.style.boxShadow = '0 2px 10px rgba(0,0,0,0.15)';
            contextMenu.style.padding = '4px 0';
            contextMenu.style.minWidth = '150px';
            contextMenu.style.zIndex = '10000';
            contextMenu.style.fontFamily = 'Arial, sans-serif';
            contextMenu.style.fontSize = '14px';
            
            // 阻止菜单内的点击事件冒泡，防止菜单关闭
            contextMenu.addEventListener('click', function(e) {
                e.stopPropagation();
            });
            
            // 添加到文档
            document.body.appendChild(contextMenu);
            return contextMenu;
        } catch (error) {
            console.error('Neo4j Editor: Error creating context menu element:', error);
            return null;
        }
    },

    /**
     * 显示上下文菜单
     * @param {Object} position - 菜单位置 {x, y}
     * @param {Array} items - 菜单项数组 [{id, label, icon, action}]
     * @param {Object} target - 触发菜单的目标对象
     * @returns {boolean} 是否成功显示菜单
     */
    show: function(position, items, target) {
        console.log('Neo4j Editor: Showing context menu', items);
        
        try {
            // 参数安全检查
            if (!position || !position.x || !position.y || !items || !Array.isArray(items) || items.length === 0) {
                console.warn('Neo4j Editor: Invalid parameters for showing context menu');
                return false;
            }
            
            const contextMenu = document.getElementById('neo4j-editor-context-menu');
            if (!contextMenu) {
                console.warn('Neo4j Editor: Context menu element not found');
                return false;
            }
            
            // 清空菜单
            contextMenu.innerHTML = '';
            
            // 添加菜单项
            items.forEach(function(item) {
                try {
                    // 参数安全检查
                    if (!item) return;
                    
                    // 如果有分隔符
                    if (item.separator) {
                        const separator = document.createElement('div');
                        separator.className = 'neo4j-editor-context-menu-separator';
                        separator.style.height = '1px';
                        separator.style.backgroundColor = '#eee';
                        separator.style.margin = '4px 0';
                        contextMenu.appendChild(separator);
                    } else if (item.label) {
                        const menuItem = document.createElement('div');
                        menuItem.className = 'neo4j-editor-context-menu-item';
                        menuItem.textContent = item.label;
                        menuItem.style.padding = '8px 16px';
                        menuItem.style.cursor = 'pointer';
                        menuItem.style.whiteSpace = 'nowrap';
                        menuItem.style.color = '#333';
                        
                        // 添加悬停效果
                        menuItem.addEventListener('mouseenter', function() {
                            this.style.backgroundColor = '#f5f5f5';
                        });
                        
                        menuItem.addEventListener('mouseleave', function() {
                            this.style.backgroundColor = 'transparent';
                        });
                        
                        // 添加点击事件
                        menuItem.addEventListener('click', function() {
                            contextMenuManagerModule.hide();
                            if (typeof item.action === 'function') {
                                try {
                                    item.action(target);
                                } catch (actionError) {
                                    console.error('Neo4j Editor: Error executing menu action:', actionError);
                                }
                            }
                        });
                        
                        contextMenu.appendChild(menuItem);
                    }
                } catch (itemError) {
                    console.error('Neo4j Editor: Error adding menu item:', itemError);
                }
            });
            
            // 设置位置
            contextMenu.style.left = position.x + 'px';
            contextMenu.style.top = position.y + 'px';
            
            // 检查是否超出视口
            const menuRect = contextMenu.getBoundingClientRect();
            const viewportWidth = window.innerWidth;
            const viewportHeight = window.innerHeight;
            
            if (menuRect.right > viewportWidth) {
                contextMenu.style.left = (position.x - menuRect.width) + 'px';
            }
            
            if (menuRect.bottom > viewportHeight) {
                contextMenu.style.top = (position.y - menuRect.height) + 'px';
            }
            
            // 显示菜单
            contextMenu.style.display = 'block';
            
            // 保存当前目标
            contextMenu.dataset.targetId = target && target.id ? target.id : '';
            
            return true;
        } catch (error) {
            console.error('Neo4j Editor: Error showing context menu:', error);
            return false;
        }
    },

    /**
     * 隐藏上下文菜单
     */
    hide: function() {
        try {
            const contextMenu = document.getElementById('neo4j-editor-context-menu');
            if (contextMenu) {
                contextMenu.style.display = 'none';
                contextMenu.dataset.targetId = '';
            }
        } catch (error) {
            console.error('Neo4j Editor: Error hiding context menu:', error);
        }
    },

    /**
     * 生成节点的上下文菜单项
     * @param {Object} node - Cytoscape节点对象
     * @returns {Array} 菜单项数组
     */
    getNodeMenuItems: function(node) {
        try {
            if (!node) {
                console.warn('Neo4j Editor: Invalid node object for context menu');
                return [];
            }
            
            return [
                {
                    id: 'edit-node',
                    label: '编辑节点',
                    action: function() {
                        if (typeof window.editNode === 'function') {
                            try {
                                window.editNode(node);
                            } catch (error) {
                                console.error('Neo4j Editor: Error in editNode action:', error);
                            }
                        }
                    }
                },
                {
                    id: 'add-child',
                    label: '添加子节点',
                    action: function() {
                        if (typeof window.addChildNode === 'function') {
                            try {
                                window.addChildNode(node);
                            } catch (error) {
                                console.error('Neo4j Editor: Error in addChildNode action:', error);
                            }
                        }
                    }
                },
                {
                    id: 'add-relationship',
                    label: '添加关系',
                    action: function() {
                        if (typeof window.addRelationship === 'function') {
                            try {
                                window.addRelationship(node);
                            } catch (error) {
                                console.error('Neo4j Editor: Error in addRelationship action:', error);
                            }
                        }
                    }
                },
                {
                    separator: true
                },
                {
                    id: 'copy-node',
                    label: '复制节点',
                    action: function() {
                        if (typeof window.copyNode === 'function') {
                            try {
                                window.copyNode(node);
                            } catch (error) {
                                console.error('Neo4j Editor: Error in copyNode action:', error);
                            }
                        }
                    }
                },
                {
                    id: 'delete-node',
                    label: '删除节点',
                    action: function() {
                        if (typeof window.deleteNode === 'function') {
                            try {
                                window.deleteNode(node);
                            } catch (error) {
                                console.error('Neo4j Editor: Error in deleteNode action:', error);
                            }
                        }
                    }
                }
            ];
        } catch (error) {
            console.error('Neo4j Editor: Error generating node menu items:', error);
            return [];
        }
    },

    /**
     * 生成边的上下文菜单项
     * @param {Object} edge - Cytoscape边对象
     * @returns {Array} 菜单项数组
     */
    getEdgeMenuItems: function(edge) {
        try {
            if (!edge) {
                console.warn('Neo4j Editor: Invalid edge object for context menu');
                return [];
            }
            
            return [
                {
                    id: 'edit-edge',
                    label: '编辑关系',
                    action: function() {
                        if (typeof window.editEdge === 'function') {
                            try {
                                window.editEdge(edge);
                            } catch (error) {
                                console.error('Neo4j Editor: Error in editEdge action:', error);
                            }
                        }
                    }
                },
                {
                    id: 'delete-edge',
                    label: '删除关系',
                    action: function() {
                        if (typeof window.deleteEdge === 'function') {
                            try {
                                window.deleteEdge(edge);
                            } catch (error) {
                                console.error('Neo4j Editor: Error in deleteEdge action:', error);
                            }
                        }
                    }
                }
            ];
        } catch (error) {
            console.error('Neo4j Editor: Error generating edge menu items:', error);
            return [];
        }
    },

    /**
     * 生成空白区域的上下文菜单项
     * @returns {Array} 菜单项数组
     */
    getBackgroundMenuItems: function() {
        try {
            return [
                {
                    id: 'add-node',
                    label: '添加节点',
                    action: function() {
                        if (window.graphDataManager && typeof window.graphDataManager.addNode === 'function') {
                            try {
                                window.graphDataManager.addNode();
                            } catch (error) {
                                console.error('Neo4j Editor: Error in addNode action:', error);
                            }
                        }
                    }
                },
                {
                    id: 'import-data',
                    label: '导入数据',
                    action: function() {
                        if (window.graphDataManager && typeof window.graphDataManager.importData === 'function') {
                            try {
                                window.graphDataManager.importData();
                            } catch (error) {
                                console.error('Neo4j Editor: Error in importData action:', error);
                            }
                        }
                    }
                },
                {
                    separator: true
                },
                {
                    id: 'export-data',
                    label: '导出数据',
                    action: function() {
                        if (window.graphDataManager && typeof window.graphDataManager.exportData === 'function') {
                            try {
                                window.graphDataManager.exportData();
                            } catch (error) {
                                console.error('Neo4j Editor: Error in exportData action:', error);
                            }
                        }
                    }
                },
                {
                    id: 'clear-graph',
                    label: '清空图表',
                    action: function() {
                        if (window.graphDataManager && typeof window.graphDataManager.clearGraph === 'function') {
                            try {
                                window.graphDataManager.clearGraph();
                            } catch (error) {
                                console.error('Neo4j Editor: Error in clearGraph action:', error);
                            }
                        }
                    }
                }
            ];
        } catch (error) {
            console.error('Neo4j Editor: Error generating background menu items:', error);
            return [];
        }
    },

    /**
     * 生成视图特定的上下文菜单项
     * @param {string} viewType - 视图类型 'tree' 或 'network'
     * @returns {Array} 菜单项数组
     */
    getViewMenuItems: function(viewType) {
        try {
            // 参数安全检查
            if (!viewType || (viewType !== 'tree' && viewType !== 'network')) {
                console.warn('Neo4j Editor: Invalid viewType parameter');
                viewType = 'network'; // 默认使用network视图
            }
            
            const items = [];
            
            // 通用视图操作
            items.push({
                id: 'zoom-in',
                label: '放大',
                action: function() {
                    try {
                        const cy = viewType === 'tree' ? window.cyTree : window.cyNetwork;
                        if (cy) {
                            cy.zoom(cy.zoom() * 1.2);
                        }
                    } catch (error) {
                        console.error('Neo4j Editor: Error in zoom-in action:', error);
                    }
                }
            });
            
            items.push({
                id: 'zoom-out',
                label: '缩小',
                action: function() {
                    try {
                        const cy = viewType === 'tree' ? window.cyTree : window.cyNetwork;
                        if (cy) {
                            cy.zoom(cy.zoom() * 0.8);
                        }
                    } catch (error) {
                        console.error('Neo4j Editor: Error in zoom-out action:', error);
                    }
                }
            });
            
            items.push({
                id: 'fit-view',
                label: '适配视图',
                action: function() {
                    try {
                        const cy = viewType === 'tree' ? window.cyTree : window.cyNetwork;
                        if (cy) {
                            cy.fit();
                        }
                    } catch (error) {
                        console.error('Neo4j Editor: Error in fit-view action:', error);
                    }
                }
            });
            
            items.push({ separator: true });
            
            // 视图特定操作
            if (viewType === 'tree') {
                items.push({
                    id: 'refresh-tree',
                    label: '刷新树布局',
                    action: function() {
                        try {
                            if (window.cyTree) {
                                window.cyTree.layout({
                                    name: 'cose',
                                    rankDir: 'TB'
                                }).run();
                            }
                        } catch (error) {
                            console.error('Neo4j Editor: Error in refresh-tree action:', error);
                        }
                    }
                });
            } else if (viewType === 'network') {
                items.push({
                    id: 'refresh-network',
                    label: '刷新网络布局',
                    action: function() {
                        try {
                            if (window.cyNetwork) {
                                window.cyNetwork.layout({
                                    name: 'cose-bilkent'
                                }).run();
                            }
                        } catch (error) {
                            console.error('Neo4j Editor: Error in refresh-network action:', error);
                        }
                    }
                });
            }
            
            return items;
        } catch (error) {
            console.error('Neo4j Editor: Error generating view menu items:', error);
            return [];
        }
    }
};

// 导出到window对象
window.contextMenuManager = contextMenuManagerModule;

// 使用映射数组统一管理向后兼容函数
const contextMenuBackwardCompatibilityFunctions = [
    { deprecatedName: 'initializeContextMenu', newFunction: contextMenuManagerModule.initialize, context: contextMenuManagerModule },
    { deprecatedName: 'showContextMenu', newFunction: contextMenuManagerModule.show, context: contextMenuManagerModule },
    { deprecatedName: 'getNodeContextMenuItems', newFunction: contextMenuManagerModule.getNodeMenuItems, context: contextMenuManagerModule },
    { deprecatedName: 'getEdgeContextMenuItems', newFunction: contextMenuManagerModule.getEdgeMenuItems, context: contextMenuManagerModule },
    { deprecatedName: 'getBackgroundContextMenuItems', newFunction: contextMenuManagerModule.getBackgroundMenuItems, context: contextMenuManagerModule },
    { deprecatedName: 'getViewContextMenuItems', newFunction: contextMenuManagerModule.getViewMenuItems, context: contextMenuManagerModule },
    { deprecatedName: 'hideContextMenu', newFunction: contextMenuManagerModule.hide, context: contextMenuManagerModule }
];

// 注册向后兼容函数
contextMenuBackwardCompatibilityFunctions.forEach(funcInfo => {
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

// 使用标准的模块注册方法
const moduleName = 'ui/contextMenuManager';
if (window.neo4jEditor && typeof window.neo4jEditor.registerModule === 'function') {
    try {
        window.neo4jEditor.registerModule({
            name: moduleName,
            version: '1.1.1',
            dependencies: ['core/init'],
            module: contextMenuManagerModule
        });
        console.log(`Neo4j Editor: ${moduleName} module registered successfully`);
    } catch (registrationError) {
        console.error(`Neo4j Editor: Failed to register ${moduleName} module:`, registrationError);
        
        // 降级方案：直接注册到modules对象
        if (typeof window.neo4jEditor.modules === 'undefined') {
            window.neo4jEditor.modules = {};
        }
        window.neo4jEditor.modules[moduleName] = {
            name: moduleName,
            version: '1.1.1',
            initialized: contextMenuManagerModule.initialized,
            dependencies: ['core/init'],
            module: contextMenuManagerModule
        };
        console.log(`Neo4j Editor: ${moduleName} module registered via fallback`);
    }
} else {
    // 降级方案：直接挂载到全局
    if (typeof window.appModule === 'undefined') {
        window.appModule = {};
    }
    window.appModule.contextMenuManager = contextMenuManagerModule;
}

// 多模块系统支持 - 确保兼容性
// CommonJS 模块支持
if (typeof module !== 'undefined' && typeof module.exports !== 'undefined') {
    module.exports = contextMenuManagerModule;
}

// ES 模块支持
if (typeof exports !== 'undefined' && typeof exports === 'object') {
    Object.defineProperty(exports, '__esModule', { value: true });
    if (typeof module !== 'undefined') module.exports = contextMenuManagerModule;
    exports.default = contextMenuManagerModule;
}

// AMD 模块支持
if (typeof define === 'function' && define.amd) {
    define(['core/init'], function() {
        return contextMenuManagerModule;
    });
}