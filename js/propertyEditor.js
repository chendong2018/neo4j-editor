// propertyEditor.js - 属性编辑器模块

/**
 * 属性编辑器模块
 * 负责处理节点和边的属性编辑功能
 */
const propertyEditor = {
    /**
     * 初始化属性编辑器
     */
    initialize: function() {
        console.log('Neo4j Editor: Property Editor initialized');
        this.initEventListeners();
    },

    /**
     * 初始化事件监听器
     */
    initEventListeners: function() {
        // 初始化添加属性功能
        this.initAddPropertyFunctionality();
    },

    /**
     * 初始化添加属性功能
     */
    initAddPropertyFunctionality: function() {
        const addPropertyBtn = document.getElementById('add-property-btn');
        if (addPropertyBtn) {
            addPropertyBtn.addEventListener('click', this.handleAddProperty.bind(this));
        }
    },

    /**
     * 渲染节点属性编辑界面
     * @param {Object} nodeData - 节点数据
     * @param {HTMLElement} container - 属性容器元素
     */
    renderNodeProperties: function(nodeData, container) {
        if (!container) {
            container = document.getElementById('node-properties');
        }
        
        if (!container || !nodeData || !nodeData.data) {
            console.error('Neo4j Editor: Invalid parameters for rendering node properties');
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
            // 跳过特殊属性
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
        
        // 创建添加新属性的部分
        const newPropSection = document.createElement('div');
        newPropSection.className = 'new-property-section';
        
        const newPropLabel = document.createElement('label');
        newPropLabel.textContent = 'Add New Property:';
        
        const newPropInput = document.createElement('input');
        newPropInput.type = 'text';
        newPropInput.placeholder = 'Property name';
        newPropInput.id = 'new-property-name';
        newPropInput.className = 'property-input';
        
        const newPropValue = document.createElement('input');
        newPropValue.type = 'text';
        newPropValue.placeholder = 'Property value';
        newPropValue.id = 'new-property-value';
        newPropValue.className = 'property-input';
        
        const newPropType = document.createElement('select');
        newPropType.id = 'new-property-type';
        newPropType.className = 'property-select';
        
        // 添加类型选项
        const types = ['string', 'number', 'boolean', 'date', 'array', 'object'];
        types.forEach(type => {
            const option = document.createElement('option');
            option.value = type;
            option.textContent = type;
            newPropType.appendChild(option);
        });
        
        const addBtn = document.createElement('button');
        addBtn.textContent = 'Add Property';
        addBtn.id = 'add-property-btn';
        addBtn.className = 'btn btn-primary';
        
        newPropSection.appendChild(newPropLabel);
        newPropSection.appendChild(newPropInput);
        newPropSection.appendChild(newPropValue);
        newPropSection.appendChild(newPropType);
        newPropSection.appendChild(addBtn);
        
        container.appendChild(newPropSection);
        
        // 重新绑定事件
        this.initAddPropertyFunctionality();
    },

    /**
     * 处理添加属性
     * @param {Event} event - 点击事件
     */
    handleAddProperty: function(event) {
        event.preventDefault();
        
        // 获取选中的元素ID
        const selectedNodeId = document.getElementById('apply-button')?.dataset.nodeId;
        if (!selectedNodeId) {
            if (window.showToast) {
                window.showToast('No node selected to add property to', 'error');
            }
            return;
        }
        
        // 获取属性名称和值
        const propName = document.getElementById('new-property-name')?.value;
        const propValue = document.getElementById('new-property-value')?.value;
        const propType = document.getElementById('new-property-type')?.value || 'string';
        
        // 验证输入
        if (!propName) {
            if (window.showToast) {
                window.showToast('Property name is required', 'error');
            }
            return;
        }
        
        // 查找选中的节点
        let selectedNode = null;
        
        // 检查所有视图
        if (window.cyTree) {
            selectedNode = window.cyTree.getElementById(selectedNodeId);
        }
        
        if (!selectedNode && window.cyNetwork) {
            selectedNode = window.cyNetwork.getElementById(selectedNodeId);
        }
        
        if (!selectedNode && window.cy) {
            selectedNode = window.cy.getElementById(selectedNodeId);
        }
        
        if (!selectedNode || selectedNode.length === 0) {
            if (window.showToast) {
                window.showToast('Selected node not found in any view', 'error');
            }
            return;
        }
        
        try {
            // 转换属性值类型
            let formattedValue = propValue;
            switch (propType) {
                case 'number':
                    formattedValue = parseFloat(propValue) || 0;
                    break;
                case 'boolean':
                    formattedValue = propValue.toLowerCase() === 'true' || propValue === '1';
                    break;
                case 'array':
                    try {
                        formattedValue = JSON.parse(propValue);
                        if (!Array.isArray(formattedValue)) {
                            formattedValue = [propValue];
                        }
                    } catch {
                        formattedValue = [propValue];
                    }
                    break;
                case 'object':
                    try {
                        formattedValue = JSON.parse(propValue);
                        if (typeof formattedValue !== 'object' || formattedValue === null) {
                            formattedValue = { value: propValue };
                        }
                    } catch {
                        formattedValue = { value: propValue };
                    }
                    break;
            }
            
            // 添加属性
            if (window.addPropertyToElement) {
                window.addPropertyToElement(selectedNodeId, propName, formattedValue);
            } else {
                // 直接设置属性
                selectedNode.data(propName, formattedValue);
                
                // 同步到其他视图
                if (window.viewSync && window.viewSync.syncGraphData && window.sharedGraphData) {
                    window.viewSync.syncGraphData(window.sharedGraphData);
                }
            }
            
            // 显示成功消息
            if (window.showToast) {
                window.showToast(`Property '${propName}' added successfully`, 'success');
            }
            
            // 重置表单
            if (document.getElementById('new-property-name')) {
                document.getElementById('new-property-name').value = '';
            }
            if (document.getElementById('new-property-value')) {
                document.getElementById('new-property-value').value = '';
            }
            
        } catch (err) {
            console.error('Neo4j Editor: Error adding property:', err);
            if (window.showToast) {
                window.showToast('Failed to add property: ' + err.message, 'error');
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
        
        // 显示边属性面板
        const edgePropertiesPanel = document.getElementById('edge-properties-panel');
        if (edgePropertiesPanel) {
            edgePropertiesPanel.style.display = 'block';
        }
        
        // 渲染边属性
        this.renderEdgeProperties(edge.json(), document.getElementById('edge-properties'));
    },

    /**
     * 渲染边属性编辑界面
     * @param {Object} edgeData - 边数据
     * @param {HTMLElement} container - 属性容器元素
     */
    renderEdgeProperties: function(edgeData, container) {
        if (!container) {
            container = document.getElementById('edge-properties');
        }
        
        if (!container || !edgeData || !edgeData.data) {
            console.error('Neo4j Editor: Invalid parameters for rendering edge properties');
            return;
        }
        
        // 清空容器
        container.innerHTML = '';
        
        // 创建标题
        const title = document.createElement('h3');
        title.textContent = 'Relationship Properties: ' + (edgeData.data.label || edgeData.data.type || 'Untitled');
        container.appendChild(title);
        
        // 添加现有属性输入框
        const properties = edgeData.data;
        Object.keys(properties).forEach(key => {
            // 跳过特殊属性
            if (key === 'id' || key === 'source' || key === 'target') return;
            
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
    },

    /**
     * 应用属性更改
     * @param {string} elementId - 元素ID
     * @param {Object} newProperties - 新属性对象
     */
    applyProperties: function(elementId, newProperties) {
        try {
            // 更新所有视图中的元素
            const updateElementInView = function(cyInstance) {
                if (!cyInstance) return false;
                
                const element = cyInstance.getElementById(elementId);
                if (element && element.length > 0) {
                    element.data(newProperties);
                    return true;
                }
                return false;
            };
            
            let updated = false;
            
            // 尝试在所有视图中更新
            if (window.cyTree) {
                updated = updated || updateElementInView(window.cyTree);
            }
            
            if (window.cyNetwork) {
                updated = updated || updateElementInView(window.cyNetwork);
            }
            
            if (window.cy) {
                updated = updated || updateElementInView(window.cy);
            }
            
            if (updated) {
                // 同步到共享数据
                if (window.sharedGraphData) {
                    // 更新共享数据中的节点
                    const nodeIndex = window.sharedGraphData.nodes.findIndex(n => n.data && n.data.id === elementId);
                    if (nodeIndex !== -1) {
                        Object.assign(window.sharedGraphData.nodes[nodeIndex].data, newProperties);
                    }
                    
                    // 更新共享数据中的边
                    const edgeIndex = window.sharedGraphData.edges.findIndex(e => e.data && e.data.id === elementId);
                    if (edgeIndex !== -1) {
                        Object.assign(window.sharedGraphData.edges[edgeIndex].data, newProperties);
                    }
                    
                    // 重新同步视图
                    if (window.viewSync && window.viewSync.syncGraphData) {
                        window.viewSync.syncGraphData(window.sharedGraphData);
                    }
                }
                
                return true;
            }
            
            return false;
        } catch (err) {
            console.error('Neo4j Editor: Error applying properties:', err);
            return false;
        }
    }
};

// 注册到全局命名空间
if (typeof window.neo4jEditor === 'object') {
    window.neo4jEditor.propertyEditor = propertyEditor;
} else {
    window.propertyEditor = propertyEditor;
}

// 自动初始化
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', propertyEditor.initialize.bind(propertyEditor));
} else {
    propertyEditor.initialize();
}

console.log('Neo4j Editor: propertyEditor module loaded');

// 导出模块
export default propertyEditor;