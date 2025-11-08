/**
 * 关系网画布管理器
 * 负责关系网视图的渲染和交互，适配新的渲染器
 */
class NetworkCanvasManager extends CanvasManager {
  constructor(options = {}) {
    super(options);
    
    // 网络图布局相关配置
    this.options = {
      nodeRadius: 25,
      forceSimulation: true,
      repulsionForce: -100,
      linkDistance: 100,
      ...this.options
    };
    
    // 上下文管理
    this.contextParentId = null;
    this.displayContextEmptyMessage = true;
    
    // 拖动状态
    this.isDraggingNode = false;
    this.draggedNodeId = null;
    this.dragStartPos = null;
    this.dragOffset = null;
    
    // 力导向模拟状态
    this.isSimulating = false;
    this.simulationStep = 0;
    this.maxSimulationSteps = 100;
    
    // 注册事件监听
    this.eventBus.on('networkContextChanged', this._handleContextChange.bind(this));
  }
  
  /**
   * 初始化事件订阅
   * @private
   */
  _initEventSubscriptions() {
    // 调用父类的初始化方法
    super._initEventSubscriptions();
    
    // 添加额外的事件订阅
    this.eventBus.on('nodeSelected', (data) => {
      this._onNodeSelected(data.nodeId || data.id);
    });
    
    this.eventBus.on('relationshipSelected', (data) => {
      this._onRelationshipSelected(data.relationshipId || data.id);
    });
  }

  /**
   * 初始化
   */
  init() {
    super.init();
    
    // 设置初始缩放级别和中心点
    this.zoom = 1.0;
    this.centerX = 0;
    this.centerY = 0;
    
    // 关系删除相关状态
    this.isDeletingRelationship = false;
    this.lastRightClickPos = null;
    
    // 提示信息
    this.showDragHint = false;
    
    // 初始化事件监听器数组（避免潜在的undefined问题）
    if (!this._eventListeners) {
      this._eventListeners = {};
    }
    
    // 获取当前的画布元素，优先使用渲染器的画布
    const canvasElement = this.renderer && this.renderer.getCanvas && typeof this.renderer.getCanvas === 'function' ? this.renderer.getCanvas() : this.canvas;
    if (!canvasElement) return;
    
    // 添加双击事件监听（用于下钻）
    this._eventListeners.dblclick = (e) => this._handleDoubleClick(e);
    canvasElement.addEventListener('dblclick', this._eventListeners.dblclick);
    
    // 添加右键菜单支持
    this._eventListeners.contextmenu = (e) => this._handleRightClick(e);
    canvasElement.addEventListener('contextmenu', this._eventListeners.contextmenu);
    
    // 添加鼠标移动事件用于显示拖动提示
    this._eventListeners.mousemove = (e) => this._handleMouseMove(e);
    canvasElement.addEventListener('mousemove', this._eventListeners.mousemove);
  }
  
  /**
   * 处理鼠标移动
   */
  _handleMouseMove(e) {
    super._handleMouseMove(e);
    
    const mousePos = this._getMousePos(e);
    const node = this._getNodeAtPosition(mousePos);
    
    // 如果鼠标悬停在节点上，提示可以拖动改变层级关系
    this.showDragHint = !!node;
  }
  
  /**
   * 处理双击事件（下钻）
   */
  _handleDoubleClick(e) {
    const mousePos = this._getMousePos(e);
    const node = this._getNodeAtPosition(mousePos);
    
    if (node) {
      // 检查节点是否有子节点
      const childNodes = this.graphService._findChildNodes(node.id);
      if (childNodes.length > 0) {
        // 切换上下文到该节点（下钻）
        this.setContext(node.id);
        this._handleContextChange(node.id);
      }
    }
  }
  
  /**
   * 处理上下文变化
   */
  _handleContextChange(newContextId) {
    this.setContext(newContextId);
    this.render();
    
    // 触发上下文变化事件，更新属性面板
    this.eventBus.emit('contextChanged', { type: 'network', nodeId: newContextId });
  }
  
  /**
   * 设置上下文父节点
   */
  setContext(parentId) {
    this.contextParentId = parentId;
    this.displayContextEmptyMessage = false;
    
    // 重置选中状态
    this.selectedNodes.clear();
    this.selectedRelationship = null;
    
    // 初始化节点位置
    this._initializeNodePositions();
    
    // 居中显示
    this._centerView();
    
    // 启动力导向布局
    if (this.options.forceSimulation) {
      this.startForceSimulation();
    }
  }
  
