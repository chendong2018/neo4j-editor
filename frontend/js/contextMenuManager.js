/**
 * 右键菜单管理器
 * 负责处理画布的右键菜单交互
 */
class ContextMenuManager {
  constructor(options = {}) {
    this.eventBus = options.eventBus;
    this.graphService = options.graphService;
    this.modeManager = options.modeManager;
    this.currentContext = null; // 保存当前菜单上下文
    
    // 验证必要的依赖
    if (!this.eventBus) throw new Error('ContextMenuManager requires an eventBus');
    if (!this.graphService) throw new Error('ContextMenuManager requires a graphService');
    if (!this.modeManager) throw new Error('ContextMenuManager requires a modeManager');
    
    // 初始化菜单容器
    this.menuElement = null;
    
    // 初始化事件监听
    this._initEventListeners();
  }
  
  /**
   * 初始化事件监听
   */
  _initEventListeners() {
    // 监听右键菜单显示事件
    this.eventBus.on('showNodeMenu', this._showNodeMenu.bind(this));
    this.eventBus.on('showRelationshipMenu', this._showRelationshipMenu.bind(this));
    this.eventBus.on('showCanvasMenu', this._showCanvasMenu.bind(this));
    
    // 监听文档点击，关闭菜单
    document.addEventListener('click', this._handleDocumentClick.bind(this));
  }
  
  /**
   * 显示节点右键菜单
   */
  _showNodeMenu(data) {
    const { event, node, position } = data;
    
    // 阻止默认右键菜单
    event && event.preventDefault && event.preventDefault();
    
    // 保存当前上下文
    this.currentContext = {
      type: 'node',
      data: node
    };
    
    // 创建菜单项
    const menuItems = [
      {
        label: '删除节点',
        action: () => this._deleteNode(node.id)
      },
      {
        label: '移动到...',
        action: () => this._moveNode(node.id)
      },
      {
        label: '在关系网中查看',
        action: () => this._viewInNetwork(node.id)
      }
    ];
    
    // 显示菜单
    this._showMenu(event, menuItems, position);
  }
  
  /**
   * 显示关系右键菜单
   */
  _showRelationshipMenu(data) {
    const { event, relationship, position } = data;
    
    // 阻止默认右键菜单
    event && event.preventDefault && event.preventDefault();
    
    // 保存当前上下文
    this.currentContext = {
      type: 'relationship',
      data: relationship
    };
    
    // 创建菜单项
    const menuItems = [
      {
        label: '删除关系',
        action: () => this._deleteRelationship(relationship.id)
      }
    ];
    
    // 显示菜单
    this._showMenu(event, menuItems, position);
  }
  
  /**
   * 显示画布右键菜单
   */
  _showCanvasMenu(data) {
    const { event, position, canvasType } = data;
    
    // 阻止默认右键菜单
    event && event.preventDefault && event.preventDefault();
    
    // 保存当前上下文
    this.currentContext = {
      type: 'canvas',
      canvasType: canvasType
    };
    
    // 创建菜单项
    const menuItems = [
      {
        label: '创建节点',
        action: () => this._createNode(canvasType)
      }
    ];
    
    // 显示菜单
    this._showMenu(event, menuItems, position);
  }
  
