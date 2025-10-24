/**
 * 应用初始化模块
 */

// 应用初始化模块 - 使用utils.js中定义的核心函数
console.log('Neo4j Editor: init.js loading');

// 确保核心函数可用
function ensureCoreFunctions() {
    const requiredFunctions = ['showToast', 'debugLog', 'handleError'];
    const missingFunctions = requiredFunctions.filter(fn => typeof window[fn] !== 'function');
    
    if (missingFunctions.length > 0) {
        console.warn(`Neo4j Editor: Missing core functions: ${missingFunctions.join(', ')}`);
        
        // 作为后备，定义最小化版本
        if (typeof window.showToast !== 'function') {
            window.showToast = (message) => { alert(message || '操作成功'); return true; };
        }
        if (typeof window.debugLog !== 'function') {
            window.debugLog = (message) => { console.log('Neo4j Editor:', message); return true; };
        }
        if (typeof window.handleError !== 'function') {
            window.handleError = (title, error) => {
                console.error('Error:', title, error);
                alert((title || '错误') + ': ' + (error instanceof Error ? error.message : String(error)));
                return true;
            };
        }
    }
}

// 确保核心函数可用
ensureCoreFunctions();

// 添加缺失的checkAllElementsExist函数
function checkAllElementsExist(elementIds) {
    console.log('Checking if all elements exist:', elementIds);
    try {
        return elementIds.every(id => {
            const element = document.getElementById(id);
            const exists = element !== null;
            if (!exists) {
                console.warn(`Element ${id} not found`);
            }
            return exists;
        });
    } catch (e) {
        console.error('Error checking elements:', e);
        return false;
    }
}

// 添加debugLog函数
function debugLog(message) {
    console.log('DEBUG:', message);
}

// 确保全局可用
window.checkAllElementsExist = checkAllElementsExist;
window.debugLog = debugLog;

// 全局变量
window.sharedGraphData = { selectedElement: null };
window.currentMode = 'select';

// 确保全局变量存在
console.log('Initializing global variables in init.js - START');
console.log('Current window.nodeTypeStyles before init:', window.nodeTypeStyles);
console.log('Current window.relationshipTypeStyles before init:', window.relationshipTypeStyles);

// 优先使用全局loadNodeTypeStyles函数加载节点类型
if (typeof window.loadNodeTypeStyles === 'function') {
    console.log('Calling window.loadNodeTypeStyles() in init.js');
    try {
        const loadedStyles = window.loadNodeTypeStyles();
        console.log('Loaded node type styles:', loadedStyles);
        if (loadedStyles && typeof loadedStyles === 'object') {
            window.nodeTypeStyles = loadedStyles;
            console.log('Node type styles updated successfully in init.js:', window.nodeTypeStyles);
            
            // 常量不能重新赋值，我们直接使用window.nodeTypeStyles即可
            console.log('Using window.nodeTypeStyles directly instead of updating local constant');
        }
    } catch (error) {
        console.error('Error loading node type styles in init.js:', error);
    }
} else {
    console.warn('window.loadNodeTypeStyles not available in init.js');
    window.nodeTypeStyles = window.nodeTypeStyles || {};
}

// 初始化关系类型
if (typeof window.relationshipTypeStyles === 'undefined') {
    console.log('Initializing relationshipTypeStyles in init.js');
    window.relationshipTypeStyles = {};
}

console.log('Global variables initialized in init.js - END');

// 检查全局函数是否存在
console.log('Init.js: Checking global functions...');
if (typeof window.deleteNodeType !== 'function') {
    console.warn('deleteNodeType function not found in window');
} else {
    console.log('deleteNodeType function exists in window');
}

if (typeof window.saveNodeTypeStyles !== 'function') {
    console.warn('saveNodeTypeStyles function not found in window');
} else {
    console.log('saveNodeTypeStyles function exists in window');
}

if (typeof window.loadNodeTypeStyles !== 'function') {
    console.warn('loadNodeTypeStyles function not found in window');
} else {
    console.log('loadNodeTypeStyles function exists in window');
}

/**
 * 初始化应用
 */
window.initializeApp = async function() {
    console.log('Init.js: Initializing Neo4j Editor...');
    
    try {
        // 检查并初始化Cytoscape实例
        await checkAndInitialize(5);
        
        // 安装事件监听器
        installEventListeners();
        
        // 初始化模式为选择模式
        setMode('select');
        
        // 设置调试面板
        setupDebugPanel();
        
        // 显式调用全局loadNodeTypeStyles如果可用
        if (typeof window.loadNodeTypeStyles === 'function' && (!window.nodeTypeStyles || Object.keys(window.nodeTypeStyles).length === 0)) {
            console.log('Init.js: Calling window.loadNodeTypeStyles() to load saved node types');
            window.nodeTypeStyles = window.loadNodeTypeStyles();
            console.log('Init.js: Loaded nodeTypeStyles:', window.nodeTypeStyles);
        }
        
        // 确保initializeTypeButtons函数被调用
        if (typeof window.initializeTypeButtons === 'function') {
            console.log('Init.js: Calling window.initializeTypeButtons()');
            window.initializeTypeButtons();
        } else if (typeof initializeTypeButtons === 'function') {
            console.log('Init.js: Calling local initializeTypeButtons()');
            initializeTypeButtons();
        }
        
        // 不使用弹窗，只记录日志
        console.log('Neo4j Editor 已成功初始化');
        
        // 使用安全的日志函数
        if (typeof safeDebugLog === 'function') {
            safeDebugLog('Application initialized successfully');
        } else {
            console.log('Neo4j Editor: Application initialized successfully');
        }
        
    } catch (error) {
        // 使用安全的错误处理函数
        if (typeof safeHandleError === 'function') {
            safeHandleError('应用初始化失败:', error);
        } else {
            console.error('Error: 应用初始化失败:', error);
        }
        // 不使用弹窗，只记录日志
        console.log('初始化失败，请刷新页面重试');
    }
}

