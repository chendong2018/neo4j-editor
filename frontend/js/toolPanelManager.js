/**
 * 工具面板管理器模块
 */

/**
 * 工具面板管理器对象
 */
const toolPanelManager = {
    /**
     * 初始化工具面板
     */
    init: function() {
        this.initPanelTabs();
        this.initNodeTypePanel();
        this.initRelationshipTypePanel();
        this.initToolPanel();
        this.loadSavedPanelState();
    },
    
    /**
     * 初始化面板标签切换
     */
    initPanelTabs: function() {
        const tabs = document.querySelectorAll('.panel-tab');
        tabs.forEach(tab => {
            tab.addEventListener('click', () => {
                // 移除所有标签的激活状态
                tabs.forEach(t => t.classList.remove('bg-blue-500', 'text-white'));
                tabs.forEach(t => t.classList.add('bg-gray-200', 'text-gray-800'));
                
                // 激活当前标签
                tab.classList.remove('bg-gray-200', 'text-gray-800');
                tab.classList.add('bg-blue-500', 'text-white');
                
                // 隐藏所有面板
                const panels = document.querySelectorAll('.panel-content');
                panels.forEach(panel => panel.classList.add('hidden'));
                
                // 显示对应面板
                const targetPanelId = tab.getAttribute('data-target');
                if (targetPanelId) {
                    const targetPanel = document.getElementById(targetPanelId);
                    if (targetPanel) {
                        targetPanel.classList.remove('hidden');
                        // 保存当前面板状态
                        localStorage.setItem('activePanel', targetPanelId);
                    }
                }
            });
        });
    },
    
    /**
     * 初始化节点类型面板
     */
    initNodeTypePanel: function() {
        // 加载节点类型按钮
        if (typeof window.loadNodeTypeStyles === 'function') {
            window.loadNodeTypeStyles();
        }
        
        // 绑定添加节点类型按钮事件
        const addNodeTypeBtn = document.getElementById('add-node-type-btn');
        if (addNodeTypeBtn) {
            addNodeTypeBtn.addEventListener('click', () => {
                const nodeTypeName = prompt('请输入节点类型名称:');
                if (nodeTypeName && nodeTypeName.trim()) {
                    if (typeof window.addNodeType === 'function') {
                        window.addNodeType(nodeTypeName.trim());
                        window.showToast(`节点类型 "${nodeTypeName.trim()}" 已添加`, 'success');
                    }
                }
            });
        }
        
        // 绑定节点类型删除按钮事件委托
        const nodeTypesContainer = document.getElementById('node-types-container');
        if (nodeTypesContainer) {
            nodeTypesContainer.addEventListener('click', (e) => {
                if (e.target.classList.contains('delete-node-type-btn')) {
                    const nodeType = e.target.getAttribute('data-node-type');
                    if (nodeType && confirm(`确定要删除节点类型 "${nodeType}" 吗？`)) {
                        if (typeof window.deleteNodeType === 'function') {
                            window.deleteNodeType(nodeType);
                            window.showToast(`节点类型 "${nodeType}" 已删除`, 'info');
                        }
                    }
                }
            });
        }
    },
    
    /**
     * 初始化关系类型面板
     */
    initRelationshipTypePanel: function() {
        // 加载关系类型按钮
        if (typeof window.loadRelationshipTypeStyles === 'function') {
            window.loadRelationshipTypeStyles();
        }
        
        // 绑定添加关系类型按钮事件
        const addRelationshipTypeBtn = document.getElementById('add-relationship-type-btn');
        if (addRelationshipTypeBtn) {
            addRelationshipTypeBtn.addEventListener('click', () => {
                const relationshipTypeName = prompt('请输入关系类型名称:');
                if (relationshipTypeName && relationshipTypeName.trim()) {
                    if (typeof window.addRelationshipType === 'function') {
                        window.addRelationshipType(relationshipTypeName.trim());
                        window.showToast(`关系类型 "${relationshipTypeName.trim()}" 已添加`, 'success');
                    }
                }
            });
        }
        
        // 绑定关系类型删除按钮事件委托
        const relationshipTypesContainer = document.getElementById('relationship-types-container');
        if (relationshipTypesContainer) {
            relationshipTypesContainer.addEventListener('click', (e) => {
                if (e.target.classList.contains('delete-relationship-type-btn')) {
                    const relationshipType = e.target.getAttribute('data-relationship-type');
                    if (relationshipType && confirm(`确定要删除关系类型 "${relationshipType}" 吗？`)) {
                        if (typeof window.deleteRelationshipType === 'function') {
                            window.deleteRelationshipType(relationshipType);
                            window.showToast(`关系类型 "${relationshipType}" 已删除`, 'info');
                        }
                    }
                }
            });
        }
    },
    
    /**
     * 初始化工具面板
     */
    initToolPanel: function() {
        // 绑定布局切换按钮
        const treeLayoutBtn = document.getElementById('tree-layout-btn');
        const networkLayoutBtn = document.getElementById('network-layout-btn');
        
        if (treeLayoutBtn && networkLayoutBtn) {
            treeLayoutBtn.addEventListener('click', () => {
                this.switchView('tree');
            });
            
            networkLayoutBtn.addEventListener('click', () => {
                this.switchView('network');
            });
        }
        
        // 绑定布局参数按钮
        const layoutParamsBtn = document.getElementById('layout-params-btn');
        if (layoutParamsBtn) {
            layoutParamsBtn.addEventListener('click', () => {
                // 这里可以打开布局参数设置面板
                window.showToast('布局参数设置功能开发中...', 'info');
            });
        }
    },
    
    /**
     * 切换视图（树视图/网络图视图）
     * @param {string} viewType - 视图类型 ('tree', 'network')
     */
    switchView: function(viewType) {
        const treeView = document.getElementById('tree-view');
        const networkView = document.getElementById('network-view');
        const treeLayoutBtn = document.getElementById('tree-layout-btn');
        const networkLayoutBtn = document.getElementById('network-layout-btn');
        
        if (!treeView || !networkView || !treeLayoutBtn || !networkLayoutBtn) return;
        
        if (viewType === 'tree') {
            // 激活树视图
            treeView.classList.remove('hidden');
            networkView.classList.add('hidden');
            treeLayoutBtn.classList.add('bg-blue-500', 'text-white');
            treeLayoutBtn.classList.remove('bg-gray-200', 'text-gray-800');
            networkLayoutBtn.classList.remove('bg-blue-500', 'text-white');
            networkLayoutBtn.classList.add('bg-gray-200', 'text-gray-800');
            
            // 如果已经初始化了树视图，更新布局
            if (window.cyTree) {
                window.cyTree.layout(window.treeLayoutConfig).run();
            }
        } else if (viewType === 'network') {
            // 激活网络图视图
            networkView.classList.remove('hidden');
            treeView.classList.add('hidden');
            networkLayoutBtn.classList.add('bg-blue-500', 'text-white');
            networkLayoutBtn.classList.remove('bg-gray-200', 'text-gray-800');
            treeLayoutBtn.classList.remove('bg-blue-500', 'text-white');
            treeLayoutBtn.classList.add('bg-gray-200', 'text-gray-800');
            
            // 如果已经初始化了网络图视图，更新布局
            if (window.cyNetwork) {
                window.cyNetwork.layout(window.networkLayoutConfig).run();
            }
        }
        
        // 保存当前视图状态
        localStorage.setItem('activeView', viewType);
    },
    
    /**
     * 从localStorage加载保存的面板状态
     */
    loadSavedPanelState: function() {
        // 加载活动面板
        const activePanel = localStorage.getItem('activePanel');
        if (activePanel) {
            const activePanelTab = document.querySelector(`.panel-tab[data-target="${activePanel}"]`);
            if (activePanelTab) {
                activePanelTab.click();
            }
        }
        
        // 加载活动视图
        const activeView = localStorage.getItem('activeView');
        if (activeView) {
            this.switchView(activeView);
        } else {
            // 默认显示树视图
            this.switchView('tree');
        }
    },
    
    /**
     * 更新面板内容
     * @param {string} panelId - 面板ID
     * @param {string} content - 新的面板内容
     */
    updatePanelContent: function(panelId, content) {
        const panel = document.getElementById(panelId);
        if (panel) {
            panel.innerHTML = content;
        }
    },
    
    /**
     * 添加节点类型按钮到面板
     * @param {string} typeName - 类型名称
     * @param {Object} style - 样式对象
     */
    addNodeTypeButton: function(typeName, style = {}) {
        const container = document.getElementById('node-types-container');
        if (!container) return;
        
        // 创建按钮元素
        const button = document.createElement('button');
        button.className = 'node-type-btn bg-white border border-gray-300 rounded-md px-3 py-2 m-1 flex items-center justify-between text-left';
        button.setAttribute('data-node-type', typeName);
        
        // 设置样式
        if (style.backgroundColor) {
            button.style.backgroundColor = style.backgroundColor;
        }
        if (style.color) {
            button.style.color = style.color;
        }
        
        // 设置按钮内容
        button.innerHTML = `
            <span class="node-type-name">${typeName}</span>
            <button class="delete-node-type-btn text-red-500 hover:text-red-700" data-node-type="${typeName}">
                <i class="fas fa-trash-alt"></i>
            </button>
        `;
        
        // 添加到容器
        container.appendChild(button);
        
        // 绑定点击事件
        button.addEventListener('click', (e) => {
            // 防止点击删除按钮时触发节点类型选择
            if (!e.target.closest('.delete-node-type-btn')) {
                // 设置当前节点类型
                window.selectedNodeType = typeName;
                
                // 更新按钮样式
                document.querySelectorAll('.node-type-btn').forEach(btn => {
                    btn.classList.remove('ring-2', 'ring-blue-500');
                });
                button.classList.add('ring-2', 'ring-blue-500');
                
                // 设置为节点模式
                if (typeof window.setMode === 'function') {
                    window.setMode('node');
                }
            }
        });
    },
    
    /**
     * 添加关系类型按钮到面板
     * @param {string} typeName - 类型名称
     * @param {Object} style - 样式对象
     */
    addRelationshipTypeButton: function(typeName, style = {}) {
        const container = document.getElementById('relationship-types-container');
        if (!container) return;
        
        // 创建按钮元素
        const button = document.createElement('button');
        button.className = 'relationship-type-btn bg-white border border-gray-300 rounded-md px-3 py-2 m-1 flex items-center justify-between text-left';
        button.setAttribute('data-relationship-type', typeName);
        
        // 设置样式
        if (style.lineColor) {
            button.style.backgroundColor = style.lineColor;
        }
        if (style.color) {
            button.style.color = style.color;
        }
        
        // 设置按钮内容
        button.innerHTML = `
            <span class="relationship-type-name">${typeName}</span>
            <button class="delete-relationship-type-btn text-red-500 hover:text-red-700" data-relationship-type="${typeName}">
                <i class="fas fa-trash-alt"></i>
            </button>
        `;
        
        // 添加到容器
        container.appendChild(button);
        
        // 绑定点击事件
        button.addEventListener('click', (e) => {
            // 防止点击删除按钮时触发关系类型选择
            if (!e.target.closest('.delete-relationship-type-btn')) {
                // 设置当前关系类型
                window.selectedRelationshipType = typeName;
                
                // 更新按钮样式
                document.querySelectorAll('.relationship-type-btn').forEach(btn => {
                    btn.classList.remove('ring-2', 'ring-blue-500');
                });
                button.classList.add('ring-2', 'ring-blue-500');
                
                // 设置为关系模式
                if (typeof window.setMode === 'function') {
                    window.setMode('relationship');
                }
            }
        });
    },
    
    /**
     * 清除节点类型按钮
     */
    clearNodeTypeButtons: function() {
        const container = document.getElementById('node-types-container');
        if (container) {
            container.innerHTML = '';
        }
    },
    
    /**
     * 清除关系类型按钮
     */
    clearRelationshipTypeButtons: function() {
        const container = document.getElementById('relationship-types-container');
        if (container) {
            container.innerHTML = '';
        }
    }
};

// 导出全局方法
window.switchView = function(viewType) {
    return toolPanelManager.switchView(viewType);
};

// 初始化工具面板管理器
window.addEventListener('DOMContentLoaded', () => {
    toolPanelManager.init();
});