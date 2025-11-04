/**
 * Neo4j Editor - 样式编辑面板模块
 * 负责节点和关系的视觉样式编辑功能
 */
(function(neo4jEditor) {
    'use strict';

    // 确保命名空间存在
    if (typeof neo4jEditor === 'undefined') {
        window.neo4jEditor = {};
    }

    // 初始化状态
    let initialized = false;
    
    // 样式面板元素引用
    let stylePanelElement = null;
    let styleContentElement = null;
    let stylePanelHeader = null;
    let stylePanelFooter = null;
    let closeButton = null;
    let saveButton = null;
    let cancelButton = null;
    
    // 当前编辑的元素
    let currentEditingElement = null;
    let elementType = null; // 'node' 或 'edge'
    
    // 原始样式备份（用于取消操作）
    let originalStyleBackup = null;
    
    // 默认样式配置
    const defaultStyles = {
        node: {
            backgroundColor: '#2196F3',
            borderColor: '#1976D2',
            borderWidth: '1',
            width: '40',
            height: '40',
            shape: 'ellipse',
            fontSize: '14',
            fontFamily: 'Arial, sans-serif',
            color: '#ffffff',
            label: 'data(label)'
        },
        edge: {
            lineColor: '#ccc',
            lineWidth: '2',
            lineStyle: 'solid',
            targetArrowColor: '#ccc',
            targetArrowShape: 'triangle',
            fontSize: '12',
            fontFamily: 'Arial, sans-serif',
            color: '#333333',
            label: 'data(label)'
        }
    };

    /**
     * 创建样式面板DOM元素
     */
    function createStylePanel() {
        try {
            // 检查面板是否已存在
            stylePanelElement = document.getElementById('neo4j-style-panel');
            if (stylePanelElement) {
                return stylePanelElement;
            }
            
            // 创建主面板元素
            stylePanelElement = document.createElement('div');
            stylePanelElement.id = 'neo4j-style-panel';
            stylePanelElement.className = 'neo4j-style-panel';
            
            // 设置基本样式
            stylePanelElement.style.position = 'fixed';
            stylePanelElement.style.left = '-300px';
            stylePanelElement.style.top = '0';
            stylePanelElement.style.width = '300px';
            stylePanelElement.style.height = '100%';
            stylePanelElement.style.backgroundColor = '#fff';
            stylePanelElement.style.boxShadow = '2px 0 8px rgba(0, 0, 0, 0.15)';
            stylePanelElement.style.zIndex = '999';
            stylePanelElement.style.transition = 'left 0.3s ease';
            stylePanelElement.style.display = 'flex';
            stylePanelElement.style.flexDirection = 'column';
            stylePanelElement.style.fontFamily = 'Arial, sans-serif';
            stylePanelElement.style.fontSize = '14px';
            
            // 创建头部
            stylePanelHeader = document.createElement('div');
            stylePanelHeader.className = 'neo4j-style-header';
            stylePanelHeader.style.padding = '16px';
            stylePanelHeader.style.borderBottom = '1px solid #e0e0e0';
            stylePanelHeader.style.display = 'flex';
            stylePanelHeader.style.justifyContent = 'space-between';
            stylePanelHeader.style.alignItems = 'center';
            stylePanelHeader.style.backgroundColor = '#f5f5f5';
            
            // 头部标题
            const headerTitle = document.createElement('h3');
            headerTitle.id = 'neo4j-style-title';
            headerTitle.textContent = '样式编辑';
            headerTitle.style.margin = '0';
            headerTitle.style.fontSize = '16px';
            headerTitle.style.fontWeight = '500';
            
            // 关闭按钮
            closeButton = document.createElement('button');
            closeButton.className = 'neo4j-style-close';
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
            stylePanelHeader.appendChild(headerTitle);
            stylePanelHeader.appendChild(closeButton);
            
            // 创建内容区域
            styleContentElement = document.createElement('div');
            styleContentElement.className = 'neo4j-style-content';
            styleContentElement.style.flex = '1';
            styleContentElement.style.padding = '16px';
            styleContentElement.style.overflowY = 'auto';
            
            // 创建底部操作按钮区域
            stylePanelFooter = document.createElement('div');
            stylePanelFooter.className = 'neo4j-style-footer';
            stylePanelFooter.style.padding = '16px';
            stylePanelFooter.style.borderTop = '1px solid #e0e0e0';
            stylePanelFooter.style.display = 'flex';
            stylePanelFooter.style.justifyContent = 'flex-end';
            stylePanelFooter.style.gap = '8px';
            stylePanelFooter.style.backgroundColor = '#f5f5f5';
            
            // 取消按钮
            cancelButton = document.createElement('button');
            cancelButton.className = 'neo4j-style-cancel';
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
            saveButton.className = 'neo4j-style-save';
            saveButton.textContent = '保存';
            saveButton.style.padding = '8px 16px';
            saveButton.style.border = '1px solid #4CAF50';
            saveButton.style.backgroundColor = '#4CAF50';
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
                this.style.backgroundColor = '#388E3C';
                this.style.borderColor = '#388E3C';
            });
            saveButton.addEventListener('mouseleave', function() {
                this.style.backgroundColor = '#4CAF50';
                this.style.borderColor = '#4CAF50';
            });
            
            // 添加底部元素
            stylePanelFooter.appendChild(cancelButton);
            stylePanelFooter.appendChild(saveButton);
            
            // 组合面板
            stylePanelElement.appendChild(stylePanelHeader);
            stylePanelElement.appendChild(styleContentElement);
            stylePanelElement.appendChild(stylePanelFooter);
            
            // 添加到文档
            document.body.appendChild(stylePanelElement);
            
            return stylePanelElement;
        } catch (error) {
            console.error('Error creating style panel:', error);
            return null;
        }
    }

    /**
     * 设置样式面板事件监听
     */
    function setupEventListeners() {
        try {
            // 关闭按钮点击事件
            if (closeButton) {
                closeButton.addEventListener('click', function() {
                    closeStylePanel();
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
                    saveStyle();
                });
            }
            
            // 点击面板外部关闭面板
            document.addEventListener('click', function(event) {
                if (stylePanelElement && 
                    isStylePanelOpen() && 
                    !stylePanelElement.contains(event.target) &&
                    !event.target.classList.contains('neo4j-node') &&
                    !event.target.classList.contains('neo4j-edge')) {
                    // 延迟关闭，避免与节点选择冲突
                    setTimeout(function() {
                        closeStylePanel();
                    }, 100);
                }
            });
            
            // 监听元素选择事件
            if (neo4jEditor.eventManager && typeof neo4jEditor.eventManager.on === 'function') {
                neo4jEditor.eventManager.on('element:selected', handleElementSelected);
            }
            
            // 监听键盘事件 (Escape关闭面板)
            document.addEventListener('keydown', function(event) {
                if (event.key === 'Escape' && isStylePanelOpen()) {
                    closeStylePanel();
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
            // 这里可以根据需要实现选择元素时的样式面板操作
            // 例如根据配置决定是否自动打开样式面板
            if (eventData && eventData.element && eventData.type && neo4jEditor.editorState && 
                neo4jEditor.editorState.openStylePanelOnSelect) {
                openStylePanel(eventData.element, eventData.type);
            }
        } catch (error) {
            console.error('Error handling element selected event:', error);
        }
    }

    /**
     * 打开样式面板
     * @param {Object} element - 要编辑样式的元素
     * @param {string} type - 元素类型 ('node' 或 'edge')
     */
    function openStylePanel(element, type) {
        try {
            // 验证参数
            if (!element || !type || (type !== 'node' && type !== 'edge')) {
                console.error('Invalid parameters for openStylePanel');
                return;
            }
            
            // 更新当前编辑元素
            currentEditingElement = element;
            elementType = type;
            
            // 备份原始样式
            originalStyleBackup = JSON.parse(JSON.stringify(getElementStyle(element, type)));
            
            // 更新面板标题
            if (stylePanelHeader && stylePanelHeader.querySelector('#neo4j-style-title')) {
                const titleElement = stylePanelHeader.querySelector('#neo4j-style-title');
                titleElement.textContent = type === 'node' ? '节点样式' : '关系样式';
            }
            
            // 渲染样式表单
            renderStyleForm(element, type);
            
            // 显示面板
            if (stylePanelElement) {
                stylePanelElement.style.left = '0';
            }
            
            // 更新编辑器状态
            if (neo4jEditor.editorState) {
                neo4jEditor.editorState.isEditingStyle = true;
            }
        } catch (error) {
            console.error('Error opening style panel:', error);
        }
    }

    /**
     * 关闭样式面板
     */
    function closeStylePanel() {
        try {
            if (stylePanelElement) {
                stylePanelElement.style.left = '-300px';
            }
            
            // 重置当前编辑元素
            currentEditingElement = null;
            elementType = null;
            originalStyleBackup = null;
            
            // 更新编辑器状态
            if (neo4jEditor.editorState) {
                neo4jEditor.editorState.isEditingStyle = false;
            }
        } catch (error) {
            console.error('Error closing style panel:', error);
        }
    }

    /**
     * 检查样式面板是否打开
     * @returns {boolean} 面板是否打开
     */
    function isStylePanelOpen() {
        if (!stylePanelElement) {
            return false;
        }
        const left = stylePanelElement.style.left;
        return left === '0px' || left === '0';
    }

    /**
     * 获取元素的样式
     * @param {Object} element - 元素对象
     * @param {string} type - 元素类型
     * @returns {Object} 样式对象
     */
    function getElementStyle(element, type) {
        try {
            // 获取默认样式
            const defaultStyle = JSON.parse(JSON.stringify(defaultStyles[type] || {}));
            
            // 如果元素有样式，则合并
            if (element.data && element.data.style) {
                return { ...defaultStyle, ...element.data.style };
            }
            
            return defaultStyle;
        } catch (error) {
            console.error('Error getting element style:', error);
            return {};
        }
    }

    /**
     * 渲染样式表单
     * @param {Object} element - 要编辑的元素
     * @param {string} type - 元素类型
     */
    function renderStyleForm(element, type) {
        try {
            if (!styleContentElement || !element) {
                return;
            }
            
            // 清空内容
            styleContentElement.innerHTML = '';
            
            // 创建表单容器
            const form = document.createElement('form');
            form.className = 'neo4j-style-form';
            form.style.display = 'flex';
            form.style.flexDirection = 'column';
            form.style.gap = '16px';
            
            // 阻止表单默认提交
            form.addEventListener('submit', function(event) {
                event.preventDefault();
                saveStyle();
            });
            
            // 获取当前样式
            const currentStyle = getElementStyle(element, type);
            
            // 渲染基本样式
            if (type === 'node') {
                renderNodeStyleFields(form, currentStyle);
            } else {
                renderEdgeStyleFields(form, currentStyle);
            }
            
            // 渲染通用文本样式
            renderTextStyleFields(form, currentStyle);
            
            // 添加到内容区域
            styleContentElement.appendChild(form);
        } catch (error) {
            console.error('Error rendering style form:', error);
        }
    }

    /**
     * 渲染节点样式字段
     * @param {HTMLElement} container - 容器元素
     * @param {Object} style - 样式对象
     */
    function renderNodeStyleFields(container, style) {
        try {
            // 创建节点样式部分
            const nodeStyleSection = document.createElement('div');
            nodeStyleSection.className = 'neo4j-style-section';
            nodeStyleSection.style.borderBottom = '1px solid #e0e0e0';
            nodeStyleSection.style.paddingBottom = '16px';
            
            // 标题
            const sectionHeader = document.createElement('h4');
            sectionHeader.textContent = '外观样式';
            sectionHeader.style.margin = '0 0 16px 0';
            sectionHeader.style.fontSize = '14px';
            sectionHeader.style.fontWeight = '600';
            sectionHeader.style.color = '#555';
            nodeStyleSection.appendChild(sectionHeader);
            
            // 形状选择
            const shapeFieldGroup = createSelectFieldGroup(
                '形状', 
                'shape', 
                [
                    { value: 'ellipse', label: '椭圆' },
                    { value: 'rectangle', label: '矩形' },
                    { value: 'diamond', label: '菱形' },
                    { value: 'triangle', label: '三角形' },
                    { value: 'hexagon', label: '六边形' },
                    { value: 'octagon', label: '八边形' },
                    { value: 'polygon', label: '多边形' },
                    { value: 'circle', label: '圆形' },
                    { value: 'roundrectangle', label: '圆角矩形' },
                    { value: 'parallelogram', label: '平行四边形' }
                ],
                style.shape || 'ellipse'
            );
            nodeStyleSection.appendChild(shapeFieldGroup);
            
            // 背景颜色
            const bgColorFieldGroup = createColorFieldGroup('背景颜色', 'backgroundColor', style.backgroundColor || '#2196F3');
            nodeStyleSection.appendChild(bgColorFieldGroup);
            
            // 边框颜色
            const borderColorFieldGroup = createColorFieldGroup('边框颜色', 'borderColor', style.borderColor || '#1976D2');
            nodeStyleSection.appendChild(borderColorFieldGroup);
            
            // 边框宽度
            const borderWidthFieldGroup = createNumberFieldGroup('边框宽度', 'borderWidth', style.borderWidth || '1');
            nodeStyleSection.appendChild(borderWidthFieldGroup);
            
            // 宽度
            const widthFieldGroup = createNumberFieldGroup('宽度', 'width', style.width || '40');
            nodeStyleSection.appendChild(widthFieldGroup);
            
            // 高度
            const heightFieldGroup = createNumberFieldGroup('高度', 'height', style.height || '40');
            nodeStyleSection.appendChild(heightFieldGroup);
            
            container.appendChild(nodeStyleSection);
        } catch (error) {
            console.error('Error rendering node style fields:', error);
        }
    }

    /**
     * 渲染关系样式字段
     * @param {HTMLElement} container - 容器元素
     * @param {Object} style - 样式对象
     */
    function renderEdgeStyleFields(container, style) {
        try {
            // 创建关系样式部分
            const edgeStyleSection = document.createElement('div');
            edgeStyleSection.className = 'neo4j-style-section';
            edgeStyleSection.style.borderBottom = '1px solid #e0e0e0';
            edgeStyleSection.style.paddingBottom = '16px';
            
            // 标题
            const sectionHeader = document.createElement('h4');
            sectionHeader.textContent = '连线样式';
            sectionHeader.style.margin = '0 0 16px 0';
            sectionHeader.style.fontSize = '14px';
            sectionHeader.style.fontWeight = '600';
            sectionHeader.style.color = '#555';
            edgeStyleSection.appendChild(sectionHeader);
            
            // 线条颜色
            const lineColorFieldGroup = createColorFieldGroup('线条颜色', 'lineColor', style.lineColor || '#ccc');
            edgeStyleSection.appendChild(lineColorFieldGroup);
            
            // 线条宽度
            const lineWidthFieldGroup = createNumberFieldGroup('线条宽度', 'lineWidth', style.lineWidth || '2');
            edgeStyleSection.appendChild(lineWidthFieldGroup);
            
            // 线条样式
            const lineStyleFieldGroup = createSelectFieldGroup(
                '线条样式', 
                'lineStyle', 
                [
                    { value: 'solid', label: '实线' },
                    { value: 'dashed', label: '虚线' },
                    { value: 'dotted', label: '点线' }
                ],
                style.lineStyle || 'solid'
            );
            edgeStyleSection.appendChild(lineStyleFieldGroup);
            
            // 目标箭头颜色
            const targetArrowColorFieldGroup = createColorFieldGroup('箭头颜色', 'targetArrowColor', style.targetArrowColor || '#ccc');
            edgeStyleSection.appendChild(targetArrowColorFieldGroup);
            
            // 目标箭头形状
            const targetArrowShapeFieldGroup = createSelectFieldGroup(
                '箭头形状', 
                'targetArrowShape', 
                [
                    { value: 'triangle', label: '三角形' },
                    { value: 'triangle-tee', label: 'T形三角' },
                    { value: 'triangle-cross', label: '交叉三角' },
                    { value: 'triangle-backcurve', label: '后弯三角' },
                    { value: 'square', label: '方形' },
                    { value: 'circle', label: '圆形' },
                    { value: 'diamond', label: '菱形' },
                    { value: 'none', label: '无' }
                ],
                style.targetArrowShape || 'triangle'
            );
            edgeStyleSection.appendChild(targetArrowShapeFieldGroup);
            
            container.appendChild(edgeStyleSection);
        } catch (error) {
            console.error('Error rendering edge style fields:', error);
        }
    }

    /**
     * 渲染文本样式字段
     * @param {HTMLElement} container - 容器元素
     * @param {Object} style - 样式对象
     */
    function renderTextStyleFields(container, style) {
        try {
            // 创建文本样式部分
            const textStyleSection = document.createElement('div');
            textStyleSection.className = 'neo4j-style-section';
            textStyleSection.style.marginTop = '8px';
            
            // 标题
            const sectionHeader = document.createElement('h4');
            sectionHeader.textContent = '文本样式';
            sectionHeader.style.margin = '0 0 16px 0';
            sectionHeader.style.fontSize = '14px';
            sectionHeader.style.fontWeight = '600';
            sectionHeader.style.color = '#555';
            textStyleSection.appendChild(sectionHeader);
            
            // 文本颜色
            const colorFieldGroup = createColorFieldGroup('文本颜色', 'color', style.color || (elementType === 'node' ? '#ffffff' : '#333333'));
            textStyleSection.appendChild(colorFieldGroup);
            
            // 字体大小
            const fontSizeFieldGroup = createNumberFieldGroup('字体大小', 'fontSize', style.fontSize || (elementType === 'node' ? '14' : '12'));
            textStyleSection.appendChild(fontSizeFieldGroup);
            
            // 字体选择
            const fontFamilyFieldGroup = createSelectFieldGroup(
                '字体', 
                'fontFamily', 
                [
                    { value: 'Arial, sans-serif', label: 'Arial' },
                    { value: 'Helvetica, sans-serif', label: 'Helvetica' },
                    { value: 'Times New Roman, serif', label: 'Times New Roman' },
                    { value: 'Georgia, serif', label: 'Georgia' },
                    { value: 'Courier New, monospace', label: 'Courier New' },
                    { value: 'Verdana, sans-serif', label: 'Verdana' },
                    { value: '微软雅黑, sans-serif', label: '微软雅黑' },
                    { value: '宋体, serif', label: '宋体' },
                    { value: '黑体, sans-serif', label: '黑体' },
                    { value: '仿宋, serif', label: '仿宋' }
                ],
                style.fontFamily || 'Arial, sans-serif'
            );
            textStyleSection.appendChild(fontFamilyFieldGroup);
            
            // 标签表达式
            const labelFieldGroup = createTextFieldGroup(
                '标签表达式', 
                'label', 
                style.label || 'data(label)',
                '例如: data(label), data(id) 或 data(name)'
            );
            textStyleSection.appendChild(labelFieldGroup);
            
            container.appendChild(textStyleSection);
        } catch (error) {
            console.error('Error rendering text style fields:', error);
        }
    }

    /**
     * 创建文本输入字段组
     * @param {string} label - 字段标签
     * @param {string} name - 字段名称
     * @param {string} value - 字段值
     * @param {string} placeholder - 占位文本
     * @returns {HTMLElement} 字段组元素
     */
    function createTextFieldGroup(label, name, value, placeholder = '') {
        try {
            const fieldGroup = document.createElement('div');
            fieldGroup.className = 'neo4j-form-field-group';
            fieldGroup.style.display = 'flex';
            fieldGroup.style.flexDirection = 'column';
            fieldGroup.style.gap = '4px';
            
            // 标签
            const fieldLabel = document.createElement('label');
            fieldLabel.htmlFor = `neo4j-style-${name}`;
            fieldLabel.textContent = label;
            fieldLabel.style.fontSize = '13px';
            fieldLabel.style.fontWeight = '500';
            fieldLabel.style.color = '#666';
            
            // 输入框
            const input = document.createElement('input');
            input.type = 'text';
            input.id = `neo4j-style-${name}`;
            input.name = name;
            input.value = value !== undefined && value !== null ? value : '';
            input.placeholder = placeholder;
            input.style.padding = '8px 10px';
            input.style.border = '1px solid #ddd';
            input.style.borderRadius = '4px';
            input.style.fontSize = '14px';
            input.style.outline = 'none';
            
            // 聚焦效果
            input.addEventListener('focus', function() {
                this.style.borderColor = '#4CAF50';
                this.style.boxShadow = '0 0 0 2px rgba(76, 175, 80, 0.1)';
            });
            
            input.addEventListener('blur', function() {
                this.style.borderColor = '#ddd';
                this.style.boxShadow = 'none';
            });
            
            // 组合字段组
            fieldGroup.appendChild(fieldLabel);
            fieldGroup.appendChild(input);
            
            return fieldGroup;
        } catch (error) {
            console.error('Error creating text field group:', error);
            return document.createElement('div');
        }
    }

    /**
     * 创建数字输入字段组
     * @param {string} label - 字段标签
     * @param {string} name - 字段名称
     * @param {number|string} value - 字段值
     * @param {number} min - 最小值
     * @param {number} max - 最大值
     * @returns {HTMLElement} 字段组元素
     */
    function createNumberFieldGroup(label, name, value, min = 1, max = 500) {
        try {
            const fieldGroup = document.createElement('div');
            fieldGroup.className = 'neo4j-form-field-group';
            fieldGroup.style.display = 'flex';
            fieldGroup.style.flexDirection = 'column';
            fieldGroup.style.gap = '4px';
            
            // 标签
            const fieldLabel = document.createElement('label');
            fieldLabel.htmlFor = `neo4j-style-${name}`;
            fieldLabel.textContent = label;
            fieldLabel.style.fontSize = '13px';
            fieldLabel.style.fontWeight = '500';
            fieldLabel.style.color = '#666';
            
            // 输入框
            const input = document.createElement('input');
            input.type = 'number';
            input.id = `neo4j-style-${name}`;
            input.name = name;
            input.value = value !== undefined && value !== null ? value : '';
            input.min = min;
            input.max = max;
            input.step = '1';
            input.style.padding = '8px 10px';
            input.style.border = '1px solid #ddd';
            input.style.borderRadius = '4px';
            input.style.fontSize = '14px';
            input.style.outline = 'none';
            
            // 聚焦效果
            input.addEventListener('focus', function() {
                this.style.borderColor = '#4CAF50';
                this.style.boxShadow = '0 0 0 2px rgba(76, 175, 80, 0.1)';
            });
            
            input.addEventListener('blur', function() {
                this.style.borderColor = '#ddd';
                this.style.boxShadow = 'none';
            });
            
            // 组合字段组
            fieldGroup.appendChild(fieldLabel);
            fieldGroup.appendChild(input);
            
            return fieldGroup;
        } catch (error) {
            console.error('Error creating number field group:', error);
            return document.createElement('div');
        }
    }

    /**
     * 创建颜色选择字段组
     * @param {string} label - 字段标签
     * @param {string} name - 字段名称
     * @param {string} value - 字段值
     * @returns {HTMLElement} 字段组元素
     */
    function createColorFieldGroup(label, name, value) {
        try {
            const fieldGroup = document.createElement('div');
            fieldGroup.className = 'neo4j-form-field-group';
            fieldGroup.style.display = 'flex';
            fieldGroup.style.flexDirection = 'column';
            fieldGroup.style.gap = '4px';
            
            // 标签
            const fieldLabel = document.createElement('label');
            fieldLabel.htmlFor = `neo4j-style-${name}`;
            fieldLabel.textContent = label;
            fieldLabel.style.fontSize = '13px';
            fieldLabel.style.fontWeight = '500';
            fieldLabel.style.color = '#666';
            
            // 颜色选择容器
            const colorInputContainer = document.createElement('div');
            colorInputContainer.style.display = 'flex';
            colorInputContainer.style.gap = '8px';
            
            // 颜色输入框
            const input = document.createElement('input');
            input.type = 'color';
            input.id = `neo4j-style-${name}`;
            input.name = name;
            input.value = value !== undefined && value !== null ? value : '#000000';
            input.style.height = '36px';
            input.style.width = '50px';
            input.style.border = '1px solid #ddd';
            input.style.borderRadius = '4px';
            input.style.cursor = 'pointer';
            input.style.outline = 'none';
            
            // 文本输入框（十六进制值）
            const textInput = document.createElement('input');
            textInput.type = 'text';
            textInput.className = `neo4j-style-${name}-text`;
            textInput.value = value !== undefined && value !== null ? value : '#000000';
            textInput.style.flex = '1';
            textInput.style.padding = '8px 10px';
            textInput.style.border = '1px solid #ddd';
            textInput.style.borderRadius = '4px';
            textInput.style.fontSize = '14px';
            textInput.style.outline = 'none';
            
            // 聚焦效果
            [input, textInput].forEach(element => {
                element.addEventListener('focus', function() {
                    this.style.borderColor = '#4CAF50';
                    this.style.boxShadow = '0 0 0 2px rgba(76, 175, 80, 0.1)';
                });
                
                element.addEventListener('blur', function() {
                    this.style.borderColor = '#ddd';
                    this.style.boxShadow = 'none';
                });
            });
            
            // 同步两个输入框的值
            input.addEventListener('input', function() {
                textInput.value = this.value;
            });
            
            textInput.addEventListener('change', function() {
                // 验证颜色格式
                const colorRegex = /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/;
                if (colorRegex.test(this.value)) {
                    input.value = this.value;
                } else {
                    // 如果无效，重置为当前颜色
                    this.value = input.value;
                }
            });
            
            // 组合颜色输入容器
            colorInputContainer.appendChild(input);
            colorInputContainer.appendChild(textInput);
            
            // 组合字段组
            fieldGroup.appendChild(fieldLabel);
            fieldGroup.appendChild(colorInputContainer);
            
            return fieldGroup;
        } catch (error) {
            console.error('Error creating color field group:', error);
            return document.createElement('div');
        }
    }

    /**
     * 创建下拉选择字段组
     * @param {string} label - 字段标签
     * @param {string} name - 字段名称
     * @param {Array} options - 选项数组 [{value, label}]
     * @param {string} selectedValue - 选中的值
     * @returns {HTMLElement} 字段组元素
     */
    function createSelectFieldGroup(label, name, options, selectedValue) {
        try {
            const fieldGroup = document.createElement('div');
            fieldGroup.className = 'neo4j-form-field-group';
            fieldGroup.style.display = 'flex';
            fieldGroup.style.flexDirection = 'column';
            fieldGroup.style.gap = '4px';
            
            // 标签
            const fieldLabel = document.createElement('label');
            fieldLabel.htmlFor = `neo4j-style-${name}`;
            fieldLabel.textContent = label;
            fieldLabel.style.fontSize = '13px';
            fieldLabel.style.fontWeight = '500';
            fieldLabel.style.color = '#666';
            
            // 下拉选择框
            const select = document.createElement('select');
            select.id = `neo4j-style-${name}`;
            select.name = name;
            select.style.padding = '8px 10px';
            select.style.border = '1px solid #ddd';
            select.style.borderRadius = '4px';
            select.style.fontSize = '14px';
            select.style.outline = 'none';
            select.style.backgroundColor = '#fff';
            select.style.cursor = 'pointer';
            
            // 添加选项
            options.forEach(option => {
                const optionElement = document.createElement('option');
                optionElement.value = option.value;
                optionElement.textContent = option.label;
                optionElement.selected = option.value === selectedValue;
                select.appendChild(optionElement);
            });
            
            // 聚焦效果
            select.addEventListener('focus', function() {
                this.style.borderColor = '#4CAF50';
                this.style.boxShadow = '0 0 0 2px rgba(76, 175, 80, 0.1)';
            });
            
            select.addEventListener('blur', function() {
                this.style.borderColor = '#ddd';
                this.style.boxShadow = 'none';
            });
            
            // 组合字段组
            fieldGroup.appendChild(fieldLabel);
            fieldGroup.appendChild(select);
            
            return fieldGroup;
        } catch (error) {
            console.error('Error creating select field group:', error);
            return document.createElement('div');
        }
    }

    /**
     * 保存样式更改
     */
    function saveStyle() {
        try {
            if (!currentEditingElement || !elementType) {
                console.error('No element being edited');
                return;
            }
            
            // 收集表单数据
            const styleData = collectStyleData();
            if (!styleData) {
                return;
            }
            
            // 更新元素样式
            updateElementStyle(styleData);
            
            // 同步到Cytoscape实例
            syncToCytoscapeInstances();
            
            // 触发样式更新事件
            if (neo4jEditor.eventManager && typeof neo4jEditor.eventManager.trigger === 'function') {
                neo4jEditor.eventManager.trigger('element:styleUpdated', {
                    element: currentEditingElement,
                    type: elementType,
                    style: styleData
                });
            }
            
            // 显示保存成功提示
            if (typeof neo4jEditor.core !== 'undefined' && neo4jEditor.core.showToast) {
                neo4jEditor.core.showToast('样式保存成功', 'success');
            }
            
            // 关闭面板
            closeStylePanel();
        } catch (error) {
            console.error('Error saving style:', error);
            // 显示错误提示
            if (typeof neo4jEditor.core !== 'undefined' && neo4jEditor.core.showToast) {
                neo4jEditor.core.showToast('保存失败: ' + error.message, 'error');
            }
        }
    }

    /**
     * 收集样式数据
     * @returns {Object|null} 样式数据或null
     */
    function collectStyleData() {
        try {
            const styleData = {};
            
            // 获取所有表单元素
            const formElements = document.querySelectorAll('.neo4j-style-form input, .neo4j-style-form select');
            
            formElements.forEach(element => {
                // 跳过颜色的文本输入框，因为它们与颜色输入框是同步的
                if (element.type === 'text' && element.className.includes('neo4j-style-') && 
                    element.className.includes('-text')) {
                    return;
                }
                
                // 获取字段名称
                const fieldName = element.name;
                if (!fieldName) return;
                
                // 获取值
                let value = element.value;
                
                // 处理数字类型
                if (element.type === 'number') {
                    value = parseInt(value, 10);
                    if (isNaN(value)) {
                        value = 0;
                    }
                }
                
                styleData[fieldName] = value;
            });
            
            return styleData;
        } catch (error) {
            console.error('Error collecting style data:', error);
            return null;
        }
    }

    /**
     * 更新元素样式
     * @param {Object} styleData - 样式数据
     */
    function updateElementStyle(styleData) {
        try {
            if (!currentEditingElement || !currentEditingElement.data) {
                return;
            }
            
            // 确保style对象存在
            if (!currentEditingElement.data.style) {
                currentEditingElement.data.style = {};
            }
            
            // 更新样式
            Object.assign(currentEditingElement.data.style, styleData);
        } catch (error) {
            console.error('Error updating element style:', error);
        }
    }

    /**
     * 同步到Cytoscape实例
     */
    function syncToCytoscapeInstances() {
        try {
            // 更新共享数据
            if (neo4jEditor.sharedGraphData && currentEditingElement && currentEditingElement.data.id) {
                if (elementType === 'node') {
                    const nodeIndex = neo4jEditor.sharedGraphData.nodes.findIndex(
                        node => node.data.id === currentEditingElement.data.id
                    );
                    if (nodeIndex !== -1) {
                        neo4jEditor.sharedGraphData.nodes[nodeIndex] = JSON.parse(JSON.stringify(currentEditingElement));
                    }
                } else if (elementType === 'edge') {
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
            if (neo4jEditor.instances && currentEditingElement && currentEditingElement.data.id) {
                // 准备样式对象
                const styleMap = {};
                if (currentEditingElement.data.style) {
                    // 转换样式格式为Cytoscape所需格式
                    Object.entries(currentEditingElement.data.style).forEach(([key, value]) => {
                        // 样式属性名转换 (驼峰命名转为短横线命名)
                        const styleKey = key.replace(/([A-Z])/g, '-$1').toLowerCase();
                        styleMap[styleKey] = value;
                    });
                }
                
                // 更新树视图
                if (neo4jEditor.instances.tree) {
                    const cyElement = neo4jEditor.instances.tree.getElementById(currentEditingElement.data.id);
                    if (cyElement) {
                        cyElement.style(styleMap);
                    }
                }
                
                // 更新网络图视图
                if (neo4jEditor.instances.network) {
                    const cyElement = neo4jEditor.instances.network.getElementById(currentEditingElement.data.id);
                    if (cyElement) {
                        cyElement.style(styleMap);
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
            // 如果有原始样式备份，恢复它
            if (originalStyleBackup && currentEditingElement && elementType) {
                // 恢复到原始状态
                if (elementType === 'node' && currentEditingElement.data.id) {
                    // 同步到共享数据
                    if (neo4jEditor.sharedGraphData) {
                        const nodeIndex = neo4jEditor.sharedGraphData.nodes.findIndex(
                            node => node.data.id === currentEditingElement.data.id
                        );
                        if (nodeIndex !== -1) {
                            neo4jEditor.sharedGraphData.nodes[nodeIndex].data.style = 
                                JSON.parse(JSON.stringify(originalStyleBackup));
                        }
                    }
                } else if (elementType === 'edge' && currentEditingElement.data.id) {
                    // 同步到共享数据
                    if (neo4jEditor.sharedGraphData) {
                        const edgeIndex = neo4jEditor.sharedGraphData.edges.findIndex(
                            edge => edge.data.id === currentEditingElement.data.id
                        );
                        if (edgeIndex !== -1) {
                            neo4jEditor.sharedGraphData.edges[edgeIndex].data.style = 
                                JSON.parse(JSON.stringify(originalStyleBackup));
                        }
                    }
                }
                
                // 同步到Cytoscape实例
                syncToCytoscapeInstances();
            }
            
            // 关闭面板
            closeStylePanel();
        } catch (error) {
            console.error('Error cancelling editing:', error);
            // 无论如何都关闭面板
            closeStylePanel();
        }
    }

    /**
     * 设置全局样式
     * @param {string} type - 元素类型 ('node' 或 'edge')
     * @param {Object} style - 全局样式对象
     */
    function setGlobalStyle(type, style) {
        try {
            if (!type || (type !== 'node' && type !== 'edge')) {
                console.error('Invalid type for setGlobalStyle');
                return;
            }
            
            // 更新默认样式
            Object.assign(defaultStyles[type], style);
            
            // 更新所有相同类型元素的样式
            if (neo4jEditor.sharedGraphData && neo4jEditor.sharedGraphData[type + 's']) {
                neo4jEditor.sharedGraphData[type + 's'].forEach(element => {
                    if (!element.data.style) {
                        element.data.style = {};
                    }
                    Object.assign(element.data.style, style);
                });
            }
            
            // 同步到Cytoscape实例
            if (neo4jEditor.instances) {
                // 准备样式对象
                const styleMap = {};
                Object.entries(style).forEach(([key, value]) => {
                    const styleKey = key.replace(/([A-Z])/g, '-$1').toLowerCase();
                    styleMap[styleKey] = value;
                });
                
                // 更新树视图
                if (neo4jEditor.instances.tree) {
                    const elements = neo4jEditor.instances.tree.elements(type + 's');
                    elements.forEach(element => {
                        const data = element.data();
                        if (!data.style) {
                            element.style(styleMap);
                        }
                    });
                }
                
                // 更新网络图视图
                if (neo4jEditor.instances.network) {
                    const elements = neo4jEditor.instances.network.elements(type + 's');
                    elements.forEach(element => {
                        const data = element.data();
                        if (!data.style) {
                            element.style(styleMap);
                        }
                    });
                }
            }
            
            // 触发全局样式更新事件
            if (neo4jEditor.eventManager && typeof neo4jEditor.eventManager.trigger === 'function') {
                neo4jEditor.eventManager.trigger('style:globalUpdated', {
                    type: type,
                    style: style
                });
            }
        } catch (error) {
            console.error('Error setting global style:', error);
        }
    }

    /**
     * 样式编辑面板模块
     */
    const stylePanelModule = {
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
                console.log('Style Panel Module: Initializing...');
                
                // 创建样式面板
                createStylePanel();
                
                // 设置事件监听
                setupEventListeners();
                
                // 标记为已初始化
                initialized = true;
                this.initialized = true;
                
                console.log('Style Panel Module: Initialized successfully');
                
                // 触发初始化完成事件
                if (neo4jEditor.eventManager && typeof neo4jEditor.eventManager.trigger === 'function') {
                    neo4jEditor.eventManager.trigger('stylePanel:initialized');
                }
                
                return true;
            } catch (error) {
                console.error('Style Panel Module: Initialization error:', error);
                return false;
            }
        },
        
        /**
         * 打开样式面板
         * @param {Object} element - 要编辑样式的元素
         * @param {string} type - 元素类型 ('node' 或 'edge')
         */
        openPanel: function(element, type) {
            openStylePanel(element, type);
        },
        
        /**
         * 关闭样式面板
         */
        closePanel: function() {
            closeStylePanel();
        },
        
        /**
         * 检查面板是否打开
         * @returns {boolean} 面板是否打开
         */
        isPanelOpen: function() {
            return isStylePanelOpen();
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
        },
        
        /**
         * 获取默认样式
         * @param {string} type - 元素类型 ('node' 或 'edge')
         * @returns {Object} 默认样式对象
         */
        getDefaultStyle: function(type) {
            return JSON.parse(JSON.stringify(defaultStyles[type] || {}));
        },
        
        /**
         * 设置全局样式
         * @param {string} type - 元素类型 ('node' 或 'edge')
         * @param {Object} style - 全局样式对象
         */
        setGlobalStyle: function(type, style) {
            setGlobalStyle(type, style);
        }
    };
    
    // 导出模块到命名空间
    neo4jEditor.stylePanel = stylePanelModule;
    
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
                console.warn(`警告: 直接调用 ${deprecatedName}() 已弃用，请使用 neo4jEditor.stylePanel.${newFunction.name || 'method'}()`);
            }
            return newFunction.apply(context || null, arguments);
        };
    }
    
    // 注册向后兼容函数
    const backwardCompatibilityMapping = [
        { deprecatedName: 'openStyleEditor', newFunction: stylePanelModule.openPanel, context: stylePanelModule },
        { deprecatedName: 'closeStyleEditor', newFunction: stylePanelModule.closePanel, context: stylePanelModule },
        { deprecatedName: 'isStyleEditorOpen', newFunction: stylePanelModule.isPanelOpen, context: stylePanelModule },
        { deprecatedName: 'setGlobalElementStyle', newFunction: stylePanelModule.setGlobalStyle, context: stylePanelModule }
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
    const moduleName = 'ui/stylePanel';
    const moduleRegistrationInfo = {
        name: moduleName,
        version: '1.0.0',
        dependencies: ['core/eventManager', 'core/dataModel'],
        module: stylePanelModule
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
                        initialized: stylePanelModule.initialized,
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
                window.appModule.stylePanel = stylePanelModule;
                console.log(`Neo4j Editor: ${moduleName} module registered via final fallback to appModule`);
            }
        }
    } else {
        // 降级方案：直接挂载到全局
        if (typeof window.appModule === 'undefined') {
            window.appModule = {};
        }
        window.appModule.stylePanel = stylePanelModule;
        console.log(`Neo4j Editor: ${moduleName} module registered via fallback to appModule`);
    }
    
    // 多模块系统支持 - 确保兼容性
    // CommonJS 模块支持
    if (typeof module !== 'undefined' && typeof module.exports !== 'undefined') {
        module.exports = stylePanelModule;
    }
    
    // ES 模块支持
    if (typeof exports !== 'undefined' && typeof exports === 'object') {
        Object.defineProperty(exports, '__esModule', { value: true });
        if (typeof module !== 'undefined') module.exports = stylePanelModule;
        exports.default = stylePanelModule;
    }
    
    // AMD 模块支持
    if (typeof define === 'function' && define.amd) {
        define(['core/eventManager', 'core/dataModel'], function() {
            return stylePanelModule;
        });
    }
    
    return stylePanelModule;
})(window.neo4jEditor || (window.neo4jEditor = {}));