// Neo4j编辑器控制器 - 实现UI与功能的绑定
window.Neo4jEditor = window.Neo4jEditor || {};

/**
 * 通知服务类 - 用于显示操作反馈通知
 */
class NotificationService {
    constructor() {
        this.container = null;
        this.init();
    }
    
    /**
     * 初始化通知容器
     */
    init() {
        // 创建通知容器
        this.container = document.createElement('div');
        this.container.className = 'notification-container';
        this.container.style.position = 'fixed';
        this.container.style.bottom = '20px';
        this.container.style.right = '20px';
        this.container.style.zIndex = '9999';
        document.body.appendChild(this.container);
        
        // 添加样式
        const style = document.createElement('style');
        style.textContent = `
            .notification {
                background-color: #1565C0;
                color: white;
                padding: 12px 20px;
                border-radius: 4px;
                margin-bottom: 10px;
                box-shadow: 0 4px 12px rgba(0,0,0,0.3);
                transform: translateX(100%);
                opacity: 0;
                transition: transform 0.3s ease, opacity 0.3s ease;
                display: flex;
                align-items: center;
                font-size: 14px;
                font-weight: 500;
            }
            
            .notification.show {
                transform: translateX(0);
                opacity: 1;
            }
            
            .notification .icon {
                margin-right: 8px;
                font-size: 16px;
            }
        `;
        document.head.appendChild(style);
    }
    
    /**
     * 显示通知
     * @param {string} message - 通知消息
     * @param {number} duration - 显示时长（毫秒）
     */
    show(message, duration = 2000) {
        // 创建通知元素
        const notification = document.createElement('div');
        notification.className = 'notification';
        
        // 添加图标
        const icon = document.createElement('span');
        icon.className = 'icon';
        icon.innerHTML = '✓';
        notification.appendChild(icon);
        
        // 添加消息文本
        const text = document.createTextNode(message);
        notification.appendChild(text);
        
        // 添加到容器
        this.container.appendChild(notification);
        
        // 显示通知
        setTimeout(() => {
            notification.classList.add('show');
        }, 10);
        
        // 自动隐藏
        setTimeout(() => {
            notification.classList.remove('show');
            setTimeout(() => {
                if (notification.parentNode === this.container) {
                    this.container.removeChild(notification);
                }
            }, 300);
        }, duration);
    }
}

// 全局通知服务实例
window.notificationService = new NotificationService();

/**
 * 编辑器控制器类，负责UI组件与功能模块的绑定
 */
class EditorController {
    constructor() {
        // 初始化事件总线引用
        this.eventBus = window.eventBus || new EventBus();
        
        // 初始化图数据服务引用
        this.graphService = window.graphDataService || new GraphDataService(this.eventBus);
        
        // 确保图数据服务提供正确格式的数据
        if (this.graphService && !this.graphService.getData) {
            // 添加getData方法，确保返回渲染器所需的格式
            this.graphService.getData = function() {
                // 尝试获取原始数据
                const graphData = this.getGraphData ? this.getGraphData() : { nodes: [], relationships: [] };
                
                // 转换数据格式以适应渲染器
                return {
                    nodes: graphData.nodes || [],
                    edges: graphData.relationships || []
                };
            };
        }
        
        // 当前操作模式
        this.currentMode = 'select'; // 默认选择模式
        
        // 视图引用
        this.treeCy = null;
        this.networkCy = null;
        
        // 初始化控制器
        this.init();
    }
    
    /**
     * 初始化编辑器控制器
     */
    init() {
        console.log('Neo4j Editor: 初始化编辑器控制器');
        
        // 绑定模式切换按钮事件
        this.bindModeButtons();
        
        // 绑定视图控制按钮事件
        this.bindViewControlButtons();
        
        // 绑定属性面板事件
        this.bindPropertyPanelEvents();
        
        // 绑定事件总线监听
        this.bindEventBusListeners();
        
        // 初始化视图引用
        this.initViewReferences();
        
        // 绑定画布点击事件
        this.bindCanvasEvents();
    }
    
