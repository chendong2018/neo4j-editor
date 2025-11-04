/**
 * Neo4j Editor - 图可视化渲染模块
 * 负责管理Cytoscape实例和图形渲染功能
 */
(function(neo4jEditor) {
    'use strict';

    // 确保命名空间存在
    if (typeof neo4jEditor === 'undefined') {
        window.neo4jEditor = {};
    }

    // 初始化状态
    let initialized = false;
    
    // Cytoscape实例引用
    let cyInstances = {
        tree: null,     // 树视图实例
        network: null   // 网络图视图实例
    };
    
    // 容器元素引用
    let containers = {
        tree: null,     // 树视图容器
        network: null   // 网络图容器
    };
    
    // 布局配置
    let layoutConfigs = {
        tree: {
            name: 'breadthfirst',
            fit: true,
            directed: true,
            padding: 30,
            spacingFactor: 1.2,
            nodeDimensionsIncludeLabels: true,
            roots: '',
            animate: false,
            animationDuration: 500,
            stop: null,
            ready: null,
            animateFilter: null,
            animationEasing: 'ease-out',
            boundingBox: undefined,
            avoidOverlap: true
        },
        network: {
            name: 'cose',
            animate: true,
            animationDuration: 800,
            animationEasing: 'ease-out',
            randomize: true,
            fit: true,
            padding: 30,
            boundingBox: undefined,
            nodeDimensionsIncludeLabels: true,
            gravity: 0.2,
            springLength: 100,
            springStrength: 0.5,
            nodeRepulsion: 4000,
            edgeElasticity: 0.45,
            nestingFactor: 0.1,
            numIter: 1000,
            numInterpolationSteps: 30,
            tile: false,
            ungrabifyWhileSimulating: true,
            useBoundingBox: false,
            ready: null,
            stop: null
        }
    };
    
    // 样式表配置
    const defaultStyleSheet = [
        // 节点样式
        {
            selector: 'node',
            style: {
                'background-color': '#2196F3',
                'border-color': '#1976D2',
                'border-width': '1px',
                'width': '40px',
                'height': '40px',
                'shape': 'ellipse',
                'label': 'data(label)',
                'color': '#ffffff',
                'font-size': '14px',
                'font-family': 'Arial, sans-serif',
                'text-valign': 'center',
                'text-halign': 'center',
                'text-outline-width': '2px',
                'text-outline-color': 'rgba(0,0,0,0.1)'
            }
        },
        // 关系样式
        {
            selector: 'edge',
            style: {
                'line-color': '#ccc',
                'line-width': '2px',
                'line-style': 'solid',
                'target-arrow-color': '#ccc',
                'target-arrow-shape': 'triangle',
                'label': 'data(label)',
                'color': '#333333',
                'font-size': '12px',
                'font-family': 'Arial, sans-serif',
                'text-background-color': '#ffffff',
                'text-background-opacity': 0.9,
                'text-background-shape': 'rectangle',
                'text-background-padding': '3px'
            }
        },
        // 选中节点样式
        {
            selector: 'node:selected',
            style: {
                'background-color': '#FF9800',
                'border-color': '#F57C00',
                'border-width': '2px',
                'z-index': 1000
            }
        },
        // 选中关系样式
        {
            selector: 'edge:selected',
            style: {
                'line-color': '#FF9800',
                'line-width': '3px',
                'target-arrow-color': '#FF9800'
            }
        },
        // 悬停节点样式
        {
            selector: 'node:hover',
            style: {
                'border-width': '2px',
                'cursor': 'pointer'
            }
        },
        // 悬停关系样式
        {
            selector: 'edge:hover',
            style: {
                'line-width': '3px',
                'cursor': 'pointer'
            }
        },
        // 父节点样式（用于树视图）
        {
            selector: 'node.parent',
            style: {
                'shape': 'roundrectangle',
                'background-color': '#9C27B0',
                'border-color': '#7B1FA2'
            }
        },
        // 高亮节点样式
        {
            selector: '.highlight',
            style: {
                'background-color': '#4CAF50',
                'border-color': '#388E3C',
                'border-width': '2px'
            }
        },
        // 高亮关系样式
        {
            selector: '.highlight',
            style: {
                'line-color': '#4CAF50',
                'line-width': '3px',
                'target-arrow-color': '#4CAF50'
            }
        },
        // 不可选节点样式
        {
            selector: '.unselectable',
            style: {
                'events': 'no'
            }
        }
    ];

    /**
     * 初始化渲染模块
     * @param {Object} config - 配置对象
     * @returns {boolean} 初始化是否成功
     */
    function initialize(config = {}) {
        try {
            console.log('Graph Renderer Module: Initializing...');
            
            // 合并配置
            const mergedConfig = { ...config };
            
            // 初始化容器引用
            if (mergedConfig.containerIds) {
                containers.tree = document.getElementById(mergedConfig.containerIds.tree);
                containers.network = document.getElementById(mergedConfig.containerIds.network);
            }
            
            // 如果未指定容器，使用默认ID
            if (!containers.tree) {
                containers.tree = document.getElementById('neo4j-tree-view');
            }
            if (!containers.network) {
                containers.network = document.getElementById('neo4j-network-view');
            }
            
            // 验证容器存在性
            if (!containers.tree && !containers.network) {
                console.error('Graph Renderer Module: No valid containers found');
                return false;
            }
            
            // 初始化共享图数据
            if (!neo4jEditor.sharedGraphData) {
                neo4jEditor.sharedGraphData = {
                    nodes: [],
                    edges: []
                };
            }
            
            // 初始化实例存储
            neo4jEditor.instances = neo4jEditor.instances || {};
            
            // 初始化Cytoscape实例
            initCytoscapeInstances();
            
            // 设置事件监听
            setupEventListeners();
            
            // 标记为已初始化
            initialized = true;
            
            console.log('Graph Renderer Module: Initialized successfully');
            
            // 触发初始化完成事件
            if (neo4jEditor.eventManager && typeof neo4jEditor.eventManager.trigger === 'function') {
                neo4jEditor.eventManager.trigger('graphRenderer:initialized', {
                    instances: cyInstances,
                    containers: containers
                });
            }
            
            return true;
        } catch (error) {
            console.error('Graph Renderer Module: Initialization error:', error);
            return false;
        }
    }

    /**
     * 初始化Cytoscape实例
     */
    function initCytoscapeInstances() {
        try {
            // 初始化树视图实例
            if (containers.tree) {
                cyInstances.tree = createCytoscapeInstance(containers.tree, 'tree');
                neo4jEditor.instances.tree = cyInstances.tree;
            }
            
            // 初始化网络图视图实例
            if (containers.network) {
                cyInstances.network = createCytoscapeInstance(containers.network, 'network');
                neo4jEditor.instances.network = cyInstances.network;
            }
        } catch (error) {
            console.error('Error initializing Cytoscape instances:', error);
        }
    }

    /**
     * 创建Cytoscape实例
     * @param {HTMLElement} container - 容器元素
     * @param {string} viewType - 视图类型 ('tree' 或 'network')
     * @returns {Object} Cytoscape实例
     */
    function createCytoscapeInstance(container, viewType) {
        try {
            // 确保Cytoscape可用
            if (typeof cytoscape !== 'function') {
                throw new Error('Cytoscape library not loaded');
            }
            
            // 基础配置
            const baseConfig = {
                container: container,
                style: defaultStyleSheet,
                layout: layoutConfigs[viewType],
                minZoom: 0.1,
                maxZoom: 4,
                wheelSensitivity: 0.2,
                autounselectify: false,
                boxSelectionEnabled: true,
                selectionType: 'single',
                hideEdgesOnViewport: false,
                hideLabelsOnViewport: false,
                textureOnViewport: true,
                motionBlur: false,
                motionBlurOpacity: 0.2,
                pixelRatio: 'auto',
                elements: {
                    nodes: [],
                    edges: []
                }
            };
            
            // 创建实例
            const cy = cytoscape(baseConfig);
            
            // 自定义事件处理
            setupInstanceEventHandlers(cy, viewType);
            
            return cy;
        } catch (error) {
            console.error(`Error creating ${viewType} Cytoscape instance:`, error);
            throw error;
        }
    }

    /**
     * 设置实例事件处理器
     * @param {Object} cy - Cytoscape实例
     * @param {string} viewType - 视图类型
     */
    function setupInstanceEventHandlers(cy, viewType) {
        try {
            // 节点点击事件
            cy.on('tap', 'node', function(event) {
                const target = event.target;
                const nodeData = target.data();
                
                // 阻止冒泡
                event.stopPropagation();
                
                // 触发节点选择事件
                if (neo4jEditor.eventManager && typeof neo4jEditor.eventManager.trigger === 'function') {
                    neo4jEditor.eventManager.trigger('element:selected', {
                        element: { data: nodeData },
                        type: 'node',
                        instance: viewType
                    });
                }
                
                // 同步到其他视图
                syncSelectionToOtherView(nodeData.id, 'node', viewType);
            });
            
            // 关系点击事件
            cy.on('tap', 'edge', function(event) {
                const target = event.target;
                const edgeData = target.data();
                
                // 阻止冒泡
                event.stopPropagation();
                
                // 触发关系选择事件
                if (neo4jEditor.eventManager && typeof neo4jEditor.eventManager.trigger === 'function') {
                    neo4jEditor.eventManager.trigger('element:selected', {
                        element: { data: edgeData },
                        type: 'edge',
                        instance: viewType
                    });
                }
                
                // 同步到其他视图
                syncSelectionToOtherView(edgeData.id, 'edge', viewType);
            });
            
            // 背景点击事件
            cy.on('tap', function(event) {
                // 仅当点击背景时触发
                if (event.target === cy) {
                    // 清除选择
                    cy.elements('node, edge').unselect();
                    
                    // 触发背景点击事件
                    if (neo4jEditor.eventManager && typeof neo4jEditor.eventManager.trigger === 'function') {
                        neo4jEditor.eventManager.trigger('canvas:clicked', {
                            position: event.position,
                            instance: viewType
                        });
                    }
                    
                    // 清除其他视图的选择
                    clearOtherViewSelection(viewType);
                }
            });
            
            // 鼠标悬停事件 - 节点
            cy.on('mouseover', 'node', function(event) {
                const node = event.target;
                
                // 触发悬停事件
                if (neo4jEditor.eventManager && typeof neo4jEditor.eventManager.trigger === 'function') {
                    neo4jEditor.eventManager.trigger('element:hovered', {
                        element: { data: node.data() },
                        type: 'node',
                        instance: viewType,
                        state: 'enter'
                    });
                }
            });
            
            cy.on('mouseout', 'node', function(event) {
                const node = event.target;
                
                // 触发离开悬停事件
                if (neo4jEditor.eventManager && typeof neo4jEditor.eventManager.trigger === 'function') {
                    neo4jEditor.eventManager.trigger('element:hovered', {
                        element: { data: node.data() },
                        type: 'node',
                        instance: viewType,
                        state: 'leave'
                    });
                }
            });
            
            // 拖拽事件
            cy.on('dragstart', 'node', function(event) {
                const node = event.target;
                
                // 触发拖拽开始事件
                if (neo4jEditor.eventManager && typeof neo4jEditor.eventManager.trigger === 'function') {
                    neo4jEditor.eventManager.trigger('element:dragstart', {
                        element: { data: node.data() },
                        type: 'node',
                        instance: viewType,
                        position: node.position()
                    });
                }
            });
            
            cy.on('dragend', 'node', function(event) {
                const node = event.target;
                
                // 触发拖拽结束事件
                if (neo4jEditor.eventManager && typeof neo4jEditor.eventManager.trigger === 'function') {
                    neo4jEditor.eventManager.trigger('element:dragend', {
                        element: { data: node.data() },
                        type: 'node',
                        instance: viewType,
                        position: node.position()
                    });
                }
                
                // 同步位置到其他视图
                syncNodePositionToOtherView(node.data().id, node.position(), viewType);
            });
            
            // 缩放事件
            cy.on('zoom', function(event) {
                // 触发缩放事件
                if (neo4jEditor.eventManager && typeof neo4jEditor.eventManager.trigger === 'function') {
                    neo4jEditor.eventManager.trigger('viewport:zoomed', {
                        zoom: cy.zoom(),
                        instance: viewType
                    });
                }
            });
            
            // 平移事件
            cy.on('pan', function(event) {
                // 触发平移事件
                if (neo4jEditor.eventManager && typeof neo4jEditor.eventManager.trigger === 'function') {
                    neo4jEditor.eventManager.trigger('viewport:panned', {
                        pan: cy.pan(),
                        instance: viewType
                    });
                }
            });
        } catch (error) {
            console.error(`Error setting up event handlers for ${viewType} view:`, error);
        }
    }

    /**
     * 设置模块级事件监听
     */
    function setupEventListeners() {
        try {
            if (!neo4jEditor.eventManager || typeof neo4jEditor.eventManager.on !== 'function') {
                console.warn('Graph Renderer: Event manager not available for global event listeners');
                return;
            }
            
            // 监听数据更新事件
            neo4jEditor.eventManager.on('data:updated', function(eventData) {
                if (eventData && eventData.nodes && eventData.edges) {
                    updateGraph(eventData.nodes, eventData.edges);
                }
            });
            
            // 监听添加节点事件
            neo4jEditor.eventManager.on('node:added', function(eventData) {
                if (eventData && eventData.node) {
                    addNode(eventData.node);
                }
            });
            
            // 监听更新节点事件
            neo4jEditor.eventManager.on('node:updated', function(eventData) {
                if (eventData && eventData.node) {
                    updateNode(eventData.node);
                }
            });
            
            // 监听删除节点事件
            neo4jEditor.eventManager.on('node:deleted', function(eventData) {
                if (eventData && eventData.nodeId) {
                    removeNode(eventData.nodeId);
                }
            });
            
            // 监听添加关系事件
            neo4jEditor.eventManager.on('edge:added', function(eventData) {
                if (eventData && eventData.edge) {
                    addEdge(eventData.edge);
                }
            });
            
            // 监听更新关系事件
            neo4jEditor.eventManager.on('edge:updated', function(eventData) {
                if (eventData && eventData.edge) {
                    updateEdge(eventData.edge);
                }
            });
            
            // 监听删除关系事件
            neo4jEditor.eventManager.on('edge:deleted', function(eventData) {
                if (eventData && eventData.edgeId) {
                    removeEdge(eventData.edgeId);
                }
            });
            
            // 监听视图切换事件
            neo4jEditor.eventManager.on('view:switched', function(eventData) {
                if (eventData && eventData.viewType) {
                    // 适应视图到内容
                    fitToContent(eventData.viewType);
                }
            });
            
            // 监听执行布局事件
            neo4jEditor.eventManager.on('layout:execute', function(eventData) {
                if (eventData) {
                    const { viewType = null, layout = null } = eventData;
                    executeLayout(viewType, layout);
                }
            });
        } catch (error) {
            console.error('Error setting up module event listeners:', error);
        }
    }

    /**
     * 更新整个图
     * @param {Array} nodes - 节点数组
     * @param {Array} edges - 关系数组
     * @param {string|null} viewType - 特定视图类型，null表示所有视图
     */
    function updateGraph(nodes, edges, viewType = null) {
        try {
            // 确保数据有效
            if (!Array.isArray(nodes)) {
                nodes = [];
            }
            if (!Array.isArray(edges)) {
                edges = [];
            }
            
            // 更新共享数据
            if (neo4jEditor.sharedGraphData) {
                neo4jEditor.sharedGraphData.nodes = [...nodes];
                neo4jEditor.sharedGraphData.edges = [...edges];
            }
            
            // 准备要更新的实例列表
            const instancesToUpdate = [];
            if (viewType && cyInstances[viewType]) {
                instancesToUpdate.push(cyInstances[viewType]);
            } else {
                if (cyInstances.tree) instancesToUpdate.push(cyInstances.tree);
                if (cyInstances.network) instancesToUpdate.push(cyInstances.network);
            }
            
            // 更新每个实例
            instancesToUpdate.forEach(cy => {
                // 清除现有元素
                cy.elements().remove();
                
                // 添加新元素
                const elements = [];
                
                // 添加节点
                nodes.forEach(node => {
                    // 创建节点对象，确保包含样式
                    const nodeElement = {
                        data: { ...node.data },
                        position: node.position || { x: 0, y: 0 }
                    };
                    
                    // 应用自定义样式
                    if (node.data.style) {
                        Object.entries(node.data.style).forEach(([key, value]) => {
                            // 转换样式键格式
                            const styleKey = key.replace(/([A-Z])/g, '-$1').toLowerCase();
                            nodeElement.style = nodeElement.style || {};
                            nodeElement.style[styleKey] = value;
                        });
                    }
                    
                    elements.push(nodeElement);
                });
                
                // 添加关系
                edges.forEach(edge => {
                    // 创建关系对象，确保包含样式
                    const edgeElement = {
                        data: { ...edge.data }
                    };
                    
                    // 应用自定义样式
                    if (edge.data.style) {
                        Object.entries(edge.data.style).forEach(([key, value]) => {
                            // 转换样式键格式
                            const styleKey = key.replace(/([A-Z])/g, '-$1').toLowerCase();
                            edgeElement.style = edgeElement.style || {};
                            edgeElement.style[styleKey] = value;
                        });
                    }
                    
                    elements.push(edgeElement);
                });
                
                // 添加到Cytoscape
                cy.add(elements);
                
                // 执行布局
                cy.layout(layoutConfigs[cy === cyInstances.tree ? 'tree' : 'network']).run();
            });
            
            // 触发图更新完成事件
            if (neo4jEditor.eventManager && typeof neo4jEditor.eventManager.trigger === 'function') {
                neo4jEditor.eventManager.trigger('graph:updated', {
                    nodes: nodes,
                    edges: edges,
                    viewType: viewType
                });
            }
        } catch (error) {
            console.error('Error updating graph:', error);
        }
    }

    /**
     * 添加节点
     * @param {Object} node - 节点对象
     */
    function addNode(node) {
        try {
            if (!node || !node.data || !node.data.id) {
                console.error('Invalid node data');
                return;
            }
            
            // 更新共享数据
            if (neo4jEditor.sharedGraphData) {
                // 检查节点是否已存在
                const existingNodeIndex = neo4jEditor.sharedGraphData.nodes.findIndex(
                    n => n.data.id === node.data.id
                );
                
                if (existingNodeIndex === -1) {
                    neo4jEditor.sharedGraphData.nodes.push(node);
                }
            }
            
            // 创建节点元素
            const nodeElement = {
                data: { ...node.data },
                position: node.position || { x: 0, y: 0 }
            };
            
            // 应用自定义样式
            if (node.data.style) {
                Object.entries(node.data.style).forEach(([key, value]) => {
                    const styleKey = key.replace(/([A-Z])/g, '-$1').toLowerCase();
                    nodeElement.style = nodeElement.style || {};
                    nodeElement.style[styleKey] = value;
                });
            }
            
            // 添加到所有实例
            if (cyInstances.tree) {
                cyInstances.tree.add(nodeElement);
            }
            
            if (cyInstances.network) {
                cyInstances.network.add(nodeElement);
            }
            
            // 触发节点添加完成事件
            if (neo4jEditor.eventManager && typeof neo4jEditor.eventManager.trigger === 'function') {
                neo4jEditor.eventManager.trigger('node:addedToGraph', {
                    node: node
                });
            }
        } catch (error) {
            console.error('Error adding node:', error);
        }
    }

    /**
     * 更新节点
     * @param {Object} node - 节点对象
     */
    function updateNode(node) {
        try {
            if (!node || !node.data || !node.data.id) {
                console.error('Invalid node data');
                return;
            }
            
            const nodeId = node.data.id;
            
            // 更新共享数据
            if (neo4jEditor.sharedGraphData) {
                const existingNodeIndex = neo4jEditor.sharedGraphData.nodes.findIndex(
                    n => n.data.id === nodeId
                );
                
                if (existingNodeIndex !== -1) {
                    neo4jEditor.sharedGraphData.nodes[existingNodeIndex] = node;
                }
            }
            
            // 更新所有实例中的节点
            const instances = [cyInstances.tree, cyInstances.network].filter(Boolean);
            
            instances.forEach(cy => {
                const cyNode = cy.getElementById(nodeId);
                if (cyNode) {
                    // 更新数据
                    cyNode.data(node.data);
                    
                    // 更新样式
                    if (node.data.style) {
                        Object.entries(node.data.style).forEach(([key, value]) => {
                            const styleKey = key.replace(/([A-Z])/g, '-$1').toLowerCase();
                            cyNode.style(styleKey, value);
                        });
                    }
                    
                    // 更新位置
                    if (node.position) {
                        cyNode.position(node.position);
                    }
                }
            });
            
            // 触发节点更新完成事件
            if (neo4jEditor.eventManager && typeof neo4jEditor.eventManager.trigger === 'function') {
                neo4jEditor.eventManager.trigger('node:updatedInGraph', {
                    node: node
                });
            }
        } catch (error) {
            console.error('Error updating node:', error);
        }
    }

    /**
     * 删除节点
     * @param {string} nodeId - 节点ID
     */
    function removeNode(nodeId) {
        try {
            if (!nodeId) {
                console.error('Invalid node ID');
                return;
            }
            
            // 从共享数据中删除
            if (neo4jEditor.sharedGraphData) {
                neo4jEditor.sharedGraphData.nodes = neo4jEditor.sharedGraphData.nodes.filter(
                    node => node.data.id !== nodeId
                );
                
                // 同时删除相关关系
                neo4jEditor.sharedGraphData.edges = neo4jEditor.sharedGraphData.edges.filter(
                    edge => edge.data.source !== nodeId && edge.data.target !== nodeId
                );
            }
            
            // 从所有实例中删除节点及相关关系
            const instances = [cyInstances.tree, cyInstances.network].filter(Boolean);
            
            instances.forEach(cy => {
                // 获取节点
                const node = cy.getElementById(nodeId);
                if (node) {
                    // 获取相关关系
                    const connectedEdges = node.connectedEdges();
                    
                    // 删除关系和节点
                    connectedEdges.remove();
                    node.remove();
                }
            });
            
            // 触发节点删除完成事件
            if (neo4jEditor.eventManager && typeof neo4jEditor.eventManager.trigger === 'function') {
                neo4jEditor.eventManager.trigger('node:deletedFromGraph', {
                    nodeId: nodeId
                });
            }
        } catch (error) {
            console.error('Error removing node:', error);
        }
    }

    /**
     * 添加关系
     * @param {Object} edge - 关系对象
     */
    function addEdge(edge) {
        try {
            if (!edge || !edge.data || !edge.data.id || !edge.data.source || !edge.data.target) {
                console.error('Invalid edge data');
                return;
            }
            
            const edgeId = edge.data.id;
            
            // 更新共享数据
            if (neo4jEditor.sharedGraphData) {
                // 检查关系是否已存在
                const existingEdgeIndex = neo4jEditor.sharedGraphData.edges.findIndex(
                    e => e.data.id === edgeId
                );
                
                if (existingEdgeIndex === -1) {
                    neo4jEditor.sharedGraphData.edges.push(edge);
                }
            }
            
            // 创建关系元素
            const edgeElement = {
                data: { ...edge.data }
            };
            
            // 应用自定义样式
            if (edge.data.style) {
                Object.entries(edge.data.style).forEach(([key, value]) => {
                    const styleKey = key.replace(/([A-Z])/g, '-$1').toLowerCase();
                    edgeElement.style = edgeElement.style || {};
                    edgeElement.style[styleKey] = value;
                });
            }
            
            // 添加到所有实例
            const instances = [cyInstances.tree, cyInstances.network].filter(Boolean);
            
            instances.forEach(cy => {
                // 检查源节点和目标节点是否存在
                const sourceNode = cy.getElementById(edge.data.source);
                const targetNode = cy.getElementById(edge.data.target);
                
                if (sourceNode && targetNode) {
                    cy.add(edgeElement);
                }
            });
            
            // 触发关系添加完成事件
            if (neo4jEditor.eventManager && typeof neo4jEditor.eventManager.trigger === 'function') {
                neo4jEditor.eventManager.trigger('edge:addedToGraph', {
                    edge: edge
                });
            }
        } catch (error) {
            console.error('Error adding edge:', error);
        }
    }

    /**
     * 更新关系
     * @param {Object} edge - 关系对象
     */
    function updateEdge(edge) {
        try {
            if (!edge || !edge.data || !edge.data.id) {
                console.error('Invalid edge data');
                return;
            }
            
            const edgeId = edge.data.id;
            
            // 更新共享数据
            if (neo4jEditor.sharedGraphData) {
                const existingEdgeIndex = neo4jEditor.sharedGraphData.edges.findIndex(
                    e => e.data.id === edgeId
                );
                
                if (existingEdgeIndex !== -1) {
                    neo4jEditor.sharedGraphData.edges[existingEdgeIndex] = edge;
                }
            }
            
            // 更新所有实例中的关系
            const instances = [cyInstances.tree, cyInstances.network].filter(Boolean);
            
            instances.forEach(cy => {
                const cyEdge = cy.getElementById(edgeId);
                if (cyEdge) {
                    // 更新数据
                    cyEdge.data(edge.data);
                    
                    // 更新样式
                    if (edge.data.style) {
                        Object.entries(edge.data.style).forEach(([key, value]) => {
                            const styleKey = key.replace(/([A-Z])/g, '-$1').toLowerCase();
                            cyEdge.style(styleKey, value);
                        });
                    }
                }
            });
            
            // 触发关系更新完成事件
            if (neo4jEditor.eventManager && typeof neo4jEditor.eventManager.trigger === 'function') {
                neo4jEditor.eventManager.trigger('edge:updatedInGraph', {
                    edge: edge
                });
            }
        } catch (error) {
            console.error('Error updating edge:', error);
        }
    }

    /**
     * 删除关系
     * @param {string} edgeId - 关系ID
     */
    function removeEdge(edgeId) {
        try {
            if (!edgeId) {
                console.error('Invalid edge ID');
                return;
            }
            
            // 从共享数据中删除
            if (neo4jEditor.sharedGraphData) {
                neo4jEditor.sharedGraphData.edges = neo4jEditor.sharedGraphData.edges.filter(
                    edge => edge.data.id !== edgeId
                );
            }
            
            // 从所有实例中删除
            const instances = [cyInstances.tree, cyInstances.network].filter(Boolean);
            
            instances.forEach(cy => {
                const edge = cy.getElementById(edgeId);
                if (edge) {
                    edge.remove();
                }
            });
            
            // 触发关系删除完成事件
            if (neo4jEditor.eventManager && typeof neo4jEditor.eventManager.trigger === 'function') {
                neo4jEditor.eventManager.trigger('edge:deletedFromGraph', {
                    edgeId: edgeId
                });
            }
        } catch (error) {
            console.error('Error removing edge:', error);
        }
    }

    /**
     * 同步选择到其他视图
     * @param {string} elementId - 元素ID
     * @param {string} elementType - 元素类型 ('node' 或 'edge')
     * @param {string} sourceViewType - 源视图类型
     */
    function syncSelectionToOtherView(elementId, elementType, sourceViewType) {
        try {
            // 确定目标视图类型
            const targetViewType = sourceViewType === 'tree' ? 'network' : 'tree';
            const targetCy = cyInstances[targetViewType];
            
            if (!targetCy) {
                return;
            }
            
            // 清除现有选择
            targetCy.elements('node, edge').unselect();
            
            // 选择对应元素
            const targetElement = targetCy.getElementById(elementId);
            if (targetElement) {
                targetElement.select();
            }
        } catch (error) {
            console.error('Error syncing selection to other view:', error);
        }
    }

    /**
     * 清除其他视图的选择
     * @param {string} sourceViewType - 源视图类型
     */
    function clearOtherViewSelection(sourceViewType) {
        try {
            // 确定目标视图类型
            const targetViewType = sourceViewType === 'tree' ? 'network' : 'tree';
            const targetCy = cyInstances[targetViewType];
            
            if (!targetCy) {
                return;
            }
            
            // 清除选择
            targetCy.elements('node, edge').unselect();
        } catch (error) {
            console.error('Error clearing other view selection:', error);
        }
    }

    /**
     * 同步节点位置到其他视图
     * @param {string} nodeId - 节点ID
     * @param {Object} position - 位置对象 {x, y}
     * @param {string} sourceViewType - 源视图类型
     */
    function syncNodePositionToOtherView(nodeId, position, sourceViewType) {
        try {
            // 确定目标视图类型
            const targetViewType = sourceViewType === 'tree' ? 'network' : 'tree';
            const targetCy = cyInstances[targetViewType];
            
            if (!targetCy) {
                return;
            }
            
            // 更新目标视图中的节点位置
            const targetNode = targetCy.getElementById(nodeId);
            if (targetNode) {
                targetNode.position(position);
            }
        } catch (error) {
            console.error('Error syncing node position to other view:', error);
        }
    }

    /**
     * 适应内容到视图
     * @param {string|null} viewType - 视图类型，null表示所有视图
     */
    function fitToContent(viewType = null) {
        try {
            const instances = [];
            
            if (viewType && cyInstances[viewType]) {
                instances.push(cyInstances[viewType]);
            } else {
                if (cyInstances.tree) instances.push(cyInstances.tree);
                if (cyInstances.network) instances.push(cyInstances.network);
            }
            
            instances.forEach(cy => {
                cy.fit({
                    padding: 30,
                    animate: true,
                    duration: 500
                });
            });
        } catch (error) {
            console.error('Error fitting to content:', error);
        }
    }

    /**
     * 执行布局
     * @param {string|null} viewType - 视图类型，null表示所有视图
     * @param {Object|null} layout - 布局配置，null使用默认配置
     */
    function executeLayout(viewType = null, layout = null) {
        try {
            const instances = [];
            
            if (viewType && cyInstances[viewType]) {
                instances.push({ instance: cyInstances[viewType], type: viewType });
            } else {
                if (cyInstances.tree) instances.push({ instance: cyInstances.tree, type: 'tree' });
                if (cyInstances.network) instances.push({ instance: cyInstances.network, type: 'network' });
            }
            
            instances.forEach(({ instance, type }) => {
                // 使用提供的布局配置或默认配置
                const layoutConfig = layout || layoutConfigs[type];
                
                // 执行布局
                instance.layout(layoutConfig).run();
            });
        } catch (error) {
            console.error('Error executing layout:', error);
        }
    }

    /**
     * 高亮元素
     * @param {string|Array} elementIds - 元素ID或ID数组
     * @param {string} elementType - 元素类型 ('node' 或 'edge')
     * @param {string|null} viewType - 视图类型，null表示所有视图
     */
    function highlightElements(elementIds, elementType, viewType = null) {
        try {
            // 标准化为数组
            const ids = Array.isArray(elementIds) ? elementIds : [elementIds];
            
            const instances = [];
            
            if (viewType && cyInstances[viewType]) {
                instances.push(cyInstances[viewType]);
            } else {
                if (cyInstances.tree) instances.push(cyInstances.tree);
                if (cyInstances.network) instances.push(cyInstances.network);
            }
            
            instances.forEach(cy => {
                // 清除所有高亮
                cy.elements('.highlight').removeClass('highlight');
                
                // 高亮指定元素
                ids.forEach(id => {
                    const element = cy.getElementById(id);
                    if (element) {
                        element.addClass('highlight');
                    }
                });
            });
        } catch (error) {
            console.error('Error highlighting elements:', error);
        }
    }

    /**
     * 清除所有高亮
     * @param {string|null} viewType - 视图类型，null表示所有视图
     */
    function clearHighlighting(viewType = null) {
        try {
            const instances = [];
            
            if (viewType && cyInstances[viewType]) {
                instances.push(cyInstances[viewType]);
            } else {
                if (cyInstances.tree) instances.push(cyInstances.tree);
                if (cyInstances.network) instances.push(cyInstances.network);
            }
            
            instances.forEach(cy => {
                cy.elements('.highlight').removeClass('highlight');
            });
        } catch (error) {
            console.error('Error clearing highlighting:', error);
        }
    }

    /**
     * 缩放视图
     * @param {number} zoom - 缩放级别
     * @param {string|null} viewType - 视图类型，null表示所有视图
     */
    function zoomView(zoom, viewType = null) {
        try {
            const instances = [];
            
            if (viewType && cyInstances[viewType]) {
                instances.push(cyInstances[viewType]);
            } else {
                if (cyInstances.tree) instances.push(cyInstances.tree);
                if (cyInstances.network) instances.push(cyInstances.network);
            }
            
            instances.forEach(cy => {
                cy.zoom(zoom);
            });
        } catch (error) {
            console.error('Error zooming view:', error);
        }
    }

    /**
     * 平移视图
     * @param {Object} pan - 平移对象 {x, y}
     * @param {string|null} viewType - 视图类型，null表示所有视图
     */
    function panView(pan, viewType = null) {
        try {
            const instances = [];
            
            if (viewType && cyInstances[viewType]) {
                instances.push(cyInstances[viewType]);
            } else {
                if (cyInstances.tree) instances.push(cyInstances.tree);
                if (cyInstances.network) instances.push(cyInstances.network);
            }
            
            instances.forEach(cy => {
                cy.pan(pan);
            });
        } catch (error) {
            console.error('Error panning view:', error);
        }
    }

    /**
     * 获取当前视图状态
     * @param {string} viewType - 视图类型
     * @returns {Object} 视图状态对象
     */
    function getViewState(viewType) {
        try {
            const cy = cyInstances[viewType];
            if (!cy) {
                return null;
            }
            
            return {
                zoom: cy.zoom(),
                pan: cy.pan(),
                selectedElements: cy.elements(':selected').map(el => el.id())
            };
        } catch (error) {
            console.error('Error getting view state:', error);
            return null;
        }
    }

    /**
     * 应用视图状态
     * @param {string} viewType - 视图类型
     * @param {Object} state - 视图状态对象
     */
    function applyViewState(viewType, state) {
        try {
            const cy = cyInstances[viewType];
            if (!cy || !state) {
                return;
            }
            
            // 应用缩放和平移
            if (state.pan) {
                cy.pan(state.pan);
            }
            
            if (typeof state.zoom === 'number') {
                cy.zoom(state.zoom);
            }
            
            // 应用选择
            if (state.selectedElements && Array.isArray(state.selectedElements)) {
                cy.elements('node, edge').unselect();
                state.selectedElements.forEach(id => {
                    const element = cy.getElementById(id);
                    if (element) {
                        element.select();
                    }
                });
            }
        } catch (error) {
            console.error('Error applying view state:', error);
        }
    }

    /**
     * 搜索元素
     * @param {string} query - 搜索查询
     * @param {string} elementType - 元素类型 ('node', 'edge' 或 'all')
     * @param {string|null} viewType - 视图类型，null表示所有视图
     * @returns {Array} 匹配的元素数组
     */
    function searchElements(query, elementType = 'all', viewType = null) {
        try {
            const results = [];
            
            if (!query || query.trim() === '') {
                return results;
            }
            
            // 准备选择器
            let selector = elementType === 'all' ? 'node, edge' : elementType + 's';
            
            const instances = [];
            
            if (viewType && cyInstances[viewType]) {
                instances.push(cyInstances[viewType]);
            } else {
                if (cyInstances.tree) instances.push(cyInstances.tree);
                if (cyInstances.network) instances.push(cyInstances.network);
            }
            
            // 搜索关键词
            const keyword = query.toLowerCase();
            
            instances.forEach(cy => {
                const elements = cy.elements(selector);
                
                elements.forEach(el => {
                    const data = el.data();
                    let matches = false;
                    
                    // 搜索标签
                    if (data.label && data.label.toLowerCase().includes(keyword)) {
                        matches = true;
                    }
                    
                    // 搜索ID
                    if (!matches && data.id && data.id.toLowerCase().includes(keyword)) {
                        matches = true;
                    }
                    
                    // 搜索属性
                    if (!matches && data.properties) {
                        for (const [key, value] of Object.entries(data.properties)) {
                            if (typeof value === 'string' && value.toLowerCase().includes(keyword)) {
                                matches = true;
                                break;
                            }
                        }
                    }
                    
                    if (matches) {
                        results.push(el);
                    }
                });
            });
            
            return results;
        } catch (error) {
            console.error('Error searching elements:', error);
            return [];
        }
    }

    /**
     * 清理资源
     */
    function cleanup() {
        try {
            // 清理事件监听
            if (cyInstances.tree) {
                cyInstances.tree.destroy();
                cyInstances.tree = null;
            }
            
            if (cyInstances.network) {
                cyInstances.network.destroy();
                cyInstances.network = null;
            }
            
            // 重置状态
            initialized = false;
            containers = { tree: null, network: null };
            
            // 清除实例引用
            if (neo4jEditor.instances) {
                delete neo4jEditor.instances.tree;
                delete neo4jEditor.instances.network;
            }
            
            console.log('Graph Renderer Module: Resources cleaned up');
        } catch (error) {
            console.error('Error cleaning up graph renderer resources:', error);
        }
    }

    /**
     * 图可视化渲染模块
     */
    const graphRendererModule = {
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
         * 更新整个图
         * @param {Array} nodes - 节点数组
         * @param {Array} edges - 关系数组
         * @param {string|null} viewType - 特定视图类型，null表示所有视图
         */
        updateGraph: function(nodes, edges, viewType = null) {
            updateGraph(nodes, edges, viewType);
        },
        
        /**
         * 添加节点
         * @param {Object} node - 节点对象
         */
        addNode: function(node) {
            addNode(node);
        },
        
        /**
         * 更新节点
         * @param {Object} node - 节点对象
         */
        updateNode: function(node) {
            updateNode(node);
        },
        
        /**
         * 删除节点
         * @param {string} nodeId - 节点ID
         */
        removeNode: function(nodeId) {
            removeNode(nodeId);
        },
        
        /**
         * 添加关系
         * @param {Object} edge - 关系对象
         */
        addEdge: function(edge) {
            addEdge(edge);
        },
        
        /**
         * 更新关系
         * @param {Object} edge - 关系对象
         */
        updateEdge: function(edge) {
            updateEdge(edge);
        },
        
        /**
         * 删除关系
         * @param {string} edgeId - 关系ID
         */
        removeEdge: function(edgeId) {
            removeEdge(edgeId);
        },
        
        /**
         * 适应内容到视图
         * @param {string|null} viewType - 视图类型，null表示所有视图
         */
        fitToContent: function(viewType = null) {
            fitToContent(viewType);
        },
        
        /**
         * 执行布局
         * @param {string|null} viewType - 视图类型，null表示所有视图
         * @param {Object|null} layout - 布局配置，null使用默认配置
         */
        executeLayout: function(viewType = null, layout = null) {
            executeLayout(viewType, layout);
        },
        
        /**
         * 高亮元素
         * @param {string|Array} elementIds - 元素ID或ID数组
         * @param {string} elementType - 元素类型 ('node' 或 'edge')
         * @param {string|null} viewType - 视图类型，null表示所有视图
         */
        highlightElements: function(elementIds, elementType, viewType = null) {
            highlightElements(elementIds, elementType, viewType);
        },
        
        /**
         * 清除所有高亮
         * @param {string|null} viewType - 视图类型，null表示所有视图
         */
        clearHighlighting: function(viewType = null) {
            clearHighlighting(viewType);
        },
        
        /**
         * 缩放视图
         * @param {number} zoom - 缩放级别
         * @param {string|null} viewType - 视图类型，null表示所有视图
         */
        zoomView: function(zoom, viewType = null) {
            zoomView(zoom, viewType);
        },
        
        /**
         * 平移视图
         * @param {Object} pan - 平移对象 {x, y}
         * @param {string|null} viewType - 视图类型，null表示所有视图
         */
        panView: function(pan, viewType = null) {
            panView(pan, viewType);
        },
        
        /**
         * 获取当前视图状态
         * @param {string} viewType - 视图类型
         * @returns {Object} 视图状态对象
         */
        getViewState: function(viewType) {
            return getViewState(viewType);
        },
        
        /**
         * 应用视图状态
         * @param {string} viewType - 视图类型
         * @param {Object} state - 视图状态对象
         */
        applyViewState: function(viewType, state) {
            applyViewState(viewType, state);
        },
        
        /**
         * 搜索元素
         * @param {string} query - 搜索查询
         * @param {string} elementType - 元素类型 ('node', 'edge' 或 'all')
         * @param {string|null} viewType - 视图类型，null表示所有视图
         * @returns {Array} 匹配的元素数组
         */
        searchElements: function(query, elementType = 'all', viewType = null) {
            return searchElements(query, elementType, viewType);
        },
        
        /**
         * 获取Cytoscape实例
         * @param {string} viewType - 视图类型
         * @returns {Object|null} Cytoscape实例
         */
        getCytoscapeInstance: function(viewType) {
            return cyInstances[viewType] || null;
        },
        
        /**
         * 清理资源
         */
        cleanup: function() {
            cleanup();
        }
    };
    
    // 导出模块到命名空间
    neo4jEditor.graphRenderer = graphRendererModule;
    
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
                console.warn(`警告: 直接调用 ${deprecatedName}() 已弃用，请使用 neo4jEditor.graphRenderer.${newFunction.name || 'method'}()`);
            }
            return newFunction.apply(context || null, arguments);
        };
    }
    
    // 注册向后兼容函数
    const backwardCompatibilityMapping = [
        { deprecatedName: 'renderGraph', newFunction: graphRendererModule.updateGraph, context: graphRendererModule },
        { deprecatedName: 'addGraphNode', newFunction: graphRendererModule.addNode, context: graphRendererModule },
        { deprecatedName: 'updateGraphNode', newFunction: graphRendererModule.updateNode, context: graphRendererModule },
        { deprecatedName: 'deleteGraphNode', newFunction: graphRendererModule.removeNode, context: graphRendererModule },
        { deprecatedName: 'addGraphEdge', newFunction: graphRendererModule.addEdge, context: graphRendererModule },
        { deprecatedName: 'updateGraphEdge', newFunction: graphRendererModule.updateEdge, context: graphRendererModule },
        { deprecatedName: 'deleteGraphEdge', newFunction: graphRendererModule.removeEdge, context: graphRendererModule },
        { deprecatedName: 'fitGraph', newFunction: graphRendererModule.fitToContent, context: graphRendererModule },
        { deprecatedName: 'executeGraphLayout', newFunction: graphRendererModule.executeLayout, context: graphRendererModule },
        { deprecatedName: 'highlightGraphElements', newFunction: graphRendererModule.highlightElements, context: graphRendererModule },
        { deprecatedName: 'clearGraphHighlighting', newFunction: graphRendererModule.clearHighlighting, context: graphRendererModule },
        { deprecatedName: 'cleanupGraphRenderer', newFunction: graphRendererModule.cleanup, context: graphRendererModule }
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
    const moduleName = 'views/graphRenderer';
    const moduleRegistrationInfo = {
        name: moduleName,
        version: '1.0.0',
        dependencies: ['core/eventManager', 'core/dataModel'],
        module: graphRendererModule
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
                        initialized: graphRendererModule.initialized,
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
                window.appModule.graphRenderer = graphRendererModule;
                console.log(`Neo4j Editor: ${moduleName} module registered via final fallback to appModule`);
            }
        }
    } else {
        // 降级方案：直接挂载到全局
        if (typeof window.appModule === 'undefined') {
            window.appModule = {};
        }
        window.appModule.graphRenderer = graphRendererModule;
        console.log(`Neo4j Editor: ${moduleName} module registered via fallback to appModule`);
    }
    
    // 多模块系统支持 - 确保兼容性
    // CommonJS 模块支持
    if (typeof module !== 'undefined' && typeof module.exports !== 'undefined') {
        module.exports = graphRendererModule;
    }
    
    // ES 模块支持
    if (typeof exports !== 'undefined' && typeof exports === 'object') {
        Object.defineProperty(exports, '__esModule', { value: true });
        if (typeof module !== 'undefined') module.exports = graphRendererModule;
        exports.default = graphRendererModule;
    }
    
    // AMD 模块支持
    if (typeof define === 'function' && define.amd) {
        define(['core/eventManager', 'core/dataModel'], function() {
            return graphRendererModule;
        });
    }
    
    return graphRendererModule;
})(window.neo4jEditor || (window.neo4jEditor = {}));