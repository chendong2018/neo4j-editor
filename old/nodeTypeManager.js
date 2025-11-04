/**
 * 节点类型管理模块
 */

// 节点类型样式配置
window.nodeTypeStyles = {
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
};

// 关系类型样式配置
window.relationshipTypeStyles = {
    'child_of': {
        color: '#2196F3'
    },
    'relat_to': {
        color: '#FF9800'
    },
    'KNOWS': {
        color: '#2196F3'
    },
    'ACTED_IN': {
        color: '#FF9800'
    },
    'WROTE': {
        color: '#4CAF50'
    }
};

/**
 * 从localStorage加载节点类型样式
 * @returns {Object} 节点类型样式对象
 */
window.loadNodeTypeStyles = function() {
    try {
        var saved = localStorage.getItem('neo4j-editor-node-types');
        
        if (saved) {
            try {
                var parsed = JSON.parse(saved);
                // 验证解析后的数据是否为对象
                if (typeof parsed === 'object' && parsed !== null) {
                    return parsed;
                }
            } catch (parseError) {
                window.handleError && window.handleError(parseError, 'Error parsing node type styles');
            }
        }
        
        // 默认样式
        return {
            'Person': {
                'background-color': '#2196F3',
                'icon': 'fa-user',
                'properties': [
                    { key: 'name', type: 'string', defaultValue: '' },
                    { key: 'age', type: 'number', defaultValue: 0 }
                ]
            },
            'Movie': {
                'background-color': '#4CAF50',
                'icon': 'fa-film',
                'properties': [
                    { key: 'title', type: 'string', defaultValue: '' },
                    { key: 'year', type: 'number', defaultValue: 2023 }
                ]
            },
            'Book': {
                'background-color': '#FF9800',
                'icon': 'fa-book',
                'properties': [
                    { key: 'title', type: 'string', defaultValue: '' },
                    { key: 'author', type: 'string', defaultValue: '' }
                ]
            }
        };
    } catch (e) {
        window.handleError && window.handleError(e, 'Error loading node type styles');
        return {};
    }
};

/**
 * 保存节点类型样式到localStorage
 * @param {Object} styles 节点类型样式对象
 */
window.saveNodeTypeStyles = function(styles) {
    try {
        localStorage.setItem('neo4j-editor-node-types', JSON.stringify(styles));
    } catch (e) {
        window.handleError && window.handleError(e, 'Error saving node type styles');
    }
};

/**
 * 初始化节点类型管理器
 */
window.initNodeTypeManager = function() {
    try {
        // 加载保存的样式
        window.nodeTypeStyles = window.loadNodeTypeStyles();
        
        // 初始化默认关系类型样式
        window.relationshipTypeStyles = {
            'KNOWS': {
                'color': '#9C27B0',
                'properties': [
                    { key: 'since', type: 'number', defaultValue: 2023 }
                ]
            },
            'ACTED_IN': {
                'color': '#E91E63',
                'properties': [
                    { key: 'role', type: 'string', defaultValue: '' }
                ]
            },
            'WROTE': {
                'color': '#607D8B',
                'properties': [
                    { key: 'date', type: 'string', defaultValue: '' }
                ]
            }
        };
        
        // 渲染节点类型和关系类型按钮
        window.renderNodeTypeButtons();
    } catch (e) {
        window.handleError && window.handleError(e, 'Error initializing node type manager');
    }
};

/**
 * 创建节点类型按钮
 * @param {string} typeName - 节点类型名称
 * @param {Object} style - 节点样式配置
 * @param {HTMLElement} container - 父容器
 * @returns {HTMLElement} 创建的按钮元素
 */
function createNodeTypeButton(typeName, style, container) {
    const button = document.createElement('div');
    button.className = 'node-type-btn flex items-center p-2 rounded-lg hover:bg-gray-100 transition-colors';
    button.dataset.type = typeName;
    
    // 创建节点图标
    const iconContainer = document.createElement('div');
    iconContainer.className = 'w-10 h-10 flex items-center justify-center rounded-full mr-2';
    iconContainer.style.backgroundColor = style.color || style['background-color'] || '#2196F3';
    
    const icon = document.createElement('i');
    icon.className = `fa ${style.icon || 'fa-circle'} text-white node-type-icon`;
    iconContainer.appendChild(icon);
    
    // 创建节点类型名称
    const nameSpan = document.createElement('span');
    nameSpan.className = 'text-xs text-center';
    nameSpan.textContent = typeName;
    
    // 组合按钮内容
    button.appendChild(iconContainer);
    button.appendChild(nameSpan);
    
    container.appendChild(button);
    
    return button;
}

/**
 * 渲染节点类型和关系类型按钮
 */
