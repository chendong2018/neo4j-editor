// 全局错误捕获 - 最早期的日志初始化
if (typeof console === 'undefined') {
    console = { log: function() {}, error: function() {}, warn: function() {} };
}

// 全局错误捕获
window.addEventListener('error', function(e) {
    console.error('CRITICAL_ERROR:', e.message, 'in', e.filename, 'line', e.lineno);
});

// 全局Promise错误捕获
window.addEventListener('unhandledrejection', function(e) {
    console.error('CRITICAL_PROMISE_ERROR:', e.reason);
});

// 全局点击事件 - 最基础的捕获
window.addEventListener('click', function(e) {
    console.log('CRITICAL_GLOBAL_CLICK:', { target: e.target.tagName, id: e.target.id, x: e.clientX, y: e.clientY });
}, false); // 使用冒泡阶段而不是捕获阶段

// 全局DOMContentLoaded事件
document.addEventListener('DOMContentLoaded', function() {
    console.log('CRITICAL_DOM_READY: DOM已加载完成');
});

/**
 * Graph Manager Module
 * 
 * 负责管理和协调树视图和网络图视图的交互和数据同步
 */
neo4jEditor.define('graphManager', ['eventBus', 'configManager', 'userManager'], function(eventBus, configManager, userManager) {
    const module = {
        name: 'graphManager',
        version: '1.0.0',
        treeInstance: null,
        networkInstance: null,
        currentViewMode: 'split', // 'split', 'tree', 'network'
        currentNodeType: 'Person', // 默认节点类型
        graphData: {
            nodes: [],
            edges: []
        },
        selectedElements: new Set(),
        layoutSettings: {
            tree: {
                name: 'tree',
                directed: true,
                padding: 30,
                nodeDimensionsIncludeLabels: true,
                spacingFactor: 1.5,
                avoidOverlap: true
            },
            network: {
                name: 'cose',
                randomize: false,
                componentSpacing: 100,
                nodeRepulsion: 400000,
                nodeOverlap: 20,
                idealEdgeLength: 100,
                edgeElasticity: 80,
                nestingFactor: 5,
                gravity: 100,
                numIter: 500,
                coolingFactor: 0.95,
                coolingThreshold: 0.001
            }
        }
    };

    /**
     * 初始化图表管理器
     */
    module.initialize = function() {
        const logMessage = 'CRITICAL_GRAPH_INIT: Graph Manager initialization started';
        console.log(logMessage);
        if (window.debugUtils?.log) {
            window.debugUtils.log(logMessage);
        }
        
        // 直接在window上挂载graphManager实例，确保全局可访问
        window.neo4jGraphManager = this;
        console.log('CRITICAL_GRAPH_INIT: Graph manager instance attached to window.neo4jGraphManager');
        
        // 初始化全局模式变量
        if (window.currentMode === undefined) {
            window.currentMode = 'select';
            const modeInitMsg = 'CRITICAL_GRAPH_INIT: Initialized window.currentMode to "select"';
            console.log(modeInitMsg);
            if (window.debugUtils?.log) {
                window.debugUtils.log(modeInitMsg);
            }
        }
        
        // 创建简单的节点创建解决方案
        (function() {
            console.log('Neo4j Editor: 初始化简化节点创建系统');
            
            // 调试辅助函数
            function debug(msg) {
                const timestamp = new Date().toISOString().slice(20, 23);
                console.log(`[${timestamp}] DEBUG_GRAPH: ${msg}`);
            }
            
            // 检查DOM元素
            function checkDomElements() {
                const networkContainer = document.getElementById('cy-network');
                const treeContainer = document.getElementById('cy-tree');
                debug(`DOM检查 - cy-network: ${networkContainer ? '存在' : '不存在'}`);
                debug(`DOM检查 - cy-tree: ${treeContainer ? '存在' : '不存在'}`);
                
                // 寻找所有canvas元素
                const canvases = document.querySelectorAll('canvas');
                debug(`发现 ${canvases.length} 个canvas元素`);
                canvases.forEach((canvas, index) => {
                    debug(`Canvas ${index}: className=${canvas.className}, parent=${canvas.parentElement?.id || '无'}`);
                });
                
                return { networkContainer, treeContainer, canvases };
            }
            
            // 立即检查DOM元素
            checkDomElements();
            
            // 全局点击处理函数 - 添加详细日志
            function handleGlobalClick(event) {
                debug(`捕获点击事件: target=${event.target.tagName}, id=${event.target.id}, className=${event.target.className}`);
                
                // 只有在节点模式下才处理
                if (window.currentMode === 'node') {
                    debug(`✓ 当前模式: node`);
                    
                    // 检查是否点击了图表容器或canvas
                    const isCanvas = event.target.tagName === 'CANVAS';
                    const hasCyClass = event.target.className.includes('cy') || 
                                      (event.target.parentElement && event.target.parentElement.className.includes('cy'));
                    const isContainer = event.target.id === 'cy-tree' || event.target.id === 'cy-network';
                    
                    debug(`Canvas: ${isCanvas}, CyClass: ${hasCyClass}, Container: ${isContainer}`);
                    
                    // 更宽松的检测条件
                    if (isCanvas || hasCyClass || isContainer) {
                        debug('✓ 检测到图表相关区域点击');
                        
                        // 获取容器元素 - 尝试多种方式
                        let container = event.target;
                        if (!isContainer) {
                            container = document.getElementById('cy-network') || 
                                       document.getElementById('cy-tree');
                        }
                        
                        if (container) {
                            debug(`✓ 找到容器元素: ${container.id}`);
                            
                            const rect = container.getBoundingClientRect();
                            const position = {
                                x: event.clientX - rect.left,
                                y: event.clientY - rect.top
                            };
                            
                            debug(`✓ 计算位置: x=${position.x}, y=${position.y}`);
                            
                            // 直接调用createNode方法
                            if (module.createNode) {
                                debug(`✓ 准备调用createNode方法`);
                                try {
                                    module.createNode(position, module.currentNodeType || 'Person');
                                    debug(`✓ createNode调用完成`);
                                } catch (error) {
                                    debug(`✗ createNode调用失败: ${error.message}`);
                                }
                            } else {
                                debug(`✗ module.createNode方法不存在`);
                            }
                        } else {
                            debug(`✗ 未找到容器元素`);
                        }
                    } else {
                        debug(`✗ 未检测到图表区域`);
                    }
                } else {
                    debug(`✗ 当前模式不是node: ${window.currentMode}`);
                }
            }
            
            // 添加到document的点击事件 - 使用setTimeout确保DOM加载完成
            setTimeout(() => {
                document.addEventListener('click', handleGlobalClick, true);
                debug('已添加全局点击监听器（捕获阶段）');
                
                // 再次检查DOM元素
                setTimeout(checkDomElements, 1000);
            }, 0);
            
            // 创建更明显的测试按钮
            function createTestButton() {
                debug('创建测试按钮');
                
                // 先移除旧按钮
                const oldButton = document.getElementById('neo4j-test-create-node');
                if (oldButton) {
                    oldButton.remove();
                }
                
                const button = document.createElement('button');
                button.id = 'neo4j-test-create-node';
                button.textContent = '测试节点创建';
                button.style.cssText = `
                    position: fixed;
                    top: 10px;
                    right: 10px;
                    z-index: 9999;
                    padding: 12px 24px;
                    background: #4CAF50;
                    color: white;
                    border: 2px solid #388E3C;
                    border-radius: 8px;
                    cursor: pointer;
                    font-size: 16px;
                    font-weight: bold;
                    box-shadow: 0 4px 8px rgba(0,0,0,0.2);
                `;
                
                button.onclick = function() {
                    debug('测试按钮点击 - 开始测试流程');
                    
                    // 切换到节点模式
                    window.currentMode = 'node';
                    debug('✓ 已强制设置window.currentMode为node');
                    
                    // 立即创建测试节点
                    if (module.createNode) {
                        debug('✓ 直接调用createNode');
                        try {
                            module.createNode({x: 200, y: 200}, 'Test');
                            debug('✓ 测试节点创建完成');
                            button.textContent = '节点创建成功!';
                            setTimeout(() => {
                                button.textContent = '测试节点创建';
                            }, 2000);
                        } catch (error) {
                            debug(`✗ 测试节点创建失败: ${error.message}`);
                            button.textContent = '创建失败!';
                        }
                    } else {
                        debug(`✗ module.createNode方法不可用`);
                    }
                    
                    // 额外测试 - 直接触发document点击事件
                    setTimeout(() => {
                        const clickEvent = new MouseEvent('click', {
                            bubbles: true,
                            cancelable: true,
                            view: window,
                            clientX: 250,
                            clientY: 250
                        });
                        debug('触发模拟点击事件');
                        document.dispatchEvent(clickEvent);
                    }, 500);
                };
                
                // 添加到body或文档根元素
                (document.body || document.documentElement).appendChild(button);
                debug('测试按钮已添加到页面');
            }
            
            // 添加测试按钮
            createTestButton();
            
            // 创建全局调试函数
            window.graphDebug = function() {
                debug('运行手动调试');
                checkDomElements();
                debug(`当前模式: ${window.currentMode}`);
                debug(`createNode方法存在: ${!!module.createNode}`);
                return {
                    mode: window.currentMode,
                    hasCreateNode: !!module.createNode,
                    ...checkDomElements()
                };
            };
            
            debug('节点创建系统初始化完成，可调用window.graphDebug()进行调试');
        })();
        
        // 添加全局节点创建函数，便于直接测试
        window.testCreateNode = function() {
            console.log('CRITICAL_GLOBAL_TEST: testCreateNode function called');
            try {
                const position = { x: 300, y: 200 };
                const nodeType = window.neo4jGraphManager.currentNodeType || 'Generic';
                console.log('CRITICAL_GLOBAL_TEST: Creating node at position:', position, 'type:', nodeType);
                
                const newNode = window.neo4jGraphManager.createNode(position, nodeType);
                console.log('CRITICAL_GLOBAL_TEST: Node creation result:', newNode);
                return newNode;
            } catch (err) {
                console.error('CRITICAL_GLOBAL_TEST: Error in testCreateNode:', err);
                return null;
            }
        };
        
        console.log('CRITICAL_GRAPH_INIT: Global testCreateNode function created');
        const currentModeMsg = 'CRITICAL_GRAPH_INIT: Current window.currentMode: ' + window.currentMode;
        console.log(currentModeMsg);
        if (window.debugUtils?.log) {
            window.debugUtils.log(currentModeMsg);
        }
        
        // 初始化其他关键全局变量
        window.selectedNodeType = window.selectedNodeType || 'Person';
        const nodeTypeMsg = 'CRITICAL_GRAPH_INIT: Initialized window.selectedNodeType to: ' + window.selectedNodeType;
        console.log(nodeTypeMsg);
        if (window.debugUtils?.log) {
            window.debugUtils.log(nodeTypeMsg);
        }
        
        // 添加到全局访问点
        if (!window.graphManagerDebug) {
            window.graphManagerDebug = {
                createNode: this.createNode.bind(this),
                reinstallListeners: this.reinstallAllTapListeners.bind(this),
                setMode: function(mode) {
                    window.currentMode = mode;
                    console.log('DEBUG_MODE_SET: Manually set mode to:', mode);
                    neo4jEditor.graphManager.reinstallAllTapListeners();
                }
            };
            const debugInterfaceMsg = 'CRITICAL_GRAPH_INIT: Debug interface installed at window.graphManagerDebug';
        console.log(debugInterfaceMsg);
        if (window.debugUtils?.log) {
            window.debugUtils.log(debugInterfaceMsg);
        }
        }
        
        // 直接为图表容器添加点击事件监听（最优先的备用机制）
        const setupDirectContainerListeners = function() {
            console.log('CRITICAL_DEBUG_ENTRY: setupDirectContainerListeners called');
            
            // 创建一个强大的点击处理器
            const handleContainerClick = function(container, event) {
                console.log('CRITICAL_DIRECT_CONTAINER_CLICK: Container clicked:', container.id, 'currentMode:', window.currentMode);
                console.log('CRITICAL_DIRECT_CONTAINER_CLICK: Event details:', { target: event.target.id, type: event.type });
                
                // 在节点模式下直接创建节点
                if (window.currentMode === 'node') {
                    console.log('CRITICAL_DIRECT_CONTAINER_CLICK: In node mode, attempting direct node creation');
                    
                    try {
                        // 获取相对于容器的坐标
                        const rect = container.getBoundingClientRect();
                        const position = {
                            x: event.clientX - rect.left,
                            y: event.clientY - rect.top
                        };
                        
                        console.log('CRITICAL_DIRECT_CONTAINER_CLICK: Calculated position:', position);
                        
                        // 使用全局引用直接调用createNode
                        const graphManager = window.neo4jGraphManager || neo4jEditor.graphManager;
                        if (graphManager && typeof graphManager.createNode === 'function') {
                            console.log('CRITICAL_DIRECT_CONTAINER_CLICK: Using graphManager instance:', !!graphManager);
                            const nodeType = graphManager.currentNodeType || 'Generic';
                            const newNode = graphManager.createNode(position, nodeType);
                            console.log('CRITICAL_DIRECT_CONTAINER_CLICK: Node created:', newNode?.data?.id);
                            
                            // 记录到调试日志
                            if (window.logDebugEvent) {
                                window.logDebugEvent('Node created via container click', newNode?.data?.id || 'failed');
                            }
                        } else {
                            console.error('CRITICAL_DIRECT_CONTAINER_CLICK: graphManager not available or createNode not a function');
                        }
                    } catch (err) {
                        console.error('CRITICAL_DIRECT_CONTAINER_CLICK: Failed to create node:', err);
                        if (window.logDebugEvent) {
                            window.logDebugEvent('Error creating node', err.message);
                        }
                    }
                }
                
                // 不阻止事件冒泡，让其他监听器也能捕获到
                return false;
            };
            
            // 初始添加监听器
            const addListenersToContainers = function() {
                const containerIds = ['cy-tree', 'cy-network'];
                containerIds.forEach(id => {
                    const container = document.getElementById(id);
                    if (container) {
                        console.log('CRITICAL_DEBUG_CONTAINERS: Found container:', id);
                        
                        // 移除之前可能存在的监听器
                        container.removeEventListener('click', container._nodeCreationClickHandler, true);
                        container.removeEventListener('click', container._nodeCreationClickHandler, false);
                        container.removeEventListener('mousedown', container._nodeCreationMouseDownHandler, true);
                        
                        // 创建新的监听器
                        container._nodeCreationClickHandler = function(e) {
                            handleContainerClick(container, e);
                        };
                        
                        container._nodeCreationMouseDownHandler = function(e) {
                            console.log('CRITICAL_DIRECT_CONTAINER_MOUSEDOWN:', id, 'mousedown event captured');
                        };
                        
                        // 添加多个事件监听器
                        container.addEventListener('click', container._nodeCreationClickHandler, true);  // 捕获阶段
                        container.addEventListener('click', container._nodeCreationClickHandler, false); // 冒泡阶段
                        container.addEventListener('mousedown', container._nodeCreationMouseDownHandler, true);
                        
                        console.log('CRITICAL_DEBUG_CONTAINERS: Added click listeners to container:', id);
                    }
                });
            };
            
            // 立即添加监听器
            addListenersToContainers();
            
            // 使用setInterval持续检查并确保监听器存在，防止DOM更新后监听器丢失
            console.log('CRITICAL_DEBUG: Setting up interval to monitor container listeners');
            let checkInterval = setInterval(() => {
                const container = document.getElementById('cy-network') || document.getElementById('cy-tree');
                if (container) {
                    addListenersToContainers();
                }
                // 5分钟后停止检查
            }, 1000);
            
            // 5分钟后停止检查
            setTimeout(() => {
                clearInterval(checkInterval);
                console.log('CRITICAL_DEBUG: Container listener check stopped');
            }, 5 * 60 * 1000);
        };
        
        // 创建调试面板
        const createDebugPanel = function() {
            console.log('CRITICAL_DEBUG: Creating debug panel');
            const debugPanel = document.createElement('div');
            debugPanel.id = 'neo4j-debug-panel';
            debugPanel.style.cssText = `
                position: fixed;
                bottom: 20px;
                right: 20px;
                background: rgba(0,0,0,0.8);
                color: white;
                padding: 15px;
                border-radius: 8px;
                font-family: monospace;
                font-size: 12px;
                max-width: 300px;
                max-height: 300px;
                overflow-y: auto;
                z-index: 9999;
            `;
            
            const title = document.createElement('div');
            title.textContent = 'Neo4j Editor Debug';
            title.style.fontWeight = 'bold';
            title.style.marginBottom = '10px';
            
            const modeIndicator = document.createElement('div');
            modeIndicator.id = 'debug-mode-indicator';
            modeIndicator.textContent = 'Current Mode: select';
            modeIndicator.style.marginBottom = '10px';
            
            const testButton = document.createElement('button');
            testButton.id = 'debug-create-node-btn';
            testButton.textContent = 'Test Create Node';
            testButton.style.cssText = `
                background: #4CAF50;
                color: white;
                border: none;
                padding: 8px 12px;
                margin-bottom: 10px;
                cursor: pointer;
                border-radius: 4px;
            `;
            
            const eventLog = document.createElement('div');
            eventLog.id = 'debug-event-log';
            eventLog.style.maxHeight = '200px';
            eventLog.style.overflowY = 'auto';
            
            debugPanel.appendChild(title);
            debugPanel.appendChild(modeIndicator);
            debugPanel.appendChild(testButton);
            debugPanel.appendChild(eventLog);
            
            document.body.appendChild(debugPanel);
            
            // 更新模式指示器的函数
            window.updateDebugMode = function(mode) {
                const indicator = document.getElementById('debug-mode-indicator');
                if (indicator) {
                    indicator.textContent = `Current Mode: ${mode}`;
                    console.log('CRITICAL_DEBUG: Updated debug mode indicator to:', mode);
                }
            };
            
            // 记录事件的函数
            window.logDebugEvent = function(eventName, details) {
                const logElement = document.getElementById('debug-event-log');
                if (logElement) {
                    const logEntry = document.createElement('div');
                    logEntry.textContent = `${new Date().toLocaleTimeString()}: ${eventName} ${details || ''}`;
                    logEntry.style.marginBottom = '4px';
                    logElement.appendChild(logEntry);
                    logElement.scrollTop = logElement.scrollHeight;
                }
            };
            
            // 测试按钮点击事件
            testButton.addEventListener('click', function() {
                console.log('CRITICAL_DEBUG: Test create node button clicked');
                window.logDebugEvent('Test button clicked', 'Attempting to create node');
                
                try {
                    // 直接创建一个节点在中心位置
                    const position = { x: 300, y: 200 };
                    const nodeType = neo4jEditor.graphManager.currentNodeType || 'Generic';
                    console.log('CRITICAL_DEBUG: Creating test node at position:', position, 'type:', nodeType);
                    
                    const newNode = neo4jEditor.graphManager.createNode(position, nodeType);
                    if (newNode) {
                        console.log('CRITICAL_DEBUG: Test node created successfully:', newNode.data.id);
                        window.logDebugEvent('Node created', newNode.data.id);
                    } else {
                        console.log('CRITICAL_DEBUG: Failed to create test node');
                        window.logDebugEvent('Node creation failed');
                    }
                } catch (err) {
                    console.error('CRITICAL_DEBUG: Error creating test node:', err);
                    window.logDebugEvent('Error', err.message);
                }
            });
        };
        
        // 延迟创建调试面板，确保DOM已加载
        setTimeout(createDebugPanel, 1000);
        
        // 立即设置直接容器监听器
        setupDirectContainerListeners();
        
        // 继续标准初始化流程
        this.setupEventListeners();
        this.initializeGraphInstances();
        this.addGlobalClickListeners();
        
        // 添加window对象上的事件跟踪函数
        window.trackGraphEvents = function() {
            console.log('CRITICAL_DEBUG: Setting up global event tracking');
            
            // 监听window.currentMode的变化
            Object.defineProperty(window, 'currentMode', {
                get: function() {
                    return this._currentMode || 'select';
                },
                set: function(value) {
                    console.log('CRITICAL_DEBUG: window.currentMode changed from', this._currentMode, 'to', value);
                    this._currentMode = value;
                    if (window.updateDebugMode) {
                        window.updateDebugMode(value);
                    }
                },
                configurable: true
            });
            
            // 确保初始模式设置
            window.currentMode = window.currentMode || 'select';
        };
        
        // 启动事件跟踪
        window.trackGraphEvents();
        
        // 添加document级别的点击监听器作为最后备选方案
        module.addDocumentLevelListener = function() {
            console.log('CRITICAL_DEBUG: Adding document-level click listener');
            
            document.addEventListener('click', function(e) {
                // 检查是否点击在图表容器内
                const target = e.target;
                let inGraphContainer = false;
                let containerId = null;
                
                // 检查目标是否在图表容器内
                const containers = [document.getElementById('cy-tree'), document.getElementById('cy-network')];
                for (let i = 0; i < containers.length; i++) {
                    const container = containers[i];
                    if (container && container.contains(target)) {
                        inGraphContainer = true;
                        containerId = container.id;
                        break;
                    }
                }
                
                console.log('CRITICAL_DOCUMENT_CLICK: Document clicked', 
                    '| Mode:', window.currentMode, 
                    '| In container:', inGraphContainer, 
                    '| Container ID:', containerId, 
                    '| Target:', target.id || target.tagName);
                
                // 如果在节点模式下点击图表容器
                if (window.currentMode === 'node' && inGraphContainer) {
                    console.log('CRITICAL_DOCUMENT_CLICK: In node mode and clicked in graph container, attempting node creation');
                    
                    try {
                        const container = document.getElementById(containerId);
                        const rect = container.getBoundingClientRect();
                        const position = {
                            x: e.clientX - rect.left,
                            y: e.clientY - rect.top
                        };
                        
                        console.log('CRITICAL_DOCUMENT_CLICK: Calculated position:', position);
                        
                        // 直接创建节点
                        const graphManager = window.neo4jGraphManager || neo4jEditor.graphManager;
                        if (graphManager && typeof graphManager.createNode === 'function') {
                            console.log('CRITICAL_DOCUMENT_CLICK: Using graphManager to create node');
                            const nodeType = graphManager.currentNodeType || 'Generic';
                            const newNode = graphManager.createNode(position, nodeType);
                            console.log('CRITICAL_DOCUMENT_CLICK: Node created:', newNode?.data?.id);
                        } else {
                            console.error('CRITICAL_DOCUMENT_CLICK: graphManager not available');
                        }
                    } catch (err) {
                        console.error('CRITICAL_DOCUMENT_CLICK: Failed to create node:', err);
                    }
                }
            }, true); // 使用捕获阶段
            
            console.log('CRITICAL_DEBUG: Document-level click listener added');
        };
        
        // 立即添加document级别的监听器
        module.addDocumentLevelListener();
        
        // 创建事件诊断工具
        window.diagnoseEventFlow = function() {
            console.log('CRITICAL_DIAGNOSTIC: Starting event flow diagnostics');
            
            // 检查DOM结构
            console.log('CRITICAL_DIAGNOSTIC: Checking DOM structure...');
            const cyTree = document.getElementById('cy-tree');
            const cyNetwork = document.getElementById('cy-network');
            console.log('CRITICAL_DIAGNOSTIC: cy-tree exists:', !!cyTree);
            console.log('CRITICAL_DIAGNOSTIC: cy-network exists:', !!cyNetwork);
            
            // 检查事件监听器
            console.log('CRITICAL_DIAGNOSTIC: Checking event listeners...');
            console.log('CRITICAL_DIAGNOSTIC: cy-tree listeners:', cyTree?._nodeCreationClickHandler ? 'FOUND' : 'NOT FOUND');
            console.log('CRITICAL_DIAGNOSTIC: cy-network listeners:', cyNetwork?._nodeCreationClickHandler ? 'FOUND' : 'NOT FOUND');
            
            // 检查全局状态
            console.log('CRITICAL_DIAGNOSTIC: Current mode:', window.currentMode);
            console.log('CRITICAL_DIAGNOSTIC: graphManager available:', !!window.neo4jGraphManager);
            console.log('CRITICAL_DIAGNOSTIC: testCreateNode function:', typeof window.testCreateNode);
            
            // 测试手动点击模拟
            if (cyNetwork) {
                console.log('CRITICAL_DIAGNOSTIC: Testing simulated click on cy-network...');
                const event = new MouseEvent('click', {
                    bubbles: true,
                    cancelable: true,
                    view: window,
                    clientX: 100,
                    clientY: 100
                });
                cyNetwork.dispatchEvent(event);
                console.log('CRITICAL_DIAGNOSTIC: Simulated click dispatched');
            }
            
            return 'Diagnostics completed';
        };
        
        console.log('CRITICAL_DEBUG: Event flow diagnostic tool created');
        
        // 初始化后自动运行诊断
        setTimeout(() => {
            console.log('CRITICAL_DEBUG: Running initial diagnostics');
            window.diagnoseEventFlow();
        }, 1000);
        
        const initCompleteMsg = 'CRITICAL_GRAPH_INIT: Graph Manager initialization completed';
        console.log(initCompleteMsg);
        if (window.debugUtils?.log) {
            window.debugUtils.log(initCompleteMsg);
        }
    };
    
    /**
     * 设置当前节点类型
     * @param {string} nodeType - 节点类型
     */
    module.setCurrentNodeType = function(nodeType) {
        this.currentNodeType = nodeType;
        console.log('Graph Manager: Current node type set to:', nodeType);
        // 同时更新window.selectedNodeType以保持兼容性
        window.selectedNodeType = nodeType;
        // 触发节点类型变更事件
        eventBus.emit('graph:node:type:changed', nodeType);
    };

    /**
     * 设置事件监听器
     */
    module.setupEventListeners = function() {
        console.log('CRITICAL_EVENT_SETUP: Setting up all event listeners');
        
        // 应用程序级事件监听
        eventBus.on('app:ready', () => {
            console.log('CRITICAL_EVENT_APP_READY: Application ready, initializing graph views');
        });

        // 视图切换事件
        eventBus.on('view:mode:change', (mode) => {
            console.log('CRITICAL_EVENT_VIEW_CHANGE: View mode changed to:', mode);
            this.switchViewMode(mode);
        });

        // 数据更新事件
        eventBus.on('data:nodes:add', (nodes) => {
            console.log('CRITICAL_EVENT_NODES_ADD: Adding nodes:', nodes);
            this.addNodes(nodes);
        });

        eventBus.on('data:edges:add', (edges) => {
            console.log('CRITICAL_EVENT_EDGES_ADD: Adding edges:', edges);
            this.addEdges(edges);
        });

        // 选择同步事件
        eventBus.on('graph:element:select', (elementId, isSelected) => {
            console.log('CRITICAL_EVENT_ELEMENT_SELECT: Element', elementId, 'selected:', isSelected);
            this.handleElementSelection(elementId, isSelected);
        });

        // 配置变更事件
        eventBus.on('config:changed', (config) => {
            console.log('CRITICAL_EVENT_CONFIG_CHANGED: Configuration changed');
            if (config.graphSettings) {
                this.updateGraphSettings(config.graphSettings);
            }
        });
        
        // 监听工具栏活动工具变更事件 - 使用neo4jEditor.eventManager
        if (neo4jEditor.eventManager && typeof neo4jEditor.eventManager.on === 'function') {
            console.log('CRITICAL_EVENT_SETUP: Adding neo4jEditor.eventManager listener');
            neo4jEditor.eventManager.on('toolbar:activeToolChanged', (event) => {
                const toolKey = event.data?.toolKey || event.toolKey;
                console.log('CRITICAL_EVENT_TOOL_CHANGED_NEO4J: toolbar:activeToolChanged event received via neo4jEditor.eventManager with toolKey:', toolKey);
                
                // 根据工具类型设置当前模式
                if (toolKey === 'addNode') {
                    window.currentMode = 'node';
                    console.log('CRITICAL_EVENT_TOOL_CHANGED_NEO4J: Set window.currentMode to "node"');
                } else if (toolKey === 'select') {
                    window.currentMode = 'select';
                    console.log('CRITICAL_EVENT_TOOL_CHANGED_NEO4J: Set window.currentMode to "select"');
                } else if (toolKey === 'addRelationship') {
                    window.currentMode = 'relationship';
                    console.log('CRITICAL_EVENT_TOOL_CHANGED_NEO4J: Set window.currentMode to "relationship"');
                }
                
                // 直接调用reinstallAllTapListeners
                console.log('CRITICAL_EVENT_TOOL_CHANGED_NEO4J: Reinstalling tap listeners');
                try {
                    this.reinstallAllTapListeners();
                } catch (err) {
                    console.error('CRITICAL_ERROR: Failed to reinstall listeners:', err);
                }
            });
        } else {
            console.warn('CRITICAL_EVENT_SETUP: neo4jEditor.eventManager not available');
        }
        
        // 监听工具栏活动工具变更事件 - 使用eventBus
        console.log('CRITICAL_EVENT_SETUP: Adding eventBus listener');
        eventBus.on('toolbar:activeToolChanged', (event) => {
            const toolKey = event.data?.toolKey || event.toolKey || event;
            console.log('CRITICAL_EVENT_TOOL_CHANGED_BUS: toolbar:activeToolChanged event received via eventBus with toolKey:', toolKey);
            
            // 根据工具类型设置当前模式
            if (toolKey === 'addNode') {
                window.currentMode = 'node';
                console.log('CRITICAL_EVENT_TOOL_CHANGED_BUS: Set window.currentMode to "node"');
                if (window.logDebugEvent) {
                    window.logDebugEvent('Mode changed', 'node');
                }
            } else if (toolKey === 'select') {
                window.currentMode = 'select';
                console.log('CRITICAL_EVENT_TOOL_CHANGED_BUS: Set window.currentMode to "select"');
                if (window.logDebugEvent) {
                    window.logDebugEvent('Mode changed', 'select');
                }
            } else if (toolKey === 'addRelationship') {
                window.currentMode = 'relationship';
                console.log('CRITICAL_EVENT_TOOL_CHANGED_BUS: Set window.currentMode to "relationship"');
                if (window.logDebugEvent) {
                    window.logDebugEvent('Mode changed', 'relationship');
                }
            }
            
            // 直接调用reinstallAllTapListeners
            console.log('CRITICAL_EVENT_TOOL_CHANGED_BUS: Reinstalling tap listeners');
            try {
                this.reinstallAllTapListeners();
            } catch (err) {
                console.error('CRITICAL_ERROR: Failed to reinstall listeners:', err);
            }
        });
        
        // 添加DOM事件监听器作为备用
        const handleDomEvent = (event) => {
            const toolKey = event.detail?.toolKey;
            console.log('CRITICAL_EVENT_TOOL_CHANGED_DOM: toolbar:activeToolChanged DOM event received with toolKey:', toolKey);
            
            // 根据工具类型设置当前模式
            if (toolKey === 'addNode') {
                window.currentMode = 'node';
                console.log('CRITICAL_EVENT_TOOL_CHANGED_DOM: Set window.currentMode to "node" via DOM event');
            } else if (toolKey === 'select') {
                window.currentMode = 'select';
                console.log('CRITICAL_EVENT_TOOL_CHANGED_DOM: Set window.currentMode to "select" via DOM event');
            } else if (toolKey === 'addRelationship') {
                window.currentMode = 'relationship';
                console.log('CRITICAL_EVENT_TOOL_CHANGED_DOM: Set window.currentMode to "relationship" via DOM event');
            }
            
            // 直接调用reinstallAllTapListeners
            console.log('CRITICAL_EVENT_TOOL_CHANGED_DOM: Reinstalling tap listeners');
            try {
                this.reinstallAllTapListeners();
            } catch (err) {
                console.error('CRITICAL_ERROR: Failed to reinstall listeners:', err);
            }
        };
        
        // 先移除可能存在的监听器，避免重复
        document.removeEventListener('toolbar:activeToolChanged', handleDomEvent);
        // 添加DOM事件监听器
        document.addEventListener('toolbar:activeToolChanged', handleDomEvent);
        console.log('CRITICAL_EVENT_SETUP: Added DOM event listener');
        
        // 添加窗口级别的模式变更检测 - 更健壮的实现
        console.log('CRITICAL_EVENT_SETUP: Setting up window.currentMode property');
        Object.defineProperty(window, 'currentMode', {
            get: function() {
                const value = this._currentMode || 'select';
                console.log('CRITICAL_MODE_GET: Getting window.currentMode:', value);
                return value;
            },
            set: function(value) {
                const modeChangeMsg = `CRITICAL_MODE_SET: Setting window.currentMode from ${this._currentMode} to ${value}`;
            console.log(modeChangeMsg);
            if (window.debugUtils?.log) {
                window.debugUtils.log(modeChangeMsg);
            }
                this._currentMode = value;
                
                // 立即重新安装监听器，使用setTimeout确保在下一个事件循环执行
                setTimeout(() => {
                    if (neo4jEditor && neo4jEditor.graphManager && typeof neo4jEditor.graphManager.reinstallAllTapListeners === 'function') {
                        const triggerReinstallMsg = 'CRITICAL_MODE_SET: Triggering listener reinstallation due to mode change';
                    console.log(triggerReinstallMsg);
                    if (window.debugUtils?.log) {
                        window.debugUtils.log(triggerReinstallMsg);
                    }
                        try {
                            neo4jEditor.graphManager.reinstallAllTapListeners();
                        } catch (err) {
                            console.error('CRITICAL_ERROR: Failed to reinstall listeners on mode change:', err);
                        }
                    }
                }, 0);
            },
            configurable: true
        });
        
        console.log('CRITICAL_EVENT_SETUP: All event listeners configured successfully');
    };

    /**
     * 初始化图表实例
     */
    module.initializeGraphInstances = function() {
        const initStartMsg = 'CRITICAL_GRAPH_INIT_INSTANCES: Starting graph instance initialization';
        console.log(initStartMsg);
        if (window.debugUtils?.log) {
            window.debugUtils.log(initStartMsg);
        }
        
        const treeContainer = document.getElementById('cy-tree');
        const networkContainer = document.getElementById('cy-network');

        if (!treeContainer || !networkContainer) {
            console.error('CRITICAL_GRAPH_INIT_INSTANCES: Graph containers not found');
            console.error('CRITICAL_GRAPH_INIT_INSTANCES: Tree container:', !!treeContainer, 'Network container:', !!networkContainer);
            if (window.debugUtils?.error) {
                window.debugUtils.error('Graph containers not found');
            }
            return;
        }

        const containersFoundMsg = 'CRITICAL_GRAPH_INIT_INSTANCES: Graph containers found';
        console.log(containersFoundMsg);
        if (window.debugUtils?.log) {
            window.debugUtils.log(containersFoundMsg);
        }

        // 创建树视图实例
        try {
            this.treeInstance = cytoscape({
                container: treeContainer,
                style: this.getGraphStyles(),
                layout: this.layoutSettings.tree,
                boxSelectionEnabled: true,
                autounselectify: false,
                userZoomingEnabled: true,
                userPanningEnabled: true
            });
            const treeInstanceCreatedMsg = 'CRITICAL_GRAPH_INIT_INSTANCES: Tree instance created successfully';
            console.log(treeInstanceCreatedMsg);
            if (window.debugUtils?.log) {
                window.debugUtils.log(treeInstanceCreatedMsg);
            }
        } catch (treeErr) {
            console.error('CRITICAL_GRAPH_INIT_INSTANCES: Failed to create tree instance:', treeErr);
            if (window.debugUtils?.error) {
                window.debugUtils.error('Failed to create tree instance');
            }
        }

        // 创建网络图视图实例
        try {
            this.networkInstance = cytoscape({
                container: networkContainer,
                style: this.getGraphStyles(),
                layout: this.layoutSettings.network,
                boxSelectionEnabled: true,
                autounselectify: false,
                userZoomingEnabled: true,
                userPanningEnabled: true
            });
            const networkInstanceCreatedMsg = 'CRITICAL_GRAPH_INIT_INSTANCES: Network instance created successfully';
            console.log(networkInstanceCreatedMsg);
            if (window.debugUtils?.log) {
                window.debugUtils.log(networkInstanceCreatedMsg);
            }
        } catch (networkErr) {
            console.error('CRITICAL_GRAPH_INIT_INSTANCES: Failed to create network instance:', networkErr);
            if (window.debugUtils?.error) {
                window.debugUtils.error('Failed to create network instance');
            }
        }

        // 验证实例是否创建成功
        const treeInstanceValidMsg = `CRITICAL_GRAPH_INIT_INSTANCES: Tree instance valid: ${!!this.treeInstance}`;
        console.log(treeInstanceValidMsg);
        if (window.debugUtils?.log) {
            window.debugUtils.log(treeInstanceValidMsg);
        }
        
        const networkInstanceValidMsg = `CRITICAL_GRAPH_INIT_INSTANCES: Network instance valid: ${!!this.networkInstance}`;
        console.log(networkInstanceValidMsg);
        if (window.debugUtils?.log) {
            window.debugUtils.log(networkInstanceValidMsg);
        }

        // 设置交互处理
        if (this.treeInstance) {
            this.setupGraphInteractions(this.treeInstance);
        }
        if (this.networkInstance) {
            this.setupGraphInteractions(this.networkInstance);
        }

        // 设置缩放控制
        this.setupZoomControls('cy-tree');
        this.setupZoomControls('cy-network');
        
        const initCompleteMsg = 'CRITICAL_GRAPH_INIT_INSTANCES: Graph instance initialization completed';
        console.log(initCompleteMsg);
        if (window.debugUtils?.log) {
            window.debugUtils.log(initCompleteMsg);
        }
    };

    /**
     * 获取图表样式
     */
    module.getGraphStyles = function() {
        return [
            // 节点样式
            {
                selector: 'node',
                style: {
                    'background-color': '#388bff',
                    'label': 'data(label)',
                    'color': '#fff',
                    'text-valign': 'center',
                    'text-halign': 'center',
                    'font-size': '12px',
                    'width': '40px',
                    'height': '40px',
                    'border-color': '#1e1e1e',
                    'border-width': '2px',
                    'shape': 'ellipse'
                }
            },
            // 关系样式
            {
                selector: 'edge',
                style: {
                    'width': 2,
                    'line-color': '#32ade6',
                    'target-arrow-color': '#32ade6',
                    'target-arrow-shape': 'triangle',
                    'curve-style': 'bezier',
                    'label': 'data(label)',
                    'color': '#b0b0b0',
                    'font-size': '10px',
                    'text-background-color': '#1e1e1e',
                    'text-background-opacity': 0.8,
                    'text-background-padding': '2px 5px',
                    'text-background-shape': 'roundrectangle'
                }
            },
            // 选中节点样式
            {
                selector: 'node:selected',
                style: {
                    'border-color': '#388bff',
                    'border-width': '3px',
                    'z-index': 9999
                }
            },
            // 选中关系样式
            {
                selector: 'edge:selected',
                style: {
                    'width': 3,
                    'line-color': '#388bff',
                    'target-arrow-color': '#388bff',
                    'z-index': 9999
                }
            }
        ];
    };

    /**
     * 设置图表交互
     */
    module.setupGraphInteractions = function(graphInstance) {
        console.log('Graph Manager: Setting up graph interactions');
        // 保存this引用，用于事件监听器中
        const self = this;
        
        // 点击事件 - 处理节点创建
        graphInstance.on('tap', (evt) => {
            console.log('Graph Manager: Graph tap event detected, target:', evt.target);
            // 检查是否处于节点创建模式
            if (window.currentMode === 'node' || document.querySelector('.mode-node.active')) {
                console.log('Graph Manager: In node creation mode, checking target');
                const target = evt.target;
                // 只有点击背景时才创建节点
                if (target === graphInstance) {
                    console.log('Graph Manager: Canvas background tapped, creating node');
                    self.handleNodeCreationTap(graphInstance, evt);
                }
            } else {
                console.log('Graph Manager: Not in node creation mode, current mode:', window.currentMode);
            }
        });
        
        // 添加点击事件（作为tap的补充）
        graphInstance.on('click', (evt) => {
            console.log('Graph Manager: Graph click event detected, target:', evt.target);
        });
        
        // 选择事件
        graphInstance.on('select', 'node,edge', (evt) => {
            const element = evt.target;
            const elementId = element.id();
            this.selectedElements.add(elementId);
            
            // 同步到另一个视图
            this.syncSelection(elementId, true);
            
            // 触发选中事件
            eventBus.emit('graph:element:selected', { id: elementId, data: element.data() });
        });

        // 取消选择事件
        graphInstance.on('unselect', 'node,edge', (evt) => {
            const element = evt.target;
            const elementId = element.id();
            this.selectedElements.delete(elementId);
            
            // 同步到另一个视图
            this.syncSelection(elementId, false);
            
            // 触发取消选中事件
            eventBus.emit('graph:element:unselected', { id: elementId });
        });

        // 双击事件
        graphInstance.on('tapdbl', 'node', (evt) => {
            const node = evt.target;
            eventBus.emit('graph:node:doubleclick', { id: node.id(), data: node.data() });
        });

        // 右键菜单
        graphInstance.on('cxttap', (evt) => {
            evt.preventDefault();
            const target = evt.target;
            
            if (target.isNode()) {
                eventBus.emit('graph:contextmenu:node', { 
                    id: target.id(), 
                    data: target.data(),
                    x: evt.position.x,
                    y: evt.position.y
                });
            } else if (target.isEdge()) {
                eventBus.emit('graph:contextmenu:edge', { 
                    id: target.id(), 
                    data: target.data(),
                    x: evt.position.x,
                    y: evt.position.y
                });
            } else {
                eventBus.emit('graph:contextmenu:background', { 
                    x: evt.position.x,
                    y: evt.position.y
                });
            }
        });
    };

    /**
     * 设置缩放控制
     */
    module.setupZoomControls = function(containerId) {
        const container = document.getElementById(containerId);
        const controls = container.querySelector('.zoom-controls');
        
        if (!controls) return;

        const zoomInBtn = controls.querySelector('.zoom-in');
        const zoomOutBtn = controls.querySelector('.zoom-out');
        const resetZoomBtn = controls.querySelector('.reset-zoom');

        const graphInstance = containerId === 'cy-tree' ? this.treeInstance : this.networkInstance;

        if (zoomInBtn) {
            zoomInBtn.addEventListener('click', () => {
                graphInstance.zoom(graphInstance.zoom() * 1.2);
            });
        }

        if (zoomOutBtn) {
            zoomOutBtn.addEventListener('click', () => {
                graphInstance.zoom(graphInstance.zoom() * 0.8);
            });
        }

        if (resetZoomBtn) {
            resetZoomBtn.addEventListener('click', () => {
                graphInstance.zoom(1);
                graphInstance.center();
            });
        }
    };

    /**
     * 切换视图模式
     */
    module.switchViewMode = function(mode) {
        if (['split', 'tree', 'network'].indexOf(mode) === -1) {
            console.error('Invalid view mode:', mode);
            return;
        }

        this.currentViewMode = mode;
        
        const treeView = document.getElementById('cy-tree').parentElement;
        const networkView = document.getElementById('cy-network').parentElement;
        const splitHandle = document.querySelector('.split-handle');

        switch (mode) {
            case 'split':
                treeView.style.width = '50%';
                networkView.style.width = '50%';
                treeView.style.display = 'block';
                networkView.style.display = 'block';
                splitHandle.style.display = 'block';
                break;
            case 'tree':
                treeView.style.width = '100%';
                networkView.style.display = 'none';
                splitHandle.style.display = 'none';
                break;
            case 'network':
                treeView.style.display = 'none';
                networkView.style.width = '100%';
                splitHandle.style.display = 'none';
                break;
        }

        // 重绘图表
        if (this.treeInstance) this.treeInstance.resize();
        if (this.networkInstance) this.networkInstance.resize();

        // 触发视图模式变更事件
        eventBus.emit('view:mode:changed', mode);
    };

    /**
     * 添加节点到图表
     */
    module.addNodes = function(nodes) {
        const addNodesStartMsg = 'CRITICAL_ADD_NODES: addNodes method called';
        console.log(addNodesStartMsg);
        if (window.debugUtils?.log) {
            window.debugUtils.log(addNodesStartMsg);
        }
        
        if (!Array.isArray(nodes)) {
            nodes = [nodes];
        }

        const nodesCountMsg = `CRITICAL_ADD_NODES: Adding ${nodes.length} nodes`;
        console.log(nodesCountMsg);
        if (window.debugUtils?.log) {
            window.debugUtils.log(nodesCountMsg);
        }

        // 添加到数据存储
        this.graphData.nodes = [...this.graphData.nodes, ...nodes];
        
        const dataStoreUpdateMsg = `CRITICAL_ADD_NODES: Updated data store, now contains ${this.graphData.nodes.length} nodes`;
        console.log(dataStoreUpdateMsg);
        if (window.debugUtils?.log) {
            window.debugUtils.log(dataStoreUpdateMsg);
        }

        // 更新两个视图
        let addedToTree = false;
        if (this.treeInstance) {
            try {
                this.treeInstance.add(nodes);
                addedToTree = true;
                const treeAddSuccessMsg = 'CRITICAL_ADD_NODES: Successfully added to tree instance';
                console.log(treeAddSuccessMsg);
                if (window.debugUtils?.log) {
                    window.debugUtils.log(treeAddSuccessMsg);
                }
                // 验证添加是否成功
                const treeNodesCount = this.treeInstance.nodes().length;
                const treeVerifyMsg = `CRITICAL_ADD_NODES: Tree instance now has ${treeNodesCount} nodes`;
                console.log(treeVerifyMsg);
                if (window.debugUtils?.log) {
                    window.debugUtils.log(treeVerifyMsg);
                }
            } catch (treeErr) {
                console.error('CRITICAL_ADD_NODES: Failed to add to tree instance:', treeErr);
                if (window.debugUtils?.error) {
                    window.debugUtils.error('Failed to add to tree instance');
                }
            }
        } else {
            console.warn('CRITICAL_ADD_NODES: Tree instance not available for adding nodes');
            if (window.debugUtils?.warn) {
                window.debugUtils.warn('Tree instance not available');
            }
        }
        
        let addedToNetwork = false;
        if (this.networkInstance) {
            try {
                this.networkInstance.add(nodes);
                addedToNetwork = true;
                const networkAddSuccessMsg = 'CRITICAL_ADD_NODES: Successfully added to network instance';
                console.log(networkAddSuccessMsg);
                if (window.debugUtils?.log) {
                    window.debugUtils.log(networkAddSuccessMsg);
                }
                // 验证添加是否成功
                const networkNodesCount = this.networkInstance.nodes().length;
                const networkVerifyMsg = `CRITICAL_ADD_NODES: Network instance now has ${networkNodesCount} nodes`;
                console.log(networkVerifyMsg);
                if (window.debugUtils?.log) {
                    window.debugUtils.log(networkVerifyMsg);
                }
            } catch (networkErr) {
                console.error('CRITICAL_ADD_NODES: Failed to add to network instance:', networkErr);
                if (window.debugUtils?.error) {
                    window.debugUtils.error('Failed to add to network instance');
                }
            }
        } else {
            console.warn('CRITICAL_ADD_NODES: Network instance not available for adding nodes');
            if (window.debugUtils?.warn) {
                window.debugUtils.warn('Network instance not available');
            }
        }

        // 重新布局
        if (addedToTree || addedToNetwork) {
            try {
                this.applyLayout();
                const layoutAppliedMsg = 'CRITICAL_ADD_NODES: Layout applied successfully';
                console.log(layoutAppliedMsg);
                if (window.debugUtils?.log) {
                    window.debugUtils.log(layoutAppliedMsg);
                }
            } catch (layoutErr) {
                console.error('CRITICAL_ADD_NODES: Failed to apply layout:', layoutErr);
                if (window.debugUtils?.error) {
                    window.debugUtils.error('Failed to apply layout');
                }
            }
        }
        
        const addNodesCompleteMsg = `CRITICAL_ADD_NODES: addNodes completed, nodes added to tree: ${addedToTree}, added to network: ${addedToNetwork}`;
        console.log(addNodesCompleteMsg);
        if (window.debugUtils?.log) {
            window.debugUtils.log(addNodesCompleteMsg);
        }
    };

    /**
     * 添加关系到图表
     */
    module.addEdges = function(edges) {
        if (!Array.isArray(edges)) {
            edges = [edges];
        }

        // 添加到数据存储
        this.graphData.edges = [...this.graphData.edges, ...edges];

        // 更新两个视图
        if (this.treeInstance) {
            this.treeInstance.add(edges);
        }
        
        if (this.networkInstance) {
            this.networkInstance.add(edges);
        }

        // 重新布局
        this.applyLayout();
    };

    /**
     * 删除节点
     */
    module.removeNodes = function(nodeIds) {
        if (!Array.isArray(nodeIds)) {
            nodeIds = [nodeIds];
        }

        // 从数据存储中移除
        this.graphData.nodes = this.graphData.nodes.filter(node => !nodeIds.includes(node.data.id));

        // 更新两个视图
        if (this.treeInstance) {
            const elements = this.treeInstance.$(`node[id="${nodeIds.join('"],node[id="')}"]`);
            this.treeInstance.remove(elements);
        }
        
        if (this.networkInstance) {
            const elements = this.networkInstance.$(`node[id="${nodeIds.join('"],node[id="')}"]`);
            this.networkInstance.remove(elements);
        }

        // 从选中集合中移除
        nodeIds.forEach(id => this.selectedElements.delete(id));

        // 重新布局
        this.applyLayout();
    };

    /**
     * 删除关系
     */
    module.removeEdges = function(edgeIds) {
        if (!Array.isArray(edgeIds)) {
            edgeIds = [edgeIds];
        }

        // 从数据存储中移除
        this.graphData.edges = this.graphData.edges.filter(edge => !edgeIds.includes(edge.data.id));

        // 更新两个视图
        if (this.treeInstance) {
            const elements = this.treeInstance.$(`edge[id="${edgeIds.join('"],edge[id="')}"]`);
            this.treeInstance.remove(elements);
        }
        
        if (this.networkInstance) {
            const elements = this.networkInstance.$(`edge[id="${edgeIds.join('"],edge[id="')}"]`);
            this.networkInstance.remove(elements);
        }

        // 从选中集合中移除
        edgeIds.forEach(id => this.selectedElements.delete(id));
    };

    /**
     * 清空图表
     */
    module.clearGraph = function() {
        this.graphData.nodes = [];
        this.graphData.edges = [];
        this.selectedElements.clear();

        if (this.treeInstance) {
            this.treeInstance.remove('node, edge');
        }
        
        if (this.networkInstance) {
            this.networkInstance.remove('node, edge');
        }
    };

    /**
     * 应用布局
     */
    module.applyLayout = function() {
        if (this.treeInstance) {
            this.treeInstance.layout(this.layoutSettings.tree).run();
        }
        
        if (this.networkInstance) {
            this.networkInstance.layout(this.layoutSettings.network).run();
        }
    };

    /**
     * 同步选择状态
     */
    module.syncSelection = function(elementId, isSelected) {
        const treeElement = this.treeInstance?.getElementById(elementId);
        const networkElement = this.networkInstance?.getElementById(elementId);

        // 防止循环触发事件
        if (treeElement) {
            treeElement.off('select unselect');
            treeElement.select(isSelected);
            this.setupGraphInteractions(this.treeInstance);
        }

        if (networkElement) {
            networkElement.off('select unselect');
            networkElement.select(isSelected);
            this.setupGraphInteractions(this.networkInstance);
        }
    };

    /**
     * 处理元素选择
     */
    module.handleElementSelection = function(elementId, isSelected) {
        if (isSelected) {
            this.selectedElements.add(elementId);
        } else {
            this.selectedElements.delete(elementId);
        }

        // 同步到两个视图
    };

    /**
     * 创建新节点
     * @param {Object} position - 节点位置
     * @param {string} nodeType - 节点类型
     * @returns {Object} 创建的节点
     */
    module.createNode = function(position, nodeType = 'Generic') {
        const createNodeStartMsg = 'CRITICAL_CREATE_NODE: createNode method called';
        console.log(createNodeStartMsg);
        if (window.debugUtils?.log) {
            window.debugUtils.log(createNodeStartMsg);
        }
        
        const posTypeMsg = `CRITICAL_CREATE_NODE: Position: {x:${position?.x}, y:${position?.y}} Type: ${nodeType}`;
        console.log(posTypeMsg);
        if (window.debugUtils?.log) {
            window.debugUtils.log(posTypeMsg);
        }
        
        // 检查Cytoscape实例状态
        const instancesStatusMsg = `CRITICAL_CREATE_NODE: Current instances - Tree: ${!!this.treeInstance}, Network: ${!!this.networkInstance}`;
        console.log(instancesStatusMsg);
        if (window.debugUtils?.log) {
            window.debugUtils.log(instancesStatusMsg);
        }
        
        try {
            // 确保position是有效的
            if (!position || typeof position.x !== 'number' || typeof position.y !== 'number') {
                console.error('CRITICAL_CREATE_NODE: Invalid position:', position);
                if (window.debugUtils?.error) {
                    window.debugUtils.error('Invalid position');
                }
                return null;
            }
            
            // 获取工具模块
            const utils = neo4jEditor.utils || {};
            const generateId = utils.generateId || window.generateId || function(prefix) {
                return (prefix || 'node') + '_' + Date.now() + '_' + Math.floor(Math.random() * 10000);
            };

            const generateIdMsg = 'CRITICAL_CREATE_NODE: Using generateId function: ' + !!generateId;
                console.log(generateIdMsg);
                if (window.debugUtils?.log) {
                    window.debugUtils.log(generateIdMsg);
                }

            // 创建默认属性对象
            const defaultProperties = {};
            
            // 检查nodeTypeStyles是否存在并应用默认属性
            const nodeTypeConfig = window.nodeTypeStyles && window.nodeTypeStyles[nodeType];
            if (nodeTypeConfig && nodeTypeConfig.properties) {
                const applyConfigMsg = 'CRITICAL_CREATE_NODE: Applying node type config properties';
                console.log(applyConfigMsg);
                if (window.debugUtils?.log) {
                    window.debugUtils.log(applyConfigMsg);
                }
                for (var i = 0; i < nodeTypeConfig.properties.length; i++) {
                    const prop = nodeTypeConfig.properties[i];
                    if (prop.key) {
                        defaultProperties[prop.key] = prop.defaultValue !== undefined ? 
                            prop.defaultValue : (prop.value !== undefined ? prop.value : '');
                    }
                }
            }
            
            // 创建新节点
            const newNode = {
                group: 'nodes',
                data: {
                    id: generateId('node'),
                    label: nodeType,
                    type: nodeType,
                    properties: defaultProperties,
                    labels: [nodeType, 'tree', 'network']
                },
                position: position
            };
            
            const generatedDataMsg = 'CRITICAL_CREATE_NODE: Generated node data with ID: ' + newNode.data.id;
            console.log(generatedDataMsg);
            if (window.debugUtils?.log) {
                window.debugUtils.log(generatedDataMsg);
            }
            
            // 直接尝试添加到Cytoscape实例（如果存在）
            console.log('CRITICAL_CREATE_NODE: Attempting direct addition to Cytoscape instances');
            let addedToAtLeastOne = false;
            
            // 尝试添加到tree实例
            if (this.treeInstance) {
                try {
                    this.treeInstance.add(newNode);
                    const treeAddSuccessMsg = 'CRITICAL_CREATE_NODE: Successfully added to tree instance';
                    console.log(treeAddSuccessMsg);
                    if (window.debugUtils?.log) {
                        window.debugUtils.log(treeAddSuccessMsg);
                    }
                    addedToAtLeastOne = true;
                    // 验证添加是否成功
                    const addedTreeNode = this.treeInstance.getElementById(newNode.data.id);
                    const treeVerifyMsg = `CRITICAL_CREATE_NODE: Tree node verification - found: ${!!addedTreeNode}`;
                    console.log(treeVerifyMsg);
                    if (window.debugUtils?.log) {
                        window.debugUtils.log(treeVerifyMsg);
                    }
                } catch (treeErr) {
                    console.error('CRITICAL_CREATE_NODE: Failed to add to tree instance:', treeErr);
                    if (window.debugUtils?.error) {
                        window.debugUtils.error('Failed to add to tree instance');
                    }
                }
            } else {
                console.warn('CRITICAL_CREATE_NODE: Tree instance not available');
                if (window.debugUtils?.warn) {
                    window.debugUtils.warn('Tree instance not available');
                }
            }
            
            // 尝试添加到network实例
            if (this.networkInstance) {
                try {
                    this.networkInstance.add(newNode);
                    const networkAddSuccessMsg = 'CRITICAL_CREATE_NODE: Successfully added to network instance';
                console.log(networkAddSuccessMsg);
                if (window.debugUtils?.log) {
                    window.debugUtils.log(networkAddSuccessMsg);
                }
                    addedToAtLeastOne = true;
                    // 验证添加是否成功
                    const addedNetworkNode = this.networkInstance.getElementById(newNode.data.id);
                    const networkVerifyMsg = `CRITICAL_CREATE_NODE: Network node verification - found: ${!!addedNetworkNode}`;
                    console.log(networkVerifyMsg);
                    if (window.debugUtils?.log) {
                        window.debugUtils.log(networkVerifyMsg);
                    }
                } catch (networkErr) {
                    console.error('CRITICAL_CREATE_NODE: Failed to add to network instance:', networkErr);
                    if (window.debugUtils?.error) {
                        window.debugUtils.error('Failed to add to network instance');
                    }
                }
            } else {
                console.warn('CRITICAL_CREATE_NODE: Network instance not available');
                if (window.debugUtils?.warn) {
                    window.debugUtils.warn('Network instance not available');
                }
            }
            
            // 传统方式添加
            const standardAddMsg = 'CRITICAL_CREATE_NODE: Calling standard addNodes method';
            console.log(standardAddMsg);
            if (window.debugUtils?.log) {
                window.debugUtils.log(standardAddMsg);
            }
            try {
                this.addNodes(newNode);
                addedToAtLeastOne = true;
            } catch (addErr) {
                console.error('CRITICAL_CREATE_NODE: Failed to add via addNodes method:', addErr);
                if (window.debugUtils?.error) {
                    window.debugUtils.error('Failed to add via addNodes method');
                }
            }
            
            // 触发多个事件系统的节点创建事件
            const emitEventsMsg = 'CRITICAL_CREATE_NODE: Emitting node creation events';
            console.log(emitEventsMsg);
            if (window.debugUtils?.log) {
                window.debugUtils.log(emitEventsMsg);
            }
            
            // eventBus事件
            if (typeof eventBus !== 'undefined' && eventBus.emit) {
                eventBus.emit('graph:node:created', newNode);
                eventBus.emit('data:nodes:add', newNode);
                const eventBusEmittedMsg = 'CRITICAL_CREATE_NODE: Emitted eventBus events';
                console.log(eventBusEmittedMsg);
                if (window.debugUtils?.log) {
                    window.debugUtils.log(eventBusEmittedMsg);
                }
            }
            
            // DOM事件
            const nodeCreatedEvent = new CustomEvent('graph:node:created', { detail: newNode });
            document.dispatchEvent(nodeCreatedEvent);
            
            const nodesAddEvent = new CustomEvent('data:nodes:add', { detail: newNode });
            document.dispatchEvent(nodesAddEvent);
            const domEmittedMsg = 'CRITICAL_CREATE_NODE: Emitted DOM events';
                console.log(domEmittedMsg);
                if (window.debugUtils?.log) {
                    window.debugUtils.log(domEmittedMsg);
                }
            
            // neo4jEditor.eventManager事件
            if (typeof neo4jEditor !== 'undefined' && neo4jEditor.eventManager && neo4jEditor.eventManager.emit) {
                neo4jEditor.eventManager.emit('graph:node:created', { data: newNode });
                neo4jEditor.eventManager.emit('data:nodes:add', { data: newNode });
                const managerEmittedMsg = 'CRITICAL_CREATE_NODE: Emitted neo4jEditor.eventManager events';
                console.log(managerEmittedMsg);
                if (window.debugUtils?.log) {
                    window.debugUtils.log(managerEmittedMsg);
                }
            }
            
            // 如果添加失败，尝试最后的备用方案
            if (!addedToAtLeastOne) {
                const fallbackMsg = 'CRITICAL_CREATE_NODE: Warning - node not added to any view, adding to data store only';
                console.warn(fallbackMsg);
                if (window.debugUtils?.log) {
                    window.debugUtils.log(fallbackMsg);
                }
                // 至少添加到数据存储
                if (!this.graphData.nodes) {
                    this.graphData.nodes = [];
                }
                this.graphData.nodes.push(newNode);
            }
            
            const creationCompleteMsg = 'CRITICAL_CREATE_NODE: Node creation completed successfully';
            console.log(creationCompleteMsg);
            if (window.debugUtils?.log) {
                window.debugUtils.log(creationCompleteMsg);
            }
            return newNode;
        } catch (error) {
            console.error('CRITICAL_ERROR: Error in createNode method:', error);
            if (window.debugUtils?.error) {
                window.debugUtils.error('Error in createNode method');
            }
            // 即使出错也要返回基本节点对象
            return {
                group: 'nodes',
                data: {
                    id: 'error-node-' + Date.now(),
                    label: nodeType,
                    type: nodeType,
                    properties: {},
                    labels: [nodeType]
                },
                position: position || { x: 0, y: 0 }
            };
        }
    };

    /**
     * 处理节点创建点击事件
     * @param {Object} instance - Cytoscape实例
     * @param {Object} event - 点击事件
     */
    module.handleNodeCreationTap = function(instance, event) {
        const handlerCalledMsg = 'CRITICAL_NODE_CREATION_TAP: handleNodeCreationTap called';
        console.log(handlerCalledMsg);
        if (window.debugUtils?.log) {
            window.debugUtils.log(handlerCalledMsg);
        }
        
        try {
            // 获取点击位置
            const position = event.position || event.cyPosition;
            if (!position) {
                console.error('CRITICAL_NODE_CREATION_TAP: No position information in event');
                return;
            }
            
            const positionMsg = `CRITICAL_NODE_CREATION_TAP: Tap position: {x:${position.x}, y:${position.y}}`;
            console.log(positionMsg);
            if (window.debugUtils?.log) {
                window.debugUtils.log(positionMsg);
            }
            const currentModeTapMsg = 'CRITICAL_NODE_CREATION_TAP: Current mode: ' + window.currentMode;
            console.log(currentModeTapMsg);
            if (window.debugUtils?.log) {
                window.debugUtils.log(currentModeTapMsg);
            }
            
            // 使用graphManager中的currentNodeType
            let nodeType = this.currentNodeType || 'Generic';
            const nodeTypeTapMsg = 'CRITICAL_NODE_CREATION_TAP: Using node type: ' + nodeType;
            console.log(nodeTypeTapMsg);
            if (window.debugUtils?.log) {
                window.debugUtils.log(nodeTypeTapMsg);
            }
            
            // 额外验证window.currentMode
            if (window.currentMode !== 'node') {
                const modeWarningMsg = 'CRITICAL_NODE_CREATION_TAP: Warning - called but currentMode is not "node"';
                console.warn(modeWarningMsg);
                if (window.debugUtils?.log) {
                    window.debugUtils.log(modeWarningMsg);
                }
                // 仍然尝试创建节点，因为可能是通过其他路径触发的
            }
            
            // 创建节点
            const callCreateNodeMsg = 'CRITICAL_NODE_CREATION_TAP: Calling createNode method';
            console.log(callCreateNodeMsg);
            if (window.debugUtils?.log) {
                window.debugUtils.log(callCreateNodeMsg);
            }
            const newNode = this.createNode(position, nodeType);
            
            if (newNode) {
                const nodeCreatedSuccessMsg = `CRITICAL_NODE_CREATION_TAP: Successfully created node: ${newNode.data.id} with type: ${nodeType}`;
                console.log(nodeCreatedSuccessMsg);
                if (window.debugUtils?.log) {
                    window.debugUtils.log(nodeCreatedSuccessMsg);
                }
                // 显示成功提示
                const utils = neo4jEditor.utils || {};
                if (utils.showToast || window.showToast) {
                    (utils.showToast || window.showToast)('Created node of type: ' + nodeType, 'success');
                }
                
                // 手动添加到视图（作为备用机制）
                if (instance) {
                    try {
                        instance.add(newNode);
                        const manualAddMsg = 'CRITICAL_NODE_CREATION_TAP: Manually added node to Cytoscape instance';
                        console.log(manualAddMsg);
                        if (window.debugUtils?.log) {
                            window.debugUtils.log(manualAddMsg);
                        }
                    } catch (addErr) {
                        const manualAddFailMsg = 'CRITICAL_NODE_CREATION_TAP: Failed to manually add to instance';
                        console.warn(manualAddFailMsg, addErr);
                        if (window.debugUtils?.log) {
                            window.debugUtils.log(manualAddFailMsg);
                        }
                    }
                }
            } else {
                const creationFailMsg = 'CRITICAL_NODE_CREATION_TAP: Failed to create node';
                console.error(creationFailMsg);
                if (window.debugUtils?.log) {
                    window.debugUtils.log(creationFailMsg);
                }
                const utils = neo4jEditor.utils || {};
                if (utils.showToast || window.showToast) {
                    (utils.showToast || window.showToast)('Failed to add node to views', 'error');
                }
            }
        } catch (error) {
            console.error('CRITICAL_NODE_CREATION_TAP: Error in handleNodeCreationTap:', error);
            // 即使出错也尝试通过DOM直接创建节点（最终备用方案）
            try {
                const position = event.position || event.cyPosition;
                if (position) {
                    const nodeType = this.currentNodeType || 'Generic';
                    const fallbackCreationMsg = 'CRITICAL_NODE_CREATION_TAP: Trying final fallback creation method';
                    console.log(fallbackCreationMsg);
                    if (window.debugUtils?.log) {
                        window.debugUtils.log(fallbackCreationMsg);
                    }
                    
                    // 创建节点元素
                    const nodeId = 'fallback-node-' + Date.now();
                    // 检查当前是树视图还是网络图视图
                    const isTreeView = instance === this.treeInstance;
                    const containerId = isTreeView ? 'cy-tree' : 'cy-network';
                    const rect = document.getElementById(containerId)?.getBoundingClientRect();
                    if (rect) {
                        const fallbackCreatedMsg = 'CRITICAL_NODE_CREATION_TAP: Created fallback node reference: ' + nodeId + ' in ' + containerId;
                        console.log(fallbackCreatedMsg);
                        if (window.debugUtils?.log) {
                            window.debugUtils.log(fallbackCreatedMsg);
                        }
                    }
                }
            } catch (fallbackErr) {
                console.error('CRITICAL_NODE_CREATION_TAP: Fallback creation also failed:', fallbackErr);
            }
        }
    };

    /**
     * 为特定视图重新安装点击监听器
     * @param {Object} instance - Cytoscape实例
     * @param {string} viewName - 视图名称
     */
    module.reinstallListener = function(instance, viewName) {
        console.log('CRITICAL_DEBUG_ENTRY: reinstallListener called for', viewName, 'view');
        console.log('CRITICAL_DEBUG_REINSTALL: Current window.currentMode:', window.currentMode);
        console.log('CRITICAL_DEBUG_REINSTALL: Instance exists:', !!instance);
        
        // 即使instance不存在，也尝试直接为DOM元素添加监听器
        const containerId = viewName === 'Tree' ? 'cy-tree' : 'cy-network';
        const container = document.getElementById(containerId);
        
        if (container) {
            console.log('CRITICAL_REINSTALL_VIEW: Container element found for', viewName, 'view:', containerId);
            // 移除旧的直接监听器
            if (container._directCaptureListener) {
                container.removeEventListener('click', container._directCaptureListener, true);
                console.log('CRITICAL_DEBUG_REINSTALL: Removed existing capture listener');
            }
            if (container._directBubbleListener) {
                container.removeEventListener('click', container._directBubbleListener, false);
                console.log('CRITICAL_DEBUG_REINSTALL: Removed existing bubble listener');
            }
            if (container._directClickListener) {
                container.removeEventListener('click', container._directClickListener, true);
                container.removeEventListener('click', container._directClickListener, false);
                console.log('CRITICAL_DEBUG_REINSTALL: Removed legacy direct listener');
            }
            
            // 添加新的直接点击监听器 - 使用冒泡阶段
            container._directClickListener = function(e) {
                console.log('CRITICAL_REINSTALL_VIEW: Direct container click for', viewName, 'view');
                console.log('CRITICAL_REINSTALL_VIEW: Event details:', { target: e.target.id, currentMode: window.currentMode });
                
                // 如果在节点模式下，直接尝试创建节点
                if (window.currentMode === 'node') {
                    console.log('CRITICAL_REINSTALL_VIEW: In node mode, creating node directly');
                    
                    const rect = container.getBoundingClientRect();
                    const position = {
                        x: e.clientX - rect.left,
                        y: e.clientY - rect.top
                    };
                    
                    console.log('CRITICAL_REINSTALL_VIEW: Direct container click position:', position);
                    
                    try {
                        const newNode = neo4jEditor.graphManager.createNode(position, neo4jEditor.graphManager.currentNodeType);
                        console.log('CRITICAL_REINSTALL_VIEW: Direct node creation result:', newNode?.data?.id);
                    } catch (err) {
                        const directCreationFailMsg = 'CRITICAL_REINSTALL_VIEW: Direct node creation failed';
                console.error(directCreationFailMsg, err);
                if (window.debugUtils?.error) {
                    window.debugUtils.error(directCreationFailMsg);
                }
                    }
                }
            };
            
            // 使用冒泡阶段而不是捕获阶段
            container.addEventListener('click', container._directClickListener, false);
            console.log('CRITICAL_REINSTALL_VIEW: Added direct click listener to container', containerId, 'in bubbling phase');
        } else {
            console.warn('CRITICAL_REINSTALL_VIEW: Container element not found for', viewName, 'view');
        }
        
        // 继续处理Cytoscape实例（如果存在）
        if (!instance) {
            console.warn('CRITICAL_REINSTALL_VIEW: No Cytoscape instance provided for', viewName, 'view');
            return;
        }
        
        try {
            console.log('CRITICAL_REINSTALL_VIEW: Processing Cytoscape instance for', viewName, 'view');
            
            // 移除现有的监听器
            console.log('CRITICAL_REINSTALL_VIEW: Removing existing event listeners');
            instance.off('tap');
            instance.off('tapselect');
            instance.off('click');
            
            // 添加调试用的mousedown事件监听器
            instance.on('mousedown', function(event) {
                console.log('CRITICAL_CY_MOUSEDOWN: Mousedown event captured for', viewName, 'view');
                console.log('CRITICAL_CY_MOUSEDOWN: Event details:', { 
                    target: event.target === instance ? 'canvas' : 'element',
                    currentMode: window.currentMode,
                    position: event.position
                });
            });
            
            // 添加统一的tap事件监听器，根据模式执行不同操作
            instance.on('tap', function(event) {
                // 记录所有tap事件
                console.log('CRITICAL_CY_TAP: Cytoscape tap event for', viewName, 'view:', { 
                    target: event.target === instance ? 'canvas' : 'element',
                    currentMode: window.currentMode
                });
                console.log('CRITICAL_CY_TAP: Event details:', { position: event.position, cyPosition: event.cyPosition });
                
                // 根据当前模式处理事件
                const currentMode = window.currentMode || 'select';
                if (currentMode === 'node') {
                    const target = event.target;
                    console.log('CRITICAL_CY_NODE_MODE: Tap event in node mode, target:', target === instance ? 'canvas background' : 'element');
                    // 只有点击背景时才创建节点
                    if (target === instance) {
                        console.log('CRITICAL_CY_NODE_MODE: Background tapped, calling handleNodeCreationTap');
                        neo4jEditor.graphManager.handleNodeCreationTap(instance, event);
                    }
                } else if (currentMode === 'relationship') {
                    const target = event.target;
                    // 检查是否是节点
                    if (target && typeof target.isNode === 'function' && target.isNode()) {
                        // 实现关系创建逻辑
                        console.log('CRITICAL_CY_REL_MODE: Node clicked in relationship mode:', target.id());
                        
                        // 确保节点被选择
                        if (target.select) {
                            target.select();
                        }
                        
                        // 手动触发选择事件，确保选择状态同步
                        const selectEvent = new CustomEvent('select', { bubbles: true });
                        target.trigger('select');
                        
                        // 手动添加到选中元素集合
                        if (neo4jEditor && neo4jEditor.graphManager && neo4jEditor.graphManager.selectedElements) {
                            neo4jEditor.graphManager.selectedElements.add(target.id());
                            // 同步选择到另一个视图
                            neo4jEditor.graphManager.syncSelection(target.id(), true);
                        }
                        
                        // 触发选中事件
                        eventBus.emit('graph:element:selected', { id: target.id(), data: target.data() });
                        
                        // 直接在graphManager中实现关系创建逻辑
                        if (!window.sourceNode) {
                            // 第一次点击 - 设置源节点
                            window.sourceNode = target.id();
                            console.log('CRITICAL_CY_REL_MODE: 设置源节点:', window.sourceNode);
                            // 高亮源节点（已在上面处理）
                            // 显示提示
                            if (window.showToast) {
                                window.showToast('源节点已选择，点击目标节点创建关系');
                            } else {
                                console.log('源节点已选择，点击目标节点创建关系');
                            }
                        } else if (window.sourceNode !== target.id()) {
                            // 第二次点击 - 创建关系
                            console.log('CRITICAL_CY_REL_MODE: 创建关系从节点', window.sourceNode, '到节点', target.id());
                            
                            // 创建关系数据
                            const relationshipData = {
                                source: window.sourceNode,
                                target: target.id(),
                                data: {
                                    id: 'rel_' + Date.now() + '_' + Math.floor(Math.random() * 10000),
                                    label: 'RELATES_TO',
                                    type: window.selectedRelationshipType || 'default'
                                }
                            };
                            
                            // 使用window.createRelationship函数或直接添加到图表
                            if (typeof window.createRelationship === 'function') {
                                console.log('CRITICAL_CY_REL_MODE: 调用window.createRelationship:', relationshipData);
                                window.createRelationship(relationshipData);
                            } else if (typeof neo4jEditor.graphManager.addEdges === 'function') {
                                console.log('CRITICAL_CY_REL_MODE: 调用addEdges方法:', relationshipData);
                                neo4jEditor.graphManager.addEdges({ group: 'edges', data: relationshipData.data });
                            }
                            
                            // 显示成功消息
                            if (window.showToast) {
                                window.showToast('关系创建成功！');
                            } else {
                                console.log('关系创建成功！');
                            }
                            
                            // 重置源节点
                            window.sourceNode = null;
                            
                            // 清除所有选择
                            if (instance) {
                                instance.elements().unselect();
                            }
                            // 清空选中元素集合
                            if (neo4jEditor && neo4jEditor.graphManager && neo4jEditor.graphManager.selectedElements) {
                                neo4jEditor.graphManager.selectedElements.clear();
                            }
                        } else {
                            // 点击同一个节点
                            console.log('CRITICAL_CY_REL_MODE: 点击了相同的节点，不创建自环关系');
                            if (window.showToast) {
                                window.showToast('不能创建自环关系');
                            } else {
                                console.log('不能创建自环关系');
                            }
                        }
                        
                        // 仍然发出事件以供其他模块使用
                        eventBus.emit('graph:relationship:creation:nodeclick', { id: target.id() });
                    }
                }
            });
            
            // 保留click事件调试日志
            instance.on('click', function(event) {
                console.log('CRITICAL_CY_CLICK: Cytoscape click event for', viewName, 'view:', { 
                    target: event.target === instance ? 'canvas' : 'element',
                    currentMode: window.currentMode
                });
            });
            
            // 根据当前模式设置交互
            const currentMode = window.currentMode || 'select';
            console.log('CRITICAL_REINSTALL_VIEW: Current mode for', viewName, 'view:', currentMode);
            
            // 对于选择模式，设置默认交互
            if (currentMode === 'select') {
                console.log('CRITICAL_CY_SELECT_MODE: Setting up default interactions for', viewName, 'view in select mode');
                try {
                    neo4jEditor.graphManager.setupGraphInteractions(instance);
                } catch (err) {
                    console.error('CRITICAL_ERROR: Failed to setup graph interactions:', err);
                }
            }
            
            console.log('CRITICAL_REINSTALL_VIEW: Completed listener setup for', viewName, 'view');
        } catch (err) {
            console.error('CRITICAL_ERROR: Error reinstalling tap listener for', viewName, 'view:', err);
        }
    };

    /**
     * 重置所有点击监听器
     */
    module.reinstallAllTapListeners = function() {
        const reinstallStartMsg = 'CRITICAL_DEBUG_ENTRY: reinstallAllTapListeners called';
        console.log(reinstallStartMsg);
        if (window.debugUtils?.log) {
            window.debugUtils.log(reinstallStartMsg);
        }
        
        const reinstallModeMsg = 'CRITICAL_REINSTALL_ALL: Current window.currentMode: ' + window.currentMode;
        console.log(reinstallModeMsg);
        if (window.debugUtils?.log) {
            window.debugUtils.log(reinstallModeMsg);
        }
        
        // 验证graphManager实例
        console.log('CRITICAL_DEBUG_INSTANCE: neo4jEditor.graphManager exists:', !!neo4jEditor.graphManager);
        
        // 为各个视图重新安装监听器
        console.log('CRITICAL_REINSTALL_ALL: Reinstalling Tree view listeners');
        this.reinstallListener(this.treeInstance, 'Tree');
        
        console.log('CRITICAL_REINSTALL_ALL: Reinstalling Network view listeners');
        this.reinstallListener(this.networkInstance, 'Network');
        
        // 重新添加全局点击监听
        console.log('CRITICAL_REINSTALL_ALL: Re-adding global click listeners');
        this.addGlobalClickListeners();
        
        // 添加一个临时的调试监听器（持续5秒），用于验证点击是否能被捕获
        const tempClickListener = function(e) {
            console.log('CRITICAL_DEBUG_CLICK: Temporary debug click captured:', { target: e.target.tagName, id: e.target.id, currentMode: window.currentMode });
        };
        
        document.addEventListener('click', tempClickListener);
        setTimeout(() => {
            document.removeEventListener('click', tempClickListener);
            console.log('CRITICAL_REINSTALL_ALL: Temporary debug click listener removed');
        }, 5000);
        
        console.log('CRITICAL_REINSTALL_ALL: All listeners reinstalled, temporary debug listener active for 5 seconds');
    };
    
    /**
     * 添加全局点击事件监听器
     */
    module.addGlobalClickListeners = function() {
        console.log('CRITICAL_DEBUG_ENTRY: addGlobalClickListeners called');
        
        // 添加全局mousedown监听器用于调试
        document.addEventListener('mousedown', function(e) {
            console.log('CRITICAL_GLOBAL_MOUSEDOWN: Global mousedown detected on', e.target.tagName, 'id:', e.target.id);
        }, true); // 捕获阶段
        
        // 移除之前可能存在的监听器，避免重复
        document.removeEventListener('click', this.globalDocumentClickHandler, true); // 先移除捕获阶段的
        document.removeEventListener('click', this.globalDocumentClickHandler, false); // 再移除冒泡阶段的
        
        // 保存this引用
        const self = this;
        
        // 创建并保存全局点击处理函数
        this.globalDocumentClickHandler = function(event) {
            console.log('CRITICAL_GLOBAL_CLICK_HANDLER: Global document click event detected', { 
                target: event.target.tagName,
                id: event.target.id,
                currentMode: window.currentMode
            });
            console.log('CRITICAL_GLOBAL_CLICK_HANDLER: Event phase:', event.eventPhase === 1 ? 'capture' : event.eventPhase === 2 ? 'target' : 'bubble');
            
            // 检查点击是否发生在图表容器内
            const treeContainer = document.getElementById('cy-tree');
            const networkContainer = document.getElementById('cy-network');
            const isInTree = treeContainer?.contains(event.target);
            const isInNetwork = networkContainer?.contains(event.target);
            
            console.log('CRITICAL_GLOBAL_CLICK_HANDLER: Click in tree:', isInTree, 'click in network:', isInNetwork);
            
            if (isInTree || isInNetwork) {
                console.log('CRITICAL_GLOBAL_CLICK_HANDLER: Click inside graph container, current mode:', window.currentMode);
                
                // 如果在节点模式下，可以直接尝试创建节点（作为备用机制）
                if (window.currentMode === 'node') {
                    console.log('CRITICAL_GLOBAL_CLICK_HANDLER: In node mode, attempting direct node creation');
                    
                    try {
                        // 获取点击位置（相对于容器）
                        const container = isInTree ? treeContainer : networkContainer;
                        const rect = container.getBoundingClientRect();
                        const position = {
                            x: event.clientX - rect.left,
                            y: event.clientY - rect.top
                        };
                        
                        console.log('CRITICAL_GLOBAL_CLICK_HANDLER: Calculated position:', position);
                        
                        // 直接调用createNode方法（不依赖于Cytoscape实例）
                        console.log('CRITICAL_GLOBAL_CLICK_HANDLER: Directly calling createNode method');
                        const newNode = self.createNode(position, self.currentNodeType);
                        console.log('CRITICAL_GLOBAL_CLICK_HANDLER: Node creation result:', newNode?.data?.id);
                        
                    } catch (err) {
                        console.error('CRITICAL_GLOBAL_CLICK_HANDLER: Failed to create node:', err);
                    }
                }
            }
        };
        
        // 添加全局点击监听器 - 使用冒泡阶段而不是捕获阶段
        document.addEventListener('click', this.globalDocumentClickHandler, false);
        console.log('CRITICAL_GLOBAL_LISTENERS: Added global document click handler in bubbling phase');
        
        // 为图表容器添加特定的点击监听器
        const addContainerClickListener = function(containerId) {
            const container = document.getElementById(containerId);
            if (container) {
                console.log('CRITICAL_GLOBAL_LISTENERS: Adding click listener to container:', containerId);
                // 移除可能存在的监听器
                container.removeEventListener('click', container.clickHandler, true); // 先移除捕获阶段的
                container.removeEventListener('click', container.clickHandler, false); // 再移除冒泡阶段的
                
                // 添加新的监听器
                container.clickHandler = function(event) {
                    console.log(`CRITICAL_CONTAINER_CLICK: Container ${containerId} click event detected`);
                    console.log(`CRITICAL_CONTAINER_CLICK: Current mode:`, window.currentMode);
                    
                    // 在节点模式下直接创建节点
                    if (window.currentMode === 'node') {
                        console.log(`CRITICAL_CONTAINER_CLICK: Node mode detected in container ${containerId}`);
                        
                        try {
                            const rect = container.getBoundingClientRect();
                            const position = {
                                x: event.clientX - rect.left,
                                y: event.clientY - rect.top
                            };
                            
                            console.log(`CRITICAL_CONTAINER_CLICK: Container ${containerId} click position:`, position);
                            const newNode = self.createNode(position, self.currentNodeType);
                            console.log(`CRITICAL_CONTAINER_CLICK: Node created in container ${containerId}:`, newNode?.data?.id);
                        } catch (err) {
                            console.error(`CRITICAL_CONTAINER_CLICK: Failed to create node in container ${containerId}:`, err);
                        }
                    }
                    
                    // 不阻止冒泡，让document监听器也能捕获
                };
                // 使用冒泡阶段而不是捕获阶段
                container.addEventListener('click', container.clickHandler, false);
            } else {
                console.warn(`CRITICAL_GLOBAL_LISTENERS: Container ${containerId} not found`);
            }
        };
        
        addContainerClickListener('cy-tree');
        addContainerClickListener('cy-network');
        
        console.log('CRITICAL_GLOBAL_LISTENERS: All container click listeners added in bubbling phase');
    };

    /**
        this.syncSelection(elementId, isSelected);
    };

    /**
     * 获取选中的元素
     */
    module.getSelectedElements = function() {
        return Array.from(this.selectedElements);
    };

    /**
     * 清除所有选择
     */
    module.clearSelection = function() {
        this.treeInstance?.unselect();
        this.networkInstance?.unselect();
        this.selectedElements.clear();
    };

    /**
     * 更新图表设置
     */
    module.updateGraphSettings = function(settings) {
        // 更新布局设置
        if (settings.treeLayout) {
            this.layoutSettings.tree = { ...this.layoutSettings.tree, ...settings.treeLayout };
        }
        
        if (settings.networkLayout) {
            this.layoutSettings.network = { ...this.layoutSettings.network, ...settings.networkLayout };
        }

        // 重新应用布局
        this.applyLayout();
    };

    /**
     * 导出图表数据
     */
    module.exportGraphData = function() {
        return {
            nodes: this.graphData.nodes,
            edges: this.graphData.edges
        };
    };

    /**
     * 导入图表数据
     */
    module.importGraphData = function(data) {
        if (!data || !data.nodes || !data.edges) {
            console.error('Invalid graph data format');
            return false;
        }

        // 清空现有数据
        this.clearGraph();

        // 添加新数据
        this.graphData = { ...data };

        // 更新视图
        if (this.treeInstance) {
            this.treeInstance.add(data.nodes);
            this.treeInstance.add(data.edges);
        }
        
        if (this.networkInstance) {
            this.networkInstance.add(data.nodes);
            this.networkInstance.add(data.edges);
        }

        // 应用布局
        this.applyLayout();

        return true;
    };

    return module;
});