    /**
     * 绑定画布点击事件
     */
    bindCanvasEvents() {
        // 树视图画布
        const treeCanvas = document.getElementById('cy-tree');
        if (treeCanvas) {
            treeCanvas.addEventListener('click', (e) => {
                this.handleCanvasClick(e, 'tree');
            });
        }
        
        // 网络图视图画布
        const networkCanvas = document.getElementById('cy-network');
        if (networkCanvas) {
            networkCanvas.addEventListener('click', (e) => {
                this.handleCanvasClick(e, 'network');
            });
        }
    }
    
    /**
     * 处理画布点击事件
     * @param {Event} e - 点击事件对象
     * @param {string} canvasType - 画布类型 ('tree' 或 'network')
     */
    handleCanvasClick(e, canvasType) {
        // 检查是否点击在空白处（不是节点上）
        const target = e.target;
        if (target === document.getElementById(`cy-${canvasType}`)) {
            console.log(`Neo4j Editor: Canvas ${canvasType} clicked at position (${e.clientX}, ${e.clientY})`);
            
            if (this.currentMode === 'node') {
                // 节点模式下点击空白处创建节点
                try {
                    const rect = target.getBoundingClientRect();
                    const x = e.clientX - rect.left;
                    const y = e.clientY - rect.top;
                    
                    // 处理不同画布的节点创建规则
                    const node = this.createNode(x, y, canvasType);
                    console.log(`Neo4j Editor: Created node in ${canvasType} canvas`);
                    
                    // 直接通知渲染器更新
                    if (this.renderer && typeof this.renderer.render === 'function') {
                        try {
                            // 获取最新的图数据
                            if (this.graphService && typeof this.graphService.getGraphData === 'function') {
                                const data = this.graphService.getGraphData();
                                if (data) {
                                    this.renderer.render(data);
                                    console.log('节点创建后立即渲染完成');
                                }
                            }
                        } catch (renderError) {
                            console.error('节点创建后立即渲染时出错:', renderError);
                        }
                    }
                    
                    return node;
                } catch (error) {
                    console.error('处理节点创建时出错:', error);
                    // 显示错误通知
                    if (window.notificationService) {
                        window.notificationService.show('创建节点失败');
                    }
                }
            } else if (this.currentMode === 'select') {
                // 选择模式下点击空白处取消选择
                // 通过事件总线触发取消选择事件
                this.eventBus.emit('editor.clearSelection');
            }
        }
    }
    
    /**
     * 创建节点
     * @param {number} x - 节点x坐标
     * @param {number} y - 节点y坐标
     * @param {string} canvasType - 画布类型 ('tree' 或 'network')
     * @returns {object} 创建的节点对象
     */
    createNode(x, y, canvasType) {
        // 获取当前选中的节点类型
        const selectedNodeType = this.getSelectedNodeType();
        
        // 创建节点数据
        const nodeData = {
            id: `node-${Date.now()}`,
            label: selectedNodeType || 'Node',
            position: { x, y },
            properties: {
                name: `${selectedNodeType || 'Node'} ${Date.now().toString().slice(-4)}`,
                created: new Date().toISOString()
            }
        };
        
        // 通过图数据服务添加节点
        if (this.graphService && typeof this.graphService.addNode === 'function') {
            const newNode = this.graphService.addNode(nodeData);
            
            // 通过事件总线通知节点创建成功
            this.eventBus.emit('graph.nodeCreated', {
                node: newNode,
                canvasType: canvasType
            });
            
            return newNode;
        } else {
            console.warn('Neo4j Editor: GraphDataService not available or addNode method not found');
            
            // 如果图数据服务不可用，直接通过事件总线通知
            this.eventBus.emit('graph.nodeCreated', {
                node: nodeData,
                canvasType: canvasType
            });
            
            return nodeData;
        }
    }
    
    /**
     * 获取当前选中的节点类型
     * @returns {string} 选中的节点类型
     */
    getSelectedNodeType() {
        const activeNodeTypeBtn = document.querySelector('.node-type-btn.active');
        if (activeNodeTypeBtn && activeNodeTypeBtn.dataset.type) {
            return activeNodeTypeBtn.dataset.type;
        }
        return 'Person'; // 默认返回Person类型
    }
    