window.renderNodeTypeButtons = function() {
    try {
        // 初始化节点类型按钮
        const nodeTypesContainer = document.querySelectorAll('.panel')[0]?.querySelector('.panel-content');
        if (nodeTypesContainer) {
            nodeTypesContainer.innerHTML = '';
            
            // Node type buttons will be created based on existing types only
            
            // 渲染现有节点类型按钮
            const nodeStyles = window.nodeTypeStyles || {};
            for (var type in nodeStyles) {
                if (nodeStyles.hasOwnProperty(type)) {
                    const button = createNodeTypeButton(type, nodeStyles[type], nodeTypesContainer);
                    
                    // 设置点击事件
                    button.onclick = function() {
                        const clickedType = this.dataset.type;
                        window.selectedNodeType = clickedType;
                        
                        // 移除所有按钮的active类
                        document.querySelectorAll('.node-type-btn').forEach(btn => {
                            btn.classList.remove('active');
                        });
                        // 添加当前按钮的active类
                        this.classList.add('active');
                        
                        // 显示当前选中的节点类型信息
                        if (window.showToast) {
                            window.showToast(`Selected node type: ${clickedType}`, 'success');
                        }
                    };
                    
                    // 添加右键菜单功能
                    button.addEventListener('contextmenu', function(e) {
                        e.preventDefault();
                        const typeName = this.dataset.type;
                        try {
                            // 直接调用编辑函数，而不是通过window对象
                            window.showContextMenu(e.clientX, e.clientY, [
                                { text: 'Edit', action: function(e) {
                                    // 阻止事件冒泡，防止触发删除操作
                                    if (e) {
                                        e.stopPropagation();
                                        e.preventDefault();
                                    }
                                    try {
                                        // 直接操作模态框DOM元素
                                        const modal = document.getElementById('edit-node-type-modal');
                                        if (!modal) {
                                            console.error('Edit node type modal not found');
                                            return;
                                        }
                                        
                                        // 设置当前编辑的节点类型
                                        window.currentEditingNodeType = typeName;
                                        
                                        // 获取节点类型配置
                                        const nodeType = window.nodeTypeStyles[typeName] || { color: '#2196F3', icon: 'fa-circle', properties: [] };
                                        
                                        // 获取表单元素
                                        const nameInput = document.getElementById('edit-node-type-name');
                                        const colorInput = document.getElementById('edit-node-type-color');
                                        const iconInput = document.getElementById('edit-node-type-icon');
                                        const propertiesContainer = document.getElementById('node-type-properties-container');
                                        
                                        if (!nameInput || !colorInput || !iconInput || !propertiesContainer) {
                                            console.error('Some form elements not found');
                                            return;
                                        }
                                        
                                        // 填充表单值
                                        nameInput.value = typeName;
                                        colorInput.value = nodeType.color || '#2196F3';
                                        iconInput.value = nodeType.icon || 'fa-circle';
                                        
                                        // 清空并重新添加属性
                                        propertiesContainer.innerHTML = '';
                                        
                                        // 确保addPropertyToEditModal函数存在
                                        if (typeof addPropertyToEditModal === 'function') {
                                            if (nodeType.properties && nodeType.properties.length > 0) {
                                                nodeType.properties.forEach((prop, index) => {
                                                    addPropertyToEditModal(prop, index);
                                                });
                                            } else {
                                                addPropertyToEditModal({ key: '', type: 'string', defaultValue: '' }, 0);
                                            }
                                        } else {
                                            console.error('addPropertyToEditModal function not available');
                                        }
                                        
                                        // 显示模态框
                                        modal.classList.remove('hidden');
                                    } catch (error) {
                                        console.error('Error showing edit modal:', error);
                                        if (window.showToast) {
                                            window.showToast('Failed to open edit dialog', 'error');
                                        }
                                    }
                                }},
                                { text: 'Delete', action: function(e) {
                                    // 阻止事件冒泡
                                    if (e) {
                                        e.stopPropagation();
                                        e.preventDefault();
                                    }
                                    if (confirm(`Are you sure you want to delete node type "${typeName}"?`)) {
                                        window.deleteNodeType && window.deleteNodeType(typeName);
                                    }
                                }}
                            ]);
                        } catch (error) {
                            console.error('Error in context menu:', error);
                            if (window.showToast) {
                                window.showToast('Failed to open edit dialog', 'error');
                            }
                        }
                    });
                }
            }
            
            // 如果没有选中的节点类型，默认选中第一个
            if (!window.selectedNodeType && Object.keys(nodeStyles).length > 0) {
                const firstType = Object.keys(nodeStyles)[0];
                window.selectedNodeType = firstType;
                const firstButton = nodeTypesContainer.querySelector(`[data-type="${firstType}"]`);
                if (firstButton) {
                    firstButton.classList.add('active');
                }
            }
        }
        
        // 初始化关系类型按钮
        const relationshipTypesContainer = document.querySelectorAll('.panel')[1]?.querySelector('.panel-content');
        if (relationshipTypesContainer) {
            relationshipTypesContainer.innerHTML = '';
            
            // Relationship type buttons will be created based on existing types only
            
            // 渲染现有关系类型按钮
            const relStyles = window.relationshipTypeStyles || {};
            for (var type in relStyles) {
                if (relStyles.hasOwnProperty(type)) {
                    var style = relStyles[type];
                    // 使用与节点类型相同的样式创建关系类型按钮
                    const btn = document.createElement('div');
                    btn.className = 'node-type-btn flex items-center p-2 rounded-lg hover:bg-gray-100 transition-colors';
                    btn.dataset.type = type;
                    
                    // 创建图标容器
                    const iconContainer = document.createElement('div');
                    iconContainer.className = 'w-10 h-10 flex items-center justify-center rounded-full mr-2';
                    iconContainer.style.backgroundColor = style.color || '#999';
                    
                    // 创建图标
                    const icon = document.createElement('i');
                    icon.className = 'fa fa-long-arrow-right text-white node-type-icon';
                    iconContainer.appendChild(icon);
                    
                    // 创建名称
                    const nameSpan = document.createElement('span');
                    nameSpan.className = 'text-xs text-center';
                    nameSpan.textContent = type;
                    
                    // 组合元素
                    btn.appendChild(iconContainer);
                    btn.appendChild(nameSpan);
                    
                    btn.addEventListener('click', function() {
                        const clickedType = this.dataset.type;
                        window.selectedRelationshipType = clickedType;
                        var buttons = document.querySelectorAll('.node-type-btn');
                        for (var k = 0; k < buttons.length; k++) {
                            buttons[k].classList.remove('active');
                        }
                        this.classList.add('active');
                    });
                    
                    btn.addEventListener('contextmenu', function(e) {
                        e.preventDefault();
                        const typeName = this.dataset.type;
                        try {
                            // 直接实现编辑功能，而不是依赖window对象
                            window.showContextMenu(e.clientX, e.clientY, [
                                { text: 'Edit', action: function(e) {
                                    // 阻止事件冒泡，防止触发删除操作
                                    if (e) {
                                        e.stopPropagation();
                                        e.preventDefault();
                                    }
                                    // 获取关系类型编辑模态框
                                    const modal = document.getElementById('edit-relationship-type-modal') || document.getElementById('add-relationship-type-modal');
                                    if (modal) {
                                        // 保存当前编辑的类型
                                        window.currentEditingRelationshipType = typeName;
                                        
                                        // 显示模态框
                                        modal.classList.remove('hidden');
                                        
                                        // 获取关系类型配置
                                        const relType = window.relationshipTypeStyles[typeName] || { color: '#999', icon: 'fa-long-arrow-right', properties: [] };
                                        
                                        // 填充表单（尝试不同的ID，因为可能有多个版本的模态框）
                                        const nameInput = document.getElementById('edit-relationship-type-name') || document.getElementById('relationship-type-name');
                                        const colorInput = document.getElementById('edit-relationship-type-color') || document.getElementById('relationship-type-color');
                                        const iconInput = document.getElementById('edit-relationship-type-icon') || document.getElementById('relationship-type-icon');
                                        const propertiesContainer = document.getElementById('relationship-type-properties-container');
                                        
                                        if (nameInput) nameInput.value = typeName;
                                        if (colorInput) colorInput.value = relType.color || '#999';
                                        if (iconInput) iconInput.value = relType.icon || 'fa-long-arrow-right';
                                        
                                        // 清空并重新添加属性
                                        if (propertiesContainer) {
                                            propertiesContainer.innerHTML = '';
                                            if (relType.properties && relType.properties.length > 0) {
                                                relType.properties.forEach((prop, index) => {
                                                    // 尝试使用关系类型的属性添加函数或回退到节点类型的函数
                                                    if (window.addPropertyToRelationshipTypeModal) {
                                                        window.addPropertyToRelationshipTypeModal(prop, index);
                                                    } else if (typeof addPropertyToEditModal === 'function') {
                                                        addPropertyToEditModal(prop, index);
                                                    }
                                                });
                                            } else {
                                                if (window.addPropertyToRelationshipTypeModal) {
                                                    window.addPropertyToRelationshipTypeModal({ key: '', type: 'string', defaultValue: '' }, 0);
                                                } else if (typeof addPropertyToEditModal === 'function') {
                                                    addPropertyToEditModal({ key: '', type: 'string', defaultValue: '' }, 0);
                                                }
                                            }
                                        }
                                    }
                                }},
                                { text: 'Delete', action: function(e) {
                                    // 阻止事件冒泡
                                    if (e) {
                                        e.stopPropagation();
                                        e.preventDefault();
                                    }
                                    if (confirm(`Are you sure you want to delete relationship type "${typeName}"?`)) {
                                        window.deleteRelationshipType && window.deleteRelationshipType(typeName);
                                    }
                                }}
                            ]);
                        } catch (error) {
                            console.error('Error in relationship context menu:', error);
                            if (window.showToast) {
                                window.showToast('Failed to open edit dialog', 'error');
                            }
                        }
                    });
                    
                    relationshipTypesContainer.appendChild(btn);
                }
            }
        }
    } catch (e) {
        window.handleError && window.handleError(e, 'Error rendering node type buttons');
    }
};

