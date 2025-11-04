// 事件管理器 - 双画布交互事件绑定

/**
 * 事件管理器
 * 负责绑定所有用户交互事件并触发相应行为
 */
class EventManager {
  constructor(treeCanvas, networkCanvas, graphService) {
    this.treeCanvas = treeCanvas;
    this.networkCanvas = networkCanvas;
    this.graphService = graphService;
    
    // 当前操作模式
    this.currentMode = 'select'; // 默认选择模式
    this.relationshipType = null; // 关系子类型：CHILD_OF 或 RELATES_TO
    
    // 临时交互状态
    this.interactionState = {
      relationshipSource: null, // 关系创建的源节点
      selectedNodes: new Set(), // 选中的节点集合
      isPanning: false, // 是否正在平移
      panStart: null, // 平移起始位置
    };
    
    // 初始化事件绑定
    this.initializeEvents();
  }
  
  /**
   * 初始化所有事件绑定
   */
  initializeEvents() {
    console.log('[Interaction] Initializing event bindings...');
    
    // 绑定通用画布操作
    this.bindCanvasCommonEvents();
    
    // 绑定节点/关系点击事件
    this.bindClickEvents();
    
    // 绑定节点拖拽事件
    this.bindDragEvents();
    
    // 绑定右键菜单事件
    this.bindContextMenuEvents();
    
    // 绑定画布外交互事件（通过外部API暴露）
  }
  
  /**
   * 切换操作模式
   * @param {string} mode - 新模式：select, node, relationship
   * @param {string} subType - 关系子类型（仅当mode为relationship时需要）
   */
  switchMode(mode, subType = null) {
    if (!['select', 'node', 'relationship'].includes(mode)) {
      console.error('[Interaction] Invalid mode:', mode);
      return;
    }
    
    this.currentMode = mode;
    
    if (mode === 'relationship' && !subType) {
      console.warn('[Interaction] Relationship mode requires subType');
      return;
    }
    
    if (mode === 'relationship') {
      this.relationshipType = subType;
    }
    
    console.log(`[Interaction] Mode changed to: ${mode}${mode === 'relationship' ? ` (${subType})` : ''}`);
    
    // 清理临时交互状态
    this.clearInteractionState();
  }
  
  /**
   * 清理临时交互状态
   */
  clearInteractionState() {
    this.interactionState.relationshipSource = null;
    // 清除临时高亮（具体实现由渲染层完成）
    console.log('[Interaction] Temporary interaction state cleared');
  }
  
  /**
   * 绑定通用画布操作事件
   */
  bindCanvasCommonEvents() {
    // 为两个画布绑定平移和缩放事件
    [this.treeCanvas, this.networkCanvas].forEach((canvas, index) => {
      const canvasType = index === 0 ? 'Tree Canvas' : 'Network Canvas';
      
      // 平移事件 - 空格 + 左键拖拽 或 中键拖拽
      canvas.addEventListener('mousedown', (e) => {
        if (e.ctrlKey || e.metaKey || e.button === 1) { // 中键或Ctrl+左键
          this.startPan(e, canvasType);
        }
      });
      
      document.addEventListener('mousemove', (e) => {
        if (this.interactionState.isPanning) {
          this.pan(e, canvasType);
        }
      });
      
      document.addEventListener('mouseup', () => {
        if (this.interactionState.isPanning) {
          this.stopPan(canvasType);
        }
      });
      
      // 缩放事件 - 鼠标滚轮
      canvas.addEventListener('wheel', (e) => {
        e.preventDefault();
        this.zoom(e, canvasType);
      });
    });
  }
  
  /**
   * 绑定节点/关系点击事件
   */
  bindClickEvents() {
    // Tree Canvas 点击事件
    this.treeCanvas.addEventListener('click', (e) => {
      this.handleCanvasClick(e, 'Tree Canvas');
    });
    
    // Network Canvas 点击事件
    this.networkCanvas.addEventListener('click', (e) => {
      this.handleCanvasClick(e, 'Network Canvas');
    });
    
    // Network Canvas 双击事件
    this.networkCanvas.addEventListener('dblclick', (e) => {
      this.handleCanvasDoubleClick(e, 'Network Canvas');
    });
  }
  
  /**
   * 处理画布点击事件
   */
  handleCanvasClick(e, canvasType) {
    const clickedNode = this.getNodeFromEvent(e, canvasType);
    const clickedRelationship = this.getRelationshipFromEvent(e, canvasType);
    
    switch (this.currentMode) {
      case 'select':
        this.handleSelectModeClick(e, clickedNode, clickedRelationship, canvasType);
        break;
      case 'node':
        this.handleNodeModeClick(e, canvasType);
        break;
      case 'relationship':
        this.handleRelationshipModeClick(clickedNode, canvasType);
        break;
    }
  }
  
