/**
 * 渲染器模块主入口
 * 提供便捷的初始化方法
 */

import BaseRenderer from './baseRenderer.js';
import TreeCanvas from './treeCanvas.js';
import NetworkCanvas from './networkCanvas.js';
console.log('render/index loaded')
/**
 * 生成唯一ID的工具函数
 * @param {string} prefix - ID前缀
 * @returns {string} 唯一ID
 */
function generateUniqueId(prefix = '') {
  return prefix + Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
}

/**
 * 创建树画布渲染器
 * @param {string|HTMLElement} container - 容器元素ID或DOM元素
 * @param {Object} options - 配置选项
 * @returns {TreeCanvas} 树画布渲染器实例
 */
function createTreeCanvas(container, options = {}) {
  console.log('tree:', TreeCanvas);
  if (!TreeCanvas) {
    throw new Error('TreeCanvas 模块未加载');
  }
  
  const treeCanvas = new TreeCanvas(container);
  
  // 应用配置选项
  if (options.config && typeof treeCanvas.updateConfig === 'function') {
    treeCanvas.updateConfig(options.config);
  }
  console.log('treeCanvas:', treeCanvas);
  return treeCanvas;
}

/**
 * 创建关系网画布渲染器
 * @param {string|HTMLElement} container - 容器元素ID或DOM元素
 * @param {Object} options - 配置选项
 * @returns {NetworkCanvas} 关系网画布渲染器实例
 */
function createNetworkCanvas(container, options = {}) {
  if (!NetworkCanvas) {
    throw new Error('NetworkCanvas 模块未加载');
  }
  
  const networkCanvas = new NetworkCanvas(container);
  
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
 * @param {Object} containerIds - 容器ID对象 { tree: string|HTMLElement, network: string|HTMLElement }
 * @param {Object} options - 配置选项
 * @returns {Object} 包含两个渲染器实例的对象
 */
function createDualViewRenderer(containerIds, options = {}) {
  if (!containerIds || !containerIds.tree || !containerIds.network) {
    throw new Error('必须提供 tree 和 network 容器');
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
     * 重置两个视图
     */
    resetView() {
      if (typeof treeCanvas.resetView === 'function') {
        treeCanvas.resetView();
      }
      if (typeof networkCanvas.resetView === 'function') {
        networkCanvas.resetView();
      }
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

// 暴露到全局作用域，以便直接通过script标签引入时也能使用
if (typeof window !== 'undefined') {
  // 暴露创建函数
  window.createTreeCanvas = createTreeCanvas;
  window.createNetworkCanvas = createNetworkCanvas;
  window.createDualViewRenderer = createDualViewRenderer;
  
  // 暴露类（如果它们在作用域中可用）
  if (typeof TreeCanvas !== 'undefined') {
    window.TreeCanvas = TreeCanvas;
  }
  if (typeof NetworkCanvas !== 'undefined') {
    window.NetworkCanvas = NetworkCanvas;
  }
  
  // 暴露整个API对象
  window.Neo4jRenderers = Neo4jRenderers;
}

export default Neo4jRenderers;