// 确保节点类型和关系类型变量可用
function ensureTypeVariables() {
    console.log('Init.js: ensureTypeVariables() called');
    
    if (!window.nodeTypeStyles) {
        console.log('Init.js: nodeTypeStyles not found in window, initializing');
        // 使用loadNodeTypeStyles函数加载默认节点类型，如果可用
        if (typeof window.loadNodeTypeStyles === 'function') {
            console.log('Init.js: window.loadNodeTypeStyles() available, loading node types');
            window.nodeTypeStyles = window.loadNodeTypeStyles();
            console.log('Init.js: Loaded nodeTypeStyles:', window.nodeTypeStyles);
        } else {
            console.log('Init.js: window.loadNodeTypeStyles() not available, using empty object');
            window.nodeTypeStyles = {};
        }
    } else {
        console.log('Init.js: nodeTypeStyles already exists in window:', window.nodeTypeStyles);
    }
    
    if (!window.relationshipTypeStyles) {
        console.log('Init.js: relationshipTypeStyles not found, initializing empty object');
        window.relationshipTypeStyles = {};
    } else {
        console.log('Init.js: relationshipTypeStyles already exists:', window.relationshipTypeStyles);
    }
}

// 确保cytoscape实例正确初始化
function checkCytoscapeInstance() {
    console.log('Init.js: Checking cytoscape instance...');
    if (typeof window.cy === 'undefined') {
        console.warn('Cytoscape instance not initialized');
    } else {
        console.log('Cytoscape instance exists');
        // 调用更全面的右键监控设置函数
        setupCanvasRightClickMonitoring();
    }
}

// 监控画布右键事件 - 更全面的监控
console.log('Setting up canvas right-click event monitoring in init.js');
let canvasRetryCount = 0;
const MAX_CANVAS_RETRIES = 10;

function setupCanvasRightClickMonitoring() {
    // 检查是否有多个canvas实例
    const hasCyTree = typeof window.cyTree !== 'undefined' && window.cyTree;
    const hasCyNetwork = typeof window.cyNetwork !== 'undefined' && window.cyNetwork;
    
    if (window.cy || hasCyTree || hasCyNetwork) {
        console.log('Canvas object available, setting up event listeners');
        
        // 为每个可用的canvas实例设置监听器
        const canvasInstances = [];
        if (window.cy) canvasInstances.push({ name: 'main', instance: window.cy });
        if (hasCyTree) canvasInstances.push({ name: 'tree', instance: window.cyTree });
        if (hasCyNetwork) canvasInstances.push({ name: 'network', instance: window.cyNetwork });
        
        canvasInstances.forEach(({ name, instance }) => {
            console.log(`Setting up event listeners for ${name} canvas`);
            
            // 移除可能存在的旧监听器，避免重复
            instance.off('cxttap');
            instance.off('cxttapend');
            instance.off('contextmenu');
            instance.off('tap');
            
            // 添加右键相关事件监听
            instance.on('cxttap', function(e) {
                console.log(`${name} canvas right-click (cxttap) detected`);
            });
            
            instance.on('cxttapend', function(e) {
                console.log(`${name} canvas right-click ended (cxttapend) detected`);
            });
            
            // 同时监听原生右键菜单事件
            instance.on('contextmenu', function(e) {
                console.log(`${name} canvas native contextmenu event detected`);
                // 注意：这里不阻止默认行为，让画布的右键菜单正常工作
            });
            
            // 监听普通点击，确保画布交互正常
            instance.on('tap', function(e) {
                console.log(`${name} canvas tap event detected`);
            });
        });
    } else {
        canvasRetryCount++;
        if (canvasRetryCount <= MAX_CANVAS_RETRIES) {
            console.warn(`Canvas object not available yet (attempt ${canvasRetryCount}/${MAX_CANVAS_RETRIES}), will retry later`);
            // 稍后重试，每次间隔增加一些时间
            setTimeout(setupCanvasRightClickMonitoring, 500 * canvasRetryCount);
        } else {
            console.warn(`Maximum canvas initialization retries (${MAX_CANVAS_RETRIES}) reached, giving up`);
            // 检查是否有canvas容器
            const hasCanvasContainer = document.getElementById('cy-tree') || document.getElementById('cy-network');
            console.log('Canvas containers check:', { hasTree: !!document.getElementById('cy-tree'), hasNetwork: !!document.getElementById('cy-network') });
        }
    }
}

/**
 * 安全地调用日志函数
 * @param {string} message - 日志消息
 */
function safeDebugLog(message) {
    try {
        if (typeof window.debugLog === 'function') {
            return window.debugLog(message);
        } else if (typeof debugLog === 'function') {
            return debugLog(message);
        }
        console.log('Neo4j Editor:', message);
        return true;
    } catch (e) {
        console.error('Failed to log message:', e);
        return false;
    }
}

/**
 * 安全地调用错误处理函数
 * @param {string} title - 错误标题
 * @param {Error|string} error - 错误对象或消息
 */
function safeHandleError(title, error) {
    try {
        if (typeof window.handleError === 'function') {
            return window.handleError(title, error);
        } else if (typeof handleError === 'function') {
            return handleError(title, error);
        }
        console.error('Error:', title, error);
        return true;
    } catch (e) {
        console.error('Failed to handle error:', e);
        return false;
    }
}