    /**
     * 绑定模式切换按钮事件
     */
    bindModeButtons() {
        // 选择模式按钮
        const selectModeBtn = document.getElementById('select-mode-btn');
        if (selectModeBtn) {
            selectModeBtn.addEventListener('click', () => {
                this.switchMode('select');
            });
        }
        
        // 节点创建模式按钮
        const nodeModeBtn = document.getElementById('node-mode-btn');
        if (nodeModeBtn) {
            nodeModeBtn.addEventListener('click', () => {
                this.switchMode('node');
            });
        }
        
        // 关系创建模式按钮
        const relationshipModeBtn = document.getElementById('relationship-mode-btn');
        if (relationshipModeBtn) {
            relationshipModeBtn.addEventListener('click', () => {
                this.switchMode('relationship');
            });
        }
    }
    
    /**
     * 切换操作模式
     * @param {string} mode - 新模式名称 ('select', 'node', 'relationship')
     */
    switchMode(mode) {
        if (this.currentMode === mode) return;
        
        this.currentMode = mode;
        console.log(`Neo4j Editor: 切换到${mode}模式`);
        
        // 更新按钮状态
        this.updateModeButtonStates();
        
        // 触发模式切换事件
        this.eventBus.emit('editor.modeChanged', { mode: mode });
        
        // 如果有视图同步模块，通知模式变化
        if (window.viewSync && typeof window.viewSync.setMode === 'function') {
            window.viewSync.setMode(mode);
        }
        
        // 显示模式切换通知
        const modeNames = {
            'select': '选择模式',
            'node': '节点创建模式',
            'relationship': '关系创建模式'
        };
        
        if (window.notificationService && typeof window.notificationService.show === 'function') {
            window.notificationService.show(`已切换到${modeNames[mode] || mode}`);
        }
    }
    
    /**
     * 更新模式按钮状态
     */
    updateModeButtonStates() {
        const modes = ['select', 'node', 'relationship'];
        const modeButtons = {
            'select': document.getElementById('select-mode-btn'),
            'node': document.getElementById('node-mode-btn'),
            'relationship': document.getElementById('relationship-mode-btn')
        };
        
        modes.forEach(mode => {
            const button = modeButtons[mode];
            if (button) {
                if (mode === this.currentMode) {
                    button.classList.add('bg-accent');
                    button.classList.remove('bg-gray-700');
                } else {
                    button.classList.remove('bg-accent');
                    button.classList.add('bg-gray-700');
                }
            }
        });
    }
    
    /**
     * 绑定视图控制按钮事件
     */
    bindViewControlButtons() {
        // 树视图控制按钮
        this.bindTreeViewControls();
        
        // 网络图视图控制按钮
        this.bindNetworkViewControls();
    }
    
    /**
     * 绑定树视图控制按钮
     */
    bindTreeViewControls() {
        // 树视图放大按钮
        const zoomInTreeBtn = document.getElementById('zoom-in-tree-btn');
        if (zoomInTreeBtn) {
            zoomInTreeBtn.addEventListener('click', () => {
                this.zoomIn('tree');
            });
        }
        
        // 树视图缩小按钮
        const zoomOutTreeBtn = document.getElementById('zoom-out-tree-btn');
        if (zoomOutTreeBtn) {
            zoomOutTreeBtn.addEventListener('click', () => {
                this.zoomOut('tree');
            });
        }
        
        // 树视图适应按钮
        const fitTreeBtn = document.getElementById('fit-tree-btn');
        if (fitTreeBtn) {
            fitTreeBtn.addEventListener('click', () => {
                this.fitView('tree');
            });
        }
    }
    
    /**
     * 绑定网络图视图控制按钮
     */
    bindNetworkViewControls() {
        // 网络图视图放大按钮
        const zoomInNetworkBtn = document.getElementById('zoom-in-network-btn');
        if (zoomInNetworkBtn) {
            zoomInNetworkBtn.addEventListener('click', () => {
                this.zoomIn('network');
            });
        }
        
        // 网络图视图缩小按钮
        const zoomOutNetworkBtn = document.getElementById('zoom-out-network-btn');
        if (zoomOutNetworkBtn) {
            zoomOutNetworkBtn.addEventListener('click', () => {
                this.zoomOut('network');
            });
        }
        
        // 网络图视图适应按钮
        const fitNetworkBtn = document.getElementById('fit-network-btn');
        if (fitNetworkBtn) {
            fitNetworkBtn.addEventListener('click', () => {
                this.fitView('network');
            });
        }
    }
    
