import BaseRenderer from './baseRenderer.js';
import EventBus from '../common/EventBus.js';
import * as d3 from '../../d3.min.js';

// 创建获取事件总线实例的辅助函数
const getEventBusInstance = () => EventBus.getInstance();
  /**
   * 层级树画布渲染器
   * @class TreeCanvas
   * @extends BaseRenderer
   */
  class TreeCanvas extends BaseRenderer {
    /**
   * 构造函数
   * @param {HTMLElement|string} container - 容器元素或ID
   * @param {Object} config - 配置选项
   */
  constructor(container, config = {}) {
    // 合并默认配置
    const defaultConfig = {
        nodeRadius: 20,
        nodePadding: 40,
        levelPadding: 60,
        highlightColor: '#007bff',
        relationshipType: 'CHILD_OF',
        rootNodeClass: 'root-node',
        leafNodeClass: 'leaf-node'
    }
    
    super(container, { ...defaultConfig, ...config });
    
    // 树形布局相关
    this.nodes = new Map();
    this.edges = new Map();
    this.roots = [];
    this.nodePositions = new Map();
    this.treeStructure = null;
    
    // 初始化事件总线
    this.eventBus = config.eventBus || getEventBusInstance() || {
      on: () => {},
      emit: () => {}
    };
    
    // 初始化事件订阅
    this._initEventSubscriptions();
    }
    
    /**
     * 渲染树数据
     * @param {Object} graphData - 图数据对象
     */
    render(graphData) {
      if (!graphData || !graphData.nodes) {
        console.warn('无效的图数据');
        return;
      }
      
      // 清空现有内容
      this.clear();
      
      // 初始化数据结构
      this.nodes.clear();
      this.edges.clear();
      this.roots = [];
      this.nodePositions.clear();
      
      // 构建节点映射
      graphData.nodes.forEach(node => {
        this.nodes.set(node.id, node);
      });
      
      // 构建树结构
      this.treeStructure = this._buildTreeStructure(graphData);
      
      // 计算节点位置
      this._calculatePositions();
      
      // 渲染连线
      this._renderEdges();
      
      // 渲染节点
      this._renderNodes();
      
      // 适应内容大小
      this.fitToContent();
      
      // 使用事件总线发送渲染完成事件
      this.eventBus.emit('renderComplete', { nodes: this.nodes.size, edges: this.edges.size, canvasType: 'Tree Canvas' });
    }
    
    /**
     * 构建树结构
     * @private
     * @param {Object} graphData - 图数据
     * @returns {Object} 树结构
     */
    _buildTreeStructure(graphData) {
      // 创建节点的子节点映射
      const childMap = new Map();
      const hasParent = new Set();
      
      // 初始化每个节点的子节点数组
      this.nodes.forEach(node => {
        childMap.set(node.id, []);
      });
      
      // 处理CHILD_OF关系
      if (graphData.edges) {
        graphData.edges.forEach(edge => {
          if (edge.type === this.config.relationshipType) {
            const parentId = edge.startNodeId;
            const childId = edge.endNodeId;
            
            if (this.nodes.has(parentId) && this.nodes.has(childId)) {
              childMap.get(parentId).push(childId);
              hasParent.add(childId);
              this.edges.set(edge.id, edge);
            }
          }
        });
      }
      
      // 找出根节点（没有父节点的节点）
      this.roots = [];
      this.nodes.forEach(node => {
        if (!hasParent.has(node.id)) {
          this.roots.push(node.id);
        }
      });
      
      // 如果没有找到根节点，使用所有节点作为根节点
      if (this.roots.length === 0 && this.nodes.size > 0) {
        this.nodes.forEach(node => {
          this.roots.push(node.id);
        });
      }
      
      return { childMap, roots: this.roots };
    }
    
    /**
     * 计算节点位置（垂直树）
     * @private
     */
    _calculatePositions() {
      const { nodePadding, levelPadding } = this.config;
      let currentX = levelPadding;
      
      // 为每个根节点计算子树布局
      this.roots.forEach(rootId => {
        // 计算子树的宽度
        const subtreeWidth = this._calculateSubtreeWidth(rootId, this.treeStructure.childMap);
        
        // 居中布局子树
        const subtreeStartX = currentX + (subtreeWidth - nodePadding) / 2;
        
        // 递归计算位置
        this._calculateNodePositions(rootId, subtreeStartX, levelPadding, 0, this.treeStructure.childMap);
        
        // 更新下一个子树的起始位置
        currentX += subtreeWidth + levelPadding * 2;
      });
    }
    
    /**
     * 计算子树宽度
     * @private
     * @param {string} nodeId - 节点ID
     * @param {Map} childMap - 子节点映射
     * @returns {number} 子树宽度
     */
    _calculateSubtreeWidth(nodeId, childMap) {
      const children = childMap.get(nodeId);
      
      if (children.length === 0) {
        return this.config.nodePadding;
      }
      
      let totalWidth = 0;
      
      children.forEach(childId => {
        totalWidth += this._calculateSubtreeWidth(childId, childMap) + this.config.nodePadding;
      });
      
      return Math.max(this.config.nodePadding, totalWidth - this.config.nodePadding);
    }
    
    /**
     * 递归计算节点位置
     * @private
     * @param {string} nodeId - 节点ID
     * @param {number} x - X坐标
     * @param {number} y - Y坐标
     * @param {number} level - 层级
     * @param {Map} childMap - 子节点映射
     */
    _calculateNodePositions(nodeId, x, y, level, childMap) {
      // 保存当前节点位置
      this.nodePositions.set(nodeId, { x, y });
      
      const children = childMap.get(nodeId);
      if (children.length === 0) return;
      
      // 计算子节点的总宽度
      let totalChildWidth = 0;
      children.forEach(childId => {
        totalChildWidth += this._calculateSubtreeWidth(childId, childMap);
      });
      
      // 如果有多个子节点，需要考虑节点间距
      if (children.length > 1) {
        totalChildWidth += (children.length - 1) * this.config.nodePadding;
      }
      
      // 计算起始位置（居中布局）
      let currentX = x - totalChildWidth / 2;
      
      // 递归计算子节点位置
      children.forEach(childId => {
        const childWidth = this._calculateSubtreeWidth(childId, childMap);
        const childX = currentX + childWidth / 2;
        const childY = y + this.config.levelPadding;
        
        this._calculateNodePositions(childId, childX, childY, level + 1, childMap);
        
        currentX += childWidth + this.config.nodePadding;
      });
    }
    
    /**
     * 渲染节点
     * @private
     */
    _renderNodes() {
      // 准备节点数据数组
      const nodesData = Array.from(this.nodes.entries()).map(([id, node]) => {
        const pos = this.nodePositions.get(id);
        if (!pos) return null;
        
        return {
          id: node.id,
          x: pos.x,
          y: pos.y,
          radius: this.config.nodeRadius,
          label: this._getNodeLabel(node),
          properties: node.properties,
          fill: this._getNodeFillColor(node),
          isRoot: this.roots.includes(id),
          isLeaf: this.treeStructure.childMap.get(id).length === 0,
          originalNode: node
        };
      }).filter(Boolean); // 过滤掉无效节点
      
      // 使用D3的数据绑定
      const nodeSelection = this.d3g.selectAll('.node')
        .data(nodesData, d => d.id);
      
      // 退出阶段 - 移除不再存在的节点
      nodeSelection.exit().remove();
      
      // 进入阶段 - 创建新节点
      const nodeEnter = nodeSelection.enter()
        .append('g')
        .attr('class', d => `node node-${d.id} ${d.isRoot ? this.config.rootNodeClass : ''} ${d.isLeaf ? this.config.leafNodeClass : ''}`)
        .attr('data-id', d => d.id)
        .on('click', (event, d) => {
          event.stopPropagation();
          this._onNodeClick(d.originalNode);
        });
      
      // 添加圆形背景
      nodeEnter.append('circle')
        .attr('r', d => d.radius)
        .attr('fill', d => d.fill);
      
      // 添加文本标签
      nodeEnter.append('text')
        .attr('text-anchor', 'middle')
        .attr('dominant-baseline', 'middle')
        .attr('fill', '#ffffff')
        .attr('font-size', '12px')
        .text(d => d.label);
      
      // 合并阶段 - 更新位置
      const nodeUpdate = nodeEnter.merge(nodeSelection)
        .attr('transform', d => `translate(${d.x}, ${d.y})`);
      
      // 更新圆形属性
      nodeUpdate.select('circle')
        .attr('r', d => d.radius)
        .attr('fill', d => d.fill);
      
      // 更新文本属性
      nodeUpdate.select('text')
        .text(d => d.label);
    }
    
    /**
     * 渲染连线
     * @private
     */
    _renderEdges() {
      // 准备连线数据数组
      const edgesData = Array.from(this.edges.entries()).map(([id, edge]) => {
        const sourcePos = this.nodePositions.get(edge.startNodeId);
        const targetPos = this.nodePositions.get(edge.endNodeId);
        
        if (!sourcePos || !targetPos) return null;
        
        return {
          id: edge.id,
          source: sourcePos,
          target: targetPos,
          stroke: '#adb5bd',
          strokeWidth: 2
        };
      }).filter(Boolean); // 过滤掉无效连线
      
      // 创建箭头标记
      this._createArrowMarker();
      
      // 使用D3的数据绑定
      const edgeSelection = this.d3g.selectAll('.edge')
        .data(edgesData, d => d.id);
      
      // 退出阶段 - 移除不再存在的连线
      edgeSelection.exit().remove();
      
      // 进入阶段 - 创建新连线
      const edgeEnter = edgeSelection.enter()
        .append('line')
        .attr('class', 'edge')
        .attr('data-id', d => d.id)
        .attr('marker-end', 'url(#arrowhead)')
        .attr('fill', 'none');
      
      // 合并阶段 - 更新连线属性
      const edgeUpdate = edgeEnter.merge(edgeSelection)
        .attr('x1', d => d.source.x)
        .attr('y1', d => d.source.y)
        .attr('x2', d => d.target.x)
        .attr('y2', d => d.target.y)
        .attr('stroke', d => d.stroke)
        .attr('stroke-width', d => d.strokeWidth);
    }
    
    /**
     * 创建箭头标记
     * @private
     */
    _createArrowMarker() {
      // 使用D3创建或获取defs元素
      let defs = this.d3svg.select('defs');
      if (defs.empty()) {
        defs = this.d3svg.insert('defs', 'g');
      }
      
      // 检查是否已存在箭头标记
      let marker = defs.select('#arrowhead');
      if (!marker.empty()) return;
      
      // 创建箭头标记
      marker = defs.append('marker')
        .attr('id', 'arrowhead')
        .attr('viewBox', '0 -5 10 10')
        .attr('refX', 20)
        .attr('refY', 0)
        .attr('markerWidth', 6)
        .attr('markerHeight', 6)
        .attr('orient', 'auto-start-reverse');
      
      // 添加箭头路径
      marker.append('path')
        .attr('d', 'M 0,-5 L 10,0 L 0,5')
        .attr('fill', '#adb5bd');
    }
    
    /**
     * 获取节点标签
     * @private
     * @param {Object} node - 节点对象
     * @returns {string} 节点标签
     */
    _getNodeLabel(node) {
      // 优先使用name属性
      if (node.properties && node.properties.name) {
        return node.properties.name;
      }
      
      // 其次使用第一个label
      if (node.labels && node.labels.length > 0) {
        return node.labels[0];
      }
      
      // 最后使用ID
      return node.id;
    }
    
    /**
     * 获取节点填充颜色
     * @private
     * @param {Object} node - 节点对象
     * @returns {string} 填充颜色
     */
    _getNodeFillColor(node) {
      // 根据节点类型返回不同颜色
      if (this.roots.includes(node.id)) {
        return '#007bff';  // 根节点使用蓝色
      }
      
      // 根据标签返回不同颜色
      if (node.labels && node.labels.length > 0) {
        const label = node.labels[0];
        // 使用标签的哈希值生成颜色
        const hash = this._stringToHash(label);
        const hue = Math.abs(hash) % 360;
        return `hsl(${hue}, 70%, 60%)`;
      }
      
      return '#6c757d';  // 默认颜色
    }
    
    /**
     * 字符串哈希函数
     * @private
     * @param {string} str - 输入字符串
     * @returns {number} 哈希值
     */
    _stringToHash(str) {
      let hash = 0;
      if (str.length === 0) return hash;
      
      for (let i = 0; i < str.length; i++) {
        const char = str.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash; // Convert to 32bit integer
      }
      
      return hash;
    }
    
    /**
     * 初始化事件订阅
     * @private
     */
    _initEventSubscriptions() {
      // 订阅数据变更事件
      this.eventBus.on('dataChanged', () => {
        console.log('TreeCanvas: Received dataChanged event');
        // 通常由外部管理器负责重新渲染，但这里也可以添加处理
      });
      
      // 订阅选择节点事件
      this.eventBus.on('selectNode', (nodeId) => {
        console.log('TreeCanvas: Received selectNode event for id:', nodeId);
        this._selectNode(nodeId);
      });
      
      // 订阅清除选择事件
      this.eventBus.on('clearSelection', () => {
        console.log('TreeCanvas: Received clearSelection event');
        this._clearSelection();
      });
      
      // 订阅缩放事件
      this.eventBus.on('zoomToFit', () => {
        console.log('TreeCanvas: Received zoomToFit event');
        this.fitToContent();
      });
      
      // 订阅重置视图事件
      this.eventBus.on('resetView', () => {
        console.log('TreeCanvas: Received resetView event');
        this.resetView();
      });
    }
    
    /**
     * 节点点击事件处理
     * @private
     * @param {Object} node - 被点击的节点
     */
    _onNodeClick(node) {
      // 使用D3.js的方式清除之前的高亮
      this.d3g.selectAll('.node circle')
        .attr('fill', (d) => {
          if (!d || !d.originalNode) return this.config.highlightColor; // 安全检查
          return this._getNodeFillColor(d.originalNode);
        });
      
      // 使用D3.js的方式高亮当前节点
      this.d3g.select(`.node[data-id="${node.id}"] circle`)
        .attr('fill', this.config.highlightColor);
      
      // 使用事件总线发送节点点击事件
      this.eventBus.emit('nodeClick', { node, canvasType: 'Tree Canvas' });
    }
    
    /**
     * 选择指定节点
     * @private
     * @param {string} nodeId - 节点ID
     */
    _selectNode(nodeId) {
      // 清除之前的选择
      this._clearSelection();
      
      // 高亮选中的节点
      this.d3g.select(`.node[data-id="${nodeId}"] circle`)
        .attr('fill', this.config.highlightColor);
    }
    
    /**
     * 清除所有选择
     * @private
     */
    _clearSelection() {
      this.d3g.selectAll('.node circle')
        .attr('fill', (d) => {
          if (!d || !d.originalNode) return '#6c757d'; // 安全检查和默认颜色
          return this._getNodeFillColor(d.originalNode);
        });
    }
    
    /**
     * 查找节点
     * @param {string} nodeId - 节点ID
     * @returns {Object|null} 节点对象
     */
    findNode(nodeId) {
      return this.nodes.get(nodeId) || null;
    }
    
    /**
     * 查找节点位置
     * @param {string} nodeId - 节点ID
     * @returns {Object|null} 位置对象
     */
    getNodePosition(nodeId) {
      return this.nodePositions.get(nodeId) || null;
    }
    
    /**
     * 导出当前布局数据
     * @returns {Object} 布局数据
     */
    exportLayout() {
      const layoutData = {
        nodePositions: Array.from(this.nodePositions.entries()).map(([id, pos]) => ({
          id,
          x: pos.x,
          y: pos.y
        })),
        roots: this.roots,
        structure: this.treeStructure
      };
      
      return layoutData;
    }
    
    /**
     * 导入布局数据
     * @param {Object} layoutData - 布局数据
     */
    importLayout(layoutData) {
      if (!layoutData || !layoutData.nodePositions) return;
      
      // 恢复节点位置
      layoutData.nodePositions.forEach(({ id, x, y }) => {
        this.nodePositions.set(id, { x, y });
      });
      
      // 恢复根节点
      if (layoutData.roots) {
        this.roots = layoutData.roots;
      }
      
      // 重新渲染
      this.clear();
      this._renderEdges();
      this._renderNodes();
    }
    
    /**
     * 重置视图到默认状态
     * 将缩放比例重置为1，并将平移位置重置为原点
     */
    resetView() {
      // 重置缩放和平移
      this.currentScale = 1;
      this.currentTranslate = { x: 0, y: 0 };
      
      // 更新变换
      this._updateTransform();
      
      // 触发事件
      // 使用事件总线发送缩放事件
      this.eventBus.emit('zoom', { 
        scale: this.currentScale, 
        translate: { ...this.currentTranslate },
        canvasType: 'Tree Canvas' 
      });
    }
  }
  
  export default TreeCanvas;