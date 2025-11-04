/**
 * 层级树画布管理器
 * 负责层级树视图的渲染和交互
 */
class TreeCanvasManager extends CanvasManager {
  constructor(options = {}) {
    super(options);
    
    // 树布局相关配置
    this.options = {
      nodeRadius: 20,
      levelSpacing: 100,
      siblingSpacing: 60,
      ...this.options
    };
    
    // 拖动状态
    this.isDraggingNode = false;
    this.draggedNodeId = null;
    this.dragStartPos = null;
    this.dragOffset = null;
  }
  
  /**
   * 初始化
   */
  init() {
    super.init();
    
    // 添加双击事件监听（用于下钻到关系网）
    this._eventListeners.dblclick = (e) => this._handleDoubleClick(e);
    this.canvas.addEventListener('dblclick', this._eventListeners.dblclick);
  }
  
  /**
   * 处理双击事件
   */
  _handleDoubleClick(e) {
    const mousePos = this._getMousePos(e);
    const node = this._getNodeAtPosition(mousePos);
    
    if (node) {
      // 发送事件，通知关系网画布切换上下文
      this.eventBus.emit('networkContextChanged', node.id);
    }
  }
  
  /**
   * 处理节点模式下的点击
   */
  _handleNodeModeClick(e, mousePos) {
    // 检查是否有选中的父节点
    if (this.selectedNodes.size !== 1) {
      alert('请先选择一个父节点');
      return;
    }
    
    const parentId = Array.from(this.selectedNodes)[0];
    
    // 创建新节点
    this._createNodeAtPosition(mousePos, parentId);
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
    if (type === 'CHILD_OF') {
      // 对于CHILD_OF关系，使用moveNode方法
      try {
        this.graphService.moveNode(startNodeId, endNodeId);
        this.eventBus.emit('dataChanged');
        
        // 切换关系网上下文到新的父节点
        this.eventBus.emit('networkContextChanged', endNodeId);
      } catch (error) {
        throw new Error(`创建CHILD_OF关系失败: ${error.message}`);
      }
    }
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
      }, parentId, 'tree');
      
      // 保存节点位置
      this.nodePositions.set(newNode.id, { x: pos.x, y: pos.y });
      
      // 发送事件
      this.eventBus.emit('dataChanged');
      this.eventBus.emit('nodeCreated', newNode.id);
      
      // 选中新创建的节点
      this._handleNodeClick(newNode.id, false);
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
      const mousePos = this._getMousePos(e);
      
      // 检查是否拖拽到了另一个节点上（结构移动）
      const targetNode = this._getNodeAtPosition(mousePos, this.draggedNodeId);
      
      if (targetNode && targetNode.id !== this.draggedNodeId) {
        try {
          // 执行结构移动
          this.graphService.moveNode(this.draggedNodeId, targetNode.id, true);
          this.eventBus.emit('dataChanged');
          
          // 切换关系网上下文到新的父节点
          this.eventBus.emit('networkContextChanged', targetNode.id);
        } catch (error) {
          console.error('移动节点失败:', error);
          alert(`移动节点失败: ${error.message}`);
        }
      }
      
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
   * 获取可见节点（树中的所有节点）
   */
  _getVisibleNodes() {
    return this.graphService.getAllNodes();
  }
  
  /**
   * 获取可见关系（仅CHILD_OF关系）
   */
  _getVisibleRelationships() {
    const relIds = this.graphService.getRelationshipsByType('CHILD_OF') || [];
    return relIds.map(id => this.graphService.getRelationship(id)).filter(Boolean);
  }
  
  /**
   * 节点选中后的回调
   */
  _onNodeSelected(nodeId) {
    // 检查节点是否有子节点
    const childNodes = this.graphService._findChildNodes(nodeId);
    if (childNodes.length > 0) {
      // 通知关系网画布切换上下文
      this.eventBus.emit('networkContextChanged', nodeId);
    }
  }
  
  /**
   * 渲染内容
   */
  _renderContent() {
    const ctx = this.ctx;
    const nodeRadius = this.options.nodeRadius;
    
    // 自动布局
    this._autoLayout();
    
    // 渲染关系
    this._renderRelationships(ctx, nodeRadius);
    
    // 渲染节点
    this._renderNodes(ctx, nodeRadius);
    
    // 渲染关系创建预览
    this._renderRelationshipCreationPreview(ctx, nodeRadius);
  }
  
  /**
   * 自动布局
   */
  _autoLayout() {
    // 获取层级树结构
    const hierarchy = this.graphService.getHierarchyTree();
    
    // 布局根节点
    const rootIds = Object.keys(hierarchy);
    let x = 0;
    const y = 50;
    
    for (const rootId of rootIds) {
      // 计算子树宽度
      const subtreeWidth = this._calculateSubtreeWidth(hierarchy[rootId], 0);
      
      // 布局子树
      this._layoutSubtree(hierarchy[rootId], x + subtreeWidth / 2, y);
      
      x += subtreeWidth + 100; // 添加间距
    }
  }
  
  /**
   * 计算子树宽度
   */
  _calculateSubtreeWidth(node, level) {
    if (!node.children || node.children.length === 0) {
      return this.options.siblingSpacing;
    }
    
    let totalWidth = 0;
    for (const child of node.children) {
      totalWidth += this._calculateSubtreeWidth(child, level + 1);
    }
    
    return Math.max(totalWidth, this.options.siblingSpacing);
  }
  
  /**
   * 布局子树
   */
  _layoutSubtree(node, x, y) {
    // 保存节点位置
    this.nodePositions.set(node.node.id, { x, y });
    
    if (!node.children || node.children.length === 0) {
      return;
    }
    
    const nextY = y + this.options.levelSpacing;
    let childX = x - this._calculateSubtreeWidth(node, 0) / 2 + this.options.siblingSpacing / 2;
    
    for (const child of node.children) {
      const childWidth = this._calculateSubtreeWidth(child, 1);
      this._layoutSubtree(child, childX, nextY);
      childX += childWidth;
    }
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
      
      // 绘制节点
      ctx.beginPath();
      ctx.arc(pos.x, pos.y, nodeRadius, 0, Math.PI * 2);
      ctx.fillStyle = isSelected ? '#4CAF50' : '#2196F3';
      ctx.fill();
      ctx.strokeStyle = isDragging ? '#FF9800' : '#1976D2';
      ctx.lineWidth = isSelected ? 3 : 2;
      ctx.stroke();
      
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
if (!window.TreeCanvasManager) {
  window.TreeCanvasManager = TreeCanvasManager;
}
