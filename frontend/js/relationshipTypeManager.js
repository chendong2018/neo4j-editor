/**
 * 关系类型管理模块
 */

/**
 * 添加新的关系类型
 */
window.addRelationshipType = function() {
    const name = document.getElementById('new-relationship-type-name').value;
    const color = document.getElementById('new-relationship-type-color').value;
    
    if (!name) {
        if (typeof window.showToast === 'function') {
            window.showToast('Name is required');
        }
        return;
    }
    
    // 检查是否已存在
    if (window.relationshipTypeStyles[name]) {
        if (typeof window.showToast === 'function') {
            window.showToast(`Relationship type ${name} already exists`);
        }
        return;
    }
    
    // Add to relationship type styles
    window.relationshipTypeStyles[name] = {
        'line-color': color,
        'target-arrow-color': color
    };
    
    // 保存到localStorage
    if (typeof window.saveRelationshipTypeStyles === 'function') {
        window.saveRelationshipTypeStyles();
    }
    
    // Add to relationship type buttons
    const relationshipTypesContainer = document.querySelectorAll('.panel')[1]?.querySelector('.panel-content');
    if (relationshipTypesContainer) {
        const btn = document.createElement('div');
        btn.className = 'node-type-btn';
        btn.dataset.type = name;
        btn.innerHTML = `
            <i class="fa fa-long-arrow-right node-type-icon"></i>
            <span>${name}</span>
        `;
        
        // Add event listener
        btn.addEventListener('click', function() {
            const type = this.dataset.type;
            window.selectedRelationshipType = type;
            document.querySelectorAll('.node-type-btn').forEach(b => b.classList.remove('active'));
            this.classList.add('active');
        });
        
        // 添加右键菜单支持编辑和删除
        btn.addEventListener('contextmenu', function(e) {
            e.preventDefault();
            if (typeof window.showContextMenu === 'function') {
                window.showContextMenu(e.clientX, e.clientY, [
                    { text: 'Edit', action: () => window.showEditRelationshipTypeModal(name) },
                    { text: 'Delete', action: () => window.deleteRelationshipType(name) }
                ]);
            }
        });
        
        relationshipTypesContainer.appendChild(btn);
    }
    
    // Close modal
    const modal = document.getElementById('add-relationship-type-modal');
    if (modal) {
        modal.classList.add('hidden');
    }
    
    // Reset form
    const nameInput = document.getElementById('new-relationship-type-name');
    if (nameInput) {
        nameInput.value = '';
    }
    
    // Show toast
    if (typeof window.showToast === 'function') {
        window.showToast(`Relationship type ${name} added`);
    }
};

/**
 * 显示编辑关系类型模态框
 */
window.showEditRelationshipTypeModal = function(typeName) {
    if (!typeName) {
        console.error('Relationship type name is required');
        return;
    }
    
    // 获取当前关系类型的样式
    const currentStyle = window.relationshipTypeStyles[typeName] || { 'line-color': '#2196F3', 'target-arrow-color': '#2196F3' };
    
    // 设置模态框表单值
    const modal = document.getElementById('edit-relationship-type-modal');
    const nameInput = document.getElementById('edit-relationship-type-name');
    const colorInput = document.getElementById('edit-relationship-type-color');
    
    if (nameInput) nameInput.value = typeName;
    if (colorInput) colorInput.value = currentStyle['line-color'] || '#2196F3';
    
    // 显示模态框
    if (modal) modal.classList.remove('hidden');
    
    // 保存当前编辑的类型名称到全局变量
    window.currentEditingRelationshipType = typeName;
};

/**
 * 编辑关系类型
 */
