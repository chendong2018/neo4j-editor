/**
 * Neo4j Editor - 属性编辑器组件模块
 * 处理节点和边属性的编辑与管理
 */

// 安全创建命名空间，避免覆盖现有对象
window.neo4jEditor = window.neo4jEditor || {};

/**
 * 创建向后兼容函数
 * @param {string} deprecatedName - 旧函数名称
 * @param {Function} newFunction - 新函数实现
 * @param {Object} context - 函数执行上下文
 * @returns {Function|null} 包装后的兼容函数
 */
function createBackwardCompatibilityFunction(deprecatedName, newFunction, context) {
    try {
        // 参数安全检查
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
    } catch (error) {
        console.error('createBackwardCompatibilityFunction: 创建兼容函数时出错:', error);
        return null;
    }
}

/**
 * 属性编辑器模块
 * 提供节点和边属性的可视化编辑功能
 */
const propertyEditorModule = {
    initialized: false,
    container: null,
    
    /**
     * 初始化属性编辑器
     * @param {HTMLElement} container - 属性编辑器容器元素
     * @returns {boolean} 初始化是否成功
     */
    initialize: function(container) {
        console.log('Neo4j Editor: Initializing property editor');
        
        try {
            // 参数安全检查
            if (!container || !(container instanceof HTMLElement)) {
                console.error('Neo4j Editor: Property editor container not found or invalid');
                return false;
            }
            
            // 存储容器引用
            this.container = container;
            window.neo4jEditor.propertyEditorContainer = container;
            
            // 初始化编辑器内容
            this.renderEmptyPropertyEditor();
            
            // 标记为已初始化
            this.initialized = true;
            console.log('Neo4j Editor: Property editor initialized successfully');
            return true;
            
        } catch (error) {
            console.error('Neo4j Editor: Error initializing property editor:', error);
            return false;
        }
    },
    
    /**
     * 渲染空的属性编辑器
     */
    renderEmptyPropertyEditor: function() {
        try {
            const container = this.container || window.neo4jEditor.propertyEditorContainer;
            if (!container) return;
            
            container.innerHTML = `
                <div class="neo4j-property-editor-empty">
                    <p>请选择一个节点或关系来编辑其属性</p>
                </div>
            `;
        } catch (error) {
            console.error('Neo4j Editor: Error rendering empty property editor:', error);
        }
    },
    
    /**
     * 显示节点属性
     * @param {Object} node - Cytoscape节点对象
     */
    showNodeProperties: function(node) {
        console.log('Neo4j Editor: Showing node properties', node);
        
        try {
            // 参数安全检查
            if (!node || typeof node.data !== 'function') {
                console.error('Neo4j Editor: Invalid node object - missing data() method');
                this.renderEmptyPropertyEditor();
                return;
            }
            
            const container = this.container || window.neo4jEditor.propertyEditorContainer;
            if (!container) {
                console.error('Neo4j Editor: Property editor container not found');
                return;
            }
            
            const data = node.data();
            
            // 构建属性编辑器HTML
            let html = `
                <div class="neo4j-property-editor-header">
                    <h3>节点属性</h3>
                    <div class="node-labels">
                        ${this.renderNodeLabels(data.labels || [])}
                    </div>
                </div>
                <div class="neo4j-property-editor-content">
                    <div class="property-group">
                        <h4>基础属性</h4>
                        ${this.renderPropertyField('id', data.id, 'text', true)}
                        ${this.renderPropertyField('code', data.code || '', 'text')}
                    </div>
            `;
            
            // 添加自定义属性
            html += `
                    <div class="property-group">
                        <h4>自定义属性</h4>
            `;
            
            // 提取所有非系统属性
            Object.keys(data).forEach(key => {
                if (!['id', 'labels', 'code', 'parent'].includes(key)) {
                    html += this.renderPropertyField(key, data[key], this.getPropertyType(data[key]));
                }
            });
            
            // 添加添加属性按钮
            html += `
                    </div>
                    <div class="neo4j-property-editor-footer">
                        <button id="add-property-btn" class="neo4j-btn neo4j-btn-secondary">
                            添加属性
                        </button>
                        <button id="save-properties-btn" class="neo4j-btn neo4j-btn-primary">
                            保存
                        </button>
                    </div>
                </div>
            `;
            
            container.innerHTML = html;
            
            // 添加事件监听器
            this.setupPropertyEditorEvents(node);
            
        } catch (error) {
            console.error('Neo4j Editor: Error rendering node properties:', error);
            this.renderEmptyPropertyEditor();
        }
    },
    
    /**
     * 显示边属性
     * @param {Object} edge - Cytoscape边对象
     */
    showEdgeProperties: function(edge) {
        console.log('Neo4j Editor: Showing edge properties', edge);
        
        try {
            // 参数安全检查
            if (!edge || typeof edge.data !== 'function') {
                console.error('Neo4j Editor: Invalid edge object - missing data() method');
                this.renderEmptyPropertyEditor();
                return;
            }
            
            const container = this.container || window.neo4jEditor.propertyEditorContainer;
            if (!container) {
                console.error('Neo4j Editor: Property editor container not found');
                return;
            }
            
            const data = edge.data();
            
            // 构建属性编辑器HTML
            let html = `
                <div class="neo4j-property-editor-header">
                    <h3>关系属性</h3>
                    <div class="relationship-type">
                        <span class="type-label">类型:</span> <span class="type-value">${data.type || 'RELATES_TO'}</span>
                    </div>
                </div>
                <div class="neo4j-property-editor-content">
                    <div class="property-group">
                        <h4>基础属性</h4>
                        ${this.renderPropertyField('id', data.id, 'text', true)}
                        ${this.renderPropertyField('type', data.type || 'RELATES_TO', 'text')}
                        ${this.renderPropertyField('source', data.source, 'text', true)}
                        ${this.renderPropertyField('target', data.target, 'text', true)}
                        ${this.renderPropertyField('label', data.label || '', 'text')}
                    </div>
            `;
            
            // 添加自定义属性
            html += `
                    <div class="property-group">
                        <h4>自定义属性</h4>
            `;
            
            // 提取所有非系统属性
            Object.keys(data).forEach(key => {
                if (!['id', 'type', 'source', 'target', 'label'].includes(key)) {
                    html += this.renderPropertyField(key, data[key], this.getPropertyType(data[key]));
                }
            });
            
            // 添加添加属性按钮
            html += `
                    </div>
                    <div class="neo4j-property-editor-footer">
                        <button id="add-property-btn" class="neo4j-btn neo4j-btn-secondary">
                            添加属性
                        </button>
                        <button id="save-properties-btn" class="neo4j-btn neo4j-btn-primary">
                            保存
                        </button>
                    </div>
                </div>
            `;
            
            container.innerHTML = html;
            
            // 添加事件监听器
            this.setupPropertyEditorEvents(edge);
            
        } catch (error) {
            console.error('Neo4j Editor: Error rendering edge properties:', error);
            this.renderEmptyPropertyEditor();
        }
    },
    
    /**
     * 渲染节点标签
     * @param {Array} labels - 标签数组
     * @returns {string} HTML字符串
     */
    renderNodeLabels: function(labels) {
        try {
            if (!Array.isArray(labels) || labels.length === 0) {
                return '<span class="label">Node</span>';
            }
            
            return labels.map(label => `<span class="label">${label}</span>`).join(' ');
        } catch (error) {
            console.error('Neo4j Editor: Error rendering node labels:', error);
            return '<span class="label">Node</span>';
        }
    },
    
    /**
     * 渲染属性字段
     * @param {string} name - 属性名称
     * @param {*} value - 属性值
     * @param {string} type - 字段类型
     * @param {boolean} disabled - 是否禁用
     * @returns {string} HTML字符串
     */
    renderPropertyField: function(name, value, type = 'text', disabled = false) {
        try {
            const disabledAttr = disabled ? 'disabled' : '';
            const valueStr = value !== undefined && value !== null ? value : '';
            
            switch (type) {
                case 'boolean':
                    return `
                        <div class="property-field">
                            <label>${name}:</label>
                            <input type="checkbox" name="${name}" ${valueStr ? 'checked' : ''} ${disabledAttr}>
                        </div>
                    `;
                case 'number':
                    return `
                        <div class="property-field">
                            <label>${name}:</label>
                            <input type="number" name="${name}" value="${valueStr}" ${disabledAttr}>
                        </div>
                    `;
                case 'text':
                default:
                    return `
                        <div class="property-field">
                            <label>${name}:</label>
                            <input type="text" name="${name}" value="${valueStr}" ${disabledAttr}>
                        </div>
                    `;
            }
        } catch (error) {
            console.error('Neo4j Editor: Error rendering property field:', error);
            return '';
        }
    },
    
    /**
     * 获取属性类型
     * @param {*} value - 属性值
     * @returns {string} 类型名称
     */
    getPropertyType: function(value) {
        try {
            if (value === undefined || value === null) {
                return 'text';
            }
            
            if (typeof value === 'boolean') {
                return 'boolean';
            }
            
            if (typeof value === 'number') {
                return 'number';
            }
            
            return 'text';
        } catch (error) {
            console.error('Neo4j Editor: Error determining property type:', error);
            return 'text';
        }
    },
    
    /**
     * 设置属性编辑器事件
     * @param {Object} element - Cytoscape元素对象
     */
    setupPropertyEditorEvents: function(element) {
        try {
            const container = this.container || window.neo4jEditor.propertyEditorContainer;
            if (!container) return;
            
            // 保存按钮事件
            const saveBtn = container.querySelector('#save-properties-btn');
            if (saveBtn) {
                saveBtn.addEventListener('click', () => {
                    this.saveProperties(element);
                });
            }
            
            // 添加属性按钮事件
            const addBtn = container.querySelector('#add-property-btn');
            if (addBtn) {
                addBtn.addEventListener('click', () => {
                    this.addNewProperty(element);
                });
            }
        } catch (error) {
            console.error('Neo4j Editor: Error setting up property editor events:', error);
        }
    },
    
    /**
     * 保存属性
     * @param {Object} element - Cytoscape元素对象
     * @returns {boolean} 保存是否成功
     */
    saveProperties: function(element) {
        // 参数安全检查
        if (!element || typeof element.data !== 'function') {
            console.error('Neo4j Editor: Invalid element for saving properties');
            return false;
        }
        
        console.log('Neo4j Editor: Saving properties for element', element.id ? element.id() : 'unknown');
        
        try {
            const container = this.container || window.neo4jEditor.propertyEditorContainer;
            if (!container) {
                console.error('Neo4j Editor: Property editor container not found');
                return false;
            }
            
            const data = {};
            
            // 收集所有属性字段
            const inputs = container.querySelectorAll('input, select, textarea');
            inputs.forEach(input => {
                if (!input.disabled && input.name) {
                    const name = input.name;
                    
                    if (input.type === 'checkbox') {
                        data[name] = input.checked;
                    } else if (input.type === 'number') {
                        data[name] = input.value ? parseFloat(input.value) : 0;
                    } else {
                        data[name] = input.value;
                    }
                }
            });
            
            // 更新元素数据
            element.data(data);
            
            // 同步数据到两个视图
            try {
                if (window.viewSync && typeof window.viewSync.syncData === 'function') {
                    window.viewSync.syncData();
                } else if (typeof window.syncGraphData === 'function') {
                    window.syncGraphData();
                }
            } catch (syncError) {
                console.error('Neo4j Editor: Error syncing data after saving properties:', syncError);
            }
            
            // 触发数据更新事件
            const eventName = element.isNode && element.isNode() ? 'nodeUpdated' : 'edgeUpdated';
            try {
                if (window.neo4jEditor && typeof window.neo4jEditor.triggerEvent === 'function') {
                    window.neo4jEditor.triggerEvent(eventName, { elementId: element.id ? element.id() : 'unknown' });
                }
            } catch (eventError) {
                console.error('Neo4j Editor: Error triggering event after saving properties:', eventError);
            }
            
            // 显示成功提示
            try {
                if (window.utils && typeof window.utils.showToast === 'function') {
                    window.utils.showToast('属性保存成功');
                } else if (typeof window.showToast === 'function') {
                    window.showToast('属性保存成功');
                }
            } catch (toastError) {
                console.error('Neo4j Editor: Failed to show success toast:', toastError);
            }
            
            return true;
            
        } catch (error) {
            console.error('Neo4j Editor: Error saving properties:', error);
            
            // 显示错误提示
            try {
                if (window.utils && typeof window.utils.showToast === 'function') {
                    window.utils.showToast('属性保存失败', 'error');
                } else if (typeof window.showToast === 'function') {
                    window.showToast('属性保存失败', 'error');
                }
            } catch (toastError) {
                console.error('Neo4j Editor: Failed to show error toast:', toastError);
            }
            
            return false;
        }
    },
    
    /**
     * 添加新属性
     * @param {Object} element - Cytoscape元素对象
     */
    addNewProperty: function(element) {
        // 参数安全检查
        if (!element || typeof element.data !== 'function') {
            console.error('Neo4j Editor: Invalid element for adding property');
            return;
        }
        
        try {
            const container = this.container || window.neo4jEditor.propertyEditorContainer;
            if (!container) return;
            
            const propertyGroup = container.querySelector('.property-group:last-child');
            if (!propertyGroup) return;
            
            const newPropertyHtml = `
                <div class="property-field new-property">
                    <label>
                        <input type="text" class="property-name" placeholder="属性名称">
                    </label>
                    <input type="text" class="property-value" placeholder="属性值">
                    <button class="apply-property-btn">应用</button>
                </div>
            `;
            
            // 创建临时容器
            const tempDiv = document.createElement('div');
            tempDiv.innerHTML = newPropertyHtml;
            const newPropertyField = tempDiv.firstElementChild;
            
            if (!newPropertyField) return;
            
            // 添加到属性组
            propertyGroup.appendChild(newPropertyField);
            
            // 自动聚焦到名称输入框
            const nameInput = newPropertyField.querySelector('.property-name');
            if (nameInput) nameInput.focus();
            
            // 应用按钮事件
            const applyBtn = newPropertyField.querySelector('.apply-property-btn');
            if (applyBtn) {
                applyBtn.addEventListener('click', () => {
                    const propertyName = nameInput ? nameInput.value.trim() : '';
                    const valueInput = newPropertyField.querySelector('.property-value');
                    const propertyValue = valueInput ? valueInput.value : '';
                    
                    if (propertyName) {
                        try {
                            // 更新元素数据
                            element.data(propertyName, propertyValue);
                            
                            // 重新渲染属性编辑器
                            if (element.isNode && element.isNode()) {
                                this.showNodeProperties(element);
                            } else {
                                this.showEdgeProperties(element);
                            }
                            
                            // 同步数据到两个视图
                            try {
                                if (window.viewSync && typeof window.viewSync.syncData === 'function') {
                                    window.viewSync.syncData();
                                } else if (typeof window.syncGraphData === 'function') {
                                    window.syncGraphData();
                                }
                            } catch (syncError) {
                                console.error('Neo4j Editor: Error syncing data after adding property:', syncError);
                            }
                            
                            // 触发数据更新事件
                            try {
                                const eventName = element.isNode && element.isNode() ? 'nodeUpdated' : 'edgeUpdated';
                                if (window.neo4jEditor && typeof window.neo4jEditor.triggerEvent === 'function') {
                                    window.neo4jEditor.triggerEvent(eventName, { elementId: element.id ? element.id() : 'unknown' });
                                }
                            } catch (eventError) {
                                console.error('Neo4j Editor: Error triggering event after adding property:', eventError);
                            }
                        } catch (error) {
                            console.error('Neo4j Editor: Error adding new property:', error);
                        }
                    }
                });
            }
        } catch (error) {
            console.error('Neo4j Editor: Error adding new property UI:', error);
        }
    },
    
    /**
     * 更新节点标签
     * @param {Object} node - Cytoscape节点对象
     * @param {Array} labels - 新的标签数组
     * @returns {boolean} 更新是否成功
     */
    updateNodeLabels: function(node, labels) {
        // 参数安全检查
        if (!node || !Array.isArray(labels) || typeof node.data !== 'function') {
            console.error('Neo4j Editor: Invalid parameters for updating node labels');
            return false;
        }
        
        try {
            node.data('labels', labels);
            
            // 重新渲染属性编辑器
            this.showNodeProperties(node);
            
            // 同步数据到两个视图
            try {
                if (window.viewSync && typeof window.viewSync.syncData === 'function') {
                    window.viewSync.syncData();
                } else if (typeof window.syncGraphData === 'function') {
                    window.syncGraphData();
                }
            } catch (syncError) {
                console.error('Neo4j Editor: Error syncing data after updating labels:', syncError);
            }
            
            // 触发数据更新事件
            try {
                if (window.neo4jEditor && typeof window.neo4jEditor.triggerEvent === 'function') {
                    window.neo4jEditor.triggerEvent('nodeLabelsUpdated', { nodeId: node.id ? node.id() : 'unknown' });
                }
            } catch (eventError) {
                console.error('Neo4j Editor: Error triggering event after updating labels:', eventError);
            }
            
            return true;
            
        } catch (error) {
            console.error('Neo4j Editor: Error updating node labels:', error);
            return false;
        }
    },
    
    /**
     * 清空属性编辑器
     */
    clear: function() {
        try {
            this.renderEmptyPropertyEditor();
        } catch (error) {
            console.error('Neo4j Editor: Error clearing property editor:', error);
        }
    }
};

