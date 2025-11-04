/**
 * 渲染器模块主入口
 * 提供便捷的初始化方法
 */

// 确保在浏览器环境中正常工作
if (typeof window === 'undefined') {
  // Node.js环境中的兼容性处理
  globalThis.window = {};
}

// 生成唯一ID的工具函数
function generateUniqueId(prefix = '') {
  return prefix + Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
}

/**
 * 创建树画布渲染器
 * @param {string} containerId - 容器元素ID
 * @param {Object} options - 配置选项
 * @returns {TreeCanvas} 树画布渲染器实例
 */
function createTreeCanvas(containerId, options = {}) {
  if (!window.TreeCanvas) {
    throw new Error('TreeCanvas 模块未加载');
  }
  
  const treeCanvas = new window.TreeCanvas(containerId);
  
  // 应用配置选项
  if (options.config && typeof treeCanvas.updateConfig === 'function') {
    treeCanvas.updateConfig(options.config);
  }
  
  return treeCanvas;
}

/**
 * 创建关系网画布渲染器
 * @param {string} containerId - 容器元素ID
 * @param {Object} options - 配置选项
 * @returns {NetworkCanvas} 关系网画布渲染器实例
 */
function createNetworkCanvas(containerId, options = {}) {
  if (!window.NetworkCanvas) {
    throw new Error('NetworkCanvas 模块未加载');
  }
  
  const networkCanvas = new window.NetworkCanvas(containerId);
  
  // 应用配置选项
  if (options.config && typeof networkCanvas.updateConfig === 'function') {
    networkCanvas.updateConfig(options.config);
  }
  
  if (options.layout && typeof networkCanvas.setLayoutType === 'function') {
    networkCanvas.setLayoutType(options.layout);
  }
  
  return networkCanvas;
}

/**
 * 创建双视图渲染器（同时包含树视图和关系网视图）
 * @param {Object} containerIds - 容器ID对象 { tree: string, network: string }
 * @param {Object} options - 配置选项
 * @returns {Object} 包含两个渲染器实例的对象
 */
function createDualViewRenderer(containerIds, options = {}) {
  if (!containerIds || !containerIds.tree || !containerIds.network) {
    throw new Error('必须提供 tree 和 network 容器ID');
  }
  
  const treeCanvas = createTreeCanvas(containerIds.tree, options.treeOptions);
  const networkCanvas = createNetworkCanvas(containerIds.network, options.networkOptions);
  
  return {
    treeCanvas,
    networkCanvas,
    
    /**
     * 同时渲染两个视图
     * @param {Object} data - 图数据
     * @param {Object} context - 上下文（仅对关系网视图有效）
     */
    render(data, context = null) {
      treeCanvas.render(data);
      networkCanvas.render(data, context);
    },
    
    /**
     * 销毁两个渲染器
     */
    destroy() {
      if (typeof treeCanvas.destroy === 'function') {
        treeCanvas.destroy();
      }
      if (typeof networkCanvas.destroy === 'function') {
        networkCanvas.destroy();
      }
    }
  };
}

/**
 * 生成模拟数据
 * @param {number} nodeCount - 节点数量
 * @param {number} edgeCount - 边数量
 * @returns {Object} 模拟图数据
 */
function generateMockData(nodeCount = 10, edgeCount = 15) {
  const nodes = [];
  const edges = [];
  
  // 生成节点
  for (let i = 0; i < nodeCount; i++) {
    nodes.push({
      id: `node_${i}`,
      label: `Node ${i}`,
      color: `hsl(${(i * 36) % 360}, 70%, 60%)`
    });
  }
  
  // 生成边（确保连接性）
  for (let i = 1; i < nodeCount; i++) {
    edges.push({
      id: `edge_${i-1}`,
      source: `node_${Math.floor(i/2)}`,
      target: `node_${i}`,
      label: `RELATES_TO`,
      color: '#95a5a6'
    });
  }
  
  // 生成额外的随机边
  const extraEdges = Math.max(0, edgeCount - (nodeCount - 1));
  for (let i = 0; i < extraEdges; i++) {
    const sourceIndex = Math.floor(Math.random() * nodeCount);
    let targetIndex;
    do {
      targetIndex = Math.floor(Math.random() * nodeCount);
    } while (sourceIndex === targetIndex);
    
    edges.push({
      id: `edge_extra_${i}`,
      source: `node_${sourceIndex}`,
      target: `node_${targetIndex}`,
      label: `CONNECTS`,
      color: '#7f8c8d'
    });
  }
  
  return { nodes, edges };
}

/**
 * 导出的公共API
 */
const Neo4jRenderers = {
  createTreeCanvas,
  createNetworkCanvas,
  createDualViewRenderer,
  generateMockData
};

// 导出模块
if (typeof module !== 'undefined' && module.exports) {
  module.exports = Neo4jRenderers;
} else if (typeof window !== 'undefined') {
  window.Neo4jRenderers = Neo4jRenderers;
}

// 自动加载必要的脚本（仅在浏览器环境中）
if (typeof window !== 'undefined' && !window.BaseRenderer) {
  (function loadRequiredScripts() {
    const scripts = [
      'js/render/baseRenderer.js',
      'js/render/treeCanvas.js',
      'js/render/networkCanvas.js'
    ];
    
    let loadedCount = 0;
    
    scripts.forEach(scriptPath => {
      const script = document.createElement('script');
      script.src = scriptPath;
      script.onload = () => {
        loadedCount++;
        if (loadedCount === scripts.length) {
          // 所有脚本加载完成后更新API引用
          console.log('渲染器脚本加载完成');
        }
      };
      document.head.appendChild(script);
    });
  })();
}