  /**
   * 初始化节点位置
   */
  _initializeNodePositions() {
    const visibleNodes = this._getVisibleNodes();
    // 获取画布尺寸，优先使用渲染器的画布
    const canvasElement = this.renderer && this.renderer.getCanvas && typeof this.renderer.getCanvas === 'function' ? this.renderer.getCanvas() : this.canvas;
    const canvasWidth = canvasElement && canvasElement.width ? canvasElement.width : 800;
    const canvasHeight = canvasElement && canvasElement.height ? canvasElement.height : 600;
    const centerX = canvasWidth / 2;
    const centerY = canvasHeight / 2;
    const radius = Math.min(centerX, centerY) * 0.7;
    
    // 如果没有可见节点，直接返回
    if (visibleNodes.length === 0) return;
    
    // 为每个节点分配初始位置
    for (let i = 0; i < visibleNodes.length; i++) {
      const angle = (i / visibleNodes.length) * Math.PI * 2;
      const x = centerX + radius * Math.cos(angle);
      const y = centerY + radius * Math.sin(angle);
      
      this.nodePositions.set(visibleNodes[i].id, { x, y });
    }
  }
  
  /**
   * 居中视图
   */
  _centerView() {
    if (this.nodePositions.size === 0) return;
    
    // 计算所有节点的中心
    let totalX = 0, totalY = 0;
    let minX = Infinity, minY = Infinity;
    let maxX = -Infinity, maxY = -Infinity;
    
    for (const pos of this.nodePositions.values()) {
      totalX += pos.x;
      totalY += pos.y;
      minX = Math.min(minX, pos.x);
      minY = Math.min(minY, pos.y);
      maxX = Math.max(maxX, pos.x);
      maxY = Math.max(maxY, pos.y);
    }
    
    const avgX = totalX / this.nodePositions.size;
    const avgY = totalY / this.nodePositions.size;
    
    // 计算视图中心位置
    // 获取画布尺寸，优先使用渲染器的画布
    const canvasElement = this.renderer && this.renderer.getCanvas && typeof this.renderer.getCanvas === 'function' ? this.renderer.getCanvas() : this.canvas;
    const canvasWidth = canvasElement && canvasElement.width ? canvasElement.width : 800;
    const canvasHeight = canvasElement && canvasElement.height ? canvasElement.height : 600;
    
    // 计算偏移量，使内容居中
    const offsetX = (canvasWidth / 2) - avgX * this.zoom;
    const offsetY = (canvasHeight / 2) - avgY * this.zoom;
    
    // 更新中心点
    this.centerX = avgX;
    this.centerY = avgY;
    
    // 调整所有节点位置
    const newPositions = new Map();
    for (const [nodeId, pos] of this.nodePositions.entries()) {
      newPositions.set(nodeId, { 
        x: pos.x + offsetX / this.zoom,
        y: pos.y + offsetY / this.zoom
      });
    }
    
    this.nodePositions = newPositions;
  }
  
  /**
   * 启动力导向模拟
   */
  startForceSimulation() {
    this.isSimulating = true;
    this.simulationStep = 0;
    this._runSimulation();
  }
  
  /**
   * 运行模拟（简化版力导向算法）
   */
  _runSimulation() {
    if (!this.isSimulating || this.simulationStep >= this.maxSimulationSteps) {
      this.isSimulating = false;
      return;
    }
    
    const visibleNodes = this._getVisibleNodes();
    const visibleRelations = this._getVisibleRelationships();
    
    // 计算斥力（节点间相互排斥）
    for (let i = 0; i < visibleNodes.length; i++) {
      for (let j = i + 1; j < visibleNodes.length; j++) {
        const node1 = visibleNodes[i];
        const node2 = visibleNodes[j];
        const pos1 = this.nodePositions.get(node1.id);
        const pos2 = this.nodePositions.get(node2.id);
        
        if (!pos1 || !pos2) continue;
        
        // 计算距离和方向
        const dx = pos2.x - pos1.x;
        const dy = pos2.y - pos1.y;
        const distance = Math.max(Math.sqrt(dx * dx + dy * dy), 1);
        
        // 归一化方向向量
        const nx = dx / distance;
        const ny = dy / distance;
        
        // 斥力大小
        const force = this.options.repulsionForce / (distance * distance * 0.1);
        const stepSize = 0.1;
        
        // 更新位置
        pos1.x -= nx * force * stepSize;
        pos1.y -= ny * force * stepSize;
        pos2.x += nx * force * stepSize;
        pos2.y += ny * force * stepSize;
      }
    }
    
    // 计算引力（相连节点互相吸引）
    for (const rel of visibleRelations) {
      const node1 = this.graphService.getNode(rel.startNodeId);
      const node2 = this.graphService.getNode(rel.endNodeId);
      const pos1 = this.nodePositions.get(node1.id);
      const pos2 = this.nodePositions.get(node2.id);
      
      if (!pos1 || !pos2) continue;
      
      // 计算距离和方向
      const dx = pos2.x - pos1.x;
      const dy = pos2.y - pos1.y;
      const distance = Math.max(Math.sqrt(dx * dx + dy * dy), 1);
      
      // 归一化方向向量
      const nx = dx / distance;
      const ny = dy / distance;
      
      // 引力大小（与目标距离的差值成正比）
      const idealDistance = this.options.linkDistance;
      const force = (distance - idealDistance) * 0.01;
      const stepSize = 0.1;
      
      // 更新位置
      pos1.x += nx * force * stepSize;
      pos1.y += ny * force * stepSize;
      pos2.x -= nx * force * stepSize;
      pos2.y -= ny * force * stepSize;
    }
    
    // 边界约束，防止节点飞出画布
      for (const node of visibleNodes) {
        const pos = this.nodePositions.get(node.id);
        if (!pos) continue;
        
        const margin = 50;
        const canvasElement = this.renderer && this.renderer.getCanvas && typeof this.renderer.getCanvas === 'function' ? this.renderer.getCanvas() : this.canvas;
        const canvasWidth = canvasElement && canvasElement.width ? canvasElement.width : 800;
        const canvasHeight = canvasElement && canvasElement.height ? canvasElement.height : 600;
        pos.x = Math.max(margin, Math.min(canvasWidth - margin, pos.x));
        pos.y = Math.max(margin, Math.min(canvasHeight - margin, pos.y));
      }
    
    this.simulationStep++;
    this.render();
    
    // 继续下一帧
    requestAnimationFrame(() => this._runSimulation());
  }
  
