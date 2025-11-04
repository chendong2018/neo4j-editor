/**
 * 图数据服务使用示例
 * 演示如何使用GraphDataService和相关工具类
 */

// 创建示例函数，演示基本用法
function runGraphDataServiceDemo() {
  console.log('=== 图数据服务演示开始 ===');
  
  // 创建数据服务实例
  const graphService = new GraphDataService();
  
  // 1. 创建节点
  console.log('\n1. 创建节点:');
  
  const person1 = {
    id: 'person1',
    labels: ['Person', 'User'],
    properties: {
      name: 'Alice',
      age: 30,
      createdAt: '2024-01-01',
      active: true
    }
  };
  
  const person2 = {
    id: 'person2',
    labels: ['Person', 'Admin'],
    properties: {
      name: 'Bob',
      age: 35,
      createdAt: '2023-06-15',
      active: true
    }
  };
  
  const company = {
    id: 'company1',
    labels: ['Company', 'Technology'],
    properties: {
      name: 'Tech Corp',
      founded: 2015,
      size: 500,
      industry: 'Software'
    }
  };
  
  // 添加节点
  graphService.addNode(person1);
  graphService.addNode(person2);
  graphService.addNode(company);
  
  console.log('- 添加了3个节点');
  console.log('- 所有节点:', graphService.getAllNodes());
  
  // 2. 创建关系
  console.log('\n2. 创建关系:');
  
  // Alice 和 Bob 是朋友
  const friendship = {
    id: 'rel1',
    type: 'FRIENDS_WITH',
    startNodeId: 'person1',
    endNodeId: 'person2',
    properties: {
      since: 2020,
      strength: 0.8,
      hobbies: ['hiking', 'reading']
    }
  };
  
  // Alice 工作在公司
  const worksAt1 = {
    type: 'WORKS_AT',
    startNodeId: 'person1',
    endNodeId: 'company1',
    properties: {
      since: 2022,
      position: 'Developer',
      department: 'Engineering'
    }
  };
  
  // Bob 工作在公司
  const worksAt2 = {
    type: 'WORKS_AT',
    startNodeId: 'person2',
    endNodeId: 'company1',
    properties: {
      since: 2021,
      position: 'Manager',
      department: 'Engineering'
    }
  };
  
  // 添加关系
  graphService.addRelationship(friendship);
  graphService.addRelationship(worksAt1);
  graphService.addRelationship(worksAt2);
  
  console.log('- 添加了3个关系');
  console.log('- 所有关系:', graphService.getAllRelationships());
  
  // 3. 使用索引查询
  console.log('\n3. 使用索引查询:');
  
  // 查询节点的所有关系
  const aliceRelationships = graphService.getRelationshipsByNodeId('person1');
  console.log('- Alice的所有关系ID:', aliceRelationships);
  
  // 查询特定类型的关系
  const worksAtRelationships = graphService.getRelationshipsByType('WORKS_AT');
  console.log('- 所有WORKS_AT关系ID:', worksAtRelationships);
  
  // 4. 验证节点和关系
  console.log('\n4. 验证节点和关系:');
  
  console.log('- 验证person1:', GraphUtils.isValidNode(person1));
  console.log('- 验证friendship:', GraphUtils.isValidRelationship(friendship));
  
  // 5. 删除操作
  console.log('\n5. 删除操作:');
  
  // 删除关系
  const deletedRel = graphService.deleteRelationship('rel1');
  console.log('- 删除friendship关系:', deletedRel);
  console.log('- 删除后剩余关系数:', graphService.getAllRelationships().length);
  
  // 删除节点（会自动删除关联的关系）
  const deletedNode = graphService.deleteNode('person2');
  console.log('- 删除Bob节点:', deletedNode);
  console.log('- 删除后剩余节点数:', graphService.getAllNodes().length);
  console.log('- 删除后剩余关系数:', graphService.getAllRelationships().length);
  
  // 6. 查找功能
  console.log('\n6. 查找功能:');
  
  // 根据属性查找节点
  const techCompanies = graphService.findNodesByProperty('industry', 'Software');
  console.log('- 软件公司:', techCompanies);
  
  // 根据标签查找节点
  const personNodes = graphService.findNodesByLabel('Person');
  console.log('- Person节点:', personNodes);
  
  // 7. 生成ID和克隆功能
  console.log('\n7. 生成ID和克隆功能:');
  
  const newNodeId = GraphUtils.generateNodeId();
  console.log('- 生成新节点ID:', newNodeId);
  
  const clonedCompany = GraphUtils.cloneNode(company);
  console.log('- 克隆公司节点:', clonedCompany);
  
  // 8. 清空数据
  console.log('\n8. 清空数据:');
  graphService.clear();
  console.log('- 清空后节点数:', graphService.getAllNodes().length);
  console.log('- 清空后关系数:', graphService.getAllRelationships().length);
  
  console.log('\n=== 图数据服务演示结束 ===');
}

// 排序关系示例
function demonstrateSorting() {
  const graphService = new GraphDataService();
  
  // 创建测试数据
  const node1 = { id: 'n1', labels: ['Test'], properties: {} };
  const node2 = { id: 'n2', labels: ['Test'], properties: {} };
  const node3 = { id: 'n3', labels: ['Test'], properties: {} };
  
  graphService.addNode(node1);
  graphService.addNode(node2);
  graphService.addNode(node3);
  
  // 添加带权重的关系
  graphService.addRelationship({
    type: 'CONNECTED_TO',
    startNodeId: 'n1',
    endNodeId: 'n2',
    properties: { weight: 3.5 }
  });
  
  graphService.addRelationship({
    type: 'CONNECTED_TO',
    startNodeId: 'n1',
    endNodeId: 'n3',
    properties: { weight: 1.2 }
  });
  
  graphService.addRelationship({
    type: 'CONNECTED_TO',
    startNodeId: 'n2',
    endNodeId: 'n3',
    properties: { weight: 5.7 }
  });
  
  // 获取所有关系ID
  const allRelIds = graphService.getAllRelationships().map(rel => rel.id);
  
  // 按权重升序排序
  const sortedAsc = graphService.sortRelationshipsByProperty(allRelIds, 'weight', true);
  console.log('关系按权重升序:', sortedAsc.map(r => ({ id: r.id, weight: r.properties.weight })));
  
  // 按权重降序排序
  const sortedDesc = graphService.sortRelationshipsByProperty(allRelIds, 'weight', false);
  console.log('关系按权重降序:', sortedDesc.map(r => ({ id: r.id, weight: r.properties.weight })));
}

// 暴露函数到全局，便于在浏览器控制台调用
try {
  window.runGraphDataServiceDemo = runGraphDataServiceDemo;
  window.demonstrateSorting = demonstrateSorting;
  console.log('图数据服务示例函数已注册到全局作用域');
} catch (e) {
  // 如果不在浏览器环境，忽略错误
}