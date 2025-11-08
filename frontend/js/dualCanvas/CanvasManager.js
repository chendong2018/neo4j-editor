/**
 * 画布管理器基类
 * 提供画布的基本功能：缩放、平移、节点选择等，适配新的渲染器
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
      renderer: null, // 新的渲染器实例
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
    this.renderer = this.options.renderer;
    
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
    
    // 绑定事件监听器
    this._bindEvents();
    
    // 初始化事件订阅
    this._initEventSubscriptions();
  }
  
  /**
   * 绑定事件监听器
   * @private
   */
  _bindEvents() {
    // 这里保留用于向后兼容
    // 新的事件订阅逻辑移至_initEventSubscriptions
  }
  
  /**
   * 初始化事件订阅
   * 适配新的事件总线机制
   * @private
   */
  _initEventSubscriptions() {
    // 监听模式变化事件
    this.eventBus.on('modeChanged', (data) => {
      // 清除选择状态
      this.clearSelection();
    });
    
    // 监听上下文变化事件
    this.eventBus.on('contextChanged', (data) => {
      this.render();
    });
    
    // 监听选择清除事件
    this.eventBus.on('selectionCleared', () => {
      this.clearSelection();
    });
    
    // 监听缩放重置事件
    this.eventBus.on('zoomToFit', () => {
      this.zoom = 1.0;
      this.pan = { x: 0, y: 0 };
      this.render();
    });
    
    // 监听视图重置事件
    this.eventBus.on('resetView', () => {
      this.zoom = 1.0;
      this.pan = { x: 0, y: 0 };
      this.render();
    });
  }
  
  /**
   * 初始化画布
   */
  init() {
    this.container = document.querySelector(this.options.containerSelector);
    if (!this.container) throw new Error(`找不到容器: ${this.options.containerSelector}`);
    
    // 如果提供了自定义渲染器，使用它（优先使用基于d3的SVG渲染器）
    if (this.renderer) {
      // 新的渲染器可能不需要单独的initialize方法
      if (typeof this.renderer.initialize === 'function') {
        console.log('自定义渲染器初始化完成');
        this.renderer.initialize(this.container);
        console.log('自定义渲染器初始化完成');
      }
      console.log('自定义渲染器初始化完成');
    } else {
      // 回退到默认的Canvas实现
      this.canvas = document.createElement('canvas');
      this.canvas.className = 'graph-canvas';
      this.container.appendChild(this.canvas);
      
      this.ctx = this.canvas.getContext('2d');
      console.log('默认的Canvas实现初始化完成');
    }
    
    // 设置画布尺寸
    this._resizeCanvas();
    
    // 初始化事件监听
    this._initEventListeners();
    
    // 初始渲染
    this.render();
    
    // 发出画布初始化完成事件
    this.eventBus.emit('canvasInitialized', {
      canvas: this.renderer ? this.renderer.getCanvas() : this.canvas,
      container: this.container
    });
  }
  
  /**
   * 调整画布尺寸
   */
  _resizeCanvas() {
    const rect = this.container.getBoundingClientRect();
    
    // 优先使用自定义渲染器的resize方法
    if (this.renderer) {
      if (typeof this.renderer.resize === 'function') {
        this.renderer.resize();
      } else if (this.renderer.svg) {
        // 如果渲染器有svg属性但没有resize方法，直接调整SVG尺寸
        this.renderer.svg.setAttribute('width', rect.width);
        this.renderer.svg.setAttribute('height', rect.height);
      }
    } 
    // 回退到传统Canvas处理
    else if (this.canvas) {
      this.canvas.width = rect.width;
      this.canvas.height = rect.height;
    }
    
    // 当画布尺寸变化时重新渲染
    this.render();
  }
  
  /**
   * 初始化事件监听器
   */
  _initEventListeners() {
    // 窗口大小变化
    window.addEventListener('resize', () => this._resizeCanvas());
    
    // 获取画布元素（优先使用渲染器提供的元素，回退到canvas）
    const canvasElement = this.renderer ? this.renderer.getCanvas() : this.canvas;
    
    if (!canvasElement) {
      console.warn('无法获取画布元素，跳过事件监听初始化');
      return;
    }
    
    // 确保_eventListeners是对象
    if (!this._eventListeners) {
      this._eventListeners = {};
    }
    
    // 鼠标滚轮缩放
    this._eventListeners.wheel = (e) => this._handleWheel(e);
    canvasElement.addEventListener('wheel', this._eventListeners.wheel);
    
    // 鼠标按下
    this._eventListeners.mousedown = (e) => this._handleMouseDown(e);
    canvasElement.addEventListener('mousedown', this._eventListeners.mousedown);
    
    // 鼠标移动
    this._eventListeners.mousemove = (e) => this._handleMouseMove(e);
    canvasElement.addEventListener('mousemove', this._eventListeners.mousemove);
    
    // 鼠标抬起
    this._eventListeners.mouseup = (e) => this._handleMouseUp(e);
    canvasElement.addEventListener('mouseup', this._eventListeners.mouseup);
    
    // 鼠标离开
    this._eventListeners.mouseleave = (e) => this._handleMouseUp(e);
    canvasElement.addEventListener('mouseleave', this._eventListeners.mouseleave);
    
    // 键盘事件 - 这些是全局事件，不需要存储在_eventListeners中
    document.addEventListener('keydown', (e) => this._handleKeyDown(e));
    document.addEventListener('keyup', (e) => this._handleKeyUp(e));
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
      // 获取画布元素（可能是canvas或renderer的SVG容器）
      const canvasElement = this.renderer ? this.renderer.getCanvas() : this.canvas;
      if (canvasElement) {
        canvasElement.style.cursor = 'grabbing';
      }
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
        // 发出节点取消选中事件
        this.eventBus.emit('nodeDeselected', nodeId);
      } else {
        this.selectedNodes.add(nodeId);
        // 发送节点选中事件
        this.eventBus.emit('nodeSelected', { nodeId });
      }
    } else {
      // 单选模式
      this.selectedNodes.clear();
      this.selectedNodes.add(nodeId);
      // 发送节点选中事件
      this.eventBus.emit('nodeSelected', { nodeId });
    }
    
    // 清除关系选择
    this.selectedRelationship = null;
    
    // 子类可能需要特定的处理
    this._onNodeSelected(nodeId);
    
    // 发出选择变更事件
    this.eventBus.emit('selectionChanged', {
      selectedNodes: Array.from(this.selectedNodes),
      selectedRelationship: null
    });
    
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
    this.eventBus.emit('relationshipSelected', { relId });
    
    // 发出选择变更事件
    this.eventBus.emit('selectionChanged', {
      selectedNodes: [],
      selectedRelationship: relId
    });
    
    this.render();
  }
  
  /**
   * 获取鼠标在画布上的位置（考虑缩放和平移）
   */
  _getMousePos(e) {
    // 优先使用渲染器的getMousePos方法
    if (this.renderer && typeof this.renderer.getMousePos === 'function') {
      return this.renderer.getMousePos(e);
    }
    
    // 回退到默认实现
    const canvasElement = this.renderer ? this.renderer.getCanvas() : this.canvas;
    if (!canvasElement) return { x: 0, y: 0 };
    
    const rect = canvasElement.getBoundingClientRect();
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
    
    // 获取画布元素（可能是canvas或renderer的SVG容器）
    const canvasElement = this.renderer ? this.renderer.getCanvas() : this.canvas;
    if (canvasElement) {
      if (node || relationship) {
        canvasElement.style.cursor = 'pointer';
      } else {
        canvasElement.style.cursor = 'default';
      }
    }
  }
  
  /**
   * 处理鼠标抬起事件
   */
  _handleMouseUp(e) {
    if (this.isPanning) {
      this.isPanning = false;
      // 获取画布元素（可能是canvas或renderer的SVG容器）
      const canvasElement = this.renderer ? this.renderer.getCanvas() : this.canvas;
      if (canvasElement) {
        canvasElement.style.cursor = 'default';
      }
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
    
    // 发出选择清除事件
    this.eventBus.emit('selectionChanged', {
      selectedNodes: [],
      selectedRelationship: null
    });
    
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
    // 优先使用自定义渲染器（基于d3的SVG渲染器）
    if (this.renderer) {
      // 适配不同版本的渲染器接口
      const renderData = {
        nodes: this._getVisibleNodes(),
        relationships: this._getVisibleRelationships(),
        selectedNodes: this.selectedNodes,
        selectedRelationship: this.selectedRelationship,
        zoom: this.zoom,
        pan: this.pan
      };
      
      // 调用渲染器的render方法
      if (typeof this.renderer.render === 'function') {
        this.renderer.render(renderData);
      } else {
        console.warn('渲染器没有render方法');
      }
    } else if (this.ctx) {
      // 回退到默认的Canvas实现
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
    
    // 发出渲染完成事件
    this._emitEvent('canvasRendered', {
      canvas: this.renderer ? this.renderer.getCanvas() : this.canvas,
      zoom: this.zoom,
      pan: this.pan
    });
  }
  
  /**
   * 发出事件，支持DOM事件和事件总线
   * @private
   */
  _emitEvent(eventName, data) {
    // 获取画布元素（优先使用渲染器的元素）
    const canvasElement = this.renderer ? this.renderer.getCanvas() : this.canvas;
    
    // 通过事件总线发出事件
    if (this.eventBus && typeof this.eventBus.emit === 'function') {
      this.eventBus.emit(eventName, data);
    }
    
    // 如果有DOM元素，发出自定义DOM事件
    if (canvasElement) {
      const customEvent = new CustomEvent(eventName, {
        bubbles: true,
        cancelable: true,
        detail: data
      });
      canvasElement.dispatchEvent(customEvent);
    }
  }
  
  /**
   * 渲染节点（抽象方法 - 子类必须实现）
   */
  _renderNodes(ctx, nodeRadius) {
    throw new Error('Subclass must implement _renderNodes method');
  }

  /**
   * 渲染关系（抽象方法 - 子类必须实现）
   */
  _renderRelationships(ctx, nodeRadius) {
    throw new Error('Subclass must implement _renderRelationships method');
  }

  /**
   * 渲染内容
   */
  _renderContent() {
    const ctx = this.ctx;
    const nodeRadius = this.options.nodeRadius || 20;

    // 保存当前上下文状态
    ctx.save();

    // 渲染关系
    this._renderRelationships(ctx, nodeRadius);

    // 渲染节点
    this._renderNodes(ctx, nodeRadius);

    // 恢复上下文状态
    ctx.restore();
  }
  
  /**
   * 刷新画布
   */
  refresh() {
    this.render();
  }
  
  /**
   * 移除事件监听器
   */
  _removeEventListeners() {
    // 移除窗口大小变化事件
    window.removeEventListener('resize', () => this._resizeCanvas());
    
    // 获取画布元素（优先使用渲染器的元素）
    const canvasElement = this.renderer ? this.renderer.getCanvas() : this.canvas;
    
    // 移除画布上的事件监听器
    if (this._eventListeners && canvasElement) {
      for (const [event, listener] of Object.entries(this._eventListeners)) {
        if (listener) {
          canvasElement.removeEventListener(event, listener);
        }
      }
    }
    
    this._eventListeners = {};
    
    // 移除事件总线监听器
    if (this.eventBus && typeof this.eventBus.off === 'function') {
      this.eventBus.off('modeChanged');
      this.eventBus.off('contextChanged');
      this.eventBus.off('selectionCleared');
      this.eventBus.off('zoomToFit');
      this.eventBus.off('resetView');
    }
  }
  
  /**
   * 销毁画布管理器
   */
  destroy() {
    // 移除事件监听器
    this._removeEventListeners();
    
    // 如果使用渲染器，调用其destroy方法（如果有）
    if (this.renderer && typeof this.renderer.destroy === 'function') {
      this.renderer.destroy();
    } 
    // 否则移除canvas元素
    else if (this.canvas && this.container) {
      this.container.removeChild(this.canvas);
    }
    
    // 发出销毁事件
    this._emitEvent('canvasDestroyed', {});
    
    // 清理引用
    this.container = null;
    this.canvas = null;
    this.ctx = null;
    this.renderer = null;
    this.graphService = null;
    this.eventBus = null;
    this.modeManager = null;
    this.selectedNodes = null;
    this.selectedRelationship = null;
    this._eventListeners = null;
  }
}

// 暴露到全局作用域（避免重复声明）
if (!window.CanvasManager) {
  window.CanvasManager = CanvasManager;
}
