/**
 * 节点属性编辑模块
 * 负责处理Neo4j图中节点和边的属性编辑功能
 */

// 导入依赖
const utils = require('../utils/utils');

const nodePropertiesModule = {
    /**
     * 编辑节点属性
     * @param {string} nodeId - 节点ID
     */
    editNodeProperties: function(nodeId) {
        try {
            utils.debugLog(`开始编辑节点属性: ${nodeId}`);
            
            // 查找节点数据
            let nodeData = null;
            
            // 从共享图数据中查找
            if (window.cytoscapeModule && window.cytoscapeModule.sharedGraphData) {
                const node = window.cytoscapeModule.sharedGraphData.nodes.find(n => n.data.id === nodeId);
                if (node) {
                    nodeData = node.data;
                }
            }
            
            // 如果共享数据中没有，从视图实例中查找
            if (!nodeData) {
                const views = [window.cyTree, window.cyNetwork, window.cyFallback];
                for (let i = 0; i < views.length && !nodeData; i++) {
                    const view = views[i];
                    if (view) {
                        const node = view.getElementById(nodeId);
                        if (node && node.length > 0) {
                            nodeData = node.data();
                        }
                    }
                }
            }
            
            if (!nodeData) {
                throw new Error(`未找到节点: ${nodeId}`);
            }
            
            // 显示属性编辑面板
            this.renderNodeProperties(nodeId, nodeData);
            
        } catch (error) {
            utils.handleError(error, '编辑节点属性失败');
        }
    },
    
    /**
     * 渲染节点属性编辑界面
     * @param {string} nodeId - 节点ID
     * @param {Object} nodeData - 节点数据
     */
    renderNodeProperties: function(nodeId, nodeData) {
        // 创建或获取属性编辑面板
        let propertiesPanel = document.getElementById('node-properties-panel');
        if (!propertiesPanel) {
            propertiesPanel = this._createPropertiesPanel();
        }
        
        // 清空面板内容
        propertiesPanel.innerHTML = '';
        
        // 创建标题
        const title = document.createElement('h3');
        title.textContent = `编辑节点属性 (ID: ${nodeId})`;
        propertiesPanel.appendChild(title);
        
        // 创建表单
        const form = document.createElement('form');
        form.id = 'node-properties-form';
        
        // 添加ID字段（只读）
        form.appendChild(this._createFormField('id', 'ID', nodeData.id || nodeId, true));
        
        // 添加标签字段
        form.appendChild(this._createFormField('label', '标签', nodeData.label || '', false));
        
        // 添加类型字段
        form.appendChild(this._createFormField('type', '类型', nodeData.type || '', false));
        
        // 添加其他自定义属性
        for (const [key, value] of Object.entries(nodeData)) {
            if (!['id', 'label', 'type'].includes(key)) {
                form.appendChild(this._createFormField(key, key, value, false));
            }
        }
        
        // 添加添加新属性按钮
        const addPropertyBtn = document.createElement('button');
        addPropertyBtn.type = 'button';
        addPropertyBtn.textContent = '添加新属性';
        addPropertyBtn.className = 'btn btn-small';
        addPropertyBtn.addEventListener('click', this._addNewPropertyField.bind(this, form));
        form.appendChild(addPropertyBtn);
        
        // 添加分隔线
        const separator = document.createElement('hr');
        form.appendChild(separator);
        
        // 添加操作按钮
        const actionsDiv = document.createElement('div');
        actionsDiv.style.display = 'flex';
        actionsDiv.style.gap = '10px';
        actionsDiv.style.justifyContent = 'flex-end';
        
        const saveBtn = document.createElement('button');
        saveBtn.type = 'submit';
        saveBtn.textContent = '保存';
        saveBtn.className = 'btn btn-primary';
        
        const cancelBtn = document.createElement('button');
        cancelBtn.type = 'button';
        cancelBtn.textContent = '取消';
        cancelBtn.className = 'btn btn-secondary';
        cancelBtn.addEventListener('click', () => {
            propertiesPanel.style.display = 'none';
        });
        
        actionsDiv.appendChild(saveBtn);
        actionsDiv.appendChild(cancelBtn);
        form.appendChild(actionsDiv);
        
        // 添加表单提交事件
        form.addEventListener('submit', (event) => {
            event.preventDefault();
            this._saveNodeProperties(nodeId, form);
        });
        
        // 添加到面板
        propertiesPanel.appendChild(form);
        
        // 显示面板
        propertiesPanel.style.display = 'block';
    },
    
    /**
     * 编辑边属性
     * @param {string} edgeId - 边ID
     */
    editEdgeProperties: function(edgeId) {
        try {
            utils.debugLog(`开始编辑边属性: ${edgeId}`);
            
            // 查找边数据
            let edgeData = null;
            
            // 从共享图数据中查找
            if (window.cytoscapeModule && window.cytoscapeModule.sharedGraphData) {
                const edge = window.cytoscapeModule.sharedGraphData.edges.find(e => e.data.id === edgeId);
                if (edge) {
                    edgeData = edge.data;
                }
            }
            
            // 如果共享数据中没有，从视图实例中查找
            if (!edgeData) {
                const views = [window.cyTree, window.cyNetwork, window.cyFallback];
                for (let i = 0; i < views.length && !edgeData; i++) {
                    const view = views[i];
                    if (view) {
                        const edge = view.getElementById(edgeId);
                        if (edge && edge.length > 0) {
                            edgeData = edge.data();
                        }
                    }
                }
            }
            
            if (!edgeData) {
                throw new Error(`未找到边: ${edgeId}`);
            }
            
            // 显示属性编辑面板
            this.renderEdgeProperties(edgeId, edgeData);
            
        } catch (error) {
            utils.handleError(error, '编辑边属性失败');
        }
    },
    
    /**
     * 渲染边属性编辑界面
     * @param {string} edgeId - 边ID
     * @param {Object} edgeData - 边数据
     */
    renderEdgeProperties: function(edgeId, edgeData) {
        // 创建或获取属性编辑面板
        let propertiesPanel = document.getElementById('node-properties-panel');
        if (!propertiesPanel) {
            propertiesPanel = this._createPropertiesPanel();
        }
        
        // 清空面板内容
        propertiesPanel.innerHTML = '';
        
        // 创建标题
        const title = document.createElement('h3');
        title.textContent = `编辑边属性 (ID: ${edgeId})`;
        propertiesPanel.appendChild(title);
        
        // 创建表单
        const form = document.createElement('form');
        form.id = 'edge-properties-form';
        
        // 添加ID字段（只读）
        form.appendChild(this._createFormField('id', 'ID', edgeData.id || edgeId, true));
        
        // 添加源节点ID字段（只读）
        form.appendChild(this._createFormField('source', '源节点', edgeData.source || '', true));
        
        // 添加目标节点ID字段（只读）
        form.appendChild(this._createFormField('target', '目标节点', edgeData.target || '', true));
        
        // 添加标签字段
        form.appendChild(this._createFormField('label', '关系类型', edgeData.label || '', false));
        
        // 添加其他自定义属性
        for (const [key, value] of Object.entries(edgeData)) {
            if (!['id', 'source', 'target', 'label'].includes(key)) {
                form.appendChild(this._createFormField(key, key, value, false));
            }
        }
        
        // 添加添加新属性按钮
        const addPropertyBtn = document.createElement('button');
        addPropertyBtn.type = 'button';
        addPropertyBtn.textContent = '添加新属性';
        addPropertyBtn.className = 'btn btn-small';
        addPropertyBtn.addEventListener('click', this._addNewPropertyField.bind(this, form));
        form.appendChild(addPropertyBtn);
        
        // 添加分隔线
        const separator = document.createElement('hr');
        form.appendChild(separator);
        
        // 添加操作按钮
        const actionsDiv = document.createElement('div');
        actionsDiv.style.display = 'flex';
        actionsDiv.style.gap = '10px';
        actionsDiv.style.justifyContent = 'flex-end';
        
        const saveBtn = document.createElement('button');
        saveBtn.type = 'submit';
        saveBtn.textContent = '保存';
        saveBtn.className = 'btn btn-primary';
        
        const cancelBtn = document.createElement('button');
        cancelBtn.type = 'button';
        cancelBtn.textContent = '取消';
        cancelBtn.className = 'btn btn-secondary';
        cancelBtn.addEventListener('click', () => {
            propertiesPanel.style.display = 'none';
        });
        
        actionsDiv.appendChild(saveBtn);
        actionsDiv.appendChild(cancelBtn);
        form.appendChild(actionsDiv);
        
        // 添加表单提交事件
        form.addEventListener('submit', (event) => {
            event.preventDefault();
            this._saveEdgeProperties(edgeId, form);
        });
        
        // 添加到面板
        propertiesPanel.appendChild(form);
        
        // 显示面板
        propertiesPanel.style.display = 'block';
    },
    
    /**
     * 创建属性编辑面板
     * @private
     * @returns {HTMLElement} 面板元素
     */
    _createPropertiesPanel: function() {
        const panel = document.createElement('div');
        panel.id = 'node-properties-panel';
        panel.style.position = 'fixed';
        panel.style.top = '50%';
        panel.style.left = '50%';
        panel.style.transform = 'translate(-50%, -50%)';
        panel.style.width = '400px';
        panel.style.maxWidth = '90vw';
        panel.style.maxHeight = '80vh';
        panel.style.backgroundColor = 'white';
        panel.style.border = '1px solid #ddd';
        panel.style.borderRadius = '8px';
        panel.style.padding = '20px';
        panel.style.boxShadow = '0 4px 20px rgba(0,0,0,0.15)';
        panel.style.zIndex = '1000';
        panel.style.display = 'none';
        panel.style.overflowY = 'auto';
        
        // 添加全局样式
        const style = document.createElement('style');
        style.textContent = `
            .property-field {
                margin-bottom: 15px;
            }
            .property-field label {
                display: block;
                margin-bottom: 5px;
                font-weight: bold;
                font-size: 14px;
            }
            .property-field input {
                width: 100%;
                padding: 8px 12px;
                border: 1px solid #ddd;
                border-radius: 4px;
                font-size: 14px;
                box-sizing: border-box;
            }
            .property-field input:disabled {
                background-color: #f5f5f5;
                color: #666;
            }
            .btn {
                padding: 8px 16px;
                border: none;
                border-radius: 4px;
                font-size: 14px;
                cursor: pointer;
                transition: background-color 0.2s;
            }
            .btn-primary {
                background-color: #007bff;
                color: white;
            }
            .btn-primary:hover {
                background-color: #0056b3;
            }
            .btn-secondary {
                background-color: #6c757d;
                color: white;
            }
            .btn-secondary:hover {
                background-color: #545b62;
            }
            .btn-small {
                padding: 6px 12px;
                font-size: 12px;
                background-color: #e9ecef;
                color: #495057;
            }
            .btn-small:hover {
                background-color: #dee2e6;
            }
            .property-actions {
                display: flex;
                gap: 5px;
                align-items: center;
            }
            .remove-property {
                padding: 4px 8px;
                background-color: #dc3545;
                color: white;
                border: none;
                border-radius: 4px;
                cursor: pointer;
                font-size: 12px;
            }
            .remove-property:hover {
                background-color: #c82333;
            }
        `;
        document.head.appendChild(style);
        
        // 添加到DOM
        document.body.appendChild(panel);
        
        return panel;
    },
    
    /**
     * 创建表单字段
     * @private
     * @param {string} name - 字段名
     * @param {string} label - 显示标签
     * @param {*} value - 字段值
     * @param {boolean} disabled - 是否禁用
     * @returns {HTMLElement} 字段容器
     */
    _createFormField: function(name, label, value, disabled) {
        const container = document.createElement('div');
        container.className = 'property-field';
        container.dataset.propertyName = name;
        
        const fieldLabel = document.createElement('label');
        fieldLabel.textContent = label;
        fieldLabel.setAttribute('for', `property-${name}`);
        
        const input = document.createElement('input');
        input.type = 'text';
        input.id = `property-${name}`;
        input.name = name;
        input.value = value !== undefined && value !== null ? String(value) : '';
        input.disabled = disabled;
        
        // 只对非系统字段添加删除按钮
        if (!disabled) {
            const actionsDiv = document.createElement('div');
            actionsDiv.className = 'property-actions';
            actionsDiv.style.marginTop = '5px';
            
            const removeBtn = document.createElement('button');
            removeBtn.type = 'button';
            removeBtn.textContent = '删除';
            removeBtn.className = 'remove-property';
            removeBtn.addEventListener('click', () => {
                container.remove();
            });
            
            actionsDiv.appendChild(removeBtn);
            container.appendChild(actionsDiv);
        }
        
        container.appendChild(fieldLabel);
        container.appendChild(input);
        
        return container;
    },
    
    /**
     * 添加新的属性字段
     * @private
     * @param {HTMLElement} form - 表单元素
     */
    _addNewPropertyField: function(form) {
        const container = document.createElement('div');
        container.className = 'property-field';
        container.dataset.isNew = 'true';
        
        const row = document.createElement('div');
        row.style.display = 'flex';
        row.style.gap = '10px';
        
        const nameInput = document.createElement('input');
        nameInput.type = 'text';
        nameInput.placeholder = '属性名';
        nameInput.style.width = '40%';
        nameInput.required = true;
        
        const valueInput = document.createElement('input');
        valueInput.type = 'text';
        valueInput.placeholder = '属性值';
        valueInput.style.width = '40%';
        
        const removeBtn = document.createElement('button');
        removeBtn.type = 'button';
        removeBtn.textContent = '删除';
        removeBtn.className = 'remove-property';
        removeBtn.style.width = '20%';
        removeBtn.addEventListener('click', () => {
            container.remove();
        });
        
        row.appendChild(nameInput);
        row.appendChild(valueInput);
        row.appendChild(removeBtn);
        
        const fieldLabel = document.createElement('label');
        fieldLabel.textContent = '新属性';
        
        container.appendChild(fieldLabel);
        container.appendChild(row);
        
        // 插入到添加按钮之前
        const addBtn = form.querySelector('button[type="button"]');
        form.insertBefore(container, addBtn);
    },
    
    /**
     * 保存节点属性
     * @private
     * @param {string} nodeId - 节点ID
     * @param {HTMLElement} form - 表单元素
     */
    _saveNodeProperties: function(nodeId, form) {
        try {
            // 收集表单数据
            const formData = {};
            
            // 获取标准字段
            const inputs = form.querySelectorAll('input:not([disabled])');
            inputs.forEach(input => {
                if (input.name) {
                    formData[input.name] = input.value.trim();
                }
            });
            
            // 获取新添加的属性
            const newPropertyFields = form.querySelectorAll('.property-field[data-is-new="true"]');
            newPropertyFields.forEach(field => {
                const nameInput = field.querySelector('input[placeholder="属性名"]');
                const valueInput = field.querySelector('input[placeholder="属性值"]');
                
                if (nameInput && nameInput.value.trim()) {
                    formData[nameInput.value.trim()] = valueInput ? valueInput.value.trim() : '';
                }
            });
            
            // 更新节点数据
            this._updateElementData(nodeId, formData, true);
            
            // 隐藏面板
            const panel = document.getElementById('node-properties-panel');
            if (panel) {
                panel.style.display = 'none';
            }
            
            utils.showToast('节点属性已更新');
            
        } catch (error) {
            utils.handleError(error, '保存节点属性失败');
        }
    },
    
    /**
     * 保存边属性
     * @private
     * @param {string} edgeId - 边ID
     * @param {HTMLElement} form - 表单元素
     */
    _saveEdgeProperties: function(edgeId, form) {
        try {
            // 收集表单数据
            const formData = {};
            
            // 获取标准字段
            const inputs = form.querySelectorAll('input:not([disabled])');
            inputs.forEach(input => {
                if (input.name) {
                    formData[input.name] = input.value.trim();
                }
            });
            
            // 获取新添加的属性
            const newPropertyFields = form.querySelectorAll('.property-field[data-is-new="true"]');
            newPropertyFields.forEach(field => {
                const nameInput = field.querySelector('input[placeholder="属性名"]');
                const valueInput = field.querySelector('input[placeholder="属性值"]');
                
                if (nameInput && nameInput.value.trim()) {
                    formData[nameInput.value.trim()] = valueInput ? valueInput.value.trim() : '';
                }
            });
            
            // 更新边数据
            this._updateElementData(edgeId, formData, false);
            
            // 隐藏面板
            const panel = document.getElementById('node-properties-panel');
            if (panel) {
                panel.style.display = 'none';
            }
            
            utils.showToast('边属性已更新');
            
        } catch (error) {
            utils.handleError(error, '保存边属性失败');
        }
    },
    
    /**
     * 更新元素数据
     * @private
     * @param {string} elementId - 元素ID
     * @param {Object} newData - 新数据
     * @param {boolean} isNode - 是否为节点
     */
    _updateElementData: function(elementId, newData, isNode) {
        // 更新共享数据
        if (window.cytoscapeModule && window.cytoscapeModule.sharedGraphData) {
            const collection = isNode ? 
                window.cytoscapeModule.sharedGraphData.nodes : 
                window.cytoscapeModule.sharedGraphData.edges;
            
            const element = collection.find(e => e.data.id === elementId);
            if (element) {
                Object.assign(element.data, newData);
            }
        }
        
        // 更新所有视图
        const views = [window.cyTree, window.cyNetwork, window.cyFallback];
        views.forEach(view => {
            if (view) {
                const element = view.getElementById(elementId);
                if (element && element.length > 0) {
                    // 保留必要的数据
                    const currentData = element.data();
                    if (isNode) {
                        newData.id = elementId; // 确保ID不变
                    } else {
                        newData.id = elementId;
                        newData.source = currentData.source;
                        newData.target = currentData.target;
                    }
                    
                    // 更新数据
                    element.data(newData);
                }
            }
        });
    }
};

// 为了向后兼容，暴露关键功能到window对象
window.editNodeProperties = window.editNodeProperties || function(nodeId) {
    nodePropertiesModule.editNodeProperties(nodeId);
};

window.renderNodeProperties = window.renderNodeProperties || function(nodeId, nodeData) {
    nodePropertiesModule.renderNodeProperties(nodeId, nodeData);
};

window.editEdgeProperties = window.editEdgeProperties || function(edgeId) {
    nodePropertiesModule.editEdgeProperties(edgeId);
};

module.exports = nodePropertiesModule;