  /**
   * 处理选择模式下的点击
   */
  handleSelectModeClick(e, node, relationship, canvasType) {
    if (node) {
      // 选中节点
      if (e.ctrlKey || e.metaKey) {
        // 多选模式
        this.toggleNodeSelection(node.id);
      } else {
        // 单选模式
        this.setNodeSelection(node.id);
      }
      
      // Tree Canvas 特殊行为：点击非叶子节点切换 Network Canvas 上下文
      if (canvasType === 'Tree Canvas' && !node.isLeaf) {
        console.log(`[Action] Switching Network Canvas context to node: ${node.id}`);
        this.graphService.setNetworkContext(node.id);
      }
    } else if (relationship) {
      // 选中关系
      console.log(`[Action] Selected relationship: ${relationship.id}`);
      this.graphService.selectRelationship(relationship.id);
    } else {
      // 点击空白处，取消选择
      this.clearNodeSelection();
    }
  }
  
  /**
   * 处理节点模式下的点击
   */
  handleNodeModeClick(e, canvasType) {
    const clickedNode = this.getNodeFromEvent(e, canvasType);
    
    if (!clickedNode) {
      // 点击空白区域
      const selectedNodes = Array.from(this.interactionState.selectedNodes);
      
      if (canvasType === 'Tree Canvas') {
        if (selectedNodes.length > 0) {
          // 已有选中父节点，创建子节点
          const parentId = selectedNodes[0];
          console.log(`[Action] Creating child node under parent: ${parentId}`);
          this.graphService.addNode({ parentId });
        } else {
          // 提示“请先选择父节点”
          this.showUserMessage('请先选择父节点', 'warning');
        }
      } else if (canvasType === 'Network Canvas') {
        const currentContext = this.graphService.getCurrentNetworkContext();
        if (currentContext) {
          // 有上下文父，创建子节点
          console.log(`[Action] Creating node in Network Canvas context: ${currentContext}`);
          this.graphService.addNode({ contextId: currentContext });
        } else {
          // 禁止创建
          this.showUserMessage('无法在无根上下文中创建节点', 'error');
        }
      }
    }
  }
  
  /**
   * 处理关系模式下的点击
   */
  handleRelationshipModeClick(node, canvasType) {
    if (!node) return;
    
    if (!this.interactionState.relationshipSource) {
      // 第一步点击，设置源节点
      this.interactionState.relationshipSource = node;
      // 高亮源节点（具体实现由渲染层完成）
      console.log(`[Interaction] Relationship creation started. Source: ${node.id}`);
    } else if (this.interactionState.relationshipSource.id === node.id) {
      // 点击相同节点，取消创建
      this.interactionState.relationshipSource = null;
      console.log('[Interaction] Relationship creation canceled');
    } else {
      // 第二步点击，完成关系创建
      const source = this.interactionState.relationshipSource;
      const target = node;
      
      try {
        console.log(`[Action] Creating relationship: ${source.id} -${this.relationshipType}-> ${target.id}`);
        
        if (this.relationshipType === 'CHILD_OF') {
          this.graphService.moveNode(source.id, target.id);
        } else if (this.relationshipType === 'RELATES_TO') {
          // 检查是否同父
          const sourceParent = this.graphService.getNodeParent(source.id);
          const targetParent = this.graphService.getNodeParent(target.id);
          
          if (sourceParent && targetParent && sourceParent === targetParent) {
            this.graphService.addRelationship(source.id, target.id, this.relationshipType);
          } else {
            this.showUserMessage('无法创建跨父关系', 'error');
          }
        }
      } catch (error) {
        console.error('[Error] Relationship creation failed:', error);
        this.showUserMessage('关系创建失败', 'error');
      } finally {
        // 清理状态
        this.interactionState.relationshipSource = null;
      }
    }
  }
  
  /**
   * 处理画布双击事件
   */
  handleCanvasDoubleClick(e, canvasType) {
    const clickedNode = this.getNodeFromEvent(e, canvasType);
    
    if (clickedNode && canvasType === 'Network Canvas') {
      // 检查是否有子节点
      if (this.graphService.hasChildNodes(clickedNode.id)) {
        console.log(`[Action] Drilling down to node: ${clickedNode.id}`);
        this.graphService.setNetworkContext(clickedNode.id);
      }
    }
  }
  
  /**
   * 绑定节点拖拽事件
   */
  bindDragEvents() {
    // Tree Canvas 拖拽 - 可能触发结构移动
    this.bindTreeCanvasDragEvents();
    
    // Network Canvas 拖拽 - 仅视觉拖拽
    this.bindNetworkCanvasDragEvents();
  }
  
