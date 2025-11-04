/**
 * Neo4j Editor - 样式编辑器模块
 * 负责处理图形节点和关系样式的编辑功能
 */
(function(neo4jEditor) {
    'use strict';

    // 确保命名空间存在
    if (typeof neo4jEditor === 'undefined') {
        window.neo4jEditor = {};
    }

    // 初始化状态
    let initialized = false;
    
    // DOM 引用
    let styleEditorContainer = null;
    let currentStyleType = 'node'; // 'node' 或 'relationship'
    let styleSheet = null;
    let currentElement = null;
    
    // 默认样式配置
    let defaultNodeStyle = {
        // 基本样式
        shape: 'ellipse',
        width: 80,
        height: 60,
        // 颜色
        backgroundColor: '#6554C0',
        borderColor: '#5044a4',
        borderWidth: 2,
        // 文本样式
        color: '#ffffff',
        fontSize: 14,
        fontFamily: 'Arial, sans-serif',
        // 其他样式
        opacity: 1,
        padding: 10,
        // 选中样式
        selectedBackgroundColor: '#9c88ff',
        selectedBorderColor: '#8c7ae6',
        // 悬停样式
        hoverBackgroundColor: '#7c68d8',
        hoverBorderColor: '#6c5ce7'
    };
    
    let defaultRelationshipStyle = {
        // 基本样式
        width: 2,
        // 颜色
        lineColor: '#808080',
        lineStyle: 'solid', // solid, dashed, dotted
        // 箭头样式
        targetArrowColor: '#808080',
        targetArrowShape: 'triangle',
        // 文本样式
        color: '#333333',
        fontSize: 12,
        fontFamily: 'Arial, sans-serif',
        // 其他样式
        opacity: 1,
        // 选中样式
        selectedLineColor: '#6554C0',
        // 悬停样式
        hoverLineColor: '#7c68d8'
    };
    
    // 当前编辑的样式
    let currentStyle = {
        node: { ...defaultNodeStyle },
        relationship: { ...defaultRelationshipStyle }
    };
    
    // 历史记录（用于撤销/重做）
    let styleHistory = [];
    let historyIndex = -1;
    const MAX_HISTORY_SIZE = 50;

    /**
     * 初始化样式编辑器
     * @param {Object} config - 配置对象
     * @returns {boolean} 初始化是否成功
     */
    function initialize(config = {}) {
        try {
            console.log('Style Editor Module: Initializing...');
            
            // 合并配置
            if (config.nodeStyle) {
                defaultNodeStyle = { ...defaultNodeStyle, ...config.nodeStyle };
                currentStyle.node = { ...defaultNodeStyle };
            }
            
            if (config.relationshipStyle) {
                defaultRelationshipStyle = { ...defaultRelationshipStyle, ...config.relationshipStyle };
                currentStyle.relationship = { ...defaultRelationshipStyle };
            }
            
            // 初始化样式编辑器容器
            initializeStyleEditorContainer();
            
            // 初始化样式表单
            initializeStyleForm();
            
            // 初始化样式表
            initializeStyleSheet();
            
            // 设置事件监听
            setupEventListeners();
            
            // 标记为已初始化
            initialized = true;
            
            console.log('Style Editor Module: Initialized successfully');
            
            // 触发初始化完成事件
            if (neo4jEditor.eventManager && typeof neo4jEditor.eventManager.trigger === 'function') {
                neo4jEditor.eventManager.trigger('styleEditor:initialized', {
                    nodeStyle: currentStyle.node,
                    relationshipStyle: currentStyle.relationship
                });
            }
            
            return true;
        } catch (error) {
            console.error('Style Editor Module: Initialization error:', error);
            return false;
        }
    }

    /**
     * 初始化样式编辑器容器
     */
    function initializeStyleEditorContainer() {
        try {
            // 查找或创建样式编辑器容器
            styleEditorContainer = document.getElementById('neo4j-editor-style-editor');
            
            if (!styleEditorContainer) {
                styleEditorContainer = document.createElement('div');
                styleEditorContainer.id = 'neo4j-editor-style-editor';
                styleEditorContainer.className = 'neo4j-editor-style-editor';
                
                // 设置基本样式
                Object.assign(styleEditorContainer.style, {
                    position: 'absolute',
                    right: '20px',
                    top: '60px',
                    width: '320px',
                    maxHeight: 'calc(100vh - 100px)',
                    backgroundColor: '#ffffff',
                    border: '1px solid #ddd',
                    borderRadius: '6px',
                    padding: '16px',
                    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
                    overflowY: 'auto',
                    display: 'none',
                    zIndex: '900',
                    fontFamily: 'Arial, sans-serif'
                });
                
                // 添加到body
                document.body.appendChild(styleEditorContainer);
            }
            
            // 添加标题
            const title = document.createElement('h3');
            title.textContent = '样式编辑器';
            title.style.marginTop = '0';
            title.style.marginBottom = '16px';
            title.style.color = '#333';
            styleEditorContainer.appendChild(title);
            
            // 添加样式类型切换
            const typeSwitchContainer = document.createElement('div');
            typeSwitchContainer.className = 'style-type-switch';
            typeSwitchContainer.style.marginBottom = '16px';
            typeSwitchContainer.style.display = 'flex';
            typeSwitchContainer.style.gap = '8px';
            
            const nodeTypeButton = document.createElement('button');
            nodeTypeButton.id = 'node-style-tab';
            nodeTypeButton.textContent = '节点样式';
            nodeTypeButton.className = 'style-tab-button active';
            nodeTypeButton.dataset.type = 'node';
            
            const relationshipTypeButton = document.createElement('button');
            relationshipTypeButton.id = 'relationship-style-tab';
            relationshipTypeButton.textContent = '关系样式';
            relationshipTypeButton.className = 'style-tab-button';
            relationshipTypeButton.dataset.type = 'relationship';
            
            // 设置按钮样式
            [nodeTypeButton, relationshipTypeButton].forEach(button => {
                Object.assign(button.style, {
                    padding: '8px 12px',
                    border: '1px solid #ddd',
                    borderRadius: '4px',
                    backgroundColor: '#f5f5f5',
                    cursor: 'pointer',
                    fontSize: '14px',
                    flex: '1'
                });
                
                button.addEventListener('click', function() {
                    const type = this.dataset.type;
                    switchStyleType(type);
                    
                    // 更新活动状态
                    document.querySelectorAll('.style-tab-button').forEach(btn => {
                        btn.classList.remove('active');
                        btn.style.backgroundColor = '#f5f5f5';
                    });
                    this.classList.add('active');
                    this.style.backgroundColor = '#e0e0e0';
                });
            });
            
            // 设置默认活动按钮
            nodeTypeButton.style.backgroundColor = '#e0e0e0';
            
            typeSwitchContainer.appendChild(nodeTypeButton);
            typeSwitchContainer.appendChild(relationshipTypeButton);
            
            styleEditorContainer.appendChild(typeSwitchContainer);
            
            // 添加样式表单容器
            const formContainer = document.createElement('div');
            formContainer.id = 'style-form-container';
            styleEditorContainer.appendChild(formContainer);
            
            // 添加操作按钮容器
            const actionsContainer = document.createElement('div');
            actionsContainer.className = 'style-editor-actions';
            actionsContainer.style.display = 'flex';
            actionsContainer.style.justifyContent = 'flex-end';
            actionsContainer.style.gap = '8px';
            actionsContainer.style.marginTop = '16px';
            
            const resetButton = document.createElement('button');
            resetButton.id = 'reset-style-button';
            resetButton.textContent = '重置';
            resetButton.className = 'style-action-button';
            resetButton.style.padding = '6px 12px';
            resetButton.style.border = '1px solid #ddd';
            resetButton.style.borderRadius = '4px';
            resetButton.style.backgroundColor = '#f5f5f5';
            resetButton.style.cursor = 'pointer';
            resetButton.style.fontSize = '14px';
            
            resetButton.addEventListener('click', function() {
                handleResetStyle();
            });
            
            const applyButton = document.createElement('button');
            applyButton.id = 'apply-style-button';
            applyButton.textContent = '应用';
            applyButton.className = 'style-action-button';
            applyButton.style.padding = '6px 12px';
            applyButton.style.border = '1px solid #6554C0';
            applyButton.style.borderRadius = '4px';
            applyButton.style.backgroundColor = '#6554C0';
            applyButton.style.color = '#ffffff';
            applyButton.style.cursor = 'pointer';
            applyButton.style.fontSize = '14px';
            
            applyButton.addEventListener('click', function() {
                handleApplyStyle();
            });
            
            actionsContainer.appendChild(resetButton);
            actionsContainer.appendChild(applyButton);
            
            styleEditorContainer.appendChild(actionsContainer);
            
            // 添加关闭按钮
            const closeButton = document.createElement('button');
            closeButton.className = 'style-editor-close';
            closeButton.innerHTML = '&times;';
            closeButton.style.position = 'absolute';
            closeButton.style.top = '8px';
            closeButton.style.right = '8px';
            closeButton.style.width = '24px';
            closeButton.style.height = '24px';
            closeButton.style.border = 'none';
            closeButton.style.borderRadius = '4px';
            closeButton.style.backgroundColor = 'transparent';
            closeButton.style.color = '#666';
            closeButton.style.fontSize = '18px';
            closeButton.style.cursor = 'pointer';
            closeButton.style.display = 'flex';
            closeButton.style.alignItems = 'center';
            closeButton.style.justifyContent = 'center';
            
            closeButton.addEventListener('mouseover', function() {
                this.style.backgroundColor = '#f0f0f0';
                this.style.color = '#333';
            });
            
            closeButton.addEventListener('mouseout', function() {
                this.style.backgroundColor = 'transparent';
                this.style.color = '#666';
            });
            
            closeButton.addEventListener('click', function() {
                hideStyleEditor();
            });
            
            styleEditorContainer.appendChild(closeButton);
        } catch (error) {
            console.error('Error initializing style editor container:', error);
        }
    }

    /**
     * 初始化样式表单
     */
    function initializeStyleForm() {
        try {
            const formContainer = document.getElementById('style-form-container');
            if (!formContainer) {
                console.error('Style form container not found');
                return;
            }
            
            // 创建节点样式表单
            const nodeForm = createNodeStyleForm();
            nodeForm.id = 'node-style-form';
            formContainer.appendChild(nodeForm);
            
            // 创建关系样式表单
            const relationshipForm = createRelationshipStyleForm();
            relationshipForm.id = 'relationship-style-form';
            relationshipForm.style.display = 'none';
            formContainer.appendChild(relationshipForm);
        } catch (error) {
            console.error('Error initializing style form:', error);
        }
    }

    /**
     * 创建节点样式表单
     * @returns {HTMLElement} 节点样式表单元素
     */
    function createNodeStyleForm() {
        const form = document.createElement('div');
        form.className = 'style-form node-style-form';
        
        // 添加分组
        addFormGroup(form, '基本设置', [
            createSelectField('shape', '形状', [
                { value: 'ellipse', label: '椭圆' },
                { value: 'rectangle', label: '矩形' },
                { value: 'diamond', label: '菱形' },
                { value: 'triangle', label: '三角形' },
                { value: 'circle', label: '圆形' }
            ]),
            createNumberField('width', '宽度', 20, 500),
            createNumberField('height', '高度', 20, 500)
        ]);
        
        addFormGroup(form, '颜色设置', [
            createColorField('backgroundColor', '背景颜色'),
            createColorField('borderColor', '边框颜色'),
            createNumberField('borderWidth', '边框宽度', 0, 10)
        ]);
        
        addFormGroup(form, '文本设置', [
            createColorField('color', '文本颜色'),
            createNumberField('fontSize', '字体大小', 8, 36),
            createSelectField('fontFamily', '字体', [
                { value: 'Arial, sans-serif', label: 'Arial' },
                { value: '"Times New Roman", serif', label: 'Times New Roman' },
                { value: '"Courier New", monospace', label: 'Courier New' },
                { value: 'Georgia, serif', label: 'Georgia' },
                { value: 'Verdana, sans-serif', label: 'Verdana' }
            ])
        ]);
        
        addFormGroup(form, '其他设置', [
            createNumberField('opacity', '透明度', 0, 1, 0.1),
            createNumberField('padding', '内边距', 0, 50)
        ]);
        
        addFormGroup(form, '选中状态', [
            createColorField('selectedBackgroundColor', '选中背景'),
            createColorField('selectedBorderColor', '选中边框')
        ]);
        
        addFormGroup(form, '悬停状态', [
            createColorField('hoverBackgroundColor', '悬停背景'),
            createColorField('hoverBorderColor', '悬停边框')
        ]);
        
        return form;
    }

    /**
     * 创建关系样式表单
     * @returns {HTMLElement} 关系样式表单元素
     */
    function createRelationshipStyleForm() {
        const form = document.createElement('div');
        form.className = 'style-form relationship-style-form';
        
        // 添加分组
        addFormGroup(form, '线条设置', [
            createNumberField('width', '线条宽度', 0.5, 10, 0.5),
            createColorField('lineColor', '线条颜色'),
            createSelectField('lineStyle', '线条样式', [
                { value: 'solid', label: '实线' },
                { value: 'dashed', label: '虚线' },
                { value: 'dotted', label: '点线' }
            ])
        ]);
        
        addFormGroup(form, '箭头设置', [
            createColorField('targetArrowColor', '箭头颜色'),
            createSelectField('targetArrowShape', '箭头形状', [
                { value: 'triangle', label: '三角形' },
                { value: 'triangle-backcurve', label: '后曲线三角形' },
                { value: 'circle', label: '圆形' },
                { value: 'diamond', label: '菱形' },
                { value: 'none', label: '无箭头' }
            ])
        ]);
        
        addFormGroup(form, '文本设置', [
            createColorField('color', '文本颜色'),
            createNumberField('fontSize', '字体大小', 8, 36),
            createSelectField('fontFamily', '字体', [
                { value: 'Arial, sans-serif', label: 'Arial' },
                { value: '"Times New Roman", serif', label: 'Times New Roman' },
                { value: '"Courier New", monospace', label: 'Courier New' },
                { value: 'Georgia, serif', label: 'Georgia' },
                { value: 'Verdana, sans-serif', label: 'Verdana' }
            ])
        ]);
        
        addFormGroup(form, '其他设置', [
            createNumberField('opacity', '透明度', 0, 1, 0.1)
        ]);
        
        addFormGroup(form, '选中状态', [
            createColorField('selectedLineColor', '选中线条')
        ]);
        
        addFormGroup(form, '悬停状态', [
            createColorField('hoverLineColor', '悬停线条')
        ]);
        
        return form;
    }

    /**
     * 添加表单分组
     * @param {HTMLElement} container - 容器元素
     * @param {string} title - 分组标题
     * @param {Array} fields - 字段数组
     */
    function addFormGroup(container, title, fields) {
        const group = document.createElement('div');
        group.className = 'style-form-group';
        group.style.marginBottom = '16px';
        
        const groupTitle = document.createElement('h4');
        groupTitle.textContent = title;
        groupTitle.style.marginTop = '0';
        groupTitle.style.marginBottom = '8px';
        groupTitle.style.fontSize = '14px';
        groupTitle.style.color = '#555';
        
        group.appendChild(groupTitle);
        
        fields.forEach(field => {
            group.appendChild(field);
        });
        
        container.appendChild(group);
    }

    /**
     * 创建文本字段
     * @param {string} name - 字段名称
     * @param {string} label - 字段标签
     * @param {string} value - 初始值
     * @returns {HTMLElement} 字段元素
     */
    function createTextField(name, label, value = '') {
        return createFormField(name, label, 'text', value);
    }

    /**
     * 创建数字字段
     * @param {string} name - 字段名称
     * @param {string} label - 字段标签
     * @param {number} min - 最小值
     * @param {number} max - 最大值
     * @param {number} step - 步长
     * @returns {HTMLElement} 字段元素
     */
    function createNumberField(name, label, min = 0, max = 100, step = 1) {
        const field = createFormField(name, label, 'number', currentStyle[currentStyleType][name] || '');
        const input = field.querySelector(`input[name="${name}"]`);
        input.min = min;
        input.max = max;
        input.step = step;
        return field;
    }

    /**
     * 创建颜色字段
     * @param {string} name - 字段名称
     * @param {string} label - 字段标签
     * @returns {HTMLElement} 字段元素
     */
    function createColorField(name, label) {
        const field = createFormField(name, label, 'color', currentStyle[currentStyleType][name] || '');
        
        // 添加颜色预览
        const preview = document.createElement('div');
        preview.className = 'color-preview';
        preview.style.width = '30px';
        preview.style.height = '20px';
        preview.style.borderRadius = '4px';
        preview.style.border = '1px solid #ddd';
        preview.style.backgroundColor = currentStyle[currentStyleType][name] || '#ffffff';
        
        const input = field.querySelector(`input[name="${name}"]`);
        input.style.width = '60px';
        
        // 添加预览到字段
        const inputContainer = field.querySelector('.field-input');
        inputContainer.appendChild(preview);
        
        // 更新预览
        input.addEventListener('input', function() {
            preview.style.backgroundColor = this.value;
        });
        
        return field;
    }

    /**
     * 创建选择字段
     * @param {string} name - 字段名称
     * @param {string} label - 字段标签
     * @param {Array} options - 选项数组
     * @returns {HTMLElement} 字段元素
     */
    function createSelectField(name, label, options) {
        const field = document.createElement('div');
        field.className = 'style-form-field';
        field.style.marginBottom = '8px';
        
        const labelElement = document.createElement('label');
        labelElement.textContent = label;
        labelElement.htmlFor = name;
        labelElement.style.display = 'block';
        labelElement.style.marginBottom = '4px';
        labelElement.style.fontSize = '13px';
        labelElement.style.color = '#333';
        
        const selectContainer = document.createElement('div');
        selectContainer.className = 'field-input';
        selectContainer.style.display = 'flex';
        selectContainer.style.alignItems = 'center';
        
        const select = document.createElement('select');
        select.id = name;
        select.name = name;
        select.className = 'style-form-input';
        select.style.width = '100%';
        select.style.padding = '6px';
        select.style.border = '1px solid #ddd';
        select.style.borderRadius = '4px';
        select.style.fontSize = '14px';
        
        options.forEach(option => {
            const optionElement = document.createElement('option');
            optionElement.value = option.value;
            optionElement.textContent = option.label;
            optionElement.selected = (currentStyle[currentStyleType][name] || '') === option.value;
            select.appendChild(optionElement);
        });
        
        selectContainer.appendChild(select);
        field.appendChild(labelElement);
        field.appendChild(selectContainer);
        
        return field;
    }

    /**
     * 创建表单字段
     * @param {string} name - 字段名称
     * @param {string} label - 字段标签
     * @param {string} type - 字段类型
     * @param {string} value - 初始值
     * @returns {HTMLElement} 字段元素
     */
    function createFormField(name, label, type, value = '') {
        const field = document.createElement('div');
        field.className = 'style-form-field';
        field.style.marginBottom = '8px';
        
        const labelElement = document.createElement('label');
        labelElement.textContent = label;
        labelElement.htmlFor = name;
        labelElement.style.display = 'block';
        labelElement.style.marginBottom = '4px';
        labelElement.style.fontSize = '13px';
        labelElement.style.color = '#333';
        
        const inputContainer = document.createElement('div');
        inputContainer.className = 'field-input';
        inputContainer.style.display = 'flex';
        inputContainer.style.alignItems = 'center';
        
        const input = document.createElement('input');
        input.id = name;
        input.name = name;
        input.type = type;
        input.className = 'style-form-input';
        input.value = value;
        input.style.width = '100%';
        input.style.padding = '6px';
        input.style.border = '1px solid #ddd';
        input.style.borderRadius = '4px';
        input.style.fontSize = '14px';
        
        inputContainer.appendChild(input);
        field.appendChild(labelElement);
        field.appendChild(inputContainer);
        
        // 添加输入事件监听
        input.addEventListener('input', function() {
            handleStyleInputChange(this.name, this.value);
        });
        
        return field;
    }

    /**
     * 初始化样式表
     */
    function initializeStyleSheet() {
        try {
            // 查找现有样式表或创建新的
            styleSheet = document.getElementById('neo4j-editor-styles');
            
            if (!styleSheet) {
                styleSheet = document.createElement('style');
                styleSheet.id = 'neo4j-editor-styles';
                document.head.appendChild(styleSheet);
            }
            
            // 更新样式表
            updateStyleSheet();
        } catch (error) {
            console.error('Error initializing style sheet:', error);
        }
    }

    /**
     * 更新样式表
     */
    function updateStyleSheet() {
        try {
            if (!styleSheet) {
                console.error('Style sheet not initialized');
                return;
            }
            
            // 生成Cytoscape样式规则
            const styleRules = generateStyleRules();
            
            // 更新样式表内容
            styleSheet.textContent = `
                /* Neo4j Editor Generated Styles */
                .cy {
                    height: 100%;
                    width: 100%;
                    position: relative;
                }
                
                ${styleRules}
            `;
            
            // 通知其他模块样式已更新
            if (neo4jEditor.eventManager && typeof neo4jEditor.eventManager.trigger === 'function') {
                neo4jEditor.eventManager.trigger('style:updated', {
                    nodeStyle: currentStyle.node,
                    relationshipStyle: currentStyle.relationship
                });
            }
        } catch (error) {
            console.error('Error updating style sheet:', error);
        }
    }

    /**
     * 生成样式规则
     * @returns {string} CSS样式规则
     */
    function generateStyleRules() {
        const nodeStyle = currentStyle.node;
        const edgeStyle = currentStyle.relationship;
        
        return `
            /* 节点样式 */
            .neo4j-node {
                background-color: ${nodeStyle.backgroundColor};
                border-color: ${nodeStyle.borderColor};
                border-width: ${nodeStyle.borderWidth}px;
                width: ${nodeStyle.width}px;
                height: ${nodeStyle.height}px;
                shape: ${nodeStyle.shape};
                color: ${nodeStyle.color};
                font-size: ${nodeStyle.fontSize}px;
                font-family: ${nodeStyle.fontFamily};
                opacity: ${nodeStyle.opacity};
                padding: ${nodeStyle.padding}px;
                text-outline-width: 0;
                text-halign: center;
                text-valign: center;
                transition: background-color 0.2s, border-color 0.2s;
            }
            
            /* 节点选中状态 */
            .neo4j-node:selected {
                background-color: ${nodeStyle.selectedBackgroundColor};
                border-color: ${nodeStyle.selectedBorderColor};
                z-index: 10;
            }
            
            /* 节点悬停状态 */
            .neo4j-node:hover {
                background-color: ${nodeStyle.hoverBackgroundColor};
                border-color: ${nodeStyle.hoverBorderColor};
            }
            
            /* 关系样式 */
            .neo4j-edge {
                line-color: ${edgeStyle.lineColor};
                width: ${edgeStyle.width}px;
                line-style: ${edgeStyle.lineStyle};
                target-arrow-color: ${edgeStyle.targetArrowColor};
                target-arrow-shape: ${edgeStyle.targetArrowShape};
                color: ${edgeStyle.color};
                font-size: ${edgeStyle.fontSize}px;
                font-family: ${edgeStyle.fontFamily};
                opacity: ${edgeStyle.opacity};
                transition: line-color 0.2s;
            }
            
            /* 关系选中状态 */
            .neo4j-edge:selected {
                line-color: ${edgeStyle.selectedLineColor};
                target-arrow-color: ${edgeStyle.selectedLineColor};
                z-index: 10;
            }
            
            /* 关系悬停状态 */
            .neo4j-edge:hover {
                line-color: ${edgeStyle.hoverLineColor};
                target-arrow-color: ${edgeStyle.hoverLineColor};
            }
            
            /* 关系标签 */
            .neo4j-edge .edge-label {
                background-color: transparent;
                padding: 2px 6px;
                border-radius: 4px;
            }
            
            /* 节点标签 */
            .neo4j-node .node-label {
                font-weight: bold;
                margin-bottom: 2px;
            }
            
            /* 节点属性 */
            .neo4j-node .node-property {
                font-size: 0.9em;
                line-height: 1.2;
            }
        `;
    }

    /**
     * 设置事件监听
     */
    function setupEventListeners() {
        try {
            if (!neo4jEditor.eventManager || typeof neo4jEditor.eventManager.on !== 'function') {
                console.warn('Style Editor: Event manager not available for event listeners');
                return;
            }
            
            // 监听样式面板切换事件
            neo4jEditor.eventManager.on('stylePanel:toggle', function() {
                toggleStyleEditor();
            });
            
            // 监听选择变化事件
            neo4jEditor.eventManager.on('selection:changed', function(event) {
                if (event.data && event.data.nodes && event.data.nodes.length > 0) {
                    // 如果选中了节点，显示节点样式
                    currentElement = event.data.nodes[0];
                    currentStyleType = 'node';
                    updateStyleFormWithElement(currentElement);
                    switchStyleType('node');
                } else if (event.data && event.data.edges && event.data.edges.length > 0) {
                    // 如果选中了关系，显示关系样式
                    currentElement = event.data.edges[0];
                    currentStyleType = 'relationship';
                    updateStyleFormWithElement(currentElement);
                    switchStyleType('relationship');
                }
            });
            
            // 监听元素更新事件
            neo4jEditor.eventManager.on('node:updated', function(event) {
                if (currentStyleType === 'node' && currentElement && currentElement.data.id === event.data.node.data.id) {
                    updateStyleFormWithElement(event.data.node);
                }
            });
            
            neo4jEditor.eventManager.on('edge:updated', function(event) {
                if (currentStyleType === 'relationship' && currentElement && currentElement.data.id === event.data.edge.data.id) {
                    updateStyleFormWithElement(event.data.edge);
                }
            });
        } catch (error) {
            console.error('Error setting up style editor event listeners:', error);
        }
    }

    /**
     * 处理样式输入变化
     * @param {string} property - 属性名
     * @param {string} value - 属性值
     */
    function handleStyleInputChange(property, value) {
        try {
            // 更新当前样式
            if (value === 'true') value = true;
            else if (value === 'false') value = false;
            else if (!isNaN(value) && value !== '') value = parseFloat(value);
            
            currentStyle[currentStyleType][property] = value;
            
            // 更新预览
            if (currentElement) {
                updateElementStylePreview(currentElement);
            }
        } catch (error) {
            console.error(`Error handling style input change for ${property}:`, error);
        }
    }

    /**
     * 处理重置样式
     */
    function handleResetStyle() {
        try {
            if (currentStyleType === 'node') {
                currentStyle.node = { ...defaultNodeStyle };
            } else {
                currentStyle.relationship = { ...defaultRelationshipStyle };
            }
            
            // 更新表单
            updateStyleForm(currentStyle[currentStyleType]);
            
            // 添加到历史记录
            saveStyleToHistory();
            
            // 更新样式表
            updateStyleSheet();
        } catch (error) {
            console.error('Error handling reset style:', error);
        }
    }

    /**
     * 处理应用样式
     */
    function handleApplyStyle() {
        try {
            // 添加到历史记录
            saveStyleToHistory();
            
            // 更新样式表
            updateStyleSheet();
            
            // 通知其他模块样式已应用
            if (neo4jEditor.eventManager && typeof neo4jEditor.eventManager.trigger === 'function') {
                neo4jEditor.eventManager.trigger('style:applied', {
                    nodeStyle: currentStyle.node,
                    relationshipStyle: currentStyle.relationship
                });
            }
        } catch (error) {
            console.error('Error handling apply style:', error);
        }
    }

    /**
     * 保存样式到历史记录
     */
    function saveStyleToHistory() {
        try {
            // 移除当前索引之后的历史记录
            if (historyIndex < styleHistory.length - 1) {
                styleHistory = styleHistory.slice(0, historyIndex + 1);
            }
            
            // 保存当前样式状态
            styleHistory.push({
                node: { ...currentStyle.node },
                relationship: { ...currentStyle.relationship },
                timestamp: new Date().getTime()
            });
            
            // 更新索引
            historyIndex = styleHistory.length - 1;
            
            // 限制历史记录大小
            if (styleHistory.length > MAX_HISTORY_SIZE) {
                styleHistory.shift();
                historyIndex--;
            }
        } catch (error) {
            console.error('Error saving style to history:', error);
        }
    }

    /**
     * 更新样式表单
     * @param {Object} style - 样式对象
     */
    function updateStyleForm(style) {
        try {
            const formId = currentStyleType === 'node' ? 'node-style-form' : 'relationship-style-form';
            const form = document.getElementById(formId);
            
            if (!form) {
                console.error(`Style form not found: ${formId}`);
                return;
            }
            
            // 更新所有表单字段
            Object.keys(style).forEach(property => {
                const element = form.querySelector(`[name="${property}"]`);
                if (element) {
                    if (element.type === 'checkbox') {
                        element.checked = style[property];
                    } else {
                        element.value = style[property];
                    }
                    
                    // 更新颜色预览
                    if (element.type === 'color') {
                        const preview = element.parentNode.querySelector('.color-preview');
                        if (preview) {
                            preview.style.backgroundColor = style[property];
                        }
                    }
                }
            });
        } catch (error) {
            console.error('Error updating style form:', error);
        }
    }

    /**
     * 根据元素更新样式表单
     * @param {Object} element - Cytoscape元素
     */
    function updateStyleFormWithElement(element) {
        try {
            // 从元素获取样式信息
            const style = getElementStyle(element);
            
            // 更新当前样式
            if (currentStyleType === 'node') {
                currentStyle.node = { ...currentStyle.node, ...style };
            } else {
                currentStyle.relationship = { ...currentStyle.relationship, ...style };
            }
            
            // 更新表单
            updateStyleForm(currentStyle[currentStyleType]);
        } catch (error) {
            console.error('Error updating style form with element:', error);
        }
    }

    /**
     * 获取元素样式
     * @param {Object} element - Cytoscape元素
     * @returns {Object} 样式对象
     */
    function getElementStyle(element) {
        try {
            const style = {};
            
            // 检查是否是Cytoscape元素或我们的内部元素表示
            if (element.renderedPosition) {
                // 假设这是Cytoscape元素
                // 在这里我们可以尝试从元素获取计算样式
                // 但由于我们的实现，我们可能需要使用默认样式
                return currentStyle[currentStyleType];
            } else {
                // 我们的内部元素表示，可能有样式信息在data中
                if (element.data && element.data.style) {
                    return element.data.style;
                }
            }
            
            return currentStyle[currentStyleType];
        } catch (error) {
            console.error('Error getting element style:', error);
            return currentStyle[currentStyleType];
        }
    }

    /**
     * 更新元素样式预览
     * @param {Object} element - Cytoscape元素
     */
    function updateElementStylePreview(element) {
        try {
            // 触发更新事件
            if (neo4jEditor.eventManager && typeof neo4jEditor.eventManager.trigger === 'function') {
                if (currentStyleType === 'node') {
                    neo4jEditor.eventManager.trigger('node:stylePreview', {
                        nodeId: element.data.id,
                        style: currentStyle.node
                    });
                } else {
                    neo4jEditor.eventManager.trigger('edge:stylePreview', {
                        edgeId: element.data.id,
                        style: currentStyle.relationship
                    });
                }
            }
        } catch (error) {
            console.error('Error updating element style preview:', error);
        }
    }

    /**
     * 切换样式类型
     * @param {string} type - 样式类型 ('node' 或 'relationship')
     */
    function switchStyleType(type) {
        try {
            if (type !== 'node' && type !== 'relationship') {
                console.error('Invalid style type:', type);
                return;
            }
            
            currentStyleType = type;
            
            // 显示相应的表单
            document.getElementById('node-style-form').style.display = type === 'node' ? 'block' : 'none';
            document.getElementById('relationship-style-form').style.display = type === 'relationship' ? 'block' : 'none';
            
            // 更新按钮状态
            document.getElementById('node-style-tab').classList.toggle('active', type === 'node');
            document.getElementById('relationship-style-tab').classList.toggle('active', type === 'relationship');
        } catch (error) {
            console.error(`Error switching style type to ${type}:`, error);
        }
    }

    /**
     * 显示样式编辑器
     */
    function showStyleEditor() {
        try {
            if (styleEditorContainer) {
                styleEditorContainer.style.display = 'block';
                
                // 触发事件
                if (neo4jEditor.eventManager && typeof neo4jEditor.eventManager.trigger === 'function') {
                    neo4jEditor.eventManager.trigger('styleEditor:shown', {});
                }
            }
        } catch (error) {
            console.error('Error showing style editor:', error);
        }
    }

    /**
     * 隐藏样式编辑器
     */
    function hideStyleEditor() {
        try {
            if (styleEditorContainer) {
                styleEditorContainer.style.display = 'none';
                
                // 触发事件
                if (neo4jEditor.eventManager && typeof neo4jEditor.eventManager.trigger === 'function') {
                    neo4jEditor.eventManager.trigger('styleEditor:hidden', {});
                }
            }
        } catch (error) {
            console.error('Error hiding style editor:', error);
        }
    }

    /**
     * 切换样式编辑器可见性
     */
    function toggleStyleEditor() {
        try {
            if (styleEditorContainer.style.display === 'none' || !styleEditorContainer.style.display) {
                showStyleEditor();
            } else {
                hideStyleEditor();
            }
        } catch (error) {
            console.error('Error toggling style editor visibility:', error);
        }
    }

    /**
     * 设置节点样式
     * @param {Object} style - 节点样式
     */
    function setNodeStyle(style) {
        try {
            currentStyle.node = { ...currentStyle.node, ...style };
            updateStyleForm(currentStyle.node);
            updateStyleSheet();
        } catch (error) {
            console.error('Error setting node style:', error);
        }
    }

    /**
     * 设置关系样式
     * @param {Object} style - 关系样式
     */
    function setRelationshipStyle(style) {
        try {
            currentStyle.relationship = { ...currentStyle.relationship, ...style };
            updateStyleForm(currentStyle.relationship);
            updateStyleSheet();
        } catch (error) {
            console.error('Error setting relationship style:', error);
        }
    }

    /**
     * 获取节点样式
     * @returns {Object} 节点样式
     */
    function getNodeStyle() {
        return { ...currentStyle.node };
    }

    /**
     * 获取关系样式
     * @returns {Object} 关系样式
     */
    function getRelationshipStyle() {
        return { ...currentStyle.relationship };
    }

    /**
     * 加载样式配置
     * @param {Object} config - 样式配置对象
     */
    function loadStyleConfig(config) {
        try {
            if (config.nodeStyle) {
                currentStyle.node = { ...config.nodeStyle };
            }
            
            if (config.relationshipStyle) {
                currentStyle.relationship = { ...config.relationshipStyle };
            }
            
            // 更新表单和样式表
            updateStyleForm(currentStyle[currentStyleType]);
            updateStyleSheet();
            
            // 保存到历史记录
            saveStyleToHistory();
        } catch (error) {
            console.error('Error loading style config:', error);
        }
    }

    /**
     * 导出样式配置
     * @returns {Object} 样式配置对象
     */
    function exportStyleConfig() {
        return {
            nodeStyle: { ...currentStyle.node },
            relationshipStyle: { ...currentStyle.relationship }
        };
    }

    /**
     * 撤销样式更改
     */
    function undoStyleChange() {
        try {
            if (historyIndex > 0) {
                historyIndex--;
                const prevState = styleHistory[historyIndex];
                
                currentStyle.node = { ...prevState.node };
                currentStyle.relationship = { ...prevState.relationship };
                
                // 更新表单和样式表
                updateStyleForm(currentStyle[currentStyleType]);
                updateStyleSheet();
            }
        } catch (error) {
            console.error('Error undoing style change:', error);
        }
    }

    /**
     * 重做样式更改
     */
    function redoStyleChange() {
        try {
            if (historyIndex < styleHistory.length - 1) {
                historyIndex++;
                const nextState = styleHistory[historyIndex];
                
                currentStyle.node = { ...nextState.node };
                currentStyle.relationship = { ...nextState.relationship };
                
                // 更新表单和样式表
                updateStyleForm(currentStyle[currentStyleType]);
                updateStyleSheet();
            }
        } catch (error) {
            console.error('Error redoing style change:', error);
        }
    }

    /**
     * 清理资源
     */
    function cleanup() {
        try {
            // 移除样式表
            if (styleSheet && styleSheet.parentNode) {
                styleSheet.parentNode.removeChild(styleSheet);
                styleSheet = null;
            }
            
            // 移除容器
            if (styleEditorContainer && styleEditorContainer.parentNode) {
                styleEditorContainer.parentNode.removeChild(styleEditorContainer);
                styleEditorContainer = null;
            }
            
            // 重置状态
            initialized = false;
            currentStyleType = 'node';
            currentElement = null;
            styleHistory = [];
            historyIndex = -1;
            
            console.log('Style Editor Module: Resources cleaned up');
        } catch (error) {
            console.error('Error cleaning up style editor resources:', error);
        }
    }

    /**
     * 样式编辑器模块
     */
    const styleEditorModule = {
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
            return initialize(config);
        },
        
        /**
         * 显示样式编辑器
         */
        show: function() {
            showStyleEditor();
        },
        
        /**
         * 隐藏样式编辑器
         */
        hide: function() {
            hideStyleEditor();
        },
        
        /**
         * 切换样式编辑器可见性
         */
        toggle: function() {
            toggleStyleEditor();
        },
        
        /**
         * 设置节点样式
         * @param {Object} style - 节点样式
         */
        setNodeStyle: function(style) {
            setNodeStyle(style);
        },
        
        /**
         * 设置关系样式
         * @param {Object} style - 关系样式
         */
        setRelationshipStyle: function(style) {
            setRelationshipStyle(style);
        },
        
        /**
         * 获取节点样式
         * @returns {Object} 节点样式
         */
        getNodeStyle: function() {
            return getNodeStyle();
        },
        
        /**
         * 获取关系样式
         * @returns {Object} 关系样式
         */
        getRelationshipStyle: function() {
            return getRelationshipStyle();
        },
        
        /**
         * 加载样式配置
         * @param {Object} config - 样式配置对象
         */
        loadStyleConfig: function(config) {
            loadStyleConfig(config);
        },
        
        /**
         * 导出样式配置
         * @returns {Object} 样式配置对象
         */
        exportStyleConfig: function() {
            return exportStyleConfig();
        },
        
        /**
         * 撤销样式更改
         */
        undo: function() {
            undoStyleChange();
        },
        
        /**
         * 重做样式更改
         */
        redo: function() {
            redoStyleChange();
        },
        
        /**
         * 清理资源
         */
        cleanup: function() {
            cleanup();
        }
    };
    
    // 导出模块到命名空间
    neo4jEditor.styleEditor = styleEditorModule;
    
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
                console.warn(`警告: 直接调用 ${deprecatedName}() 已弃用，请使用 neo4jEditor.styleEditor.${newFunction.name || 'method'}()`);
            }
            return newFunction.apply(context || null, arguments);
        };
    }
    
    // 注册向后兼容函数
    const backwardCompatibilityMapping = [
        { deprecatedName: 'initializeStyleEditor', newFunction: styleEditorModule.initialize, context: styleEditorModule },
        { deprecatedName: 'showStyleEditor', newFunction: styleEditorModule.show, context: styleEditorModule },
        { deprecatedName: 'hideStyleEditor', newFunction: styleEditorModule.hide, context: styleEditorModule },
        { deprecatedName: 'toggleStyleEditorVisibility', newFunction: styleEditorModule.toggle, context: styleEditorModule },
        { deprecatedName: 'setNodeStyleConfig', newFunction: styleEditorModule.setNodeStyle, context: styleEditorModule },
        { deprecatedName: 'setRelationshipStyleConfig', newFunction: styleEditorModule.setRelationshipStyle, context: styleEditorModule },
        { deprecatedName: 'getNodeStyleConfig', newFunction: styleEditorModule.getNodeStyle, context: styleEditorModule },
        { deprecatedName: 'getRelationshipStyleConfig', newFunction: styleEditorModule.getRelationshipStyle, context: styleEditorModule },
        { deprecatedName: 'loadStyleConfig', newFunction: styleEditorModule.loadStyleConfig, context: styleEditorModule },
        { deprecatedName: 'saveStyleConfig', newFunction: styleEditorModule.exportStyleConfig, context: styleEditorModule },
        { deprecatedName: 'undoStyle', newFunction: styleEditorModule.undo, context: styleEditorModule },
        { deprecatedName: 'redoStyle', newFunction: styleEditorModule.redo, context: styleEditorModule },
        { deprecatedName: 'cleanupStyleEditor', newFunction: styleEditorModule.cleanup, context: styleEditorModule }
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
    const moduleName = 'ui/styleEditor';
    const moduleRegistrationInfo = {
        name: moduleName,
        version: '1.0.0',
        dependencies: ['core/eventManager'],
        module: styleEditorModule
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
                        initialized: styleEditorModule.initialized,
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
                window.appModule.styleEditor = styleEditorModule;
                console.log(`Neo4j Editor: ${moduleName} module registered via final fallback to appModule`);
            }
        }
    } else {
        // 降级方案：直接挂载到全局
        if (typeof window.appModule === 'undefined') {
            window.appModule = {};
        }
        window.appModule.styleEditor = styleEditorModule;
        console.log(`Neo4j Editor: ${moduleName} module registered via fallback to appModule`);
    }
    
    // 多模块系统支持 - 确保兼容性
    // CommonJS 模块支持
    if (typeof module !== 'undefined' && typeof module.exports !== 'undefined') {
        module.exports = styleEditorModule;
    }
    
    // ES 模块支持
    if (typeof exports !== 'undefined' && typeof exports === 'object') {
        Object.defineProperty(exports, '__esModule', { value: true });
        if (typeof module !== 'undefined') module.exports = styleEditorModule;
        exports.default = styleEditorModule;
    }
    
    // AMD 模块支持
    if (typeof define === 'function' && define.amd) {
        define(['core/eventManager'], function() {
            return styleEditorModule;
        });
    }
    
    return styleEditorModule;
})(window.neo4jEditor || (window.neo4jEditor = {}));