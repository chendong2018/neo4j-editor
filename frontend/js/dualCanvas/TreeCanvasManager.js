/**
 * 层级树画布管理器
 * 负责层级树视图的渲染和交互，适配新的渲染器
 */
class TreeCanvasManager extends CanvasManager {
  constructor(options = {}) {
    super(options);
    
    // 树布局相关配置
    this.options = {
      nodeRadius: 20,
      levelSpacing: 100,       // 垂直间距
      siblingSpacing: 60,      // 兄弟节点水平间距
      subtreePadding: 40,      // 子树间距
      ...this.options
    };
    
    // 拖动状态
    this.isDraggingNode = false;
    this.draggedNodeId = null;
    this.dragStartPos = null;
    this.dragOffset = null;
    
    // 缓存布局结果
    this._layoutCache = new Map();
  }
  
  /**
   * 初始化
   */
  init() {
    console.log('TreeCanvasManager initialized');
    super.init();
    console.log('TreeCanvasManager init');  
    // 设置初始缩放级别和中心点
    this.zoom = 0.7;
    // 获取画布尺寸，优先使用渲染器的画布
    const canvasElement = this.renderer && this.renderer.getCanvas && typeof this.renderer.getCanvas === 'function' ? this.renderer.getCanvas() : this.canvas;
    const canvasWidth = canvasElement && canvasElement.width ? canvasElement.width : 800;
    this.pan = { 
      x: canvasWidth / 2,
      y: 100 
    };
    
    // 初始化事件监听器数组（避免潜在的undefined问题）
    if (!this._eventListeners) {
      this._eventListeners = {};
    }
    console.log('TreeCanvasManager init eventListeners');
    // 获取当前的画布元素
    const canvas = canvasElement;
    if (!canvas) return;
    console.log('TreeCanvasManager init canvas');

    // 添加双击事件监听（用于下钻到关系网）
    this._eventListeners.dblclick = (e) => this._handleDoubleClick(e);
    canvas.addEventListener('dblclick', this._eventListeners.dblclick);
    
    // 监听数据变更事件，实时更新树视图
    if (this.eventBus && typeof this.eventBus.on === 'function') {
      this.eventBus.on('dataChanged', this._handleDataChanged.bind(this));
    }
    console.log('TreeCanvasManager init eventBus');
  }
  
  /**
   * 处理数据变更事件
   */
  _handleDataChanged() {
    // 清除布局缓存，强制重新计算布局
    this._clearLayoutCache();
    
    // 重新渲染树视图
    this.render();
  }
  
  /**
   * 清除布局缓存
   */
  _clearLayoutCache() {
    // 清除布局缓存
    this._layoutCache.clear();
  }
  