/**
 * 创建新的节点类型
 * @param {string} name - 节点类型名称
 * @param {string} color - 节点颜色
 * @param {string} icon - 节点图标
 * @param {Array} properties - 节点属性配置数组
 */
window.createNodeType = function(name, color, icon, properties = []) {
    if (!name || name.trim() === '') {
        window.showToast('Node type name cannot be empty', 'error');
        return false;
    }
    
    if (window.nodeTypeStyles[name]) {
        window.showToast('Node type already exists', 'error');
        return false;
    }
    
    // 创建新的节点类型
    window.nodeTypeStyles[name] = {
        color: color || '#2196F3',
        icon: icon || 'fa-circle',
        properties: properties
    };
    
    // 保存到localStorage
    saveNodeTypeStyles();
    
    // 重新渲染节点类型按钮
    renderNodeTypeButtons();
    
    // 更新所有视图中的节点样式
    updateNodeStylesInAllViews();
    
    window.showToast('Node type created: ' + name, 'success');
    return true;
};

/**
 * 编辑节点类型
 * @param {string} oldName - 旧名称
 * @param {string} newName - 新名称
 * @param {string} color - 新颜色
 * @param {string} icon - 新图标
 * @param {Array} properties - 新的属性配置数组
 */
window.editNodeType = function(oldName, newName, color, icon, properties = []) {
    if (!oldName || !window.nodeTypeStyles[oldName]) {
        window.showToast('Node type not found', 'error');
        return false;
    }
    
    if (!newName || newName.trim() === '') {
        window.showToast('Node type name cannot be empty', 'error');
        return false;
    }
    
    // 如果名称改变了，检查是否重复
    if (oldName !== newName && window.nodeTypeStyles[newName]) {
        window.showToast('Node type already exists', 'error');
        return false;
    }
    
    // 如果名称改变，删除旧的，创建新的
    if (oldName !== newName) {
        delete window.nodeTypeStyles[oldName];
        window.nodeTypeStyles[newName] = {
            color: color || '#2196F3',
            icon: icon || 'fa-circle',
            properties: properties
        };
    } else {
        // 名称没变，更新所有属性
        window.nodeTypeStyles[oldName].color = color || '#2196F3';
        window.nodeTypeStyles[oldName].icon = icon || 'fa-circle';
        window.nodeTypeStyles[oldName].properties = properties;
    }
    
    // 更新所有使用该类型的节点
    updateNodesWithType(oldName, newName);
    
    // 保存到localStorage
    saveNodeTypeStyles();
    
    // 重新渲染节点类型按钮
    renderNodeTypeButtons();
    
    // 更新所有视图中的节点样式
    updateNodeStylesInAllViews();
    
    window.showToast('Node type updated: ' + newName, 'success');
    return true;
};