    /**
     * 放大视图
     * @param {string} viewType - 视图类型 ('tree' 或 'network')
     */
    zoomIn(viewType) {
        const cy = viewType === 'tree' ? this.treeCy : this.networkCy;
        if (cy) {
            const currentZoom = cy.zoom();
            cy.zoom({ level: currentZoom * 1.2, position: cy.center() });
        } else if (window.viewSync) {
            const syncCy = viewType === 'tree' ? window.viewSync.treeCy : window.viewSync.networkCy;
            if (syncCy) {
                const currentZoom = syncCy.zoom();
                syncCy.zoom({ level: currentZoom * 1.2, position: syncCy.center() });
            }
        }
    }
    
    /**
     * 缩小视图
     * @param {string} viewType - 视图类型 ('tree' 或 'network')
     */
    zoomOut(viewType) {
        const cy = viewType === 'tree' ? this.treeCy : this.networkCy;
        if (cy) {
            const currentZoom = cy.zoom();
            cy.zoom({ level: currentZoom * 0.8, position: cy.center() });
        } else if (window.viewSync) {
            const syncCy = viewType === 'tree' ? window.viewSync.treeCy : window.viewSync.networkCy;
            if (syncCy) {
                const currentZoom = syncCy.zoom();
                syncCy.zoom({ level: currentZoom * 0.8, position: syncCy.center() });
            }
        }
    }
    
    /**
     * 适应视图
     * @param {string} viewType - 视图类型 ('tree' 或 'network')
     */
    fitView(viewType) {
        const cy = viewType === 'tree' ? this.treeCy : this.networkCy;
        if (cy) {
            cy.fit();
        } else if (window.viewSync) {
            const syncCy = viewType === 'tree' ? window.viewSync.treeCy : window.viewSync.networkCy;
            if (syncCy) {
                syncCy.fit();
            }
        }
    }
    
    /**
     * 绑定属性面板事件
     */
    bindPropertyPanelEvents() {
        // 添加属性按钮
        const addPropertyBtn = document.getElementById('add-property-btn');
        if (addPropertyBtn) {
            addPropertyBtn.addEventListener('click', () => {
                this.openAddPropertyModal();
            });
        }
        
        // 应用节点属性按钮
        const applyNodePropertiesBtn = document.getElementById('apply-node-properties-btn');
        if (applyNodePropertiesBtn) {
            applyNodePropertiesBtn.addEventListener('click', () => {
                this.applyNodeProperties();
            });
        }
    }
    
    /**
     * 打开添加属性模态框
     */
    openAddPropertyModal() {
        // 检查是否存在添加属性模态框
        const addPropertyModal = document.getElementById('add-property-modal');
        if (addPropertyModal) {
            addPropertyModal.classList.remove('hidden');
            addPropertyModal.classList.add('flex');
        } else {
            console.warn('Neo4j Editor: 未找到添加属性模态框');
        }
    }
    
    /**
     * 应用节点属性
     */
    applyNodeProperties() {
        // 获取节点标签和属性值
        const nodeLabelInput = document.getElementById('node-label');
        const propertiesContainer = document.getElementById('node-properties-container');
        
        if (!nodeLabelInput || !propertiesContainer) {
            console.warn('Neo4j Editor: 未找到节点属性相关元素');
            return;
        }
        
        const nodeLabel = nodeLabelInput.value.trim();
        const properties = {};
        
        // 收集所有属性
        const propertyInputs = propertiesContainer.querySelectorAll('.form-group');
        propertyInputs.forEach(group => {
            const label = group.querySelector('.form-label').textContent;
            const input = group.querySelector('.form-input');
            if (input) {
                let value = input.value.trim();
                
                // 根据输入类型转换值
                if (input.type === 'number') {
                    value = parseFloat(value);
                } else if (input.type === 'checkbox') {
                    value = input.checked;
                }
                
                properties[label] = value;
            }
        });
        
        console.log('Neo4j Editor: 应用节点属性', { label: nodeLabel, properties: properties });
        
        // 如果有选中的节点，更新其属性
        // 这里可以通过事件总线触发更新节点属性的事件
        this.eventBus.emit('editor.updateNodeProperties', { 
            label: nodeLabel, 
            properties: properties 
        });
    }
    