/**
 * 检查并初始化Cytoscape实例
 * @param {number} maxAttempts - 最大尝试次数
 */
function checkAndInitialize(maxAttempts) {
    let attempts = 0;
    
    const checkInterval = setInterval(() => {
        attempts++;
        
        console.log(`Neo4j Editor: Attempting to initialize (${attempts}/${maxAttempts})`);
        
        // 检查必要的DOM元素是否存在 - 使用HTML中实际存在的元素ID
        const requiredElements = [
            'cy-tree', 'cy-network', 'tree-container', 'network-container'
        ];
        
        // 检查面板容器是否存在（使用类选择器，因为它们没有精确的ID）
        const nodeTypesPanelExists = document.querySelector('.panel:first-of-type') !== null;
        const relationshipTypesPanelExists = document.querySelector('.panel:nth-of-type(2)') !== null;
        
        if (checkAllElementsExist(requiredElements) && nodeTypesPanelExists && relationshipTypesPanelExists) {
            // 初始化Cytoscape实例
            try {
                // 调用全局的Cytoscape初始化函数
                if (typeof window.initializeCytoscape === 'function') {
                    window.initializeCytoscape();
                } else if (typeof window.cytoscapeModule?.initializeDualViews === 'function') {
                    // 尝试使用cytoscapeModule中的初始化函数
                    window.cytoscapeModule.initializeDualViews();
                } else {
                    console.error('Neo4j Editor: Global initializeCytoscape function not found');
                    throw new Error('Cytoscape initialization function not available');
                }
                clearInterval(checkInterval);
                safeDebugLog('Cytoscape instances initialized successfully');
            } catch (error) {
                safeHandleError('初始化Cytoscape实例失败:', error);
                if (attempts >= maxAttempts) {
                    clearInterval(checkInterval);
                    // 使用window前缀调用全局函数
                    if (typeof window.createFallbackCytoscapeInstances === 'function') {
                        console.log('Neo4j Editor: Calling global fallback initialization function');
                        window.createFallbackCytoscapeInstances();
                    } else {
                        console.error('Neo4j Editor: Global fallback initialization function not found');
                    }
                }
            }
        } else if (attempts >= maxAttempts) {
            clearInterval(checkInterval);
            safeHandleError('无法找到必要的DOM元素，使用备用初始化方式');
            // 使用window前缀调用全局函数
            if (typeof window.createFallbackCytoscapeInstances === 'function') {
                console.log('Neo4j Editor: Calling global fallback initialization function');
                window.createFallbackCytoscapeInstances();
            } else {
                console.error('Neo4j Editor: Global fallback initialization function not found');
            }
        }
    }, 500); // 每500ms检查一次
}

/**
 * 创建备用Cytoscape实例 - 调用全局函数
 */
// 添加计数器限制重试次数，防止无限递归
let fallbackInstanceCounter = 0;
const MAX_FALLBACK_INSTANCES = 5;

function createFallbackCytoscapeInstances() {
    // 限制重试次数，防止无限递归
    if (fallbackInstanceCounter >= MAX_FALLBACK_INSTANCES) {
        console.error('Neo4j Editor: Maximum fallback initialization attempts reached');
        return;
    }
    
    fallbackInstanceCounter++;
    console.log('Neo4j Editor: Creating fallback Cytoscape instances');
    
    try {
        // 确保Cytoscape函数可用
        if (typeof window.cytoscape !== 'function') {
            console.error('Neo4j Editor: Cytoscape library not available');
            // 增加重试间隔，给库更多加载时间
            setTimeout(createFallbackCytoscapeInstances, 1000);
            return;
        }
        
        // 尝试使用HTML中实际存在的容器ID
        let container;
        
        // 首先尝试直接找Cytoscape容器
        if (document.getElementById('cy-tree')) {
            container = document.getElementById('cy-tree');
            console.log('Neo4j Editor: Using tree view container for fallback initialization');
        } else if (document.getElementById('cy-network')) {
            container = document.getElementById('cy-network');
            console.log('Neo4j Editor: Using network view container for fallback initialization');
        } else if (document.getElementById('tree-container')) {
            container = document.getElementById('tree-container');
            console.log('Neo4j Editor: Using tree container for fallback initialization');
        } else if (document.getElementById('network-container')) {
            container = document.getElementById('network-container');
            console.log('Neo4j Editor: Using network container for fallback initialization');
        } else {
            // 如果找不到现有容器，尝试创建一个临时容器
            console.warn('Neo4j Editor: No container found, creating temporary container');
            container = document.createElement('div');
            container.id = 'temp-cytoscape-container';
            container.style.width = '100%';
            container.style.height = '500px';
            container.style.backgroundColor = '#1a1a1a';
            
            // 找到main部分并添加临时容器
            const mainElement = document.querySelector('main');
            if (mainElement) {
                mainElement.appendChild(container);
                console.log('Neo4j Editor: Temporary container created and appended');
            } else {
                console.error('Neo4j Editor: Could not find main element to append temporary container');
                // 尝试在body末尾添加
                document.body.appendChild(container);
            }
        }
        
        // 如果有可用容器，创建基本的Cytoscape实例
        if (container) {
            console.log('Neo4j Editor: Container available for fallback initialization');
            
            // 避免重复创建实例
            if (!window.cyFallback) {
                try {
                    // 创建基本的备用Cytoscape实例
                    window.cyFallback = window.cytoscape({
                        container: container,
                        elements: [], // 空图初始状态
                        style: window.getBasicStyles ? window.getBasicStyles() : [],
                        layout: { name: 'grid' }
                    });
                    
                    console.log('Neo4j Editor: Fallback Cytoscape instance created successfully');
                    
                    // 确保共享数据对象存在
                    if (!window.sharedGraphData) {
                        window.sharedGraphData = { nodes: [], edges: [] };
                    }
                    
                    // 尝试设置基本事件监听
                    if (typeof window.cytoscapeModule?.reinstallListener === 'function') {
                        window.cytoscapeModule.reinstallListener(window.cyFallback, 'fallback');
                    }
                } catch (instanceError) {
                    console.error('Neo4j Editor: Error creating fallback instance:', instanceError);
                    // 不再重试，避免无限循环
                }
            }
        } else {
            console.error('Neo4j Editor: No container could be found or created for fallback initialization');
            // 不再重试，避免无限循环
        }
    } catch (error) {
        // 使用安全的错误处理
        console.error('Neo4j Editor: Error in fallback initialization:', error);
    }
}