// 导出模块到全局命名空间
window.propertyEditor = propertyEditorModule;

// 定义向后兼容函数映射数组
const backwardCompatibilityMapping = [
    { deprecatedName: 'initialize', newFunction: propertyEditorModule.initialize, context: propertyEditorModule },
    { deprecatedName: 'showNodeProperties', newFunction: propertyEditorModule.showNodeProperties, context: propertyEditorModule },
    { deprecatedName: 'showEdgeProperties', newFunction: propertyEditorModule.showEdgeProperties, context: propertyEditorModule },
    { deprecatedName: 'updateNodeLabels', newFunction: propertyEditorModule.updateNodeLabels, context: propertyEditorModule },
    { deprecatedName: 'clearPropertyEditor', newFunction: propertyEditorModule.clear, context: propertyEditorModule }
];

// 注册向后兼容函数
backwardCompatibilityMapping.forEach(funcInfo => {
    try {
        // 确保函数名称有效
        if (!funcInfo.deprecatedName || typeof funcInfo.newFunction !== 'function') {
            console.error(`注册向后兼容函数失败: 无效的函数信息`, funcInfo);
            return;
        }
        
        if (typeof window[funcInfo.deprecatedName] === 'undefined') {
            window[funcInfo.deprecatedName] = createBackwardCompatibilityFunction(
                funcInfo.deprecatedName,
                funcInfo.newFunction,
                funcInfo.context
            );
        }
    } catch (error) {
        console.error(`注册向后兼容函数 ${funcInfo.deprecatedName || '未知函数'} 失败:`, error);
    }
});