window.editRelationshipType = function() {
    const newName = document.getElementById('edit-relationship-type-name').value;
    const newColor = document.getElementById('edit-relationship-type-color').value;
    const oldName = window.currentEditingRelationshipType;
    
    if (!newName) {
        if (typeof window.showToast === 'function') {
            window.showToast('Name is required');
        }
        return;
    }
    
    // 检查名称是否冲突（如果名称改变了）
    if (newName !== oldName && window.relationshipTypeStyles[newName]) {
        if (typeof window.showToast === 'function') {
            window.showToast(`Relationship type ${newName} already exists`);
        }
        return;
    }
    
    // 创建新样式对象
    const newStyle = {
        'line-color': newColor,
        'target-arrow-color': newColor
    };
    
    // 如果名称改变了，需要删除旧的样式并添加新的
    if (newName !== oldName) {
        // 删除旧样式
        delete window.relationshipTypeStyles[oldName];
    }
    
    // 添加新样式
    window.relationshipTypeStyles[newName] = newStyle;
    
    // 更新所有使用此关系类型的边
    const cys = [window.cyTree, window.cyNetwork].filter(Boolean);
    cys.forEach(cy => {
        cy.edges().forEach(edge => {
            if (edge.data('type') === oldName) {
                edge.data('type', newName);
                updateEdgeStyle(edge, newName, newColor);
            }
        });
    });
    
    // 更新按钮显示
    document.querySelectorAll('.node-type-btn').forEach(btn => {
        if (btn.dataset.type === oldName) {
            btn.dataset.type = newName;
            const span = btn.querySelector('span');
            if (span) span.textContent = newName;
        }
    });
    
    // 保存到localStorage
    if (typeof window.saveRelationshipTypeStyles === 'function') {
        window.saveRelationshipTypeStyles();
    }
    
    // 关闭模态框
    const modal = document.getElementById('edit-relationship-type-modal');
    if (modal) modal.classList.add('hidden');
    
    // 显示提示
    if (typeof window.showToast === 'function') {
        window.showToast(`Relationship type ${oldName} updated to ${newName}`);
    }
};

/**
 * 删除关系类型
 */
window.deleteRelationshipType = function(name) {
    if (!name) {
        console.error('Relationship type name is required');
        return;
    }
    
    // 确认删除
    if (!confirm(`Are you sure you want to delete relationship type ${name}?`)) {
        return;
    }
    
    // 检查是否有边使用此关系类型
    let hasEdgesUsingType = false;
    const cys = [window.cyTree, window.cyNetwork].filter(Boolean);
    
    cys.forEach(cy => {
        const edges = cy.edges(`[data-type="${name}"]`);
        if (edges && edges.length > 0) {
            hasEdgesUsingType = true;
            // 删除使用此关系类型的边
            edges.remove();
        }
    });
    
    // 删除样式
    delete window.relationshipTypeStyles[name];
    
    // 更新按钮
    const btn = document.querySelector(`.node-type-btn[data-type="${name}"]`);
    if (btn) {
        btn.remove();
    }
    
    // 保存到localStorage
    if (typeof window.saveRelationshipTypeStyles === 'function') {
        window.saveRelationshipTypeStyles();
    }
    
    // 显示提示
    if (typeof window.showToast === 'function') {
        const message = hasEdgesUsingType 
            ? `Relationship type ${name} deleted and all related edges removed` 
            : `Relationship type ${name} deleted`;
        window.showToast(message);
    }
    
    // 如果当前选中的是这个关系类型，清除选中状态
    if (window.selectedRelationshipType === name) {
        window.selectedRelationshipType = null;
    }
};

/**
 * 保存关系类型样式到localStorage
 */
window.saveRelationshipTypeStyles = function() {
    try {
        if (window.relationshipTypeStyles) {
            localStorage.setItem('neo4j-editor-relationship-types', JSON.stringify(window.relationshipTypeStyles));
            console.log('Relationship type styles saved to localStorage');
        }
    } catch (err) {
        console.error('Failed to save relationship type styles:', err);
    }
};

/**
 * 更新边的样式
 */
function updateEdgeStyle(edge, type, color, isSibling = false) {
    try {
        // 设置关系类型
        edge.data('type', type);
        
        // 设置样式
        edge.style({
            'line-color': color,
            'target-arrow-color': color
        });
        
        // 如果是同级关系，添加额外样式
        if (isSibling) {
            edge.style({
                'source-arrow-color': color,
                'source-arrow-shape': 'triangle',
                'curve-style': 'bezier'
            });
        }
    } catch (err) {
        console.error('Failed to update edge style:', err);
    }
}