/**
 * 安装所有事件监听器
 */
function installEventListeners() {
    console.log('Neo4j Editor: Installing event listeners');
    
    // 模式按钮事件监听
    setupModeButtonListeners();
    
    // 工具按钮事件监听
    setupToolButtonListeners();
    
    // 视图切换事件监听
    setupViewToggleListeners();
    
    // 节点类型按钮事件监听
    setupNodeTypeListeners();
    
    // 关系类型按钮事件监听
    setupRelationshipTypeListeners();
    
    // Neo4j连接事件监听
    setupNeo4jConnectionListeners();
    
    // Cypher查询事件监听
    setupCypherQueryListeners();
    
    // 右键菜单事件监听
    setupContextMenuListeners();
    
    // 快捷键事件监听
    setupKeyboardShortcuts();
}

/**
 * 设置模式按钮监听器
 */
function setupModeButtonListeners() {
    document.getElementById('select-mode-btn')?.addEventListener('click', () => setMode('select'));
    document.getElementById('node-mode-btn')?.addEventListener('click', () => setMode('node'));
    document.getElementById('relationship-mode-btn')?.addEventListener('click', () => setMode('relationship'));
}

/**
 * 设置工具按钮监听器
 */
function setupToolButtonListeners() {
    document.getElementById('clear-graph-btn')?.addEventListener('click', async () => {
        if (confirm('确定要清除整个图吗？此操作不可撤销。')) {
            await clearGraph();
            // 替换showToast为console.log
                console.log('图已清除');
        }
    });
    
    document.getElementById('export-graph-btn')?.addEventListener('click', async () => {
        const success = await exportGraphData();
        if (success) {
            // 替换showToast为console.log
                console.log('图数据已导出');
        }
    });
    
    document.getElementById('save-graph-btn')?.addEventListener('click', async () => {
        const success = await saveGraphData();
        if (success) {
            // 替换showToast为console.log
                console.log('图数据已保存到数据库');
        }
    });
}

/**
 * 设置视图切换监听器
 */
function setupViewToggleListeners() {
    // 拆分视图
    document.getElementById('split-view-btn')?.addEventListener('click', () => {
        document.getElementById('tree-view-container')?.classList.remove('hidden');
        document.getElementById('network-view-container')?.classList.remove('hidden');
        document.getElementById('main-cytoscape-container')?.classList.add('hidden');
        // 替换showToast为console.log
                console.log('已切换到拆分视图');
        reinstallAllTapListeners();
    });
    
    // 仅树视图
    document.getElementById('tree-view-btn')?.addEventListener('click', () => {
        document.getElementById('tree-view-container')?.classList.remove('hidden');
        document.getElementById('network-view-container')?.classList.add('hidden');
        document.getElementById('main-cytoscape-container')?.classList.add('hidden');
        // 替换showToast为console.log
                console.log('已切换到树视图');
        reinstallAllTapListeners();
    });
    
    // 仅网络图
    document.getElementById('network-view-btn')?.addEventListener('click', () => {
        document.getElementById('tree-view-container')?.classList.add('hidden');
        document.getElementById('network-view-container')?.classList.remove('hidden');
        document.getElementById('main-cytoscape-container')?.classList.add('hidden');
        // 替换showToast为console.log
                console.log('已切换到网络图');
        reinstallAllTapListeners();
    });
}

/**
 * 设置节点类型按钮监听器
 */
function setupNodeTypeListeners() {
    const nodeTypeButtons = document.querySelectorAll('.node-type-btn');
    nodeTypeButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            // 移除其他按钮的活动状态
            nodeTypeButtons.forEach(b => b.classList.remove('active', 'bg-accent'));
            // 添加当前按钮的活动状态
            btn.classList.add('active', 'bg-accent');
            
            const nodeType = btn.getAttribute('data-type');
            // 直接使用alert替代window.showToast
            console.log(`已选择节点类型: ${nodeType}`);
            alert(`已选择节点类型: ${nodeType}`);
        });
    });
    
    // 默认选中第一个节点类型
    if (nodeTypeButtons.length > 0) {
        nodeTypeButtons[0].click();
    }
    
    // 添加节点类型按钮 - 改进模态框显示逻辑
console.log('Init.js: Setting up add-node-type-btn event listener...');
document.getElementById('add-node-type-btn')?.addEventListener('click', () => {
    console.log('Init.js: add-node-type-btn clicked');
    const modal = document.getElementById('add-node-type-modal');
    if (modal) {
        console.log('Init.js: Opening add node type modal');
        modal.classList.remove('hidden');
        // 确保模态框在z-index较高的层级
        modal.style.zIndex = '100';
    } else {
        console.error('Init.js: Add node type modal not found');
    }
});

