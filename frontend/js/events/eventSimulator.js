// 事件模拟器 - 用于测试事件绑定和行为触发

/**
 * 事件模拟器
 * 提供模拟用户交互的方法，用于测试和验证事件绑定
 */
class EventSimulator {
  constructor(eventManager) {
    this.eventManager = eventManager;
    
    // 获取事件总线实例
    this.eventBus = eventManager.eventBus || window.enhancedEventBus || window.eventBus;
    
    // 获取事件常量
    this.Events = eventManager.Events || window.Events;
    
    // 模拟数据
    this.mockNodes = [];
    this.mockRelationships = [];
  }
  
  /**
   * 设置模拟数据
   */
  setMockData(nodes, relationships) {
    this.mockNodes = nodes || [];
    this.mockRelationships = relationships || [];
    console.log(`[Test] Mock data set: ${nodes.length} nodes, ${relationships.length} relationships`);
  }
  
  /**
   * 模拟点击节点
   */
  simulateNodeClick(nodeId, canvasType, options = {}) {
    const { ctrlKey = false, metaKey = false } = options;
    
    console.log(`[Test] Simulating node click: ${nodeId} in ${canvasType} (ctrl: ${ctrlKey}, meta: ${metaKey})`);
    
    // 创建模拟事件对象
    const mockEvent = {
      clientX: 100,
      clientY: 100,
      ctrlKey,
      metaKey,
      preventDefault: () => {},
      stopPropagation: () => {}
    };
    
    // 模拟getNodeFromEvent方法返回节点
    const originalGetNodeFromEvent = this.eventManager.getNodeFromEvent;
    this.eventManager.getNodeFromEvent = (event, type) => {
      if (type === canvasType) {
        return this.mockNodes.find(node => node.id === nodeId) || null;
      }
      return originalGetNodeFromEvent.call(this.eventManager, event, type);
    };
    
    // 调用处理方法
    try {
      this.eventManager.handleCanvasClick(mockEvent, canvasType);
    } finally {
      // 恢复原始方法
      this.eventManager.getNodeFromEvent = originalGetNodeFromEvent;
    }
  }
  
  /**
   * 模拟点击关系
   */
  simulateRelationshipClick(relationshipId, canvasType) {
    console.log(`[Test] Simulating relationship click: ${relationshipId} in ${canvasType}`);
    
    // 创建模拟事件对象
    const mockEvent = {
      clientX: 100,
      clientY: 100,
      preventDefault: () => {},
      stopPropagation: () => {}
    };
    
    // 模拟getRelationshipFromEvent方法返回关系
    const originalGetRelationshipFromEvent = this.eventManager.getRelationshipFromEvent;
    this.eventManager.getRelationshipFromEvent = (event, type) => {
      if (type === canvasType) {
        return this.mockRelationships.find(rel => rel.id === relationshipId) || null;
      }
      return originalGetRelationshipFromEvent.call(this.eventManager, event, type);
    };
    
    // 调用处理方法
    try {
      this.eventManager.handleCanvasClick(mockEvent, canvasType);
    } finally {
      // 恢复原始方法
      this.eventManager.getRelationshipFromEvent = originalGetRelationshipFromEvent;
    }
  }
  
  /**
   * 模拟点击空白区域
   */
  simulateCanvasClick(canvasType) {
    console.log(`[Test] Simulating canvas click in ${canvasType}`);
    
    // 创建模拟事件对象
    const mockEvent = {
      clientX: 100,
      clientY: 100,
      preventDefault: () => {},
      stopPropagation: () => {}
    };
    
    // 调用处理方法
    this.eventManager.handleCanvasClick(mockEvent, canvasType);
  }
  
  /**
   * 模拟双击节点
   */
  simulateNodeDoubleClick(nodeId, canvasType) {
    console.log(`[Test] Simulating node double click: ${nodeId} in ${canvasType}`);
    
    // 创建模拟事件对象
    const mockEvent = {
      clientX: 100,
      clientY: 100,
      preventDefault: () => {},
      stopPropagation: () => {}
    };
    
    // 模拟getNodeFromEvent方法返回节点
    const originalGetNodeFromEvent = this.eventManager.getNodeFromEvent;
    this.eventManager.getNodeFromEvent = (event, type) => {
      if (type === canvasType) {
        return this.mockNodes.find(node => node.id === nodeId) || null;
      }
      return originalGetNodeFromEvent.call(this.eventManager, event, type);
    };
    
    // 调用处理方法
    try {
      this.eventManager.handleCanvasDoubleClick(mockEvent, canvasType);
    } finally {
      // 恢复原始方法
      this.eventManager.getNodeFromEvent = originalGetNodeFromEvent;
    }
  }
  
  /**
   * 模拟拖拽操作
   */
  simulateDrag(sourceNodeId, targetNodeId, canvasType) {
    console.log(`[Test] Simulating drag from node ${sourceNodeId} to node ${targetNodeId} in ${canvasType}`);
    
    // 模拟拖拽过程
    // 实际实现需要更复杂的鼠标事件序列
    
    if (canvasType === 'Tree Canvas') {
      // 对于Tree Canvas，触发moveNode
      try {
        this.eventManager.graphService.moveNode(sourceNodeId, targetNodeId);
        return true;
      } catch (error) {
        console.error('[Test] Drag simulation failed:', error);
        return false;
      }
    }
    
    return false;
  }
  
  /**
   * 模拟关系创建
   */
  simulateRelationshipCreation(sourceNodeId, targetNodeId, relationshipType) {
    console.log(`[Test] Simulating relationship creation: ${sourceNodeId} -${relationshipType}-> ${targetNodeId}`);
    
    // 切换到关系模式
    this.eventManager.switchMode('relationship', relationshipType);
    
    // 模拟第一步点击
    this.simulateNodeClick(sourceNodeId, 'Tree Canvas');
    
    // 模拟第二步点击
    this.simulateNodeClick(targetNodeId, 'Tree Canvas');
    
    return true;
  }
  
  /**
   * 模拟模式切换
   */
  simulateModeSwitch(mode, subType = null) {
    console.log(`[Test] Simulating mode switch to: ${mode}${subType ? ` (${subType})` : ''}`);
    this.eventManager.switchMode(mode, subType);
    return this.eventManager.currentMode === mode;
  }
  
  /**
   * 运行测试套件
   */
  runTestSuite() {
    console.log('[Test] Running event simulation test suite...');
    
    const results = [];
    
    // 测试模式切换
    results.push({
      name: 'Mode switch - select',
      success: this.simulateModeSwitch('select')
    });
    
    results.push({
      name: 'Mode switch - node',
      success: this.simulateModeSwitch('node')
    });
    
    results.push({
      name: 'Mode switch - relationship CHILD_OF',
      success: this.simulateModeSwitch('relationship', 'CHILD_OF')
    });
    
    results.push({
      name: 'Mode switch - relationship RELATES_TO',
      success: this.simulateModeSwitch('relationship', 'RELATES_TO')
    });
    
    // 打印测试结果
    console.log('[Test] Test results:');
    results.forEach(result => {
      console.log(`[Test] ${result.name}: ${result.success ? 'PASS' : 'FAIL'}`);
    });
    
    return results;
  }
}

// 导出事件模拟器
export default EventSimulator;
