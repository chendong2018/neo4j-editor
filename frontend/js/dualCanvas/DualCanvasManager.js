/**
 * 双画布管理器
 * 负责协调关系网和层级树两个视图的交互和同步，适配新的渲染器
 */
class DualCanvasManager {
  constructor(options = {}) {
    this.options = {
      networkContainerSelector: '#network-canvas-container',
      treeContainerSelector: '#tree-canvas-container',
      graphService: null,
      eventBus: null,
      modeManager: null,
      networkRenderer: null, // 关系网渲染器
      treeRenderer: null,    // 层级树渲染器
      contextMenuManager: null, // 右键菜单管理器
      ...options
    };

    // 验证必要的依赖项
    if (!this.options.graphService) throw new Error('图数据服务不能为空');
    if (!this.options.eventBus) throw new Error('事件总线不能为空');
    if (!this.options.modeManager) throw new Error('模式管理器不能为空');

    // 引用外部组件
    this.graphService = this.options.graphService;
    this.eventBus = this.options.eventBus;
    this.modeManager = this.options.modeManager;
    this.networkRenderer = this.options.networkRenderer;
    this.treeRenderer = this.options.treeRenderer;
    this.contextMenuManager = this.options.contextMenuManager;

    // 初始化画布管理器
    this.networkCanvasManager = null;
    this.treeCanvasManager = null;

    // 绑定事件监听器
    this._bindEvents();
  }

  /**
   * 初始化双画布管理器
   */
  init() {
    // 初始化关系网画布管理器
    this.networkCanvasManager = new NetworkCanvasManager({
      containerSelector: this.options.networkContainerSelector,
      graphService: this.graphService,
      eventBus: this.eventBus,
      modeManager: this.modeManager,
      renderer: this.networkRenderer // 传入自定义渲染器
    });

    // 初始化层级树画布管理器
    this.treeCanvasManager = new TreeCanvasManager({
      containerSelector: this.options.treeContainerSelector,
      graphService: this.graphService,
      eventBus: this.eventBus,
      modeManager: this.modeManager,
      renderer: this.treeRenderer // 传入自定义渲染器
    });

    // 初始化画布
    this.networkCanvasManager.init();
    this.treeCanvasManager.init();
    
    // 初始化右键菜单管理器
    if (!this.contextMenuManager && typeof ContextMenuManager !== 'undefined') {
      this.contextMenuManager = new ContextMenuManager({
        eventBus: this.eventBus,
        graphService: this.graphService,
        modeManager: this.modeManager
      });
    }

    // 发出初始化完成事件
    this._emitEvent('dualCanvasInitialized', {
      networkCanvas: this.networkCanvasManager.canvas || (this.networkRenderer ? this.networkRenderer.getCanvas() : null),
      treeCanvas: this.treeCanvasManager.canvas || (this.treeRenderer ? this.treeRenderer.getCanvas() : null)
    });
  }

