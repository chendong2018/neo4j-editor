// 事件管理器使用示例

import { EventManager, EventSimulator } from './events/index.js';

/**
 * 示例：初始化和使用事件管理器
 */
function initEventSystem() {
  // 假设有以下DOM元素和服务
  const treeCanvasEl = document.getElementById('tree-canvas');
  const networkCanvasEl = document.getElementById('network-canvas');
  
  // 模拟的图数据服务
  const mockGraphService = {
    // 节点操作
    addNode: (params) => {
      console.log('[Graph Service] Adding node with params:', params);
      // 实际实现会调用后端API
    },
    
    deleteNode: (nodeId) => {
      console.log('[Graph Service] Deleting node:', nodeId);
      // 实际实现会调用后端API
    },
    
    moveNode: (sourceId, targetId) => {
      console.log('[Graph Service] Moving node:', sourceId, '->', targetId);
      // 实际实现会调用后端API并处理关系变更
    },
    
    // 关系操作
    addRelationship: (sourceId, targetId, type) => {
      console.log('[Graph Service] Adding relationship:', sourceId, '-', type, '->', targetId);
      // 实际实现会调用后端API
    },
    
    // 上下文操作
    setNetworkContext: (nodeId) => {
      console.log('[Graph Service] Setting network context to:', nodeId);
      // 实际实现会更新Network Canvas的显示内容
    },
    
    getCurrentNetworkContext: () => {
      console.log('[Graph Service] Getting current network context');
      return 'root'; // 示例返回
    },
    
    // 选择操作
    selectNode: (nodeId) => {
      console.log('[Graph Service] Selecting node:', nodeId);
      // 实际实现会更新属性面板
    },
    
    selectRelationship: (relationshipId) => {
      console.log('[Graph Service] Selecting relationship:', relationshipId);
      // 实际实现会更新属性面板
    },
    
    clearSelection: () => {
      console.log('[Graph Service] Clearing selection');
      // 实际实现会清空属性面板
    },
    
    focusPropertiesPanel: (nodeId) => {
      console.log('[Graph Service] Focusing properties panel on:', nodeId);
      // 实际实现会聚焦属性面板
    },
    
    // 辅助方法
    getNodeParent: (nodeId) => {
      console.log('[Graph Service] Getting parent for node:', nodeId);
      return 'parent-id'; // 示例返回
    },
    
    hasChildNodes: (nodeId) => {
      console.log('[Graph Service] Checking if node has children:', nodeId);
      return true; // 示例返回
    }
  };
  
  // 初始化事件管理器
  const eventManager = new EventManager(treeCanvasEl, networkCanvasEl, mockGraphService);
  
  // 初始化事件模拟器（用于测试）
  const eventSimulator = new EventSimulator(eventManager);
  
  // 设置模拟数据
  eventSimulator.setMockData(
    [
      { id: 'node1', isLeaf: false, x: 100, y: 100 },
      { id: 'node2', isLeaf: true, x: 200, y: 100 },
      { id: 'node3', isLeaf: true, x: 100, y: 200 }
    ],
    [
      { id: 'rel1', source: 'node1', target: 'node2', type: 'CHILD_OF' },
      { id: 'rel2', source: 'node1', target: 'node3', type: 'RELATES_TO' }
    ]
  );
  
  // 绑定工具栏按钮
  bindToolbarButtons(eventManager);
  
  // 返回事件系统实例
  return {
    eventManager,
    eventSimulator
  };
}

/**
 * 绑定工具栏按钮事件
 */
function bindToolbarButtons(eventManager) {
  // 选择模式按钮
  const selectButton = document.getElementById('mode-select');
  if (selectButton) {
    selectButton.addEventListener('click', () => {
      eventManager.switchMode('select');
      updateModeButtonStates('select');
    });
  }
  
  // 节点模式按钮
  const nodeButton = document.getElementById('mode-node');
  if (nodeButton) {
    nodeButton.addEventListener('click', () => {
      eventManager.switchMode('node');
      updateModeButtonStates('node');
    });
  }
  
  // 关系模式按钮
  const relationshipButton = document.getElementById('mode-relationship');
  if (relationshipButton) {
    // 假设有关系子类型按钮
    const childOfButton = document.getElementById('rel-type-child-of');
    const relatesToButton = document.getElementById('rel-type-relates-to');
    
    if (childOfButton) {
      childOfButton.addEventListener('click', () => {
        eventManager.switchMode('relationship', 'CHILD_OF');
        updateModeButtonStates('relationship');
      });
    }
    
    if (relatesToButton) {
      relatesToButton.addEventListener('click', () => {
        eventManager.switchMode('relationship', 'RELATES_TO');
        updateModeButtonStates('relationship');
      });
    }
  }
}

/**
 * 更新模式按钮状态
 */
function updateModeButtonStates(activeMode) {
  // 实际实现会更新UI按钮的激活状态
  console.log(`[UI] Updated button states. Active mode: ${activeMode}`);
}

/**
 * 运行示例
 */
function runExample() {
  console.log('Initializing event system example...');
  const eventSystem = initEventSystem();
  
  // 运行简单测试
  console.log('Running simple tests...');
  
  // 测试模式切换
  eventSystem.eventManager.switchMode('select');
  eventSystem.eventManager.switchMode('node');
  eventSystem.eventManager.switchMode('relationship', 'CHILD_OF');
  
  // 测试模拟点击（需要在DOM加载完成后执行）
  // eventSystem.eventSimulator.simulateNodeClick('node1', 'Tree Canvas');
  
  return eventSystem;
}

// 导出示例函数
export { initEventSystem, runExample };
