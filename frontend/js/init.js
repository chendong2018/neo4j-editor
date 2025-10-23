/**
 * 应用初始化模块
 */

// 立即定义核心工具函数，确保在任何代码执行前可用
console.log('Neo4j Editor: init.js loading, defining core functions');

// 直接定义在全局作用域
function showToast(message, type) {
    console.log('showToast called:', message, type);
    alert(message || '操作成功');
    return true;
}

function debugLog(message) {
    console.log('Neo4j Editor:', message);
    return true;
}

function handleError(title, error) {
    console.error('Error:', title, error);
    alert((title || '错误') + ': ' + (error instanceof Error ? error.message : String(error)));
    return true;
}

// 强制挂载到window对象
window.showToast = showToast;
window.debugLog = debugLog;
window.handleError = handleError;

console.log('Neo4j Editor: Core functions defined in init.js:', {
    showToast: typeof window.showToast,
    debugLog: typeof window.debugLog,
    handleError: typeof window.handleError
});

// 立即测试函数是否可用
if (typeof window.showToast === 'function') {
    console.log('Neo4j Editor: showToast function is available in init.js');
    // 不要在这里调用，以免在页面加载时弹出提示
}

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

/**
 * 初始化应用
 */
window.initializeApp = async function() {
    console.log('Neo4j Editor: Initializing application...');
    
    try {
        // 检查并初始化Cytoscape实例
        await checkAndInitialize(5);
        
        // 安装事件监听器
        installEventListeners();
        
        // 初始化模式为选择模式
        setMode('select');
        
        // 设置调试面板
        setupDebugPanel();
        
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
    
    // 添加节点类型按钮
    document.getElementById('add-node-type-btn')?.addEventListener('click', () => {
        document.getElementById('add-node-type-modal')?.classList.remove('hidden');
    });
    
    // 保存节点类型
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
    
    // 添加关系类型按钮
    document.getElementById('add-relationship-type-btn')?.addEventListener('click', () => {
        document.getElementById('add-relationship-type-modal')?.classList.remove('hidden');
    });
    
    // 保存关系类型
    document.getElementById('save-relationship-type-btn')?.addEventListener('click', () => {
        const relTypeName = document.getElementById('relationship-type-name')?.value.trim();
        if (relTypeName) {
            addRelationshipTypeButton(relTypeName);
            document.getElementById('add-relationship-type-modal')?.classList.add('hidden');
            const relationshipTypeNameInput = document.getElementById('relationship-type-name');
            if (relationshipTypeNameInput) relationshipTypeNameInput.value = '';
            // 替换showToast为console.log
            console.log(`已添加关系类型: ${relTypeName}`);
        } else {
            // 替换showToast为console.log
            console.log('关系类型名称不能为空');
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
    // 打开连接对话框
    document.getElementById('connect-neo4j-btn')?.addEventListener('click', () => {
        document.getElementById('connect-neo4j-modal')?.classList.remove('hidden');
    });
    
    // 连接数据库
    document.getElementById('save-connection-btn')?.addEventListener('click', async () => {
        const host = document.getElementById('neo4j-host')?.value.trim() || 'localhost';
        const port = document.getElementById('neo4j-port')?.value.trim() || '7687';
        const username = document.getElementById('neo4j-username')?.value.trim() || 'neo4j';
        const password = document.getElementById('neo4j-password')?.value.trim();
        const database = document.getElementById('neo4j-database')?.value.trim() || 'neo4j';
        
        if (!password) {
            // 替换showToast为console.log
            console.log('密码不能为空');
            return;
        }
        
        const config = {
            host,
            port,
            username,
            password,
            database
        };
        
        const success = await connectToNeo4j(config);
        if (success) {
            document.getElementById('connect-neo4j-modal')?.classList.add('hidden');
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
    document.addEventListener('contextmenu', (event) => {
        showContextMenu(event);
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
});

// 应用初始化由index.html中的DOMContentLoaded事件处理