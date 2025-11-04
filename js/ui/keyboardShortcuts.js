/**
 * Neo4j Editor - 快捷键管理器模块
 * 负责处理应用程序的键盘快捷键操作
 */
(function(neo4jEditor) {
    'use strict';

    // 确保命名空间存在
    if (typeof neo4jEditor === 'undefined') {
        window.neo4jEditor = {};
    }

    // 初始化状态
    let initialized = false;
    
    // 快捷键映射表
    let shortcuts = {};
    
    // 注册的快捷键列表
    let registeredShortcuts = [];
    
    // 当前活动上下文
    let activeContext = 'global';
    
    // 上下文列表
    let contexts = ['global', 'editing', 'viewing', 'text-input'];
    
    // 禁用状态
    let disabled = false;
    
    // 默认快捷键配置
    let defaultShortcuts = {
        // 全局快捷键
        global: {
            'ctrl+s': {
                description: '保存图表',
                handler: handleSaveChart
            },
            'ctrl+z': {
                description: '撤销',
                handler: handleUndo
            },
            'ctrl+y': {
                description: '重做',
                handler: handleRedo
            },
            'ctrl+a': {
                description: '全选',
                handler: handleSelectAll
            },
            'ctrl+f': {
                description: '搜索',
                handler: handleSearch
            },
            'esc': {
                description: '取消',
                handler: handleCancel
            },
            'f1': {
                description: '帮助',
                handler: handleHelp
            }
        },
        
        // 编辑模式快捷键
        editing: {
            'delete': {
                description: '删除选中元素',
                handler: handleDeleteSelected
            },
            'ctrl+c': {
                description: '复制',
                handler: handleCopy
            },
            'ctrl+v': {
                description: '粘贴',
                handler: handlePaste
            },
            'ctrl+x': {
                description: '剪切',
                handler: handleCut
            },
            'n': {
                description: '创建新节点',
                handler: handleCreateNode
            },
            'r': {
                description: '创建新关系',
                handler: handleCreateRelationship
            },
            'space': {
                description: '切换移动模式',
                handler: handleToggleMoveMode
            }
        },
        
        // 查看模式快捷键
        viewing: {
            'ctrl+plus': {
                description: '放大',
                handler: handleZoomIn
            },
            'ctrl+minus': {
                description: '缩小',
                handler: handleZoomOut
            },
            'ctrl+0': {
                description: '重置缩放',
                handler: handleResetZoom
            },
            'ctrl+1': {
                description: '切换到网络视图',
                handler: handleSwitchToGraphView
            },
            'ctrl+2': {
                description: '切换到树状视图',
                handler: handleSwitchToTreeView
            },
            'ctrl+shift+f': {
                description: '适配视图',
                handler: handleFitView
            },
            'p': {
                description: '显示/隐藏属性面板',
                handler: handleTogglePropertiesPanel
            },
            's': {
                description: '显示/隐藏样式面板',
                handler: handleToggleStylePanel
            },
            'h': {
                description: '显示/隐藏工具栏',
                handler: handleToggleToolbar
            },
            'ctrl+shift+e': {
                description: '导出图表',
                handler: handleExportChart
            }
        },
        
        // 文本输入模式（通常会禁用其他快捷键）
        'text-input': {}
    };

    /**
     * 初始化快捷键管理器
     * @param {Object} config - 配置对象
     * @returns {boolean} 初始化是否成功
     */
    function initialize(config = {}) {
        try {
            console.log('Keyboard Shortcuts Module: Initializing...');
            
            // 合并配置
            if (config.shortcuts) {
                Object.keys(config.shortcuts).forEach(context => {
                    if (!defaultShortcuts[context]) {
                        defaultShortcuts[context] = {};
                    }
                    defaultShortcuts[context] = { 
                        ...defaultShortcuts[context], 
                        ...config.shortcuts[context] 
                    };
                });
            }
            
            // 初始化快捷键
            initializeShortcuts();
            
            // 设置事件监听
            setupEventListeners();
            
            // 标记为已初始化
            initialized = true;
            
            console.log('Keyboard Shortcuts Module: Initialized successfully');
            
            // 触发初始化完成事件
            if (neo4jEditor.eventManager && typeof neo4jEditor.eventManager.trigger === 'function') {
                neo4jEditor.eventManager.trigger('keyboardShortcuts:initialized', {
                    shortcuts: getRegisteredShortcuts()
                });
            }
            
            return true;
        } catch (error) {
            console.error('Keyboard Shortcuts Module: Initialization error:', error);
            return false;
        }
    }

    /**
     * 初始化快捷键
     */
    function initializeShortcuts() {
        try {
            // 复制默认快捷键到当前快捷键表
            Object.keys(defaultShortcuts).forEach(context => {
                if (!shortcuts[context]) {
                    shortcuts[context] = {};
                }
                Object.keys(defaultShortcuts[context]).forEach(key => {
                    registerShortcut(context, key, defaultShortcuts[context][key]);
                });
            });
        } catch (error) {
            console.error('Error initializing shortcuts:', error);
        }
    }

    /**
     * 设置事件监听
     */
    function setupEventListeners() {
        try {
            // 键盘事件监听
            document.addEventListener('keydown', handleKeyDown, true);
            document.addEventListener('keyup', handleKeyUp, true);
            
            // 监听上下文变化事件
            if (neo4jEditor.eventManager && typeof neo4jEditor.eventManager.on === 'function') {
                neo4jEditor.eventManager.on('context:changed', function(event) {
                    if (event.data && event.data.context) {
                        setActiveContext(event.data.context);
                    }
                });
                
                // 监听禁用状态变化
                neo4jEditor.eventManager.on('keyboardShortcuts:disabled', function(event) {
                    setDisabled(true);
                });
                
                neo4jEditor.eventManager.on('keyboardShortcuts:enabled', function(event) {
                    setDisabled(false);
                });
            }
        } catch (error) {
            console.error('Error setting up keyboard shortcut event listeners:', error);
        }
    }

    /**
     * 处理键盘按下事件
     * @param {KeyboardEvent} event - 键盘事件对象
     */
    function handleKeyDown(event) {
        try {
            // 如果禁用了快捷键，直接返回
            if (disabled) {
                return;
            }
            
            // 检查是否在文本输入区域
            const isTextInput = isInTextInputElement(event.target);
            
            // 确定当前活动上下文
            const currentContext = isTextInput ? 'text-input' : activeContext;
            
            // 构建快捷键字符串
            const shortcutString = buildShortcutString(event);
            
            // 查找匹配的快捷键
            const shortcut = findShortcut(currentContext, shortcutString);
            
            if (shortcut) {
                // 阻止默认行为
                event.preventDefault();
                event.stopPropagation();
                
                // 执行快捷键处理函数
                executeShortcutHandler(shortcut, event);
                
                // 触发快捷键执行事件
                if (neo4jEditor.eventManager && typeof neo4jEditor.eventManager.trigger === 'function') {
                    neo4jEditor.eventManager.trigger('keyboardShortcuts:executed', {
                        context: currentContext,
                        shortcut: shortcutString,
                        description: shortcut.description
                    });
                }
            }
        } catch (error) {
            console.error('Error handling keydown event:', error);
        }
    }

    /**
     * 处理键盘释放事件
     * @param {KeyboardEvent} event - 键盘事件对象
     */
    function handleKeyUp(event) {
        try {
            // 这里可以添加按键释放相关的处理
        } catch (error) {
            console.error('Error handling keyup event:', error);
        }
    }

    /**
     * 检查元素是否为文本输入元素
     * @param {HTMLElement} element - HTML元素
     * @returns {boolean} 是否为文本输入元素
     */
    function isInTextInputElement(element) {
        const textInputTypes = ['input', 'textarea', 'select', 'contenteditable'];
        
        if (!element) {
            return false;
        }
        
        // 检查元素类型
        if (textInputTypes.includes(element.tagName.toLowerCase())) {
            return true;
        }
        
        // 检查contenteditable属性
        if (element.hasAttribute('contenteditable') && element.getAttribute('contenteditable') !== 'false') {
            return true;
        }
        
        // 检查父元素
        return element.parentNode ? isInTextInputElement(element.parentNode) : false;
    }

    /**
     * 构建快捷键字符串
     * @param {KeyboardEvent} event - 键盘事件对象
     * @returns {string} 快捷键字符串
     */
    function buildShortcutString(event) {
        let shortcut = '';
        
        // 添加修饰键
        if (event.ctrlKey || event.metaKey) {
            shortcut += 'ctrl+';
        }
        
        if (event.shiftKey) {
            shortcut += 'shift+';
        }
        
        if (event.altKey) {
            shortcut += 'alt+';
        }
        
        // 添加按键
        const key = getNormalizedKey(event);
        shortcut += key;
        
        return shortcut;
    }

    /**
     * 获取标准化的按键名称
     * @param {KeyboardEvent} event - 键盘事件对象
     * @returns {string} 标准化的按键名称
     */
    function getNormalizedKey(event) {
        // 处理特殊按键
        const specialKeys = {
            'ArrowUp': 'up',
            'ArrowDown': 'down',
            'ArrowLeft': 'left',
            'ArrowRight': 'right',
            'Enter': 'enter',
            'Escape': 'esc',
            'Delete': 'delete',
            'Backspace': 'backspace',
            'Tab': 'tab',
            ' ' : 'space',
            '+': 'plus',
            '-': 'minus'
        };
        
        // 检查是否为特殊按键
        if (specialKeys[event.key]) {
            return specialKeys[event.key];
        }
        
        // 检查数字和字母键
        const key = event.key.toLowerCase();
        if (/^[a-z0-9]$/.test(key)) {
            return key;
        }
        
        // 检查功能键
        if (/^F[0-9]{1,2}$/.test(event.key)) {
            return event.key.toLowerCase();
        }
        
        // 其他按键直接返回
        return key;
    }

    /**
     * 查找匹配的快捷键
     * @param {string} context - 上下文
     * @param {string} shortcutString - 快捷键字符串
     * @returns {Object|null} 匹配的快捷键对象或null
     */
    function findShortcut(context, shortcutString) {
        try {
            // 首先在指定上下文中查找
            if (shortcuts[context] && shortcuts[context][shortcutString]) {
                return shortcuts[context][shortcutString];
            }
            
            // 然后在全局上下文中查找
            if (context !== 'global' && shortcuts.global && shortcuts.global[shortcutString]) {
                return shortcuts.global[shortcutString];
            }
            
            return null;
        } catch (error) {
            console.error('Error finding shortcut:', error);
            return null;
        }
    }

    /**
     * 执行快捷键处理函数
     * @param {Object} shortcut - 快捷键对象
     * @param {KeyboardEvent} event - 键盘事件对象
     */
    function executeShortcutHandler(shortcut, event) {
        try {
            if (typeof shortcut.handler === 'function') {
                shortcut.handler(event);
            } else if (neo4jEditor.eventManager && typeof neo4jEditor.eventManager.trigger === 'function') {
                // 如果handler不是函数，尝试触发事件
                neo4jEditor.eventManager.trigger(`shortcut:${shortcutString}`, {
                    event: event,
                    shortcut: shortcut
                });
            }
        } catch (error) {
            console.error('Error executing shortcut handler:', error);
        }
    }

    /**
     * 注册快捷键
     * @param {string} context - 上下文
     * @param {string} shortcut - 快捷键字符串
     * @param {Object|Function} config - 配置对象或处理函数
     * @returns {boolean} 是否注册成功
     */
    function registerShortcut(context, shortcut, config) {
        try {
            // 验证上下文
            if (!context || typeof context !== 'string') {
                console.error('Invalid context for shortcut registration');
                return false;
            }
            
            // 验证快捷键字符串
            if (!shortcut || typeof shortcut !== 'string') {
                console.error('Invalid shortcut string');
                return false;
            }
            
            // 确保上下文存在
            if (!shortcuts[context]) {
                shortcuts[context] = {};
                contexts.push(context);
            }
            
            // 标准化配置
            let shortcutConfig = config;
            if (typeof config === 'function') {
                shortcutConfig = {
                    description: '',
                    handler: config
                };
            }
            
            // 存储快捷键
            shortcuts[context][shortcut] = shortcutConfig;
            
            // 添加到注册列表
            const registeredShortcut = {
                context: context,
                shortcut: shortcut,
                description: shortcutConfig.description
            };
            
            // 避免重复添加
            if (!registeredShortcuts.some(s => s.context === context && s.shortcut === shortcut)) {
                registeredShortcuts.push(registeredShortcut);
            }
            
            return true;
        } catch (error) {
            console.error('Error registering shortcut:', error);
            return false;
        }
    }

    /**
     * 注销快捷键
     * @param {string} context - 上下文
     * @param {string} shortcut - 快捷键字符串
     * @returns {boolean} 是否注销成功
     */
    function unregisterShortcut(context, shortcut) {
        try {
            // 检查快捷键是否存在
            if (!shortcuts[context] || !shortcuts[context][shortcut]) {
                return false;
            }
            
            // 删除快捷键
            delete shortcuts[context][shortcut];
            
            // 从注册列表中移除
            registeredShortcuts = registeredShortcuts.filter(
                s => !(s.context === context && s.shortcut === shortcut)
            );
            
            return true;
        } catch (error) {
            console.error('Error unregistering shortcut:', error);
            return false;
        }
    }

    /**
     * 获取所有注册的快捷键
     * @returns {Array} 快捷键列表
     */
    function getRegisteredShortcuts() {
        return registeredShortcuts.slice();
    }

    /**
     * 获取特定上下文的快捷键
     * @param {string} context - 上下文
     * @returns {Object} 快捷键对象
     */
    function getShortcutsByContext(context) {
        return shortcuts[context] ? { ...shortcuts[context] } : {};
    }

    /**
     * 设置活动上下文
     * @param {string} context - 上下文
     * @returns {boolean} 是否设置成功
     */
    function setActiveContext(context) {
        try {
            if (!context || typeof context !== 'string') {
                console.error('Invalid context');
                return false;
            }
            
            // 如果上下文不存在，创建它
            if (!shortcuts[context]) {
                shortcuts[context] = {};
                contexts.push(context);
            }
            
            // 更新活动上下文
            const previousContext = activeContext;
            activeContext = context;
            
            // 触发上下文变化事件
            if (neo4jEditor.eventManager && typeof neo4jEditor.eventManager.trigger === 'function') {
                neo4jEditor.eventManager.trigger('keyboardShortcuts:contextChanged', {
                    previousContext: previousContext,
                    currentContext: activeContext
                });
            }
            
            return true;
        } catch (error) {
            console.error('Error setting active context:', error);
            return false;
        }
    }

    /**
     * 获取当前活动上下文
     * @returns {string} 当前活动上下文
     */
    function getActiveContext() {
        return activeContext;
    }

    /**
     * 启用/禁用快捷键
     * @param {boolean} disable - 是否禁用
     */
    function setDisabled(disable) {
        disabled = !!disable;
        
        // 触发状态变化事件
        if (neo4jEditor.eventManager && typeof neo4jEditor.eventManager.trigger === 'function') {
            neo4jEditor.eventManager.trigger(disabled ? 'keyboardShortcuts:disabled' : 'keyboardShortcuts:enabled', {});
        }
    }

    /**
     * 检查快捷键是否已禁用
     * @returns {boolean} 是否已禁用
     */
    function isDisabled() {
        return disabled;
    }

    /**
     * 临时禁用快捷键
     * @returns {Function} 恢复函数
     */
    function temporarilyDisable() {
        const wasDisabled = disabled;
        disabled = true;
        
        return function restore() {
            disabled = wasDisabled;
        };
    }

    /**
     * 导出快捷键配置
     * @returns {Object} 快捷键配置
     */
    function exportShortcuts() {
        return JSON.parse(JSON.stringify(shortcuts));
    }

    /**
     * 导入快捷键配置
     * @param {Object} config - 快捷键配置
     */
    function importShortcuts(config) {
        try {
            // 重置快捷键
            shortcuts = {};
            registeredShortcuts = [];
            contexts = ['global', 'editing', 'viewing', 'text-input'];
            
            // 导入新配置
            Object.keys(config).forEach(context => {
                Object.keys(config[context]).forEach(shortcut => {
                    registerShortcut(context, shortcut, config[context][shortcut]);
                });
            });
            
            // 触发导入完成事件
            if (neo4jEditor.eventManager && typeof neo4jEditor.eventManager.trigger === 'function') {
                neo4jEditor.eventManager.trigger('keyboardShortcuts:imported', {
                    shortcuts: getRegisteredShortcuts()
                });
            }
        } catch (error) {
            console.error('Error importing shortcuts:', error);
        }
    }

    /**
     * 显示快捷键帮助
     */
    function showShortcutHelp() {
        try {
            // 收集所有快捷键信息
            const allShortcuts = getRegisteredShortcuts();
            
            // 按上下文分组
            const groupedShortcuts = {};
            allShortcuts.forEach(shortcut => {
                if (!groupedShortcuts[shortcut.context]) {
                    groupedShortcuts[shortcut.context] = [];
                }
                groupedShortcuts[shortcut.context].push(shortcut);
            });
            
            // 构建帮助HTML
            let helpHtml = `
                <div class="keyboard-shortcuts-help">
                    <h2>键盘快捷键帮助</h2>
                    <div class="shortcuts-content">
            `;
            
            // 添加每个上下文的快捷键
            Object.keys(groupedShortcuts).forEach(context => {
                helpHtml += `
                    <div class="shortcut-context">
                        <h3>${getContextDisplayName(context)}</h3>
                        <table class="shortcuts-table">
                            <thead>
                                <tr>
                                    <th>快捷键</th>
                                    <th>描述</th>
                                </tr>
                            </thead>
                            <tbody>
                `;
                
                groupedShortcuts[context].forEach(shortcut => {
                    helpHtml += `
                        <tr>
                            <td><kbd>${formatShortcutDisplay(shortcut.shortcut)}</kbd></td>
                            <td>${shortcut.description || '无描述'}</td>
                        </tr>
                    `;
                });
                
                helpHtml += `
                            </tbody>
                        </table>
                    </div>
                `;
            });
            
            helpHtml += `
                    </div>
                    <div class="help-actions">
                        <button class="close-help-btn">关闭</button>
                    </div>
                </div>
            `;
            
            // 创建帮助对话框
            const helpDialog = document.createElement('div');
            helpDialog.className = 'keyboard-shortcuts-dialog';
            helpDialog.innerHTML = helpHtml;
            
            // 设置样式
            Object.assign(helpDialog.style, {
                position: 'fixed',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                backgroundColor: '#ffffff',
                border: '1px solid #ddd',
                borderRadius: '8px',
                padding: '20px',
                maxWidth: '800px',
                maxHeight: '80vh',
                overflowY: 'auto',
                boxShadow: '0 4px 20px rgba(0, 0, 0, 0.15)',
                zIndex: '10000'
            });
            
            // 添加关闭按钮事件
            const closeBtn = helpDialog.querySelector('.close-help-btn');
            closeBtn.addEventListener('click', function() {
                document.body.removeChild(helpDialog);
            });
            
            // 添加到body
            document.body.appendChild(helpDialog);
        } catch (error) {
            console.error('Error showing shortcut help:', error);
        }
    }

    /**
     * 获取上下文的显示名称
     * @param {string} context - 上下文
     * @returns {string} 显示名称
     */
    function getContextDisplayName(context) {
        const displayNames = {
            'global': '全局快捷键',
            'editing': '编辑模式',
            'viewing': '查看模式',
            'text-input': '文本输入'
        };
        
        return displayNames[context] || context;
    }

    /**
     * 格式化快捷键显示
     * @param {string} shortcut - 快捷键字符串
     * @returns {string} 格式化后的显示字符串
     */
    function formatShortcutDisplay(shortcut) {
        return shortcut
            .split('+')
            .map(key => {
                const keyMap = {
                    'ctrl': 'Ctrl',
                    'shift': 'Shift',
                    'alt': 'Alt',
                    'space': 'Space',
                    'esc': 'Esc',
                    'enter': 'Enter',
                    'delete': 'Delete',
                    'backspace': 'Backspace',
                    'tab': 'Tab',
                    'up': '↑',
                    'down': '↓',
                    'left': '←',
                    'right': '→',
                    'plus': '+',
                    'minus': '-'
                };
                return keyMap[key] || key.toUpperCase();
            })
            .join(' + ');
    }

    /**
     * 清理资源
     */
    function cleanup() {
        try {
            // 移除事件监听
            document.removeEventListener('keydown', handleKeyDown, true);
            document.removeEventListener('keyup', handleKeyUp, true);
            
            // 重置状态
            shortcuts = {};
            registeredShortcuts = [];
            contexts = ['global', 'editing', 'viewing', 'text-input'];
            activeContext = 'global';
            disabled = false;
            initialized = false;
            
            console.log('Keyboard Shortcuts Module: Resources cleaned up');
        } catch (error) {
            console.error('Error cleaning up keyboard shortcuts resources:', error);
        }
    }

    // 快捷键处理函数
    
    /**
     * 保存图表
     * @param {KeyboardEvent} event - 键盘事件
     */
    function handleSaveChart(event) {
        if (neo4jEditor.eventManager && typeof neo4jEditor.eventManager.trigger === 'function') {
            neo4jEditor.eventManager.trigger('chart:save', {});
        }
    }

    /**
     * 撤销操作
     * @param {KeyboardEvent} event - 键盘事件
     */
    function handleUndo(event) {
        if (neo4jEditor.undoManager && typeof neo4jEditor.undoManager.undo === 'function') {
            neo4jEditor.undoManager.undo();
        } else if (neo4jEditor.eventManager && typeof neo4jEditor.eventManager.trigger === 'function') {
            neo4jEditor.eventManager.trigger('operation:undo', {});
        }
    }

    /**
     * 重做操作
     * @param {KeyboardEvent} event - 键盘事件
     */
    function handleRedo(event) {
        if (neo4jEditor.undoManager && typeof neo4jEditor.undoManager.redo === 'function') {
            neo4jEditor.undoManager.redo();
        } else if (neo4jEditor.eventManager && typeof neo4jEditor.eventManager.trigger === 'function') {
            neo4jEditor.eventManager.trigger('operation:redo', {});
        }
    }

    /**
     * 全选
     * @param {KeyboardEvent} event - 键盘事件
     */
    function handleSelectAll(event) {
        if (neo4jEditor.eventManager && typeof neo4jEditor.eventManager.trigger === 'function') {
            neo4jEditor.eventManager.trigger('selection:selectAll', {});
        }
    }

    /**
     * 搜索
     * @param {KeyboardEvent} event - 键盘事件
     */
    function handleSearch(event) {
        if (neo4jEditor.eventManager && typeof neo4jEditor.eventManager.trigger === 'function') {
            neo4jEditor.eventManager.trigger('search:show', {});
        }
    }

    /**
     * 取消操作
     * @param {KeyboardEvent} event - 键盘事件
     */
    function handleCancel(event) {
        if (neo4jEditor.eventManager && typeof neo4jEditor.eventManager.trigger === 'function') {
            neo4jEditor.eventManager.trigger('operation:cancel', {});
        }
    }

    /**
     * 显示帮助
     * @param {KeyboardEvent} event - 键盘事件
     */
    function handleHelp(event) {
        showShortcutHelp();
        if (neo4jEditor.eventManager && typeof neo4jEditor.eventManager.trigger === 'function') {
            neo4jEditor.eventManager.trigger('help:show', {});
        }
    }

    /**
     * 删除选中元素
     * @param {KeyboardEvent} event - 键盘事件
     */
    function handleDeleteSelected(event) {
        if (neo4jEditor.eventManager && typeof neo4jEditor.eventManager.trigger === 'function') {
            neo4jEditor.eventManager.trigger('element:deleteSelected', {});
        }
    }

    /**
     * 复制
     * @param {KeyboardEvent} event - 键盘事件
     */
    function handleCopy(event) {
        if (neo4jEditor.eventManager && typeof neo4jEditor.eventManager.trigger === 'function') {
            neo4jEditor.eventManager.trigger('element:copy', {});
        }
    }

    /**
     * 粘贴
     * @param {KeyboardEvent} event - 键盘事件
     */
    function handlePaste(event) {
        if (neo4jEditor.eventManager && typeof neo4jEditor.eventManager.trigger === 'function') {
            neo4jEditor.eventManager.trigger('element:paste', {});
        }
    }

    /**
     * 剪切
     * @param {KeyboardEvent} event - 键盘事件
     */
    function handleCut(event) {
        if (neo4jEditor.eventManager && typeof neo4jEditor.eventManager.trigger === 'function') {
            neo4jEditor.eventManager.trigger('element:cut', {});
        }
    }

    /**
     * 创建新节点
     * @param {KeyboardEvent} event - 键盘事件
     */
    function handleCreateNode(event) {
        if (neo4jEditor.eventManager && typeof neo4jEditor.eventManager.trigger === 'function') {
            neo4jEditor.eventManager.trigger('node:create', {});
        }
    }

    /**
     * 创建新关系
     * @param {KeyboardEvent} event - 键盘事件
     */
    function handleCreateRelationship(event) {
        if (neo4jEditor.eventManager && typeof neo4jEditor.eventManager.trigger === 'function') {
            neo4jEditor.eventManager.trigger('relationship:create', {});
        }
    }

    /**
     * 切换移动模式
     * @param {KeyboardEvent} event - 键盘事件
     */
    function handleToggleMoveMode(event) {
        if (neo4jEditor.eventManager && typeof neo4jEditor.eventManager.trigger === 'function') {
            neo4jEditor.eventManager.trigger('view:toggleMoveMode', {});
        }
    }

    /**
     * 放大
     * @param {KeyboardEvent} event - 键盘事件
     */
    function handleZoomIn(event) {
        if (neo4jEditor.eventManager && typeof neo4jEditor.eventManager.trigger === 'function') {
            neo4jEditor.eventManager.trigger('view:zoomIn', {});
        }
    }

    /**
     * 缩小
     * @param {KeyboardEvent} event - 键盘事件
     */
    function handleZoomOut(event) {
        if (neo4jEditor.eventManager && typeof neo4jEditor.eventManager.trigger === 'function') {
            neo4jEditor.eventManager.trigger('view:zoomOut', {});
        }
    }

    /**
     * 重置缩放
     * @param {KeyboardEvent} event - 键盘事件
     */
    function handleResetZoom(event) {
        if (neo4jEditor.eventManager && typeof neo4jEditor.eventManager.trigger === 'function') {
            neo4jEditor.eventManager.trigger('view:resetZoom', {});
        }
    }

    /**
     * 切换到网络视图
     * @param {KeyboardEvent} event - 键盘事件
     */
    function handleSwitchToGraphView(event) {
        if (neo4jEditor.viewSwitcher && typeof neo4jEditor.viewSwitcher.switchToGraphView === 'function') {
            neo4jEditor.viewSwitcher.switchToGraphView();
        } else if (neo4jEditor.eventManager && typeof neo4jEditor.eventManager.trigger === 'function') {
            neo4jEditor.eventManager.trigger('view:switchToGraph', {});
        }
    }

    /**
     * 切换到树状视图
     * @param {KeyboardEvent} event - 键盘事件
     */
    function handleSwitchToTreeView(event) {
        if (neo4jEditor.viewSwitcher && typeof neo4jEditor.viewSwitcher.switchToTreeView === 'function') {
            neo4jEditor.viewSwitcher.switchToTreeView();
        } else if (neo4jEditor.eventManager && typeof neo4jEditor.eventManager.trigger === 'function') {
            neo4jEditor.eventManager.trigger('view:switchToTree', {});
        }
    }

    /**
     * 适配视图
     * @param {KeyboardEvent} event - 键盘事件
     */
    function handleFitView(event) {
        if (neo4jEditor.eventManager && typeof neo4jEditor.eventManager.trigger === 'function') {
            neo4jEditor.eventManager.trigger('view:fit', {});
        }
    }

    /**
     * 切换属性面板
     * @param {KeyboardEvent} event - 键盘事件
     */
    function handleTogglePropertiesPanel(event) {
        if (neo4jEditor.eventManager && typeof neo4jEditor.eventManager.trigger === 'function') {
            neo4jEditor.eventManager.trigger('propertiesPanel:toggle', {});
        }
    }

    /**
     * 切换样式面板
     * @param {KeyboardEvent} event - 键盘事件
     */
    function handleToggleStylePanel(event) {
        if (neo4jEditor.eventManager && typeof neo4jEditor.eventManager.trigger === 'function') {
            neo4jEditor.eventManager.trigger('stylePanel:toggle', {});
        }
    }

    /**
     * 切换工具栏
     * @param {KeyboardEvent} event - 键盘事件
     */
    function handleToggleToolbar(event) {
        if (neo4jEditor.eventManager && typeof neo4jEditor.eventManager.trigger === 'function') {
            neo4jEditor.eventManager.trigger('toolbar:toggle', {});
        }
    }

    /**
     * 导出图表
     * @param {KeyboardEvent} event - 键盘事件
     */
    function handleExportChart(event) {
        if (neo4jEditor.eventManager && typeof neo4jEditor.eventManager.trigger === 'function') {
            neo4jEditor.eventManager.trigger('chart:export', {});
        }
    }

    /**
     * 快捷键管理器模块
     */
    const keyboardShortcutsModule = {
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
         * 注册快捷键
         * @param {string} context - 上下文
         * @param {string} shortcut - 快捷键字符串
         * @param {Object|Function} config - 配置对象或处理函数
         * @returns {boolean} 是否注册成功
         */
        registerShortcut: function(context, shortcut, config) {
            return registerShortcut(context, shortcut, config);
        },
        
        /**
         * 注销快捷键
         * @param {string} context - 上下文
         * @param {string} shortcut - 快捷键字符串
         * @returns {boolean} 是否注销成功
         */
        unregisterShortcut: function(context, shortcut) {
            return unregisterShortcut(context, shortcut);
        },
        
        /**
         * 获取所有注册的快捷键
         * @returns {Array} 快捷键列表
         */
        getRegisteredShortcuts: function() {
            return getRegisteredShortcuts();
        },
        
        /**
         * 获取特定上下文的快捷键
         * @param {string} context - 上下文
         * @returns {Object} 快捷键对象
         */
        getShortcutsByContext: function(context) {
            return getShortcutsByContext(context);
        },
        
        /**
         * 设置活动上下文
         * @param {string} context - 上下文
         * @returns {boolean} 是否设置成功
         */
        setActiveContext: function(context) {
            return setActiveContext(context);
        },
        
        /**
         * 获取当前活动上下文
         * @returns {string} 当前活动上下文
         */
        getActiveContext: function() {
            return getActiveContext();
        },
        
        /**
         * 启用/禁用快捷键
         * @param {boolean} disable - 是否禁用
         */
        setDisabled: function(disable) {
            setDisabled(disable);
        },
        
        /**
         * 检查快捷键是否已禁用
         * @returns {boolean} 是否已禁用
         */
        isDisabled: function() {
            return isDisabled();
        },
        
        /**
         * 临时禁用快捷键
         * @returns {Function} 恢复函数
         */
        temporarilyDisable: function() {
            return temporarilyDisable();
        },
        
        /**
         * 导出快捷键配置
         * @returns {Object} 快捷键配置
         */
        exportShortcuts: function() {
            return exportShortcuts();
        },
        
        /**
         * 导入快捷键配置
         * @param {Object} config - 快捷键配置
         */
        importShortcuts: function(config) {
            importShortcuts(config);
        },
        
        /**
         * 显示快捷键帮助
         */
        showHelp: function() {
            showShortcutHelp();
        },
        
        /**
         * 清理资源
         */
        cleanup: function() {
            cleanup();
        }
    };
    
    // 导出模块到命名空间
    neo4jEditor.keyboardShortcuts = keyboardShortcutsModule;
    
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
                console.warn(`警告: 直接调用 ${deprecatedName}() 已弃用，请使用 neo4jEditor.keyboardShortcuts.${newFunction.name || 'method'}()`);
            }
            return newFunction.apply(context || null, arguments);
        };
    }
    
    // 注册向后兼容函数
    const backwardCompatibilityMapping = [
        { deprecatedName: 'initializeKeyboardShortcuts', newFunction: keyboardShortcutsModule.initialize, context: keyboardShortcutsModule },
        { deprecatedName: 'registerKeyboardShortcut', newFunction: keyboardShortcutsModule.registerShortcut, context: keyboardShortcutsModule },
        { deprecatedName: 'unregisterKeyboardShortcut', newFunction: keyboardShortcutsModule.unregisterShortcut, context: keyboardShortcutsModule },
        { deprecatedName: 'getAllKeyboardShortcuts', newFunction: keyboardShortcutsModule.getRegisteredShortcuts, context: keyboardShortcutsModule },
        { deprecatedName: 'setKeyboardShortcutContext', newFunction: keyboardShortcutsModule.setActiveContext, context: keyboardShortcutsModule },
        { deprecatedName: 'getKeyboardShortcutContext', newFunction: keyboardShortcutsModule.getActiveContext, context: keyboardShortcutsModule },
        { deprecatedName: 'disableKeyboardShortcuts', newFunction: function() { keyboardShortcutsModule.setDisabled(true); }, context: keyboardShortcutsModule },
        { deprecatedName: 'enableKeyboardShortcuts', newFunction: function() { keyboardShortcutsModule.setDisabled(false); }, context: keyboardShortcutsModule },
        { deprecatedName: 'isKeyboardShortcutsDisabled', newFunction: keyboardShortcutsModule.isDisabled, context: keyboardShortcutsModule },
        { deprecatedName: 'showKeyboardShortcutsHelp', newFunction: keyboardShortcutsModule.showHelp, context: keyboardShortcutsModule },
        { deprecatedName: 'exportKeyboardShortcuts', newFunction: keyboardShortcutsModule.exportShortcuts, context: keyboardShortcutsModule },
        { deprecatedName: 'importKeyboardShortcuts', newFunction: keyboardShortcutsModule.importShortcuts, context: keyboardShortcutsModule },
        { deprecatedName: 'cleanupKeyboardShortcuts', newFunction: keyboardShortcutsModule.cleanup, context: keyboardShortcutsModule }
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
    const moduleName = 'ui/keyboardShortcuts';
    const moduleRegistrationInfo = {
        name: moduleName,
        version: '1.0.0',
        dependencies: ['core/eventManager'],
        module: keyboardShortcutsModule
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
                        initialized: keyboardShortcutsModule.initialized,
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
                window.appModule.keyboardShortcuts = keyboardShortcutsModule;
                console.log(`Neo4j Editor: ${moduleName} module registered via final fallback to appModule`);
            }
        }
    } else {
        // 降级方案：直接挂载到全局
        if (typeof window.appModule === 'undefined') {
            window.appModule = {};
        }
        window.appModule.keyboardShortcuts = keyboardShortcutsModule;
        console.log(`Neo4j Editor: ${moduleName} module registered via fallback to appModule`);
    }
    
    // 多模块系统支持 - 确保兼容性
    // CommonJS 模块支持
    if (typeof module !== 'undefined' && typeof module.exports !== 'undefined') {
        module.exports = keyboardShortcutsModule;
    }
    
    // ES 模块支持
    if (typeof exports !== 'undefined' && typeof exports === 'object') {
        Object.defineProperty(exports, '__esModule', { value: true });
        if (typeof module !== 'undefined') module.exports = keyboardShortcutsModule;
        exports.default = keyboardShortcutsModule;
    }
    
    // AMD 模块支持
    if (typeof define === 'function' && define.amd) {
        define(['core/eventManager'], function() {
            return keyboardShortcutsModule;
        });
    }
    
    return keyboardShortcutsModule;
})(window.neo4jEditor || (window.neo4jEditor = {}));