/**
 * 更新所有使用指定类型的节点
 * @param {string} oldTypeName - 旧的类型名称
 * @param {string} newTypeName - 新的类型名称
 */
function updateNodesWithType(oldTypeName, newTypeName) {
    try {
        const instances = [window.cy, window.cyTree, window.cyNetwork].filter(Boolean);
        const newTypeConfig = window.nodeTypeStyles[newTypeName];
        
        instances.forEach(instance => {
            const nodes = instance.nodes(`[type = "${oldTypeName}"]`);
            
            nodes.forEach(node => {
                node.data('type', newTypeName);
                node.data('label', newTypeName);
                
                // 更新labels数组
                const labels = node.data('labels') || [];
                const index = labels.indexOf(oldTypeName);
                if (index !== -1) {
                    labels[index] = newTypeName;
                    node.data('labels', labels);
                }
                
                // 更新节点属性为新类型的默认属性
                if (newTypeConfig && newTypeConfig.properties) {
                    const currentProps = node.data('properties') || {};
                    const updatedProps = { ...currentProps };
                    
                    // 为新添加的属性设置默认值
                    newTypeConfig.properties.forEach(prop => {
                        if (!(prop.key in updatedProps)) {
                            updatedProps[prop.key] = prop.defaultValue;
                        }
                    });
                    
                    node.data('properties', updatedProps);
                }
            });
        });
        
        // 更新sharedGraphData
        if (window.sharedGraphData && window.sharedGraphData.nodes) {
            window.sharedGraphData.nodes.forEach(node => {
                if (node.data && node.data.type === oldTypeName) {
                    node.data.type = newTypeName;
                    node.data.label = newTypeName;
                    
                    // 更新labels数组
                    const labels = node.data.labels || [];
                    const index = labels.indexOf(oldTypeName);
                    if (index !== -1) {
                        labels[index] = newTypeName;
                        node.data.labels = labels;
                    }
                    
                    // 更新节点属性
                    if (newTypeConfig && newTypeConfig.properties) {
                        const currentProps = node.data.properties || {};
                        const updatedProps = { ...currentProps };
                        
                        newTypeConfig.properties.forEach(prop => {
                            if (!(prop.key in updatedProps)) {
                                updatedProps[prop.key] = prop.defaultValue;
                            }
                        });
                        
                        node.data.properties = updatedProps;
                    }
                }
            });
        }
    } catch (error) {
        window.handleError && window.handleError(error, 'Error updating nodes with type');
    }
}

/**
 * 删除节点类型
 * @param {string} typeName 节点类型名称
 */
window.deleteNodeType = function(typeName) {
    try {
        if (confirm('Are you sure you want to delete this node type?')) {
            delete window.nodeTypeStyles[typeName];
            window.saveNodeTypeStyles(window.nodeTypeStyles);
            window.renderNodeTypeButtons();
        }
    } catch (e) {
        window.handleError && window.handleError(e, 'Error deleting node type');
    }
};

/**
 * 创建新的关系类型
 * @param {string} typeName 关系类型名称
 * @param {Object} style 关系样式
 */