// 确保节点类型添加按钮的事件监听器
console.log('Init.js: Setting up add-node-type-btn event listener...');
const addNodeTypeBtn = document.getElementById('add-node-type-btn');
if (addNodeTypeBtn) {
    console.log('Init.js: add-node-type-btn found, adding click listener');
    
    // 移除可能存在的旧监听器
    const newButton = addNodeTypeBtn.cloneNode(true);
    addNodeTypeBtn.parentNode.replaceChild(newButton, addNodeTypeBtn);
    
    // 添加新的监听器
    newButton.addEventListener('click', function() {
        console.log('Init.js: add-node-type-btn clicked');
        
        // 只显示添加节点类型的模态框，不直接调用addNodeType函数
        const modal = document.getElementById('add-node-type-modal');
        if (modal) {
            console.log('Init.js: Showing add-node-type-modal');
            modal.classList.remove('hidden');
        } else {
            console.error('Init.js: add-node-type-modal not found');
        }
        
        // 注意：addNodeType函数应该由模态框的提交按钮调用，而不是在这里直接调用
    });
} else {
    console.warn('Init.js: add-node-type-btn not found, checking for alternative');
    // 尝试查找添加节点类型的提交按钮
    const submitButton = document.querySelector('#add-node-type-modal button[type="submit"]');
    if (submitButton) {
        console.log('Init.js: Found add node type submit button, adding event listener');
        submitButton.addEventListener('click', function(e) {
            e.preventDefault();
            console.log('Init.js: Add node type submit button clicked');
            if (typeof addNodeType === 'function') {
                console.log('Init.js: Calling local addNodeType() function');
                addNodeType();
            } else {
                console.error('Init.js: addNodeType function not available');
            }
        });
    }
}
    
    // 保存节点类型 - 适配HTML中的ID
    document.getElementById('save-node-type-btn')?.addEventListener('click', () => {
        const nodeTypeName = document.getElementById('node-type-name')?.value.trim();
        if (nodeTypeName) {
            addNodeTypeButton(nodeTypeName);
            document.getElementById('add-node-type-modal')?.classList.add('hidden');
            const nodeTypeNameInput = document.getElementById('node-type-name');
            if (nodeTypeNameInput) nodeTypeNameInput.value = '';
            // 替换showToast为console.log
            console.log(`已添加节点类型: ${nodeTypeName}`);
        } else {
            // 替换showToast为console.log
            console.log('节点类型名称不能为空');
        }
    });
    
    // 添加节点类型模态框关闭按钮事件监听
    document.getElementById('close-add-node-type-modal')?.addEventListener('click', () => {
        const modal = document.getElementById('add-node-type-modal');
        if (modal) {
            modal.classList.add('hidden');
        }
    });
    
    // 添加节点类型模态框取消按钮事件监听
    document.getElementById('cancel-add-node-type-btn')?.addEventListener('click', () => {
        const modal = document.getElementById('add-node-type-modal');
        if (modal) {
            modal.classList.add('hidden');
        }
    });
    
    // 添加节点类型模态框添加按钮事件监听
    document.getElementById('confirm-add-node-type-btn')?.addEventListener('click', () => {
        // 确保调用index.html中已定义的addNodeType函数
        if (typeof window.addNodeType === 'function') {
            console.log('Calling window.addNodeType function');
            window.addNodeType();
        } else {
            console.error('window.addNodeType function not available');
        }
    });
    
    // 如果需要默认实现，提供一个更有用的版本
    if (typeof window.addNodeType !== 'function') {
        window.addNodeType = function() {
            console.warn('Default addNodeType function called - Please ensure this function is properly defined in index.html');
            // 尝试从表单获取数据并添加节点类型
            try {
                const typeName = document.getElementById('node-type-name')?.value;
                const typeColor = document.getElementById('node-type-color')?.value;
                
                if (typeName && typeColor) {
                    console.log(`Attempting to add node type: ${typeName}, color: ${typeColor}`);
                    // 这里可以实现基本的节点类型添加逻辑
                    window.nodeTypeStyles = window.nodeTypeStyles || {};
                    window.nodeTypeStyles[typeName] = { color: typeColor };
                    
                    // 保存到localStorage
                    try {
                        localStorage.setItem('nodeTypeStyles', JSON.stringify(window.nodeTypeStyles));
                        console.log('Node type styles saved to localStorage');
                    } catch (saveError) {
                        console.error('Error saving node type styles:', saveError);
                    }
                    
                    // 更新UI
                    if (typeof initializeTypeButtons === 'function') {
                        initializeTypeButtons();
                    }
                    
                    // 隐藏模态框
                    const modal = document.getElementById('add-node-type-modal');
                    if (modal) {
                        modal.classList.add('hidden');
                    }
                    
                    return true;
                } else {
                    console.error('Node type name or color not provided');
                }
            } catch (error) {
                console.error('Error in default addNodeType function:', error);
            }
            return false;
        };
        console.log('Default addNodeType function registered');
    }
}

/**
 * 添加新的节点类型按钮
 * @param {string} typeName - 节点类型名称
 */
function addNodeTypeButton(typeName) {
    const container = document.getElementById('node-types-container');
    if (container) {
        const btn = document.createElement('button');
        btn.className = 'node-type-btn bg-gray-700 hover:bg-gray-600 text-white p-2 rounded transition-colors';
        btn.setAttribute('data-type', typeName);
        btn.textContent = typeName;
        
        // 添加点击事件
        btn.addEventListener('click', () => {
            const nodeTypeButtons = document.querySelectorAll('.node-type-btn');
            nodeTypeButtons.forEach(b => b.classList.remove('active', 'bg-accent'));
            btn.classList.add('active', 'bg-accent');
            // 替换showToast为console.log
                console.log(`已选择节点类型: ${typeName}`);
        });
        
        container.appendChild(btn);
    }
}