  /**
   * 绑定事件监听器
   * @private
   */
  _bindEvents() {
    // 监听数据变更事件，同步更新两个视图
    this.eventBus.on('dataChanged', this._handleDataChanged.bind(this));

    // 监听上下文变更事件
    this.eventBus.on('networkContextChanged', this._handleContextChanged.bind(this));

    // 监听选择变更事件，同步两个视图的选择状态
    this.eventBus.on('selectionChanged', this._handleSelectionChanged.bind(this));

    // 监听模式变更事件
    this.eventBus.on('modeChanged', this._handleModeChanged.bind(this));
    
    // 新增事件监听：树画布节点选择
    this.eventBus.on('tree:nodeSelected', this._handleTreeNodeSelected.bind(this));
    
    // 新增事件监听：关系网画布节点双击
    this.eventBus.on('network:nodeDoubleClicked', this._handleNetworkNodeDoubleClicked.bind(this));
    
    // 新增事件监听：节点移动
    this.eventBus.on('nodeMoved', this._handleNodeMoved.bind(this));
    
    // 其他已有的事件监听
    this.eventBus.on('zoomToFit', this.refresh.bind(this));
    this.eventBus.on('resetView', this._handleResetView.bind(this));
    this.eventBus.on('nodeDragCompleted', this.refresh.bind(this));
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
   * 处理数据变更事件
   * @private
   */
  _handleDataChanged() {
    // 刷新两个画布
    this.networkCanvasManager.refresh();
    this.treeCanvasManager.refresh();
  }

  /**
   * 处理上下文变更事件
   * @private
   */
  _handleContextChanged(contextId) {
    // 确保网络画布更新上下文
    if (this.networkCanvasManager) {
      this.networkCanvasManager.setContext(contextId);
    }
    
    // 刷新两个画布
    this.refresh();
  }
  
  /**
   * 处理树画布中的节点选择
   * 实现功能：在层级树画布中点击非叶子节点，自动将关系网画布上下文切换为该节点
   * @private
   */
  _handleTreeNodeSelected(data) {
    if (!data || !data.nodeId) return;
    
    const nodeId = data.nodeId;
    const node = this.graphService.getNode(nodeId);
    
    if (!node) return;
    
    // 通知属性面板更新
    this.eventBus.emit('nodeSelected', node);
    
    // 检查节点是否有子节点
    const hasChildren = this.graphService.getChildNodes(nodeId).length > 0;
    
    // 如果是非叶子节点，自动切换关系网上下文
    if (hasChildren) {
      this.setNetworkContext(nodeId);
    } else {
      // 如果是叶子节点，清除关系网上下文
      this.clearNetworkContext();
    }
  }
  
  /**
   * 处理关系网画布中的节点双击
   * 实现功能：在关系网画布中双击某个节点，若该节点有子节点，则下钻到其子节点组
   * @private
   */
  _handleNetworkNodeDoubleClicked(data) {
    if (!data || !data.nodeId) return;
    
    const nodeId = data.nodeId;
    const node = this.graphService.getNode(nodeId);
    
    if (!node) return;
    
    // 检查节点是否有子节点
    const hasChildren = this.graphService.getChildNodes(nodeId).length > 0;
    
    // 如果有子节点，下钻到该节点的子节点组
    if (hasChildren) {
      this.setNetworkContext(nodeId);
    }
  }
  
  /**
   * 处理节点移动事件
   * 实现功能：节点结构移动后，自动更新上下文和视图
   * @private
   */
  _handleNodeMoved(data) {
    if (!data || !data.nodeId) return;
    
    const { nodeId, newParentId } = data;
    
    // 检查是否需要更新上下文
    // 如果当前上下文节点被移动，清除上下文
    // 如果移动到了有子节点的新父节点，切换到该父节点
    if (this.networkCanvasManager && this.networkCanvasManager.contextParentId === nodeId) {
      this.setNetworkContext(null);
    }
    
    if (newParentId) {
      const hasChildren = this.graphService.getChildNodes(newParentId).length > 0;
      if (hasChildren) {
        this.setNetworkContext(newParentId);
      }
    }
    
    // 刷新视图
    this.refresh();
  }
  
  /**
   * 处理视图重置事件
   * @private
   */
  _handleResetView() {
    this.setNetworkContext(null);
    this.refresh();
  }

  /**
   * 处理选择变更事件，避免循环触发
   * @private
   */
  _handleSelectionChanged({ selectedNodes, selectedRelationship }) {
    // 刷新两个画布以更新选择状态
    this.refresh();
  }

  /**
   * 处理模式变更事件
   * @private
   */
  _handleModeChanged(mode) {
    // 刷新两个画布以更新模式相关UI
    this.refresh();
  }

  /**
   * 刷新两个画布
   */
  refresh() {
    if (this.networkCanvasManager) {
      this.networkCanvasManager.refresh();
    }
    if (this.treeCanvasManager) {
      this.treeCanvasManager.refresh();
    }
  }

  /**
   * 清除关系网上下文
   */
  clearNetworkContext() {
    this.setNetworkContext(null);
  }

  /**
   * 设置关系网上下文
   * @param {string} contextId - 上下文节点ID
   */
  setNetworkContext(contextId) {
    this.eventBus.emit('networkContextChanged', contextId);
  }

  /**
   * 获取当前选中的节点
   * @returns {string[]} 选中节点的ID数组
   */
  getSelectedNodes() {
    // 默认从树视图获取选中节点，因为它通常是主要的选择源
    return this.treeCanvasManager ? 
      Array.from(this.treeCanvasManager.selectedNodes) : [];
  }

  /**
   * 销毁双画布管理器
   */
  destroy() {
    // 移除事件监听器
    this.eventBus.off('dataChanged', this._handleDataChanged);
    this.eventBus.off('networkContextChanged', this._handleContextChanged);
    this.eventBus.off('selectionChanged', this._handleSelectionChanged);
    this.eventBus.off('modeChanged', this._handleModeChanged);
    
    // 移除新增的事件监听器
    this.eventBus.off('tree:nodeSelected', this._handleTreeNodeSelected);
    this.eventBus.off('network:nodeDoubleClicked', this._handleNetworkNodeDoubleClicked);
    this.eventBus.off('nodeMoved', this._handleNodeMoved);
    this.eventBus.off('zoomToFit', this.refresh);
    this.eventBus.off('resetView', this._handleResetView);
    this.eventBus.off('nodeDragCompleted', this.refresh);

    // 销毁右键菜单管理器
    if (this.contextMenuManager && typeof this.contextMenuManager.destroy === 'function') {
      this.contextMenuManager.destroy();
      this.contextMenuManager = null;
    }

    // 销毁画布管理器
    if (this.networkCanvasManager) {
      this.networkCanvasManager.destroy();
      this.networkCanvasManager = null;
    }
    if (this.treeCanvasManager) {
      this.treeCanvasManager.destroy();
      this.treeCanvasManager = null;
    }

    // 发出销毁完成事件
    this._emitEvent('dualCanvasDestroyed');
  }

  /**
   * 获取关系网画布管理器实例
   * @returns {NetworkCanvasManager}
   */
  getNetworkCanvasManager() {
    return this.networkCanvasManager;
  }

  /**
   * 设置自定义渲染器
   * @param {Object} options - 渲染器选项
   * @param {Object} options.networkRenderer - 关系网渲染器
   * @param {Object} options.treeRenderer - 层级树渲染器
   */
  setRenderers({ networkRenderer, treeRenderer }) {
    this.networkRenderer = networkRenderer;
    this.treeRenderer = treeRenderer;
    
    // 如果画布管理器已经初始化，更新渲染器
    if (this.networkCanvasManager) {
      this.networkCanvasManager.renderer = networkRenderer;
    }
    if (this.treeCanvasManager) {
      this.treeCanvasManager.renderer = treeRenderer;
    }
    
    // 刷新视图
    this.refresh();
    
    // 发出渲染器更新事件
    this._emitEvent('renderersUpdated', { networkRenderer, treeRenderer });
  }
}

// 暴露到全局作用域
if (typeof window !== 'undefined') {
  // 确保全局只有一个DualCanvasManager类定义
  if (!window.DualCanvasManager) {
    window.DualCanvasManager = DualCanvasManager;
  }
}

// 导出模块（支持CommonJS）
if (typeof module !== 'undefined' && typeof module.exports !== 'undefined') {
  module.exports = DualCanvasManager;
}

// 导出模块（支持AMD）
if (typeof define === 'function' && define.amd) {
  define([], function() {
    return DualCanvasManager;
  });
}