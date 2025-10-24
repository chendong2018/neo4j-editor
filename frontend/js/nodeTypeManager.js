/**
 * 节点类型管理模块
 */

// 确保全局变量存在
window.nodeTypeStyles = window.nodeTypeStyles || {};
window.relationshipTypeStyles = window.relationshipTypeStyles || {};

/**
 * 从localStorage加载节点类型样式
 * @returns {Object} 节点类型样式对象
 */
window.loadNodeTypeStyles = function() {
    try {
        const saved = localStorage.getItem('nodeTypeStyles');
        
        if (saved) {
            try {
                const parsed = JSON.parse(saved);
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
                'icon': 'fa-user'
            },
            'Movie': {
                'background-color': '#4CAF50',
                'icon': 'fa-film'
            },
            'Book': {
                'background-color': '#FF9800',
                'icon': 'fa-book'
            },
            'Company': {
                'background-color': '#9C27B0',
                'icon': 'fa-building'
            }
        };
    } catch (error) {
        window.handleError && window.handleError(error, 'Error loading node type styles');
        return {};
    }
};

/**
 * 保存节点类型样式到localStorage
 */
window.saveNodeTypeStyles = function() {
    try {
        const styles = window.nodeTypeStyles || {};
        localStorage.setItem('nodeTypeStyles', JSON.stringify(styles));
    } catch (error) {
        window.handleError && window.handleError(error, 'Error saving node type styles');
    }
};

/**
 * 从localStorage加载关系类型样式
 * @returns {Object} 关系类型样式对象
 */
window.loadRelationshipTypeStyles = function() {
    try {
        const saved = localStorage.getItem('relationshipTypeStyles');
        if (saved) {
            try {
                const parsed = JSON.parse(saved);
                if (typeof parsed === 'object' && parsed !== null) {
                    return parsed;
                }
            } catch (parseError) {
                window.handleError && window.handleError(parseError, 'Error parsing relationship type styles');
            }
        }
        
        // 默认样式
        return {
            'ACTED_IN': {
                'line-color': '#FFC107',
                'target-arrow-color': '#FFC107'
            },
            'DIRECTED': {
                'line-color': '#F44336',
                'target-arrow-color': '#F44336'
            },
            'WROTE': {
                'line-color': '#9C27B0',
                'target-arrow-color': '#9C27B0'
            },
            'WORKS_AT': {
                'line-color': '#00BCD4',
                'target-arrow-color': '#00BCD4'
            },
            'CHILD_OF': {
                'line-color': '#8BC34A',
                'target-arrow-color': '#8BC34A'
            },
            'RELATES_TO': {
                'line-color': '#607D8B',
                'target-arrow-color': '#607D8B'
            }
        };
    } catch (error) {
        window.handleError && window.handleError(error, 'Error loading relationship type styles');
        return {};
    }
};

/**
 * 保存关系类型样式到localStorage
 */
window.saveRelationshipTypeStyles = function() {
    try {
        const styles = window.relationshipTypeStyles || {};
        localStorage.setItem('relationshipTypeStyles', JSON.stringify(styles));
    } catch (error) {
        window.handleError && window.handleError(error, 'Error saving relationship type styles');
    }
};

/**
 * 添加节点类型
 */
