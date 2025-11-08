// 事件管理器 - 使用AMD规范实现

/**
 * 事件管理器类
 * 负责处理双画布编辑器的所有交互事件
 */
define(['./eventBus'], function(eventBusModule) {
  'use strict';

  class EventManager {
    /**
     * 构造函数
     * @param {HTMLElement} treeCanvas - 树视图画布元素
     * @param {HTMLElement} networkCanvas - 网络图画布元素
     * @param {Object} graphService - 图数据服务
     * @param {Object} options - 可选配置项
     */
    constructor(treeCanvas, networkCanvas, graphService, options = {}) {
      // 验证参数
      if (!treeCanvas || !networkCanvas || !graphService) {
        throw new Error('EventManager initialization failed: Missing required parameters');
      }

      // 存储画布引用
      this.treeCanvas = treeCanvas;
      this.networkCanvas = networkCanvas;
      this.graphService = graphService;

      // 使用增强的事件总线实例
      this.eventBus = options.eventBus || 
                      (window.enhancedEventBus || 
                        (eventBusModule.EnhancedEventBus ? 
                          eventBusModule.EnhancedEventBus.getInstance() : 
                          new eventBusModule.EnhancedEventBus()));
      
      // 获取事件常量
      this.Events = eventBusModule.Events || window.Events;

      // 操作模式管理
      this.currentMode = 'select'; // 默认模式：选择
      this.currentRelationshipType = null; // 当前关系类型
      this.modeHistory = []; // 模式历史记录

      // 交互状态管理
      this.isDragging = false;
      this.isPanning = false;
      this.lastMousePosition = { x: 0, y: 0 };
      this.selectedNodes = new Set();
      this.sourceNodeForRelationship = null;
      this.relationshipCreationActive = false;

      // 事件处理器映射
      this.eventHandlers = {};

      // 绑定内部方法上下文
      this.initializeEvents = this.initializeEvents.bind(this);
      this.switchMode = this.switchMode.bind(this);
      this.handleCanvasClick = this.handleCanvasClick.bind(this);
      this.handleCanvasDoubleClick = this.handleCanvasDoubleClick.bind(this);
      this.handleMouseDown = this.handleMouseDown.bind(this);
      this.handleMouseMove = this.handleMouseMove.bind(this);
      this.handleMouseUp = this.handleMouseUp.bind(this);
      this.handleWheel = this.handleWheel.bind(this);
      this.handleKeyDown = this.handleKeyDown.bind(this);
      this.handleKeyUp = this.handleKeyUp.bind(this);
      this.bindDragEvents = this.bindDragEvents.bind(this);
      this.bindContextMenuEvents = this.bindContextMenuEvents.bind(this);
    }

    /**
     * 初始化所有事件
     */
    initializeEvents() {
      console.log('EventManager: Initializing events');

      // 绑定通用画布事件
      this.bindCanvasEvents();
      
      // 绑定拖拽事件
      this.bindDragEvents();
      
      // 绑定右键菜单事件
      this.bindContextMenuEvents();
      
      // 绑定键盘事件
      this.bindKeyboardEvents();

      console.log('EventManager: Events initialized successfully');
      return true;
    }

    /**
     * 绑定画布基础事件
     */
    bindCanvasEvents() {
      // 为两个画布绑定相同的事件
      [this.treeCanvas, this.networkCanvas].forEach((canvas, index) => {
        const canvasType = index === 0 ? 'Tree Canvas' : 'Network Canvas';

        // 点击事件
        canvas.addEventListener('click', (e) => this.handleCanvasClick(e, canvasType));
        
        // 双击事件
        canvas.addEventListener('dblclick', (e) => this.handleCanvasDoubleClick(e, canvasType));
        
        // 鼠标按下事件
        canvas.addEventListener('mousedown', (e) => this.handleMouseDown(e, canvasType));
        
        // 鼠标移动事件
        canvas.addEventListener('mousemove', (e) => this.handleMouseMove(e, canvasType));
        
        // 鼠标释放事件
        canvas.addEventListener('mouseup', (e) => this.handleMouseUp(e, canvasType));
        
        // 鼠标离开事件
        canvas.addEventListener('mouseleave', (e) => this.handleMouseUp(e, canvasType));
        
        // 滚轮事件
        canvas.addEventListener('wheel', (e) => this.handleWheel(e, canvasType), { passive: false });
      });
    }

    /**
     * 绑定拖拽事件
     */
    bindDragEvents() {
      // 拖拽事件已在bindCanvasEvents中处理
      console.log('EventManager: Drag events bound');
    }

    /**
     * 绑定右键菜单事件
     */
    bindContextMenuEvents() {
      [this.treeCanvas, this.networkCanvas].forEach((canvas, index) => {
        const canvasType = index === 0 ? 'Tree Canvas' : 'Network Canvas';
        
        canvas.addEventListener('contextmenu', (e) => {
          e.preventDefault();
          this.handleContextMenu(e, canvasType);
        });
      });
    }

    /**
     * 绑定键盘事件
     */
    bindKeyboardEvents() {
      document.addEventListener('keydown', this.handleKeyDown);
      document.addEventListener('keyup', this.handleKeyUp);
    }

    /**
     * 切换操作模式
     * @param {string} mode - 模式名称: 'select', 'node', 'relationship'
     * @param {string} subType - 子类型，用于关系模式: 'CHILD_OF', 'RELATES_TO'
     */
    switchMode(mode, subType = null) {
      // 验证模式参数
      const validModes = ['select', 'node', 'relationship'];
      if (!validModes.includes(mode)) {
        console.error(`EventManager: Invalid mode '${mode}'. Must be one of: ${validModes.join(', ')}`);
        return false;
      }

      // 如果是关系模式，验证子类型
      if (mode === 'relationship') {
        const validSubTypes = ['CHILD_OF', 'RELATES_TO'];
        if (!subType || !validSubTypes.includes(subType)) {
          console.error(`EventManager: Relationship mode requires a valid subType: ${validSubTypes.join(', ')}`);
          return false;
        }
        this.currentRelationshipType = subType;
      }

      console.log(`EventManager: Switching to mode '${mode}'${subType ? ` with subType '${subType}'` : ''}`);
      
      // 记录历史
      this.modeHistory.push({ mode: this.currentMode, subType: this.currentRelationshipType });
      
      // 更新当前模式
      this.currentMode = mode;
      
      // 清理交互状态
      this.clearInteractionState();
      
      // 发布模式切换事件
      this.eventBus.emit(this.Events?.MODE_CHANGED || 'modeChanged', {
        mode: this.currentMode,
        subType: this.currentRelationshipType
      });
      
      return true;
    }

    /**
     * 恢复上一个模式
     */
    revertToPreviousMode() {
      if (this.modeHistory.length > 0) {
        const previous = this.modeHistory.pop();
        return this.switchMode(previous.mode, previous.subType);
      }
      return false;
    }

    /**
     * 清理交互状态
     */
    clearInteractionState() {
      this.sourceNodeForRelationship = null;
      this.relationshipCreationActive = false;
      // 保留选中节点，除非明确取消选择
    }

    /**
     * 处理画布点击事件
     * @param {MouseEvent} event - 鼠标事件对象
     * @param {string} canvasType - 画布类型
     */
    handleCanvasClick(event, canvasType) {
      console.log(`EventManager: Canvas click in ${canvasType}`);
      
      // 获取点击的节点
      const node = this.getNodeFromEvent(event, canvasType);
      
      // 获取点击的关系
      const relationship = this.getRelationshipFromEvent(event, canvasType);
      
      // 根据当前模式和点击对象执行不同操作
      if (node) {
        this.handleNodeClick(node, event, canvasType);
      } else if (relationship) {
        this.handleRelationshipClick(relationship, event, canvasType);
      } else {
        this.handleCanvasBackgroundClick(event, canvasType);
      }
    }

    /**
     * 处理画布双击事件
     * @param {MouseEvent} event - 鼠标事件对象
     * @param {string} canvasType - 画布类型
     */
    handleCanvasDoubleClick(event, canvasType) {
      console.log(`EventManager: Canvas double click in ${canvasType}`);
      
      const node = this.getNodeFromEvent(event, canvasType);
      if (node) {
        this.handleNodeDoubleClick(node, canvasType);
      }
    }

    /**
     * 处理节点点击
     * @param {Object} node - 节点对象
     * @param {MouseEvent} event - 鼠标事件对象
     * @param {string} canvasType - 画布类型
     */
    handleNodeClick(node, event, canvasType) {
      console.log(`EventManager: Node clicked: ${node.id} in ${canvasType}`);
      
      switch (this.currentMode) {
        case 'select':
          this.handleNodeSelection(node, event);
          break;
        case 'node':
          // 在节点模式下，点击节点可以作为父节点
          this.graphService.selectNode(node.id);
          break;
        case 'relationship':
          this.handleRelationshipCreation(node, canvasType);
          break;
      }
      
      // 发布节点点击事件
      this.eventBus.emit('nodeClicked', { node, canvasType });
    }

    /**
     * 处理关系点击
     * @param {Object} relationship - 关系对象
     * @param {MouseEvent} event - 鼠标事件对象
     * @param {string} canvasType - 画布类型
     */
    handleRelationshipClick(relationship, event, canvasType) {
      console.log(`EventManager: Relationship clicked: ${relationship.id} in ${canvasType}`);
      
      // 选中关系
      this.graphService.selectRelationship(relationship.id);
      
      // 发布关系点击事件
      this.eventBus.emit('relationshipClicked', { relationship, canvasType });
    }

    /**
     * 处理画布背景点击
     * @param {MouseEvent} event - 鼠标事件对象
     * @param {string} canvasType - 画布类型
     */
    handleCanvasBackgroundClick(event, canvasType) {
      console.log(`EventManager: Canvas background clicked in ${canvasType}`);
      
      if (this.currentMode === 'node') {
        // 在节点模式下，点击空白处创建节点
        const parentNode = this.getSelectedNode() || null;
        this.createNodeAtPosition(event, canvasType, parentNode);
      } else {
        // 其他模式下，取消选择
        this.graphService.clearSelection();
        this.selectedNodes.clear();
      }
      
      // 发布画布背景点击事件
      this.eventBus.emit('canvasBackgroundClicked', { position: this.getEventPosition(event), canvasType });
    }

    /**
     * 处理节点双击
     * @param {Object} node - 节点对象
     * @param {string} canvasType - 画布类型
     */
    handleNodeDoubleClick(node, canvasType) {
      console.log(`EventManager: Node double clicked: ${node.id} in ${canvasType}`);
      
      if (canvasType === 'Tree Canvas' && !node.isLeaf) {
        // 在树视图中双击非叶子节点，切换网络图上下文
        this.graphService.setNetworkContext(node.id);
        this.eventBus.emit(this.Events?.NETWORK_CONTEXT_CHANGED || 'networkContextChanged', { parentId: node.id });
      } else if (canvasType === 'Network Canvas') {
        // 在网络图中双击节点，下钻到子组
        if (!node.isLeaf) {
          this.graphService.setNetworkContext(node.id);
          this.eventBus.emit(this.Events?.NETWORK_CONTEXT_CHANGED || 'networkContextChanged', { parentId: node.id });
        }
      }
    }

    /**
     * 处理节点选择
     * @param {Object} node - 节点对象
     * @param {MouseEvent} event - 鼠标事件对象
     */
    handleNodeSelection(node, event) {
      const isMultiSelect = event.ctrlKey || event.metaKey;
      
      if (isMultiSelect) {
        // 多选模式
        if (this.selectedNodes.has(node.id)) {
          // 取消选择
          this.selectedNodes.delete(node.id);
          if (this.selectedNodes.size === 0) {
            this.graphService.clearSelection();
          }
        } else {
          // 添加选择
          this.selectedNodes.add(node.id);
          this.graphService.selectNode(node.id, true);
        }
      } else {
        // 单选模式
        this.selectedNodes.clear();
        this.selectedNodes.add(node.id);
        this.graphService.selectNode(node.id);
      }
    }

    /**
     * 处理关系创建
     * @param {Object} node - 节点对象
     * @param {string} canvasType - 画布类型
     */
    handleRelationshipCreation(node, canvasType) {
      if (!this.relationshipCreationActive) {
        // 第一步：选择源节点
        this.sourceNodeForRelationship = node;
        this.relationshipCreationActive = true;
        console.log(`EventManager: Relationship creation started with source node: ${node.id}`);
        this.eventBus.emit('relationshipCreationStarted', { sourceNode: node });
      } else {
        // 第二步：选择目标节点
        if (node.id !== this.sourceNodeForRelationship.id) {
          // 创建关系
          const relationship = this.graphService.addRelationship(
            this.sourceNodeForRelationship.id,
            node.id,
            this.currentRelationshipType
          );
          
          console.log(`EventManager: Relationship created: ${this.currentRelationshipType} between ${this.sourceNodeForRelationship.id} and ${node.id}`);
          this.eventBus.emit(this.Events?.RELATIONSHIP_ADDED || 'relationshipAdded', {
              relationship: createdRelationship,
              sourceNode: this.sourceNodeForRelationship,
              targetNode: node,
              type: this.currentRelationshipType
            });
        }
        
        // 重置状态
        this.relationshipCreationActive = false;
        this.sourceNodeForRelationship = null;
        
        // 自动切换回选择模式
        if (this.currentMode === 'relationship') {
          this.switchMode('select');
        }
      }
    }

    /**
     * 在指定位置创建节点
     * @param {MouseEvent} event - 鼠标事件对象
     * @param {string} canvasType - 画布类型
     * @param {Object} parentNode - 父节点对象（可选）
     */
    createNodeAtPosition(event, canvasType, parentNode = null) {
      const position = this.getEventPosition(event);
      
      // 创建节点数据
      const nodeData = {
        position,
        canvasType,
        parentId: parentNode ? parentNode.id : null
      };
      
      // 添加节点
      const newNode = this.graphService.addNode(nodeData);
      
      console.log(`EventManager: Node created at position (${position.x}, ${position.y}) in ${canvasType}`);
      this.eventBus.emit(this.Events?.NODE_ADDED || 'nodeAdded', { node: newNode, position, canvasType });
      
      return newNode;
    }

    /**
     * 处理鼠标按下事件
     * @param {MouseEvent} event - 鼠标事件对象
     * @param {string} canvasType - 画布类型
     */
    handleMouseDown(event, canvasType) {
      this.lastMousePosition = this.getEventPosition(event);
      
      // 中键或空格+左键开始平移
      if (event.button === 1 || (event.button === 0 && event.shiftKey)) {
        this.isPanning = true;
        event.preventDefault();
      }
    }

    /**
     * 处理鼠标移动事件
     * @param {MouseEvent} event - 鼠标事件对象
     * @param {string} canvasType - 画布类型
     */
    handleMouseMove(event, canvasType) {
      const currentPosition = this.getEventPosition(event);
      
      if (this.isPanning) {
        // 处理平移
        const deltaX = currentPosition.x - this.lastMousePosition.x;
        const deltaY = currentPosition.y - this.lastMousePosition.y;
        
        this.panCanvas(canvasType, deltaX, deltaY);
        this.lastMousePosition = currentPosition;
        
        this.eventBus.emit('canvasPanned', { canvasType, deltaX, deltaY });
      }
      
      // 拖拽状态处理可以在这里扩展
    }

    /**
     * 处理鼠标释放事件
     * @param {MouseEvent} event - 鼠标事件对象
     * @param {string} canvasType - 画布类型
     */
    handleMouseUp(event, canvasType) {
      if (this.isPanning) {
        this.isPanning = false;
      }
    }

    /**
     * 处理滚轮事件（缩放）
     * @param {WheelEvent} event - 滚轮事件对象
     * @param {string} canvasType - 画布类型
     */
    handleWheel(event, canvasType) {
      event.preventDefault();
      
      const zoomFactor = event.deltaY > 0 ? 0.9 : 1.1;
      const zoomPosition = this.getEventPosition(event);
      
      this.zoomCanvas(canvasType, zoomFactor, zoomPosition);
      
      this.eventBus.emit('canvasZoomed', { 
        canvasType, 
        zoomFactor, 
        position: zoomPosition 
      });
    }

    /**
     * 处理键盘按下事件
     * @param {KeyboardEvent} event - 键盘事件对象
     */
    handleKeyDown(event) {
      // 可以在这里添加键盘快捷键处理
      switch (event.key) {
        case 'Escape':
          // ESC键取消当前操作
          this.clearInteractionState();
          break;
        case 'Delete':
        case 'Backspace':
          // 删除选中的元素
          this.deleteSelectedElements();
          break;
      }
    }

    /**
     * 处理键盘释放事件
     * @param {KeyboardEvent} event - 键盘事件对象
     */
    handleKeyUp(event) {
      // 键盘释放事件处理
    }

    /**
     * 处理右键菜单
     * @param {MouseEvent} event - 鼠标事件对象
     * @param {string} canvasType - 画布类型
     */
    handleContextMenu(event, canvasType) {
      const position = this.getEventPosition(event);
      const node = this.getNodeFromEvent(event, canvasType);
      const relationship = this.getRelationshipFromEvent(event, canvasType);
      
      let menuTarget = null;
      let targetType = null;
      
      if (node) {
        menuTarget = node;
        targetType = 'node';
      } else if (relationship) {
        menuTarget = relationship;
        targetType = 'relationship';
      } else {
        targetType = 'canvas';
      }
      
      // 发布右键菜单事件，由UI模块处理实际的菜单显示
      this.eventBus.emit('contextMenuRequested', {
        position,
        targetType,
        target: menuTarget,
        canvasType
      });
    }

    /**
     * 从事件获取节点
     * 这是一个占位方法，需要在具体实现中重写
     * @param {MouseEvent} event - 鼠标事件对象
     * @param {string} canvasType - 画布类型
     * @returns {Object|null} 节点对象或null
     */
    getNodeFromEvent(event, canvasType) {
      // 实际实现需要根据渲染库（如Cytoscape）的API
      console.warn('EventManager: getNodeFromEvent is not implemented');
      return null;
    }

    /**
     * 从事件获取关系
     * 这是一个占位方法，需要在具体实现中重写
     * @param {MouseEvent} event - 鼠标事件对象
     * @param {string} canvasType - 画布类型
     * @returns {Object|null} 关系对象或null
     */
    getRelationshipFromEvent(event, canvasType) {
      // 实际实现需要根据渲染库（如Cytoscape）的API
      console.warn('EventManager: getRelationshipFromEvent is not implemented');
      return null;
    }

    /**
     * 获取事件在画布中的位置
     * @param {MouseEvent} event - 鼠标事件对象
     * @returns {Object} 位置对象 {x, y}
     */
    getEventPosition(event) {
      const rect = event.currentTarget.getBoundingClientRect();
      return {
        x: event.clientX - rect.left,
        y: event.clientY - rect.top
      };
    }

    /**
     * 获取选中的单个节点
     * @returns {Object|null} 选中的节点或null
     */
    getSelectedNode() {
      if (this.selectedNodes.size === 1) {
        const nodeId = Array.from(this.selectedNodes)[0];
        // 这里需要通过graphService获取实际的节点对象
        return { id: nodeId }; // 临时实现
      }
      return null;
    }

    /**
     * 平移画布
     * 这是一个占位方法，需要在具体实现中重写
     * @param {string} canvasType - 画布类型
     * @param {number} deltaX - X方向偏移
     * @param {number} deltaY - Y方向偏移
     */
    panCanvas(canvasType, deltaX, deltaY) {
      console.warn('EventManager: panCanvas is not implemented');
    }

    /**
     * 缩放画布
     * 这是一个占位方法，需要在具体实现中重写
     * @param {string} canvasType - 画布类型
     * @param {number} zoomFactor - 缩放因子
     * @param {Object} position - 缩放中心点位置
     */
    zoomCanvas(canvasType, zoomFactor, position) {
      console.warn('EventManager: zoomCanvas is not implemented');
    }

    /**
     * 删除选中的元素
     */
    deleteSelectedElements() {
      if (this.selectedNodes.size > 0) {
        this.selectedNodes.forEach(nodeId => {
          this.graphService.deleteNode(nodeId);
        });
        this.selectedNodes.clear();
        this.eventBus.emit('elementsDeleted');
      }
    }

    /**
     * 销毁事件管理器，清理事件监听器
     */
    destroy() {
      console.log('EventManager: Destroying');
      
      // 移除事件监听器
      [this.treeCanvas, this.networkCanvas].forEach((canvas) => {
        canvas.removeEventListener('click', this.handleCanvasClick);
        canvas.removeEventListener('dblclick', this.handleCanvasDoubleClick);
        canvas.removeEventListener('mousedown', this.handleMouseDown);
        canvas.removeEventListener('mousemove', this.handleMouseMove);
        canvas.removeEventListener('mouseup', this.handleMouseUp);
        canvas.removeEventListener('mouseleave', this.handleMouseUp);
        canvas.removeEventListener('wheel', this.handleWheel);
        canvas.removeEventListener('contextmenu', this.handleContextMenu);
      });
      
      document.removeEventListener('keydown', this.handleKeyDown);
      document.removeEventListener('keyup', this.handleKeyUp);
      
      // 清理事件总线
      this.eventBus.clear();
      
      console.log('EventManager: Destroyed successfully');
    }
  }

  return EventManager;
});
