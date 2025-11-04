/**
 * 右键上下文菜单管理器
 * 负责处理右键菜单的显示、选择和隐藏
 */
class ContextMenuManager {
  constructor(options = {}) {
    this.eventBus = options.eventBus || new EventBus();
    this.modeManager = options.modeManager;
    this.graphService = options.graphService;
    
    // 菜单项
    this.menuElement = null;
    this.currentTargetType = null; // 'node', 'canvas', 'relationship'
    this.currentTarget = null; // 当前操作的目标（节点、关系或画布）
    this.canvasManager = null; // 当前活动的画布管理器
    
    // 初始化菜单元素
    this._initMenuElement();
    
    // 注册全局事件监听
    this._registerGlobalEvents();
  }
  
  /**
   * 初始化菜单元素
   */
  _initMenuElement() {
    // 创建菜单容器
    this.menuElement = document.createElement('div');
    this.menuElement.id = 'context-menu';
    this.menuElement.style.position = 'fixed';
    this.menuElement.style.zIndex = '1000';
    this.menuElement.style.backgroundColor = 'white';
    this.menuElement.style.border = '1px solid #ccc';
    this.menuElement.style.borderRadius = '4px';
    this.menuElement.style.boxShadow = '0 2px 8px rgba(0, 0, 0, 0.2)';
    this.menuElement.style.display = 'none';
    this.menuElement.style.padding = '4px 0';
    
    // 添加样式
    const style = document.createElement('style');
    style.textContent = `
      #context-menu .menu-item {
        padding: 8px 16px;
        cursor: pointer;
        white-space: nowrap;
        min-width: 150px;
      }
      #context-menu .menu-item:hover {
        background-color: #f0f0f0;
      }
      #context-menu .menu-item:active {
        background-color: #e0e0e0;
      }
      #context-menu .menu-separator {
        height: 1px;
        background-color: #ddd;
        margin: 4px 0;
      }
    `;
    document.head.appendChild(style);
    
    // 添加到文档
    document.body.appendChild(this.menuElement);
  }
  
