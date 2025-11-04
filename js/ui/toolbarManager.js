/**
 * Neo4j Editor - 工具栏管理器模块
 * 负责处理图形编辑的工具栏功能和交互
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
    let toolbarContainer = null;
    let tools = {};
    
    // 工具栏配置
    let toolbarConfig = {
        enabled: true,
        visible: true,
        position: 'top',
        compactMode: false,
        orientation: 'horizontal'
    };
    
    // 默认工具栏按钮配置
    const defaultToolsConfig = {
        // 标准编辑工具
        select: {
            id: 'select-tool',
            label: '选择',
            icon: '✓',
            tooltip: '选择节点和关系 (V)',
            shortcut: 'V',
            category: 'edit',
            enabled: true,
            active: true
        },
        pan: {
            id: 'pan-tool',
            label: '平移',
            icon: '↕',
            tooltip: '平移视图 (P)',
            shortcut: 'P',
            category: 'view',
            enabled: true,
            active: false
        },
        zoom: {
            id: 'zoom-tool',
            label: '缩放',
            icon: '🔍',
            tooltip: '缩放视图 (Z)',
            shortcut: 'Z',
            category: 'view',
            enabled: true,
            active: false
        },
        // 节点工具
        addNode: {
            id: 'add-node-tool',
            label: '添加节点',
            icon: '◯',
            tooltip: '添加新节点 (N)',
            shortcut: 'N',
            category: 'nodes',
            enabled: true,
            active: false
        },
        editNode: {
            id: 'edit-node-tool',
            label: '编辑节点',
            icon: '📝',
            tooltip: '编辑选中节点 (E)',
            shortcut: 'E',
            category: 'nodes',
            enabled: false,
            active: false
        },
        deleteNode: {
            id: 'delete-node-tool',
            label: '删除节点',
            icon: '🗑️',
            tooltip: '删除选中节点 (Delete)',
            shortcut: 'Delete',
            category: 'nodes',
            enabled: false,
            active: false
        },
        // 关系工具
        addRelationship: {
            id: 'add-relationship-tool',
            label: '添加关系',
            icon: '→',
            tooltip: '添加新关系 (R)',
            shortcut: 'R',
            category: 'relationships',
            enabled: false,
            active: false
        },
        editRelationship: {
            id: 'edit-relationship-tool',
            label: '编辑关系',
            icon: '✏️',
            tooltip: '编辑选中关系 (Shift+E)',
            shortcut: 'Shift+E',
            category: 'relationships',
            enabled: false,
            active: false
        },
        deleteRelationship: {
            id: 'delete-relationship-tool',
            label: '删除关系',
            icon: '🗑️',
            tooltip: '删除选中关系 (Backspace)',
            shortcut: 'Backspace',
            category: 'relationships',
            enabled: false,
            active: false
        },
        // 撤销/重做
        undo: {
            id: 'undo-tool',
            label: '撤销',
            icon: '↶',
            tooltip: '撤销上一步操作 (Ctrl+Z)',
            shortcut: 'Ctrl+Z',
            category: 'history',
            enabled: false,
            active: false
        },
        redo: {
            id: 'redo-tool',
            label: '重做',
            icon: '↷',
            tooltip: '重做上一步操作 (Ctrl+Y)',
            shortcut: 'Ctrl+Y',
            category: 'history',
            enabled: false,
            active: false
        },
        // 视图工具
        zoomIn: {
            id: 'zoom-in-tool',
            label: '放大',
            icon: '🔍+',
            tooltip: '放大视图 (Ctrl++或+鼠标滚轮)',
            shortcut: 'Ctrl++',
            category: 'view',
            enabled: true,
            active: false
        },
        zoomOut: {
            id: 'zoom-out-tool',
            label: '缩小',
            icon: '🔍-',
            tooltip: '缩小视图 (Ctrl+-或-鼠标滚轮)',
            shortcut: 'Ctrl+-',
            category: 'view',
            enabled: true,
            active: false
        },
        fitToScreen: {
            id: 'fit-to-screen-tool',
            label: '适配屏幕',
            icon: '⤡',
            tooltip: '适配内容到屏幕 (Ctrl+0)',
            shortcut: 'Ctrl+0',
            category: 'view',
            enabled: true,
            active: false
        },
        viewMode: {
            id: 'view-mode-tool',
            label: '视图模式',
            icon: '🔄',
            tooltip: '切换视图模式 (树状/网络) (M)',
            shortcut: 'M',
            category: 'view',
            enabled: true,
            active: false
        },
        // 数据操作
        importData: {
            id: 'import-data-tool',
            label: '导入数据',
            icon: '📥',
            tooltip: '导入图形数据 (Ctrl+I)',
            shortcut: 'Ctrl+I',
            category: 'data',
            enabled: true,
            active: false
        },
        exportData: {
            id: 'export-data-tool',
            label: '导出数据',
            icon: '📤',
            tooltip: '导出图形数据 (Ctrl+S)',
            shortcut: 'Ctrl+S',
            category: 'data',
            enabled: true,
            active: false
        },
        clearGraph: {
            id: 'clear-graph-tool',
            label: '清空图表',
            icon: '🗑️',
            tooltip: '清空所有内容 (Ctrl+Shift+X)',
            shortcut: 'Ctrl+Shift+X',
            category: 'data',
            enabled: true,
            active: false
        },
        // 样式操作
        stylePanel: {
            id: 'style-panel-tool',
            label: '样式面板',
            icon: '🎨',
            tooltip: '打开样式面板 (Alt+S)',
            shortcut: 'Alt+S',
            category: 'style',
            enabled: true,
            active: false
        },
        // 布局操作
        applyLayout: {
            id: 'apply-layout-tool',
            label: '应用布局',
            icon: '🏗️',
            tooltip: '应用布局 (L)',
            shortcut: 'L',
            category: 'layout',
            enabled: true,
            active: false
        }
    };

    /**
     * 初始化工具栏管理器
     * @param {Object} config - 配置对象
     * @returns {boolean} 初始化是否成功
     */
    function initialize(config = {}) {
        try {
            console.log('Toolbar Manager Module: Initializing...');
            
            // 合并配置
            toolbarConfig = {
                ...toolbarConfig,
                ...config.toolbar || {},
                tools: {
                    ...defaultToolsConfig,
                    ...config.toolbar?.tools || {}
                }
            };
            
            // 初始化工具栏容器
            initializeToolbarContainer();
            
            // 初始化工具按钮
            initializeTools();
            
            // 设置事件监听
            setupEventListeners();
            
            // 设置键盘快捷键
            setupKeyboardShortcuts();
            
            // 标记为已初始化
            initialized = true;
            
            console.log('Toolbar Manager Module: Initialized successfully');
            
            // 触发初始化完成事件
            if (neo4jEditor.eventManager && typeof neo4jEditor.eventManager.trigger === 'function') {
                neo4jEditor.eventManager.trigger('toolbar:initialized', {
                    config: toolbarConfig
                });
            }
            
            return true;
        } catch (error) {
            console.error('Toolbar Manager Module: Initialization error:', error);
            return false;
        }
    }

    /**
     * 初始化工具栏容器
     */
    function initializeToolbarContainer() {
        try {
            // 查找或创建工具栏容器
            toolbarContainer = document.getElementById('neo4j-editor-toolbar');
            
            if (!toolbarContainer) {
                toolbarContainer = document.createElement('div');
                toolbarContainer.id = 'neo4j-editor-toolbar';
                toolbarContainer.className = 'neo4j-editor-toolbar ' + toolbarConfig.position;
                
                // 设置基本样式
                Object.assign(toolbarContainer.style, {
                    position: 'absolute',
                    backgroundColor: '#f5f5f5',
                    borderBottom: '1px solid #ddd',
                    padding: '8px 12px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    minHeight: '40px',
                    userSelect: 'none',
                    zIndex: '1000'
                });
                
                // 根据位置设置样式
                if (toolbarConfig.position === 'top') {
                    Object.assign(toolbarContainer.style, {
                        top: '0',
                        left: '0',
                        right: '0'
                    });
                } else if (toolbarConfig.position === 'bottom') {
                    Object.assign(toolbarContainer.style, {
                        bottom: '0',
                        left: '0',
                        right: '0',
                        borderBottom: 'none',
                        borderTop: '1px solid #ddd'
                    });
                } else if (toolbarConfig.position === 'left') {
                    Object.assign(toolbarContainer.style, {
                        top: '0',
                        left: '0',
                        bottom: '0',
                        flexDirection: 'column',
                        borderBottom: 'none',
                        borderRight: '1px solid #ddd',
                        width: '40px',
                        padding: '8px 4px'
                    });
                    toolbarConfig.orientation = 'vertical';
                } else if (toolbarConfig.position === 'right') {
                    Object.assign(toolbarContainer.style, {
                        top: '0',
                        right: '0',
                        bottom: '0',
                        flexDirection: 'column',
                        borderBottom: 'none',
                        borderLeft: '1px solid #ddd',
                        width: '40px',
                        padding: '8px 4px'
                    });
                    toolbarConfig.orientation = 'vertical';
                }
                
                // 添加到编辑器容器或body
                const editorContainer = document.getElementById('neo4j-editor');
                if (editorContainer) {
                    editorContainer.appendChild(toolbarContainer);
                } else {
                    document.body.appendChild(toolbarContainer);
                }
            }
            
            // 设置可见性
            if (!toolbarConfig.visible) {
                toolbarContainer.style.display = 'none';
            }
            
            // 启用紧凑模式
            if (toolbarConfig.compactMode) {
                toolbarContainer.classList.add('compact-mode');
            }
            
            // 添加类别容器
            const toolCategories = {};
            
            Object.keys(defaultToolsConfig).forEach(toolKey => {
                const tool = defaultToolsConfig[toolKey];
                const category = tool.category;
                
                if (!toolCategories[category]) {
                    const categoryContainer = document.createElement('div');
                    categoryContainer.className = `toolbar-category ${category}`;
                    categoryContainer.style.display = 'flex';
                    categoryContainer.style.alignItems = 'center';
                    categoryContainer.style.gap = '4px';
                    
                    if (toolbarConfig.orientation === 'vertical') {
                        categoryContainer.style.flexDirection = 'column';
                    }
                    
                    toolbarContainer.appendChild(categoryContainer);
                    toolCategories[category] = categoryContainer;
                    
                    // 添加分隔符
                    if (Object.keys(toolCategories).length > 1) {
                        const separator = document.createElement('div');
                        separator.className = 'toolbar-separator';
                        
                        if (toolbarConfig.orientation === 'horizontal') {
                            Object.assign(separator.style, {
                                width: '1px',
                                height: '24px',
                                backgroundColor: '#ddd',
                                margin: '0 4px'
                            });
                        } else {
                            Object.assign(separator.style, {
                                height: '1px',
                                width: '24px',
                                backgroundColor: '#ddd',
                                margin: '4px 0'
                            });
                        }
                        
                        categoryContainer.parentNode.insertBefore(separator, categoryContainer);
                    }
                }
            });
        } catch (error) {
            console.error('Error initializing toolbar container:', error);
        }
    }

    /**
     * 初始化工具按钮
     */
    function initializeTools() {
        try {
            // 重置工具
            tools = {};
            
            // 创建工具按钮
            Object.keys(defaultToolsConfig).forEach(toolKey => {
                const toolConfig = defaultToolsConfig[toolKey];
                
                // 跳过已禁用的工具
                if (toolbarConfig.tools[toolKey] && toolbarConfig.tools[toolKey].enabled === false) {
                    return;
                }
                
                createToolButton(toolKey, toolConfig);
            });
        } catch (error) {
            console.error('Error initializing tools:', error);
        }
    }

    /**
     * 创建工具按钮
     * @param {string} toolKey - 工具键名
     * @param {Object} toolConfig - 工具配置
     * @returns {HTMLElement} 创建的按钮元素
     */
    function createToolButton(toolKey, toolConfig) {
        try {
            const categoryContainer = toolbarContainer.querySelector(`.toolbar-category.${toolConfig.category}`);
            
            if (!categoryContainer) {
                console.warn(`Category container not found for ${toolConfig.category}`);
                return null;
            }
            
            // 创建按钮
            const button = document.createElement('button');
            button.id = toolConfig.id;
            button.className = `toolbar-button ${toolKey} ${toolConfig.active ? 'active' : ''} ${!toolConfig.enabled ? 'disabled' : ''}`;
            button.title = `${toolConfig.tooltip}${toolConfig.shortcut ? ' (' + toolConfig.shortcut + ')' : ''}`;
            
            // 设置按钮内容
            button.innerHTML = `<span class="tool-icon">${toolConfig.icon}</span>${!toolbarConfig.compactMode ? `<span class="tool-label">${toolConfig.label}</span>` : ''}`;
            
            // 设置按钮样式
            Object.assign(button.style, {
                padding: toolbarConfig.compactMode ? '8px' : '6px 10px',
                backgroundColor: toolConfig.active ? '#e0e0e0' : '#ffffff',
                border: '1px solid #ddd',
                borderRadius: '4px',
                cursor: toolConfig.enabled ? 'pointer' : 'not-allowed',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                fontSize: '14px',
                transition: 'all 0.2s ease'
            });
            
            if (toolbarConfig.orientation === 'vertical' && !toolbarConfig.compactMode) {
                button.style.flexDirection = 'column';
                button.style.padding = '6px 4px';
            }
            
            // 添加点击事件
            button.addEventListener('click', function() {
                handleToolClick(toolKey, toolConfig);
            });
            
            // 添加悬停效果
            button.addEventListener('mouseover', function() {
                if (toolConfig.enabled && !toolConfig.active) {
                    button.style.backgroundColor = '#f0f0f0';
                }
            });
            
            button.addEventListener('mouseout', function() {
                if (toolConfig.enabled && !toolConfig.active) {
                    button.style.backgroundColor = '#ffffff';
                }
            });
            
            // 添加到类别容器
            categoryContainer.appendChild(button);
            
            // 保存工具引用
            tools[toolKey] = {
                config: toolConfig,
                element: button
            };
            
            return button;
        } catch (error) {
            console.error(`Error creating tool button for ${toolKey}:`, error);
            return null;
        }
    }

    /**
     * 处理工具点击
     * @param {string} toolKey - 工具键名
     * @param {Object} toolConfig - 工具配置
     */
    function handleToolClick(toolKey, toolConfig) {
        try {
            if (!toolConfig.enabled) {
                return;
            }
            
            // 触发工具点击事件
            if (neo4jEditor.eventManager && typeof neo4jEditor.eventManager.trigger === 'function') {
                neo4jEditor.eventManager.trigger('toolbar:tool:clicked', {
                    toolKey: toolKey,
                    toolConfig: toolConfig
                });
            }
            
            // 处理特定工具的点击行为
            switch (toolKey) {
                case 'select':
                case 'pan':
                case 'zoom':
                case 'addNode':
                case 'addRelationship':
                    // 互斥工具组 - 激活一个，停用其他
                    deactivateToolGroup(['select', 'pan', 'zoom', 'addNode', 'addRelationship']);
                    activateTool(toolKey);
                    setActiveTool(toolKey);
                    break;
                
                case 'editNode':
                    if (neo4jEditor.eventManager && typeof neo4jEditor.eventManager.trigger === 'function') {
                        neo4jEditor.eventManager.trigger('node:editSelected');
                    }
                    break;
                
                case 'deleteNode':
                case 'deleteRelationship':
                    if (neo4jEditor.eventManager && typeof neo4jEditor.eventManager.trigger === 'function') {
                        neo4jEditor.eventManager.trigger('selection:deleteSelected');
                    }
                    break;
                
                case 'editRelationship':
                    if (neo4jEditor.eventManager && typeof neo4jEditor.eventManager.trigger === 'function') {
                        neo4jEditor.eventManager.trigger('edge:editSelected');
                    }
                    break;
                
                case 'undo':
                    if (neo4jEditor.undoManager && typeof neo4jEditor.undoManager.undo === 'function') {
                        neo4jEditor.undoManager.undo();
                    }
                    break;
                
                case 'redo':
                    if (neo4jEditor.undoManager && typeof neo4jEditor.undoManager.redo === 'function') {
                        neo4jEditor.undoManager.redo();
                    }
                    break;
                
                case 'zoomIn':
                    if (neo4jEditor.eventManager && typeof neo4jEditor.eventManager.trigger === 'function') {
                        neo4jEditor.eventManager.trigger('view:zoomIn');
                    }
                    break;
                
                case 'zoomOut':
                    if (neo4jEditor.eventManager && typeof neo4jEditor.eventManager.trigger === 'function') {
                        neo4jEditor.eventManager.trigger('view:zoomOut');
                    }
                    break;
                
                case 'fitToScreen':
                    if (neo4jEditor.eventManager && typeof neo4jEditor.eventManager.trigger === 'function') {
                        neo4jEditor.eventManager.trigger('view:fitToScreen');
                    }
                    break;
                
                case 'viewMode':
                    if (neo4jEditor.eventManager && typeof neo4jEditor.eventManager.trigger === 'function') {
                        neo4jEditor.eventManager.trigger('view:switchMode');
                    }
                    break;
                
                case 'importData':
                    if (neo4jEditor.eventManager && typeof neo4jEditor.eventManager.trigger === 'function') {
                        neo4jEditor.eventManager.trigger('data:importRequest');
                    }
                    break;
                
                case 'exportData':
                    if (neo4jEditor.eventManager && typeof neo4jEditor.eventManager.trigger === 'function') {
                        neo4jEditor.eventManager.trigger('data:exportRequest');
                    }
                    break;
                
                case 'clearGraph':
                    if (confirm('确定要清空所有内容吗？此操作不可撤销。')) {
                        if (neo4jEditor.eventManager && typeof neo4jEditor.eventManager.trigger === 'function') {
                            neo4jEditor.eventManager.trigger('data:clearRequest');
                        }
                    }
                    break;
                
                case 'stylePanel':
                    if (neo4jEditor.eventManager && typeof neo4jEditor.eventManager.trigger === 'function') {
                        neo4jEditor.eventManager.trigger('stylePanel:toggle');
                    }
                    break;
                
                case 'applyLayout':
                    if (neo4jEditor.eventManager && typeof neo4jEditor.eventManager.trigger === 'function') {
                        neo4jEditor.eventManager.trigger('layout:applyRequest');
                    }
                    break;
            }
        } catch (error) {
            console.error(`Error handling tool click for ${toolKey}:`, error);
        }
    }

    /**
     * 设置活动工具
     * @param {string} toolKey - 工具键名
     */
    function setActiveTool(toolKey) {
        console.time('CRITICAL_TOOLBAR_SET: Execution time');
        try {
            console.log('CRITICAL_TOOLBAR_SET: setActiveTool CALLED with toolKey:', toolKey);
            if (!toolKey) {
                console.warn('CRITICAL_TOOLBAR_SET: No toolKey provided');
                return;
            }
            
            // 记录工具配置信息
            console.log('CRITICAL_TOOLBAR_SET: Tool exists in tools object:', !!tools[toolKey]);
            if (tools[toolKey]) {
                console.log('CRITICAL_TOOLBAR_SET: Tool config active state:', tools[toolKey].config?.active);
                console.log('CRITICAL_TOOLBAR_SET: Tool config enabled state:', tools[toolKey].config?.enabled);
            }
            
            // 直接更新window.currentMode - 最高优先级
            console.log('CRITICAL_TOOLBAR_SET: DIRECTLY updating window.currentMode');
            try {
                if (toolKey === 'addNode') {
                    window.currentMode = 'node';
                    console.log('CRITICAL_TOOLBAR_SET: window.currentMode SET to "node"');
                } else if (toolKey === 'select') {
                    window.currentMode = 'select';
                    console.log('CRITICAL_TOOLBAR_SET: window.currentMode SET to "select"');
                } else if (toolKey === 'addRelationship') {
                    window.currentMode = 'relationship';
                    console.log('CRITICAL_TOOLBAR_SET: window.currentMode SET to "relationship"');
                } else {
                    console.log('CRITICAL_TOOLBAR_SET: Unmapped toolKey:', toolKey);
                }
                
                // 直接检查设置是否成功
                console.log('CRITICAL_TOOLBAR_SET: Current window.currentMode after setting:', window.currentMode);
            } catch (err) {
                console.error('CRITICAL_TOOLBAR_SET: FAILED to update window.currentMode:', err);
            }
            
            // 1. 使用neo4jEditor.eventManager触发事件
            console.log('CRITICAL_TOOLBAR_SET: Attempting eventManager trigger');
            try {
                if (neo4jEditor && neo4jEditor.eventManager && typeof neo4jEditor.eventManager.trigger === 'function') {
                    console.log('CRITICAL_TOOLBAR_SET: Triggering eventManager event');
                    neo4jEditor.eventManager.trigger('toolbar:activeToolChanged', {
                        toolKey: toolKey,
                        toolConfig: tools[toolKey]?.config
                    });
                    console.log('CRITICAL_TOOLBAR_SET: eventManager trigger SUCCESS');
                } else {
                    console.warn('CRITICAL_TOOLBAR_SET: eventManager not available');
                    console.log('CRITICAL_TOOLBAR_SET: neo4jEditor exists:', !!neo4jEditor);
                    console.log('CRITICAL_TOOLBAR_SET: eventManager exists:', !!neo4jEditor?.eventManager);
                    console.log('CRITICAL_TOOLBAR_SET: trigger function exists:', typeof neo4jEditor?.eventManager?.trigger === 'function');
                }
            } catch (err) {
                console.error('CRITICAL_TOOLBAR_SET: FAILED to trigger via eventManager:', err);
            }
            
            // 2. 使用eventBus触发事件
            console.log('CRITICAL_TOOLBAR_SET: Attempting eventBus emit');
            try {
                if (neo4jEditor && neo4jEditor.eventBus && typeof neo4jEditor.eventBus.emit === 'function') {
                    console.log('CRITICAL_TOOLBAR_SET: Emitting eventBus event');
                    neo4jEditor.eventBus.emit('toolbar:activeToolChanged', {
                        toolKey: toolKey,
                        toolConfig: tools[toolKey]?.config
                    });
                    console.log('CRITICAL_TOOLBAR_SET: eventBus emit SUCCESS');
                } else {
                    console.warn('CRITICAL_TOOLBAR_SET: eventBus not available');
                    console.log('CRITICAL_TOOLBAR_SET: neo4jEditor exists:', !!neo4jEditor);
                    console.log('CRITICAL_TOOLBAR_SET: eventBus exists:', !!neo4jEditor?.eventBus);
                    console.log('CRITICAL_TOOLBAR_SET: emit function exists:', typeof neo4jEditor?.eventBus?.emit === 'function');
                }
            } catch (err) {
                console.error('CRITICAL_TOOLBAR_SET: FAILED to emit via eventBus:', err);
            }
            
            // 3. 添加DOM事件作为备用
            console.log('CRITICAL_TOOLBAR_SET: Attempting DOM event dispatch');
            try {
                const event = new CustomEvent('toolbar:activeToolChanged', {
                    detail: {
                        toolKey: toolKey,
                        toolConfig: tools[toolKey]?.config
                    },
                    bubbles: true,
                    cancelable: true
                });
                const result = document.dispatchEvent(event);
                console.log('CRITICAL_TOOLBAR_SET: DOM event dispatched SUCCESS, result:', result);
            } catch (err) {
                console.error('CRITICAL_TOOLBAR_SET: FAILED to dispatch DOM event:', err);
            }
            
            // 4. 直接调用graphManager的reinstallAllTapListeners方法
            console.log('CRITICAL_TOOLBAR_SET: Attempting direct call to graphManager');
            try {
                if (neo4jEditor && neo4jEditor.graphManager && typeof neo4jEditor.graphManager.reinstallAllTapListeners === 'function') {
                    console.log('CRITICAL_TOOLBAR_SET: Calling reinstallAllTapListeners');
                    neo4jEditor.graphManager.reinstallAllTapListeners();
                    console.log('CRITICAL_TOOLBAR_SET: reinstallAllTapListeners call SUCCESS');
                } else {
                    console.warn('CRITICAL_TOOLBAR_SET: graphManager not available');
                    console.log('CRITICAL_TOOLBAR_SET: neo4jEditor exists:', !!neo4jEditor);
                    console.log('CRITICAL_TOOLBAR_SET: graphManager exists:', !!neo4jEditor?.graphManager);
                    console.log('CRITICAL_TOOLBAR_SET: reinstallAllTapListeners function exists:', typeof neo4jEditor?.graphManager?.reinstallAllTapListeners === 'function');
                }
            } catch (err) {
                console.error('CRITICAL_TOOLBAR_SET: FAILED to call reinstallAllTapListeners:', err);
            }
            
            // 5. 延迟调用作为备用机制
            console.log('CRITICAL_TOOLBAR_SET: Setting up delayed backup call');
            setTimeout(() => {
                try {
                    console.log('CRITICAL_TOOLBAR_SET: DELAYED CALL - Attempting graphManager call again');
                    if (neo4jEditor && neo4jEditor.graphManager && typeof neo4jEditor.graphManager.reinstallAllTapListeners === 'function') {
                        neo4jEditor.graphManager.reinstallAllTapListeners();
                        console.log('CRITICAL_TOOLBAR_SET: DELAYED CALL - reinstallAllTapListeners SUCCESS');
                    }
                } catch (err) {
                    console.error('CRITICAL_TOOLBAR_SET: DELAYED CALL - Failed:', err);
                }
            }, 100);
            
            // 6. 更新document状态作为调试标志
            try {
                document.documentElement.setAttribute('data-toolbar-mode', toolKey);
                console.log('CRITICAL_TOOLBAR_SET: Updated document root attribute data-toolbar-mode to:', toolKey);
            } catch (err) {
                console.error('CRITICAL_TOOLBAR_SET: Failed to update document state:', err);
            }
            
            // 7. 记录全局状态到window对象
            try {
                if (!window.toolbarActivityLog) {
                    window.toolbarActivityLog = [];
                }
                window.toolbarActivityLog.push({
                    timestamp: Date.now(),
                    toolKey: toolKey,
                    mode: window.currentMode
                });
                console.log('CRITICAL_TOOLBAR_SET: Added to window.toolbarActivityLog, count:', window.toolbarActivityLog.length);
            } catch (err) {
                console.error('CRITICAL_TOOLBAR_SET: Failed to log to window.toolbarActivityLog:', err);
            }
            
        } catch (error) {
            console.error('CRITICAL_TOOLBAR_SET: MAJOR ERROR in setActiveTool:', error);
        } finally {
            console.timeEnd('CRITICAL_TOOLBAR_SET: Execution time');
            console.log('CRITICAL_TOOLBAR_SET: setActiveTool COMPLETED');
        }
    }

    /**
     * 激活工具
     * @param {string} toolKey - 工具键名
     */
    function activateTool(toolKey) {
        console.log('CRITICAL_TOOLBAR_ACTIVATE: activateTool CALLED with toolKey:', toolKey);
        try {
            console.log('CRITICAL_TOOLBAR_ACTIVATE: Checking if tool exists in tools object');
            const tool = tools[toolKey];
            if (!tool) {
                console.warn('CRITICAL_TOOLBAR_ACTIVATE: Tool not found for key:', toolKey);
                console.log('CRITICAL_TOOLBAR_ACTIVATE: Available tools keys:', Object.keys(tools));
                return;
            }
            
            console.log('CRITICAL_TOOLBAR_ACTIVATE: Found tool, updating state');
            // 更新工具状态
            tool.config.active = true;
            console.log('CRITICAL_TOOLBAR_ACTIVATE: Tool config.active set to true');
            
            // 更新UI状态
            if (tool.element && tool.element.classList) {
                tool.element.classList.add('active');
                console.log('CRITICAL_TOOLBAR_ACTIVATE: Added "active" class to element');
            } else {
                console.warn('CRITICAL_TOOLBAR_ACTIVATE: Tool element or classList not available');
            }
            
            if (tool.element) {
                tool.element.style.backgroundColor = '#e0e0e0';
                console.log('CRITICAL_TOOLBAR_ACTIVATE: Updated element background color');
            }
            
            // 强制重新渲染
            try {
                if (tool.element) {
                    tool.element.style.display = 'none';
                    tool.element.offsetHeight; // 触发重排
                    tool.element.style.display = '';
                    console.log('CRITICAL_TOOLBAR_ACTIVATE: Forced element reflow');
                }
            } catch (err) {
                console.error('CRITICAL_TOOLBAR_ACTIVATE: Failed to force reflow:', err);
            }
            
            console.log('CRITICAL_TOOLBAR_ACTIVATE: Tool activation completed');
        } catch (error) {
            console.error('CRITICAL_TOOLBAR_ACTIVATE: ERROR in activateTool:', error);
        }
    }

    /**
     * 停用工具
     * @param {string} toolKey - 工具键名
     */
    function deactivateTool(toolKey) {
        try {
            const tool = tools[toolKey];
            if (!tool) {
                return;
            }
            
            // 更新工具状态
            tool.config.active = false;
            tool.element.classList.remove('active');
            
            if (tool.config.enabled) {
                tool.element.style.backgroundColor = '#ffffff';
            }
        } catch (error) {
            console.error(`Error deactivating tool ${toolKey}:`, error);
        }
    }

    /**
     * 停用工具组
     * @param {Array} toolKeys - 工具键名数组
     */
    function deactivateToolGroup(toolKeys) {
        try {
            toolKeys.forEach(toolKey => {
                deactivateTool(toolKey);
            });
        } catch (error) {
            console.error('Error deactivating tool group:', error);
        }
    }

    /**
     * 启用工具
     * @param {string} toolKey - 工具键名
     */
    function enableTool(toolKey) {
        try {
            const tool = tools[toolKey];
            if (!tool) {
                return;
            }
            
            // 更新工具状态
            tool.config.enabled = true;
            tool.element.classList.remove('disabled');
            tool.element.style.cursor = 'pointer';
        } catch (error) {
            console.error(`Error enabling tool ${toolKey}:`, error);
        }
    }

    /**
     * 禁用工具
     * @param {string} toolKey - 工具键名
     */
    function disableTool(toolKey) {
        try {
            const tool = tools[toolKey];
            if (!tool) {
                return;
            }
            
            // 更新工具状态
            tool.config.enabled = false;
            tool.element.classList.add('disabled');
            tool.element.style.cursor = 'not-allowed';
            
            // 确保禁用的工具不处于活动状态
            if (tool.config.active) {
                deactivateTool(toolKey);
            }
        } catch (error) {
            console.error(`Error disabling tool ${toolKey}:`, error);
        }
    }

    /**
     * 设置事件监听
     */
    function setupEventListeners() {
        try {
            if (!neo4jEditor.eventManager || typeof neo4jEditor.eventManager.on !== 'function') {
                console.warn('Toolbar Manager: Event manager not available for event listeners');
                return;
            }
            
            // 添加对toolbar:activeToolChanged事件的自监听，用于调试
            neo4jEditor.eventManager.on('toolbar:activeToolChanged', function(event) {
                console.log('Toolbar Manager: Received own toolbar:activeToolChanged event:', event.data.toolKey);
            });
            
            // 监听选择事件，更新工具状态
            neo4jEditor.eventManager.on('selection:changed', function(event) {
                updateToolsStateBasedOnSelection(event.data);
            });
            
            // 监听撤销/重做栈变化事件
            neo4jEditor.eventManager.on('undoStack:changed', function(event) {
                updateUndoRedoToolsState(event.data);
            });
            
            // 监听视图模式变化
            neo4jEditor.eventManager.on('view:modeChanged', function(event) {
                updateViewToolsState(event.data);
            });
            
            // 监听数据变化
            neo4jEditor.eventManager.on('data:changed', function() {
                updateDataToolsState();
            });
        } catch (error) {
            console.error('Error setting up toolbar event listeners:', error);
        }
    }

    /**
     * 根据选择更新工具状态
     * @param {Object} selectionData - 选择数据
     */
    function updateToolsStateBasedOnSelection(selectionData) {
        try {
            const hasNodes = selectionData && selectionData.nodes && selectionData.nodes.length > 0;
            const hasEdges = selectionData && selectionData.edges && selectionData.edges.length > 0;
            
            // 更新节点工具
            if (hasNodes) {
                enableTool('editNode');
                enableTool('deleteNode');
            } else {
                disableTool('editNode');
                disableTool('deleteNode');
            }
            
            // 更新关系工具
            if (hasEdges) {
                enableTool('editRelationship');
                enableTool('deleteRelationship');
            } else {
                disableTool('editRelationship');
                disableTool('deleteRelationship');
            }
            
            // 如果有任何选择，启用删除工具
            if (hasNodes || hasEdges) {
                enableTool('deleteNode');
                enableTool('deleteRelationship');
            } else {
                disableTool('deleteNode');
                disableTool('deleteRelationship');
            }
        } catch (error) {
            console.error('Error updating tools state based on selection:', error);
        }
    }

    /**
     * 更新撤销/重做工具状态
     * @param {Object} stackData - 栈数据
     */
    function updateUndoRedoToolsState(stackData) {
        try {
            // 更新撤销按钮
            if (stackData && stackData.undoStackSize && stackData.undoStackSize > 0) {
                enableTool('undo');
            } else {
                disableTool('undo');
            }
            
            // 更新重做按钮
            if (stackData && stackData.redoStackSize && stackData.redoStackSize > 0) {
                enableTool('redo');
            } else {
                disableTool('redo');
            }
        } catch (error) {
            console.error('Error updating undo/redo tools state:', error);
        }
    }

    /**
     * 更新视图工具状态
     * @param {Object} viewData - 视图数据
     */
    function updateViewToolsState(viewData) {
        try {
            // 根据视图模式更新工具状态
            if (viewData && viewData.mode) {
                // 可以根据不同视图模式调整工具状态
                const viewModeButton = tools['viewMode']?.element;
                if (viewModeButton) {
                    viewModeButton.title = viewData.mode === 'tree' 
                        ? '切换到网络视图 (M)' 
                        : '切换到树状视图 (M)';
                }
            }
        } catch (error) {
            console.error('Error updating view tools state:', error);
        }
    }

    /**
     * 更新数据工具状态
     */
    function updateDataToolsState() {
        try {
            // 检查是否有数据
            let hasData = false;
            
            if (neo4jEditor.sharedGraphData && 
                ((neo4jEditor.sharedGraphData.nodes && neo4jEditor.sharedGraphData.nodes.length > 0) ||
                 (neo4jEditor.sharedGraphData.edges && neo4jEditor.sharedGraphData.edges.length > 0))) {
                hasData = true;
            }
            
            // 更新导出和清空工具
            if (hasData) {
                enableTool('exportData');
                enableTool('clearGraph');
            } else {
                // 导出始终启用，但清空只有在有数据时启用
                enableTool('exportData');
                disableTool('clearGraph');
            }
        } catch (error) {
            console.error('Error updating data tools state:', error);
        }
    }

    /**
     * 设置键盘快捷键
     */
    function setupKeyboardShortcuts() {
        try {
            // 添加全局键盘事件监听
            document.addEventListener('keydown', handleKeyboardShortcut);
        } catch (error) {
            console.error('Error setting up keyboard shortcuts:', error);
        }
    }

    /**
     * 处理键盘快捷键
     * @param {KeyboardEvent} event - 键盘事件
     */
    function handleKeyboardShortcut(event) {
        try {
            // 获取当前活动元素，避免在输入框中触发快捷键
            const activeElement = document.activeElement;
            if (activeElement && (activeElement.tagName === 'INPUT' || activeElement.tagName === 'TEXTAREA' || activeElement.isContentEditable)) {
                return;
            }
            
            // 构建快捷键组合
            let shortcut = '';
            if (event.ctrlKey || event.metaKey) shortcut += 'Ctrl+';
            if (event.altKey) shortcut += 'Alt+';
            if (event.shiftKey) shortcut += 'Shift+';
            
            // 处理特殊键
            const key = event.key.toLowerCase();
            if (key === ' ') shortcut += 'Space';
            else if (key === 'enter') shortcut += 'Enter';
            else if (key === 'escape') shortcut += 'Esc';
            else if (key === 'delete' || key === 'del') shortcut += 'Delete';
            else if (key === 'backspace') shortcut += 'Backspace';
            else if (key.length === 1) shortcut += key.toUpperCase();
            else shortcut += key;
            
            // 查找并触发对应的工具
            for (const [toolKey, tool] of Object.entries(tools)) {
                if (tool.config.shortcut && tool.config.shortcut.toLowerCase() === shortcut.toLowerCase()) {
                    if (tool.config.enabled) {
                        event.preventDefault();
                        handleToolClick(toolKey, tool.config);
                        break;
                    }
                }
            }
        } catch (error) {
            console.error('Error handling keyboard shortcut:', error);
        }
    }

    /**
     * 显示工具栏
     */
    function showToolbar() {
        try {
            if (toolbarContainer) {
                toolbarContainer.style.display = 'flex';
                toolbarConfig.visible = true;
                
                // 触发事件
                if (neo4jEditor.eventManager && typeof neo4jEditor.eventManager.trigger === 'function') {
                    neo4jEditor.eventManager.trigger('toolbar:visibleChanged', {
                        visible: true
                    });
                }
            }
        } catch (error) {
            console.error('Error showing toolbar:', error);
        }
    }

    /**
     * 隐藏工具栏
     */
    function hideToolbar() {
        try {
            if (toolbarContainer) {
                toolbarContainer.style.display = 'none';
                toolbarConfig.visible = false;
                
                // 触发事件
                if (neo4jEditor.eventManager && typeof neo4jEditor.eventManager.trigger === 'function') {
                    neo4jEditor.eventManager.trigger('toolbar:visibleChanged', {
                        visible: false
                    });
                }
            }
        } catch (error) {
            console.error('Error hiding toolbar:', error);
        }
    }

    /**
     * 切换工具栏可见性
     */
    function toggleToolbar() {
        try {
            if (toolbarConfig.visible) {
                hideToolbar();
            } else {
                showToolbar();
            }
        } catch (error) {
            console.error('Error toggling toolbar visibility:', error);
        }
    }

    /**
     * 添加自定义工具
     * @param {string} toolKey - 工具键名
     * @param {Object} toolConfig - 工具配置
     * @returns {boolean} 是否添加成功
     */
    function addTool(toolKey, toolConfig) {
        try {
            if (!toolKey || typeof toolKey !== 'string') {
                console.error('Invalid tool key');
                return false;
            }
            
            if (!toolConfig || typeof toolConfig !== 'object') {
                console.error('Invalid tool configuration');
                return false;
            }
            
            // 确保必要的配置
            const requiredConfig = {
                id: toolConfig.id || `custom-tool-${toolKey}`,
                label: toolConfig.label || toolKey,
                icon: toolConfig.icon || '⚙️',
                tooltip: toolConfig.tooltip || `自定义工具: ${toolKey}`,
                category: toolConfig.category || 'custom',
                enabled: toolConfig.enabled !== false,
                active: toolConfig.active === true
            };
            
            // 合并配置
            const mergedConfig = {
                ...requiredConfig,
                ...toolConfig
            };
            
            // 添加到默认配置
            defaultToolsConfig[toolKey] = mergedConfig;
            
            // 创建按钮
            const button = createToolButton(toolKey, mergedConfig);
            
            // 触发事件
            if (neo4jEditor.eventManager && typeof neo4jEditor.eventManager.trigger === 'function') {
                neo4jEditor.eventManager.trigger('toolbar:tool:added', {
                    toolKey: toolKey,
                    toolConfig: mergedConfig
                });
            }
            
            return true;
        } catch (error) {
            console.error(`Error adding custom tool ${toolKey}:`, error);
            return false;
        }
    }

    /**
     * 移除工具
     * @param {string} toolKey - 工具键名
     * @returns {boolean} 是否移除成功
     */
    function removeTool(toolKey) {
        try {
            const tool = tools[toolKey];
            if (!tool) {
                return false;
            }
            
            // 移除DOM元素
            if (tool.element && tool.element.parentNode) {
                tool.element.parentNode.removeChild(tool.element);
            }
            
            // 从工具映射中移除
            delete tools[toolKey];
            delete defaultToolsConfig[toolKey];
            
            // 触发事件
            if (neo4jEditor.eventManager && typeof neo4jEditor.eventManager.trigger === 'function') {
                neo4jEditor.eventManager.trigger('toolbar:tool:removed', {
                    toolKey: toolKey
                });
            }
            
            return true;
        } catch (error) {
            console.error(`Error removing tool ${toolKey}:`, error);
            return false;
        }
    }

    /**
     * 更新工具配置
     * @param {string} toolKey - 工具键名
     * @param {Object} newConfig - 新的配置
     * @returns {boolean} 是否更新成功
     */
    function updateTool(toolKey, newConfig) {
        try {
            const tool = tools[toolKey];
            if (!tool) {
                return false;
            }
            
            // 合并配置
            Object.assign(tool.config, newConfig);
            
            // 更新按钮
            if (tool.element) {
                // 更新标签
                const labelElement = tool.element.querySelector('.tool-label');
                if (labelElement && newConfig.label) {
                    labelElement.textContent = newConfig.label;
                }
                
                // 更新图标
                const iconElement = tool.element.querySelector('.tool-icon');
                if (iconElement && newConfig.icon) {
                    iconElement.textContent = newConfig.icon;
                }
                
                // 更新提示
                if (newConfig.tooltip || newConfig.shortcut) {
                    tool.element.title = `${newConfig.tooltip || tool.config.tooltip}${newConfig.shortcut ? ' (' + newConfig.shortcut + ')' : ''}`;
                }
                
                // 更新启用状态
                if (newConfig.enabled !== undefined) {
                    if (newConfig.enabled) {
                        enableTool(toolKey);
                    } else {
                        disableTool(toolKey);
                    }
                }
                
                // 更新活动状态
                if (newConfig.active !== undefined) {
                    if (newConfig.active) {
                        activateTool(toolKey);
                    } else {
                        deactivateTool(toolKey);
                    }
                }
            }
            
            // 触发事件
            if (neo4jEditor.eventManager && typeof neo4jEditor.eventManager.trigger === 'function') {
                neo4jEditor.eventManager.trigger('toolbar:tool:updated', {
                    toolKey: toolKey,
                    toolConfig: tool.config
                });
            }
            
            return true;
        } catch (error) {
            console.error(`Error updating tool ${toolKey}:`, error);
            return false;
        }
    }

    /**
     * 获取工具配置
     * @param {string} toolKey - 工具键名
     * @returns {Object|null} 工具配置
     */
    function getTool(toolKey) {
        return tools[toolKey]?.config || null;
    }

    /**
     * 获取所有工具
     * @returns {Object} 所有工具配置
     */
    function getAllTools() {
        const allTools = {};
        Object.keys(tools).forEach(toolKey => {
            allTools[toolKey] = { ...tools[toolKey].config };
        });
        return allTools;
    }

    /**
     * 清理资源
     */
    function cleanup() {
        try {
            // 移除事件监听
            document.removeEventListener('keydown', handleKeyboardShortcut);
            
            // 重置工具
            tools = {};
            
            // 重置状态
            initialized = false;
            
            // 移除工具栏容器
            if (toolbarContainer && toolbarContainer.parentNode) {
                toolbarContainer.parentNode.removeChild(toolbarContainer);
                toolbarContainer = null;
            }
            
            console.log('Toolbar Manager Module: Resources cleaned up');
        } catch (error) {
            console.error('Error cleaning up toolbar manager resources:', error);
        }
    }

    /**
     * 工具栏管理器模块
     */
    const toolbarManagerModule = {
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
         * 显示工具栏
         */
        show: function() {
            showToolbar();
        },
        
        /**
         * 隐藏工具栏
         */
        hide: function() {
            hideToolbar();
        },
        
        /**
         * 切换工具栏可见性
         */
        toggle: function() {
            toggleToolbar();
        },
        
        /**
         * 添加自定义工具
         * @param {string} toolKey - 工具键名
         * @param {Object} toolConfig - 工具配置
         * @returns {boolean} 是否添加成功
         */
        addTool: function(toolKey, toolConfig) {
            return addTool(toolKey, toolConfig);
        },
        
        /**
         * 移除工具
         * @param {string} toolKey - 工具键名
         * @returns {boolean} 是否移除成功
         */
        removeTool: function(toolKey) {
            return removeTool(toolKey);
        },
        
        /**
         * 更新工具配置
         * @param {string} toolKey - 工具键名
         * @param {Object} newConfig - 新的配置
         * @returns {boolean} 是否更新成功
         */
        updateTool: function(toolKey, newConfig) {
            return updateTool(toolKey, newConfig);
        },
        
        /**
         * 获取工具配置
         * @param {string} toolKey - 工具键名
         * @returns {Object|null} 工具配置
         */
        getTool: function(toolKey) {
            return getTool(toolKey);
        },
        
        /**
         * 获取所有工具
         * @returns {Object} 所有工具配置
         */
        getAllTools: function() {
            return getAllTools();
        },
        
        /**
         * 激活工具
         * @param {string} toolKey - 工具键名
         */
        activateTool: function(toolKey) {
            activateTool(toolKey);
        },
        
        /**
         * 停用工具
         * @param {string} toolKey - 工具键名
         */
        deactivateTool: function(toolKey) {
            deactivateTool(toolKey);
        },
        
        /**
         * 启用工具
         * @param {string} toolKey - 工具键名
         */
        enableTool: function(toolKey) {
            enableTool(toolKey);
        },
        
        /**
         * 禁用工具
         * @param {string} toolKey - 工具键名
         */
        disableTool: function(toolKey) {
            disableTool(toolKey);
        },
        
        /**
         * 清理资源
         */
        cleanup: function() {
            cleanup();
        }
    };
    
    // 导出模块到命名空间
    neo4jEditor.toolbarManager = toolbarManagerModule;
    
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
                console.warn(`警告: 直接调用 ${deprecatedName}() 已弃用，请使用 neo4jEditor.toolbarManager.${newFunction.name || 'method'}()`);
            }
            return newFunction.apply(context || null, arguments);
        };
    }
    
    // 注册向后兼容函数
    const backwardCompatibilityMapping = [
        { deprecatedName: 'initializeToolbar', newFunction: toolbarManagerModule.initialize, context: toolbarManagerModule },
        { deprecatedName: 'showToolbar', newFunction: toolbarManagerModule.show, context: toolbarManagerModule },
        { deprecatedName: 'hideToolbar', newFunction: toolbarManagerModule.hide, context: toolbarManagerModule },
        { deprecatedName: 'toggleToolbarVisibility', newFunction: toolbarManagerModule.toggle, context: toolbarManagerModule },
        { deprecatedName: 'registerToolbarTool', newFunction: toolbarManagerModule.addTool, context: toolbarManagerModule },
        { deprecatedName: 'unregisterToolbarTool', newFunction: toolbarManagerModule.removeTool, context: toolbarManagerModule },
        { deprecatedName: 'updateToolbarTool', newFunction: toolbarManagerModule.updateTool, context: toolbarManagerModule },
        { deprecatedName: 'activateToolbarTool', newFunction: toolbarManagerModule.activateTool, context: toolbarManagerModule },
        { deprecatedName: 'deactivateToolbarTool', newFunction: toolbarManagerModule.deactivateTool, context: toolbarManagerModule },
        { deprecatedName: 'enableToolbarTool', newFunction: toolbarManagerModule.enableTool, context: toolbarManagerModule },
        { deprecatedName: 'disableToolbarTool', newFunction: toolbarManagerModule.disableTool, context: toolbarManagerModule },
        { deprecatedName: 'getToolbarTool', newFunction: toolbarManagerModule.getTool, context: toolbarManagerModule },
        { deprecatedName: 'getAllToolbarTools', newFunction: toolbarManagerModule.getAllTools, context: toolbarManagerModule },
        { deprecatedName: 'cleanupToolbarManager', newFunction: toolbarManagerModule.cleanup, context: toolbarManagerModule }
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
    const moduleName = 'ui/toolbarManager';
    const moduleRegistrationInfo = {
        name: moduleName,
        version: '1.0.0',
        dependencies: ['core/eventManager', 'core/undoManager'],
        module: toolbarManagerModule
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
                        initialized: toolbarManagerModule.initialized,
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
                window.appModule.toolbarManager = toolbarManagerModule;
                console.log(`Neo4j Editor: ${moduleName} module registered via final fallback to appModule`);
            }
        }
    } else {
        // 降级方案：直接挂载到全局
        if (typeof window.appModule === 'undefined') {
            window.appModule = {};
        }
        window.appModule.toolbarManager = toolbarManagerModule;
        console.log(`Neo4j Editor: ${moduleName} module registered via fallback to appModule`);
    }
    
    // 多模块系统支持 - 确保兼容性
    // CommonJS 模块支持
    if (typeof module !== 'undefined' && typeof module.exports !== 'undefined') {
        module.exports = toolbarManagerModule;
    }
    
    // ES 模块支持
    if (typeof exports !== 'undefined' && typeof exports === 'object') {
        Object.defineProperty(exports, '__esModule', { value: true });
        if (typeof module !== 'undefined') module.exports = toolbarManagerModule;
        exports.default = toolbarManagerModule;
    }
    
    // AMD 模块支持
    if (typeof define === 'function' && define.amd) {
        define(['core/eventManager', 'core/undoManager'], function() {
            return toolbarManagerModule;
        });
    }
    
    return toolbarManagerModule;
})(window.neo4jEditor || (window.neo4jEditor = {}));