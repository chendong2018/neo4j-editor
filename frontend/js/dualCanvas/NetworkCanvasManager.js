/**
 * 关系网画布管理器
 * 负责关系网视图的渲染和交互
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
   * 初始化
   */
  init() {
    super.init();
    
    // 添加双击事件监听（用于下钻）
    this._eventListeners.dblclick = (e) => this._handleDoubleClick(e);
    this.canvas.addEventListener('dblclick', this._eventListeners.dblclick);
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
    const centerX = this.canvas.width / 2;
    const centerY = this.canvas.height / 2;
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
      pos.x = Math.max(margin, Math.min(this.canvas.width - margin, pos.x));
      pos.y = Math.max(margin, Math.min(this.canvas.height - margin, pos.y));
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
        this.graphService.createRelationship({
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
    const mousePos = this._getMousePos(e);
    const clickedNode = this._getNodeAtPosition(mousePos);
    
    // 如果点击了节点且是左键，可能是开始拖动
    if (clickedNode && e.button === 0 && !this.isSpacePressed) {
      this.isDraggingNode = true;
      this.draggedNodeId = clickedNode.id;
      this.dragStartPos = mousePos;
      
      const nodePos = this.nodePositions.get(clickedNode.id) || { x: 0, y: 0 };
      this.dragOffset = {
        x: nodePos.x - mousePos.x,
        y: nodePos.y - mousePos.y
      };
      
      // 停止力导向模拟
      this.isSimulating = false;
      
      this.canvas.style.cursor = 'grabbing';
      return;
    }
    
    // 调用父类方法处理其他情况
    super._handleMouseDown(e);
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
    if (this.isDraggingNode && this.draggedNodeId) {
      // 重置拖动状态
      this.isDraggingNode = false;
      this.draggedNodeId = null;
      this.dragStartPos = null;
      this.dragOffset = null;
      this.canvas.style.cursor = 'default';
      
      return;
    }
    
    // 调用父类方法
    super._handleMouseUp(e);
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
    const tolerance = 5; // 点击容差
    
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
    return this.graphService._findChildNodes(this.contextParentId);
  }
  
  /**
   * 获取可见关系（当前上下文中子节点间的RELATES_TO关系）
   */
  _getVisibleRelationships() {
    if (!this.contextParentId) {
      return [];
    }
    
    const visibleNodeIds = new Set(this._getVisibleNodes().map(node => node.id));
    const relIds = this.graphService.getRelationshipsByType('RELATES_TO') || [];
    
    // 筛选出两端节点都在可见节点中的关系
    return relIds
      .map(id => this.graphService.getRelationship(id))
      .filter(rel => 
        rel && 
        visibleNodeIds.has(rel.startNodeId) && 
        visibleNodeIds.has(rel.endNodeId)
      );
  }
  
  /**
   * 渲染内容
   */
  _renderContent() {
    const ctx = this.ctx;
    const nodeRadius = this.options.nodeRadius;
    
    // 渲染空状态消息
    if (this.displayContextEmptyMessage) {
      this._renderEmptyContextMessage(ctx);
      return;
    }
    
    // 检查是否有可见节点
    const visibleNodes = this._getVisibleNodes();
    if (!this.contextParentId || visibleNodes.length === 0) {
      this._renderNoNodesMessage(ctx);
      return;
    }
    
    // 渲染关系
    this._renderRelationships(ctx, nodeRadius);
    
    // 渲染节点
    this._renderNodes(ctx, nodeRadius);
    
    // 渲染关系创建预览
    this._renderRelationshipCreationPreview(ctx, nodeRadius);
    
    // 渲染上下文信息
    this._renderContextInfo(ctx);
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
      const parentName = parentNode?.properties?.name || '当前节点';
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
    
    const parentName = parentNode.properties?.name || '父节点';
    
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
      
      // 检查节点是否有子节点（用于显示下钻提示）
      const hasChildren = this.graphService._findChildNodes(node.id).length > 0;
      
      // 绘制节点
      ctx.beginPath();
      ctx.arc(pos.x, pos.y, nodeRadius, 0, Math.PI * 2);
      ctx.fillStyle = isSelected ? '#4CAF50' : '#9C27B0';
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
    
    // 获取鼠标位置
    const rect = this.canvas.getBoundingClientRect();
    const mouseX = (window.innerWidth / 2 - rect.left - this.pan.x) / this.zoom;
    const mouseY = (window.innerHeight / 2 - rect.top - this.pan.y) / this.zoom;
    
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
}

// 暴露到全局作用域（避免重复声明）
if (!window.NetworkCanvasManager) {
  window.NetworkCanvasManager = NetworkCanvasManager;
}