  /**
   * 处理节点模式下的点击
   */
  _handleNodeModeClick(e, mousePos) {
    // 检查是否有上下文
    if (!this.contextParentId) {
      alert('请先选择一个父节点以查看关系网');
      return;
    }
    
    // 创建新节点
    this._createNodeAtPosition(mousePos, this.contextParentId);
  }
  
  /**
   * 处理关系模式下的点击
   */
  _handleRelationshipModeClick(e, mousePos) {
    const node = this._getNodeAtPosition(mousePos);
    
    if (!node) return;
    
    const modeManager = this.modeManager;
    
    if (!modeManager.isCreatingRelationship()) {
      // 开始创建关系
      modeManager.startRelationshipCreation(node.id);
    } else {
      try {
        // 完成关系创建
        const { startNodeId, endNodeId, type } = modeManager.finishRelationshipCreation(node.id);
        
        // 创建关系
        this._createRelationship(startNodeId, endNodeId, type);
      } catch (error) {
        console.error('创建关系失败:', error);
        alert(error.message);
        modeManager.resetRelationshipCreation();
      }
    }
  }
  
  /**
   * 创建关系
   */
  _createRelationship(startNodeId, endNodeId, type) {
    if (type === 'RELATES_TO') {
      // 对于RELATES_TO关系，验证节点是否同父
      if (!this._areNodesSiblings(startNodeId, endNodeId)) {
        throw new Error('RELATES_TO关系只能创建在同父节点的子节点之间');
      }
      
      try {
        // 创建关系
        this.graphService.addRelationship({
          type: 'RELATES_TO',
          startNodeId,
          endNodeId,
          properties: {
            created: new Date().toISOString()
          }
        });
        
        this.eventBus.emit('dataChanged');
      } catch (error) {
        throw new Error(`创建RELATES_TO关系失败: ${error.message}`);
      }
    }
  }
  
  /**
   * 检查两个节点是否为兄弟节点（有共同父节点）
   */
  _areNodesSiblings(nodeId1, nodeId2) {
    const parent1 = this.graphService.getParentNode(nodeId1);
    const parent2 = this.graphService.getParentNode(nodeId2);
    
    // 如果一个是根节点而另一个不是，它们不是兄弟
    if ((!parent1 && parent2) || (parent1 && !parent2)) {
      return false;
    }
    
    // 根节点之间视为兄弟
    if (!parent1 && !parent2) {
      return true;
    }
    
    // 其他情况，检查父节点ID是否相同
    return parent1.id === parent2.id;
  }
  
  /**
   * 在指定位置创建节点
   */
  _createNodeAtPosition(pos, parentId) {
    try {
      // 创建新节点数据
      const newNode = this.graphService.createNodeWithContext({
        labels: ['Node'],
        properties: {
          name: '新节点',
          created: new Date().toISOString()
        }
      }, parentId, 'network');
      
      // 保存节点位置
      this.nodePositions.set(newNode.id, { x: pos.x, y: pos.y });
      
      // 发送事件
      this.eventBus.emit('dataChanged');
      this.eventBus.emit('nodeCreated', newNode.id);
      
      // 选中新创建的节点
      this._handleNodeClick(newNode.id, false);
      
      // 重新启动力导向模拟
      if (this.options.forceSimulation) {
        this.startForceSimulation();
      }
    } catch (error) {
      console.error('创建节点失败:', error);
      alert(`创建节点失败: ${error.message}`);
    }
  }
  
