/**
 * 配置管理器模块
 * 负责管理整个应用程序的全局配置设置
 */
neo4jEditor.define('configManager', ['eventBus'], function(eventBus) {
    'use strict';
    
    // 默认配置
    const defaultConfig = {
        // 应用程序基本配置
        app: {
            name: 'Neo4j Editor',
            version: '1.0.0',
            debug: false,
            theme: 'light', // light, dark, system
            language: 'en',
            autoSave: true,
            undoRedoEnabled: true,
            maxUndoSteps: 50
        },
        
        // 界面配置
        ui: {
            sidebar: {
                visible: true,
                position: 'left', // left, right
                width: 280
            },
            toolbar: {
                visible: true,
                position: 'top', // top, bottom
                size: 'medium' // small, medium, large
            },
            statusBar: {
                visible: true,
                position: 'bottom'
            },
            panels: {
                style: {
                    visible: true,
                    position: 'right'
                },
                search: {
                    visible: false,
                    position: 'right'
                },
                data: {
                    visible: false,
                    position: 'right'
                }
            },
            animations: {
                enabled: true,
                duration: 300
            },
            fontFamily: 'Arial, sans-serif',
            fontSize: 14
        },
        
        // 图表配置
        graph: {
            zoom: {
                min: 0.1,
                max: 5,
                sensitivity: 0.1
            },
            pan: {
                enabled: true,
                inertia: true
            },
            selection: {
                enabled: true,
                multiple: true,
                boxSelection: true
            },
            autoFit: {
                enabled: true,
                onLoad: true,
                onAdd: false
            },
            defaultLayout: 'cose', // grid, random, circle, cose, preset
            style: {
                defaultNodeStyle: {
                    shape: 'ellipse',
                    width: 50,
                    height: 50,
                    backgroundColor: '#666666',
                    borderColor: '#333333',
                    borderWidth: 1,
                    color: '#ffffff',
                    fontSize: 14,
                    padding: 10
                },
                defaultEdgeStyle: {
                    width: 2,
                    color: '#888888',
                    lineStyle: 'solid', // solid, dotted, dashed
                    targetArrowShape: 'triangle',
                    targetArrowColor: '#888888',
                    fontSize: 12,
                    color: '#333333'
                },
                highlightStyle: {
                    backgroundColor: '#ff0000',
                    borderColor: '#cc0000',
                    borderWidth: 3,
                    width: 60,
                    height: 60
                },
                selectionStyle: {
                    backgroundColor: '#0066ff',
                    borderColor: '#0040cc',
                    borderWidth: 3
                }
            }
        },
        
        // 数据配置
        data: {
            validation: {
                enabled: true,
                strict: false
            },
            autoComplete: {
                enabled: true,
                delay: 300
            },
            defaultNodeProperties: {
                label: 'Node',
                type: 'default'
            },
            defaultEdgeProperties: {
                label: '',
                type: 'RELATED_TO'
            },
            propertyTypes: [
                { name: 'string', label: 'String', default: '' },
                { name: 'number', label: 'Number', default: 0 },
                { name: 'boolean', label: 'Boolean', default: false },
                { name: 'array', label: 'Array', default: '[]' },
                { name: 'object', label: 'Object', default: '{}' },
                { name: 'date', label: 'Date', default: null }
            ]
        },
        
        // 快捷键配置
        shortcuts: {
            enabled: true,
            custom: {}
        },
        
        // 导出导入配置
        io: {
            autoExportOnSave: false,
            defaultExportFormat: 'json',
            rememberLastFormat: true
        },
        
        // 性能配置
        performance: {
            animationFrame: true,
            debounceTime: 100,
            throttleTime: 200,
            maxRenderedElements: 5000
        },
        
        // 安全配置
        security: {
            allowExternalUrls: false,
            sanitizeInput: true,
            maxFileSize: 10 * 1024 * 1024 // 10MB
        }
    };
    
    // 当前配置
    let currentConfig = { ...defaultConfig };
    
    // 配置变更历史
    let configHistory = [];
    
    // 是否初始化
    let initialized = false;
    
    /**
     * 初始化配置管理器
     */
    function initialize(options) {
        try {
            console.log('Config Manager: Initializing...');
            
            // 加载保存的配置
            loadSavedConfig();
            
            // 合并提供的配置选项
            if (options) {
                mergeConfig(options);
            }
            
            // 应用配置
            applyConfig(currentConfig);
            
            // 注册事件监听器
            registerEventListeners();
            
            initialized = true;
            console.log('Config Manager: Initialized successfully');
            
            return true;
        } catch (error) {
            console.error('Config Manager: Error during initialization:', error);
            return false;
        }
    }
    
    /**
     * 注册事件监听器
     */
    function registerEventListeners() {
        try {
            if (eventBus && typeof eventBus.on === 'function') {
                eventBus.on('config:update', handleConfigUpdate);
                eventBus.on('config:reset', handleConfigReset);
                eventBus.on('config:save', handleConfigSave);
                eventBus.on('config:load', handleConfigLoad);
                eventBus.on('config:setTheme', handleSetTheme);
                eventBus.on('config:setLanguage', handleSetLanguage);
                
                console.log('Config Manager: Event listeners registered');
            }
        } catch (error) {
            console.error('Config Manager: Error registering event listeners:', error);
        }
    }
    
    /**
     * 加载保存的配置
     */
    function loadSavedConfig() {
        try {
            if (typeof localStorage !== 'undefined') {
                const savedConfig = localStorage.getItem('neo4jEditor_config');
                if (savedConfig) {
                    try {
                        const parsedConfig = JSON.parse(savedConfig);
                        mergeConfig(parsedConfig);
                        console.log('Config Manager: Loaded saved configuration');
                    } catch (parseError) {
                        console.error('Config Manager: Error parsing saved configuration:', parseError);
                        // 使用默认配置
                    }
                }
            }
        } catch (error) {
            console.error('Config Manager: Error loading saved configuration:', error);
        }
    }
    
    /**
     * 保存配置到本地存储
     */
    function saveConfigToStorage() {
        try {
            if (typeof localStorage !== 'undefined') {
                localStorage.setItem('neo4jEditor_config', JSON.stringify(currentConfig));
                console.log('Config Manager: Configuration saved to storage');
                return true;
            }
        } catch (error) {
            console.error('Config Manager: Error saving configuration to storage:', error);
        }
        return false;
    }
    
    /**
     * 合并配置
     */
    function mergeConfig(newConfig) {
        try {
            // 保存历史记录
            configHistory.push(JSON.parse(JSON.stringify(currentConfig)));
            // 限制历史记录长度
            if (configHistory.length > 10) {
                configHistory.shift();
            }
            
            // 深度合并配置
            currentConfig = deepMerge(currentConfig, newConfig);
            
            // 验证配置
            validateConfig();
            
            // 应用新配置
            applyConfig(currentConfig);
            
            return true;
        } catch (error) {
            console.error('Config Manager: Error merging configuration:', error);
            return false;
        }
    }
    
    /**
     * 重置配置为默认值
     */
    function resetConfig() {
        try {
            // 保存当前配置到历史记录
            configHistory.push(JSON.parse(JSON.stringify(currentConfig)));
            
            // 重置为默认配置
            currentConfig = JSON.parse(JSON.stringify(defaultConfig));
            
            // 应用默认配置
            applyConfig(currentConfig);
            
            // 保存到存储
            saveConfigToStorage();
            
            console.log('Config Manager: Configuration reset to defaults');
            return true;
        } catch (error) {
            console.error('Config Manager: Error resetting configuration:', error);
            return false;
        }
    }
    
    /**
     * 验证配置
     */
    function validateConfig() {
        try {
            // 验证主题
            if (!['light', 'dark', 'system'].includes(currentConfig.app.theme)) {
                currentConfig.app.theme = 'light';
            }
            
            // 验证边栏位置
            if (!['left', 'right'].includes(currentConfig.ui.sidebar.position)) {
                currentConfig.ui.sidebar.position = 'left';
            }
            
            // 验证缩放范围
            if (currentConfig.graph.zoom.min < 0.01) currentConfig.graph.zoom.min = 0.01;
            if (currentConfig.graph.zoom.max > 100) currentConfig.graph.zoom.max = 100;
            if (currentConfig.graph.zoom.sensitivity < 0) currentConfig.graph.zoom.sensitivity = 0.1;
            
            // 验证工具栏大小
            if (!['small', 'medium', 'large'].includes(currentConfig.ui.toolbar.size)) {
                currentConfig.ui.toolbar.size = 'medium';
            }
            
            // 验证最大撤销步数
            if (currentConfig.app.maxUndoSteps < 1) currentConfig.app.maxUndoSteps = 10;
            if (currentConfig.app.maxUndoSteps > 100) currentConfig.app.maxUndoSteps = 100;
            
            // 验证性能设置
            if (currentConfig.performance.debounceTime < 0) currentConfig.performance.debounceTime = 0;
            if (currentConfig.performance.throttleTime < 0) currentConfig.performance.throttleTime = 0;
            
            // 验证文件大小限制
            if (currentConfig.security.maxFileSize < 1024) currentConfig.security.maxFileSize = 1024;
            
            return true;
        } catch (error) {
            console.error('Config Manager: Error validating configuration:', error);
            return false;
        }
    }
    
    /**
     * 应用配置
     */
    function applyConfig(config) {
        try {
            // 应用主题
            applyTheme(config.app.theme);
            
            // 应用UI设置
            applyUiSettings(config.ui);
            
            // 应用图表设置
            applyGraphSettings(config.graph);
            
            // 应用性能设置
            applyPerformanceSettings(config.performance);
            
            // 触发配置应用事件
            if (eventBus && typeof eventBus.emit === 'function') {
                eventBus.emit('config:applied', { config: { ...config } });
            }
            
            return true;
        } catch (error) {
            console.error('Config Manager: Error applying configuration:', error);
            return false;
        }
    }
    
    /**
     * 应用主题
     */
    function applyTheme(theme) {
        try {
            // 确定实际主题（处理system选项）
            let actualTheme = theme;
            if (theme === 'system') {
                actualTheme = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
            }
            
            // 添加/移除主题类
            document.documentElement.classList.remove('theme-light', 'theme-dark');
            document.documentElement.classList.add(`theme-${actualTheme}`);
            
            // 设置CSS变量
            if (actualTheme === 'dark') {
                document.documentElement.style.setProperty('--background-color', '#1a1a1a');
                document.documentElement.style.setProperty('--text-color', '#ffffff');
                document.documentElement.style.setProperty('--border-color', '#444444');
                document.documentElement.style.setProperty('--primary-color', '#1e88e5');
                document.documentElement.style.setProperty('--secondary-color', '#42a5f5');
                document.documentElement.style.setProperty('--hover-color', '#2196f3');
                document.documentElement.style.setProperty('--sidebar-background', '#2d2d2d');
                document.documentElement.style.setProperty('--panel-background', '#2d2d2d');
                document.documentElement.style.setProperty('--toolbar-background', '#2d2d2d');
            } else {
                document.documentElement.style.setProperty('--background-color', '#ffffff');
                document.documentElement.style.setProperty('--text-color', '#333333');
                document.documentElement.style.setProperty('--border-color', '#e0e0e0');
                document.documentElement.style.setProperty('--primary-color', '#1976d2');
                document.documentElement.style.setProperty('--secondary-color', '#42a5f5');
                document.documentElement.style.setProperty('--hover-color', '#1e88e5');
                document.documentElement.style.setProperty('--sidebar-background', '#f5f5f5');
                document.documentElement.style.setProperty('--panel-background', '#f5f5f5');
                document.documentElement.style.setProperty('--toolbar-background', '#f5f5f5');
            }
            
            console.log('Config Manager: Applied theme:', actualTheme);
        } catch (error) {
            console.error('Config Manager: Error applying theme:', error);
        }
    }
    
    /**
     * 应用UI设置
     */
    function applyUiSettings(uiConfig) {
        try {
            // 应用边栏设置
            const sidebar = document.getElementById('sidebar');
            if (sidebar) {
                sidebar.style.display = uiConfig.sidebar.visible ? 'block' : 'none';
                sidebar.style.width = `${uiConfig.sidebar.width}px`;
                sidebar.style.float = uiConfig.sidebar.position;
            }
            
            // 应用工具栏设置
            const toolbar = document.getElementById('toolbar');
            if (toolbar) {
                toolbar.style.display = uiConfig.toolbar.visible ? 'flex' : 'none';
                toolbar.style.flexDirection = uiConfig.toolbar.position === 'top' ? 'row' : 'column';
                
                // 应用工具栏大小
                toolbar.classList.remove('toolbar-small', 'toolbar-medium', 'toolbar-large');
                toolbar.classList.add(`toolbar-${uiConfig.toolbar.size}`);
            }
            
            // 应用状态栏设置
            const statusBar = document.getElementById('status-bar');
            if (statusBar) {
                statusBar.style.display = uiConfig.statusBar.visible ? 'block' : 'none';
            }
            
            // 应用字体设置
            document.body.style.fontFamily = uiConfig.fontFamily;
            document.body.style.fontSize = `${uiConfig.fontSize}px`;
            
            // 应用动画设置
            if (uiConfig.animations.enabled) {
                document.documentElement.classList.add('animations-enabled');
            } else {
                document.documentElement.classList.remove('animations-enabled');
            }
            
            // 设置动画持续时间
            document.documentElement.style.setProperty('--animation-duration', `${uiConfig.animations.duration}ms`);
            
            console.log('Config Manager: Applied UI settings');
        } catch (error) {
            console.error('Config Manager: Error applying UI settings:', error);
        }
    }
    
    /**
     * 应用图表设置
     */
    function applyGraphSettings(graphConfig) {
        try {
            // 如果图表渲染器可用，应用图表设置
            if (neo4jEditor.graphRenderer && typeof neo4jEditor.graphRenderer.setOptions === 'function') {
                neo4jEditor.graphRenderer.setOptions({
                    zoom: graphConfig.zoom,
                    pan: graphConfig.pan,
                    selection: graphConfig.selection,
                    autoFit: graphConfig.autoFit
                });
            }
            
            // 应用默认样式
            if (neo4jEditor.graphRenderer && typeof neo4jEditor.graphRenderer.updateStyle === 'function') {
                neo4jEditor.graphRenderer.updateStyle(graphConfig.style);
            }
            
            // 设置默认布局
            if (neo4jEditor.layoutManager && typeof neo4jEditor.layoutManager.setDefaultLayout === 'function') {
                neo4jEditor.layoutManager.setDefaultLayout(graphConfig.defaultLayout);
            }
            
            console.log('Config Manager: Applied graph settings');
        } catch (error) {
            console.error('Config Manager: Error applying graph settings:', error);
        }
    }
    
    /**
     * 应用性能设置
     */
    function applyPerformanceSettings(performanceConfig) {
        try {
            // 设置性能相关的CSS类
            if (performanceConfig.animationFrame) {
                document.documentElement.classList.add('using-animation-frame');
            } else {
                document.documentElement.classList.remove('using-animation-frame');
            }
            
            // 触发性能设置应用事件
            if (eventBus && typeof eventBus.emit === 'function') {
                eventBus.emit('config:performanceApplied', performanceConfig);
            }
            
            console.log('Config Manager: Applied performance settings');
        } catch (error) {
            console.error('Config Manager: Error applying performance settings:', error);
        }
    }
    
    /**
     * 获取配置
     */
    function getConfig(path) {
        try {
            if (!path) {
                return JSON.parse(JSON.stringify(currentConfig));
            }
            
            // 处理路径访问，如 'app.theme'
            const parts = path.split('.');
            let value = currentConfig;
            
            for (const part of parts) {
                if (value && typeof value === 'object' && part in value) {
                    value = value[part];
                } else {
                    return undefined;
                }
            }
            
            // 返回值的副本
            if (value && typeof value === 'object') {
                return JSON.parse(JSON.stringify(value));
            }
            
            return value;
        } catch (error) {
            console.error('Config Manager: Error getting configuration:', error);
            return undefined;
        }
    }
    
    /**
     * 设置配置项
     */
    function setConfig(path, value) {
        try {
            // 保存当前状态到历史记录
            configHistory.push(JSON.parse(JSON.stringify(currentConfig)));
            
            // 处理路径设置
            const parts = path.split('.');
            let obj = currentConfig;
            
            // 遍历路径直到倒数第二个部分
            for (let i = 0; i < parts.length - 1; i++) {
                const part = parts[i];
                if (!obj[part]) {
                    obj[part] = {};
                }
                obj = obj[part];
            }
            
            // 设置最后一个部分的值
            const lastPart = parts[parts.length - 1];
            obj[lastPart] = value;
            
            // 验证配置
            validateConfig();
            
            // 应用配置
            applyConfig(currentConfig);
            
            // 保存到存储
            saveConfigToStorage();
            
            return true;
        } catch (error) {
            console.error('Config Manager: Error setting configuration:', error);
            return false;
        }
    }
    
    /**
     * 处理配置更新事件
     */
    function handleConfigUpdate(event, data) {
        const { config } = data;
        const success = mergeConfig(config);
        
        if (success) {
            // 保存到存储
            saveConfigToStorage();
            
            if (eventBus && typeof eventBus.emit === 'function') {
                eventBus.emit('config:updateCompleted', { success: true });
            }
        }
    }
    
    /**
     * 处理配置重置事件
     */
    function handleConfigReset() {
        const success = resetConfig();
        
        if (eventBus && typeof eventBus.emit === 'function') {
                eventBus.emit('config:resetCompleted', { success });
            }
    }
    
    /**
     * 处理配置保存事件
     */
    function handleConfigSave() {
        const success = saveConfigToStorage();
        
        if (eventBus && typeof eventBus.emit === 'function') {
                eventBus.emit('config:saveCompleted', { success });
            }
    }
    
    /**
     * 处理配置加载事件
     */
    function handleConfigLoad() {
        loadSavedConfig();
        
        if (eventBus && typeof eventBus.emit === 'function') {
                eventBus.emit('config:loadCompleted', { config: { ...currentConfig } });
            }
    }
    
    /**
     * 处理主题设置事件
     */
    function handleSetTheme(event, data) {
        const { theme } = data;
        setConfig('app.theme', theme);
    }
    
    /**
     * 处理语言设置事件
     */
    function handleSetLanguage(event, data) {
        const { language } = data;
        setConfig('app.language', language);
    }
    
    /**
     * 深度合并对象
     */
    function deepMerge(target, source) {
        // 如果目标不是对象或源不是对象，直接返回源
        if (typeof target !== 'object' || target === null || 
            typeof source !== 'object' || source === null) {
            return source;
        }
        
        // 创建目标的副本以避免修改原始对象
        const result = { ...target };
        
        // 遍历源对象的所有属性
        for (const key in source) {
            if (source.hasOwnProperty(key)) {
                // 如果源属性是对象且目标属性也是对象，递归合并
                if (typeof source[key] === 'object' && source[key] !== null &&
                    typeof result[key] === 'object' && result[key] !== null &&
                    !Array.isArray(source[key]) && !Array.isArray(result[key])) {
                    result[key] = deepMerge(result[key], source[key]);
                } else {
                    // 否则直接替换
                    result[key] = source[key];
                }
            }
        }
        
        return result;
    }
    
    /**
     * 导出配置为JSON
     */
    function exportConfig() {
        try {
            return JSON.stringify(currentConfig, null, 2);
        } catch (error) {
            console.error('Config Manager: Error exporting configuration:', error);
            return null;
        }
    }
    
    /**
     * 导入配置从JSON
     */
    function importConfig(jsonString) {
        try {
            const config = JSON.parse(jsonString);
            return mergeConfig(config);
        } catch (error) {
            console.error('Config Manager: Error importing configuration:', error);
            return false;
        }
    }
    
    /**
     * 获取配置变更历史
     */
    function getConfigHistory() {
        return JSON.parse(JSON.stringify(configHistory));
    }
    
    /**
     * 导出公共API
     */
    return {
        initialize,
        getConfig,
        setConfig,
        mergeConfig,
        resetConfig,
        exportConfig,
        importConfig,
        getConfigHistory,
        isInitialized: () => initialized
    };
});