  /**
   * 处理双击事件
   */
  _handleDoubleClick(e, nodeId) {
    // 支持通过参数直接指定节点ID
    if (nodeId) {
      // 发送事件，通知关系网画布切换上下文
      this.eventBus.emit('networkContextChanged', nodeId);
      return;
    }
    
    // 传统方式通过鼠标位置查找节点
    if (e) {
      const mousePos = this._getMousePos(e);
      const node = this._getNodeAtPosition(mousePos);
      
      if (node) {
        // 发送事件，通知关系网画布切换上下文
        this.eventBus.emit('networkContextChanged', node.id);
      }
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
        // 验证不是循环引用
        const parentNode = this.graphService.getNode(endNodeId);
        const startNode = this.graphService.getNode(startNodeId);
        
        if (this._isDescendant(endNodeId, startNodeId)) {
          throw new Error('不能将父节点设为其子节点的子节点');
        }
        
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
   * 检查节点是否是另一个节点的后代
   */
  _isDescendant(descendantId, ancestorId) {
    const descendants = this._findAllDescendants(ancestorId);
    return descendants.includes(descendantId);
  }
  
  /**
   * 查找节点的所有后代
   */
  _findAllDescendants(nodeId) {
    const descendants = [];
    const children = this.graphService._findChildNodes(nodeId);
    
    for (const childId of children) {
      descendants.push(childId);
      descendants.push(...this._findAllDescendants(childId));
    }
    
    return descendants;
  }
  
  /**
   * 检查节点位置是否需要更新层级关系
   */
  _checkNodePositionForHierarchyUpdate(nodeId) {
    const draggedNode = this.graphService.getNode(nodeId);
    const draggedPos = this.nodePositions.get(nodeId);
    
    // 查找可能的新父节点
    let potentialParent = null;
    let minDistance = Infinity;
    
    // 遍历所有可见节点，找到最接近的节点作为潜在父节点
    const visibleNodes = this._getVisibleNodes();
    for (const node of visibleNodes) {
      // 跳过自己和后代节点
      if (node.id === nodeId || this._isDescendant(nodeId, node.id)) {
        continue;
      }
      
      const nodePos = this.nodePositions.get(node.id);
      if (!nodePos) continue;
      
      // 计算距离
      const distance = Math.sqrt(
        Math.pow(draggedPos.x - nodePos.x, 2) + 
        Math.pow(draggedPos.y - nodePos.y, 2)
      );
      
      // 如果距离小于阈值，考虑作为新父节点
      const threshold = 80; // 可配置的阈值
      if (distance < threshold && distance < minDistance) {
        minDistance = distance;
        potentialParent = node;
      }
    }
    
    // 如果找到潜在父节点，且不是当前父节点，更新关系
    if (potentialParent && potentialParent.id !== draggedNode.parentId) {
      try {
        // 移动节点到新的父节点
        this.graphService.moveNode(nodeId, potentialParent.id);
        
        // 发送事件通知数据变更
        this.eventBus.emit('dataChanged');
        
        // 更新布局缓存
        this._clearLayoutCache();
      } catch (error) {
        console.error('更新层级关系失败:', error);
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
    super._handleMouseDown(e);
    
    // 获取当前的画布元素
    const canvas = this.canvas || (this.renderer ? this.renderer.getCanvas() : null);
    
    const mousePos = this._getMousePos(e);
    
    // 如果不是平移模式，则检查节点拖动
    if (!this.isPanning) {
      const node = this._getNodeAtPosition(mousePos);
      if (node) {
        // 开始拖动节点
        this.isDraggingNode = true;
        this.draggedNodeId = node.id;
        this.dragStartPos = mousePos;
        this.dragOffset = { 
          x: this.nodePositions.get(node.id).x - mousePos.x, 
          y: this.nodePositions.get(node.id).y - mousePos.y 
        };
      }
    }
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
      
      if (canvas) canvas.style.cursor = 'grabbing';
      return;
    }
    
    // 调用父类方法处理其他情况
    super._handleMouseDown(e);
  }
  
  /**
   * 处理鼠标移动事件（增强父类方法）
   */
  _handleMouseMove(e) {
    // 避免重复处理，直接先检查拖动状态
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
    
    // 调用父类方法处理其他情况
    super._handleMouseMove(e);
  }
  
  /**
   * 处理鼠标抬起事件（增强父类方法）
   */
  _handleMouseUp(e) {
    super._handleMouseUp(e);
    
    // 获取当前的画布元素
    const canvas = this.canvas || (this.renderer ? this.renderer.getCanvas() : null);
    
    // 结束节点拖动
    if (this.isDraggingNode && this.draggedNodeId) {
      // 检查是否需要更新层级关系
      this._checkNodePositionForHierarchyUpdate(this.draggedNodeId);
      
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
      
      // 发出拖动完成事件
      this._emitEvent('nodeDragCompleted', {
        nodeId: this.draggedNodeId,
        targetNode: targetNode,
        position: mousePos
      });
      
      // 重置拖动状态
      this.isDraggingNode = false;
      this.draggedNodeId = null;
      this.dragStartPos = null;
      this.dragOffset = null;
      
      if (canvas) canvas.style.cursor = 'default';
      
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
    // 获取CHILD_OF类型的关系
    const relIds = this.graphService.getRelationshipsByType('CHILD_OF') || [];
    return relIds.map(relId => this.graphService.getRelationship(relId)).filter(Boolean);
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
      
      // 检查节点是否有子节点
      const childNodes = this.graphService._findChildNodes(nodeId);
      if (childNodes.length > 0) {
        // 通知关系网画布切换上下文
        this.eventBus.emit('networkContextChanged', nodeId);
      }
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
    
    // 监听双击事件以支持节点下钻
    this.eventBus.on('nodeDoubleClick', (data) => {
      if (data.canvasType === 'tree') {
        this._handleDoubleClick(null, data.nodeId);
      }
    });
  }
  
  /**
   * 发出事件
   * @private
   */
  _emitEvent(eventName, data) {
    if (this.eventBus && typeof this.eventBus.emit === 'function') {
      this.eventBus.emit(eventName, data);
    }
  }
  
  /**
   * 渲染内容
   */
  _renderContent() {
    // 自动布局
    this._autoLayout();
    
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
        isCreatingRelationship: (this.modeManager && typeof this.modeManager.isCreatingRelationship === 'function') ? this.modeManager.isCreatingRelationship() : false,
        relationshipCreationState: (this.modeManager && typeof this.modeManager.getRelationshipCreationState === 'function') ? this.modeManager.getRelationshipCreationState() : null
      };
      
      // 调用渲染器
      this.renderer.render(renderData);
      return;
    }
    
    // 回退到默认渲染
    const ctx = this.ctx;
    const nodeRadius = this.options.nodeRadius;
    
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
    // 清除布局缓存
    this._layoutCache.clear();
    
    // 获取层级树结构
    const hierarchy = this.graphService.getHierarchyTree();
    
    // 处理空树的情况
    if (!hierarchy || Object.keys(hierarchy).length === 0) {
      return; // 如果没有树数据，直接返回
    }
    
    // 布局根节点
    const rootIds = Object.keys(hierarchy);
    let x = 50; // 左边距
    const y = 50;
    
    for (const rootId of rootIds) {
      // 计算子树宽度
      const subtreeWidth = this._calculateSubtreeWidth(hierarchy[rootId], 0);
      
      // 布局子树
      this._layoutSubtree(hierarchy[rootId], x + subtreeWidth / 2, y);
      
      x += subtreeWidth + this.options.subtreePadding; // 使用配置的子树间距
    }
  }
  
  /**
   * 计算子树宽度
   */
  _calculateSubtreeWidth(node, level) {
    // 添加空值检查
    if (!node || !node.node) {
      return this.options.siblingSpacing;
    }
    
    // 检查缓存
    const cacheKey = `${node.node.id}_${level}`;
    if (this._layoutCache.has(cacheKey)) {
      return this._layoutCache.get(cacheKey);
    }
    
    if (!node.children || node.children.length === 0) {
      // 叶子节点的宽度
      const result = this.options.siblingSpacing;
      this._layoutCache.set(cacheKey, result);
      return result;
    }
    
    // 计算所有子节点的总宽度
    let totalWidth = 0;
    const childWidths = [];
    
    for (const child of node.children) {
      const childWidth = this._calculateSubtreeWidth(child, level + 1);
      childWidths.push(childWidth);
      totalWidth += childWidth;
    }
    
    // 添加子节点之间的间距
    totalWidth += (node.children.length - 1) * this.options.siblingSpacing * 0.5;
    
    // 确保至少有最小宽度
    const result = Math.max(totalWidth, this.options.siblingSpacing);
    this._layoutCache.set(cacheKey, result);
    return result;
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
    let currentX = x - this._calculateSubtreeWidth(node, 0) / 2;
    
    for (const child of node.children) {
      const childWidth = this._calculateSubtreeWidth(child, 1);
      // 居中放置子节点
      const childX = currentX + childWidth / 2;
      
      this._layoutSubtree(child, childX, nextY);
      
      // 更新下一个子节点的起始X坐标
      currentX += childWidth + this.options.siblingSpacing * 0.5;
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
      
      // 检查节点是否有子节点（用于显示下钻提示）
      const hasChildren = this.graphService._findChildNodes(node.id).length > 0;
      
      // 绘制节点
      ctx.beginPath();
      ctx.arc(pos.x, pos.y, nodeRadius, 0, Math.PI * 2);
      
      // 根据节点类型设置颜色
      if (isSelected) {
        ctx.fillStyle = '#4CAF50';
      } else if (node.type === 'folder') {
        ctx.fillStyle = '#FF9800';
      } else if (node.type === 'file') {
        ctx.fillStyle = '#2196F3';
      } else {
        ctx.fillStyle = '#2196F3';
      }
      
      ctx.fill();
      ctx.strokeStyle = isDragging ? '#FF9800' : '#1976D2';
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
    }
    
    // 取消事件总线的订阅，添加安全性检查
    if (this.eventBus && typeof this.eventBus.off === 'function' && this._handleDataChanged) {
      this.eventBus.off('dataChanged', this._handleDataChanged);
    }
  }
  
  /**
   * 销毁实例，清理资源
   */
  destroy() {
    // 移除事件监听器
    this._removeEventListeners();
    
    // 清空数据引用
    this.nodePositions = null;
    this.treeData = null;
    this.draggedNodeId = null;
    this.dragOffset = null;
    
    // 调用父类的destroy方法，包括渲染器的销毁
    super.destroy();
  }
}

// 暴露到全局作用域（避免重复声明）
if (!window.TreeCanvasManager) {
  window.TreeCanvasManager = TreeCanvasManager;
}