  /**
   * 处理鼠标按下事件（增强父类方法）
   */
  _handleMouseDown(e) {
    super._handleMouseDown(e);
    
    // 获取当前的画布元素
    const canvas = this.canvas || (this.renderer ? this.renderer.getCanvas() : null);
    
    // 如果不是平移模式，处理节点拖动
    if (!this.isPanning) {
      const mousePos = this._getMousePos(e);
      const node = this._getNodeAtPosition(mousePos);
      
      if (node && e.button === 0) {
        // 开始拖动节点
        this.isDraggingNode = true;
        this.draggedNodeId = node.id;
        this.dragStartPos = mousePos;
        
        const nodePos = this.nodePositions.get(node.id) || { x: 0, y: 0 };
        this.dragOffset = { 
          x: nodePos.x - mousePos.x, 
          y: nodePos.y - mousePos.y 
        };
        
        // 停止力导向模拟
        this.isSimulating = false;
        
        if (canvas) canvas.style.cursor = 'grabbing';
      }
    }
  }
  
  /**
   * 处理鼠标移动事件（增强父类方法）
   */
  _handleMouseMove(e) {
    if (this.isDraggingNode && this.draggedNodeId) {
      const mousePos = this._getMousePos(e);
      
      // 更新节点位置
      const newPos = {
        x: mousePos.x + this.dragOffset.x,
        y: mousePos.y + this.dragOffset.y
      };
      
      this.nodePositions.set(this.draggedNodeId, newPos);
      this.render();
      return;
    }
    
    // 调用父类方法
    super._handleMouseMove(e);
  }
  
  /**
   * 处理鼠标抬起事件（增强父类方法）
   */
  _handleMouseUp(e) {
    super._handleMouseUp(e);
    
    // 获取当前的画布元素
    const canvas = this.canvas || (this.renderer ? this.renderer.getCanvas() : null);
    
    // 检查节点拖动后的层级关系更新
    if (this.isDraggingNode && this.draggedNodeId) {
      this.isDraggingNode = false;
      
      // 检查是否需要更新层级关系
      this._checkNodePositionForHierarchyUpdate(this.draggedNodeId);
      
      this.draggedNodeId = null;
      this.dragStartPos = null;
      this.dragOffset = null;
      if (canvas) canvas.style.cursor = 'default';
    }
  }
  
  /**
   * 检查节点位置，判断是否需要更新层级关系
   */
  _checkNodePositionForHierarchyUpdate(nodeId) {
    const nodePos = this.nodePositions.get(nodeId);
    if (!nodePos) return;
    
    // 查找可能的新父节点（距离最近的其他节点）
    let closestNode = null;
    let minDistance = Infinity;
    const thresholdDistance = 100; // 阈值距离，超过这个距离不认为是要改变层级关系
    
    for (const [otherId, otherPos] of this.nodePositions.entries()) {
      if (otherId === nodeId) continue;
      
      const distance = Math.sqrt(
        Math.pow(nodePos.x - otherPos.x, 2) + 
        Math.pow(nodePos.y - otherPos.y, 2)
      );
      
      if (distance < minDistance && distance < thresholdDistance) {
        minDistance = distance;
        closestNode = otherId;
      }
    }
    
    // 如果找到合适的新父节点，更新层级关系
    if (closestNode) {
      try {
        // 获取当前父节点
        const currentParent = this.graphService._findParentNode(nodeId);
        
        // 如果新父节点不是当前父节点，且不是子节点（避免循环引用）
        if (closestNode !== currentParent && !this._isDescendant(closestNode, nodeId)) {
          // 更新层级关系
          this.graphService.moveNode(nodeId, closestNode);
          
          // 触发数据变更事件，更新树视图
          this.eventBus.emit('dataChanged');
          
          console.log(`节点 ${nodeId} 已移动到 ${closestNode} 下`);
        }
      } catch (error) {
        console.error('更新节点层级关系失败:', error);
      }
    }
  }
  
  /**
   * 检查节点A是否是节点B的后代节点（避免循环引用）
   */
  _isDescendant(nodeAId, nodeBId) {
    // 获取节点B的所有子节点ID
    const children = this.graphService._findChildNodes(nodeBId);
    
    // 如果是直接子节点，返回true
    if (children.includes(nodeAId)) {
      return true;
    }
    
    // 递归检查所有子节点
    for (const childId of children) {
      if (this._isDescendant(nodeAId, childId)) {
        return true;
      }
    }
    
    return false;
  }
  