/**
 * 设置关系类型按钮监听器
 */
function setupRelationshipTypeListeners() {
    const relTypeButtons = document.querySelectorAll('.relationship-type-btn');
    relTypeButtons.forEach(btn => {
        btn.addEventListener('click', function() {
            // 移除其他按钮的活动状态
            document.querySelectorAll('.relationship-type-btn').forEach(b => b.classList.remove('active', 'bg-accent'));
            // 添加当前按钮的活动状态
            this.classList.add('active', 'bg-accent');
            
            const relType = this.getAttribute('data-type') || this.dataset.type;
            // 同时设置局部变量和全局window变量
            selectedRelationshipType = relType;
            window.selectedRelationshipType = relType;
            // 替换showToast为console.log
            console.log(`已选择关系类型: ${relType}`);
        });
    });
    
    // 默认选中第一个关系类型
    if (relTypeButtons.length > 0) {
        relTypeButtons[0].click();
    }
    
    // 添加关系类型按钮 - 改进模态框显示逻辑
    document.getElementById('add-relationship-type-btn')?.addEventListener('click', () => {
        const modal = document.getElementById('add-relationship-type-modal');
        if (modal) {
            console.log('Opening add relationship type modal');
            modal.classList.remove('hidden');
            // 确保模态框在z-index较高的层级
            modal.style.zIndex = '100';
        } else {
            console.error('Add relationship type modal not found');
        }
    });
    
    // 保存关系类型 - 适配HTML中的ID
    document.getElementById('save-relationship-type-btn')?.addEventListener('click', () => {
        const relTypeName = document.getElementById('relationship-type-name')?.value.trim();
        if (relTypeName) {
            addRelationshipTypeButton(relTypeName);
            const modal = document.getElementById('add-relationship-type-modal');
            if (modal) modal.classList.add('hidden');
            const relationshipTypeNameInput = document.getElementById('relationship-type-name');
            if (relationshipTypeNameInput) relationshipTypeNameInput.value = '';
            // 替换showToast为console.log
            console.log(`已添加关系类型: ${relTypeName}`);
        } else {
            // 替换showToast为console.log
            console.log('关系类型名称不能为空');
        }
    });
    
    // 添加关系类型模态框关闭按钮事件监听
    document.getElementById('close-add-relationship-type-modal')?.addEventListener('click', () => {
        const modal = document.getElementById('add-relationship-type-modal');
        if (modal) {
            modal.classList.add('hidden');
        }
    });
    
    // 添加关系类型模态框取消按钮事件监听
    document.getElementById('cancel-add-relationship-type-btn')?.addEventListener('click', () => {
        const modal = document.getElementById('add-relationship-type-modal');
        if (modal) {
            modal.classList.add('hidden');
        }
    });
    
    // 添加关系类型模态框添加按钮事件监听
    document.getElementById('confirm-add-relationship-type-btn')?.addEventListener('click', () => {
        const relTypeName = document.getElementById('new-relationship-type-name')?.value;
        const relTypeColor = document.getElementById('new-relationship-type-color')?.value;
        
        if (relTypeName) {
            console.log('Saving relationship type:', { name: relTypeName, color: relTypeColor });
            
            // 直接实现添加关系类型的逻辑
            addRelationshipTypeButton(relTypeName, relTypeColor);
            
            // 调用HTML中已定义的saveRelationshipTypeStyles函数
            if (typeof window.saveRelationshipTypeStyles === 'function') {
                window.saveRelationshipTypeStyles();
            }
            
            // 关闭模态框
            document.getElementById('add-relationship-type-modal')?.classList.add('hidden');
            
            // 清空输入框
            const relTypeNameInput = document.getElementById('new-relationship-type-name');
            if (relTypeNameInput) relTypeNameInput.value = '';
            
            console.log('Relationship type added successfully');
        } else {
            console.error('Relationship type name cannot be empty');
        }
    });

}

/**
 * 添加新的关系类型按钮
 * @param {string} typeName - 关系类型名称
 */
function addRelationshipTypeButton(typeName) {
    const container = document.getElementById('relationship-types-container');
    if (container) {
        const btn = document.createElement('button');
        btn.className = 'relationship-type-btn bg-gray-700 hover:bg-gray-600 text-white p-2 rounded transition-colors';
        btn.setAttribute('data-type', typeName);
        btn.textContent = typeName;
        
        // 添加点击事件
            btn.addEventListener('click', function() {
                const type = this.getAttribute('data-type') || this.dataset.type;
                // 同时设置局部变量和全局window变量
                selectedRelationshipType = type;
                window.selectedRelationshipType = type;
                document.querySelectorAll('.relationship-type-btn').forEach(b => b.classList.remove('active', 'bg-accent'));
                this.classList.add('active', 'bg-accent');
                // 替换showToast为console.log
                console.log(`已选择关系类型: ${type}`);
            });
        
        container.appendChild(btn);
    }
}

/**
 * 设置Neo4j连接监听器
 */
