/**
 * 节点类型管理模块 - 处理节点类型按钮的点击事件和管理
 */

// 创建命名空间
window.neo4jEditor = window.neo4jEditor || {};
window.neo4jEditor.views = window.neo4jEditor.views || {};
window.neo4jEditor.views.nodeTypeManager = {
    // 节点类型样式配置
    nodeTypeStyles: {
        'Person': {
            color: '#2196F3',
            icon: 'fa-user',
            properties: [
                { key: 'name', type: 'string', defaultValue: 'New Person' },
                { key: 'age', type: 'number', defaultValue: 30 }
            ]
        },
        'Movie': {
            color: '#FF9800',
            icon: 'fa-film',
            properties: [
                { key: 'title', type: 'string', defaultValue: 'New Movie' },
                { key: 'year', type: 'number', defaultValue: 2024 }
            ]
        },
        'Book': {
            color: '#4CAF50',
            icon: 'fa-book',
            properties: [
                { key: 'title', type: 'string', defaultValue: 'New Book' },
                { key: 'author', type: 'string', defaultValue: 'Unknown' }
            ]
        }
    },
    
    // 关系类型样式配置
    relationshipTypeStyles: {
        'KNOWS': {
            color: '#9C27B0',
            properties: [
                { key: 'since', type: 'number', defaultValue: 2023 }
            ]
        },
        'ACTED_IN': {
            color: '#E91E63',
            properties: [
                { key: 'role', type: 'string', defaultValue: '' }
            ]
        },
        'WROTE': {
            color: '#607D8B',
            properties: [
                { key: 'date', type: 'string', defaultValue: '' }
            ]
        }
    },
    
    // 当前选中的节点类型
    selectedNodeType: null,
    
    // 当前选中的关系类型
    selectedRelationshipType: null,
    
    /**
     * 初始化节点类型管理器
     */
    init: function() {
        try {
            // 加载保存的样式
            this.loadNodeTypeStyles();
            
            // 渲染节点类型和关系类型按钮
            this.renderNodeTypeButtons();
            
            console.log('节点类型管理器初始化完成');
        } catch (error) {
            console.error('节点类型管理器初始化失败:', error);
        }
    },
    
    /**
     * 从localStorage加载节点类型样式
     */
    loadNodeTypeStyles: function() {
        try {
            const saved = localStorage.getItem('neo4j-editor-node-types');
            
            if (saved) {
                try {
                    const parsed = JSON.parse(saved);
                    if (typeof parsed === 'object' && parsed !== null) {
                        this.nodeTypeStyles = parsed;
                    }
                } catch (parseError) {
                    console.error('解析节点类型样式失败:', parseError);
                }
            }
        } catch (error) {
            console.error('加载节点类型样式失败:', error);
        }
    },
    
    /**
     * 保存节点类型样式到localStorage
     */
    saveNodeTypeStyles: function() {
        try {
            localStorage.setItem('neo4j-editor-node-types', JSON.stringify(this.nodeTypeStyles));
        } catch (error) {
            console.error('保存节点类型样式失败:', error);
        }
    },
    
    /**
     * 渲染节点类型和关系类型按钮
     */
    renderNodeTypeButtons: function() {
        try {
            // 初始化节点类型按钮
            const nodeTypesContainer = document.querySelectorAll('.panel')[0]?.querySelector('.panel-content');
            if (nodeTypesContainer) {
                // 获取现有的节点类型按钮
                const existingButtons = nodeTypesContainer.querySelectorAll('.node-type-btn');
                
                // 为现有按钮添加点击事件
                existingButtons.forEach(button => {
                    this.addNodeTypeButtonEvents(button);
                });
                
                // 如果没有选中的节点类型，默认选中第一个
                if (!this.selectedNodeType && existingButtons.length > 0) {
                    const firstButton = existingButtons[0];
                    this.selectedNodeType = firstButton.dataset.type;
                    firstButton.classList.add('active');
                }
            }
            
            // 初始化关系类型按钮
            const relationshipTypesContainer = document.querySelectorAll('.panel')[1]?.querySelector('.panel-content');
            if (relationshipTypesContainer) {
                // 获取现有的关系类型按钮
                const existingButtons = relationshipTypesContainer.querySelectorAll('.node-type-btn');
                
                // 为现有按钮添加点击事件
                existingButtons.forEach(button => {
                    this.addRelationshipTypeButtonEvents(button);
                });
            }
        } catch (error) {
            console.error('渲染节点类型按钮失败:', error);
        }
    },
    
    /**
     * 为节点类型按钮添加事件处理
     */
    addNodeTypeButtonEvents: function(button) {
        if (!button) return;
        
        // 设置点击事件
        button.addEventListener('click', () => {
            const clickedType = button.dataset.type;
            this.selectedNodeType = clickedType;
            
            // 移除所有按钮的active类
            document.querySelectorAll('.node-type-btn').forEach(btn => {
                btn.classList.remove('active');
            });
            
            // 添加当前按钮的active类
            button.classList.add('active');
            
            // 通知其他组件节点类型已改变
            this.notifyNodeTypeChanged(clickedType);
            
            // 显示提示信息
            this.showToast(`已选择节点类型: ${clickedType}`);
        });
        
        // 添加右键菜单功能
        button.addEventListener('contextmenu', (e) => {
            e.preventDefault();
            const typeName = button.dataset.type;
            
            // 这里可以实现右键菜单功能
            console.log('右键点击了节点类型:', typeName);
            
            // 简单的编辑/删除功能
            if (confirm(`是否编辑节点类型 "${typeName}"?`)) {
                // 这里可以打开编辑模态框
                console.log('编辑节点类型:', typeName);
            }
        });
    },
    
    /**
     * 为关系类型按钮添加事件处理
     */
    addRelationshipTypeButtonEvents: function(button) {
        if (!button) return;
        
        // 设置点击事件
        button.addEventListener('click', () => {
            const clickedType = button.dataset.type;
            this.selectedRelationshipType = clickedType;
            
            // 移除所有按钮的active类
            document.querySelectorAll('.node-type-btn').forEach(btn => {
                btn.classList.remove('active');
            });
            
            // 添加当前按钮的active类
            button.classList.add('active');
            
            // 通知其他组件关系类型已改变
            this.notifyRelationshipTypeChanged(clickedType);
            
            // 显示提示信息
            this.showToast(`已选择关系类型: ${clickedType}`);
        });
    },
    
    /**
     * 通知节点类型已改变
     */
    notifyNodeTypeChanged: function(nodeType) {
        // 如果有事件总线，可以触发事件
        if (window.neo4jEditor?.core?.eventBus) {
            window.neo4jEditor.core.eventBus.emit('node-type-changed', { nodeType });
        }
    },
    
    /**
     * 通知关系类型已改变
     */
    notifyRelationshipTypeChanged: function(relationshipType) {
        // 如果有事件总线，可以触发事件
        if (window.neo4jEditor?.core?.eventBus) {
            window.neo4jEditor.core.eventBus.emit('relationship-type-changed', { relationshipType });
        }
    },
    
    /**
     * 显示提示信息
     */
    showToast: function(message, type = 'success') {
        // 如果有toast系统，使用toast显示
        if (window.showToast) {
            window.showToast(message, type);
        } else {
            console.log(message);
        }
    },
    
    /**
     * 获取当前选中的节点类型
     */
    getSelectedNodeType: function() {
        return this.selectedNodeType;
    },
    
    /**
     * 获取当前选中的关系类型
     */
    getSelectedRelationshipType: function() {
        return this.selectedRelationshipType;
    }
};

// 为了兼容性，也暴露到window对象
window.nodeTypeManager = window.neo4jEditor.views.nodeTypeManager;

// 导出模块（支持CommonJS和ES模块）
if (typeof module !== 'undefined' && module.exports) {
    module.exports = window.neo4jEditor.views.nodeTypeManager;
}

// 在DOM加载完成后初始化
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => window.nodeTypeManager.init());
} else {
    window.nodeTypeManager.init();
}