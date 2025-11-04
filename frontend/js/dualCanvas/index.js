/**
 * 双画布图编辑器入口文件
 * 整合所有组件，提供完整的双画布编辑功能
 */

// 由于浏览器不支持直接import，我们将在HTML中使用传统的脚本加载方式
// 并在全局作用域中注册组件

/**
 * 双画布图编辑器类
 * 协调所有组件工作，提供统一的API接口
 */

/**
 * 双画布图编辑器类
 * 协调所有组件工作，提供统一的API接口
 */
class DualCanvasEditor {
  constructor(options = {}) {
    // 配置选项
    this.options = {
      treeContainerSelector: '#tree-canvas',
      networkContainerSelector: '#network-canvas',
      propertyPanelSelector: '#property-panel',
      modePanelSelector: '#mode-panel',
      ...options
    };

    // 初始化组件
    this.eventBus = new EventBus();
    this.graphService = new GraphDataService({
      autoConnectInTreeCreation: true,
      autoConnectOnMove: false
    });
    this.modeManager = new ModeManager(this.eventBus);
    
    // 创建两个画布管理器
    this.treeCanvasManager = new TreeCanvasManager({
      containerSelector: this.options.treeContainerSelector,
      graphService: this.graphService,
      eventBus: this.eventBus,
      modeManager: this.modeManager
    });
    
    this.networkCanvasManager = new NetworkCanvasManager({
      containerSelector: this.options.networkContainerSelector,
      graphService: this.graphService,
      eventBus: this.eventBus,
      modeManager: this.modeManager
    });
    
    // 创建上下文菜单管理器
    this.contextMenuManager = new ContextMenuManager({
      graphService: this.graphService,
      eventBus: this.eventBus,
      modeManager: this.modeManager,
      canvasManagers: {
        tree: this.treeCanvasManager,
        network: this.networkCanvasManager
      }
    });
    
    // 初始化事件监听
    this._initEventListeners();
  }
  
  /**
   * 初始化事件监听器
   */
  _initEventListeners() {
    // 监听模式切换事件
    this.eventBus.on('modeChanged', (newMode) => {
      console.log(`模式已切换为: ${newMode}`);
      // 更新UI状态
    });
    
    // 监听节点选中事件
    this.eventBus.on('nodeSelected', (nodeId) => {
      this._updatePropertyPanel('node', nodeId);
    });
    
    // 监听关系选中事件
    this.eventBus.on('relationshipSelected', (relId) => {
      this._updatePropertyPanel('relationship', relId);
    });
    
    // 监听关系网上下文切换事件
    this.eventBus.on('networkContextChanged', (parentId) => {
      this.networkCanvasManager.setContextParent(parentId);
    });
    
    // 监听数据变更事件
    this.eventBus.on('dataChanged', () => {
      this.treeCanvasManager.refresh();
      this.networkCanvasManager.refresh();
    });
  }
  
  /**
   * 更新属性面板
   */
  _updatePropertyPanel(type, id) {
    const panel = document.querySelector(this.options.propertyPanelSelector);
    if (!panel) return;
    
    if (type === 'node') {
      const node = this.graphService.getNode(id);
      if (node) {
        // 显示节点属性
        panel.innerHTML = this._renderNodeProperties(node);
        this._attachPropertyEditHandlers('node', node);
      }
    } else if (type === 'relationship') {
      const relationship = this.graphService.getRelationship(id);
      if (relationship) {
        // 显示关系属性（仅RELATES_TO关系允许修改）
        panel.innerHTML = this._renderRelationshipProperties(relationship);
        if (relationship.type === 'RELATES_TO') {
          this._attachPropertyEditHandlers('relationship', relationship);
        }
      }
    }
  }
  
  /**
   * 渲染节点属性HTML
   */
  _renderNodeProperties(node) {
    return `
      <h3>节点属性</h3>
      <div class="property-item">
        <label>ID:</label>
        <input type="text" readonly value="${node.id}">
      </div>
      <div class="property-item">
        <label>标签:</label>
        <div>${node.labels.join(', ')}</div>
      </div>
      <h4>属性</h4>
      ${Object.entries(node.properties).map(([key, value]) => `
        <div class="property-item">
          <label>${key}:</label>
          <input type="text" data-key="${key}" value="${JSON.stringify(value)}">
        </div>
      `).join('')}
    `;
  }
  
  /**
   * 渲染关系属性HTML
   */
  _renderRelationshipProperties(relationship) {
    return `
      <h3>关系属性</h3>
      <div class="property-item">
        <label>ID:</label>
        <input type="text" readonly value="${relationship.id}">
      </div>
      <div class="property-item">
        <label>类型:</label>
        <div>${relationship.type}</div>
      </div>
      <div class="property-item">
        <label>起始节点:</label>
        <div>${relationship.startNodeId}</div>
      </div>
      <div class="property-item">
        <label>目标节点:</label>
        <div>${relationship.endNodeId}</div>
      </div>
      ${relationship.type === 'RELATES_TO' ? `
        <h4>属性</h4>
        ${Object.entries(relationship.properties).filter(([key]) => key !== 'direction').map(([key, value]) => `
          <div class="property-item">
            <label>${key}:</label>
            <input type="text" data-key="${key}" value="${JSON.stringify(value)}">
          </div>
        `).join('')}
      ` : ''}
    `;
  }
  
  /**
   * 附加属性编辑事件处理程序
   */
  _attachPropertyEditHandlers(type, item) {
    const inputs = document.querySelectorAll(`${this.options.propertyPanelSelector} input[data-key]`);
    inputs.forEach(input => {
      input.addEventListener('change', (e) => {
        const key = e.target.dataset.key;
        try {
          const value = JSON.parse(e.target.value);
          if (type === 'node') {
            item.properties[key] = value;
          } else if (type === 'relationship') {
            item.properties[key] = value;
          }
          this.eventBus.emit('dataChanged');
        } catch (error) {
          console.error('属性值解析失败:', error);
          alert('请输入有效的JSON格式值');
          e.target.value = JSON.stringify(item.properties[key]);
        }
      });
    });
  }
  
  /**
   * 初始化编辑器
   */
  init() {
    this.treeCanvasManager.init();
    this.networkCanvasManager.init();
    this.contextMenuManager.init();
    
    // 设置默认模式
    this.modeManager.setMode('select');
    
    console.log('双画布编辑器初始化完成');
  }
  
  /**
   * 加载数据
   */
  loadData(nodes, relationships) {
    this.graphService.clear();
    if (nodes && nodes.length > 0) {
      this.graphService.addNodes(nodes);
    }
    if (relationships && relationships.length > 0) {
      this.graphService.addRelationships(relationships);
    }
    this.eventBus.emit('dataChanged');
  }
  
  /**
   * 导出数据
   */
  exportData() {
    return {
      nodes: this.graphService.getAllNodes(),
      relationships: this.graphService.getAllRelationships()
    };
  }
}

// 暴露到全局作用域（避免重复声明）
if (!window.DualCanvasEditor) {
  window.DualCanvasEditor = DualCanvasEditor;
}