function setupNeo4jConnectionListeners() {
    // 打开连接对话框 - 使用正确的按钮ID
    document.getElementById('connect-btn')?.addEventListener('click', () => {
        const modal = document.getElementById('connect-modal');
        if (modal) {
            console.log('Opening connect modal');
            modal.classList.remove('hidden');
            // 确保对话框在z-index较高的层级
            modal.style.zIndex = '100';
        } else {
            console.error('Connect modal not found');
        }
    });
    
    // 关闭连接对话框 - 添加关闭按钮事件监听
    document.getElementById('close-connect-modal')?.addEventListener('click', () => {
        document.getElementById('connect-modal')?.classList.add('hidden');
    });
    
    // 添加连接对话框取消按钮事件监听
    document.getElementById('cancel-connect-btn')?.addEventListener('click', () => {
        document.getElementById('connect-modal')?.classList.add('hidden');
    });
    
    // 确保连接对话框存在，如果不存在则记录错误
    if (!document.getElementById('connect-modal')) {
        console.error('Neo4j connection modal element does not exist in the DOM');
    }
    
    // 连接数据库
    document.getElementById('confirm-connect-btn')?.addEventListener('click', async () => {
        const uri = document.getElementById('neo4j-uri')?.value.trim() || 'bolt://localhost:7687';
        const user = document.getElementById('neo4j-user')?.value.trim() || 'neo4j';
        const password = document.getElementById('neo4j-password')?.value.trim();
        
        if (!password) {
            // 替换showToast为console.log
            console.log('密码不能为空');
            return;
        }
        
        console.log('Connecting to Neo4j:', { uri, user });
        const success = await connectToNeo4j(uri, user, password);
        
        if (success) {
            document.getElementById('connect-modal')?.classList.add('hidden');
            const neo4jPasswordInput = document.getElementById('neo4j-password');
            if (neo4jPasswordInput) neo4jPasswordInput.value = '';
            
            // 连接成功后加载图数据
            try {
                await loadGraphData(false);
                // 替换showToast为console.log
                console.log('图数据加载成功');
            } catch (error) {
                console.warn('加载图数据失败，但连接已成功建立');
            }
        }
    });
    
    // 断开连接
    document.getElementById('disconnect-btn')?.addEventListener('click', disconnectFromNeo4j);
}

/**
 * 设置Cypher查询监听器
 */
function setupCypherQueryListeners() {
    // 执行查询
    document.getElementById('execute-query-btn')?.addEventListener('click', async () => {
        const query = document.getElementById('cypher-editor')?.value.trim();
        if (!query) {
            // 替换showToast为console.log
            console.log('查询语句不能为空');
            return;
        }
        
        try {
            const results = await executeCypherQuery(query);
            displayQueryResults(results);
        } catch (error) {
            // 已在executeCypherQuery中处理错误
        }
    });
    
    // 清除查询
    document.getElementById('clear-query-btn')?.addEventListener('click', () => {
        const cypherEditor = document.getElementById('cypher-editor');
        if (cypherEditor) cypherEditor.value = '';
    });
}

/**
 * 显示查询结果
 * @param {Array} results - 查询结果
 */
function displayQueryResults(results) {
    const resultsContainer = document.getElementById('query-results');
    if (!resultsContainer) return;
    
    resultsContainer.innerHTML = '';
    
    if (results.length === 0) {
        resultsContainer.textContent = '无结果返回';
        return;
    }
    
    const table = document.createElement('table');
    table.className = 'min-w-full bg-gray-800 text-white';
    
    // 创建表头
    const thead = document.createElement('thead');
    const headerRow = document.createElement('tr');
    
    // 获取所有字段名
    const fields = Object.keys(results[0]);
    
    fields.forEach(field => {
        const th = document.createElement('th');
        th.className = 'px-4 py-2 text-left';
        th.textContent = field;
        headerRow.appendChild(th);
    });
    
    thead.appendChild(headerRow);
    table.appendChild(thead);
    
    // 创建表体
    const tbody = document.createElement('tbody');
    
    results.forEach(row => {
        const tr = document.createElement('tr');
        tr.className = 'border-t border-gray-700';
        
        fields.forEach(field => {
            const td = document.createElement('td');
            td.className = 'px-4 py-2';
            
            const value = row[field];
            if (typeof value === 'object') {
                td.textContent = JSON.stringify(value);
            } else {
                td.textContent = value;
            }
            
            tr.appendChild(td);
        });
        
        tbody.appendChild(tr);
    });
    
    table.appendChild(tbody);
    resultsContainer.appendChild(table);
}

/**
 * 设置右键菜单监听器
 */
