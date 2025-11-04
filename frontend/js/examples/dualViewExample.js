/**
 * 双视图功能使用示例
 * 演示层级树视图和同父关系网视图的节点创建、移动和查询功能
 */

function runDualViewDemo() {
  console.log('=== 双视图功能演示开始 ===');
  
  // 创建配置了自动连接行为的数据服务实例
  const graphService = new GraphDataService({
    autoConnectInTreeCreation: true,
    autoConnectOnMove: false
  });
  
  // 1. 创建根节点
  console.log('\n1. 创建根节点:');
  
  const moduleGroup1 = graphService.createNodeWithContext({
    labels: ['ModuleGroup'],
    properties: { name: '微服务组1' }
  }, null, 'tree'); // 根节点，无父节点
  
  const moduleGroup2 = graphService.createNodeWithContext({
    labels: ['ModuleGroup'],
    properties: { name: '微服务组2' }
  }, null, 'network'); // 根节点，无父节点
  
  console.log('- 创建了两个根节点作为模块组');
  console.log('- 模块组1:', moduleGroup1);
  console.log('- 模块组2:', moduleGroup2);
  
  // 2. 在层级树上下文中创建节点（自动连接兄弟）
  console.log('\n2. 在层级树上下文中创建节点:');
  
  const serviceA = graphService.createNodeWithContext({
    labels: ['Service'],
    properties: { name: '服务A', port: 8001 }
  }, moduleGroup1.id, 'tree'); // 树上下文
  
  console.log('- 在模块组1下创建服务A（树上下文）');
  
  // 在树上下文创建第二个节点，应该自动与服务A建立RELATES_TO关系
  const serviceB = graphService.createNodeWithContext({
    labels: ['Service'],
    properties: { name: '服务B', port: 8002 }
  }, moduleGroup1.id, 'tree');
  
  console.log('- 在模块组1下创建服务B（树上下文）');
  
  // 检查自动创建的RELATES_TO关系
  const network1 = graphService.getSiblingNetwork(serviceA.id);
  console.log(`- 模块组1内RELATES_TO关系数量: ${network1.relationships.length}`);
  console.log('- 关系详情:', network1.relationships);
  
  // 3. 在关系网上下文创建节点（不自动连接兄弟）
  console.log('\n3. 在关系网上下文创建节点:');
  
  const serviceC = graphService.createNodeWithContext({
    labels: ['Service'],
    properties: { name: '服务C', port: 8003 }
  }, moduleGroup2.id, 'network'); // 关系网上下文
  
  const serviceD = graphService.createNodeWithContext({
    labels: ['Service'],
    properties: { name: '服务D', port: 8004 }
  }, moduleGroup2.id, 'network');
  
  // 检查是否自动创建了RELATES_TO关系（应该没有）
  const network2 = graphService.getSiblingNetwork(serviceC.id);
  console.log(`- 模块组2内RELATES_TO关系数量: ${network2.relationships.length}`);
  
  // 手动添加RELATES_TO关系
  const [rel1, rel2] = graphService.addRelatesTo(serviceC.id, serviceD.id, { 
    manual: true, 
    description: '手动创建的服务依赖' 
  });
  console.log('- 手动创建RELATES_TO关系后数量:', graphService.getSiblingNetwork(serviceC.id).relationships.length);
  
  // 4. 测试移动节点功能
  console.log('\n4. 测试移动节点功能:');
  
  // 移动服务C到模块组1
  console.log('- 将服务C从模块组2移动到模块组1');
  graphService.moveNode(serviceC.id, moduleGroup1.id, false);
  
  // 检查服务C与原兄弟的关系是否已清理
  console.log('- 移动后服务C与服务D的关系:', 
    graphService.getSiblingNetwork(serviceD.id).relationships.find(r => 
      (r.startNodeId === serviceD.id && r.endNodeId === serviceC.id) ||
      (r.startNodeId === serviceC.id && r.endNodeId === serviceD.id)
    ) ? '存在' : '已清理' 
  );
  
  // 检查服务C与新兄弟是否自动建立关系（autoConnectOnMove=false，应该没有）
  const newNetwork = graphService.getSiblingNetwork(serviceC.id);
  console.log(`- 移动后模块组1内RELATES_TO关系数量: ${newNetwork.relationships.length}`);
  
  // 5. 获取层级树
  console.log('\n5. 获取层级树:');
  
  const hierarchy = graphService.getHierarchyTree();
  console.log('- 完整层级树结构:');
  console.log(JSON.stringify(hierarchy, null, 2));
  
  // 6. 获取关系网
  console.log('\n6. 获取关系网:');
  
  const serviceANetwork = graphService.getSiblingNetwork(serviceA.id);
  console.log(`- 服务A所在组的节点数量: ${serviceANetwork.nodes.length}`);
  console.log(`- 服务A所在组的关系数量: ${serviceANetwork.relationships.length}`);
  console.log('- 节点列表:', serviceANetwork.nodes.map(n => n.properties.name));
  
  // 7. 验证关系合法性规则
  console.log('\n7. 验证关系合法性规则:');
  
  // 尝试创建跨父的RELATES_TO关系（应该失败）
  try {
    graphService.addRelatesTo(serviceC.id, serviceD.id, { test: 'cross-parent' });
    console.log('- 警告：不应该允许创建跨父节点的RELATES_TO关系');
  } catch (e) {
    console.log('- 成功阻止创建跨父节点的RELATES_TO关系:', e.message);
  }
  
  // 8. 创建多层级结构
  console.log('\n8. 创建多层级结构:');
  
  const subModule = graphService.createNodeWithContext({
    labels: ['SubModule'],
    properties: { name: '子模块' }
  }, moduleGroup1.id, 'tree');
  
  const component1 = graphService.createNodeWithContext({
    labels: ['Component'],
    properties: { name: '组件1' }
  }, subModule.id, 'tree');
  
  const component2 = graphService.createNodeWithContext({
    labels: ['Component'],
    properties: { name: '组件2' }
  }, subModule.id, 'tree');
  
  // 检查子模块内的自动关系
  const subModuleNetwork = graphService.getSiblingNetwork(component1.id);
  console.log(`- 子模块内组件间RELATES_TO关系数量: ${subModuleNetwork.relationships.length}`);
  
  // 9. 移动整个子树
  console.log('\n9. 移动整个子树:');
  
  // 注意：实际使用时，可能需要递归移动整个子树
  // 这里简化演示，只移动子模块
  console.log('- 将子模块从模块组1移动到模块组2');
  graphService.moveNode(subModule.id, moduleGroup2.id);
  
  // 检查移动后的层级结构
  const updatedHierarchy = graphService.getHierarchyTree();
  console.log('- 移动后的层级树:');
  console.log(JSON.stringify({
    moduleGroup1: { children: updatedHierarchy[moduleGroup1.id]?.children.length || 0 },
    moduleGroup2: { children: updatedHierarchy[moduleGroup2.id]?.children.length || 0 }
  }, null, 2));
  
  // 10. 根节点之间的关系测试
  console.log('\n10. 根节点之间的关系测试:');
  
  // 创建两个根节点
  const root1 = graphService.createNodeWithContext({
    labels: ['Root'],
    properties: { name: '根节点1' }
  }, null, 'network');
  
  const root2 = graphService.createNodeWithContext({
    labels: ['Root'],
    properties: { name: '根节点2' }
  }, null, 'network');
  
  // 根节点应该可以建立RELATES_TO关系（因为它们有相同的父节点null）
  try {
    graphService.addRelatesTo(root1.id, root2.id, { rootConnection: true });
    console.log('- 成功在根节点之间创建RELATES_TO关系');
    
    const rootNetwork = graphService.getSiblingNetwork(root1.id);
    console.log(`- 根节点关系网中的节点数量: ${rootNetwork.nodes.length}`);
    console.log(`- 根节点之间的RELATES_TO关系数量: ${rootNetwork.relationships.length}`);
  } catch (e) {
    console.log('- 错误：应该允许在根节点之间创建RELATES_TO关系', e.message);
  }
  
  console.log('\n=== 双视图功能演示结束 ===');
}

// 运行演示
// runDualViewDemo();