window.addNodeType = function() {
    const name = document.getElementById('new-node-type-name').value;
    const icon = document.getElementById('new-node-type-icon').value;
    const color = document.getElementById('new-node-type-color').value;
    
    if (!name) {
        showToast('Name is required');
        return;
    }
    
    // 检查是否已存在
    if (window.nodeTypeStyles[name]) {
        showToast(`Node type ${name} already exists`);
        return;
    }
    
    // 确保使用全局nodeTypeStyles变量
    window.nodeTypeStyles = window.nodeTypeStyles || {};
    window.nodeTypeStyles[name] = {
        'background-color': color,
        'icon': icon
    };
    
    // 保存到localStorage
    window.saveNodeTypeStyles();
    
    // Add to node type buttons
    const nodeTypesContainer = document.querySelector('.panel-content');
    const btn = document.createElement('div');
    btn.className = 'node-type-btn';
    btn.dataset.type = name;
    btn.innerHTML = `
        <i class="fa ${icon} node-type-icon"></i>
        <span>${name}</span>
    `;
    
    // Add event listeners
    btn.addEventListener('click', function() {
        const type = this.dataset.type;
        window.selectedNodeType = type;
        document.querySelectorAll('.node-type-btn').forEach(b => b.classList.remove('active'));
        this.classList.add('active');
    });
    
    // 添加右键菜单支持编辑和删除
    btn.addEventListener('contextmenu', function(e) {
        e.preventDefault();
        window.showContextMenu(e.clientX, e.clientY, [
            { text: 'Edit', action: () => window.showEditNodeTypeModal && window.showEditNodeTypeModal(name) },
            { text: 'Delete', action: () => window.deleteNodeType && window.deleteNodeType(name) }
        ]);
    });
    
    nodeTypesContainer.appendChild(btn);
    
    // Close modal
    document.getElementById('add-node-type-modal').classList.add('hidden');
    
    // Reset form
    document.getElementById('new-node-type-name').value = '';
    
    // Show toast
    showToast(`Node type ${name} added`);
};

/**
 * 添加关系类型
 * @param {Object} options - 可选的配置对象，可包含name、color等属性
 * @returns {boolean} - 是否成功添加关系类型
 */
