/**
 * 关系类型管理模块
 */

// 确保关系类型样式中包含默认的child_of和relat_to类型
if (!window.relationshipTypeStyles) {
    window.relationshipTypeStyles = {};
}

// 添加默认的关系类型
if (!window.relationshipTypeStyles['child_of']) {
    window.relationshipTypeStyles['child_of'] = { color: '#2196F3' };
}
if (!window.relationshipTypeStyles['relat_to']) {
    window.relationshipTypeStyles['relat_to'] = { color: '#FF9800' };
}

// 避免重复定义函数
if (typeof window.showAddRelationshipTypeModal !== 'function') {
    /**
     * 显示添加关系类型模态框
     */
    window.showAddRelationshipTypeModal = function() {
        // 获取模态框元素
        const modal = document.getElementById('add-relationship-type-modal');
        if (modal) {
            // 清除表单
            document.getElementById('new-relationship-type-name').value = '';
            document.getElementById('new-relationship-type-color').value = '#FF9800';
            
            // 显示模态框
            modal.classList.remove('hidden');
        }
    };
}

// 避免重复定义函数
if (typeof window.hideAddRelationshipTypeModal !== 'function') {
    /**
     * 隐藏添加关系类型模态框
     */
    window.hideAddRelationshipTypeModal = function() {
        const modal = document.getElementById('add-relationship-type-modal');
        if (modal) {
            modal.classList.add('hidden');
        }
    };
}

// 避免重复定义函数
if (typeof window.createRelationshipType !== 'function') {
    /**
     * 创建新的关系类型
     * @param {string} typeName - 关系类型名称
     * @param {string} color - 关系颜色
     */
    window.createRelationshipType = function(typeName, color) {
        try {
            // 验证输入
            if (!typeName || typeName.trim() === '') {
                window.showToast('Relationship type name cannot be empty', 'error');
                return false;
            }
            
            // 检查是否已存在
            if (window.relationshipTypeStyles[typeName]) {
                window.showToast('Relationship type already exists', 'error');
                return false;
            }
            
            // 添加新类型
            window.relationshipTypeStyles[typeName] = { color: color || '#FF9800' };
            
            // 保存到localStorage
            if (typeof window.saveRelationshipTypeStyles === 'function') {
                window.saveRelationshipTypeStyles(window.relationshipTypeStyles);
            }
            
            // 重新渲染关系类型按钮
            if (typeof window.renderRelationshipTypeButtons === 'function') {
                window.renderRelationshipTypeButtons();
            }
            
            window.showToast('Relationship type created: ' + typeName, 'success');
            return true;
        } catch (error) {
            window.handleError && window.handleError(error, 'Error creating relationship type');
            return false;
        }
    };
}

/**
 * 显示编辑关系类型模态框
 */
window.showEditRelationshipTypeModal = function(typeName) {
    if (!typeName) {
        console.error('Relationship type name is required');
        return;
    }
    
    // 获取当前关系类型的样式
    var currentStyle = window.relationshipTypeStyles[typeName] || { color: '#2196F3' };
    
    // 设置模态框表单值
    var modal = document.getElementById('edit-relationship-type-modal');
    var nameInput = document.getElementById('edit-relationship-type-name');
    var colorInput = document.getElementById('edit-relationship-type-color');
    
    if (nameInput) nameInput.value = typeName;
    if (colorInput) colorInput.value = currentStyle.color || '#2196F3';
    
    // 显示模态框
    if (modal) modal.classList.remove('hidden');
    
    // 保存当前编辑的类型名称到全局变量
    window.currentEditingRelationshipType = typeName;
};

// 避免重复定义函数
if (typeof window.editRelationshipType !== 'function') {
    /**
     * 编辑关系类型
     * @param {string} oldTypeName - 旧关系类型名称
     * @param {string} newTypeName - 新关系类型名称
     * @param {string} color - 新关系颜色
     */
    window.editRelationshipType = function(oldTypeName, newTypeName, color) {
        try {
            // 验证输入
            if (!oldTypeName || !window.relationshipTypeStyles[oldTypeName]) {
                window.showToast('Relationship type not found', 'error');
                return false;
            }
            
            if (!newTypeName || newTypeName.trim() === '') {
                window.showToast('Relationship type name cannot be empty', 'error');
                return false;
            }
            
            // 不允许编辑默认的关系类型名称
            if (oldTypeName === 'child_of' || oldTypeName === 'relat_to') {
                window.showToast('Cannot rename default relationship types', 'error');
                return false;
            }
            
            // 检查新名称是否已存在
            if (oldTypeName !== newTypeName && window.relationshipTypeStyles[newTypeName]) {
                window.showToast('Relationship type already exists', 'error');
                return false;
            }
            
            // 更新关系类型
            if (oldTypeName !== newTypeName) {
                // 如果名称改变，删除旧类型
                delete window.relationshipTypeStyles[oldTypeName];
            }
            
            // 创建或更新关系类型
            window.relationshipTypeStyles[newTypeName] = { color: color || '#FF9800' };
            
            // 保存到localStorage
            if (typeof window.saveRelationshipTypeStyles === 'function') {
                window.saveRelationshipTypeStyles(window.relationshipTypeStyles);
            }
            
            // 更新所有使用该类型的关系
            updateRelationshipsWithType(oldTypeName, newTypeName);
            
            // 重新渲染关系类型按钮
            if (typeof window.renderRelationshipTypeButtons === 'function') {
                window.renderRelationshipTypeButtons();
            }
            
            window.showToast('Relationship type updated: ' + newTypeName, 'success');
            return true;
        } catch (error) {
            window.handleError && window.handleError(error, 'Error editing relationship type');
            return false;
        }
    };
}