  /**
   * 绑定 Tree Canvas 拖拽事件
   */
  bindTreeCanvasDragEvents() {
    let draggedNode = null;
    let dragStartPos = null;
    
    this.treeCanvas.addEventListener('mousedown', (e) => {
      const node = this.getNodeFromEvent(e, 'Tree Canvas');
      if (node) {
        draggedNode = node;
        dragStartPos = { x: e.clientX, y: e.clientY };
      }
    });
    
    document.addEventListener('mousemove', (e) => {
      if (draggedNode && dragStartPos) {
        // 计算拖拽距离，判断是否开始拖拽
        const dx = Math.abs(e.clientX - dragStartPos.x);
        const dy = Math.abs(e.clientY - dragStartPos.y);
        
        if (dx > 5 || dy > 5) { // 拖拽阈值
          // 开始拖拽，更新视觉位置
          this.updateNodeVisualPosition(draggedNode.id, e, 'Tree Canvas');
        }
      }
    });
    
    document.addEventListener('mouseup', (e) => {
      if (draggedNode) {
        // 检查是否拖到了另一个节点上
        const dropTarget = this.getNodeFromEvent(e, 'Tree Canvas');
        
        if (dropTarget && dropTarget.id !== draggedNode.id) {
          // 触发结构移动
          console.log(`[Action] moveNode(${draggedNode.id}, ${dropTarget.id}) called`);
          
          try {
            this.graphService.moveNode(draggedNode.id, dropTarget.id);
          } catch (error) {
            console.error('[Error] Node move failed:', error);
            this.showUserMessage('节点移动失败', 'error');
          }
        }
        
        // 重置状态
        draggedNode = null;
        dragStartPos = null;
      }
    });
  }
  
  /**
   * 绑定 Network Canvas 拖拽事件（仅视觉拖拽）
   */
  bindNetworkCanvasDragEvents() {
    let draggedNode = null;
    
    this.networkCanvas.addEventListener('mousedown', (e) => {
      const node = this.getNodeFromEvent(e, 'Network Canvas');
      if (node) {
        draggedNode = node;
      }
    });
    
    document.addEventListener('mousemove', (e) => {
      if (draggedNode) {
        // 仅更新视觉位置，不变更数据
        this.updateNodeVisualPosition(draggedNode.id, e, 'Network Canvas');
      }
    });
    
    document.addEventListener('mouseup', () => {
      draggedNode = null;
    });
  }
  
  /**
   * 绑定右键菜单事件
   */
  bindContextMenuEvents() {
    // 为两个画布绑定右键菜单
    [this.treeCanvas, this.networkCanvas].forEach((canvas, index) => {
      const canvasType = index === 0 ? 'Tree Canvas' : 'Network Canvas';
      
      canvas.addEventListener('contextmenu', (e) => {
        e.preventDefault(); // 阻止浏览器默认菜单
        
        const clickedNode = this.getNodeFromEvent(e, canvasType);
        
        if (clickedNode) {
          // 节点上右键
          this.showNodeContextMenu(e, clickedNode, canvasType);
        } else {
          // 画布空白处右键
          this.showCanvasContextMenu(e, canvasType);
        }
      });
    });
  }
  
  /**
   * 显示节点右键菜单
   */
  showNodeContextMenu(event, node, canvasType) {
    console.log(`[Interaction] Showing node context menu for: ${node.id}`);
    
    // 菜单选项：编辑属性、删除节点、移动到…、在关系网中查看
    const menuItems = [
      {
        label: '编辑属性',
        action: () => {
          console.log(`[Action] Editing properties for node: ${node.id}`);
          this.graphService.focusPropertiesPanel(node.id);
        }
      },
      {
        label: '删除节点',
        action: () => {
          if (confirm(`确定要删除节点 ${node.id} 及其所有子节点吗？`)) {
            console.log(`[Action] Deleting node: ${node.id}`);
            this.graphService.deleteNode(node.id);
          }
        }
      },
      {
        label: '移动到…',
        action: () => {
          console.log(`[Action] Opening move dialog for node: ${node.id}`);
          // 弹出节点选择器（具体实现由UI层完成）
        }
      },
      {
        label: '在关系网中查看',
        action: () => {
          const parent = this.graphService.getNodeParent(node.id);
          if (parent) {
            console.log(`[Action] Switching to parent context: ${parent}`);
            this.graphService.setNetworkContext(parent);
          }
        }
      }
    ];
    
    // 显示菜单（具体实现由UI层完成）
    this.showContextMenu(event, menuItems);
  }
  
  /**
   * 显示画布空白处右键菜单
   */
  showCanvasContextMenu(event, canvasType) {
    console.log(`[Interaction] Showing canvas context menu in ${canvasType}`);
    
    const menuItems = [
      {
        label: '创建节点',
        action: () => {
          // 行为同节点模式
          this.switchMode('node');
          // 模拟节点模式下的点击
          this.handleNodeModeClick(event, canvasType);
        }
      }
    ];
    
    // 显示菜单（具体实现由UI层完成）
    this.showContextMenu(event, menuItems);
  }
  
