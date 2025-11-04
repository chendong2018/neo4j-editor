/**
 * Cytoscape图形视图管理模块
 * 负责处理Tree和Network两个视图的初始化和数据同步
 */

// 导入依赖
const utils = require('../utils/utils');
const contextMenuManager = require('../ui/contextMenuManager');

const cytoscapeModule = {
    // 视图实例
    cyTree: null,
    cyNetwork: null,
    
    // 共享数据存储
    sharedGraphData: {
        nodes: [],
        edges: []
    },
    
    /**
     * 获取基础样式
     * @returns {Array} Cytoscape样式数组
     */
    getBasicStyles: function() {
        return [
            // 节点样式
            {
                selector: 'node',
                style: {
                    'background-color': '#6b5b95',
                    'label': 'data(label)',
                    'color': 'white',
                    'text-outline-width': 2,
                    'text-outline-color': '#6b5b95',
                    'height': 40,
                    'width': 40
                }
            },
            // 边样式
            {
                selector: 'edge',
                style: {
                    'width': 3,
                    'line-color': '#ccc',
                    'target-arrow-color': '#ccc',
                    'target-arrow-shape': 'triangle',
                    'curve-style': 'bezier'
                }
            },
            // 选中状态样式
            {
                selector: ':selected',
                style: {
                    'background-color': '#8884d8',
                    'line-color': '#8884d8',
                    'target-arrow-color': '#8884d8',
                    'source-arrow-color': '#8884d8'
                }
            }
        ];
    },
    
    /**
     * 初始化双视图（Tree和Network）
     */
    initializeDualViews: function() {
        try {
            // 检查是否已初始化
            if (this.cyTree && this.cyNetwork) {
                utils.debugLog('双视图已初始化，跳过重复初始化');
                return;
            }
            
            // 确保共享数据存储已初始化
            this.ensureSharedGraphData();
            
            // 获取容器元素
            const treeContainer = document.getElementById('tree-container');
            const networkContainer = document.getElementById('network-container');
            
            if (!treeContainer || !networkContainer) {
                utils.handleError(new Error('未找到视图容器元素'), '初始化视图失败');
                this.createFallbackCytoscapeInstances();
                return;
            }
            
            // 创建Tree视图
            this.cyTree = window.cytoscape({
                container: treeContainer,
                elements: {
                    nodes: this.sharedGraphData.nodes,
                    edges: this.sharedGraphData.edges
                },
                style: this.getBasicStyles(),
                layout: {
                    name: 'breadthfirst',
                    directed: true,
                    roots: '[root]',
                    padding: 10
                },
                minZoom: 0.1,
                maxZoom: 10,
                wheelSensitivity: 0.1
            });
            
            // 创建Network视图
            this.cyNetwork = window.cytoscape({
                container: networkContainer,
                elements: {
                    nodes: this.sharedGraphData.nodes,
                    edges: this.sharedGraphData.edges
                },
                style: this.getBasicStyles(),
                layout: {
                    name: 'cose',
                    padding: 10,
                    randomize: true
                },
                minZoom: 0.1,
                maxZoom: 10,
                wheelSensitivity: 0.1
            });
            
            // 更新全局引用
            window.cyTree = this.cyTree;
            window.cyNetwork = this.cyNetwork;
            
            // 设置右键菜单
            this.setupContextMenus();
            
            // 设置键盘事件
            this.setupKeyboardEvents();
            
            // 设置元素事件监听
            this.initializeEventListeners();
            
            // 更新元素计数
            this.updateElementCounts();
            
            utils.debugLog('双视图初始化成功');
        } catch (error) {
            utils.handleError(error, '初始化双视图失败');
            this.createFallbackCytoscapeInstances();
        }
    },
    
    /**
     * 创建备用的Cytoscape实例
     */
    createFallbackCytoscapeInstances: function() {
        try {
            const fallbackContainer = document.createElement('div');
            fallbackContainer.id = 'cytoscape-container';
            fallbackContainer.style.width = '100%';
            fallbackContainer.style.height = '600px';
            
            // 查找一个合适的容器位置
            const mainContainer = document.body || document.documentElement;
            mainContainer.appendChild(fallbackContainer);
            
            // 创建单一的备用实例
            this.cyFallback = window.cytoscape({
                container: fallbackContainer,
                elements: {
                    nodes: this.sharedGraphData.nodes,
                    edges: this.sharedGraphData.edges
                },
                style: this.getBasicStyles(),
                layout: {
                    name: 'cose'
                }
            });
            
            window.cyFallback = this.cyFallback;
            utils.debugLog('备用视图初始化成功');
        } catch (error) {
            utils.handleError(error, '初始化备用视图失败');
        }
    },
    
    /**
     * 设置右键菜单
     */
    setupContextMenus: function() {
        contextMenuManager.setupForAllInstances();
    },
    
    /**
     * 设置键盘事件
     */
    setupKeyboardEvents: function() {
        // 监听Delete键和Backspace键删除选中元素
        document.addEventListener('keydown', (event) => {
            if (event.key === 'Delete' || event.key === 'Backspace') {
                this._handleDeleteKeyPress();
            }
        });
    },
    
    /**
     * 初始化事件监听器
     */
    initializeEventListeners: function() {
        // 为Tree视图设置选中事件
        if (this.cyTree) {
            this.cyTree.on('select', 'node', (evt) => {
                const node = evt.target;
                this.synchronizeSelection(node.id());
            });
            
            this.cyTree.on('unselect', 'node', (evt) => {
                this._handleNodeUnselect(evt.target.id());
            });
            
            this.cyTree.on('select', 'edge', (evt) => {
                const edge = evt.target;
                this.synchronizeSelection(edge.id());
            });
        }
        
        // 为Network视图设置选中事件
        if (this.cyNetwork) {
            this.cyNetwork.on('select', 'node', (evt) => {
                const node = evt.target;
                this.synchronizeSelection(node.id());
            });
            
            this.cyNetwork.on('unselect', 'node', (evt) => {
                this._handleNodeUnselect(evt.target.id());
            });
            
            this.cyNetwork.on('select', 'edge', (evt) => {
                const edge = evt.target;
                this.synchronizeSelection(edge.id());
            });
        }
        
        // 为Edge设置unselect事件
        const instances = [this.cyTree, this.cyNetwork, this.cyFallback];
        instances.forEach(instance => {
            if (instance) {
                instance.on('unselect', 'edge', (evt) => {
                    const edgeId = evt.target.id();
                    // 同步取消选中
                    instances.forEach(otherInstance => {
                        if (otherInstance && otherInstance !== instance) {
                            const edge = otherInstance.getElementById(edgeId);
                            if (edge && edge.length > 0) {
                                edge.unselect();
                            }
                        }
                    });
                });
            }
        });
    },
    
    /**
     * 同步视图数据
     */
    syncViews: function() {
        // 从共享数据更新两个视图
        const views = [this.cyTree, this.cyNetwork, this.cyFallback];
        
        views.forEach(view => {
            if (view) {
                view.json({
                    nodes: this.sharedGraphData.nodes,
                    edges: this.sharedGraphData.edges
                });
            }
        });
        
        // 更新计数
        this.updateElementCounts();
    },
    
    /**
     * 更新元素计数
     */
    updateElementCounts: function() {
        const nodeCount = this.sharedGraphData.nodes.length;
        const edgeCount = this.sharedGraphData.edges.length;
        
        const nodeCountElem = document.getElementById('node-count');
        const edgeCountElem = document.getElementById('edge-count');
        
        if (nodeCountElem) nodeCountElem.textContent = nodeCount;
        if (edgeCountElem) edgeCountElem.textContent = edgeCount;
    },
    
    /**
     * 向视图添加节点
     * @param {Object} nodeData - 节点数据
     */
    addNodeToViews: function(nodeData) {
        // 检查节点是否已存在
        const existingNode = this.sharedGraphData.nodes.find(n => n.data.id === nodeData.data.id);
        if (existingNode) {
            utils.debugLog(`节点 ${nodeData.data.id} 已存在，跳过添加`);
            return;
        }
        
        // 添加到共享数据
        this.sharedGraphData.nodes.push(nodeData);
        
        // 添加到所有视图
        const views = [this.cyTree, this.cyNetwork, this.cyFallback];
        views.forEach(view => {
            if (view) {
                view.add(nodeData);
            }
        });
        
        // 更新计数
        this.updateElementCounts();
    },
    
    /**
     * 向视图添加边
     * @param {Object} edgeData - 边数据
     */
    addEdgeToViews: function(edgeData) {
        // 检查边是否已存在
        const existingEdge = this.sharedGraphData.edges.find(e => e.data.id === edgeData.data.id);
        if (existingEdge) {
            utils.debugLog(`边 ${edgeData.data.id} 已存在，跳过添加`);
            return;
        }
        
        // 添加到共享数据
        this.sharedGraphData.edges.push(edgeData);
        
        // 添加到所有视图
        const views = [this.cyTree, this.cyNetwork, this.cyFallback];
        views.forEach(view => {
            if (view) {
                view.add(edgeData);
            }
        });
        
        // 更新计数
        this.updateElementCounts();
    },
    
    /**
     * 从视图移除元素
     * @param {string} elementId - 元素ID
     */
    removeElementFromViews: function(elementId) {
        // 从共享数据中移除
        this.sharedGraphData.nodes = this.sharedGraphData.nodes.filter(n => n.data.id !== elementId);
        this.sharedGraphData.edges = this.sharedGraphData.edges.filter(e => e.data.id !== elementId);
        
        // 从所有视图中移除
        const views = [this.cyTree, this.cyNetwork, this.cyFallback];
        views.forEach(view => {
            if (view) {
                const element = view.getElementById(elementId);
                if (element && element.length > 0) {
                    element.remove();
                }
            }
        });
        
        // 更新计数
        this.updateElementCounts();
        
        utils.showToast(`元素 ${elementId} 已删除`);
    },
    
    /**
     * 清空所有视图
     */
    clearAllViews: function() {
        // 清空共享数据
        this.sharedGraphData.nodes = [];
        this.sharedGraphData.edges = [];
        
        // 清空所有视图
        const views = [this.cyTree, this.cyNetwork, this.cyFallback];
        views.forEach(view => {
            if (view) {
                view.elements().remove();
            }
        });
        
        // 更新计数
        this.updateElementCounts();
        
        utils.showToast('所有元素已清空');
    },
    
    /**
     * 同步选中状态
     * @param {string} elementId - 元素ID
     */
    synchronizeSelection: function(elementId) {
        const views = [this.cyTree, this.cyNetwork, this.cyFallback];
        
        views.forEach(view => {
            if (view) {
                // 先取消所有选中
                view.elements().unselect();
                
                // 选中指定元素
                const element = view.getElementById(elementId);
                if (element && element.length > 0) {
                    element.select();
                }
            }
        });
    },
    
    /**
     * 确保共享数据存储已初始化
     */
    ensureSharedGraphData: function() {
        if (!this.sharedGraphData) {
            this.sharedGraphData = {
                nodes: [],
                edges: []
            };
        }
    },
    
    /**
     * 获取图数据
     * @returns {Object} 图数据对象
     */
    getGraphData: function() {
        return {
            nodes: [...this.sharedGraphData.nodes],
            edges: [...this.sharedGraphData.edges]
        };
    },
    
    /**
     * 处理删除键按下
     * @private
     */
    _handleDeleteKeyPress: function() {
        const views = [this.cyTree, this.cyNetwork, this.cyFallback];
        
        // 找出所有选中的元素
        let selectedElements = [];
        views.forEach(view => {
            if (view) {
                const selected = view.selected();
                if (selected && selected.length > 0) {
                    selected.forEach(el => {
                        selectedElements.push(el.id());
                    });
                }
            }
        });
        
        // 去重并删除
        const uniqueElements = [...new Set(selectedElements)];
        uniqueElements.forEach(elementId => {
            this.removeElementFromViews(elementId);
        });
    },
    
    /**
     * 处理节点取消选中
     * @private
     * @param {string} nodeId - 节点ID
     */
    _handleNodeUnselect: function(nodeId) {
        const views = [this.cyTree, this.cyNetwork, this.cyFallback];
        
        // 检查其他视图中是否还有选中状态
        let isStillSelected = false;
        views.forEach(view => {
            if (view) {
                const node = view.getElementById(nodeId);
                if (node && node.length > 0 && node.selected()) {
                    isStillSelected = true;
                }
            }
        });
        
        // 如果其他视图都没有选中，则同步取消选中
        if (!isStillSelected) {
            views.forEach(view => {
                if (view) {
                    const node = view.getElementById(nodeId);
                    if (node && node.length > 0) {
                        node.unselect();
                    }
                }
            });
        }
    }
};

