/**
 * 画布管理器基类
 * 提供画布的基本功能：缩放、平移、节点选择等
 */
class CanvasManager {
  constructor(options = {}) {
    this.options = {
      containerSelector: null,
      graphService: null,
      eventBus: null,
      modeManager: null,
      zoomMin: 0.2,  // 20%
      zoomMax: 2.0,  // 200%
      ...options
    };
    
    // 验证必要的依赖项
    if (!this.options.containerSelector) throw new Error('容器选择器不能为空');
    if (!this.options.graphService) throw new Error('图数据服务不能为空');
    if (!this.options.eventBus) throw new Error('事件总线不能为空');
    if (!this.options.modeManager) throw new Error('模式管理器不能为空');
    
    // 引用外部组件
    this.graphService = this.options.graphService;
    this.eventBus = this.options.eventBus;
    this.modeManager = this.options.modeManager;
    
    // 内部状态
    this.container = null;
    this.canvas = null;
    this.ctx = null;
    this.zoom = 1.0;
    this.pan = { x: 0, y: 0 };
    this.selectedNodes = new Set();
    this.selectedRelationship = null;
    this.isPanning = false;
    this.lastMousePos = { x: 0, y: 0 };
    this.isSpacePressed = false;
    this.nodePositions = new Map(); // 存储节点位置
    
    // 事件监听器引用
    this._eventListeners = {};
  }
  
  /**
   * 初始化画布
   */
  init() {
    this.container = document.querySelector(this.options.containerSelector);
    if (!this.container) throw new Error(`找不到容器: ${this.options.containerSelector}`);
    
    // 创建画布元素
    this.canvas = document.createElement('canvas');
    this.canvas.className = 'graph-canvas';
    this.container.appendChild(this.canvas);
    
    this.ctx = this.canvas.getContext('2d');
    
    // 设置画布尺寸
    this._resizeCanvas();
    
    // 初始化事件监听
    this._initEventListeners();
    
    // 初始渲染
    this.render();
  }
  
  /**
   * 调整画布尺寸
   */
  _resizeCanvas() {
    const rect = this.container.getBoundingClientRect();
    this.canvas.width = rect.width;
    this.canvas.height = rect.height;
    
    // 当画布尺寸变化时重新渲染
    this.render();
  }
  
  /**
   * 初始化事件监听器
   */
  _initEventListeners() {
    // 窗口大小变化
    window.addEventListener('resize', () => this._resizeCanvas());
    
    // 鼠标滚轮缩放
    this._eventListeners.wheel = (e) => this._handleWheel(e);
    this.canvas.addEventListener('wheel', this._eventListeners.wheel);
    
    // 鼠标按下
    this._eventListeners.mousedown = (e) => this._handleMouseDown(e);
    this.canvas.addEventListener('mousedown', this._eventListeners.mousedown);
    
    // 鼠标移动
    this._eventListeners.mousemove = (e) => this._handleMouseMove(e);
    this.canvas.addEventListener('mousemove', this._eventListeners.mousemove);
    
    // 鼠标抬起
    this._eventListeners.mouseup = (e) => this._handleMouseUp(e);
    this.canvas.addEventListener('mouseup', this._eventListeners.mouseup);
    
    // 鼠标离开
    this._eventListeners.mouseleave = (e) => this._handleMouseUp(e);
    this.canvas.addEventListener('mouseleave', this._eventListeners.mouseleave);
    
    // 键盘事件
    document.addEventListener('keydown', (e) => this._handleKeyDown(e));
    document.addEventListener('keyup', (e) => this._handleKeyUp(e));
    
    // 模式变化事件
    this.eventBus.on('modeChanged', () => {
      // 清除选择状态
      this.clearSelection();
    });
  }
  
  /**
   * 处理鼠标滚轮事件（缩放）
   */
  _handleWheel(e) {
    e.preventDefault();
    
    const delta = e.deltaY > 0 ? -0.1 : 0.1;
    const newZoom = this.zoom + delta;
    
    // 限制缩放范围
    if (newZoom >= this.options.zoomMin && newZoom <= this.options.zoomMax) {
      this.zoom = newZoom;
      this.render();
    }
  }
  
  /**
   * 处理鼠标按下事件
   */
  _handleMouseDown(e) {
    e.preventDefault();
    
    const mousePos = this._getMousePos(e);
    this.lastMousePos = mousePos;
    
    // 检查是否是中键或空格键+左键进行平移
    if (e.button === 1 || (e.button === 0 && this.isSpacePressed)) {
      this.isPanning = true;
      this.canvas.style.cursor = 'grabbing';
      return;
    }
    
    // 获取当前模式
    const mode = this.modeManager.getCurrentMode();
    
    // 根据模式处理点击
    if (mode === 'select') {
      this._handleSelectModeClick(e, mousePos);
    } else if (mode === 'node') {
      this._handleNodeModeClick(e, mousePos);
    } else if (mode === 'relationship') {
      this._handleRelationshipModeClick(e, mousePos);
    }
  }
  