window.createRelationshipType = function(typeName, style) {
    try {
        window.relationshipTypeStyles[typeName] = style;
        window.renderNodeTypeButtons();
    } catch (e) {
        window.handleError && window.handleError(e, 'Error creating relationship type');
    }
};

/**
 * 删除关系类型
 * @param {string} typeName 关系类型名称
 */
window.deleteRelationshipType = function(typeName) {
    try {
        if (confirm('Are you sure you want to delete this relationship type?')) {
            delete window.relationshipTypeStyles[typeName];
            window.renderNodeTypeButtons();
        }
    } catch (e) {
        window.handleError && window.handleError(e, 'Error deleting relationship type');
    }
};

// 暴露模块到window对象
window.nodeTypeManager = {
    init: window.initNodeTypeManager,
    createNodeType: window.createNodeType,
    deleteNodeType: window.deleteNodeType,
    createRelationshipType: window.createRelationshipType,
    deleteRelationshipType: window.deleteRelationshipType,
    renderButtons: window.renderNodeTypeButtons
};

// 当前编辑的节点类型
window.currentEditingNodeType = null;

/**
 * 显示编辑节点类型模态框
 * @param {string} typeName - 要编辑的节点类型名称
 */
window.showEditNodeTypeModal = function(typeName) {
    try {
        const modal = document.getElementById('edit-node-type-modal');
        const nameInput = document.getElementById('edit-node-type-name');
        const colorInput = document.getElementById('edit-node-type-color');
        const iconInput = document.getElementById('edit-node-type-icon');
        const propertiesContainer = document.getElementById('node-type-properties-container');
        
        if (!modal || !nameInput || !colorInput || !iconInput || !propertiesContainer) {
            console.error('Modal elements not found');
            return;
        }
        
        // 保存当前编辑的类型
        window.currentEditingNodeType = typeName;
        
        // 获取节点类型配置
        const nodeType = window.nodeTypeStyles[typeName] || { color: '#2196F3', icon: 'fa-circle', properties: [] };
        
        // 设置表单值
        nameInput.value = typeName;
        colorInput.value = nodeType.color || '#2196F3';
        
        // 设置图标选择
        iconInput.value = nodeType.icon || 'fa-circle';
        
        // 清空属性容器
        propertiesContainer.innerHTML = '';
        
        // 添加现有属性
        if (nodeType.properties && nodeType.properties.length > 0) {
            nodeType.properties.forEach((prop, index) => {
                addPropertyToEditModal(prop, index);
            });
        } else {
            // 添加一个空属性
            addPropertyToEditModal({ key: '', type: 'string', defaultValue: '' }, 0);
        }
        
        // 显示模态框
        modal.classList.remove('hidden');
    } catch (error) {
        window.handleError && window.handleError(error, 'Error showing edit node type modal');
    }
};

/**
 * 隐藏编辑节点类型模态框
 */
window.hideEditNodeTypeModal = function() {
    const modal = document.getElementById('edit-node-type-modal');
    if (modal) {
        modal.classList.add('hidden');
        window.currentEditingNodeType = null;
    }
};

/**
 * 添加属性到编辑模态框
 * @param {Object} property - 属性对象
 * @param {number} index - 属性索引
 */
function addPropertyToEditModal(property, index) {
    const container = document.getElementById('node-type-properties-container');
    if (!container) return;
    
    const propertyGroup = document.createElement('div');
    propertyGroup.className = 'property-item flex gap-2 items-center';
    propertyGroup.dataset.index = index;
    
    // 属性键输入
    const keyInput = document.createElement('input');
    keyInput.type = 'text';
    keyInput.className = 'form-input flex-1';
    keyInput.placeholder = 'Property Name';
    keyInput.value = property.key || '';
    keyInput.dataset.type = 'key';
    
    // 属性类型选择
    const typeSelect = document.createElement('select');
    typeSelect.className = 'form-input w-28';
    typeSelect.dataset.type = 'type';
    
    ['string', 'number', 'boolean'].forEach(type => {
        const option = document.createElement('option');
        option.value = type;
        option.textContent = type.charAt(0).toUpperCase() + type.slice(1);
        option.selected = property.type === type;
        typeSelect.appendChild(option);
    });
    
    // 属性默认值输入
    const valueInput = document.createElement('input');
    valueInput.type = property.type === 'boolean' ? 'checkbox' : 'text';
    valueInput.className = property.type === 'boolean' ? 'form-checkbox' : 'form-input flex-1';
    valueInput.placeholder = 'Default Value';
    
    if (property.type === 'boolean') {
        valueInput.checked = property.defaultValue === true || property.defaultValue === 'true';
    } else {
        valueInput.value = property.defaultValue !== undefined ? property.defaultValue : '';
    }
    valueInput.dataset.type = 'value';
    
    // 删除按钮
    const deleteBtn = document.createElement('button');
    deleteBtn.className = 'bg-red-600 hover:bg-red-700 text-white p-2 rounded';
    deleteBtn.innerHTML = '<i class="fa fa-trash"></i>';
    deleteBtn.onclick = function() {
        container.removeChild(propertyGroup);
        // 重新索引所有属性
        updatePropertyIndices();
    };
    
    propertyGroup.appendChild(keyInput);
    propertyGroup.appendChild(typeSelect);
    propertyGroup.appendChild(valueInput);
    propertyGroup.appendChild(deleteBtn);
    
    container.appendChild(propertyGroup);
}