window.addRelationshipType = function(options) {
    console.log('addRelationshipType called with options:', options);
    
    // 支持直接传递参数对象或从DOM获取
    let name, color;
    if (typeof options === 'object' && options !== null) {
        name = options.name;
        color = options.color;
    } else {
        // 从表单获取
        const nameInput = document.getElementById('new-relationship-type-name');
        const colorInput = document.getElementById('new-relationship-type-color');
        
        if (!nameInput) {
            console.error('Relationship type name input element not found');
            if (window.showToast) window.showToast('内部错误：找不到关系类型名称输入框', 'error');
            return false;
        }
        
        name = nameInput.value.trim();
        color = colorInput ? colorInput.value : '#00BCD4'; // 默认颜色
    }
    
    // 验证输入
    if (!name) {
        console.warn('Relationship type name cannot be empty');
        if (window.showToast) window.showToast('关系类型名称不能为空', 'warning');
        return false;
    }
    
    // 验证名称格式
    if (!/^[a-zA-Z0-9_]+$/.test(name)) {
        console.warn('Invalid relationship type name format:', name);
        if (window.showToast) window.showToast('关系类型名称只能包含字母、数字和下划线', 'warning');
        return false;
    }
    
    // 确保全局变量存在
    if (!window.relationshipTypeStyles) {
        window.relationshipTypeStyles = {};
        console.warn('relationshipTypeStyles global variable was not initialized, creating empty object');
    }
    
    // 检查是否已存在
    if (window.relationshipTypeStyles[name]) {
        console.warn(`Relationship type ${name} already exists`);
        if (window.showToast) window.showToast(`关系类型 ${name} 已存在`, 'info');
        return false;
    }
    
    try {
        // Add to relationship type styles
        window.relationshipTypeStyles[name] = {
            'line-color': color,
            'target-arrow-color': color
        };
        
        console.log(`Added relationship type: ${name} with color: ${color}`);
        
        // 保存到localStorage
        if (typeof window.saveRelationshipTypeStyles === 'function') {
            window.saveRelationshipTypeStyles();
        } else {
            console.error('saveRelationshipTypeStyles function not found');
        }
        
        // Add to relationship type buttons
        const relationshipTypesContainer = document.querySelectorAll('.panel')[1]?.querySelector('.panel-content');
        if (!relationshipTypesContainer) {
            console.error('Relationship types container not found');
            if (window.showToast) window.showToast('内部错误：找不到关系类型容器', 'error');
            return false;
        }
        
        const btn = document.createElement('div');
        btn.className = 'node-type-btn';
        btn.dataset.type = name;
        btn.innerHTML = `
            <i class="fa fa-long-arrow-right node-type-icon" style="color: ${color};"></i>
            <span>${name}</span>
        `;
        
        // Add event listener
        btn.addEventListener('click', function(event) {
            event.stopPropagation();
            const type = this.dataset.type;
            window.selectedRelationshipType = type;
            document.querySelectorAll('.node-type-btn').forEach(b => b.classList.remove('active'));
            this.classList.add('active');
            console.log(`Selected relationship type: ${type}`);
        });
        
        // 添加右键菜单支持编辑和删除
        btn.addEventListener('contextmenu', function(e) {
            e.preventDefault();
            e.stopPropagation();
            const typeName = this.dataset.type;
            if (window.showContextMenu) {
                window.showContextMenu(e.clientX, e.clientY, [
                    { text: '编辑', action: () => window.showEditRelationshipTypeModal && window.showEditRelationshipTypeModal(typeName) },
                    { text: '删除', action: () => window.deleteRelationshipType && window.deleteRelationshipType(typeName) }
                ], typeName);
            }
        });
        
        relationshipTypesContainer.appendChild(btn);
        console.log(`Added UI button for relationship type: ${name}`);
        
        // Close modal if exists
        const modal = document.getElementById('add-relationship-type-modal');
        if (modal) {
            modal.classList.add('hidden');
        }
        
        // Reset form inputs if they exist
        const nameInput = document.getElementById('new-relationship-type-name');
        const colorInput = document.getElementById('new-relationship-type-color');
        if (nameInput) nameInput.value = '';
        if (colorInput) colorInput.value = '#00BCD4'; // 重置为默认颜色
        
        // Show toast
        if (window.showToast) window.showToast(`关系类型 ${name} 已添加`, 'success');
        
        // 更新类型按钮显示
        if (typeof window.initializeTypeButtons === 'function') {
            window.initializeTypeButtons();
        }
        
        return true;
    } catch (error) {
        console.error('Error adding relationship type:', error);
        if (window.showToast) window.showToast(`添加关系类型时出错: ${error.message}`, 'error');
        return false;
    }
};

/**
 * 删除节点类型
 * @param {string} typeName - 要删除的节点类型名称
 */
window.deleteNodeType = function(typeName) {
    console.log('deleteNodeType called for:', typeName, '- START');
    console.log('Current nodeTypeStyles before deletion:', window.nodeTypeStyles);
    
    // 确保全局变量存在
    if (!window.nodeTypeStyles || typeof window.nodeTypeStyles !== 'object') {
        console.error('window.nodeTypeStyles is not valid');
        window.nodeTypeStyles = {};
        return;
    }
    
    // 不允许删除最后一个节点类型
    if (Object.keys(window.nodeTypeStyles || {}).length <= 1) {
        console.log('Cannot delete the last node type');
        showToast('Cannot delete the last node type');
        return;
    }
    
    // 确认删除
    if (!confirm(`Are you sure you want to delete node type "${typeName}"?`)) {
        console.log('Deletion canceled by user');
        return;
    }
    
    // 从样式对象中删除
    if (window.nodeTypeStyles[typeName]) {
        delete window.nodeTypeStyles[typeName];
        console.log('Node type removed from window.nodeTypeStyles');
        
        // 保存到localStorage
        if (typeof window.saveNodeTypeStyles === 'function') {
            window.saveNodeTypeStyles();
            console.log('Node type styles saved to localStorage after deletion');
        }
    }
    
    // 从UI中删除对应的按钮
    const btn = document.querySelector(`.node-type-btn[data-type="${typeName}"]`);
    if (btn) {
        btn.remove();
        console.log('Node type button removed from UI');
    }
    
    showToast(`Node type ${typeName} deleted`);
    console.log('deleteNodeType completed - END');
};