  // 辅助方法
  
  /**
   * 从事件中获取点击的节点
   */
  getNodeFromEvent(event, canvasType) {
    // 实际实现中，这里需要调用渲染层提供的方法
    // 这里仅为示意
    console.log(`[Interaction] Getting node from event in ${canvasType}`);
    return null; // 占位返回
  }
  
  /**
   * 从事件中获取点击的关系
   */
  getRelationshipFromEvent(event, canvasType) {
    // 实际实现中，这里需要调用渲染层提供的方法
    // 这里仅为示意
    console.log(`[Interaction] Getting relationship from event in ${canvasType}`);
    return null; // 占位返回
  }
  
  /**
   * 设置节点选择
   */
  setNodeSelection(nodeId) {
    this.interactionState.selectedNodes.clear();
    this.interactionState.selectedNodes.add(nodeId);
    console.log(`[Interaction] Selected node: ${nodeId}`);
    
    // 更新属性面板
    this.graphService.selectNode(nodeId);
  }
  
  /**
   * 切换节点选择状态
   */
  toggleNodeSelection(nodeId) {
    if (this.interactionState.selectedNodes.has(nodeId)) {
      this.interactionState.selectedNodes.delete(nodeId);
    } else {
      this.interactionState.selectedNodes.add(nodeId);
    }
    console.log(`[Interaction] Toggled node selection: ${nodeId}`);
  }
  
  /**
   * 清除节点选择
   */
  clearNodeSelection() {
    this.interactionState.selectedNodes.clear();
    console.log('[Interaction] Cleared node selection');
    
    // 通知属性面板清除选择
    this.graphService.clearSelection();
  }
  
  /**
   * 开始平移
   */
  startPan(event, canvasType) {
    this.interactionState.isPanning = true;
    this.interactionState.panStart = { x: event.clientX, y: event.clientY };
    console.log(`[Interaction] Started panning in ${canvasType}`);
  }
  
  /**
   * 平移中
   */
  pan(event, canvasType) {
    if (!this.interactionState.isPanning || !this.interactionState.panStart) return;
    
    const dx = event.clientX - this.interactionState.panStart.x;
    const dy = event.clientY - this.interactionState.panStart.y;
    
    // 移动画布视口（具体实现由渲染层完成）
    console.log(`[Interaction] Panning in ${canvasType}: dx=${dx}, dy=${dy}`);
    
    // 更新起始位置
    this.interactionState.panStart = { x: event.clientX, y: event.clientY };
  }
  
  /**
   * 停止平移
   */
  stopPan(canvasType) {
    this.interactionState.isPanning = false;
    this.interactionState.panStart = null;
    console.log(`[Interaction] Stopped panning in ${canvasType}`);
  }
  
  /**
   * 缩放
   */
  zoom(event, canvasType) {
    const delta = event.deltaY > 0 ? -0.1 : 0.1; // 负值缩小，正值放大
    console.log(`[Interaction] Zooming in ${canvasType}: delta=${delta}`);
    
    // 缩放画布（具体实现由渲染层完成）
    // 注意限制范围在 20%–200%
  }
  
  /**
   * 更新节点视觉位置
   */
  updateNodeVisualPosition(nodeId, event, canvasType) {
    // 实际实现中，这里需要计算画布坐标并调用渲染层提供的方法
    console.log(`[Interaction] Updating visual position for node: ${nodeId} in ${canvasType}`);
  }
  
  /**
   * 显示右键菜单
   */
  showContextMenu(event, menuItems) {
    // 实际实现中，这里需要调用UI层提供的方法
    console.log(`[Interaction] Context menu with ${menuItems.length} items shown at position: ${event.clientX}, ${event.clientY}`);
  }
  
  /**
   * 显示用户提示
   */
  showUserMessage(message, type = 'info') {
    console.log(`[Message] [${type.toUpperCase()}] ${message}`);
    // 实际实现中，这里需要调用UI层提供的方法（如toast、modal、tooltip）
  }
  
  // 调试与测试接口
  
  /**
   * 模拟点击事件（用于单元测试）
   */
  simulateClick(nodeId, canvasType, mode = null) {
    if (mode) {
      this.switchMode(mode);
    }
    
    console.log(`[Test] Simulating click on node ${nodeId} in ${canvasType} (mode: ${this.currentMode})`);
    
    // 创建模拟事件
    const mockEvent = { clientX: 100, clientY: 100, ctrlKey: false, metaKey: false };
    
    // 模拟节点点击
    // 实际实现需要更多细节
  }
}

// 导出事件管理器
export default EventManager;