/**
 * 更新属性索引
 */
function updatePropertyIndices() {
    const container = document.getElementById('node-type-properties-container');
    if (!container) return;
    
    const propertyItems = container.querySelectorAll('.property-item');
    propertyItems.forEach((item, index) => {
        item.dataset.index = index;
    });
}

/**
 * 从编辑模态框收集属性
 * @returns {Array} 属性数组
 */
function collectPropertiesFromModal() {
    const container = document.getElementById('node-type-properties-container');
    if (!container) return [];
    
    const properties = [];
    const propertyItems = container.querySelectorAll('.property-item');
    
    propertyItems.forEach(item => {
        const keyInput = item.querySelector('[data-type="key"]');
        const typeSelect = item.querySelector('[data-type="type"]');
        const valueInput = item.querySelector('[data-type="value"]');
        
        if (keyInput && typeSelect && valueInput && keyInput.value.trim() !== '') {
            const type = typeSelect.value;
            let defaultValue;
            
            if (type === 'boolean') {
                defaultValue = valueInput.checked;
            } else if (type === 'number') {
                defaultValue = valueInput.value === '' ? null : Number(valueInput.value);
            } else {
                defaultValue = valueInput.value;
            }
            
            properties.push({
                key: keyInput.value.trim(),
                type: type,
                defaultValue: defaultValue
            });
        }
    });
    
    return properties;
}

/**
 * 初始化节点类型属性编辑相关事件
 */
function initNodeTypePropertyEditing() {
    // 添加属性按钮事件
    const addPropertyBtn = document.getElementById('add-node-type-property-btn');
    if (addPropertyBtn) {
        addPropertyBtn.onclick = function() {
            const container = document.getElementById('node-type-properties-container');
            if (container) {
                const newIndex = container.querySelectorAll('.property-item').length;
                addPropertyToEditModal({ key: '', type: 'string', defaultValue: '' }, newIndex);
            }
        };
    }
    
    // 为添加新节点类型模态框的属性按钮添加点击事件
    const addNewPropertyBtn = document.getElementById('add-new-node-type-property-btn');
    if (addNewPropertyBtn) {
        addNewPropertyBtn.onclick = handleAddNewNodeTypeProperty;
    }
    
    // 确认编辑按钮事件
    const confirmEditBtn = document.getElementById('confirm-edit-node-type-btn');
    if (confirmEditBtn) {
        confirmEditBtn.onclick = function() {
            if (!window.currentEditingNodeType) return;
            
            const nameInput = document.getElementById('edit-node-type-name');
            const colorInput = document.getElementById('edit-node-type-color');
            const iconInput = document.getElementById('edit-node-type-icon');
            
            if (!nameInput || !colorInput || !iconInput) return;
            
            const newName = nameInput.value.trim();
            const color = colorInput.value;
            const icon = iconInput.value;
            const properties = collectPropertiesFromModal();
            
            if (window.editNodeType(window.currentEditingNodeType, newName, color, icon, properties)) {
                window.hideEditNodeTypeModal();
            }
        };
    }
    
    // 取消编辑按钮事件
    const cancelEditBtn = document.getElementById('cancel-edit-node-type-btn');
    if (cancelEditBtn) {
        cancelEditBtn.onclick = window.hideEditNodeTypeModal;
    }
    
    // 关闭模态框按钮事件
    const closeModalBtn = document.getElementById('close-edit-node-type-modal');
    if (closeModalBtn) {
        closeModalBtn.onclick = window.hideEditNodeTypeModal;
    }
    
    // 添加节点类型模态框确认按钮
    const confirmAddBtn = document.getElementById('confirm-add-node-type-btn');
    if (confirmAddBtn) {
        confirmAddBtn.onclick = handleAddNodeType;
    }
    
    // 添加节点类型模态框关闭按钮
    const closeAddModalBtn = document.getElementById('close-add-node-type-modal');
    if (closeAddModalBtn) {
        closeAddModalBtn.onclick = hideAddNodeTypeModal;
    }
    
    // 添加节点类型模态框取消按钮
    const cancelAddBtn = document.getElementById('cancel-add-node-type-btn');
    if (cancelAddBtn) {
        cancelAddBtn.onclick = hideAddNodeTypeModal;
    }
}

// 处理添加新节点类型的属性
function handleAddNewNodeTypeProperty() {
    const container = document.getElementById('new-node-type-properties-container');
    const propertyId = 'property-' + Date.now();
    
    const propertyElement = document.createElement('div');
    propertyElement.className = 'property-item p-2 border border-gray-700 rounded flex flex-col space-y-2';
    propertyElement.dataset.id = propertyId;
    
    propertyElement.innerHTML = `
        <div class="flex space-x-2">
            <div class="flex-1">
                <input type="text" placeholder="Property key" class="new-property-key form-input text-sm" required>
            </div>
            <div class="flex-1">
                <input type="text" placeholder="Default value" class="new-property-value form-input text-sm">
            </div>
            <div class="w-24">
                <select class="new-property-type form-input text-sm">
                    <option value="string">String</option>
                    <option value="number">Number</option>
                    <option value="boolean">Boolean</option>
                </select>
            </div>
            <button type="button" class="delete-new-property-btn text-red-400 hover:text-red-500 self-center" title="Delete property">
                <i class="fa fa-trash"></i>
            </button>
        </div>
    `;
    
    // 添加删除按钮事件
    propertyElement.querySelector('.delete-new-property-btn').addEventListener('click', () => {
        container.removeChild(propertyElement);
    });
    
    container.appendChild(propertyElement);
}