/**
 * 删除关系类型
 * @param {string} typeName - 要删除的关系类型名称
 */
window.deleteRelationshipType = function(typeName) {
    if (!confirm(`Are you sure you want to delete relationship type ${typeName}?`)) {
        return;
    }
    
    // 从样式对象中删除
    if (window.relationshipTypeStyles && window.relationshipTypeStyles[typeName]) {
        delete window.relationshipTypeStyles[typeName];
        window.saveRelationshipTypeStyles();
    }
    
    // 从UI中删除对应的按钮
    const btn = document.querySelector(`.node-type-btn[data-type="${typeName}"]`);
    if (btn) {
        btn.remove();
    }
    
    showToast(`Relationship type ${typeName} deleted`);
};

/**
 * 初始化类型按钮
 */
window.initializeTypeButtons = function() {
    // 初始化节点类型按钮
    const nodeTypesContainer = document.querySelector('.panel-content');
    if (nodeTypesContainer) {
        nodeTypesContainer.innerHTML = '';
        
        const nodeStyles = window.nodeTypeStyles || {};
        for (const [type, style] of Object.entries(nodeStyles)) {
            const btn = document.createElement('div');
            btn.className = 'node-type-btn';
            btn.dataset.type = type;
            btn.innerHTML = `
                <i class="fa ${style.icon || 'fa-circle'} node-type-icon"></i>
                <span>${type}</span>
            `;
            
            // Add event listeners
            btn.addEventListener('click', function() {
                const clickedType = this.dataset.type;
                window.selectedNodeType = clickedType;
                document.querySelectorAll('.node-type-btn').forEach(b => b.classList.remove('active'));
                this.classList.add('active');
            });
            
            // 添加右键菜单支持编辑和删除
            btn.addEventListener('contextmenu', function(e) {
                e.preventDefault();
                const typeName = this.dataset.type;
                window.showContextMenu(e.clientX, e.clientY, [
                    { text: 'Edit', action: () => window.showEditNodeTypeModal && window.showEditNodeTypeModal(typeName) },
                    { text: 'Delete', action: () => window.deleteNodeType && window.deleteNodeType(typeName) }
                ]);
            });
            
            nodeTypesContainer.appendChild(btn);
        }
    }
    
    // 初始化关系类型按钮
    const relationshipTypesContainer = document.querySelectorAll('.panel')[1]?.querySelector('.panel-content');
    if (relationshipTypesContainer) {
        relationshipTypesContainer.innerHTML = '';
        
        const relStyles = window.relationshipTypeStyles || {};
        for (const [type, style] of Object.entries(relStyles)) {
            const btn = document.createElement('div');
            btn.className = 'node-type-btn';
            btn.dataset.type = type;
            btn.innerHTML = `
                <i class="fa fa-long-arrow-right node-type-icon"></i>
                <span>${type}</span>
            `;
            
            // Add event listener
            btn.addEventListener('click', function() {
                const clickedType = this.dataset.type;
                window.selectedRelationshipType = clickedType;
                document.querySelectorAll('.node-type-btn').forEach(b => b.classList.remove('active'));
                this.classList.add('active');
            });
            
            // 添加右键菜单支持编辑和删除
            btn.addEventListener('contextmenu', function(e) {
                e.preventDefault();
                const typeName = this.dataset.type;
                window.showContextMenu(e.clientX, e.clientY, [
                    { text: 'Edit', action: () => window.showEditRelationshipTypeModal && window.showEditRelationshipTypeModal(typeName) },
                    { text: 'Delete', action: () => window.deleteRelationshipType && window.deleteRelationshipType(typeName) }
                ]);
            });
            
            relationshipTypesContainer.appendChild(btn);
        }
    }
};