// 避免重复定义函数
if (typeof window.deleteRelationshipType !== 'function') {
    /**
     * 删除关系类型
     * @param {string} typeName - 要删除的关系类型名称
     */
    window.deleteRelationshipType = function(typeName) {
        try {
            // 验证输入
            if (!typeName || !window.relationshipTypeStyles[typeName]) {
                window.showToast('Relationship type not found', 'error');
                return false;
            }
            
            // 不允许删除默认的关系类型
            if (typeName === 'child_of' || typeName === 'relat_to') {
                window.showToast('Cannot delete default relationship types', 'error');
                return false;
            }
            
            // 检查是否有使用该类型的关系
            const instances = [window.cy, window.cyTree, window.cyNetwork].filter(Boolean);
            let hasRelationships = false;
            
            for (let i = 0; i < instances.length; i++) {
                const instance = instances[i];
                const rels = instance.edges(`[type = "${typeName}"]`);
                if (rels.length > 0) {
                    hasRelationships = true;
                    break;
                }
            }
            
            if (hasRelationships) {
                if (!confirm(`There are relationships using the "${typeName}" type. Are you sure you want to delete this type?`)) {
                    return false;
                }
                
                // 更新所有使用该类型的关系
                updateRelationshipsWithType(typeName, 'relat_to'); // 使用默认的relat_to替代
            }
            
            // 删除关系类型
            delete window.relationshipTypeStyles[typeName];
            
            // 保存到localStorage
            if (typeof window.saveRelationshipTypeStyles === 'function') {
                window.saveRelationshipTypeStyles(window.relationshipTypeStyles);
            }
            
            // 重新渲染关系类型按钮
            if (typeof window.renderRelationshipTypeButtons === 'function') {
                window.renderRelationshipTypeButtons();
            }
            
            window.showToast('Relationship type deleted: ' + typeName, 'success');
            return true;
        } catch (error) {
            window.handleError && window.handleError(error, 'Error deleting relationship type');
            return false;
        }
    };
}

/**
 * 更新所有使用指定类型的关系
 * @param {string} oldTypeName - 旧关系类型名称
 * @param {string} newTypeName - 新关系类型名称
 */
function updateRelationshipsWithType(oldTypeName, newTypeName) {
    try {
        const instances = [window.cy, window.cyTree, window.cyNetwork].filter(Boolean);
        
        instances.forEach(instance => {
            const relationships = instance.edges(`[type = "${oldTypeName}"]`);
            
            relationships.forEach(rel => {
                rel.data('type', newTypeName);
                rel.data('label', newTypeName);
            });
        });
        
        // 更新sharedGraphData
        if (window.sharedGraphData && window.sharedGraphData.edges) {
            window.sharedGraphData.edges.forEach(edge => {
                if (edge.data && edge.data.type === oldTypeName) {
                    edge.data.type = newTypeName;
                    edge.data.label = newTypeName;
                }
            });
        }
    } catch (error) {
        window.handleError && window.handleError(error, 'Error updating relationships with type');
    }
}

/**
 * 更新边的样式
 */
function updateEdgeStyle(edge, type, color, isSibling) {
    // 为旧浏览器提供默认值
    if (isSibling === undefined) {
        isSibling = false;
    }
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

/**
 * 初始化关系类型管理
 */
function initRelationshipTypeManager() {
    // 确保默认关系类型存在
    if (!window.relationshipTypeStyles['child_of']) {
        window.relationshipTypeStyles['child_of'] = { color: '#2196F3' };
    }
    if (!window.relationshipTypeStyles['relat_to']) {
        window.relationshipTypeStyles['relat_to'] = { color: '#FF9800' };
    }
    
    // 添加模态框事件监听器
    const closeBtn = document.getElementById('close-add-relationship-type-modal');
    const cancelBtn = document.getElementById('cancel-add-relationship-type-btn');
    const confirmBtn = document.getElementById('confirm-add-relationship-type-btn');
    
    if (closeBtn) closeBtn.onclick = window.hideAddRelationshipTypeModal;
    if (cancelBtn) cancelBtn.onclick = window.hideAddRelationshipTypeModal;
    
    if (confirmBtn) {
        confirmBtn.onclick = function() {
            const name = document.getElementById('new-relationship-type-name').value.trim();
            const color = document.getElementById('new-relationship-type-color').value;
            
            if (window.createRelationshipType(name, color)) {
                window.hideAddRelationshipTypeModal();
            }
        };
    }
    
    // 确保从localStorage加载关系类型样式
    if (typeof window.loadRelationshipTypeStyles === 'function') {
        window.loadRelationshipTypeStyles();
        // 重新添加默认类型，确保它们不会丢失
        if (!window.relationshipTypeStyles['child_of']) {
            window.relationshipTypeStyles['child_of'] = { color: '#2196F3' };
        }
        if (!window.relationshipTypeStyles['relat_to']) {
            window.relationshipTypeStyles['relat_to'] = { color: '#FF9800' };
        }
    }
    
    // 确保渲染关系类型按钮
    if (typeof window.renderRelationshipTypeButtons === 'function') {
        window.renderRelationshipTypeButtons();
    }
}

// 导出模块
window.relationshipTypeManager = {
    init: initRelationshipTypeManager
};

// 当文档加载完成时初始化
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initRelationshipTypeManager);
} else {
    initRelationshipTypeManager();
}