  /**
   * 根据位置获取节点（可选排除特定节点）
   */
  _getNodeAtPosition(pos, excludeNodeId = null) {
    const nodes = this._getVisibleNodes();
    
    for (const node of nodes) {
      if (node.id === excludeNodeId) continue;
      
      const nodePos = this.nodePositions.get(node.id);
      if (!nodePos) continue;
      
      const dx = pos.x - nodePos.x;
      const dy = pos.y - nodePos.y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      
      if (distance <= this.options.nodeRadius) {
        return node;
      }
    }
    
    return null;
  }
  
  /**
   * 根据位置获取关系
   */
  _getRelationshipAtPosition(pos) {
    const relationships = this._getVisibleRelationships();
    const tolerance = 8; // 增加点击容差到8像素
    
    for (const rel of relationships) {
      const startPos = this.nodePositions.get(rel.startNodeId);
      const endPos = this.nodePositions.get(rel.endNodeId);
      
      if (!startPos || !endPos) continue;
      
      // 计算点到线段的距离
      const distance = this._distanceToLine(pos, startPos, endPos);
      
      if (distance <= tolerance) {
        return rel;
      }
    }
    
    return null;
  }
  
  /**
   * 处理鼠标右键点击
   */
  _handleRightClick(e) {
    e.preventDefault();
    
    // 获取鼠标位置
    const mousePos = this._getMousePos(e);
    this.lastRightClickPos = mousePos;
    
    // 检查是否点击了关系
    const clickedRelationship = this._getRelationshipAtPosition(mousePos);
    if (clickedRelationship) {
      // 选中关系
      this.selectedRelationship = clickedRelationship.id;
      this.selectedNodes.clear();
      
      // 触发关系选中事件
      this.eventBus.emit('relationshipSelected', clickedRelationship);
      
      // 显示关系右键菜单
      this.eventBus.emit('showRelationshipMenu', { 
        event: e,
        relationship: clickedRelationship,
        position: mousePos
      });
      
      return;
    }
    
    // 检查是否点击了节点
    const clickedNode = this._getNodeAtPosition(mousePos);
    if (clickedNode) {
      // 选中节点
      this.selectedNodes.clear();
      this.selectedNodes.add(clickedNode.id);
      this.selectedRelationship = null;
      
      // 触发节点选中事件
      this.eventBus.emit('nodeSelected', clickedNode);
      
      // 显示节点右键菜单
      this.eventBus.emit('showNodeMenu', { 
        event: e,
        node: clickedNode,
        position: mousePos
      });
      
      return;
    }
    
    // 如果没有点击任何元素，显示画布右键菜单
    this.selectedNodes.clear();
    this.selectedRelationship = null;
    
    this.eventBus.emit('showCanvasMenu', { 
      event: e,
      position: mousePos
    });
  }
  
  /**
   * 计算点到线段的距离
   */
  _distanceToLine(point, lineStart, lineEnd) {
    const A = point.x - lineStart.x;
    const B = point.y - lineStart.y;
    const C = lineEnd.x - lineStart.x;
    const D = lineEnd.y - lineStart.y;
    
    const dot = A * C + B * D;
    const lenSq = C * C + D * D;
    let param = -1;
    
    if (lenSq !== 0) param = dot / lenSq;
    
    let xx, yy;
    
    if (param < 0) {
      xx = lineStart.x;
      yy = lineStart.y;
    } else if (param > 1) {
      xx = lineEnd.x;
      yy = lineEnd.y;
    } else {
      xx = lineStart.x + param * C;
      yy = lineStart.y + param * D;
    }
    
    const dx = point.x - xx;
    const dy = point.y - yy;
    return Math.sqrt(dx * dx + dy * dy);
  }
  
  /**
   * 获取可见节点（当前上下文中的子节点）
   */
  _getVisibleNodes() {
    if (!this.contextParentId) {
      // 如果没有上下文，返回空数组
      return [];
    }
    
    // 获取当前上下文父节点的直接子节点
    // return this.graphService._findChildNodes(this.contextParentId);
    const childNodeIds = this.graphService._findChildNodes(this.contextParentId);
    const childNodes = childNodeIds
      .map(id => this.graphService.getNode(id))
      .filter(node => node != null); // 过滤掉 undefined 或 null

    return childNodes;
  }
  
  /**
   * 获取可见关系（当前上下文中子节点间的RELATES_TO关系）
   */
  _getVisibleRelationships() {
    if (!this.contextParentId) {
      return [];
    }
    
    const visibleNodeIds = new Set(this._getVisibleNodes().map(node => node.id));
    
    // 使用GraphDataService的正确API
    const relIds = this.graphService.getRelationshipsByType('RELATES_TO') || [];
    return relIds
      .map(relId => this.graphService.getRelationship(relId))
      .filter(rel => rel && 
        visibleNodeIds.has(rel.startNodeId) && 
        visibleNodeIds.has(rel.endNodeId)
      );
  }
  