    /**
     * 绑定事件总线监听器
     */
    bindEventBusListeners() {
        // 监听节点选中事件
        this.eventBus.on('graph.nodeSelected', (data) => {
            this.updateNodePropertiesPanel(data.node);
        });
        
        // 监听关系选中事件
        this.eventBus.on('graph.relationshipSelected', (data) => {
            this.updateRelationshipPropertiesPanel(data.relationship);
        });
        
        // 监听图数据更新事件
        this.eventBus.on('graph.dataUpdated', (data) => {
            this.updateGraphStats(data);
            // 使用渲染器重新渲染图形
            if (this.renderer && typeof this.renderer.render === 'function') {
                try {
                    this.renderer.render(data);
                    console.log('图形重新渲染完成');
                } catch (error) {
                    console.error('渲染图形时发生错误:', error);
                }
            }
        });
        
        // 监听节点创建事件
        this.eventBus.on('graph.nodeCreated', (data) => {
            console.log(`节点已创建: ${data.node.id}`);
            // 使用渲染器重新渲染图形
            if (this.renderer && typeof this.renderer.render === 'function') {
                try {
                    // 获取最新的图数据
                    if (this.graphService && typeof this.graphService.getGraphData === 'function') {
                        const graphData = this.graphService.getGraphData();
                        if (graphData) {
                            this.renderer.render(graphData);
                            console.log('节点创建后图形重新渲染完成');
                        }
                    }
                } catch (error) {
                    console.error('节点创建后渲染图形时发生错误:', error);
                }
            }
        });
    }
    
    /**
     * 更新节点属性面板
     * @param {object} node - 节点对象
     */
    updateNodePropertiesPanel(node) {
        const nodePropertiesPanel = document.getElementById('node-properties-panel');
        const relationshipPropertiesPanel = document.getElementById('relationship-properties-panel');
        
        if (nodePropertiesPanel && relationshipPropertiesPanel) {
            // 显示节点属性面板，隐藏关系属性面板
            nodePropertiesPanel.classList.remove('hidden');
            relationshipPropertiesPanel.classList.add('hidden');
        }
        
        // 更新节点标签输入框
        const nodeLabelInput = document.getElementById('node-label');
        if (nodeLabelInput && node) {
            nodeLabelInput.value = node.label || '';
        }
        
        // 更新节点属性列表
        const propertiesContainer = document.getElementById('node-properties-container');
        if (propertiesContainer && node && node.properties) {
            // 清空现有属性
            propertiesContainer.innerHTML = '';
            
            // 添加属性输入字段
            Object.entries(node.properties).forEach(([key, value]) => {
                const formGroup = document.createElement('div');
                formGroup.className = 'form-group';
                
                // 创建标签
                const label = document.createElement('label');
                label.className = 'form-label';
                label.textContent = key;
                
                // 创建输入框
                const input = document.createElement('input');
                input.className = 'form-input';
                input.id = `property-${key}`;
                input.placeholder = 'Enter value';
                
                // 根据值类型设置输入框类型
                if (typeof value === 'number') {
                    input.type = 'number';
                } else if (typeof value === 'boolean') {
                    input.type = 'checkbox';
                    input.checked = value;
                } else {
                    input.type = 'text';
                }
                
                // 设置值
                if (typeof value !== 'boolean') {
                    input.value = value.toString();
                }
                
                formGroup.appendChild(label);
                formGroup.appendChild(input);
                propertiesContainer.appendChild(formGroup);
            });
        }
    }
    
