// contextMenuManager.js - 上下文菜单管理器模块

/**
 * 上下文菜单管理器模块
 * 负责处理图元素的右键菜单操作
 */
const contextMenuManager = {
    /**
     * 初始化上下文菜单管理器
     */
    initialize: function() {
        console.log('Neo4j Editor: Context Menu Manager initialized');
        this.initializeContextMenu();
        this.setupElementContextMenu();
    },

    /**
     * 初始化上下文菜单DOM元素
     */
    initializeContextMenu: function() {
        // 检查是否已存在右键菜单
        if (document.getElementById('custom-context-menu')) {
            return;
        }
        
        // 创建右键菜单元素
        const contextMenu = document.createElement('div');
        contextMenu.id = 'custom-context-menu';
        contextMenu.className = 'context-menu';
        contextMenu.style.position = 'fixed';
        contextMenu.style.display = 'none';
        contextMenu.style.zIndex = '9999';
        contextMenu.style.background = '#fff';
        contextMenu.style.border = '1px solid #ddd';
        contextMenu.style.borderRadius = '4px';
        contextMenu.style.boxShadow = '0 2px 10px rgba(0,0,0,0.2)';
        contextMenu.style.padding = '4px 0';
        contextMenu.style.minWidth = '150px';
        
        // 添加到文档中
        document.body.appendChild(contextMenu);
        
        // 添加删除元素菜单项
        const deleteMenuItem = document.createElement('div');
        deleteMenuItem.className = 'context-menu-item';
        deleteMenuItem.innerHTML = '<i class="fas fa-trash-alt"></i> Delete';
        deleteMenuItem.style.padding = '8px 16px';
        deleteMenuItem.style.cursor = 'pointer';
        deleteMenuItem.style.display = 'flex';
        deleteMenuItem.style.alignItems = 'center';
        deleteMenuItem.style.gap = '8px';
        
        // 添加悬停效果
        deleteMenuItem.addEventListener('mouseenter', function() {
            this.style.background = '#f5f5f5';
        });
        
        deleteMenuItem.addEventListener('mouseleave', function() {
            this.style.background = 'transparent';
        });
        
        // 添加点击事件
        deleteMenuItem.addEventListener('click', function() {
            const selectedElements = contextMenuManager.getSelectedElements();
            
            if (selectedElements && selectedElements.length > 0) {
                // 调用删除函数
                if (window.removeElementFromViews) {
                    selectedElements.forEach(element => {
                        window.removeElementFromViews(element.id());
                    });
                } else {
                    // 直接从视图中删除
                    selectedElements.forEach(element => {
                        // 从所有视图中删除
                        if (window.cyTree) {
                            window.cyTree.getElementById(element.id()).remove();
                        }
                        if (window.cyNetwork) {
                            window.cyNetwork.getElementById(element.id()).remove();
                        }
                        if (window.cy) {
                            window.cy.getElementById(element.id()).remove();
                        }
                    });
                }
                
                // 显示成功消息
                if (window.showToast) {
                    window.showToast('Element(s) deleted successfully', 'success');
                }
            }
            
            // 隐藏菜单
            contextMenu.style.display = 'none';
        });
        
        contextMenu.appendChild(deleteMenuItem);
        
        // 阻止右键菜单默认行为
        document.addEventListener('contextmenu', function(e) {
            // 检查是否在Cytoscape容器内
            const isInCytoscapeContainer = e.target.closest('#cy-tree') || 
                                          e.target.closest('#cy-network') ||
                                          e.target.closest('#cy');
            
            if (isInCytoscapeContainer) {
                e.preventDefault();
            }
        });
        
        // 点击其他地方关闭菜单
        document.addEventListener('click', function() {
            contextMenu.style.display = 'none';
        });
        
        console.log('Neo4j Editor: Custom context menu created');
    },

    /**
     * 显示自定义右键菜单
     * @param {Event} event - 右键事件
     * @param {Array|Object} options - 菜单项选项
     */
    showContextMenu: function(event, options) {
        const contextMenu = document.getElementById('custom-context-menu');
        if (!contextMenu) {
            this.initializeContextMenu();
            return;
        }
        
        // 清空现有菜单
        contextMenu.innerHTML = '';
        
        // 阻止事件冒泡
        event.preventDefault();
        event.stopPropagation();
        
        // 处理菜单项
        if (Array.isArray(options)) {
            options.forEach(option => {
                const menuItem = document.createElement('div');
                menuItem.className = 'context-menu-item';
                
                // 设置图标和文本
                if (option.icon) {
                    menuItem.innerHTML = `<i class="${option.icon}"></i> ${option.text}`;
                } else {
                    menuItem.textContent = option.text;
                }
                
                menuItem.style.padding = '8px 16px';
                menuItem.style.cursor = 'pointer';
                menuItem.style.display = 'flex';
                menuItem.style.alignItems = 'center';
                menuItem.style.gap = '8px';
                
                // 添加悬停效果
                menuItem.addEventListener('mouseenter', function() {
                    this.style.background = '#f5f5f5';
                });
                
                menuItem.addEventListener('mouseleave', function() {
                    this.style.background = 'transparent';
                });
                
                // 添加点击事件
                if (option.action) {
                    menuItem.addEventListener('click', function() {
                        option.action();
                        contextMenu.style.display = 'none';
                    });
                }
                
                contextMenu.appendChild(menuItem);
            });
        } else if (typeof options === 'object') {
            // 简化格式
            Object.keys(options).forEach(key => {
                const menuItem = document.createElement('div');
                menuItem.className = 'context-menu-item';
                menuItem.textContent = key;
                menuItem.style.padding = '8px 16px';
                menuItem.style.cursor = 'pointer';
                
                // 添加悬停效果
                menuItem.addEventListener('mouseenter', function() {
                    this.style.background = '#f5f5f5';
                });
                
                menuItem.addEventListener('mouseleave', function() {
                    this.style.background = 'transparent';
                });
                
                // 添加点击事件
                menuItem.addEventListener('click', function() {
                    options[key]();
                    contextMenu.style.display = 'none';
                });
                
                contextMenu.appendChild(menuItem);
            });
        }
        
        // 设置菜单位置
        contextMenu.style.left = event.pageX + 'px';
        contextMenu.style.top = event.pageY + 'px';
        contextMenu.style.display = 'block';
        
        // 调整位置以避免溢出
        const rect = contextMenu.getBoundingClientRect();
        if (rect.right > window.innerWidth) {
            contextMenu.style.left = (event.pageX - rect.width) + 'px';
        }
        if (rect.bottom > window.innerHeight) {
            contextMenu.style.top = (event.pageY - rect.height) + 'px';
        }
    },

    /**
     * 设置元素右键菜单
     */
    setupElementContextMenu: function() {
        // 为树视图设置右键菜单
        if (window.cyTree) {
            this.setupCytoscapeContextMenu(window.cyTree, 'tree');
        }
        
        // 为网络图视图设置右键菜单
        if (window.cyNetwork) {
            this.setupCytoscapeContextMenu(window.cyNetwork, 'network');
        }
        
        // 为主视图设置右键菜单
        if (window.cy) {
            this.setupCytoscapeContextMenu(window.cy, 'main');
        }
        
        console.log('Neo4j Editor: Element context menus configured');
    },

    /**
     * 为Cytoscape实例设置右键菜单
     * @param {Object} cy - Cytoscape实例
     * @param {string} viewType - 视图类型
     */
    setupCytoscapeContextMenu: function(cy, viewType) {
        if (!cy) return;
        
        // 为节点设置右键菜单
        cy.on('cxttap', 'node', function(event) {
            const node = event.target;
            
            const menuOptions = [
                {
                    text: 'Edit Properties',
                    icon: 'fas fa-edit',
                    action: function() {
                        // 调用编辑节点属性函数
                        if (window.propertyEditor && window.propertyEditor.editNodeProperties) {
                            window.propertyEditor.editNodeProperties(cy, node.id());
                        } else {
                            contextMenuManager.editNodeProperties(cy, node.id());
                        }
                    }
                },
                {
                    text: 'Add Relationship',
                    icon: 'fas fa-link',
                    action: function() {
                        // 切换到关系模式
                        window.currentMode = 'relationship';
                        
                        // 设置起始节点
                        window.startNode = node;
                        
                        // 重新安装监听器
                        if (window.reinstallAllTapListeners) {
                            window.reinstallAllTapListeners();
                        }
                        
                        // 显示提示
                        if (window.showToast) {
                            window.showToast('Select target node to create relationship', 'info');
                        }
                    }
                },
                {
                    text: 'Delete',
                    icon: 'fas fa-trash-alt',
                    action: function() {
                        // 删除节点
                        contextMenuManager.deleteElement(node);
                    }
                }
            ];
            
            // 显示菜单
            contextMenuManager.showContextMenu(event, menuOptions);
        });
        
        // 为边设置右键菜单
        cy.on('cxttap', 'edge', function(event) {
            const edge = event.target;
            
            const menuOptions = [
                {
                    text: 'Edit Properties',
                    icon: 'fas fa-edit',
                    action: function() {
                        // 调用编辑边属性函数
                        if (window.propertyEditor && window.propertyEditor.editEdgeProperties) {
                            window.propertyEditor.editEdgeProperties(cy, edge.id());
                        } else {
                            contextMenuManager.editEdgeProperties(cy, edge.id());
                        }
                    }
                },
                {
                    text: 'Delete',
                    icon: 'fas fa-trash-alt',
                    action: function() {
                        // 删除边
                        contextMenuManager.deleteElement(edge);
                    }
                }
            ];
            
            // 显示菜单
            contextMenuManager.showContextMenu(event, menuOptions);
        });
        
        // 为背景设置右键菜单
        cy.on('cxttap', function(event) {
            if (event.target === cy) {
                const menuOptions = [
                    {
                        text: 'Create Node',
                        icon: 'fas fa-plus-circle',
                        action: function() {
                            // 切换到节点模式
                            window.currentMode = 'node';
                            
                            // 重新安装监听器
                            if (window.reinstallAllTapListeners) {
                                window.reinstallAllTapListeners();
                            }
                            
                            // 显示提示
                            if (window.showToast) {
                                window.showToast('Click to create new node', 'info');
                            }
                        }
                    },
                    {
                        text: 'Clear Selection',
                        icon: 'fas fa-times',
                        action: function() {
                            // 清除选择
                            cy.elements().unselect();
                        }
                    }
                ];
                
                // 显示菜单
                contextMenuManager.showContextMenu(event, menuOptions);
            }
        });
    },

    /**
     * 获取选中的元素
     * @returns {Array} 选中的元素数组
     */
    getSelectedElements: function() {
        let selectedElements = [];
        
        // 检查所有视图
        const views = [window.cyTree, window.cyNetwork, window.cy];
        
        views.forEach(view => {
            if (view) {
                const selected = view.$(':selected');
                if (selected && selected.length > 0) {
                    selectedElements = selectedElements.concat(selected);
                }
            }
        });
        
        return selectedElements;
    },

    /**
     * 删除元素
     * @param {Object} element - Cytoscape元素
     */
    deleteElement: function(element) {
        if (!element) return;
        
        try {
            const elementId = element.id();
            const elementType = element.isNode() ? 'Node' : 'Relationship';
            
            // 从所有视图中删除
            if (window.cyTree) {
                window.cyTree.getElementById(elementId).remove();
            }
            if (window.cyNetwork) {
                window.cyNetwork.getElementById(elementId).remove();
            }
            if (window.cy) {
                window.cy.getElementById(elementId).remove();
            }
            
            // 更新共享数据
            if (window.sharedGraphData) {
                if (element.isNode()) {
                    // 删除节点及其相关的边
                    window.sharedGraphData.nodes = window.sharedGraphData.nodes.filter(
                        n => n.data && n.data.id !== elementId
                    );
                    
                    window.sharedGraphData.edges = window.sharedGraphData.edges.filter(
                        e => e.data && e.data.source !== elementId && e.data.target !== elementId
                    );
                } else {
                    // 只删除边
                    window.sharedGraphData.edges = window.sharedGraphData.edges.filter(
                        e => e.data && e.data.id !== elementId
                    );
                }
                
                // 重新同步视图
                if (window.viewSync && window.viewSync.syncGraphData) {
                    window.viewSync.syncGraphData(window.sharedGraphData);
                }
            }
            
            // 显示成功消息
            if (window.showToast) {
                window.showToast(`${elementType} deleted successfully`, 'success');
            }
            
        } catch (err) {
            console.error('Neo4j Editor: Error deleting element:', err);
            
            if (window.showToast) {
                window.showToast('Failed to delete element: ' + err.message, 'error');
            }
        }
    },

    /**
     * 编辑节点属性
     * @param {Object} cy - Cytoscape实例
     * @param {string} nodeId - 节点ID
     */
    editNodeProperties: function(cy, nodeId) {
        // 查找节点数据
        const node = cy.getElementById(nodeId);
        if (!node || node.length === 0) {
            console.error('Neo4j Editor: Node not found for property editing');
            return;
        }
        
        // 调用全局selectNode函数
        if (window.selectNode) {
            window.selectNode(node);
        }
        
        // 显示节点属性面板
        const propertiesPanel = document.getElementById('node-properties-panel');
        if (propertiesPanel) {
            propertiesPanel.style.display = 'block';
        }
        
        // 设置应用按钮的节点ID
        const applyButton = document.getElementById('apply-button');
        if (applyButton) {
            applyButton.dataset.nodeId = nodeId;
        }
        
        // 渲染节点属性
        this.renderNodeProperties(node.json(), document.getElementById('node-properties'));
    },

    /**
     * 编辑边属性
     * @param {Object} cy - Cytoscape实例
     * @param {string} edgeId - 边ID
     */
    editEdgeProperties: function(cy, edgeId) {
        // 查找边数据
        const edge = cy.getElementById(edgeId);
        if (!edge || edge.length === 0) {
            console.error('Neo4j Editor: Edge not found for property editing');
            if (window.showToast) {
                window.showToast('Edge not found for property editing', 'error');
            }
            return;
        }
        
        // 显示提示信息
        if (window.showToast) {
            window.showToast('Edge property editing is not fully implemented', 'info');
        }
    },

    /**
     * 渲染节点属性
     * @param {Object} nodeData - 节点数据
     * @param {HTMLElement} container - 容器元素
     */
    renderNodeProperties: function(nodeData, container) {
        if (!container || !nodeData || !nodeData.data) {
            return;
        }
        
        // 清空容器
        container.innerHTML = '';
        
        // 创建标题
        const title = document.createElement('h3');
        title.textContent = 'Node Properties: ' + (nodeData.data.label || 'Untitled');
        container.appendChild(title);
        
        // 添加现有属性输入框
        const properties = nodeData.data;
        Object.keys(properties).forEach(key => {
            if (key === 'id' || key === 'tags') return;
            
            const propGroup = document.createElement('div');
            propGroup.className = 'property-group';
            
            const label = document.createElement('label');
            label.textContent = key + ':';
            label.className = 'property-label';
            
            const input = document.createElement('input');
            input.type = 'text';
            input.className = 'property-input';
            input.value = properties[key] || '';
            input.dataset.propertyKey = key;
            
            propGroup.appendChild(label);
            propGroup.appendChild(input);
            container.appendChild(propGroup);
        });
    }
};

// 注册到全局命名空间
if (typeof window.neo4jEditor === 'object') {
    window.neo4jEditor.contextMenuManager = contextMenuManager;
} else {
    window.contextMenuManager = contextMenuManager;
}

// 自动初始化
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', contextMenuManager.initialize.bind(contextMenuManager));
} else {
    contextMenuManager.initialize();
}

console.log('Neo4j Editor: contextMenuManager module loaded');

// 导出模块
export default contextMenuManager;