// 收集新节点类型的属性
function collectNewNodeTypeProperties() {
    const properties = [];
    const propertyItems = document.querySelectorAll('#new-node-type-properties-container .property-item');
    
    propertyItems.forEach(item => {
        const key = item.querySelector('.new-property-key').value.trim();
        const value = item.querySelector('.new-property-value').value.trim();
        const type = item.querySelector('.new-property-type').value;
        
        if (key) {
            // 根据类型转换默认值
            let processedValue = value;
            if (type === 'number') {
                processedValue = value === '' ? 0 : Number(value);
            } else if (type === 'boolean') {
                processedValue = value.toLowerCase() === 'true' || value === '1';
            }
            
            properties.push({
                key,
                type,
                defaultValue: processedValue
            });
        }
    });
    
    return properties;
}

// 处理添加节点类型
function handleAddNodeType() {
    const nameInput = document.getElementById('new-node-type-name');
    const colorInput = document.getElementById('new-node-type-color');
    const iconInput = document.getElementById('new-node-type-icon');
    
    if (!nameInput || !colorInput || !iconInput) return;
    
    const name = nameInput.value.trim();
    const color = colorInput.value;
    const icon = iconInput.value;
    
    if (!name) {
        window.showToast && window.showToast('Node type name cannot be empty', 'error');
        return;
    }
    
    if (window.nodeTypeStyles[name]) {
        window.showToast && window.showToast('Node type already exists', 'error');
        return;
    }
    
    // 收集属性
    const properties = collectNewNodeTypeProperties();
    
    if (window.createNodeType(name, color, icon, properties)) {
        // 关闭添加模态框
        hideAddNodeTypeModal();
        
        // 重置表单
        nameInput.value = '';
        iconInput.value = 'fa-circle';
        colorInput.value = '#2196F3';
    }
}

// 隐藏添加节点类型模态框
// 显示添加节点类型模态框
window.showCreateNodeTypeModal = function() {
    const modal = document.getElementById('add-node-type-modal');
    if (modal) {
        modal.classList.remove('hidden');
    }
};

// 隐藏添加节点类型模态框
function hideAddNodeTypeModal() {
    const modal = document.getElementById('add-node-type-modal');
    if (modal) {
        modal.classList.add('hidden');
    }
    
    // 清空属性容器
    const propertiesContainer = document.getElementById('new-node-type-properties-container');
    if (propertiesContainer) {
        propertiesContainer.innerHTML = '';
    }
}

// 暴露hideAddNodeTypeModal到window对象
window.hideAddNodeTypeModal = hideAddNodeTypeModal;

// 显示添加关系类型模态框
window.showCreateRelationshipTypeModal = function() {
    const modal = document.getElementById('add-relationship-type-modal');
    if (modal) {
        modal.classList.remove('hidden');
    }
};

// 隐藏添加关系类型模态框
window.hideCreateRelationshipTypeModal = function() {
    const modal = document.getElementById('add-relationship-type-modal');
    if (modal) {
        modal.classList.add('hidden');
    }
    
    // Reset form
    const nameInput = document.getElementById('new-relationship-type-name');
    const colorInput = document.getElementById('new-relationship-type-color');
    if (nameInput) nameInput.value = '';
    if (colorInput) colorInput.value = '#FF9800';
    
    // Clear properties container
    const propertiesContainer = document.getElementById('new-relationship-type-properties-container');
    if (propertiesContainer) {
        propertiesContainer.innerHTML = '';
    }
};

// 为添加关系类型模态框添加事件监听
function initRelationshipTypeModalEvents() {
    // 确认按钮
    const confirmBtn = document.getElementById('confirm-add-relationship-type-btn');
    if (confirmBtn) {
        confirmBtn.addEventListener('click', handleAddRelationshipType);
    }
    
    // 取消按钮
    const cancelBtn = document.getElementById('cancel-add-relationship-type-btn');
    if (cancelBtn) {
        cancelBtn.addEventListener('click', window.hideCreateRelationshipTypeModal);
    }
    
    // 关闭按钮
    const closeBtn = document.getElementById('close-add-relationship-type-modal');
    if (closeBtn) {
        closeBtn.addEventListener('click', window.hideCreateRelationshipTypeModal);
    }
    
    // Add property button event
    const addPropertyBtn = document.getElementById('add-new-relationship-type-property-btn');
    if (addPropertyBtn) {
        addPropertyBtn.addEventListener('click', handleAddNewRelationshipTypeProperty);
    }
}