// 定义模块名称和注册信息
const propertyEditorModuleName = 'components/propertyEditor';
const propertyEditorModuleRegistrationInfo = {
    name: propertyEditorModuleName,
    version: '1.0.1',
    dependencies: ['core/init', 'utils/utils'],
    module: propertyEditorModule
};

// 模块注册
if (window.neo4jEditor && typeof window.neo4jEditor.registerModule === 'function') {
    try {
        window.neo4jEditor.registerModule(propertyEditorModuleRegistrationInfo);
        console.log(`Neo4j Editor: ${propertyEditorModuleName} module registered successfully`);
    } catch (registrationError) {
        console.error(`Neo4j Editor: Failed to register ${propertyEditorModuleName} module:`, registrationError);
        
        // 降级方案：直接注册到modules对象
        try {
            if (typeof window.neo4jEditor.modules === 'undefined') {
                window.neo4jEditor.modules = {};
            }
            window.neo4jEditor.modules[propertyEditorModuleName] = {
                name: propertyEditorModuleRegistrationInfo.name,
                version: propertyEditorModuleRegistrationInfo.version,
                initialized: propertyEditorModule.initialized,
                dependencies: propertyEditorModuleRegistrationInfo.dependencies,
                module: propertyEditorModuleRegistrationInfo.module
            };
            console.log(`Neo4j Editor: ${propertyEditorModuleName} module registered via fallback to modules object`);
        } catch (fallbackError) {
            // 终极降级方案：直接挂载到全局
            if (typeof window.appModule === 'undefined') {
                window.appModule = {};
            }
            window.appModule.propertyEditor = propertyEditorModule;
            console.log(`Neo4j Editor: ${propertyEditorModuleName} module registered via final fallback to appModule`);
        }
    }
} else {
    // 降级方案：直接挂载到全局
    if (typeof window.appModule === 'undefined') {
        window.appModule = {};
    }
    window.appModule.propertyEditor = propertyEditorModule;
    console.log(`Neo4j Editor: ${propertyEditorModuleName} module registered via fallback to appModule`);
}

// 多模块系统支持 - 确保兼容性
// CommonJS 模块支持
if (typeof module !== 'undefined' && typeof module.exports !== 'undefined') {
    module.exports = propertyEditorModule;
}

// AMD 模块支持
if (typeof define === 'function' && define.amd) {
    define(['core/init', 'utils/utils'], function() {
        return propertyEditorModule;
    });
}

// ES 模块支持
if (typeof exports !== 'undefined' && typeof exports === 'object') {
    Object.defineProperty(exports, '__esModule', { value: true });
    if (typeof module !== 'undefined') module.exports = propertyEditorModule;
    exports.default = propertyEditorModule;
}