  /**
   * 处理选择模式下的点击
   */
  _handleSelectModeClick(e, mousePos) {
    // 检查是否点击了节点
    const clickedNode = this._getNodeAtPosition(mousePos);
    if (clickedNode) {
      this._handleNodeClick(clickedNode.id, e.ctrlKey);
      return;
    }
    
    // 检查是否点击了关系
    const clickedRelationship = this._getRelationshipAtPosition(mousePos);
    if (clickedRelationship) {
      this._handleRelationshipClick(clickedRelationship.id);
      return;
    }
    
    // 点击空白处，清除选择
    this.clearSelection();
  }
  
  /**
   * 处理节点模式下的点击
   */
  _handleNodeModeClick(e, mousePos) {
    // 子类实现具体逻辑
  }
  
  /**
   * 处理关系模式下的点击
   */
  _handleRelationshipModeClick(e, mousePos) {
    // 子类实现具体逻辑
  }
  
  /**
   * 处理节点点击
   */
  _handleNodeClick(nodeId, isMultiSelect) {
    if (isMultiSelect) {
      // 多选模式
      if (this.selectedNodes.has(nodeId)) {
        this.selectedNodes.delete(nodeId);
      } else {
        this.selectedNodes.add(nodeId);
      }
    } else {
      // 单选模式
      this.selectedNodes.clear();
      this.selectedNodes.add(nodeId);
    }
    
    // 清除关系选择
    this.selectedRelationship = null;
    
    // 发送节点选中事件
    this.eventBus.emit('nodeSelected', nodeId);
    
    // 子类可能需要特定的处理
    this._onNodeSelected(nodeId);
    
    this.render();
  }
  
  /**
   * 处理关系点击
   */
  _handleRelationshipClick(relId) {
    // 清除节点选择
    this.selectedNodes.clear();
    
    // 设置关系选择
    this.selectedRelationship = relId;
    
    // 发送关系选中事件
    this.eventBus.emit('relationshipSelected', relId);
    
    this.render();
  }
  
  /**
   * 获取鼠标在画布上的位置（考虑缩放和平移）
   */
  _getMousePos(e) {
    const rect = this.canvas.getBoundingClientRect();
    return {
      x: (e.clientX - rect.left - this.pan.x) / this.zoom,
      y: (e.clientY - rect.top - this.pan.y) / this.zoom
    };
  }
  
  /**
   * 根据位置获取节点
   */
  _getNodeAtPosition(pos) {
    // 子类实现
    return null;
  }
  
  /**
   * 根据位置获取关系
   */
  _getRelationshipAtPosition(pos) {
    // 子类实现
    return null;
  }
  
  /**
   * 处理鼠标移动事件
   */
  _handleMouseMove(e) {
    const mousePos = this._getMousePos(e);
    
    // 处理平移
    if (this.isPanning) {
      const dx = mousePos.x - this.lastMousePos.x;
      const dy = mousePos.y - this.lastMousePos.y;
      
      this.pan.x += dx * this.zoom;
      this.pan.y += dy * this.zoom;
      
      this.lastMousePos = mousePos;
      this.render();
      return;
    }
    
    // 更新鼠标样式
    const node = this._getNodeAtPosition(mousePos);
    const relationship = this._getRelationshipAtPosition(mousePos);
    
    if (node || relationship) {
      this.canvas.style.cursor = 'pointer';
    } else {
      this.canvas.style.cursor = 'default';
    }
  }
  
  /**
   * 处理鼠标抬起事件
   */
  _handleMouseUp(e) {
    if (this.isPanning) {
      this.isPanning = false;
      this.canvas.style.cursor = 'default';
    }
  }
  
  /**
   * 处理键盘按下事件
   */
  _handleKeyDown(e) {
    if (e.key === ' ' || e.key === 'Spacebar') {
      this.isSpacePressed = true;
      // 不设置鼠标样式，等mousedown时再设置
    }
  }
  
  /**
   * 处理键盘抬起事件
   */
  _handleKeyUp(e) {
    if (e.key === ' ' || e.key === 'Spacebar') {
      this.isSpacePressed = false;
    }
  }
  
  /**
   * 清除选择状态
   */
  clearSelection() {
    this.selectedNodes.clear();
    this.selectedRelationship = null;
    this.render();
  }
  
  /**
   * 节点选中后的回调（子类可以覆盖）
   */
  _onNodeSelected(nodeId) {
    // 默认实现为空
  }
  
  /**
   * 渲染画布
   */
  render() {
    // 清除画布
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    
    // 应用变换
    this.ctx.save();
    this.ctx.translate(this.pan.x, this.pan.y);
    this.ctx.scale(this.zoom, this.zoom);
    
    // 子类实现具体的渲染逻辑
    this._renderContent();
    
    this.ctx.restore();
  }
  
  /**
   * 渲染内容（子类实现）
   */
  _renderContent() {
    // 子类实现
  }
  
  /**
   * 刷新画布
   */
  refresh() {
    this.render();
  }
  
  /**
   * 销毁画布管理器
   */
  destroy() {
    // 移除事件监听器
    Object.values(this._eventListeners).forEach((listener, event) => {
      if (this.canvas) {
        this.canvas.removeEventListener(event, listener);
      }
    });
    
    // 移除画布元素
    if (this.canvas && this.container) {
      this.container.removeChild(this.canvas);
    }
  }
}

// 暴露到全局作用域（避免重复声明）
if (!window.CanvasManager) {
  window.CanvasManager = CanvasManager;
}