    /**
     * 更新关系属性面板
     * @param {object} relationship - 关系对象
     */
    updateRelationshipPropertiesPanel(relationship) {
        const nodePropertiesPanel = document.getElementById('node-properties-panel');
        const relationshipPropertiesPanel = document.getElementById('relationship-properties-panel');
        
        if (nodePropertiesPanel && relationshipPropertiesPanel) {
            // 显示关系属性面板，隐藏节点属性面板
            nodePropertiesPanel.classList.add('hidden');
            relationshipPropertiesPanel.classList.remove('hidden');
        }
        
        // 更新关系标签输入框
        const relationshipLabelInput = document.getElementById('relationship-label');
        if (relationshipLabelInput && relationship) {
            relationshipLabelInput.value = relationship.type || '';
        }
        
        // 更新关系属性列表
        const propertiesContainer = document.getElementById('relationship-properties-container');
        if (propertiesContainer && relationship && relationship.properties) {
            // 清空现有属性
            propertiesContainer.innerHTML = '';
            
            // 添加属性输入字段
            Object.entries(relationship.properties).forEach(([key, value]) => {
                const formGroup = document.createElement('div');
                formGroup.className = 'form-group';
                
                // 创建标签
                const label = document.createElement('label');
                label.className = 'form-label';
                label.textContent = key;
                
                // 创建输入框
                const input = document.createElement('input');
                input.className = 'form-input';
                input.id = `relationship-property-${key}`;
                input.placeholder = 'Enter value';
                
                // 根据值类型设置输入框类型
                if (typeof value === 'number') {
                    input.type = 'number';
                } else if (typeof value === 'boolean') {
                    input.type = 'checkbox';
                    input.checked = value;
                } else {
                    input.type = 'text';
                }
                
                // 设置值
                if (typeof value !== 'boolean') {
                    input.value = value.toString();
                }
                
                formGroup.appendChild(label);
                formGroup.appendChild(input);
                propertiesContainer.appendChild(formGroup);
            });
        }
    }
    
    /**
     * 更新图统计信息
     * @param {object} data - 图数据
     */
    updateGraphStats(data) {
        const nodeCountElement = document.getElementById('node-count');
        const edgeCountElement = document.getElementById('edge-count');
        
        if (nodeCountElement && edgeCountElement) {
            // 获取节点和边的数量
            const nodeCount = data.nodes ? data.nodes.length : 0;
            const edgeCount = data.relationships ? data.relationships.length : 0;
            
            // 更新显示
            nodeCountElement.textContent = `${nodeCount} nodes`;
            edgeCountElement.textContent = `${edgeCount} edges`;
        }
    }
    
    /**
     * 初始化视图引用
     */
    initViewReferences() {
        // 获取树视图和网络图视图的容器引用
        this.treeCanvasContainer = document.getElementById('cy-tree');
        this.networkCanvasContainer = document.getElementById('cy-network');
        
        try {
            // 使用Neo4jRenderers创建双视图渲染器
            if (window.Neo4jRenderers) {
                this.renderer = window.Neo4jRenderers.createDualViewRenderer({
                    tree: 'cy-tree',
                    network: 'cy-network'
                });
                console.log('已使用Neo4jRenderers创建渲染器实例');
                
                // 初始渲染（如果有数据）
                if (this.graphService && typeof this.graphService.getGraphData === 'function') {
                    const initialData = this.graphService.getGraphData();
                    if (initialData && (initialData.nodes && initialData.nodes.length > 0 || initialData.relationships && initialData.relationships.length > 0)) {
                        this.renderer.render(initialData);
                        console.log('初始数据渲染完成');
                    } else {
                        console.log('暂无初始数据需要渲染');
                    }
                }
            } else {
                console.error('Neo4jRenderers未加载，无法创建渲染器实例');
            }
        } catch (error) {
            console.error('初始化视图引用时发生错误:', error);
        }
    }
    
    /**
     * 获取当前编辑器状态
     * @returns {object} 编辑器状态
     */
    getState() {
        return {
            currentMode: this.currentMode,
            hasTreeView: !!this.treeCy,
            hasNetworkView: !!this.networkCy
        };
    }
}

// 将EditorController暴露到全局作用域
window.EditorController = EditorController;

// 当页面加载完成时初始化编辑器控制器
document.addEventListener('DOMContentLoaded', function() {
    // 确保EventBus已定义
    if (typeof window.EventBus === 'undefined') {
        console.error('Neo4j Editor: EventBus未定义，请先加载eventBus.js');
        return;
    }
    
    // 确保GraphDataService已定义
    if (typeof window.GraphDataService === 'undefined') {
        console.error('Neo4j Editor: GraphDataService未定义，请先加载graphDataService.js');
        return;
    }
    
    // 初始化编辑器控制器
    window.neo4jEditorController = new EditorController();
    console.log('Neo4j Editor: 编辑器控制器初始化完成');
    
    // 为节点类型按钮添加点击事件
    document.querySelectorAll('.node-type-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            // 移除所有按钮的active类
            document.querySelectorAll('.node-type-btn').forEach(b => {
                b.classList.remove('active');
            });
            // 为当前点击的按钮添加active类
            btn.classList.add('active');
        });
    });
});