function handleAddNewRelationshipTypeProperty() {
    const container = document.getElementById('new-relationship-type-properties-container');
    if (!container) return;
    
    // Create property group
    const propertyGroup = document.createElement('div');
    propertyGroup.className = 'property-group flex space-x-2 items-end';
    propertyGroup.setAttribute('data-property-index', container.children.length);
    
    // Create property name input
    const nameInput = document.createElement('input');
    nameInput.type = 'text';
    nameInput.placeholder = 'Property Name';
    nameInput.className = 'form-input flex-1';
    
    // Create property type select
    const typeSelect = document.createElement('select');
    typeSelect.className = 'form-input ml-2';
    const typeOptions = ['string', 'number', 'boolean', 'null'];
    typeOptions.forEach(type => {
        const option = document.createElement('option');
        option.value = type;
        option.textContent = type.charAt(0).toUpperCase() + type.slice(1);
        typeSelect.appendChild(option);
    });
    
    // Create property value input
    const valueInput = document.createElement('input');
    valueInput.type = 'text';
    valueInput.placeholder = 'Default Value';
    valueInput.className = 'form-input ml-2';
    
    // Create remove button
    const removeButton = document.createElement('button');
    removeButton.className = 'bg-red-500 hover:bg-red-600 text-white px-2 py-1 rounded ml-2';
    removeButton.innerHTML = '<i class="fa fa-trash"></i>';
    removeButton.onclick = function() {
        propertyGroup.remove();
        // Update indices of remaining properties
        const remainingProperties = container.querySelectorAll('.property-group');
        remainingProperties.forEach((prop, idx) => {
            prop.setAttribute('data-property-index', idx);
        });
    };
    
    // Append elements to property group
    propertyGroup.appendChild(nameInput);
    propertyGroup.appendChild(typeSelect);
    propertyGroup.appendChild(valueInput);
    propertyGroup.appendChild(removeButton);
    
    // Append to container
    container.appendChild(propertyGroup);
}

function collectNewRelationshipTypeProperties() {
    const container = document.getElementById('new-relationship-type-properties-container');
    if (!container) return [];
    
    const properties = [];
    
    // Iterate through property groups
    Array.from(container.children).forEach((propertyGroup) => {
        const nameInput = propertyGroup.querySelector('input[type="text"]:first-child');
        const typeSelect = propertyGroup.querySelector('select');
        const valueInput = propertyGroup.querySelectorAll('input[type="text"]')[1];
        
        // Get values
        const name = nameInput.value.trim();
        const type = typeSelect.value;
        let value = valueInput.value.trim();
        
        // Skip if name is empty
        if (!name) return;
        
        // Convert value based on type
        switch (type) {
            case 'number':
                value = value === '' ? 0 : Number(value);
                break;
            case 'boolean':
                value = value.toLowerCase() === 'true' || value === '1';
                break;
            case 'null':
                value = null;
                break;
        }
        
        properties.push({ key: name, type, defaultValue: value });
    });
    
    return properties;
}

// 处理添加关系类型
function handleAddRelationshipType() {
    const nameInput = document.getElementById('new-relationship-type-name');
    const colorInput = document.getElementById('new-relationship-type-color');
    
    if (!nameInput || !colorInput) return;
    
    const name = nameInput.value.trim();
    const color = colorInput.value;
    
    if (!name) {
        window.showToast && window.showToast('Relationship type name cannot be empty', 'error');
        return;
    }
    
    if (window.relationshipTypeStyles[name]) {
        window.showToast && window.showToast('Relationship type already exists', 'error');
        return;
    }
    
    // Collect properties
    const properties = collectNewRelationshipTypeProperties();
    
    // Validate properties
    const propertyNames = properties.map(p => p.key);
    const hasDuplicates = propertyNames.some((name, index) => propertyNames.indexOf(name) !== index);
    
    if (hasDuplicates) {
        window.showToast && window.showToast('Property names must be unique', 'error');
        return;
    }
    
    // 创建新的关系类型
    window.createRelationshipType(name, { color, properties });
    
    // 关闭模态框
    window.hideCreateRelationshipTypeModal();
    
    // 重置表单
    nameInput.value = '';
    colorInput.value = '#FF9800';
    
    window.showToast && window.showToast(`Relationship type '${name}' added successfully`, 'success');
}

// 扩展initNodeTypeManager函数
function enhancedInitNodeTypeManager() {
    // 调用原有的初始化逻辑
    const originalInit = function() {
        try {
            // 确保从localStorage加载节点类型样式
            if (typeof window.loadNodeTypeStyles === 'function') {
                window.loadNodeTypeStyles();
            }
            
            // 确保渲染节点类型按钮
            if (typeof window.renderNodeTypeButtons === 'function') {
                window.renderNodeTypeButtons();
            }
            
            // 初始化节点类型属性编辑功能
            initNodeTypePropertyEditing();
            
            // 初始化关系类型模态框事件
            initRelationshipTypeModalEvents();
        } catch (error) {
            window.handleError && window.handleError(error, 'Error initializing node type manager');
        }
    };
    
    originalInit();
}

// 确保在DOM加载完成后初始化
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', enhancedInitNodeTypeManager);
} else {
    enhancedInitNodeTypeManager();
}