  /**
   * 注册全局事件监听
   */
  _registerGlobalEvents() {
    // 点击页面其他地方关闭菜单
    document.addEventListener('click', (e) => {
      if (this.menuElement && !this.menuElement.contains(e.target)) {
        this.hideMenu();
      }
    });
    
    // 按下ESC键关闭菜单
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        this.hideMenu();
      }
    });
  }
  
  /**
   * 显示节点右键菜单
   */
  showNodeMenu(event, node, canvasManager) {
    event.preventDefault();
    
    // 更新当前状态
    this.currentTargetType = 'node';
    this.currentTarget = node;
    this.canvasManager = canvasManager;
    
    // 清空并构建菜单项
    this._clearMenu();
    
    // 添加节点操作菜单项
    this._addMenuItem('删除节点', () => this._handleDeleteNode());
    this._addMenuItem('移动到…', () => this._handleMoveNode());
    
    // 检查是否有兄弟节点，如果有则添加"在关系网中查看"选项
    const hasSiblings = this._hasSiblings(node.id);
    if (hasSiblings) {
      this._addMenuItem('在关系网中查看', () => this._handleViewInNetwork());
    }
    
    // 显示菜单
    this._positionMenu(event);
  }
  
  /**
   * 显示关系右键菜单
   */
  showRelationshipMenu(event, relationship, canvasManager) {
    event.preventDefault();
    
    // 更新当前状态
    this.currentTargetType = 'relationship';
    this.currentTarget = relationship;
    this.canvasManager = canvasManager;
    
    // 清空并构建菜单项
    this._clearMenu();
    
    // 添加关系操作菜单项
    this._addMenuItem('删除关系', () => this._handleDeleteRelationship());
    
    // 显示菜单
    this._positionMenu(event);
  }
  
  /**
   * 显示画布右键菜单
   */
  showCanvasMenu(event, canvasManager) {
    event.preventDefault();
    
    // 更新当前状态
    this.currentTargetType = 'canvas';
    this.currentTarget = null;
    this.canvasManager = canvasManager;
    
    // 清空并构建菜单项
    this._clearMenu();
    
    // 添加创建节点选项
    this._addMenuItem('创建节点', () => this._handleCreateNode());
    
    // 显示菜单
    this._positionMenu(event);
  }
  
  /**
   * 处理删除节点
   */
  _handleDeleteNode() {
    if (!this.currentTarget) return;
    
    // 确认对话框
    const node = this.currentTarget;
    const nodeName = node.properties.name || `节点 ${node.id}`;
    const confirmDelete = confirm(`确定要删除节点 "${nodeName}" 及其所有子节点吗？`);
    
    if (confirmDelete) {
      try {
        // 调用服务删除节点（级联删除）
        this.graphService.deleteNodeWithRelationships(node.id);
        
        // 发送事件通知数据变更
        this.eventBus.emit('dataChanged');
      } catch (error) {
        console.error('删除节点失败:', error);
        alert(`删除节点失败: ${error.message}`);
      }
    }
    
    this.hideMenu();
  }
  
  /**
   * 处理移动节点
   */
  _handleMoveNode() {
    if (!this.currentTarget) return;
    
    // 在实际应用中，这里应该打开一个节点选择器对话框
    // 为了简化，这里使用prompt来模拟
    const nodeId = this.currentTarget.id;
    
    // 这里应该打开一个节点选择器，让用户选择新的父节点
    // 为了演示，我们假设用户输入了一个有效的节点ID
    const newParentId = prompt('请输入新父节点的ID:');
    
    if (newParentId && newParentId.trim()) {
      try {
        // 验证目标节点是否存在
        const newParentNode = this.graphService.getNode(newParentId.trim());
        if (!newParentNode) {
          throw new Error('目标节点不存在');
        }
        
        // 执行移动操作
        this.graphService.moveNode(nodeId, newParentId.trim());
        
        // 发送事件通知数据变更
        this.eventBus.emit('dataChanged');
        
        // 如果在关系网画布上，切换上下文到新的父节点
        if (this.canvasManager instanceof NetworkCanvasManager) {
          this.eventBus.emit('networkContextChanged', newParentId.trim());
        }
      } catch (error) {
        console.error('移动节点失败:', error);
        alert(`移动节点失败: ${error.message}`);
      }
    }
    
    this.hideMenu();
  }
  
  /**
   * 处理在关系网中查看
   */
  _handleViewInNetwork() {
    if (!this.currentTarget) return;
    
    // 获取节点的父节点
    const parentNode = this.graphService.getParentNode(this.currentTarget.id);
    
    if (parentNode) {
      // 发送事件，切换关系网上下文到父节点
      this.eventBus.emit('networkContextChanged', parentNode.id);
    }
    
    this.hideMenu();
  }
  
  /**
   * 处理删除关系
   */
  _handleDeleteRelationship() {
    if (!this.currentTarget) return;
    
    try {
      // 调用服务删除关系
      this.graphService.deleteRelationship(this.currentTarget.id);
      
      // 发送事件通知数据变更
      this.eventBus.emit('dataChanged');
    } catch (error) {
      console.error('删除关系失败:', error);
      alert(`删除关系失败: ${error.message}`);
    }
    
    this.hideMenu();
  }
  
  /**
   * 处理创建节点
   */
  _handleCreateNode() {
    if (!this.canvasManager) return;
    
    // 切换到节点模式
    this.modeManager.setMode('node');
    
    // 隐藏菜单
    this.hideMenu();
    
    // 在实际应用中，可以弹出一个节点创建表单
    // 这里简单地提示用户使用节点模式点击创建
    alert('已切换到节点模式，请点击画布创建新节点');
  }
  
  /**
   * 检查节点是否有兄弟节点
   */
  _hasSiblings(nodeId) {
    try {
      const parentNode = this.graphService.getParentNode(nodeId);
      
      if (!parentNode) {
        // 根节点的兄弟节点是其他根节点
        const allNodes = this.graphService.getAllNodes();
        const rootNodes = allNodes.filter(node => !this.graphService.getParentNode(node.id));
        return rootNodes.length > 1;
      }
      
      // 获取父节点的所有子节点
      const siblings = this.graphService._findChildNodes(parentNode.id);
      return siblings.length > 1;
    } catch (error) {
      console.error('检查兄弟节点失败:', error);
      return false;
    }
  }
  
  /**
   * 添加菜单项
   */
  _addMenuItem(text, onClick) {
    const menuItem = document.createElement('div');
    menuItem.className = 'menu-item';
    menuItem.textContent = text;
    
    menuItem.addEventListener('click', (e) => {
      e.stopPropagation(); // 防止触发文档的点击事件
      onClick();
    });
    
    this.menuElement.appendChild(menuItem);
  }
  
  /**
   * 添加分隔线
   */
  _addSeparator() {
    const separator = document.createElement('div');
    separator.className = 'menu-separator';
    this.menuElement.appendChild(separator);
  }
  
  /**
   * 清空菜单
   */
  _clearMenu() {
    while (this.menuElement.firstChild) {
      this.menuElement.removeChild(this.menuElement.firstChild);
    }
  }
  
  /**
   * 定位并显示菜单
   */
  _positionMenu(event) {
    // 计算菜单位置，确保不超出视口
    const x = event.clientX;
    const y = event.clientY;
    
    // 设置菜单位置
    this.menuElement.style.left = `${x}px`;
    this.menuElement.style.top = `${y}px`;
    
    // 显示菜单
    this.menuElement.style.display = 'block';
    
    // 检查菜单是否超出视口，如果是则调整位置
    this._adjustMenuPosition();
  }
  
  /**
   * 调整菜单位置，确保不超出视口
   */
  _adjustMenuPosition() {
    const menuRect = this.menuElement.getBoundingClientRect();
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    
    // 水平调整
    if (menuRect.right > viewportWidth) {
      const left = parseInt(this.menuElement.style.left) - (menuRect.right - viewportWidth);
      this.menuElement.style.left = `${left}px`;
    }
    
    // 垂直调整
    if (menuRect.bottom > viewportHeight) {
      const top = parseInt(this.menuElement.style.top) - (menuRect.bottom - viewportHeight);
      this.menuElement.style.top = `${top}px`;
    }
  }
  
  /**
   * 隐藏菜单
   */
  hideMenu() {
    if (this.menuElement) {
      this.menuElement.style.display = 'none';
      this.currentTargetType = null;
      this.currentTarget = null;
      this.canvasManager = null;
    }
  }
  
  /**
   * 销毁菜单管理器
   */
  destroy() {
    // 移除菜单元素
    if (this.menuElement && this.menuElement.parentNode) {
      this.menuElement.parentNode.removeChild(this.menuElement);
      this.menuElement = null;
    }
    
    // 清空引用
    this.currentTarget = null;
    this.canvasManager = null;
  }
}

// 简单的事件总线实现（如果未提供）
class EventBus {
  constructor() {
    this.listeners = {};
  }
  
  on(event, callback) {
    if (!this.listeners[event]) {
      this.listeners[event] = [];
    }
    this.listeners[event].push(callback);
    
    // 返回取消监听函数
    return () => this.off(event, callback);
  }
  
  emit(event, ...args) {
    if (!this.listeners[event]) {
      return;
    }
    
    for (const callback of this.listeners[event]) {
      callback(...args);
    }
  }
  
  off(event, callback) {
    if (!this.listeners[event]) {
      return;
    }
    
    this.listeners[event] = this.listeners[event].filter(cb => cb !== callback);
  }
}

// 暴露到全局作用域（避免重复声明）
if (!window.ContextMenuManager) {
  window.ContextMenuManager = ContextMenuManager;
}
