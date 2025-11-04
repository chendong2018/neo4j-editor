/**
 * 双画布编辑器示例
 * 演示如何初始化和使用双画布编辑器
 */

// 等待页面加载完成
document.addEventListener('DOMContentLoaded', () => {
  // 初始化GraphDataService
  const graphService = new GraphDataService();
  
  // 创建一些示例数据
  createSampleData(graphService, GraphUtils);
  
  // 初始化双画布编辑器
  const editor = new DualCanvasEditor({
    treeCanvas: document.getElementById('tree-canvas'),
    networkCanvas: document.getElementById('network-canvas'),
    graphService: graphService,
    // 可选的配置项
    options: {
      tree: {
        nodeRadius: 20,
        levelSpacing: 100,
        siblingSpacing: 60
      },
      network: {
        nodeRadius: 25,
        forceSimulation: true,
        repulsionForce: -100,
        linkDistance: 100
      }
    }
  });
  
  // 初始化编辑器
  editor.init();
  
  // 添加模式切换按钮事件监听
  document.getElementById('select-mode-btn').addEventListener('click', () => {
    editor.modeManager.setMode('select');
    updateModeButtons('select');
  });
  
  document.getElementById('node-mode-btn').addEventListener('click', () => {
    editor.modeManager.setMode('node');
    updateModeButtons('node');
  });
  
  document.getElementById('relationship-mode-btn').addEventListener('click', () => {
    // 这里可以让用户选择关系类型
    const type = prompt('请选择关系类型 (CHILD_OF 或 RELATES_TO):', 'RELATES_TO');
    if (type === 'CHILD_OF' || type === 'RELATES_TO') {
      editor.modeManager.setMode('relationship');
      editor.modeManager.setRelationshipType(type);
      updateModeButtons('relationship');
    }
  });
  
  // 更新模式按钮状态
  function updateModeButtons(activeMode) {
    document.getElementById('select-mode-btn').classList.toggle('active', activeMode === 'select');
    document.getElementById('node-mode-btn').classList.toggle('active', activeMode === 'node');
    document.getElementById('relationship-mode-btn').classList.toggle('active', activeMode === 'relationship');
  }
  
  // 添加属性面板更新事件监听
  editor.eventBus.on('selectionChanged', (selection) => {
    updatePropertyPanel(selection);
  });
  
  // 更新属性面板
  function updatePropertyPanel(selection) {
    const propertyPanel = document.getElementById('property-panel');
    propertyPanel.innerHTML = '';
    
    if (!selection) {
      propertyPanel.innerHTML = '<p>请选择一个节点或关系查看属性</p>';
      return;
    }
    
    // 根据选择类型显示不同的属性
    if (selection.type === 'node') {
      const node = graphService.getNode(selection.id);
      if (node) {
        propertyPanel.innerHTML = `
          <h3>节点属性</h3>
          <div class="property-group">
            <div class="property"><label>ID:</label> <span>${node.id}</span></div>
            <div class="property"><label>标签:</label> <span>${node.labels.join(', ')}</span></div>
            <div class="property-section">
              <h4>Properties</h4>
              ${Object.entries(node.properties || {}).map(([key, value]) => `
                <div class="property-item">
                  <label>${key}:</label>
                  <input type="text" data-key="${key}" value="${value}" />
                </div>
              `).join('')}
            </div>
          </div>
          <button id="save-node-btn">保存属性</button>
        `;
        
        // 添加保存按钮事件
        document.getElementById('save-node-btn').addEventListener('click', () => {
          const updatedProperties = {};
          const inputs = propertyPanel.querySelectorAll('input[data-key]');
          
          inputs.forEach(input => {
            updatedProperties[input.dataset.key] = input.value;
          });
          
          try {
            graphService.updateNodeProperties(node.id, updatedProperties);
            editor.eventBus.emit('dataChanged');
            alert('属性已保存');
          } catch (error) {
            console.error('保存属性失败:', error);
            alert(`保存属性失败: ${error.message}`);
          }
        });
      }
    } else if (selection.type === 'relationship') {
      const rel = graphService.getRelationship(selection.id);
      if (rel) {
        propertyPanel.innerHTML = `
          <h3>关系属性</h3>
          <div class="property-group">
            <div class="property"><label>ID:</label> <span>${rel.id}</span></div>
            <div class="property"><label>类型:</label> <span>${rel.type}</span></div>
            <div class="property"><label>起始节点:</label> <span>${rel.startNodeId}</span></div>
            <div class="property"><label>结束节点:</label> <span>${rel.endNodeId}</span></div>
            <div class="property-section">
              <h4>Properties</h4>
              ${Object.entries(rel.properties || {}).map(([key, value]) => `
                <div class="property-item">
                  <label>${key}:</label>
                  <input type="text" data-key="${key}" value="${value}" />
                </div>
              `).join('')}
            </div>
          </div>
          <button id="save-rel-btn">保存属性</button>
        `;
        
        // 添加保存按钮事件
        document.getElementById('save-rel-btn').addEventListener('click', () => {
          const updatedProperties = {};
          const inputs = propertyPanel.querySelectorAll('input[data-key]');
          
          inputs.forEach(input => {
            updatedProperties[input.dataset.key] = input.value;
          });
          
          try {
            graphService.updateRelationshipProperties(rel.id, updatedProperties);
            editor.eventBus.emit('dataChanged');
            alert('属性已保存');
          } catch (error) {
            console.error('保存属性失败:', error);
            alert(`保存属性失败: ${error.message}`);
          }
        });
      }
    }
  }
  
  // 添加重置按钮事件
  document.getElementById('reset-btn').addEventListener('click', () => {
    if (confirm('确定要重置编辑器吗？这将清空所有数据。')) {
      // 清空数据
      graphService.clear();
      
      // 创建新的示例数据
      createSampleData(graphService);
      
      // 刷新编辑器
      editor.refresh();
      
      // 清空属性面板
      updatePropertyPanel(null);
    }
  });
});