  /**
   * 渲染内容
   */
  _renderContent() {
    // 优先使用自定义渲染器进行渲染
    if (this.renderer && typeof this.renderer.render === 'function') {
      // 准备渲染数据
      const renderData = {
        nodes: this._getVisibleNodes(),
        relationships: this._getVisibleRelationships(),
        nodePositions: this.nodePositions,
        selectedNodes: this.selectedNodes,
        selectedRelationship: this.selectedRelationship,
        options: this.options,
        contextParentId: this.contextParentId,
        showDragHint: this.showDragHint,
        displayContextEmptyMessage: this.displayContextEmptyMessage,
        isCreatingRelationship: (this.modeManager && typeof this.modeManager.isCreatingRelationship === 'function') ? this.modeManager.isCreatingRelationship() : false,
        relationshipCreationState: (this.modeManager && typeof this.modeManager.getRelationshipCreationState === 'function') ? this.modeManager.getRelationshipCreationState() : null
      };
      
      // 调用渲染器
      this.renderer.render(renderData);
      return;
    }
    
    // 回退到默认canvas渲染
    const ctx = this.ctx;
    const nodeRadius = this.options.nodeRadius || 25;
    
    // 渲染背景信息（上下文提示）
    this._renderContextInfo(ctx);
    
    // 如果当前上下文中没有节点，显示空信息
    if (this._getVisibleNodes().length === 0) {
      if (this.displayContextEmptyMessage) {
        this._renderEmptyContextMessage(ctx);
      } else {
        this._renderNoNodesMessage(ctx);
      }
      return;
    }
    
    // 渲染关系
    this._renderRelationships(ctx, nodeRadius);
    
    // 渲染节点
    this._renderNodes(ctx, nodeRadius);
    
    // 渲染拖动提示
    if (this.showDragHint) {
      this._renderDragHint(ctx);
    }
    
    // 渲染关系创建预览
    if (this.modeManager && this.modeManager.isCreatingRelationship()) {
      this._renderRelationshipCreationPreview(ctx, nodeRadius);
    }
  }
  
  /**
   * 渲染拖动提示
   */
  _renderDragHint(ctx) {
    const message = '拖动节点靠近其他节点以更改层级关系';
    
    // 保存上下文状态
    ctx.save();
    
    // 设置样式
    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.9)';
    ctx.lineWidth = 1;
    ctx.font = '12px Arial';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    
    // 测量文本宽度
    const textMetrics = ctx.measureText(message);
    const padding = 8;
    const rectWidth = textMetrics.width + padding * 2;
    const rectHeight = 20;
    
    // 绘制提示框
    ctx.fillRect(padding, padding, rectWidth, rectHeight);
    ctx.strokeRect(padding, padding, rectWidth, rectHeight);
    
    // 绘制文本
    ctx.fillStyle = 'white';
    ctx.fillText(message, padding * 2, padding + 4);
    