  /**
   * 显示菜单
   */
  _showMenu(event, menuItems, position) {
    // 移除旧菜单
    this._removeMenu();
    
    // 创建新菜单元素
    this.menuElement = document.createElement('div');
    this.menuElement.className = 'context-menu';
    
    // 设置菜单样式
    this.menuElement.style.position = 'absolute';
    this.menuElement.style.background = 'white';
    this.menuElement.style.border = '1px solid #ccc';
    this.menuElement.style.borderRadius = '4px';
    this.menuElement.style.boxShadow = '0 2px 10px rgba(0,0,0,0.2)';
    this.menuElement.style.padding = '4px 0';
    this.menuElement.style.zIndex = '1000';
    this.menuElement.style.fontFamily = 'Arial, sans-serif';
    this.menuElement.style.fontSize = '14px';
    
    // 设置菜单位置
    if (position) {
      this.menuElement.style.left = position.x + 'px';
      this.menuElement.style.top = position.y + 'px';
    } else if (event) {
      this.menuElement.style.left = event.clientX + 'px';
      this.menuElement.style.top = event.clientY + 'px';
    }
    
    // 确保菜单位于视口内
    setTimeout(() => {
      const rect = this.menuElement.getBoundingClientRect();
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;
      
      if (rect.right > viewportWidth) {
        const left = parseInt(this.menuElement.style.left);
        this.menuElement.style.left = (left - (rect.right - viewportWidth)) + 'px';
      }
      
      if (rect.bottom > viewportHeight) {
        const top = parseInt(this.menuElement.style.top);
        this.menuElement.style.top = (top - (rect.bottom - viewportHeight)) + 'px';
      }
    }, 0);
    
    // 添加菜单项
    for (const item of menuItems) {
      const menuItem = document.createElement('div');
      menuItem.className = 'context-menu-item';
      menuItem.textContent = item.label;
      
      // 设置菜单项样式
      menuItem.style.padding = '8px 16px';
      menuItem.style.cursor = 'pointer';
      menuItem.style.whiteSpace = 'nowrap';
      
      // 添加点击事件
      menuItem.addEventListener('click', () => {
        item.action();
        this._removeMenu();
      });
      
      // 添加悬停效果
      menuItem.addEventListener('mouseenter', () => {
        menuItem.style.background = '#f0f0f0';
      });
      
      menuItem.addEventListener('mouseleave', () => {
        menuItem.style.background = 'white';
      });
      
      this.menuElement.appendChild(menuItem);
    }
    
    // 添加到文档
    document.body.appendChild(this.menuElement);
  }
  
  /**
   * 删除节点
   */
  _deleteNode(nodeId) {
    if (confirm('确定要删除此节点及其所有子节点吗？此操作不可撤销。')) {
      try {
        this.graphService.deleteNode(nodeId);
        this.eventBus.emit('dataChanged');
      } catch (error) {
        alert(`删除节点失败: ${error.message}`);
      }
    }
  }
  
  /**
   * 移动节点
   */
  _moveNode(nodeId) {
    // 使用HTML中定义的全局函数打开节点移动对话框
    if (window.openMoveNodeModal) {
      window.openMoveNodeModal(nodeId);
    }
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
   * 在关系网中查看节点
   */
  _viewInNetwork(nodeId) {
    // 使用HTML中定义的全局函数打开关系网查看对话框
    if (window.openNetworkViewModal) {
      window.openNetworkViewModal(nodeId);
    }
    
    // 同时切换关系网上下文到该节点
    this.eventBus.emit('networkContextChanged', nodeId);
  }
  
  /**
   * 删除关系
   */
  _deleteRelationship(relationshipId) {
    if (confirm('确定要删除此关系吗？')) {
      try {
        this.graphService.deleteRelationship(relationshipId);
        this.eventBus.emit('dataChanged');
      } catch (error) {
        alert(`删除关系失败: ${error.message}`);
      }
    }
  }
  
  /**
   * 创建节点
   */
  _createNode(canvasType) {
    // 切换到节点创建模式
    this.modeManager.setMode('node');
    
    // 根据画布类型给出不同提示
    if (canvasType === 'tree') {
      alert('已切换到节点创建模式，请先选择一个父节点，然后在树画布上点击创建新的子节点');
    } else if (canvasType === 'network') {
      alert('已切换到节点创建模式，请在关系网画布上点击创建新节点');
    } else {
      alert('已切换到节点创建模式，请在画布上点击创建节点');
    }
  }
  
  /**
   * 处理文档点击，关闭菜单
   */
  _handleDocumentClick(event) {
    if (this.menuElement && !this.menuElement.contains(event.target)) {
      this._removeMenu();
    }
  }
  
  /**
   * 移除菜单
   */
  _removeMenu() {
    if (this.menuElement && this.menuElement.parentNode === document.body) {
      document.body.removeChild(this.menuElement);
    }
    this.menuElement = null;
    this.currentContext = null;
  }
  
  /**
   * 销毁
   */
  destroy() {
    this._removeMenu();
    document.removeEventListener('click', this._handleDocumentClick.bind(this));
    this.eventBus.off('showNodeMenu', this._showNodeMenu);
    this.eventBus.off('showRelationshipMenu', this._showRelationshipMenu);
    this.eventBus.off('showCanvasMenu', this._showCanvasMenu);
  }
}

// 导出ContextMenuManager
window.ContextMenuManager = ContextMenuManager;