/**
 * 创建示例数据
 */
function createSampleData(graphService, GraphUtils) {
  try {
    // 创建根节点
    const root1 = {
      id: GraphUtils.generateNodeId(),
      labels: ['Root', 'Project'],
      properties: {
        name: '项目 A',
        description: '主要项目',
        created: new Date().toISOString()
      }
    };
    graphService.addNode(root1);
    
    const root2 = {
      id: GraphUtils.generateNodeId(),
      labels: ['Root', 'Project'],
      properties: {
        name: '项目 B',
        description: '次要项目',
        created: new Date().toISOString()
      }
    };
    graphService.addNode(root2);
    
    // 创建项目A的子节点
    const moduleA1 = {
      id: GraphUtils.generateNodeId(),
      labels: ['Module'],
      properties: {
        name: '模块 A1',
        description: '核心模块',
        priority: 'high'
      }
    };
    graphService.addNode(moduleA1);
    
    const moduleA2 = {
      id: GraphUtils.generateNodeId(),
      labels: ['Module'],
      properties: {
        name: '模块 A2',
        description: '辅助模块',
        priority: 'medium'
      }
    };
    graphService.addNode(moduleA2);
    
    // 创建CHILD_OF关系
    const rel1 = {
      id: GraphUtils.generateRelationshipId(),
      type: 'CHILD_OF',
      startNodeId: moduleA1.id,
      endNodeId: root1.id,
      properties: {
        created: new Date().toISOString()
      }
    };
    graphService.addRelationship(rel1);
    
    const rel2 = {
      id: GraphUtils.generateRelationshipId(),
      type: 'CHILD_OF',
      startNodeId: moduleA2.id,
      endNodeId: root1.id,
      properties: {
        created: new Date().toISOString()
      }
    };
    graphService.addRelationship(rel2);
    
    // 创建RELATES_TO关系（模块之间的关系）
    const rel3 = {
      id: GraphUtils.generateRelationshipId(),
      type: 'RELATES_TO',
      startNodeId: moduleA1.id,
      endNodeId: moduleA2.id,
      properties: {
        created: new Date().toISOString(),
        relationship: 'depends_on'
      }
    };
    graphService.addRelationship(rel3);
    
    // 创建项目B的子节点
    const moduleB1 = {
      id: GraphUtils.generateNodeId(),
      labels: ['Module'],
      properties: {
        name: '模块 B1',
        description: '基础模块',
        priority: 'high'
      }
    };
    graphService.addNode(moduleB1);
    
    const moduleB2 = {
      id: GraphUtils.generateNodeId(),
      labels: ['Module'],
      properties: {
        name: '模块 B2',
        description: '功能模块',
        priority: 'medium'
      }
    };
    graphService.addNode(moduleB2);
    
    const moduleB3 = {
      id: GraphUtils.generateNodeId(),
      labels: ['Module'],
      properties: {
        name: '模块 B3',
        description: '扩展模块',
        priority: 'low'
      }
    };
    graphService.addNode(moduleB3);
    
    // 创建CHILD_OF关系
    const rel4 = {
      id: GraphUtils.generateRelationshipId(),
      type: 'CHILD_OF',
      startNodeId: moduleB1.id,
      endNodeId: root2.id,
      properties: {
        created: new Date().toISOString()
      }
    };
    graphService.addRelationship(rel4);
    
    const rel5 = {
      id: GraphUtils.generateRelationshipId(),
      type: 'CHILD_OF',
      startNodeId: moduleB2.id,
      endNodeId: root2.id,
      properties: {
        created: new Date().toISOString()
      }
    };
    graphService.addRelationship(rel5);
    
    const rel6 = {
      id: GraphUtils.generateRelationshipId(),
      type: 'CHILD_OF',
      startNodeId: moduleB3.id,
      endNodeId: root2.id,
      properties: {
        created: new Date().toISOString()
      }
    };
    graphService.addRelationship(rel6);
    
    // 创建RELATES_TO关系（模块之间的关系）
    const rel7 = {
      id: GraphUtils.generateRelationshipId(),
      type: 'RELATES_TO',
      startNodeId: moduleB1.id,
      endNodeId: moduleB2.id,
      properties: {
        created: new Date().toISOString(),
        relationship: 'provides'
      }
    };
    graphService.addRelationship(rel7);
    
    const rel8 = {
      id: GraphUtils.generateRelationshipId(),
      type: 'RELATES_TO',
      startNodeId: moduleB2.id,
      endNodeId: moduleB3.id,
      properties: {
        created: new Date().toISOString(),
        relationship: 'extends'
      }
    };
    graphService.addRelationship(rel8);
    
    console.log('示例数据创建成功');
  } catch (error) {
    console.error('创建示例数据失败:', error);
  }
}