// 为了向后兼容，暴露关键功能到window对象
window.initializeDualViews = window.initializeDualViews || function() {
    cytoscapeModule.initializeDualViews();
};

window.syncViews = window.syncViews || function() {
    cytoscapeModule.syncViews();
};

window.addNodeToViews = window.addNodeToViews || function(nodeData) {
    cytoscapeModule.addNodeToViews(nodeData);
};

window.addEdgeToViews = window.addEdgeToViews || function(edgeData) {
    cytoscapeModule.addEdgeToViews(edgeData);
};

window.removeElementFromViews = window.removeElementFromViews || function(elementId) {
    cytoscapeModule.removeElementFromViews(elementId);
};

window.clearAllViews = window.clearAllViews || function() {
    cytoscapeModule.clearAllViews();
};

// 暴露模块
exports.cytoscapeModule = cytoscapeModule;
exports.initializeDualViews = cytoscapeModule.initializeDualViews;
exports.syncViews = cytoscapeModule.syncViews;
exports.addNodeToViews = cytoscapeModule.addNodeToViews;
exports.addEdgeToViews = cytoscapeModule.addEdgeToViews;
exports.removeElementFromViews = cytoscapeModule.removeElementFromViews;
exports.clearAllViews = cytoscapeModule.clearAllViews;
