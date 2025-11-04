// 测试双视图功能初始化状态
console.log('===== 测试双视图同步功能 =====');

// 等待DOM完全加载后再测试
document.addEventListener('DOMContentLoaded', function() {
  setTimeout(function() {
    try {
      // 检查viewSync对象是否存在
      if (window.viewSync) {
        console.log('✅ viewSync 对象存在');
        console.log('viewSync 对象方法和属性:', Object.keys(window.viewSync));
        
        // 列出所有可用方法
        const methods = Object.entries(window.viewSync).filter(([key, value]) => typeof value === 'function');
        console.log(`✅ viewSync 可用方法 (${methods.length}个):`, methods.map(([key]) => key));
      } else {
        console.error('❌ viewSync 对象不存在，检查加载顺序');
      }
      
      // 检查共享数据
      if (window.viewSync && window.viewSync.sharedData) {
        console.log('✅ viewSync.sharedData 存在');
        console.log('sharedData 内容类型:', typeof window.viewSync.sharedData);
        if (typeof window.viewSync.sharedData === 'object') {
          console.log('sharedData 属性:', Object.keys(window.viewSync.sharedData));
        }
      } else if (window.sharedGraphData) {
        console.log('✅ sharedGraphData 存在');
        console.log('sharedGraphData 内容类型:', typeof window.sharedGraphData);
        if (typeof window.sharedGraphData === 'object') {
          console.log('sharedGraphData 属性:', Object.keys(window.sharedGraphData));
        }
      } else {
        console.warn('⚠️ 共享数据未找到');
      }
      
      // 检查当前视图模式
      if (window.neo4jEditor && window.neo4jEditor.currentViewMode) {
        console.log(`✅ neo4jEditor.currentViewMode: ${window.neo4jEditor.currentViewMode}`);
      } else if (typeof window.currentViewMode !== 'undefined') {
        console.log(`✅ currentViewMode: ${window.currentViewMode}`);
      } else {
        console.warn('⚠️ 视图模式未定义');
      }
      
      // 检查Cytoscape实例
      if (window.viewSync && window.viewSync.networkCy) {
        console.log('✅ viewSync.networkCy (网络图视图Cytoscape实例) 存在');
      } else if (window.cy) {
        console.log('✅ window.cy (主视图Cytoscape实例) 存在');
      } else {
        console.warn('⚠️ 网络图视图Cytoscape实例不存在');
      }
      
      if (window.viewSync && window.viewSync.treeCy) {
        console.log('✅ viewSync.treeCy (树视图Cytoscape实例) 存在');
      } else if (window.cyTree) {
        console.log('✅ window.cyTree (树视图Cytoscape实例) 存在');
      } else {
        console.warn('⚠️ 树视图Cytoscape实例不存在');
      }
      
      // 检查全局cytoscapeInstances
      if (window.cytoscapeInstances) {
        console.log('✅ window.cytoscapeInstances 存在');
        console.log('Cytoscape instances keys:', Object.keys(window.cytoscapeInstances));
      }
      
      // 尝试调用初始化方法
      if (window.viewSync && typeof window.viewSync.initializeDualViews === 'function') {
        console.log('✅ 尝试调用 initializeDualViews 方法...');
        try {
          const result = window.viewSync.initializeDualViews();
          console.log('✅ initializeDualViews 方法调用成功，返回值:', result);
        } catch (e) {
          console.log('⚠️ initializeDualViews 可能已初始化，错误:', e.message);
        }
      } else if (window.viewSync && typeof window.viewSync.switchViewMode === 'function') {
        console.log('✅ 尝试调用 switchViewMode 方法...');
        try {
          const result = window.viewSync.switchViewMode('dual');
          console.log('✅ switchViewMode 方法调用成功，返回值:', result);
        } catch (e) {
          console.log('⚠️ switchViewMode 调用失败:', e.message);
        }
      } else {
        console.warn('⚠️ 视图初始化方法未找到或已初始化');
      }
      
      // 检查视图容器
      const treeView = document.getElementById('cy-tree');
      const networkView = document.getElementById('cy-network');
      const mainView = document.getElementById('cy');
      
      if (mainView) {
        console.log(`✅ 主视图容器存在，类型: ${mainView.tagName}`);
      } else {
        console.log('⚠️ 主视图容器不存在，使用双视图容器');
      }
      
      if (treeView) {
        console.log(`✅ 树视图容器存在，类型: ${treeView.tagName}`);
      } else {
        console.error('❌ 树视图容器不存在');
      }
      
      if (networkView) {
        console.log(`✅ 网络图视图容器存在，类型: ${networkView.tagName}`);
      } else {
        console.error('❌ 网络图视图容器不存在');
      }
      
      // 输出Cytoscape库状态
      console.log('Cytoscape library loaded:', typeof window.cytoscape !== 'undefined');
      
      // 尝试同步测试
      if (window.viewSync && typeof window.viewSync.syncData === 'function') {
        console.log('✅ 尝试调用 syncData 方法...');
        try {
          window.viewSync.syncData();
          console.log('✅ syncData 方法调用成功');
        } catch (e) {
          console.log('⚠️ syncData 调用失败:', e.message);
        }
      }
      
    } catch (error) {
      console.error('Error in viewSync test:', error);
      console.error('错误堆栈:', error.stack);
    }
  }, 1000); // 延迟1秒执行，确保所有脚本都已加载
});