function setupContextMenuListeners() {
    console.log('Neo4j Editor: 设置右键菜单监听器');
    
    // 首先确保utils.js中的初始化函数被调用
    if (typeof window.initializeContextMenu === 'function') {
        console.log('Neo4j Editor: 调用window.initializeContextMenu初始化右键菜单');
        window.initializeContextMenu();
    }
    
    if (typeof window.setupElementContextMenu === 'function') {
        console.log('Neo4j Editor: 调用window.setupElementContextMenu设置元素右键菜单');
        window.setupElementContextMenu();
    }
    
    if (typeof window.setupKeyboardEvents === 'function') {
        console.log('Neo4j Editor: 调用window.setupKeyboardEvents设置键盘事件');
        window.setupKeyboardEvents();
    }
    
    // 添加右键菜单点击处理逻辑
    // 先尝试移除旧的事件监听器，避免重复绑定
    const newDocClickHandler = function(evt) {
        const menu = document.getElementById('context-menu');
        // 如果点击不在菜单内且菜单可见，则隐藏菜单
        if (menu && menu.style.display === 'block' && !menu.contains(evt.target)) {
            menu.style.display = 'none';
            console.log('Neo4j Editor: 点击外部隐藏右键菜单');
        }
    };
    
    // 先移除旧的事件监听器
    const oldHandlers = document._contextMenuClickHandler;
    if (oldHandlers) {
        document.removeEventListener('click', oldHandlers);
    }
    
    // 添加新的事件监听器并保存引用
    document.addEventListener('click', newDocClickHandler);
    document._contextMenuClickHandler = newDocClickHandler;
    
    // 为删除选项添加直接的点击事件处理
    const deleteOption = document.getElementById('delete-option');
    if (deleteOption) {
        // 先移除可能存在的旧事件监听器
        const newDeleteOption = deleteOption.cloneNode(true);
        deleteOption.parentNode.replaceChild(newDeleteOption, deleteOption);
        
        newDeleteOption.addEventListener('click', function(evt) {
            evt.stopPropagation();
            console.log('Neo4j Editor: 删除选项被点击');
            const menu = document.getElementById('context-menu');
            const elementId = menu ? menu.dataset.elementId : null;
            
            if (elementId && typeof removeElementFromViews === 'function') {
                console.log(`Neo4j Editor: 尝试删除元素ID: ${elementId}`);
                removeElementFromViews(elementId);
            } else {
                console.log(`Neo4j Editor: 无法删除元素，元素ID: ${elementId}`);
            }
            
            // 隐藏菜单
            if (menu) {
                menu.style.display = 'none';
            }
        });
    }
    
    // 为全局document添加contextmenu事件，但是只在非Cytoscape区域触发
    document.addEventListener('contextmenu', (event) => {
        // 检查事件目标是否在Cytoscape容器内
        const isInCytoscape = event.target.closest('#cy-tree') || event.target.closest('#cy-network') || 
                             event.target.closest('#tree-container') || event.target.closest('#network-container');
        
        // 如果不在Cytoscape容器内，则阻止默认右键菜单
        if (!isInCytoscape) {
            event.preventDefault();
            // 可以在这里添加应用界面其他区域的右键菜单逻辑
        }
    });
}

/**
 * 设置快捷键
 */
function setupKeyboardShortcuts() {
    document.addEventListener('keydown', (event) => {
        // Ctrl+S 保存
        if (event.ctrlKey && event.key === 's') {
            event.preventDefault();
            saveGraphData();
        }
        
        // Ctrl+E 导出
        if (event.ctrlKey && event.key === 'e') {
            event.preventDefault();
            exportGraphData();
        }
        
        // Ctrl+N 新节点模式
        if (event.ctrlKey && event.key === 'n') {
            event.preventDefault();
            setMode('node');
        }
        
        // Ctrl+R 新关系模式
        if (event.ctrlKey && event.key === 'r') {
            event.preventDefault();
            setMode('relationship');
        }
        
        // Esc 选择模式
        if (event.key === 'Escape') {
            setMode('select');
        }
    });
}

/**
 * 设置调试面板
 */
function setupDebugPanel() {
    // 切换调试面板显示
    document.getElementById('toggle-debug-btn')?.addEventListener('click', () => {
        const debugPanel = document.getElementById('debug-panel');
        if (debugPanel) {
            debugPanel.classList.toggle('hidden');
        }
    });
}

// 导出模块对象到全局
window.appInit = {
    initializeApp: window.initializeApp
};

// 在DOM加载完成后初始化应用
    document.addEventListener('DOMContentLoaded', async () => {
        await window.initializeApp();
        
        // 确保Cytoscape实例完全初始化后，延迟调用右键菜单重新初始化
        setTimeout(() => {
            console.log('DOM已加载完成，延迟初始化右键菜单...');
            
            // 初始化右键菜单
            if (typeof window.reinitializeContextMenu === 'function') {
                console.log('调用window.reinitializeContextMenu()');
                window.reinitializeContextMenu();
            } else {
                console.log('window.reinitializeContextMenu函数不存在，尝试直接调用初始化函数');
                if (typeof setupContextMenuListeners === 'function') {
                    setupContextMenuListeners();
                }
            }
            
            // 设置画布右键事件监控
            setupCanvasRightClickMonitoring();
            
            // 确保UI正确初始化
            if (typeof window.initializeTypeButtons === 'function') {
                console.log('调用window.initializeTypeButtons()');
                try {
                    window.initializeTypeButtons();
                    console.log('Type buttons initialized successfully');
                } catch (error) {
                    console.error('Error initializing type buttons:', error);
                }
            } else if (typeof initializeTypeButtons === 'function') {
                console.log('调用local initializeTypeButtons()');
                try {
                    initializeTypeButtons();
                    console.log('Type buttons initialized successfully with local function');
                } catch (error) {
                    console.error('Error initializing type buttons with local function:', error);
                }
            }
            
            // 添加右键菜单测试按钮
            if (typeof window.addContextMenuTestButton === 'function') {
                console.log('添加右键菜单测试按钮');
                window.addContextMenuTestButton();
            }
        }, 1000); // 延迟1秒，确保所有实例都已创建
    });

// 监听窗口加载完成事件，确保所有资源加载完毕
window.addEventListener('load', function() {
    console.log('Window loaded, checking canvas and initializing UI');
    setupCanvasRightClickMonitoring();
    
    // 确保UI正确初始化
    if (typeof window.initializeTypeButtons === 'function') {
        console.log('Calling window.initializeTypeButtons() on window load');
        try {
            window.initializeTypeButtons();
            console.log('Type buttons initialized successfully');
        } catch (error) {
            console.error('Error initializing type buttons:', error);
        }
    } else if (typeof initializeTypeButtons === 'function') {
        console.log('Calling local initializeTypeButtons() on window load');
        try {
            initializeTypeButtons();
            console.log('Type buttons initialized successfully with local function');
        } catch (error) {
            console.error('Error initializing type buttons with local function:', error);
        }
    }
});

// 应用初始化由index.html中的DOMContentLoaded事件处理