    // 恢复上下文状态
    ctx.restore();
  }
  
  /**
   * 渲染空上下文消息
   */
  _renderEmptyContextMessage(ctx) {
    ctx.fillStyle = '#666';
    ctx.font = '16px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('请选择一个父节点以查看关系网', this.canvas.width / 2, this.canvas.height / 2);
  }
  
  /**
   * 渲染无节点消息
   */
  _renderNoNodesMessage(ctx) {
    ctx.fillStyle = '#666';
    ctx.font = '16px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    
    let message = '该节点无子节点';
    if (this.contextParentId) {
      const parentNode = this.graphService.getNode(this.contextParentId);
      const parentName = parentNode && parentNode.properties && parentNode.properties.name ? parentNode.properties.name : '当前节点';
      message = `"${parentName}" 无子节点`;
    }
    
    ctx.fillText(message, this.canvas.width / 2, this.canvas.height / 2);
  }
  
  /**
   * 渲染上下文信息
   */
  _renderContextInfo(ctx) {
    if (!this.contextParentId) return;
    
    const parentNode = this.graphService.getNode(this.contextParentId);
    if (!parentNode) return;
    
    const parentName = parentNode.properties && parentNode.properties.name ? parentNode.properties.name : '父节点';
    
    // 绘制背景
    ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
    ctx.fillRect(10, 10, 250, 30);
    
    // 绘制文本
    ctx.fillStyle = '#333';
    ctx.font = '14px Arial';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText(`上下文: ${parentName}`, 20, 25);
  }
  
  /**
   * 渲染节点
   */
  _renderNodes(ctx, nodeRadius) {
    const nodes = this._getVisibleNodes();
    
    for (const node of nodes) {
      const pos = this.nodePositions.get(node.id);
      if (!pos) continue;
      
      const isSelected = this.selectedNodes.has(node.id);
      const isDragging = this.isDraggingNode && this.draggedNodeId === node.id;
      const isInContext = this.contextParentId === node.id;
      
      // 检查节点是否有子节点（用于显示下钻提示）
      const hasChildren = this.graphService._findChildNodes(node.id).length > 0;
      
      // 绘制节点
      ctx.beginPath();
      ctx.arc(pos.x, pos.y, nodeRadius, 0, Math.PI * 2);
      
      // 根据节点类型和状态设置颜色
      if (isSelected) {
        ctx.fillStyle = '#4CAF50';
      } else if (isInContext) {
        ctx.fillStyle = '#9C27B0'; // 紫色表示上下文节点
      } else if (node.type === 'folder') {
        ctx.fillStyle = '#FF9800'; // 橙色表示文件夹
      } else if (node.type === 'file') {
        ctx.fillStyle = '#2196F3'; // 蓝色表示文件
      } else if (node.type) {
        // 其他类型节点使用不同颜色
        const colorMap = {
          'PERSON': '#E91E63',
          'ORGANIZATION': '#673AB7',
          'LOCATION': '#00BCD4',
          'EVENT': '#795548',
          'PROJECT': '#009688'
        };
        ctx.fillStyle = colorMap[node.type] || '#2196F3';
      } else {
        ctx.fillStyle = '#9C27B0'; // 默认紫色
      }
      
      ctx.fill();
      ctx.strokeStyle = isDragging ? '#FF9800' : '#673AB7';
      ctx.lineWidth = isSelected ? 3 : 2;
      ctx.stroke();
      
      // 如果有子节点，绘制下钻提示（外圆环）
      if (hasChildren) {
        ctx.beginPath();
        ctx.arc(pos.x, pos.y, nodeRadius + 5, 0, Math.PI * 2);
        ctx.strokeStyle = '#FFC107';
        ctx.lineWidth = 2;
        ctx.stroke();
      }
      
      // 绘制节点标签
      ctx.fillStyle = 'white';
      ctx.font = '12px Arial';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      
      const displayName = node.properties.name || node.id.slice(0, 6);
      ctx.fillText(displayName, pos.x, pos.y);
      
      // 如果是上下文节点，绘制额外标记
      if (isInContext) {
        ctx.beginPath();
        ctx.arc(pos.x, pos.y, nodeRadius + 3, 0, Math.PI * 2);
        ctx.strokeStyle = '#FFEB3B';
        ctx.lineWidth = 2;
        ctx.stroke();
      }
    }
  }
  
  /**
   * 渲染关系
   */
  _renderRelationships(ctx, nodeRadius) {
    const relationships = this._getVisibleRelationships();
    
    for (const rel of relationships) {
      const startPos = this.nodePositions.get(rel.startNodeId);
      const endPos = this.nodePositions.get(rel.endNodeId);
      
      if (!startPos || !endPos) continue;
      
      const isSelected = this.selectedRelationship === rel.id;
      
      // 计算箭头角度
      const angle = Math.atan2(endPos.y - startPos.y, endPos.x - startPos.x);
      
      // 计算箭头起点（从节点边缘开始）
      const startX = startPos.x + Math.cos(angle) * nodeRadius;
      const startY = startPos.y + Math.sin(angle) * nodeRadius;
      
      // 计算箭头终点（到节点边缘结束）
      const endX = endPos.x - Math.cos(angle) * nodeRadius;
      const endY = endPos.y - Math.sin(angle) * nodeRadius;
      
      // 绘制线段
      ctx.beginPath();
      ctx.moveTo(startX, startY);
      ctx.lineTo(endX, endY);
      ctx.strokeStyle = isSelected ? '#FF5722' : '#757575';
      ctx.lineWidth = isSelected ? 3 : 2;
      ctx.stroke();
      
      // 绘制箭头
      this._drawArrow(ctx, endX, endY, angle, isSelected);
      
      // 绘制关系类型
      const midX = (startX + endX) / 2;
      const midY = (startY + endY) / 2;
      
      // 添加背景框使文本更清晰
      const typeText = rel.type;
      ctx.save();
      ctx.fillStyle = 'white';
      ctx.font = '12px Arial';
      const metrics = ctx.measureText(typeText);
      ctx.fillRect(midX - metrics.width / 2 - 4, midY - 8, metrics.width + 8, 16);
      
      ctx.fillStyle = isSelected ? '#FF5722' : '#757575';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(typeText, midX, midY);
      ctx.restore();
    }
  }
  
  /**
   * 绘制箭头
   */
  _drawArrow(ctx, x, y, angle, isSelected) {
    const arrowLength = 10;
    const arrowAngle = Math.PI / 6;
    
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(
      x - arrowLength * Math.cos(angle - arrowAngle),
      y - arrowLength * Math.sin(angle - arrowAngle)
    );
    ctx.lineTo(
      x - arrowLength * Math.cos(angle + arrowAngle),
      y - arrowLength * Math.sin(angle + arrowAngle)
    );
    ctx.closePath();
    ctx.fillStyle = isSelected ? '#FF5722' : '#757575';
    ctx.fill();
  }
  
  /**
   * 渲染关系创建预览
   */
  _renderRelationshipCreationPreview(ctx, nodeRadius) {
    const creationState = this.modeManager.getRelationshipCreationState();
    if (!creationState) return;
    
    const startPos = this.nodePositions.get(creationState.startNodeId);
    if (!startPos) return;
    
    // 获取当前的画布元素并计算鼠标位置
    const canvas = this.canvas || (this.renderer ? this.renderer.getCanvas() : null);
    if (!canvas) return;
    
    const rect = canvas.getBoundingClientRect();
    // 获取鼠标位置（考虑平移和缩放）
    const panX = this.pan && this.pan.x !== undefined ? this.pan.x : 0;
    const mouseX = (window.innerWidth / 2 - rect.left - panX) / this.zoom;
    const panY = this.pan && this.pan.y !== undefined ? this.pan.y : 0;
    const mouseY = (window.innerHeight / 2 - rect.top - panY) / this.zoom;
    
    // 绘制预览线
    ctx.beginPath();
    ctx.moveTo(startPos.x, startPos.y);
    ctx.lineTo(mouseX, mouseY);
    ctx.strokeStyle = '#9C27B0';
    ctx.lineWidth = 2;
    ctx.setLineDash([5, 5]);
    ctx.stroke();
    ctx.setLineDash([]);
  }
  
  /**
   * 处理节点选择
   * @private
   */
  _onNodeSelected(nodeId) {
    // 查找节点
    const nodes = this._getVisibleNodes();
    const node = nodes.find(n => n.id === nodeId);
    
    if (node) {
      this.selectedNodes.clear();
      this.selectedNodes.add(node.id);
      this.selectedRelationship = null;
      this.render();
    }
  }
  
  /**
   * 处理关系选择
   * @private
   */
  _onRelationshipSelected(relationshipId) {
    const relationships = this._getVisibleRelationships();
    const relationship = relationships.find(r => r.id === relationshipId);
    
    if (relationship) {
      this.selectedRelationship = relationship.id;
      this.selectedNodes.clear();
      this.render();
    }
  }
  
  /**
   * 移除所有事件监听器
   */
  _removeEventListeners() {
    // 调用父类方法移除基本事件监听器
    super._removeEventListeners();
    
    // 获取当前的画布元素，优先使用渲染器的画布
    const canvasElement = this.renderer && this.renderer.getCanvas && typeof this.renderer.getCanvas === 'function' ? this.renderer.getCanvas() : this.canvas;
    if (!canvasElement) return;
    
    // 移除自定义的事件监听器
    if (this._eventListeners) {
      if (this._eventListeners.dblclick) {
        canvasElement.removeEventListener('dblclick', this._eventListeners.dblclick);
        this._eventListeners.dblclick = null;
      }
      if (this._eventListeners.contextmenu) {
        canvasElement.removeEventListener('contextmenu', this._eventListeners.contextmenu);
        this._eventListeners.contextmenu = null;
      }
      if (this._eventListeners.mousemove) {
        canvasElement.removeEventListener('mousemove', this._eventListeners.mousemove);
        this._eventListeners.mousemove = null;
      }
    }
    
    // 移除模拟相关的事件监听器
    if (this._simulation && this._eventListeners.afterTick) {
      this._simulation.stop();
      this._simulation = null;
    }
  }
  
  /**
   * 销毁实例，清理资源
   */
  destroy() {
    // 移除事件监听器
    this._removeEventListeners();
    
    // 停止力导向模拟
    if (this._simulation) {
      this._simulation.stop();
      this._simulation = null;
    }
    
    // 清空数据引用
    this.selectedNodes = null;
    this.selectedRelationships = null;
    this.deletingRelationships = null;
    this.draggedNodeId = null;
    this.dragOffset = null;
    
    // 调用父类的destroy方法，包括渲染器的销毁
    super.destroy();
  }
}

// 暴露到全局作用域（避免重复声明）
if (typeof window !== 'undefined' && !window.NetworkCanvasManager) {
  window.NetworkCanvasManager = NetworkCanvasManager;
}
