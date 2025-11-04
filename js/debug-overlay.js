// 超级调试覆盖层 - 简化版，避免递归
// 目的：捕获所有事件和日志，不依赖浏览器控制台

(function() {
    // 保存原始console对象的引用，但不重写它，避免递归问题
    const originalConsole = window.console;
    
    // 创建一个独立的日志存储
    window.debugLogs = [];
    window.debugEvents = [];
    window.debugModeChanges = [];
    window.debugClickCount = 0;
    
    // 直接向存储添加日志的函数
    function addDebugLog(type, message) {
        const timestamp = new Date().toISOString();
        window.debugLogs.push({
            type: type,
            timestamp: timestamp,
            message: message
        });
        
        // 限制日志数量，防止内存泄漏
        if (window.debugLogs.length > 1000) {
            window.debugLogs.shift();
        }
        
        // 更新调试覆盖层（如果已创建）
        if (window._debugOverlay) {
            updateDebugOverlay();
        }
    }
    
    // 创建调试覆盖层DOM元素
    function createDebugOverlay() {
        // 使用try-catch避免错误
        try {
            if (!document.body) {
                setTimeout(createDebugOverlay, 100);
                return;
            }
            
            addDebugLog('log', 'CRITICAL_DEBUG_OVERLAY: Creating debug overlay DOM');
            
            // 创建覆盖层容器
            const overlay = document.createElement('div');
            overlay.id = 'debug-overlay';
            overlay.style.position = 'fixed';
            overlay.style.bottom = '0';
            overlay.style.right = '0';
            overlay.style.width = '400px';
            overlay.style.height = '300px';
            overlay.style.backgroundColor = 'rgba(0, 0, 0, 0.9)';
            overlay.style.color = 'white';
            overlay.style.padding = '10px';
            overlay.style.borderTopLeftRadius = '10px';
            overlay.style.fontFamily = 'monospace';
            overlay.style.fontSize = '12px';
            overlay.style.overflow = 'auto';
            overlay.style.zIndex = '999999999';
            overlay.style.border = '2px solid #ff0000';
            
            // 创建头部
            const header = document.createElement('div');
            header.style.fontWeight = 'bold';
            header.style.borderBottom = '1px solid #555';
            header.style.paddingBottom = '5px';
            header.style.marginBottom = '5px';
            header.style.display = 'flex';
            header.style.justifyContent = 'space-between';
            header.style.alignItems = 'center';
            
            const title = document.createElement('span');
            title.textContent = '超级调试面板 - 不依赖控制台';
            title.style.color = '#ff0000';
            
            const controls = document.createElement('div');
            
            const clearBtn = document.createElement('button');
            clearBtn.textContent = '清除';
            clearBtn.style.backgroundColor = '#555';
            clearBtn.style.color = 'white';
            clearBtn.style.border = 'none';
            clearBtn.style.padding = '2px 8px';
            clearBtn.style.marginLeft = '5px';
            clearBtn.onclick = function() {
                window.debugLogs = [];
                updateDebugOverlay();
            };
            
            const minimizeBtn = document.createElement('button');
            minimizeBtn.textContent = '最小化';
            minimizeBtn.style.backgroundColor = '#555';
            minimizeBtn.style.color = 'white';
            minimizeBtn.style.border = 'none';
            minimizeBtn.style.padding = '2px 8px';
            minimizeBtn.style.marginLeft = '5px';
            minimizeBtn.onclick = function() {
                overlay.style.height = '30px';
                logsContainer.style.display = 'none';
                statsContainer.style.display = 'none';
                maximizeBtn.style.display = 'inline';
                minimizeBtn.style.display = 'none';
            };
            
            const maximizeBtn = document.createElement('button');
            maximizeBtn.textContent = '最大化';
            maximizeBtn.style.backgroundColor = '#555';
            maximizeBtn.style.color = 'white';
            maximizeBtn.style.border = 'none';
            maximizeBtn.style.padding = '2px 8px';
            maximizeBtn.style.marginLeft = '5px';
            maximizeBtn.style.display = 'none';
            maximizeBtn.onclick = function() {
                overlay.style.height = '300px';
                logsContainer.style.display = 'block';
                statsContainer.style.display = 'block';
                maximizeBtn.style.display = 'none';
                minimizeBtn.style.display = 'inline';
            };
            
            controls.appendChild(clearBtn);
            controls.appendChild(minimizeBtn);
            controls.appendChild(maximizeBtn);
            
            header.appendChild(title);
            header.appendChild(controls);
            
            // 创建状态面板
            const statsContainer = document.createElement('div');
            statsContainer.style.fontSize = '10px';
            statsContainer.style.color = '#888';
            statsContainer.style.marginBottom = '5px';
            statsContainer.style.paddingBottom = '5px';
            statsContainer.style.borderBottom = '1px solid #555';
            
            // 创建日志容器
            const logsContainer = document.createElement('div');
            logsContainer.style.height = '200px';
            logsContainer.style.overflow = 'auto';
            logsContainer.style.whiteSpace = 'pre-wrap';
            
            overlay.appendChild(header);
            overlay.appendChild(statsContainer);
            overlay.appendChild(logsContainer);
            
            document.body.appendChild(overlay);
            
            // 保存引用
            window._debugOverlay = {
                overlay: overlay,
                logsContainer: logsContainer,
                statsContainer: statsContainer
            };
            
            addDebugLog('log', 'CRITICAL_DEBUG_OVERLAY: Debug overlay created successfully');
            
        } catch (err) {
            // 静默失败，避免影响主应用
        }
    }
    
    // 更新调试覆盖层
    function updateDebugOverlay() {
        try {
            if (!window._debugOverlay) return;
            
            const { statsContainer, logsContainer } = window._debugOverlay;
            
            // 更新状态信息
            statsContainer.innerHTML = `
                点击次数: ${window.debugClickCount} | 
                模式变更: ${window.debugModeChanges.length} | 
                事件捕获: ${window.debugEvents.length} | 
                日志条数: ${window.debugLogs.length}
            `;
            
            // 更新日志显示（显示最新的20条）
            const recentLogs = window.debugLogs.slice(-20);
            let html = '';
            
            for (let i = 0; i < recentLogs.length; i++) {
                const log = recentLogs[i];
                const time = log.timestamp.slice(11, 23);
                let color = '#888';
                
                if (log.type === 'error') color = '#ff5555';
                else if (log.type === 'warn') color = '#ffff55';
                else if (log.message && log.message.includes('CRITICAL')) color = '#ff0000';
                
                html += `<div style="color: ${color}; margin-bottom: 2px;">[${time}] ${log.message}</div>`;
            }
            
            logsContainer.innerHTML = html;
            
            // 滚动到底部
            logsContainer.scrollTop = logsContainer.scrollHeight;
            
        } catch (err) {
            // 静默失败
        }
    }
    
    // 监听DOMContentLoaded
    function handleDOMLoaded() {
        try {
            addDebugLog('log', 'CRITICAL_DEBUG_OVERLAY: DOM fully loaded');
            createDebugOverlay();
        } catch (err) {
            // 静默失败
        }
    }
    
    // 全局点击事件监听 - 使用捕获阶段
    function handleGlobalClick(e) {
        try {
            window.debugClickCount++;
            window.debugEvents.push({
                type: 'click',
                target: e.target.tagName,
                id: e.target.id,
                className: e.target.className,
                x: e.clientX,
                y: e.clientY,
                timestamp: new Date().toISOString()
            });
            
            addDebugLog('log', `CRITICAL_DEBUG_CLICK: Click captured - target: ${e.target.tagName}, id: ${e.target.id}, x: ${e.clientX}, y: ${e.clientY}, mode: ${window.currentMode || 'unknown'}`);
        } catch (err) {
            // 静默失败
        }
    }
    
    // 监听window.currentMode变化
    function setupModeMonitor() {
        // 使用轮询方式，避免修改对象的getter/setter导致的问题
        setInterval(function() {
            try {
                const currentMode = window.currentMode;
                if (currentMode && currentMode !== window._lastDetectedMode) {
                    window._lastDetectedMode = currentMode;
                    
                    window.debugModeChanges.push({
                        from: window._previousMode || 'unknown',
                        to: currentMode,
                        timestamp: new Date().toISOString()
                    });
                    
                    window._previousMode = currentMode;
                    addDebugLog('log', `CRITICAL_DEBUG_MODE: Mode changed to ${currentMode}`);
                }
            } catch (err) {
                // 静默失败
            }
        }, 100);
    }
    
    // 监听工具栏事件
    function setupToolbarEventListeners() {
        try {
            const handleToolbarEvent = function(event) {
                try {
                    const toolKey = event.detail?.toolKey;
                    if (toolKey) {
                        addDebugLog('log', `CRITICAL_DEBUG_TOOLBAR: Toolbar event captured: ${toolKey}`);
                    }
                } catch (err) {
                    // 静默失败
                }
            };
            
            // 监听自定义事件
            document.addEventListener('toolbar:activeToolChanged', handleToolbarEvent);
            
            // 监听document状态变化
            setInterval(function() {
                try {
                    const docMode = document.documentElement.getAttribute('data-toolbar-mode');
                    if (docMode) {
                        addDebugLog('log', `CRITICAL_DEBUG_POLL: Detected document mode: ${docMode}`);
                    }
                } catch (err) {
                    // 静默失败
                }
            }, 100);
            
        } catch (err) {
            // 静默失败
        }
    }
    
    // 设置全局调试接口
    window.debugUtils = {
        log: function(message) {
            addDebugLog('log', 'DEBUG_UTIL: ' + message);
        },
        error: function(message) {
            addDebugLog('error', 'DEBUG_UTIL_ERROR: ' + message);
        },
        setMode: function(mode) {
            addDebugLog('log', 'DEBUG_UTIL: Forcing mode to: ' + mode);
            try {
                window.currentMode = mode;
            } catch (err) {
                addDebugLog('error', 'DEBUG_UTIL: Failed to set window.currentMode');
            }
            // 尝试触发监听器重装
            try {
                if (window.neo4jEditor?.graphManager?.reinstallAllTapListeners) {
                    window.neo4jEditor.graphManager.reinstallAllTapListeners();
                }
            } catch (err) {
                // 静默失败
            }
        },
        createNode: function(x, y) {
            addDebugLog('log', 'DEBUG_UTIL: Forcing node creation');
            try {
                if (window.neo4jEditor?.graphManager?.createNode) {
                    window.neo4jEditor.graphManager.createNode({x: x || 100, y: y || 100});
                }
            } catch (err) {
                // 静默失败
            }
        }
    };
    
    // 尝试向原始console添加一个简单的代理
    try {
        // 只在原始console可用时尝试代理
        if (originalConsole && typeof originalConsole.log === 'function') {
            const originalLog = originalConsole.log;
            const originalError = originalConsole.error || originalLog;
            const originalWarn = originalConsole.warn || originalLog;
            
            // 简单包装，避免递归
            originalConsole.log = function() {
                try {
                    // 转换参数为字符串
                    let message = '';
                    for (let i = 0; i < arguments.length; i++) {
                        if (i > 0) message += ' ';
                        try {
                            if (typeof arguments[i] === 'object') {
                                message += JSON.stringify(arguments[i], null, 0);
                            } else {
                                message += String(arguments[i]);
                            }
                        } catch (err) {
                            message += '[Object]';
                        }
                    }
                    // 添加到调试日志
                    if (message.includes('CRITICAL') || message.length < 100) {
                        addDebugLog('log', message);
                    }
                } catch (err) {
                    // 静默失败
                }
                // 调用原始方法
                return originalLog.apply(originalConsole, arguments);
            };
            
            originalConsole.error = function() {
                try {
                    let message = '';
                    for (let i = 0; i < arguments.length; i++) {
                        if (i > 0) message += ' ';
                        try {
                            if (typeof arguments[i] === 'object') {
                                message += JSON.stringify(arguments[i], null, 0);
                            } else {
                                message += String(arguments[i]);
                            }
                        } catch (err) {
                            message += '[Object]';
                        }
                    }
                    addDebugLog('error', message);
                } catch (err) {
                    // 静默失败
                }
                return originalError.apply(originalConsole, arguments);
            };
            
            originalConsole.warn = function() {
                try {
                    let message = '';
                    for (let i = 0; i < arguments.length; i++) {
                        if (i > 0) message += ' ';
                        try {
                            if (typeof arguments[i] === 'object') {
                                message += JSON.stringify(arguments[i], null, 0);
                            } else {
                                message += String(arguments[i]);
                            }
                        } catch (err) {
                            message += '[Object]';
                        }
                    }
                    addDebugLog('warn', message);
                } catch (err) {
                    // 静默失败
                }
                return originalWarn.apply(originalConsole, arguments);
            };
        }
    } catch (err) {
        // 静默失败
    }
    
    // 注册事件监听器
    try {
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', handleDOMLoaded);
        } else {
            handleDOMLoaded();
        }
        
        // 注释掉捕获阶段的全局点击监听器，避免干扰Cytoscape的点击事件处理
        // window.addEventListener('click', handleGlobalClick, true);
        
        // 启动监控
        setupModeMonitor();
        setupToolbarEventListeners();
        
        // 立即记录初始化完成
        addDebugLog('log', 'CRITICAL_DEBUG_OVERLAY: Super debug overlay initialized');
        
    } catch (err) {
        // 静默失败
    }
})();