/**
 * 视图管理器 - 处理双视图切换和同步
 */

/**
 * 视图管理器对象
 */
window.viewManager = window.viewManager || {};

/**
 * 重新定位所有提示框
 */
window.viewManager.repositionToasts = function() {
    try {
        const toasts = document.querySelectorAll('.neo4j-toast, .neo4j-progress-toast');
        let offset = 10;
        
        toasts.forEach(toast => {
            toast.style.top = `${offset}px`;
            offset += toast.offsetHeight + 10;
        });
    } catch (error) {
        console.error('Neo4j Editor: Error repositioning toasts:', error);
    }
};

/**
 * 显示进度通知
 */
window.viewManager.showProgressToast = function(message) {
    try {
        // 生成唯一ID
        const toastId = `progress-toast-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        
        // 创建进度提示框
        const toast = document.createElement('div');
        toast.id = toastId;
        toast.className = 'neo4j-progress-toast position-fixed top-3 right-3 px-4 py-3 rounded-md shadow-lg z-50 bg-blue-600 text-white transition-all duration-300 transform translate-x-full opacity-0';
        
        // 进度条HTML
        toast.innerHTML = `
            <div class="toast-message mb-2 font-medium">${message}</div>
            <div class="progress-bar bg-blue-300 h-2 rounded-full overflow-hidden">
                <div class="progress-fill bg-white h-full rounded-full transition-all duration-300" style="width: 0%"></div>
            </div>
            <div class="progress-text text-xs mt-1 text-blue-100">0%</div>
        `;
        
        document.body.appendChild(toast);
        
        // 重新定位所有提示框
        this.repositionToasts();
        
        // 显示动画
        setTimeout(() => {
            toast.classList.remove('translate-x-full', 'opacity-0');
            toast.classList.add('translate-x-0', 'opacity-100');
        }, 10);
        
        return toastId;
    } catch (error) {
        console.error('Neo4j Editor: Error showing progress toast:', error);
        return null;
    }
};

/**
 * 更新进度通知
 */
window.viewManager.updateProgressToast = function(toastId, progress, message) {
    try {
        const toast = document.getElementById(toastId);
        if (!toast) return false;
        
        // 更新进度条
        const progressFill = toast.querySelector('.progress-fill');
        const progressText = toast.querySelector('.progress-text');
        const toastMessage = toast.querySelector('.toast-message');
        
        if (progressFill) progressFill.style.width = `${progress}%`;
        if (progressText) progressText.textContent = `${progress}%`;
        if (message && toastMessage) toastMessage.textContent = message;
        
        return true;
    } catch (error) {
        console.error('Neo4j Editor: Error updating progress toast:', error);
        return false;
    }
};

/**
 * 移除进度通知
 */
window.viewManager.removeProgressToast = function(toastId) {
    try {
        const toast = document.getElementById(toastId);
        if (!toast) return;
        
        // 添加移除动画
        toast.classList.add('translate-x-full', 'opacity-0');
        
        setTimeout(() => {
            if (toast.parentNode) {
                toast.parentNode.removeChild(toast);
                // 重新定位剩余的提示框
                this.repositionToasts();
            }
        }, 300);
    } catch (error) {
        console.error('Neo4j Editor: Error removing progress toast:', error);
    }
};

/**
 * 当前视图模式
 * @type {string} 'split', 'tree', 'network'
 */
window.viewManager.currentViewMode = 'split';

/**
 * 初始化视图管理器
 */
window.viewManager.init = function() {
    console.log('Neo4j Editor: Initializing view manager');
    
    // 确保全局sharedGraphData存在
    if (!window.sharedGraphData) {
        window.sharedGraphData = { nodes: [], edges: [] };
    }
    
    // 导入必要的模块
    this.loadRequiredModules();
    
    // 设置视图模式按钮事件
    this.setupViewModeButtons();
    
    // 设置缩放控制按钮事件
    this.setupZoomControlListeners();
    
    // 初始更新元素计数
    this.updateElementCounts();
    
    // 覆盖节点和关系创建函数以支持双视图
    this.overrideCreateFunctions();
    
    // 设置标签过滤UI
    this.setupLabelFilterUI();
    
    // 设置保存按钮
    this.setupSaveButtons();
    
    // 设置批量关系编辑UI
    this.setupBatchRelationEditor();
    
    // 设置视图事件监听器，实现实时同步
    this.setupViewEventListeners();
    
    console.log('View manager initialized successfully');
};

/**
 * 加载必要的模块
 */
window.viewManager.loadRequiredModules = function() {
    // 确保所有必要的模块都已加载
    if (!window.notificationManager) {
        console.warn('Neo4j Editor: notificationManager module not loaded');
    }
    
    if (!window.performanceMonitor) {
        console.warn('Neo4j Editor: performanceMonitor module not loaded');
    }
    
    if (!window.viewModeManager) {
        console.warn('Neo4j Editor: viewModeManager module not loaded');
    }
    
    if (!window.dataManager) {
        console.warn('Neo4j Editor: dataManager module not loaded');
    }
    
    if (!window.styleManager) {
        console.warn('Neo4j Editor: styleManager module not loaded');
    } else {
        // 加载CSS样式
        window.styleManager.addViewManagerCSS();
    }
};

/**
 * 初始化视图管理器（与init.js调用匹配的别名）
 */
window.viewManager.initialize = function() {
    // 调用实际的初始化函数
    this.init();
};

/**
 * 设置视图事件监听器，实现实时同步
 */
window.viewManager.setupViewEventListeners = function() {
    try {
        console.log('Neo4j Editor: Setting up view event listeners...');
        
        // 为树视图添加事件监听器
        if (window.cyTree) {
            // 监听节点添加事件
            window.cyTree.on('add', 'node', function(event) {
                try {
                    console.log('Neo4j Editor: Node added to tree view, syncing...');
                    window.viewManager.syncGraphData('tree');
                } catch (error) {
                    console.error('Neo4j Editor: Error syncing after node add in tree view:', error);
                }
            });
            
            // 监听节点移除事件
            window.cyTree.on('remove', 'node', function(event) {
                try {
                    console.log('Neo4j Editor: Node removed from tree view, syncing...');
                    window.viewManager.syncGraphData('tree');
                } catch (error) {
                    console.error('Neo4j Editor: Error syncing after node remove in tree view:', error);
                }
            });
            
            // 监听节点数据变更事件
            window.cyTree.on('data', 'node', function(event) {
                try {
                    console.log('Neo4j Editor: Node data changed in tree view, syncing...');
                    window.viewManager.syncGraphData('tree');
                } catch (error) {
                    console.error('Neo4j Editor: Error syncing after node data change in tree view:', error);
                }
            });
            
            // 监听边添加事件
            window.cyTree.on('add', 'edge', function(event) {
                try {
                    console.log('Neo4j Editor: Edge added to tree view, syncing...');
                    window.viewManager.syncGraphData('tree');
                } catch (error) {
                    console.error('Neo4j Editor: Error syncing after edge add in tree view:', error);
                }
            });
            
            // 监听边移除事件
            window.cyTree.on('remove', 'edge', function(event) {
                try {
                    console.log('Neo4j Editor: Edge removed from tree view, syncing...');
                    window.viewManager.syncGraphData('tree');
                } catch (error) {
                    console.error('Neo4j Editor: Error syncing after edge remove in tree view:', error);
                }
            });
            
            // 监听选择事件
            window.cyTree.on('select', function(event) {
                try {
                    console.log('Neo4j Editor: Selection changed in tree view, syncing...');
                    window.viewManager.synchronizeSelection('tree');
                } catch (error) {
                    console.error('Neo4j Editor: Error syncing selection from tree view:', error);
                }
            });
        }
        
        // 为网络图视图添加事件监听器
        if (window.cyNetwork) {
            // 监听节点添加事件
            window.cyNetwork.on('add', 'node', function(event) {
                try {
                    console.log('Neo4j Editor: Node added to network view, syncing...');
                    window.viewManager.syncGraphData('network');
                } catch (error) {
                    console.error('Neo4j Editor: Error syncing after node add in network view:', error);
                }
            });
            
            // 监听节点移除事件
            window.cyNetwork.on('remove', 'node', function(event) {
                try {
                    console.log('Neo4j Editor: Node removed from network view, syncing...');
                    window.viewManager.syncGraphData('network');
                } catch (error) {
                    console.error('Neo4j Editor: Error syncing after node remove in network view:', error);
                }
            });
            
            // 监听节点数据变更事件
            window.cyNetwork.on('data', 'node', function(event) {
                try {
                    console.log('Neo4j Editor: Node data changed in network view, syncing...');
                    window.viewManager.syncGraphData('network');
                } catch (error) {
                    console.error('Neo4j Editor: Error syncing after node data change in network view:', error);
                }
            });
            
            // 监听边添加事件
            window.cyNetwork.on('add', 'edge', function(event) {
                try {
                    console.log('Neo4j Editor: Edge added to network view, syncing...');
                    window.viewManager.syncGraphData('network');
                } catch (error) {
                    console.error('Neo4j Editor: Error syncing after edge add in network view:', error);
                }
            });
            
            // 监听边移除事件
            window.cyNetwork.on('remove', 'edge', function(event) {
                try {
                    console.log('Neo4j Editor: Edge removed from network view, syncing...');
                    window.viewManager.syncGraphData('network');
                } catch (error) {
                    console.error('Neo4j Editor: Error syncing after edge remove in network view:', error);
                }
            });
            
            // 监听选择事件
            window.cyNetwork.on('select', function(event) {
                try {
                    console.log('Neo4j Editor: Selection changed in network view, syncing...');
                    window.viewManager.synchronizeSelection('network');
                } catch (error) {
                    console.error('Neo4j Editor: Error syncing selection from network view:', error);
                }
            });
        }
        
        console.log('Neo4j Editor: View event listeners set up successfully');
    } catch (error) {
        console.error('Neo4j Editor: Error setting up view event listeners:', error);
    }
};

/**
 * 同步数据到两个视图
 */
window.viewManager.syncGraphData = function(sourceView) {
    // 防止循环调用导致栈溢出
    if (window.isSyncingViewManagerData) {
        return;
    }
    
    try {
        window.isSyncingViewManagerData = true;
        console.log(`Neo4j Editor: Syncing graph data${sourceView ? ' from ' + sourceView + ' view' : ''}...`);
        
        // 如果指定了源视图，则先从源视图更新共享数据
        if (sourceView && (sourceView === 'tree' || sourceView === 'network')) {
            this.updateSharedDataFromView(sourceView);
        }
        
        // 确保sharedGraphData存在
        const sharedData = window.sharedGraphData || { nodes: [], edges: [] };
        
        // 对每个视图单独进行处理，避免一个视图失败影响另一个
        if (window.cyTree && typeof window.cyTree === 'object') {
            try {
                // 安全地清空树视图
                if (window.cyTree.elements && typeof window.cyTree.elements === 'function') {
                    const treeElements = window.cyTree.elements();
                    if (treeElements && typeof treeElements.remove === 'function') {
                        treeElements.remove();
                    }
                }
                
                // 克隆并添加节点和边到树视图 - 只显示带'tree'标签的节点
                const treeNodes = (sharedData.nodes || []).filter(node => {
                    // 安全检查节点和数据
                    if (!node || !node.data) return false;
                    // 只显示带有'tree'标签的节点
                    return Array.isArray(node.data.labels) && node.data.labels.includes('tree');
                }).map(node => ({...node}));
                
                // 过滤与树视图节点相关的边
                const treeNodeIds = new Set(treeNodes.map(node => node.data.id));
                const treeEdges = (sharedData.edges || []).filter(edge => 
                    edge && edge.data && 
                    (edge.data.type === 'CHILD_OF' || 
                    (treeNodeIds.has(edge.data.source) && treeNodeIds.has(edge.data.target)))
                ).map(edge => ({...edge}));
                
                if (typeof window.cyTree.add === 'function') {
                    window.cyTree.add({ nodes: treeNodes, edges: treeEdges });
                }
                
                // 运行布局
                if (typeof window.cyTree.layout === 'function') {
                    try {
                        window.cyTree.layout({
                            name: 'cose',
                            rankDir: 'TB',
                            rankSep: 100,
                            nodeSep: 50,
                            fit: true,
                            idealEdgeLength: 100,
                            nodeOverlap: 0,
                            refresh: 20,
                            padding: 50,
                            randomize: false,
                            componentSpacing: 500,
                            nodeRepulsion: 1000000,
                            edgeElasticity: 100,
                            nestingFactor: 1,
                            gravity: 50,
                            numIter: 1000,
                            initialTemp: 100,
                            coolingFactor: 0.95,
                            minTemp: 0.1
                        }).run();
                    } catch (layoutError) {
                        console.warn('Neo4j Editor: Failed to run tree layout:', layoutError);
                    }
                }
            } catch (treeError) {
                console.warn('Neo4j Editor: Error syncing tree view:', treeError);
            }
        }
        
        if (window.cyNetwork && typeof window.cyNetwork === 'object') {
            try {
                // 安全地清空网络图视图
                if (window.cyNetwork.elements && typeof window.cyNetwork.elements === 'function') {
                    const networkElements = window.cyNetwork.elements();
                    if (networkElements && typeof networkElements.remove === 'function') {
                        networkElements.remove();
                    }
                }
                
                // 克隆并添加节点和边到网络图视图 - 只显示带'network'标签的节点
                const networkNodes = (sharedData.nodes || []).filter(node => {
                    // 安全检查节点和数据
                    if (!node || !node.data) return false;
                    // 只显示带有'network'标签的节点
                    return Array.isArray(node.data.labels) && node.data.labels.includes('network');
                }).map(node => ({...node}));
                
                // 过滤与网络图视图节点相关的边
                const networkNodeIds = new Set(networkNodes.map(node => node.data.id));
                const networkEdges = (sharedData.edges || []).filter(edge => 
                    edge && edge.data && 
                    (edge.data.type === 'RELATES_TO' || 
                    (networkNodeIds.has(edge.data.source) && networkNodeIds.has(edge.data.target)))
                ).map(edge => ({...edge}));
                
                if (typeof window.cyNetwork.add === 'function') {
                    window.cyNetwork.add({ nodes: networkNodes, edges: networkEdges });
                }
                
                // 运行布局
                if (typeof window.cyNetwork.layout === 'function') {
                    try {
                        window.cyNetwork.layout({
                            name: 'cose',
                            idealEdgeLength: 300,
                            nodeOverlap: 0,
                            refresh: 20,
                            fit: true,
                            padding: 150,
                            randomize: true,
                            componentSpacing: 1000,
                            nodeRepulsion: 3000000,
                            edgeElasticity: 200,
                            nestingFactor: 1,
                            gravity: 150,
                            numIter: 5000,
                            initialTemp: 150,
                            coolingFactor: 0.9,
                            minTemp: 0.5
                        }).run();
                    } catch (layoutError) {
                        console.warn('Neo4j Editor: Failed to run network layout:', layoutError);
                    }
                }
            } catch (networkError) {
                console.warn('Neo4j Editor: Error syncing network view:', networkError);
            }
        }
        
        // 如果是从一个视图同步，同步选择状态到另一个视图
        if (sourceView && (sourceView === 'tree' || sourceView === 'network')) {
            this.synchronizeSelection(sourceView);
        }
        
        // 更新计数
        this.updateElementCounts();
        
        // 更新元素样式
        if (window.styleManager && typeof window.styleManager.updateElementStyles === 'function') {
            window.styleManager.updateElementStyles(window.cyTree, window.cyNetwork);
        }
        
        console.log('Neo4j Editor: Graph data synced to views successfully');
    } catch (error) {
        console.error('Neo4j Editor: Failed to sync graph data:', error);
    } finally {
        // 使用setTimeout确保当前同步完成后再重置标志
        setTimeout(() => {
            window.isSyncingViewManagerData = false;
        }, 0);
    }
};

/**
 * 从视图更新共享数据
 * @param {string} viewMode - 视图模式 ('tree' 或 'network')
 */
window.viewManager.updateSharedDataFromView = function(viewMode) {
    try {
        console.log(`Neo4j Editor: Updating shared data from ${viewMode} view...`);
        
        const cy = viewMode === 'tree' ? window.cyTree : window.cyNetwork;
        if (!cy) return;
        
        // 初始化共享数据
        if (!window.sharedGraphData) {
            window.sharedGraphData = { nodes: [], edges: [] };
        }
        
        // 从视图获取节点数据
        const viewNodes = [];
        if (cy.nodes && typeof cy.nodes === 'function') {
            cy.nodes().forEach(node => {
                try {
                    const nodeData = node.data();
                    if (nodeData && nodeData.id) {
                        // 移除视图特定标签
                        if (Array.isArray(nodeData.labels)) {
                            nodeData.labels = nodeData.labels.filter(label => 
                                label !== 'tree' && label !== 'network'
                            );
                        }
                        
                        // 确保properties对象存在
                        if (!nodeData.properties) {
                            nodeData.properties = {};
                        }
                        
                        viewNodes.push({ 
                            group: 'nodes', 
                            data: { ...nodeData } 
                        });
                    }
                } catch (nodeError) {
                    console.warn('Neo4j Editor: Error processing node:', nodeError);
                }
            });
        }
        
        // 从视图获取边数据
        const viewEdges = [];
        if (cy.edges && typeof cy.edges === 'function') {
            cy.edges().forEach(edge => {
                try {
                    const edgeData = edge.data();
                    if (edgeData && edgeData.id && edgeData.source && edgeData.target) {
                        viewEdges.push({ 
                            group: 'edges', 
                            data: { ...edgeData } 
                        });
                    }
                } catch (edgeError) {
                    console.warn('Neo4j Editor: Error processing edge:', edgeError);
                }
            });
        }
        
        // 更新共享数据（合并策略：保留未在当前视图中的元素）
        const existingNodeIds = new Set(viewNodes.map(n => n.data.id));
        const existingEdgeIds = new Set(viewEdges.map(e => e.data.id));
        
        // 合并节点：保留现有节点（不在当前视图中的）和视图中的节点
        const mergedNodes = [
            ...window.sharedGraphData.nodes.filter(node => 
                node && node.data && !existingNodeIds.has(node.data.id)
            ),
            ...viewNodes.map(node => {
                // 为节点添加对应的视图标签
                if (!Array.isArray(node.data.labels)) {
                    node.data.labels = [];
                }
                if (!node.data.labels.includes(viewMode)) {
                    node.data.labels.push(viewMode);
                }
                return node;
            })
        ];
        
        // 合并边：保留现有边（不在当前视图中的）和视图中的边
        const mergedEdges = [
            ...window.sharedGraphData.edges.filter(edge => 
                edge && edge.data && !existingEdgeIds.has(edge.data.id)
            ),
            ...viewEdges
        ];
        
        // 更新共享数据
        window.sharedGraphData.nodes = mergedNodes;
        window.sharedGraphData.edges = mergedEdges;
        
        console.log(`Neo4j Editor: Shared data updated from ${viewMode} view successfully`);
    } catch (error) {
        console.error(`Neo4j Editor: Error updating shared data from ${viewMode} view:`, error);
    }
};

/**
 * 同步视图选择状态
 * @param {string} sourceView - 源视图
 */
window.viewManager.synchronizeSelection = function(sourceView) {
    // 防止循环调用导致栈溢出
    if (window.isSynchronizingSelection) {
        return;
    }
    
    try {
        window.isSynchronizingSelection = true;
        console.log(`Neo4j Editor: Synchronizing selection from ${sourceView} view...`);
        
        const sourceCy = sourceView === 'tree' ? window.cyTree : window.cyNetwork;
        const targetCy = sourceView === 'tree' ? window.cyNetwork : window.cyTree;
        
        if (!sourceCy || !targetCy) return;
        
        // 获取源视图中选中的元素ID
        const selectedIds = new Set();
        
        // 获取选中的节点
        if (sourceCy.nodes && typeof sourceCy.nodes === 'function') {
            sourceCy.nodes(':selected').forEach(node => {
                try {
                    const nodeData = node.data();
                    if (nodeData && nodeData.id) {
                        selectedIds.add(nodeData.id);
                    }
                } catch (e) {
                    console.warn('Neo4j Editor: Error getting selected node data:', e);
                }
            });
        }
        
        // 获取选中的边
        if (sourceCy.edges && typeof sourceCy.edges === 'function') {
            sourceCy.edges(':selected').forEach(edge => {
                try {
                    const edgeData = edge.data();
                    if (edgeData && edgeData.id) {
                        selectedIds.add(edgeData.id);
                    }
                } catch (e) {
                    console.warn('Neo4j Editor: Error getting selected edge data:', e);
                }
            });
        }
        
        // 更新目标视图的选择状态
        if (targetCy.elements && typeof targetCy.elements === 'function' && 
            targetCy.select && typeof targetCy.select === 'function' && 
            targetCy.unselect && typeof targetCy.unselect === 'function') {
            
            // 先取消所有选中状态
            targetCy.unselect();
            
            // 选中匹配的元素
            selectedIds.forEach(id => {
                try {
                    const matchingElements = targetCy.elements(`[id="${id}"]`);
                    if (matchingElements && matchingElements.length > 0 && 
                        matchingElements.select && typeof matchingElements.select === 'function') {
                        matchingElements.select();
                    }
                } catch (e) {
                    console.warn(`Neo4j Editor: Error selecting element with id ${id}:`, e);
                }
            });
        }
        
        console.log(`Neo4j Editor: Selection synchronized from ${sourceView} view successfully`);
    } catch (error) {
        console.error(`Neo4j Editor: Error synchronizing selection from ${sourceView} view:`, error);
    } finally {
        // 使用setTimeout确保当前同步完成后再重置标志
        setTimeout(() => {
            window.isSynchronizingSelection = false;
        }, 0);
    }
};

/**
 * 设置缩放控制功能
 */
window.viewManager.setupZoomControlListeners = function() {
    try {
        console.log('Neo4j Editor: Setting up zoom control listeners...');
        
        // 创建统一的缩放控制UI组件
        const createZoomControlUI = (viewType) => {
            const zoomControls = document.createElement('div');
            zoomControls.className = 'zoom-controls-panel position-absolute bottom-3 right-3 bg-white rounded-lg shadow-md p-1 z-10 transition-all duration-300 hover:shadow-lg';
            zoomControls.setAttribute('data-view-type', viewType);
            
            zoomControls.innerHTML = `
                <div class="zoom-header px-2 py-1 text-xs text-muted text-center mb-1 border-b">${viewType === 'tree' ? 'Hierarchy Tree' : 'Relationship Network'} View</div>
                <div class="zoom-buttons">
                    <button id="${viewType}-zoom-in" class="btn zoom-btn-circle bg-primary text-white w-8 h-8 rounded-full flex items-center justify-center mb-1 shadow-sm hover:bg-primary/90 transition-all duration-200">
                        <i class="fa fa-search-plus"></i>
                    </button>
                    <button id="${viewType}-zoom-out" class="btn zoom-btn-circle bg-secondary text-white w-8 h-8 rounded-full flex items-center justify-center mb-1 shadow-sm hover:bg-secondary/90 transition-all duration-200">
                        <i class="fa fa-search-minus"></i>
                    </button>
                    <button id="${viewType}-zoom-fit" class="btn zoom-btn-circle bg-success text-white w-8 h-8 rounded-full flex items-center justify-center shadow-sm hover:bg-success/90 transition-all duration-200">
                        <i class="fa fa-expand"></i>
                    </button>
                </div>
                <div class="zoom-slider mt-2 px-2">
                    <input type="range" id="${viewType}-zoom-slider" min="0.1" max="5" step="0.1" value="1" 
                           class="form-range w-full h-1 bg-gray-200 rounded-lg appearance-none cursor-pointer">
                </div>
                <div class="zoom-percentage text-center text-xs mt-1 text-muted">100%</div>
            `;
            
            return zoomControls;
        };
        
        // 尝试获取容器
        let treeContainer = document.getElementById('tree-container');
        let networkContainer = document.getElementById('network-container');
        
        // 如果ID选择器失败，尝试使用类选择器作为回退
        if (!treeContainer) treeContainer = document.querySelector('.tree-view-container');
        if (!networkContainer) networkContainer = document.querySelector('.graph-view-container');
        
        if (treeContainer && networkContainer) {
            // 为容器添加相对定位类
            treeContainer.classList.add('position-relative');
            networkContainer.classList.add('position-relative');
            
            // 创建并添加缩放控制UI
            const treeZoomControls = createZoomControlUI('tree');
            const networkZoomControls = createZoomControlUI('network');
            
            // 查找现有缩放控制并替换
            const existingTreeZoom = treeContainer.querySelector('.zoom-controls-panel');
            const existingNetworkZoom = networkContainer.querySelector('.zoom-controls-panel');
            
            if (existingTreeZoom) treeContainer.removeChild(existingTreeZoom);
            if (existingNetworkZoom) networkContainer.removeChild(existingNetworkZoom);
            
            treeContainer.appendChild(treeZoomControls);
            networkContainer.appendChild(networkZoomControls);
            
            // 设置事件监听器
            this.setupZoomEvents('tree');
            this.setupZoomEvents('network');
            
            // 添加动画效果
            this.setupZoomControlsAnimation(treeContainer, treeZoomControls);
            this.setupZoomControlsAnimation(networkContainer, networkZoomControls);
        }
        
        console.log('Neo4j Editor: Zoom control listeners set up successfully');
    } catch (error) {
        console.error('Neo4j Editor: Error setting up zoom control listeners:', error);
    }
};

/**
 * 设置缩放事件处理
 */
window.viewManager.setupZoomEvents = function(viewType) {
    const cy = viewType === 'tree' ? window.cyTree : window.cyNetwork;
    const zoomSlider = document.getElementById(`${viewType}-zoom-slider`);
    const zoomPercentage = zoomSlider?.parentElement?.nextElementSibling;
    
    if (!cy) return;
    
    // 放大按钮
    const zoomInBtn = document.getElementById(`${viewType}-zoom-in`);
    if (zoomInBtn) {
        zoomInBtn.addEventListener('click', () => {
            if (cy.zoom && typeof cy.zoom === 'function') {
                const newZoom = cy.zoom() * 1.2;
                cy.zoom({ level: newZoom });
                this.animateButtonClick(`${viewType}-zoom-in`);
                
                if (zoomSlider) {
                    zoomSlider.value = newZoom.toFixed(1);
                    this.updateZoomPercentage(zoomSlider, zoomPercentage);
                }
            }
        });
    }
    
    // 缩小按钮
    const zoomOutBtn = document.getElementById(`${viewType}-zoom-out`);
    if (zoomOutBtn) {
        zoomOutBtn.addEventListener('click', () => {
            if (cy.zoom && typeof cy.zoom === 'function') {
                const newZoom = cy.zoom() * 0.8;
                cy.zoom({ level: newZoom });
                this.animateButtonClick(`${viewType}-zoom-out`);
                
                if (zoomSlider) {
                    zoomSlider.value = newZoom.toFixed(1);
                    this.updateZoomPercentage(zoomSlider, zoomPercentage);
                }
            }
        });
    }
    
    // 适应视图按钮
    const zoomFitBtn = document.getElementById(`${viewType}-zoom-fit`);
    if (zoomFitBtn) {
        zoomFitBtn.addEventListener('click', () => {
            if (cy.fit && typeof cy.fit === 'function') {
                cy.fit();
                this.animateButtonClick(`${viewType}-zoom-fit`);
                
                if (zoomSlider) {
                    zoomSlider.value = '1';
                    this.updateZoomPercentage(zoomSlider, zoomPercentage);
                }
                
                this.showZoomFitAnimation(viewType);
            }
        });
    }
    
    // 缩放滑块
    if (zoomSlider) {
        zoomSlider.addEventListener('input', () => {
            const zoomLevel = parseFloat(zoomSlider.value);
            if (cy.zoom && typeof cy.zoom === 'function') {
                cy.zoom({ level: zoomLevel });
                this.updateZoomPercentage(zoomSlider, zoomPercentage);
            }
        });
    }
};

/**
 * 更新缩放百分比显示
 */
window.viewManager.updateZoomPercentage = function(slider, percentageEl) {
    if (!percentageEl) return;
    const zoomLevel = parseFloat(slider.value);
    const percentage = Math.round(zoomLevel * 100);
    percentageEl.textContent = `${percentage}%`;
};

/**
 * 按钮点击动画
 */
window.viewManager.animateButtonClick = function(buttonId) {
    const button = document.getElementById(buttonId);
    if (button) {
        button.classList.add('scale-95');
        setTimeout(() => button.classList.remove('scale-95'), 100);
    }
};

/**
 * 设置缩放控制动画
 */
window.viewManager.setupZoomControlsAnimation = function(container, controls) {
    controls.style.opacity = '0.6';
    controls.style.transform = 'scale(0.95)';
    
    container.addEventListener('mouseenter', () => {
        controls.style.opacity = '1';
        controls.style.transform = 'scale(1)';
    });
    
    container.addEventListener('mouseleave', () => {
        if (!controls.matches(':hover')) {
            controls.style.opacity = '0.6';
            controls.style.transform = 'scale(0.95)';
        }
    });
    
    controls.addEventListener('mouseenter', () => {
        controls.style.opacity = '1';
        controls.style.transform = 'scale(1)';
    });
    
    controls.addEventListener('mouseleave', () => {
        if (!container.matches(':hover')) {
            controls.style.opacity = '0.6';
            controls.style.transform = 'scale(0.95)';
        }
    });
};

/**
 * 显示缩放适应动画
 */
window.viewManager.showZoomFitAnimation = function(viewType) {
    let container = document.getElementById(`${viewType}-container`);
    if (!container) container = document.querySelector(`.${viewType}-view-container`);
    
    if (container) {
        const animationEl = document.createElement('div');
        animationEl.className = 'zoom-fit-animation position-absolute inset-0 border-2 border-success rounded-lg opacity-0 pointer-events-none';
        container.appendChild(animationEl);
        
        setTimeout(() => {
            animationEl.style.animation = 'zoomFitEffect 1s ease-out';
        }, 10);
        
        setTimeout(() => {
            container.removeChild(animationEl);
        }, 1000);
    }
};

/**
 * 覆盖节点和关系创建函数
 */
window.viewManager.overrideCreateFunctions = function() {
    try {
        console.log('Neo4j Editor: Overriding create functions...');
        
        // 为window.sharedGraphData添加安全的getter/setter，防止意外覆盖
        Object.defineProperty(window, '_sharedGraphData', {
            value: { nodes: [], edges: [] },
            writable: true
        });
        
        Object.defineProperty(window, 'sharedGraphData', {
            get: function() {
                return window._sharedGraphData;
            },
            set: function(value) {
                console.warn('Neo4j Editor: sharedGraphData is being overridden! Previous value:', window._sharedGraphData);
                // 确保新值至少包含nodes和edges数组
                if (!value || typeof value !== 'object') {
                    console.error('Neo4j Editor: Invalid sharedGraphData value provided');
                    return; // 拒绝无效赋值
                }
                
                // 确保nodes和edges存在且为数组
                if (!Array.isArray(value.nodes)) {
                    value.nodes = [];
                }
                if (!Array.isArray(value.edges)) {
                    value.edges = [];
                }
                
                window._sharedGraphData = value;
            }
        });
        
        // 初始化共享数据
        window._sharedGraphData = { nodes: [], edges: [], selectedElement: null };
        
        // 覆盖创建节点函数
        window.createNode = function(label = 'Node', properties = {}) {
            try {
                // 调试信息
                console.log('Neo4j Editor: Creating node with label:', label);
                console.log('Neo4j Editor: Current sharedGraphData before:', window.sharedGraphData);
                
                // 生成唯一ID
                const id = 'node-' + Date.now() + '-' + Math.floor(Math.random() * 1000);
                
                // 构建节点数据
                const nodeData = {
                    id: id,
                    label: label,
                    properties: properties,
                    labels: ['tree', 'network'] // 默认同时在两个视图中显示
                };
                
                // 创建节点
                const node = {
                    group: 'nodes',
                    data: nodeData
                };
                
                // 最安全的方式添加节点 - 完全不依赖外部初始化
                const safeAddNode = () => {
                    // 确保_sharedGraphData存在
                    if (!window._sharedGraphData || typeof window._sharedGraphData !== 'object') {
                        console.log('Neo4j Editor: _sharedGraphData is not available, creating from scratch');
                        window._sharedGraphData = { nodes: [], edges: [] };
                    }
                    
                    // 确保nodes数组存在
                    if (!Array.isArray(window._sharedGraphData.nodes)) {
                        console.log('Neo4j Editor: _sharedGraphData.nodes is not an array, initializing');
                        window._sharedGraphData.nodes = [];
                    }
                    
                    // 添加节点
                    window._sharedGraphData.nodes.push(node);
                    console.log('Neo4j Editor: Node added successfully');
                };
                
                // 执行安全添加
                safeAddNode();
                
                // 同步到视图
                try {
                    if (window.viewManager && typeof window.viewManager.syncGraphData === 'function') {
                        window.viewManager.syncGraphData();
                        console.log('Neo4j Editor: Graph data synchronized');
                    } else {
                        console.warn('Neo4j Editor: viewManager or syncGraphData not available');
                    }
                } catch (syncError) {
                    console.error('Neo4j Editor: Error during graph sync:', syncError);
                }
                
                // 显示成功通知
                if (window.notificationManager && typeof window.notificationManager.showToast === 'function') {
                    window.notificationManager.showToast('Node "' + label + '" created successfully', 'success');
                }
                
                return id; // 返回节点ID
            } catch (error) {
                console.error('Neo4j Editor: Error creating node:', error);
                console.error('Neo4j Editor: Error stack:', error.stack);
                console.error('Neo4j Editor: sharedGraphData state during error:', window._sharedGraphData);
                
                // 显示错误通知
                if (window.notificationManager && typeof window.notificationManager.showToast === 'function') {
                    window.notificationManager.showToast('Failed to create node: ' + error.message, 'error');
                }
                
                return null;
            }
        };
        
        // 覆盖创建关系函数
        window.createRelationship = function(sourceId, targetId, type = 'RELATES_TO', properties = {}) {
            try {
                // 验证节点是否存在
                if (!window.sharedGraphData || !window.sharedGraphData.nodes) {
                    throw new Error('节点数据不存在');
                }
                
                console.log('Neo4j Editor: Trying to create relationship with sourceId:', sourceId, 'targetId:', targetId);
                console.log('Neo4j Editor: Available nodes count:', window.sharedGraphData.nodes.length);
                
                // 优化的节点查找逻辑，支持更灵活的ID匹配
                const sourceIdStr = String(sourceId);
                const targetIdStr = String(targetId);
                
                console.log('Neo4j Editor: Searching for nodes with IDs:', sourceIdStr, targetIdStr);
                
                // 查找源节点，尝试多种匹配方式
                let sourceNode = null;
                let targetNode = null;
                
                // 遍历所有节点进行详细检查
                for (const node of window.sharedGraphData.nodes) {
                    if (!node) continue;
                    
                    // 提取节点的所有可能ID
                    const nodeIds = new Set();
                    
                    // 检查各种可能的ID位置
                    if (node.data) {
                        if (node.data.id) nodeIds.add(String(node.data.id));
                        if (node.data._id) nodeIds.add(String(node.data._id));
                    }
                    if (node.id) nodeIds.add(String(node.id));
                    if (node._id) nodeIds.add(String(node._id));
                    
                    console.log('Neo4j Editor: Node possible IDs:', Array.from(nodeIds));
                    
                    // 检查是否匹配源节点或目标节点
                    if (nodeIds.has(sourceIdStr) && !sourceNode) {
                        sourceNode = node;
                        console.log('Neo4j Editor: Found source node:', sourceIdStr);
                    }
                    if (nodeIds.has(targetIdStr) && !targetNode) {
                        targetNode = node;
                        console.log('Neo4j Editor: Found target node:', targetIdStr);
                    }
                    
                    // 如果两个节点都找到了，可以提前退出循环
                    if (sourceNode && targetNode) break;
                }
                
                if (!sourceNode || !targetNode) {
                    // 收集调试信息
                    const debugInfo = {
                        timestamp: new Date().toISOString(),
                        sourceId: String(sourceId),
                        targetId: String(targetId),
                        sourceNodeFound: !!sourceNode,
                        targetNodeFound: !!targetNode,
                        availableNodes: window.sharedGraphData.nodes.length,
                        firstNodes: window.sharedGraphData.nodes.slice(0, 3).map(n => ({
                            dataId: n.data?.id,
                            nodeId: n.id
                        }))
                    };
                    
                    // 打印到控制台
                    console.error('Neo4j Editor: Relationship creation failed:', debugInfo);
                    
                    // 创建或更新调试信息显示在页面上
                    let debugDiv = document.getElementById('neo4j-debug-info');
                    if (!debugDiv) {
                        debugDiv = document.createElement('div');
                        debugDiv.id = 'neo4j-debug-info';
                        debugDiv.style.cssText = 'position: fixed; top: 10px; right: 10px; background: #ffeeee; border: 1px solid red; padding: 10px; max-width: 400px; z-index: 9999; overflow: auto;';
                        document.body.appendChild(debugDiv);
                    }
                    debugDiv.innerHTML = '<pre style="font-family: monospace; font-size: 12px;">' + JSON.stringify(debugInfo, null, 2) + '</pre>';
                    
                    // 抛出错误
                    const errorMsg = '源节点或目标节点不存在 (源ID: ' + String(sourceId) + ', 目标ID: ' + String(targetId) + ')';
                    throw new Error(errorMsg);
                }
                
                console.log('Neo4j Editor: Successfully found both nodes');
                
                // 生成唯一ID
                const id = 'rel-' + Date.now() + '-' + Math.floor(Math.random() * 1000);
                
                // 构建关系数据
                const relData = {
                    id: id,
                    source: sourceId,
                    target: targetId,
                    type: type,
                    properties: properties
                };
                
                // 检查关系是否已存在
                const existingRel = window.sharedGraphData.edges.find(e => {
                    const relSource = e.data ? e.data.source : e.source;
                    const relTarget = e.data ? e.data.target : e.target;
                    const relType = e.data ? e.data.type : e.type;
                    return relSource === sourceId && relTarget === targetId && relType === type;
                });
                
                if (existingRel) {
                    throw new Error('相同的关系已存在');
                }
                
                // 创建关系
                const relationship = {
                    group: 'edges',
                    data: relData
                };
                
                // 添加到共享数据
                window.sharedGraphData.edges.push(relationship);
                
                // 根据关系类型，添加相应的标签
                // 确保labels属性是数组
                if (!sourceNode.data.labels || !Array.isArray(sourceNode.data.labels)) {
                    sourceNode.data.labels = [];
                }
                if (!targetNode.data.labels || !Array.isArray(targetNode.data.labels)) {
                    targetNode.data.labels = [];
                }
                
                if (type === 'CHILD_OF') {
                    // 确保节点在树视图中显示
                    if (!sourceNode.data.labels.includes('tree')) {
                        sourceNode.data.labels.push('tree');
                    }
                    if (!targetNode.data.labels.includes('tree')) {
                        targetNode.data.labels.push('tree');
                    }
                } else if (type === 'RELATES_TO') {
                    // 确保节点在网络图中显示
                    if (!sourceNode.data.labels.includes('network')) {
                        sourceNode.data.labels.push('network');
                    }
                    if (!targetNode.data.labels.includes('network')) {
                        targetNode.data.labels.push('network');
                    }
                } else if (type === 'SIBLING_OF') {
                    // 兄弟关系同时在两个视图中显示
                    if (!sourceNode.data.labels.includes('tree')) {
                        sourceNode.data.labels.push('tree');
                    }
                    if (!targetNode.data.labels.includes('tree')) {
                        targetNode.data.labels.push('tree');
                    }
                    if (!sourceNode.data.labels.includes('network')) {
                        sourceNode.data.labels.push('network');
                    }
                    if (!targetNode.data.labels.includes('network')) {
                        targetNode.data.labels.push('network');
                    }
                }
                
                // 同步到视图
                window.viewManager.syncGraphData();
                
                // 显示成功通知
                if (window.notificationManager && window.notificationManager.showToast) {
                    window.notificationManager.showToast('Relationship "' + type + '" created successfully', 'success');
                }
                
                return id; // 返回关系ID
            } catch (error) {
                console.error('Neo4j Editor: Error creating relationship:', error);
                
                // 显示错误通知
                if (window.notificationManager && window.notificationManager.showToast) {
                    window.notificationManager.showToast('Failed to create relationship: ' + error.message, 'error');
                }
                
                return null;
            }
        };
        
        console.log('Neo4j Editor: Create functions overridden successfully');
    } catch (error) {
        console.error('Neo4j Editor: Error overriding create functions:', error);
    }
};

/**
 * 设置视图模式按钮
 */
window.viewManager.setupViewModeButtons = function() {
    try {
        console.log('Neo4j Editor: Setting up view mode buttons...');
        
        // 获取容器
        const container = document.querySelector('.view-container');
        if (!container) {
            console.warn('Neo4j Editor: View container not found');
            return;
        }
        
        // 创建视图模式按钮容器
        let modeButtonsContainer = document.querySelector('.view-mode-buttons');
        if (!modeButtonsContainer) {
            modeButtonsContainer = document.createElement('div');
            modeButtonsContainer.className = 'view-mode-buttons';
            container.appendChild(modeButtonsContainer);
        }
        
        // 检查按钮是否已存在
        if (modeButtonsContainer.querySelector('.view-mode-btn')) {
            console.log('Neo4j Editor: View mode buttons already exist');
            return;
        }
        
        // 创建分屏按钮
        const splitBtn = document.createElement('button');
        splitBtn.className = 'view-mode-btn';
        splitBtn.setAttribute('data-mode', 'split');
        splitBtn.textContent = 'Split';
        splitBtn.title = 'Show both tree and network views';
        
        // 创建树视图按钮
        const treeBtn = document.createElement('button');
        treeBtn.className = 'view-mode-btn';
        treeBtn.setAttribute('data-mode', 'tree');
        treeBtn.textContent = 'Tree';
        treeBtn.title = 'Show only tree view';
        
        // 创建网络图按钮
        const graphBtn = document.createElement('button');
        graphBtn.className = 'view-mode-btn';
        graphBtn.setAttribute('data-mode', 'graph');
        graphBtn.textContent = 'Network';
        graphBtn.title = 'Show only network view';
        
        // 添加按钮到容器
        modeButtonsContainer.appendChild(splitBtn);
        modeButtonsContainer.appendChild(treeBtn);
        modeButtonsContainer.appendChild(graphBtn);
        
        // 添加事件监听器
        const treeContainer = document.querySelector('.tree-view-container');
        const graphContainer = document.querySelector('.graph-view-container');
        
        if (!treeContainer || !graphContainer) {
            console.warn('Neo4j Editor: Tree or graph container not found');
            return;
        }
        
        // 绑定事件
        splitBtn.addEventListener('click', () => {
            if (window.viewModeManager && window.viewModeManager.switchViewMode) {
                window.viewModeManager.switchViewMode('split', treeContainer, graphContainer);
            }
        });
        
        treeBtn.addEventListener('click', () => {
            if (window.viewModeManager && window.viewModeManager.switchViewMode) {
                window.viewModeManager.switchViewMode('tree', treeContainer, graphContainer);
            }
        });
        
        graphBtn.addEventListener('click', () => {
            if (window.viewModeManager && window.viewModeManager.switchViewMode) {
                window.viewModeManager.switchViewMode('graph', treeContainer, graphContainer);
            }
        });
        
        // 设置初始活动按钮
        if (window.viewModeManager && window.viewModeManager.updateViewModeButtonStyles) {
            window.viewModeManager.updateViewModeButtonStyles('split');
        }
        
        console.log('Neo4j Editor: View mode buttons set up successfully');
    } catch (error) {
        console.error('Neo4j Editor: Error setting up view mode buttons:', error);
    }
};

/**
 * 设置批量关系编辑UI
 */
window.viewManager.setupBatchRelationEditor = function() {
    try {
        console.log('Neo4j Editor: Setting up batch relation editor...');
        
        // 获取容器
        const container = document.querySelector('.graph-view-container');
        if (!container) {
            console.warn('Neo4j Editor: Graph view container not found');
            return;
        }
        
        // 创建关系类型选择器
        const relationTypePanel = document.createElement('div');
        relationTypePanel.className = 'relation-types';
        
        // 创建关系类型标题
        const relationTypeTitle = document.createElement('span');
        relationTypeTitle.textContent = 'Relation Type:';
        relationTypeTitle.style.fontWeight = 'bold';
        relationTypeTitle.style.marginRight = '8px';
        
        // 创建关系类型按钮
        const relationTypes = [
            { value: 'CHILD_OF', label: 'Parent-Child' },
            { value: 'RELATES_TO', label: 'Related To' },
            { value: 'SIBLING_OF', label: 'Sibling' }
        ];
        
        relationTypes.forEach(type => {
            const btn = document.createElement('button');
            btn.className = 'relation-type-btn';
            btn.setAttribute('data-type', type.value);
            btn.textContent = type.label;
            
            btn.addEventListener('click', () => {
                // 移除其他按钮的活动状态
                document.querySelectorAll('.relation-type-btn').forEach(b => {
                    b.classList.remove('active');
                });
                
                // 添加当前按钮的活动状态
                btn.classList.add('active');
                
                // 保存当前选中的关系类型
                window.selectedRelationType = type.value;
            });
            
            relationTypePanel.appendChild(btn);
        });
        
        // 默认选中第一个关系类型
        const firstBtn = relationTypePanel.querySelector('.relation-type-btn');
        if (firstBtn) {
            firstBtn.classList.add('active');
            window.selectedRelationType = firstBtn.getAttribute('data-type');
        }
        
        // 添加到容器
        container.insertBefore(relationTypePanel, container.firstChild);
        
        // 创建批量编辑面板
        const batchEditorPanel = document.createElement('div');
        batchEditorPanel.className = 'batch-editor-panel';
        
        // 创建标题
        const editorTitle = document.createElement('h4');
        editorTitle.textContent = 'Batch Relationship Settings';
        editorTitle.style.marginTop = '0';
        editorTitle.style.marginBottom = '15px';
        
        // 创建下拉选择器
        const selectorRow = document.createElement('div');
        selectorRow.className = 'editor-row';
        
        const selectorLabel = document.createElement('label');
        selectorLabel.className = 'editor-label';
        selectorLabel.textContent = 'Select Parent Node:';
        
        const nodeSelector = document.createElement('select');
        nodeSelector.id = 'parent-node-selector';
        nodeSelector.className = 'editor-select';
        
        // 添加默认选项
        const defaultOption = document.createElement('option');
        defaultOption.value = '';
        defaultOption.textContent = '-- Select Parent Node --';
        nodeSelector.appendChild(defaultOption);
        
        selectorRow.appendChild(selectorLabel);
        selectorRow.appendChild(nodeSelector);
        
        // 创建操作按钮
        const actionsRow = document.createElement('div');
        actionsRow.style.display = 'flex';
        actionsRow.style.gap = '10px';
        actionsRow.style.marginTop = '15px';
        
        // 设置子节点按钮
        const setChildrenBtn = document.createElement('button');
        setChildrenBtn.className = 'tool-btn';
        setChildrenBtn.textContent = 'Set as Children';
        setChildrenBtn.title = 'Set selected nodes as children of the chosen parent node';
        
        setChildrenBtn.addEventListener('click', () => {
            // 检查是否有性能监控器
            if (window.performanceMonitor && window.performanceMonitor.start) {
                window.performanceMonitor.start('batchSetChildren');
            }
            
            const parentId = nodeSelector.value;
            if (!parentId) {
                if (window.notificationManager && window.notificationManager.showToast) {
                    window.notificationManager.showToast('Please select a parent node', 'warning');
                }
                return;
            }
            
            this.batchSetChildren(parentId);
            
            // 结束性能监控
            if (window.performanceMonitor && window.performanceMonitor.end) {
                window.performanceMonitor.end('batchSetChildren');
            }
        });
        
        // 自动建立同级关系按钮
        const relateSiblingsBtn = document.createElement('button');
        relateSiblingsBtn.className = 'tool-btn';
        relateSiblingsBtn.textContent = 'Create Sibling Relations';
        relateSiblingsBtn.title = 'Create sibling relationships between selected nodes';
        
        relateSiblingsBtn.addEventListener('click', () => {
            // 检查是否有性能监控器
            if (window.performanceMonitor && window.performanceMonitor.start) {
                window.performanceMonitor.start('autoRelateSiblings');
            }
            
            this.autoRelateSiblings();
            
            // 结束性能监控
            if (window.performanceMonitor && window.performanceMonitor.end) {
                window.performanceMonitor.end('autoRelateSiblings');
            }
        });
        
        // 删除选中关系按钮
        const deleteRelationsBtn = document.createElement('button');
        deleteRelationsBtn.className = 'tool-btn';
        deleteRelationsBtn.textContent = 'Delete Selected Relations';
        deleteRelationsBtn.title = 'Delete selected relationships';
        deleteRelationsBtn.style.backgroundColor = '#ffebee';
        deleteRelationsBtn.style.borderColor = '#ffcdd2';
        
        deleteRelationsBtn.addEventListener('click', () => {
            // 检查是否有性能监控器
            if (window.performanceMonitor && window.performanceMonitor.start) {
                window.performanceMonitor.start('batchDeleteRelations');
            }
            
            this.batchDeleteRelations();
            
            // 结束性能监控
            if (window.performanceMonitor && window.performanceMonitor.end) {
                window.performanceMonitor.end('batchDeleteRelations');
            }
        });
        
        actionsRow.appendChild(setChildrenBtn);
        actionsRow.appendChild(relateSiblingsBtn);
        actionsRow.appendChild(deleteRelationsBtn);
        
        // 组合批量编辑面板
        batchEditorPanel.appendChild(editorTitle);
        batchEditorPanel.appendChild(selectorRow);
        batchEditorPanel.appendChild(actionsRow);
        
        // 添加到容器
        container.insertBefore(batchEditorPanel, relationTypePanel.nextSibling);
        
        // 更新节点选择器
        this.updateNodeSelector();
        
        console.log('Neo4j Editor: Batch relation editor set up successfully');
    } catch (error) {
        console.error('Neo4j Editor: Error setting up batch relation editor:', error);
    }
};

/**
 * 更新节点选择器
 */
window.viewManager.updateNodeSelector = function() {
    try {
        const nodeSelector = document.getElementById('parent-node-selector');
        if (!nodeSelector) {
            console.warn('Neo4j Editor: Node selector not found');
            return;
        }
        
        // 保存当前选中的值
        const currentValue = nodeSelector.value;
        
        // 清空现有选项（保留默认选项）
        while (nodeSelector.options.length > 1) {
            nodeSelector.remove(1);
        }
        
        // 获取共享数据中的节点
        const nodes = window.sharedGraphData?.nodes || [];
        
        // 添加节点选项
        nodes.forEach(node => {
            try {
                if (node.data && node.data.id && node.data.label) {
                    const option = document.createElement('option');
                    option.value = node.data.id;
                    option.textContent = `${node.data.label} (${node.data.id})`;
                    nodeSelector.appendChild(option);
                }
            } catch (e) {
                console.warn('Neo4j Editor: Error adding node to selector:', e);
            }
        });
        
        // 恢复之前的选择（如果存在）
        if (currentValue && nodeSelector.querySelector(`option[value="${currentValue}"]`)) {
            nodeSelector.value = currentValue;
        }
    } catch (error) {
        console.error('Neo4j Editor: Error updating node selector:', error);
    }
};

/**
 * 批量设置子节点
 */
window.viewManager.batchSetChildren = function(parentId) {
    try {
        // 获取选中的节点
        let selectedNodes = [];
        
        // 从两个视图中获取选中的节点
        if (window.cyTree && window.cyTree.nodes) {
            window.cyTree.nodes(':selected').forEach(node => {
                try {
                    const nodeData = node.data();
                    if (nodeData && nodeData.id && nodeData.id !== parentId) {
                        selectedNodes.push(nodeData.id);
                    }
                } catch (e) {
                    console.warn('Neo4j Editor: Error getting selected tree node:', e);
                }
            });
        }
        
        if (window.cyNetwork && window.cyNetwork.nodes) {
            window.cyNetwork.nodes(':selected').forEach(node => {
                try {
                    const nodeData = node.data();
                    if (nodeData && nodeData.id && nodeData.id !== parentId && 
                        !selectedNodes.includes(nodeData.id)) {
                        selectedNodes.push(nodeData.id);
                    }
                } catch (e) {
                    console.warn('Neo4j Editor: Error getting selected network node:', e);
                }
            });
        }
        
        if (selectedNodes.length === 0) {
            if (window.notificationManager && window.notificationManager.showToast) {
                window.notificationManager.showToast('Please select nodes to set as children', 'warning');
            }
            return;
        }
        
        // 创建进度提示
        const progressId = 'batchSetChildren';
        this.showProgressToast(progressId, 'Creating parent-child relationships...', 0);
        
        // 批量创建关系
        let successCount = 0;
        const totalCount = selectedNodes.length;
        
        selectedNodes.forEach((childId, index) => {
            // 检查关系是否已存在
            const existingRel = window.sharedGraphData.edges.find(e => 
                e.data.source === childId && 
                e.data.target === parentId && 
                e.data.type === 'CHILD_OF'
            );
            
            if (!existingRel) {
                // 创建CHILD_OF关系
                window.createRelationship(childId, parentId, 'CHILD_OF');
                successCount++;
            }
            
            // 更新进度
            const progress = Math.round(((index + 1) / totalCount) * 100);
            this.updateProgressToast(progressId, 'Creating relationships... ' + (index + 1) + '/' + totalCount, progress);
        });
        
        // 移除进度提示
        this.updateProgressToast(progressId, 'Relationships created', 100);
        setTimeout(() => {
            this.removeProgressToast(progressId);
        }, 500);
        
        // 显示结果通知
        if (window.notificationManager && window.notificationManager.showToast) {
            window.notificationManager.showToast('Successfully created ' + successCount + '/' + totalCount + ' parent-child relationships', 'success');
        }
    } catch (error) {
        console.error('Neo4j Editor: Error in batchSetChildren:', error);
        
        // 显示错误通知
        if (window.notificationManager && window.notificationManager.showToast) {
            window.notificationManager.showToast('Failed to set nodes as children', 'error');
        }
    }
};

/**
 * 自动建立同级关系
 */
window.viewManager.autoRelateSiblings = function() {
    try {
        // 获取选中的节点
        let selectedNodes = [];
        
        // 从两个视图中获取选中的节点
        if (window.cyTree && window.cyTree.nodes) {
            window.cyTree.nodes(':selected').forEach(node => {
                try {
                    const nodeData = node.data();
                    if (nodeData && nodeData.id) {
                        selectedNodes.push(nodeData.id);
                    }
                } catch (e) {
                    console.warn('Neo4j Editor: Error getting selected tree node:', e);
                }
            });
        }
        
        if (window.cyNetwork && window.cyNetwork.nodes) {
            window.cyNetwork.nodes(':selected').forEach(node => {
                try {
                    const nodeData = node.data();
                    if (nodeData && nodeData.id && !selectedNodes.includes(nodeData.id)) {
                        selectedNodes.push(nodeData.id);
                    }
                } catch (e) {
                    console.warn('Neo4j Editor: Error getting selected network node:', e);
                }
            });
        }
        
        if (selectedNodes.length < 2) {
            if (window.notificationManager && window.notificationManager.showToast) {
                window.notificationManager.showToast('Please select at least two nodes to create sibling relationships', 'warning');
            }
            return;
        }
        
        // 创建进度提示
        const progressId = 'autoRelateSiblings';
        this.showProgressToast(progressId, 'Creating sibling relationships...', 0);
        
        // 计算需要创建的关系数量
        const totalCount = selectedNodes.length * (selectedNodes.length - 1);
        let successCount = 0;
        let currentIndex = 0;
        
        // 为每对节点创建SIBLING_OF关系
        for (let i = 0; i < selectedNodes.length; i++) {
            for (let j = 0; j < selectedNodes.length; j++) {
                if (i !== j) {
                    const sourceId = selectedNodes[i];
                    const targetId = selectedNodes[j];
                    
                    // 检查关系是否已存在（两个方向）
                    const existingRel1 = window.sharedGraphData.edges.find(e => 
                        e.data.source === sourceId && 
                        e.data.target === targetId && 
                        e.data.type === 'SIBLING_OF'
                    );
                    
                    const existingRel2 = window.sharedGraphData.edges.find(e => 
                        e.data.source === targetId && 
                        e.data.target === sourceId && 
                        e.data.type === 'SIBLING_OF'
                    );
                    
                    if (!existingRel1 && !existingRel2) {
                        // 创建SIBLING_OF关系
                        window.createRelationship(sourceId, targetId, 'SIBLING_OF');
                        successCount++;
                    }
                    
                    // 更新进度
                    currentIndex++;
                    const progress = Math.round((currentIndex / totalCount) * 100);
                    this.updateProgressToast(progressId, 'Creating relationships... ' + currentIndex + '/' + totalCount, progress);
                }
            }
        }
        
        // 移除进度提示
        this.updateProgressToast(progressId, 'Sibling relationships created', 100);
        setTimeout(() => {
            this.removeProgressToast(progressId);
        }, 500);
        
        // 显示结果通知
        if (window.notificationManager && window.notificationManager.showToast) {
            window.notificationManager.showToast('Successfully created ' + successCount + '/' + totalCount + ' sibling relationships', 'success');
        }
    } catch (error) {
        console.error('Neo4j Editor: Error in autoRelateSiblings:', error);
        
        // 显示错误通知
        if (window.notificationManager && window.notificationManager.showToast) {
            window.notificationManager.showToast('Failed to create sibling relationships', 'error');
        }
    }
};

/**
 * 批量删除关系
 */
window.viewManager.batchDeleteRelations = function() {
    try {
        // 获取选中的边
        let selectedEdges = [];
        
        // 从两个视图中获取选中的边
        if (window.cyTree && window.cyTree.edges) {
            window.cyTree.edges(':selected').forEach(edge => {
                try {
                    const edgeData = edge.data();
                    if (edgeData && edgeData.id) {
                        selectedEdges.push(edgeData.id);
                    }
                } catch (e) {
                    console.warn('Neo4j Editor: Error getting selected tree edge:', e);
                }
            });
        }
        
        if (window.cyNetwork && window.cyNetwork.edges) {
            window.cyNetwork.edges(':selected').forEach(edge => {
                try {
                    const edgeData = edge.data();
                    if (edgeData && edgeData.id && !selectedEdges.includes(edgeData.id)) {
                        selectedEdges.push(edgeData.id);
                    }
                } catch (e) {
                    console.warn('Neo4j Editor: Error getting selected network edge:', e);
                }
            });
        }
        
        if (selectedEdges.length === 0) {
            if (window.notificationManager && window.notificationManager.showToast) {
                window.notificationManager.showToast('Please select relationships to delete', 'warning');
            }
            return;
        }
        
        // 确认删除
        const confirmDelete = confirm('Are you sure you want to delete the selected ' + selectedEdges.length + ' relationships?');
        if (!confirmDelete) return;
        
        // 创建进度提示
        const progressId = 'batchDeleteRelations';
        this.showProgressToast(progressId, 'Deleting relationships...', 0);
        
        // 从共享数据中删除关系
        window.sharedGraphData.edges = window.sharedGraphData.edges.filter(edge => 
            !selectedEdges.includes(edge.data.id)
        );
        
        // 更新进度
        this.updateProgressToast(progressId, 'Relationships deleted', 100);
        
        // 同步到视图
        this.syncGraphData();
        
        // 移除进度提示
        setTimeout(() => {
            this.removeProgressToast(progressId);
        }, 500);
        
        // 显示成功通知
        if (window.notificationManager && window.notificationManager.showToast) {
            window.notificationManager.showToast('Successfully deleted ' + selectedEdges.length + ' relationships', 'success');
        }
    } catch (error) {
        console.error('Neo4j Editor: Error in batchDeleteRelations:', error);
        
        // 显示错误通知
        if (window.notificationManager && window.notificationManager.showToast) {
            window.notificationManager.showToast('Failed to delete relationships', 'error');
        }
    }
};

/**
 * 更新元素计数
 */
window.viewManager.updateElementCounts = function() {
    try {
        // 获取节点和边的数量
        const nodeCount = window.sharedGraphData?.nodes?.length || 0;
        const edgeCount = window.sharedGraphData?.edges?.length || 0;
        
        // 估算数据大小
        let dataSize = 0;
        try {
            dataSize = new Blob([JSON.stringify(window.sharedGraphData)]).size;
        } catch (e) {
            console.warn('Neo4j Editor: Error calculating data size:', e);
            dataSize = 0;
        }
        
        // 格式化数据大小
        let formattedSize = '0 Bytes';
        if (dataSize > 0) {
            const k = 1024;
            const sizes = ['Bytes', 'KB', 'MB', 'GB'];
            const i = Math.floor(Math.log(dataSize) / Math.log(k));
            formattedSize = parseFloat((dataSize / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
        }
        
        // 创建或更新计数显示
        let countElement = document.querySelector('.element-counts');
        if (!countElement) {
            countElement = document.createElement('div');
            countElement.className = 'element-counts';
            
            // 添加到两个视图容器
            const treeContainer = document.querySelector('.tree-view-container');
            const graphContainer = document.querySelector('.graph-view-container');
            
            if (treeContainer) {
                const treeCountElement = countElement.cloneNode(true);
                treeContainer.appendChild(treeCountElement);
            }
            
            if (graphContainer) {
                graphContainer.appendChild(countElement);
            }
        } else {
            // 更新内容
            countElement.textContent = `Nodes: ${nodeCount} | Relationships: ${edgeCount} | Data Size: ${formattedSize}`;
            
            // 更新树视图中的计数
            const treeCountElement = document.querySelector('.tree-view-container .element-counts');
            if (treeCountElement && treeCountElement !== countElement) {
                treeCountElement.textContent = `Nodes: ${nodeCount} | Relationships: ${edgeCount} | Data Size: ${formattedSize}`;
            }
        }
    } catch (error) {
        console.error('Neo4j Editor: Error updating element counts:', error);
    }
};

/**
 * 设置标签过滤UI
 */
window.viewManager.setupLabelFilterUI = function() {
    try {
        console.log('Neo4j Editor: Setting up label filter UI...');
        
        // 获取容器
        const container = document.querySelector('.graph-view-container');
        if (!container) {
            console.warn('Neo4j Editor: Graph view container not found');
            return;
        }
        
        // 查找现有的过滤面板
        let filterPanel = document.querySelector('.label-filter-panel');
        if (!filterPanel) {
            // 创建过滤面板
            filterPanel = document.createElement('div');
            filterPanel.className = 'label-filter-panel';
            
            // 添加搜索框
            const searchInput = document.createElement('input');
            searchInput.type = 'text';
            searchInput.className = 'filter-search';
            searchInput.placeholder = '搜索标签...';
            
            // 添加操作按钮
            const actionsDiv = document.createElement('div');
            actionsDiv.className = 'filter-actions';
            
            const selectAllBtn = document.createElement('button');
            selectAllBtn.className = 'filter-btn';
            selectAllBtn.textContent = 'Select All';
            
            const clearAllBtn = document.createElement('button');
            clearAllBtn.className = 'filter-btn';
            clearAllBtn.textContent = 'Clear All';
            
            const applyBtn = document.createElement('button');
            applyBtn.className = 'filter-btn active';
            applyBtn.textContent = 'Apply';
            
            actionsDiv.appendChild(selectAllBtn);
            actionsDiv.appendChild(clearAllBtn);
            actionsDiv.appendChild(applyBtn);
            
            // 添加标签列表
            const filterList = document.createElement('div');
            filterList.className = 'filter-list';
            
            // 组合面板
            filterPanel.appendChild(searchInput);
            filterPanel.appendChild(actionsDiv);
            filterPanel.appendChild(filterList);
            
            // 添加到容器
            container.insertBefore(filterPanel, container.firstChild);
        }
        
        // 初始化标签列表
        this.updateLabelFilterList();
        
        // 添加事件监听器
        const searchInput = filterPanel.querySelector('.filter-search');
        const selectAllBtn = filterPanel.querySelector('.filter-btn:nth-child(1)');
        const clearAllBtn = filterPanel.querySelector('.filter-btn:nth-child(2)');
        const applyBtn = filterPanel.querySelector('.filter-btn:nth-child(3)');
        const filterList = filterPanel.querySelector('.filter-list');
        
        // 搜索功能
        searchInput.addEventListener('input', () => {
            const searchTerm = searchInput.value.toLowerCase();
            const filterItems = filterList.querySelectorAll('.filter-item');
            
            filterItems.forEach(item => {
                const labelText = item.querySelector('label').textContent.toLowerCase();
                item.style.display = labelText.includes(searchTerm) ? 'flex' : 'none';
            });
        });
        
        // 全选按钮
        selectAllBtn.addEventListener('click', () => {
            const checkboxes = filterList.querySelectorAll('input[type="checkbox"]');
            checkboxes.forEach(checkbox => {
                checkbox.checked = true;
            });
        });
        
        // 清除按钮
        clearAllBtn.addEventListener('click', () => {
            const checkboxes = filterList.querySelectorAll('input[type="checkbox"]');
            checkboxes.forEach(checkbox => {
                checkbox.checked = false;
            });
        });
        
        // 应用按钮
        applyBtn.addEventListener('click', () => {
            this.applyLabelFilter();
        });
        
        console.log('Neo4j Editor: Label filter UI set up successfully');
    } catch (error) {
        console.error('Neo4j Editor: Error setting up label filter UI:', error);
    }
};

/**
 * 更新标签过滤列表
 */
window.viewManager.updateLabelFilterList = function() {
    try {
        const filterList = document.querySelector('.filter-list');
        if (!filterList) return;
        
        // 清空现有列表
        filterList.innerHTML = '';
        
        // 从节点中提取所有唯一标签
        const labels = new Set();
        const nodes = window.sharedGraphData?.nodes || [];
        
        nodes.forEach(node => {
            if (node.data && node.data.label) {
                labels.add(node.data.label);
            }
        });
        
        // 创建标签项
        Array.from(labels).sort().forEach(label => {
            const item = document.createElement('div');
            item.className = 'filter-item';
            
            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.id = `filter-${label}`;
            checkbox.value = label;
            checkbox.checked = true; // 默认全部选中
            
            const labelElement = document.createElement('label');
            labelElement.htmlFor = `filter-${label}`;
            labelElement.textContent = label;
            
            item.appendChild(checkbox);
            item.appendChild(labelElement);
            
            // 添加点击事件
            item.addEventListener('click', (e) => {
                // 如果点击的不是复选框，则切换复选框状态
                if (e.target !== checkbox && e.target !== labelElement) {
                    checkbox.checked = !checkbox.checked;
                }
            });
            
            filterList.appendChild(item);
        });
    } catch (error) {
        console.error('Neo4j Editor: Error updating label filter list:', error);
    }
};

/**
 * 应用标签过滤
 */
window.viewManager.applyLabelFilter = function() {
    try {
        const filterList = document.querySelector('.filter-list');
        if (!filterList) return;
        
        // 获取选中的标签
        const selectedLabels = new Set();
        const checkboxes = filterList.querySelectorAll('input[type="checkbox"]:checked');
        
        checkboxes.forEach(checkbox => {
            selectedLabels.add(checkbox.value);
        });
        
        // 更新节点的标签，添加或移除'network'标签
        const nodes = window.sharedGraphData?.nodes || [];
        
        nodes.forEach(node => {
            if (node.data && node.data.label) {
                // 确保labels数组存在
                if (!Array.isArray(node.data.labels)) {
                    node.data.labels = [];
                }
                
                const hasLabel = selectedLabels.has(node.data.label);
                const hasNetworkLabel = node.data.labels.includes('network');
                
                if (hasLabel && !hasNetworkLabel) {
                    // 添加network标签
                    node.data.labels.push('network');
                } else if (!hasLabel && hasNetworkLabel) {
                    // 移除network标签
                    node.data.labels = node.data.labels.filter(l => l !== 'network');
                }
            }
        });
        
        // 同步到视图
        this.syncGraphData();
        
        // 显示成功通知
        if (window.notificationManager && window.notificationManager.showToast) {
            window.notificationManager.showToast('Filtered to show nodes with ' + selectedLabels.size + ' tags', 'success');
        }
    } catch (error) {
        console.error('Neo4j Editor: Error applying label filter:', error);
        
        // 显示错误通知
        if (window.notificationManager && window.notificationManager.showToast) {
            window.notificationManager.showToast('Failed to apply tag filter', 'error');
        }
    }
};

/**
 * 设置保存按钮
 */
window.viewManager.setupSaveButtons = function() {
    try {
        console.log('Neo4j Editor: Setting up save buttons...');
        
        // 获取容器
        const container = document.querySelector('.graph-view-container');
        if (!container) {
            console.warn('Neo4j Editor: Graph view container not found');
            return;
        }
        
        // 创建工具栏
        let toolButtonsContainer = document.querySelector('.tool-buttons');
        if (!toolButtonsContainer) {
            toolButtonsContainer = document.createElement('div');
            toolButtonsContainer.className = 'tool-buttons';
            container.appendChild(toolButtonsContainer);
        }
        
        // 创建保存按钮
        const saveBtn = document.createElement('button');
        saveBtn.className = 'tool-btn';
        saveBtn.innerHTML = '💾 保存';
        saveBtn.title = '保存当前数据';
        
        // 创建加载按钮
        const loadBtn = document.createElement('button');
        loadBtn.className = 'tool-btn';
        loadBtn.innerHTML = '📂 加载';
        loadBtn.title = '加载保存的数据';
        
        // 创建导出按钮
        const exportBtn = document.createElement('button');
        exportBtn.className = 'tool-btn';
        exportBtn.innerHTML = '📤 导出';
        exportBtn.title = '导出数据为CSV';
        
        // 创建导入按钮
        const importBtn = document.createElement('button');
        importBtn.className = 'tool-btn';
        importBtn.innerHTML = '📥 导入';
        importBtn.title = '从CSV导入数据';
        
        // 创建清空按钮
        const clearBtn = document.createElement('button');
        clearBtn.className = 'tool-btn';
        clearBtn.innerHTML = '🗑️ 清空';
        clearBtn.title = '清空所有数据';
        clearBtn.style.backgroundColor = '#ffebee';
        clearBtn.style.borderColor = '#ffcdd2';
        
        // 添加性能报告按钮
        const performanceBtn = document.createElement('button');
        performanceBtn.className = 'tool-btn';
        performanceBtn.innerHTML = '📊 性能报告';
        performanceBtn.title = '查看性能报告';
        
        // 添加到容器
        toolButtonsContainer.appendChild(saveBtn);
        toolButtonsContainer.appendChild(loadBtn);
        toolButtonsContainer.appendChild(exportBtn);
        toolButtonsContainer.appendChild(importBtn);
        toolButtonsContainer.appendChild(clearBtn);
        toolButtonsContainer.appendChild(performanceBtn);
        
        // 添加事件监听器
        saveBtn.addEventListener('click', () => {
            if (window.dataManager && window.dataManager.saveGraphDataInBatches) {
                window.dataManager.saveGraphDataInBatches();
            }
        });
        
        loadBtn.addEventListener('click', () => {
            if (window.dataManager && window.dataManager.loadGraphDataFromStorage) {
                window.dataManager.loadGraphDataFromStorage();
            }
        });
        
        exportBtn.addEventListener('click', () => {
            if (window.dataManager && window.dataManager.exportToCSV) {
                window.dataManager.exportToCSV();
            }
        });
        
        importBtn.addEventListener('click', () => {
            // 创建隐藏的文件输入元素
            let fileInput = document.getElementById('csv-import-input');
            if (!fileInput) {
                fileInput = document.createElement('input');
                fileInput.type = 'file';
                fileInput.id = 'csv-import-input';
                fileInput.accept = '.csv';
                fileInput.style.display = 'none';
                document.body.appendChild(fileInput);
                
                // 添加文件选择事件
                fileInput.addEventListener('change', (event) => {
                    if (window.dataManager && window.dataManager.readImportFile && event.target.files[0]) {
                        window.dataManager.readImportFile(event.target.files[0]);
                    }
                    // 重置文件输入，允许重复选择同一个文件
                    event.target.value = '';
                });
            }
            
            // 触发文件选择
            fileInput.click();
        });
        
        clearBtn.addEventListener('click', () => {
            const confirmClear = confirm('Are you sure you want to clear all data? This action cannot be undone!');
            if (confirmClear) {
                if (window.dataManager && window.dataManager.clearAllGraphData) {
                    window.dataManager.clearAllGraphData();
                }
            }
        });
        
        performanceBtn.addEventListener('click', () => {
            if (window.performanceMonitor && window.performanceMonitor.getReport) {
                const report = window.performanceMonitor.getReport();
                if (window.performanceReportUtils && window.performanceReportUtils.formatPerformanceReport && 
                    window.performanceReportUtils.createPerformanceReportModal) {
                    const formattedReport = window.performanceReportUtils.formatPerformanceReport(report);
                    window.performanceReportUtils.createPerformanceReportModal(formattedReport);
                }
            }
        });
        
        console.log('Neo4j Editor: Save buttons set up successfully');
    } catch (error) {
        console.error('Neo4j Editor: Error setting up save buttons:', error);
    }
};

/**
 * 初始化视图管理器（兼容旧代码）
 */
function initializeViewManager() {
    window.viewManager.init();
}

/**
 * 窗口加载完成后初始化
 */
window.addEventListener('load', function() {
    try {
        // 检查是否已初始化
        if (!window.viewManagerInitialized) {
            window.viewManagerInitialized = true;
            initializeViewManager();
        }
    } catch (error) {
        console.error('Neo4j Editor: Error during initialization:', error);
    }
});

/**
 * 确保全局视图管理器对象存在
 */
if (typeof window.viewManager === 'undefined') {
    window.viewManager = {};
}

// 浏览器环境中不需要模块导出