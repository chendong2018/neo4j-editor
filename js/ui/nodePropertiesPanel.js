/**
 * Neo4j Editor - 节点属性面板管理模块
 * 负责节点和关系属性的展示和编辑
 */
(function(neo4jEditor) {
    'use strict';

    // 确保命名空间存在
    if (typeof neo4jEditor === 'undefined') {
        window.neo4jEditor = {};
    }

    // 初始化状态
    let initialized = false;
    
    // 属性面板元素引用
    let propertiesPanelElement = null;
    let propertiesContentElement = null;
    let propertiesPanelHeader = null;
    let propertiesPanelFooter = null;
    let closeButton = null;
    let saveButton = null;
    let cancelButton = null;
    
    // 当前编辑的元素
    let currentEditingElement = null;
    let elementType = null; // 'node' 或 'edge'
    
    // 原始数据备份（用于取消操作）
    let originalDataBackup = null;

    /**
     * 创建属性面板DOM元素
     */
    function createPropertiesPanel() {
        try {
            // 检查面板是否已存在
            propertiesPanelElement = document.getElementById('neo4j-properties-panel');
            if (propertiesPanelElement) {
                return propertiesPanelElement;
            }
            
            // 创建主面板元素
            propertiesPanelElement = document.createElement('div');
            propertiesPanelElement.id = 'neo4j-properties-panel';
            propertiesPanelElement.className = 'neo4j-properties-panel';
            
            // 设置基本样式
            propertiesPanelElement.style.position = 'fixed';
            propertiesPanelElement.style.right = '-300px';
            propertiesPanelElement.style.top = '0';
            propertiesPanelElement.style.width = '300px';
            propertiesPanelElement.style.height = '100%';
            propertiesPanelElement.style.backgroundColor = '#fff';
            propertiesPanelElement.style.boxShadow = '-2px 0 8px rgba(0, 0, 0, 0.15)';
            propertiesPanelElement.style.zIndex = '1000';
            propertiesPanelElement.style.transition = 'right 0.3s ease';
            propertiesPanelElement.style.display = 'flex';
            propertiesPanelElement.style.flexDirection = 'column';
            propertiesPanelElement.style.fontFamily = 'Arial, sans-serif';
            propertiesPanelElement.style.fontSize = '14px';
            
            // 创建头部
            propertiesPanelHeader = document.createElement('div');
            propertiesPanelHeader.className = 'neo4j-properties-header';
            propertiesPanelHeader.style.padding = '16px';
            propertiesPanelHeader.style.borderBottom = '1px solid #e0e0e0';
            propertiesPanelHeader.style.display = 'flex';
            propertiesPanelHeader.style.justifyContent = 'space-between';
            propertiesPanelHeader.style.alignItems = 'center';
            propertiesPanelHeader.style.backgroundColor = '#f5f5f5';
            
            // 头部标题
            const headerTitle = document.createElement('h3');
            headerTitle.id = 'neo4j-properties-title';
            headerTitle.textContent = '属性编辑';
            headerTitle.style.margin = '0';
            headerTitle.style.fontSize = '16px';
            headerTitle.style.fontWeight = '500';
            
            // 关闭按钮
            closeButton = document.createElement('button');
            closeButton.className = 'neo4j-properties-close';
            closeButton.textContent = '×';
            closeButton.style.background = 'none';
            closeButton.style.border = 'none';
            closeButton.style.fontSize = '24px';
            closeButton.style.cursor = 'pointer';
            closeButton.style.color = '#666';
            closeButton.style.padding = '0';
            closeButton.style.width = '24px';
            closeButton.style.height = '24px';
            closeButton.style.display = 'flex';
            closeButton.style.alignItems = 'center';
            closeButton.style.justifyContent = 'center';
            
            // 鼠标悬停效果
            closeButton.style.transition = 'color 0.2s';
            closeButton.addEventListener('mouseenter', function() {
                this.style.color = '#333';
            });
            closeButton.addEventListener('mouseleave', function() {
                this.style.color = '#666';
            });
            
            // 添加头部元素
            propertiesPanelHeader.appendChild(headerTitle);
            propertiesPanelHeader.appendChild(closeButton);
            
            // 创建内容区域
            propertiesContentElement = document.createElement('div');
            propertiesContentElement.className = 'neo4j-properties-content';
            propertiesContentElement.style.flex = '1';
            propertiesContentElement.style.padding = '16px';
            propertiesContentElement.style.overflowY = 'auto';
            
            // 创建底部操作按钮区域
            propertiesPanelFooter = document.createElement('div');
            propertiesPanelFooter.className = 'neo4j-properties-footer';
            propertiesPanelFooter.style.padding = '16px';
            propertiesPanelFooter.style.borderTop = '1px solid #e0e0e0';
            propertiesPanelFooter.style.display = 'flex';
            propertiesPanelFooter.style.justifyContent = 'flex-end';
            propertiesPanelFooter.style.gap = '8px';
            propertiesPanelFooter.style.backgroundColor = '#f5f5f5';
            
            // 取消按钮
            cancelButton = document.createElement('button');
            cancelButton.className = 'neo4j-properties-cancel';
            cancelButton.textContent = '取消';
            cancelButton.style.padding = '8px 16px';
            cancelButton.style.border = '1px solid #ccc';
            cancelButton.style.backgroundColor = '#fff';
            cancelButton.style.color = '#333';
            cancelButton.style.cursor = 'pointer';
            cancelButton.style.borderRadius = '4px';
            cancelButton.style.fontSize = '14px';
            
            // 保存按钮
            saveButton = document.createElement('button');
            saveButton.className = 'neo4j-properties-save';
            saveButton.textContent = '保存';
            saveButton.style.padding = '8px 16px';
            saveButton.style.border = '1px solid #2196F3';
            saveButton.style.backgroundColor = '#2196F3';
            saveButton.style.color = '#fff';
            saveButton.style.cursor = 'pointer';
            saveButton.style.borderRadius = '4px';
            saveButton.style.fontSize = '14px';
            
            // 按钮悬停效果
            cancelButton.style.transition = 'all 0.2s';
            cancelButton.addEventListener('mouseenter', function() {
                this.style.backgroundColor = '#f0f0f0';
            });
            cancelButton.addEventListener('mouseleave', function() {
                this.style.backgroundColor = '#fff';
            });
            
            saveButton.style.transition = 'all 0.2s';
            saveButton.addEventListener('mouseenter', function() {
                this.style.backgroundColor = '#1976D2';
                this.style.borderColor = '#1976D2';
            });
            saveButton.addEventListener('mouseleave', function() {
                this.style.backgroundColor = '#2196F3';
                this.style.borderColor = '#2196F3';
            });
            
            // 添加底部元素
            propertiesPanelFooter.appendChild(cancelButton);
            propertiesPanelFooter.appendChild(saveButton);
            
            // 组合面板
            propertiesPanelElement.appendChild(propertiesPanelHeader);
            propertiesPanelElement.appendChild(propertiesContentElement);
            propertiesPanelElement.appendChild(propertiesPanelFooter);
            
            // 添加到文档
            document.body.appendChild(propertiesPanelElement);
            
            return propertiesPanelElement;
        } catch (error) {
            console.error('Error creating properties panel:', error);
            return null;
        }
    }

    /**
     * 设置属性面板事件监听
     */
    function setupEventListeners() {
        try {
            // 关闭按钮点击事件
            if (closeButton) {
                closeButton.addEventListener('click', function() {
                    closePropertiesPanel();
                });
            }
            
            // 取消按钮点击事件
            if (cancelButton) {
                cancelButton.addEventListener('click', function() {
                    cancelEditing();
                });
            }
            
            // 保存按钮点击事件
            if (saveButton) {
                saveButton.addEventListener('click', function() {
                    saveProperties();
                });
            }
            
            // 点击面板外部关闭面板
            document.addEventListener('click', function(event) {
                if (propertiesPanelElement && 
                    isPropertiesPanelOpen() && 
                    !propertiesPanelElement.contains(event.target) &&
                    !event.target.classList.contains('neo4j-node') &&
                    !event.target.classList.contains('neo4j-edge')) {
                    // 延迟关闭，避免与节点选择冲突
                    setTimeout(function() {
                        closePropertiesPanel();
                    }, 100);
                }
            });
            
            // 监听元素选择事件
            if (neo4jEditor.eventManager && typeof neo4jEditor.eventManager.on === 'function') {
                neo4jEditor.eventManager.on('element:selected', handleElementSelected);
                neo4jEditor.eventManager.on('element:deselected', handleElementDeselected);
            }
            
            // 监听键盘事件 (Escape关闭面板)
            document.addEventListener('keydown', function(event) {
                if (event.key === 'Escape' && isPropertiesPanelOpen()) {
                    closePropertiesPanel();
                }
            });
        } catch (error) {
            console.error('Error setting up event listeners:', error);
        }
    }

    /**
     * 处理元素选择事件
     * @param {Object} eventData - 事件数据
     */
    function handleElementSelected(eventData) {
        try {
            if (eventData && eventData.element) {
                openPropertiesPanel(eventData.element, eventData.type);
            }
        } catch (error) {
            console.error('Error handling element selected event:', error);
        }
    }

    /**
     * 处理元素取消选择事件
     */
    function handleElementDeselected() {
        try {
            // 不自动关闭面板，允许用户继续编辑已选元素的属性
            // 如果需要自动关闭，可以取消下面这行注释
            // closePropertiesPanel();
        } catch (error) {
            console.error('Error handling element deselected event:', error);
        }
    }

    /**
     * 打开属性面板
     * @param {Object} element - 要编辑的元素（节点或关系）
     * @param {string} type - 元素类型 ('node' 或 'edge')
     */
    function openPropertiesPanel(element, type) {
        try {
            // 验证参数
            if (!element || !type || (type !== 'node' && type !== 'edge')) {
                console.error('Invalid parameters for openPropertiesPanel');
                return;
            }
            
            // 备份原始数据
            originalDataBackup = JSON.parse(JSON.stringify(element));
            
            // 更新当前编辑元素
            currentEditingElement = element;
            elementType = type;
            
            // 更新面板标题
            if (propertiesPanelHeader && propertiesPanelHeader.querySelector('#neo4j-properties-title')) {
                const titleElement = propertiesPanelHeader.querySelector('#neo4j-properties-title');
                titleElement.textContent = type === 'node' ? '节点属性' : '关系属性';
            }
            
            // 渲染属性表单
            renderPropertiesForm(element, type);
            
            // 显示面板
            if (propertiesPanelElement) {
                propertiesPanelElement.style.right = '0';
            }
            
            // 更新编辑器状态
            if (neo4jEditor.editorState) {
                neo4jEditor.editorState.isEditingProperties = true;
            }
        } catch (error) {
            console.error('Error opening properties panel:', error);
        }
    }

    /**
     * 关闭属性面板
     */
    function closePropertiesPanel() {
        try {
            if (propertiesPanelElement) {
                propertiesPanelElement.style.right = '-300px';
            }
            
            // 重置当前编辑元素
            currentEditingElement = null;
            elementType = null;
            originalDataBackup = null;
            
            // 更新编辑器状态
            if (neo4jEditor.editorState) {
                neo4jEditor.editorState.isEditingProperties = false;
            }
        } catch (error) {
            console.error('Error closing properties panel:', error);
        }
    }

    /**
     * 检查属性面板是否打开
     * @returns {boolean} 面板是否打开
     */
    function isPropertiesPanelOpen() {
        if (!propertiesPanelElement) {
            return false;
        }
        const right = propertiesPanelElement.style.right;
        return right === '0px' || right === '0';
    }

    /**
     * 渲染属性表单
     * @param {Object} element - 要渲染的元素
     * @param {string} type - 元素类型
     */
    function renderPropertiesForm(element, type) {
        try {
            if (!propertiesContentElement || !element || !element.data) {
                return;
            }
            
            // 清空内容
            propertiesContentElement.innerHTML = '';
            
            // 创建表单容器
            const form = document.createElement('form');
            form.className = 'neo4j-properties-form';
            form.style.display = 'flex';
            form.style.flexDirection = 'column';
            form.style.gap = '16px';
            
            // 阻止表单默认提交
            form.addEventListener('submit', function(event) {
                event.preventDefault();
                saveProperties();
            });
            
            // 渲染基本信息
            renderBasicInfoFields(form, element.data, type);
            
            // 渲染自定义属性
            renderCustomPropertiesFields(form, element.data.properties || {});
            
            // 添加到内容区域
            propertiesContentElement.appendChild(form);
        } catch (error) {
            console.error('Error rendering properties form:', error);
        }
    }

    /**
     * 渲染基本信息字段
     * @param {HTMLElement} container - 容器元素
     * @param {Object} data - 元素数据
     * @param {string} type - 元素类型
     */
    function renderBasicInfoFields(container, data, type) {
        try {
            // 创建基本信息部分
            const basicInfoSection = document.createElement('div');
            basicInfoSection.className = 'neo4j-properties-section';
            basicInfoSection.style.borderBottom = '1px solid #e0e0e0';
            basicInfoSection.style.paddingBottom = '16px';
            
            // ID 字段（只读）
            const idFieldGroup = createFormFieldGroup('ID', 'id', 'text', data.id, true);
            basicInfoSection.appendChild(idFieldGroup);
            
            // 标签字段
            const labelFieldGroup = createFormFieldGroup(type === 'node' ? '节点标签' : '关系类型', 'label', 'text', data.label);
            basicInfoSection.appendChild(labelFieldGroup);
            
            // 关系特有字段
            if (type === 'edge' && data.source && data.target) {
                const sourceFieldGroup = createFormFieldGroup('源节点', 'source', 'text', data.source, true);
                const targetFieldGroup = createFormFieldGroup('目标节点', 'target', 'text', data.target, true);
                basicInfoSection.appendChild(sourceFieldGroup);
                basicInfoSection.appendChild(targetFieldGroup);
            }
            
            container.appendChild(basicInfoSection);
        } catch (error) {
            console.error('Error rendering basic info fields:', error);
        }
    }

    /**
     * 渲染自定义属性字段
     * @param {HTMLElement} container - 容器元素
     * @param {Object} properties - 自定义属性对象
     */
    function renderCustomPropertiesFields(container, properties) {
        try {
            // 创建自定义属性部分
            const customPropsSection = document.createElement('div');
            customPropsSection.className = 'neo4j-properties-section';
            customPropsSection.style.marginTop = '8px';
            
            // 标题
            const sectionHeader = document.createElement('h4');
            sectionHeader.textContent = '自定义属性';
            sectionHeader.style.margin = '0 0 16px 0';
            sectionHeader.style.fontSize = '14px';
            sectionHeader.style.fontWeight = '600';
            sectionHeader.style.color = '#555';
            customPropsSection.appendChild(sectionHeader);
            
            // 属性容器
            const propsContainer = document.createElement('div');
            propsContainer.id = 'neo4j-custom-properties-container';
            propsContainer.style.display = 'flex';
            propsContainer.style.flexDirection = 'column';
            propsContainer.style.gap = '12px';
            
            // 渲染现有属性
            if (properties && typeof properties === 'object') {
                for (const [key, value] of Object.entries(properties)) {
                    const propFieldGroup = createPropertyFieldGroup(key, value);
                    propsContainer.appendChild(propFieldGroup);
                }
            }
            
            // 添加新属性按钮
            const addPropButton = document.createElement('button');
            addPropButton.type = 'button';
            addPropButton.className = 'neo4j-add-property';
            addPropButton.textContent = '+ 添加属性';
            addPropButton.style.padding = '8px 12px';
            addPropButton.style.border = '1px dashed #ccc';
            addPropButton.style.backgroundColor = '#f9f9f9';
            addPropButton.style.color = '#666';
            addPropButton.style.cursor = 'pointer';
            addPropButton.style.borderRadius = '4px';
            addPropButton.style.fontSize = '13px';
            addPropButton.style.width = '100%';
            
            // 按钮悬停效果
            addPropButton.style.transition = 'all 0.2s';
            addPropButton.addEventListener('mouseenter', function() {
                this.style.borderColor = '#2196F3';
                this.style.color = '#2196F3';
            });
            addPropButton.addEventListener('mouseleave', function() {
                this.style.borderColor = '#ccc';
                this.style.color = '#666';
            });
            
            // 添加属性点击事件
            addPropButton.addEventListener('click', function() {
                const newPropFieldGroup = createPropertyFieldGroup('', '');
                propsContainer.appendChild(newPropFieldGroup);
                // 聚焦到新添加的键输入框
                const newKeyInput = newPropFieldGroup.querySelector('.neo4j-property-key');
                if (newKeyInput) {
                    newKeyInput.focus();
                }
            });
            
            // 组合自定义属性部分
            customPropsSection.appendChild(propsContainer);
            customPropsSection.appendChild(addPropButton);
            
            container.appendChild(customPropsSection);
        } catch (error) {
            console.error('Error rendering custom properties fields:', error);
        }
    }

    /**
     * 创建表单字段组
     * @param {string} label - 字段标签
     * @param {string} name - 字段名称
     * @param {string} type - 字段类型
     * @param {string} value - 字段值
     * @param {boolean} readOnly - 是否只读
     * @returns {HTMLElement} 字段组元素
     */
    function createFormFieldGroup(label, name, type, value, readOnly = false) {
        try {
            const fieldGroup = document.createElement('div');
            fieldGroup.className = 'neo4j-form-field-group';
            fieldGroup.style.display = 'flex';
            fieldGroup.style.flexDirection = 'column';
            fieldGroup.style.gap = '4px';
            
            // 标签
            const fieldLabel = document.createElement('label');
            fieldLabel.htmlFor = `neo4j-field-${name}`;
            fieldLabel.textContent = label;
            fieldLabel.style.fontSize = '13px';
            fieldLabel.style.fontWeight = '500';
            fieldLabel.style.color = '#666';
            
            // 输入框
            const input = document.createElement('input');
            input.type = type;
            input.id = `neo4j-field-${name}`;
            input.name = name;
            input.value = value !== undefined && value !== null ? value : '';
            input.readOnly = readOnly;
            input.style.padding = '8px 10px';
            input.style.border = '1px solid #ddd';
            input.style.borderRadius = '4px';
            input.style.fontSize = '14px';
            input.style.outline = 'none';
            
            // 只读样式
            if (readOnly) {
                input.style.backgroundColor = '#f5f5f5';
                input.style.color = '#999';
                input.style.cursor = 'not-allowed';
            }
            
            // 聚焦效果
            input.addEventListener('focus', function() {
                if (!readOnly) {
                    this.style.borderColor = '#2196F3';
                    this.style.boxShadow = '0 0 0 2px rgba(33, 150, 243, 0.1)';
                }
            });
            
            input.addEventListener('blur', function() {
                if (!readOnly) {
                    this.style.borderColor = '#ddd';
                    this.style.boxShadow = 'none';
                }
            });
            
            // 组合字段组
            fieldGroup.appendChild(fieldLabel);
            fieldGroup.appendChild(input);
            
            return fieldGroup;
        } catch (error) {
            console.error('Error creating form field group:', error);
            return document.createElement('div');
        }
    }

    /**
     * 创建属性字段组
     * @param {string} key - 属性键
     * @param {*} value - 属性值
     * @returns {HTMLElement} 属性字段组元素
     */
    function createPropertyFieldGroup(key, value) {
        try {
            const propContainer = document.createElement('div');
            propContainer.className = 'neo4j-property-field-group';
            propContainer.style.display = 'flex';
            propContainer.style.alignItems = 'flex-end';
            propContainer.style.gap = '8px';
            propContainer.style.position = 'relative';
            
            // 键输入框
            const keyInput = document.createElement('input');
            keyInput.type = 'text';
            keyInput.className = 'neo4j-property-key';
            keyInput.placeholder = '属性名';
            keyInput.value = key !== undefined && key !== null ? key : '';
            keyInput.style.flex = '1';
            keyInput.style.padding = '8px 10px';
            keyInput.style.border = '1px solid #ddd';
            keyInput.style.borderRadius = '4px';
            keyInput.style.fontSize = '14px';
            keyInput.style.outline = 'none';
            
            // 值输入框
            const valueInput = document.createElement('input');
            valueInput.type = 'text';
            valueInput.className = 'neo4j-property-value';
            valueInput.placeholder = '属性值';
            valueInput.value = formatPropertyValue(value);
            valueInput.style.flex = '2';
            valueInput.style.padding = '8px 10px';
            valueInput.style.border = '1px solid #ddd';
            valueInput.style.borderRadius = '4px';
            valueInput.style.fontSize = '14px';
            valueInput.style.outline = 'none';
            
            // 删除按钮
            const deleteButton = document.createElement('button');
            deleteButton.type = 'button';
            deleteButton.className = 'neo4j-delete-property';
            deleteButton.innerHTML = '✕';
            deleteButton.style.padding = '8px';
            deleteButton.style.border = '1px solid #ddd';
            deleteButton.style.backgroundColor = '#fff';
            deleteButton.style.color = '#999';
            deleteButton.style.cursor = 'pointer';
            deleteButton.style.borderRadius = '4px';
            deleteButton.style.fontSize = '12px';
            deleteButton.style.width = '32px';
            deleteButton.style.height = '32px';
            deleteButton.style.display = 'flex';
            deleteButton.style.alignItems = 'center';
            deleteButton.style.justifyContent = 'center';
            
            // 按钮悬停效果
            deleteButton.style.transition = 'all 0.2s';
            deleteButton.addEventListener('mouseenter', function() {
                this.style.borderColor = '#e74c3c';
                this.style.backgroundColor = '#fff5f5';
                this.style.color = '#e74c3c';
            });
            deleteButton.addEventListener('mouseleave', function() {
                this.style.borderColor = '#ddd';
                this.style.backgroundColor = '#fff';
                this.style.color = '#999';
            });
            
            // 删除属性事件
            deleteButton.addEventListener('click', function() {
                propContainer.remove();
            });
            
            // 聚焦效果
            [keyInput, valueInput].forEach(input => {
                input.addEventListener('focus', function() {
                    this.style.borderColor = '#2196F3';
                    this.style.boxShadow = '0 0 0 2px rgba(33, 150, 243, 0.1)';
                });
                
                input.addEventListener('blur', function() {
                    this.style.borderColor = '#ddd';
                    this.style.boxShadow = 'none';
                });
            });
            
            // 组合属性字段组
            propContainer.appendChild(keyInput);
            propContainer.appendChild(valueInput);
            propContainer.appendChild(deleteButton);
            
            return propContainer;
        } catch (error) {
            console.error('Error creating property field group:', error);
            return document.createElement('div');
        }
    }

    /**
     * 格式化属性值为字符串
     * @param {*} value - 要格式化的值
     * @returns {string} 格式化后的字符串
     */
    function formatPropertyValue(value) {
        if (value === undefined || value === null) {
            return '';
        }
        
        if (typeof value === 'object') {
            return JSON.stringify(value);
        }
        
        return String(value);
    }

    /**
     * 保存属性更改
     */
    function saveProperties() {
        try {
            if (!currentEditingElement || !elementType) {
                console.error('No element being edited');
                return;
            }
            
            // 收集表单数据
            const formData = collectFormData();
            if (!formData) {
                return;
            }
            
            // 更新元素数据
            updateElementData(formData);
            
            // 同步到Cytoscape实例
            syncToCytoscapeInstances();
            
            // 触发属性更新事件
            if (neo4jEditor.eventManager && typeof neo4jEditor.eventManager.trigger === 'function') {
                neo4jEditor.eventManager.trigger('element:propertiesUpdated', {
                    element: currentEditingElement,
                    type: elementType
                });
            }
            
            // 显示保存成功提示
            if (typeof neo4jEditor.core !== 'undefined' && neo4jEditor.core.showToast) {
                neo4jEditor.core.showToast('属性保存成功', 'success');
            }
            
            // 关闭面板
            closePropertiesPanel();
        } catch (error) {
            console.error('Error saving properties:', error);
            // 显示错误提示
            if (typeof neo4jEditor.core !== 'undefined' && neo4jEditor.core.showToast) {
                neo4jEditor.core.showToast('保存失败: ' + error.message, 'error');
            }
        }
    }

    /**
     * 收集表单数据
     * @returns {Object|null} 表单数据或null
     */
    function collectFormData() {
        try {
            const formData = {
                basic: {},
                properties: {}
            };
            
            // 获取基本信息
            const idInput = document.getElementById('neo4j-field-id');
            const labelInput = document.getElementById('neo4j-field-label');
            
            if (idInput) {
                formData.basic.id = idInput.value;
            }
            
            if (labelInput) {
                formData.basic.label = labelInput.value;
                if (!formData.basic.label.trim()) {
                    if (typeof neo4jEditor.core !== 'undefined' && neo4jEditor.core.showToast) {
                        neo4jEditor.core.showToast('标签不能为空', 'error');
                    }
                    return null;
                }
            }
            
            // 获取自定义属性
            const propContainers = document.querySelectorAll('.neo4j-property-field-group');
            propContainers.forEach(container => {
                const keyInput = container.querySelector('.neo4j-property-key');
                const valueInput = container.querySelector('.neo4j-property-value');
                
                if (keyInput && valueInput && keyInput.value.trim()) {
                    const key = keyInput.value.trim();
                    let value = valueInput.value.trim();
                    
                    // 尝试解析JSON
                    if (value && (value.startsWith('{') && value.endsWith('}') || 
                                 value.startsWith('[') && value.endsWith(']'))) {
                        try {
                            value = JSON.parse(value);
                        } catch (e) {
                            // 如果解析失败，保留为字符串
                        }
                    } else if (value === 'true') {
                        value = true;
                    } else if (value === 'false') {
                        value = false;
                    } else if (!isNaN(value) && value !== '') {
                        value = Number(value);
                    }
                    
                    formData.properties[key] = value;
                }
            });
            
            return formData;
        } catch (error) {
            console.error('Error collecting form data:', error);
            return null;
        }
    }

    /**
     * 更新元素数据
     * @param {Object} formData - 表单数据
     */
    function updateElementData(formData) {
        try {
            if (!currentEditingElement || !currentEditingElement.data || !formData) {
                return;
            }
            
            // 更新基本信息
            if (formData.basic) {
                if (formData.basic.label !== undefined) {
                    currentEditingElement.data.label = formData.basic.label;
                }
            }
            
            // 更新自定义属性
            if (formData.properties) {
                currentEditingElement.data.properties = formData.properties;
            }
        } catch (error) {
            console.error('Error updating element data:', error);
        }
    }

    /**
     * 同步到Cytoscape实例
     */
    function syncToCytoscapeInstances() {
        try {
            // 更新共享数据
            if (neo4jEditor.sharedGraphData) {
                if (elementType === 'node' && currentEditingElement.data.id) {
                    const nodeIndex = neo4jEditor.sharedGraphData.nodes.findIndex(
                        node => node.data.id === currentEditingElement.data.id
                    );
                    if (nodeIndex !== -1) {
                        neo4jEditor.sharedGraphData.nodes[nodeIndex] = JSON.parse(JSON.stringify(currentEditingElement));
                    }
                } else if (elementType === 'edge' && currentEditingElement.data.id) {
                    const edgeIndex = neo4jEditor.sharedGraphData.edges.findIndex(
                        edge => edge.data.id === currentEditingElement.data.id
                    );
                    if (edgeIndex !== -1) {
                        neo4jEditor.sharedGraphData.edges[edgeIndex] = JSON.parse(JSON.stringify(currentEditingElement));
                    }
                }
            }
            
            // 如果有同步函数，调用它
            if (typeof window.syncGraphData === 'function') {
                window.syncGraphData();
            }
            
            // 直接更新Cytoscape实例
            if (neo4jEditor.instances && currentEditingElement.data.id) {
                // 更新树视图
                if (neo4jEditor.instances.tree) {
                    const cyElement = neo4jEditor.instances.tree.getElementById(currentEditingElement.data.id);
                    if (cyElement) {
                        cyElement.data(currentEditingElement.data);
                    }
                }
                
                // 更新网络图视图
                if (neo4jEditor.instances.network) {
                    const cyElement = neo4jEditor.instances.network.getElementById(currentEditingElement.data.id);
                    if (cyElement) {
                        cyElement.data(currentEditingElement.data);
                    }
                }
            }
        } catch (error) {
            console.error('Error syncing to Cytoscape instances:', error);
        }
    }

    /**
     * 取消编辑
     */
    function cancelEditing() {
        try {
            // 如果有原始数据备份，恢复它
            if (originalDataBackup && currentEditingElement && elementType) {
                // 恢复到原始状态
                if (elementType === 'node' && currentEditingElement.data.id === originalDataBackup.data.id) {
                    // 同步到共享数据
                    if (neo4jEditor.sharedGraphData) {
                        const nodeIndex = neo4jEditor.sharedGraphData.nodes.findIndex(
                            node => node.data.id === originalDataBackup.data.id
                        );
                        if (nodeIndex !== -1) {
                            neo4jEditor.sharedGraphData.nodes[nodeIndex] = JSON.parse(JSON.stringify(originalDataBackup));
                        }
                    }
                } else if (elementType === 'edge' && currentEditingElement.data.id === originalDataBackup.data.id) {
                    // 同步到共享数据
                    if (neo4jEditor.sharedGraphData) {
                        const edgeIndex = neo4jEditor.sharedGraphData.edges.findIndex(
                            edge => edge.data.id === originalDataBackup.data.id
                        );
                        if (edgeIndex !== -1) {
                            neo4jEditor.sharedGraphData.edges[edgeIndex] = JSON.parse(JSON.stringify(originalDataBackup));
                        }
                    }
                }
                
                // 同步到Cytoscape实例
                syncToCytoscapeInstances();
            }
            
            // 关闭面板
            closePropertiesPanel();
        } catch (error) {
            console.error('Error cancelling editing:', error);
            // 无论如何都关闭面板
            closePropertiesPanel();
        }
    }

    /**
     * 节点属性面板管理模块
     */
    const nodePropertiesPanelModule = {
        // 模块版本
        version: '1.0.0',
        
        // 初始化状态
        initialized: initialized,
        
        /**
         * 初始化模块
         * @param {Object} config - 配置对象
         * @returns {boolean} 初始化是否成功
         */
        initialize: function(config = {}) {
            try {
                console.log('Node Properties Panel Module: Initializing...');
                
                // 创建属性面板
                createPropertiesPanel();
                
                // 设置事件监听
                setupEventListeners();
                
                // 标记为已初始化
                initialized = true;
                this.initialized = true;
                
                console.log('Node Properties Panel Module: Initialized successfully');
                
                // 触发初始化完成事件
                if (neo4jEditor.eventManager && typeof neo4jEditor.eventManager.trigger === 'function') {
                    neo4jEditor.eventManager.trigger('nodePropertiesPanel:initialized');
                }
                
                return true;
            } catch (error) {
                console.error('Node Properties Panel Module: Initialization error:', error);
                return false;
            }
        },
        
        /**
         * 打开属性面板
         * @param {Object} element - 要编辑的元素
         * @param {string} type - 元素类型 ('node' 或 'edge')
         */
        openPanel: function(element, type) {
            openPropertiesPanel(element, type);
        },
        
        /**
         * 关闭属性面板
         */
        closePanel: function() {
            closePropertiesPanel();
        },
        
        /**
         * 检查面板是否打开
         * @returns {boolean} 面板是否打开
         */
        isPanelOpen: function() {
            return isPropertiesPanelOpen();
        },
        
        /**
         * 获取当前编辑的元素
         * @returns {Object|null} 当前编辑的元素
         */
        getCurrentEditingElement: function() {
            return currentEditingElement;
        },
        
        /**
         * 获取当前元素类型
         * @returns {string|null} 元素类型 ('node', 'edge' 或 null)
         */
        getCurrentElementType: function() {
            return elementType;
        }
    };
    
    // 导出模块到命名空间
    neo4jEditor.nodePropertiesPanel = nodePropertiesPanelModule;
    
    // 创建向后兼容函数
    /**
     * 创建向后兼容函数
     * @param {string} deprecatedName - 旧函数名称
     * @param {Function} newFunction - 新函数实现
     * @param {Object} context - 函数执行上下文
     */
    function createBackwardCompatibilityFunction(deprecatedName, newFunction, context) {
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
                console.warn(`警告: 直接调用 ${deprecatedName}() 已弃用，请使用 neo4jEditor.nodePropertiesPanel.${newFunction.name || 'method'}()`);
            }
            return newFunction.apply(context || null, arguments);
        };
    }
    
    // 注册向后兼容函数
    const backwardCompatibilityMapping = [
        { deprecatedName: 'openPropertiesEditor', newFunction: nodePropertiesPanelModule.openPanel, context: nodePropertiesPanelModule },
        { deprecatedName: 'closePropertiesEditor', newFunction: nodePropertiesPanelModule.closePanel, context: nodePropertiesPanelModule },
        { deprecatedName: 'isPropertiesEditorOpen', newFunction: nodePropertiesPanelModule.isPanelOpen, context: nodePropertiesPanelModule }
    ];
    
    // 注册全局向后兼容函数
    backwardCompatibilityMapping.forEach(funcInfo => {
        try {
            if (typeof window[funcInfo.deprecatedName] === 'undefined') {
                window[funcInfo.deprecatedName] = createBackwardCompatibilityFunction(
                    funcInfo.deprecatedName,
                    funcInfo.newFunction,
                    funcInfo.context
                );
            }
        } catch (error) {
            console.error(`注册向后兼容函数 ${funcInfo.deprecatedName} 失败:`, error);
        }
    });
    
    // 定义模块名称和注册信息
    const moduleName = 'ui/nodePropertiesPanel';
    const moduleRegistrationInfo = {
        name: moduleName,
        version: '1.0.0',
        dependencies: ['core/eventManager', 'core/dataModel'],
        module: nodePropertiesPanelModule
    };
    
    // 使用统一的模块注册方法
    if (window.neo4jEditor && typeof window.neo4jEditor.registerModule === 'function') {
        try {
            window.neo4jEditor.registerModule(moduleRegistrationInfo);
            console.log(`Neo4j Editor: ${moduleName} module registered successfully`);
        } catch (registrationError) {
            console.error(`Neo4j Editor: Failed to register ${moduleName} module:`, registrationError);
            
            // 降级方案：直接注册到modules对象
            try {
                if (typeof window.neo4jEditor.modules[moduleName] === 'undefined') {
                    window.neo4jEditor.modules[moduleName] = {
                        name: moduleRegistrationInfo.name,
                        version: moduleRegistrationInfo.version,
                        initialized: nodePropertiesPanelModule.initialized,
                        dependencies: moduleRegistrationInfo.dependencies,
                        module: moduleRegistrationInfo.module
                    };
                    console.log(`Neo4j Editor: ${moduleName} module registered via fallback to modules object`);
                }
            } catch (fallbackError) {
                // 终极降级方案：直接挂载到全局
                if (typeof window.appModule === 'undefined') {
                    window.appModule = {};
                }
                window.appModule.nodePropertiesPanel = nodePropertiesPanelModule;
                console.log(`Neo4j Editor: ${moduleName} module registered via final fallback to appModule`);
            }
        }
    } else {
        // 降级方案：直接挂载到全局
        if (typeof window.appModule === 'undefined') {
            window.appModule = {};
        }
        window.appModule.nodePropertiesPanel = nodePropertiesPanelModule;
        console.log(`Neo4j Editor: ${moduleName} module registered via fallback to appModule`);
    }
    
    // 多模块系统支持 - 确保兼容性
    // CommonJS 模块支持
    if (typeof module !== 'undefined' && typeof module.exports !== 'undefined') {
        module.exports = nodePropertiesPanelModule;
    }
    
    // ES 模块支持
    if (typeof exports !== 'undefined' && typeof exports === 'object') {
        Object.defineProperty(exports, '__esModule', { value: true });
        if (typeof module !== 'undefined') module.exports = nodePropertiesPanelModule;
        exports.default = nodePropertiesPanelModule;
    }
    
    // AMD 模块支持
    if (typeof define === 'function' && define.amd) {
        define(['core/eventManager', 'core/dataModel'], function() {
            return nodePropertiesPanelModule;
        });
    }
    
    return nodePropertiesPanelModule;
})(window.neo4jEditor || (window.neo4jEditor = {}));