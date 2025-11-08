
import BaseRenderer from './baseRenderer.js';
import EventBus from '../common/EventBus.js';
import * as d3 from '../../d3.min.js';

// 创建获取事件总线实例的辅助函数
const getEventBusInstance = () => EventBus.getInstance();
  /**
   * 关系网络视图渲染器类
   * 实现多种布局模式的图数据可视化
   * @class NetworkCanvas
   * @extends BaseRenderer
   */
  class NetworkCanvas extends BaseRenderer {
    /**
     * 构造函数
     * @param {HTMLElement} container - 容器元素
     * @param {Object} config - 配置选项
     */
    constructor(container, config = {}) {
      const networkConfig = {
        ...NetworkCanvas.DEFAULT_CONFIG,
        ...config
      };
      
      super(container, networkConfig);
      
      // 网络布局相关属性
      this.layoutType = networkConfig.layoutType;
      this.nodePositions = new Map();
      this.nodeSize = networkConfig.nodeSize;
      
      // 力导向布局参数
      this.forceLayoutConfig = {
        ...NetworkCanvas.DEFAULT_FORCE_CONFIG,
        ...networkConfig.forceLayoutConfig
      };
      
      // 网格布局参数
      this.gridLayoutConfig = {
        ...NetworkCanvas.DEFAULT_GRID_CONFIG,
        ...networkConfig.gridLayoutConfig
      };
      
      // 环形布局参数
      this.circularLayoutConfig = {
        ...NetworkCanvas.DEFAULT_CIRCULAR_CONFIG,
        ...networkConfig.circularLayoutConfig
      };
      
      // 力导向模拟状态
      this.forceSimulation = null;
      this.isSimulating = false;
      this.simulationStep = 0;
      this.maxSimulationSteps = networkConfig.maxSimulationSteps;
      
      // 初始化事件总线
      this.eventBus = config.eventBus || getEventBusInstance() || { on: () => {}, emit: () => {} };
      
      // 初始化事件订阅
      this._initEventSubscriptions();
    }
    
    /**
     * 默认配置
     */
    static get DEFAULT_CONFIG() {
      return {
        ...BaseRenderer.DEFAULT_CONFIG,
        layoutType: 'force', // force, grid, circular
        nodeSize: 40,
        defaultNodeFill: '#6c5ce7',
        defaultNodeStroke: '#5f3dc4',
        defaultEdgeStroke: '#95a5a6',
        defaultEdgeWidth: 2,
        maxSimulationSteps: 1000,
        forceLayoutConfig: {},
        gridLayoutConfig: {},
        circularLayoutConfig: {}
      };
    }
    
    /**
     * 默认力导向布局配置
     */
    static get DEFAULT_FORCE_CONFIG() {
      return {
        linkDistance: 100,
        chargeStrength: -300,
        gravity: 0.1,
        friction: 0.9,
        alpha: 1,
        alphaDecay: 0.0228,
        alphaTarget: 0
      };
    }
    
    /**
     * 默认网格布局配置
     */
    static get DEFAULT_GRID_CONFIG() {
      return {
        rows: null, // 自动计算
        cols: null, // 自动计算
        spacing: 80
      };
    }
    
    /**
     * 默认环形布局配置
     */
    static get DEFAULT_CIRCULAR_CONFIG() {
      return {
        radius: null, // 自动计算
        startAngle: 0,
        endAngle: 2 * Math.PI
      };
    }
    
    /**
     * 渲染数据
     * @param {Object} data - 包含nodes和edges的数据对象
     * @param {Object} context - 渲染上下文（可选）
     */
    render(data, context = {}) {
      if (!data || !data.nodes || !data.edges) {
        throw new Error('无效的数据格式，必须包含nodes和edges字段');
      }
      
      // 清空之前的内容
      this.clear();
      
      try {
        // 根据上下文过滤数据（如果需要）
        const filteredData = this.filterDataByContext(data, context);
        
        // 计算布局
        const layoutData = this.calculateLayout(filteredData);
        
        // 渲染节点和连线
        this.renderEdges(layoutData.edges);
        this.renderNodes(layoutData.nodes);
        
        // 添加箭头定义
        this.addArrowhead();
        
        // 适应内容大小
        if (this.layoutType !== 'force') {
          this.fitToContent();
        }
        
        this._emitEvent('renderComplete', { data: layoutData, context });
      } catch (error) {
        console.error('渲染网络布局时出错:', error);
        this._emitEvent('renderError', { error, context });
      }
    }
    
    /**
     * 根据上下文过滤数据
     * @param {Object} data - 原始数据
     * @param {Object} context - 上下文对象
     * @returns {Object} 过滤后的数据
     */
    filterDataByContext(data, context) {
      // 如果没有指定过滤条件，返回原始数据
      if (!context.filter) {
        return data;
      }
      
      const { nodeFilter, edgeFilter } = context.filter;
      let filteredNodes = data.nodes;
      let filteredEdges = data.edges;
      
      // 过滤节点
      if (nodeFilter && typeof nodeFilter === 'function') {
        filteredNodes = filteredNodes.filter(node => nodeFilter(node));
      }
      
      // 创建节点ID集合以便快速查找
      const nodeIdSet = new Set(filteredNodes.map(node => node.id));
      
      // 过滤边（只保留两端节点都在过滤后的节点集合中的边）
      if (edgeFilter && typeof edgeFilter === 'function') {
        filteredEdges = filteredEdges.filter(edge => 
          nodeIdSet.has(edge.startNodeId || edge.source) && 
          nodeIdSet.has(edge.endNodeId || edge.target) &&
          edgeFilter(edge)
        );
      } else {
        // 默认只过滤掉连接到不存在节点的边
        filteredEdges = filteredEdges.filter(edge => 
          nodeIdSet.has(edge.startNodeId || edge.source) && 
          nodeIdSet.has(edge.endNodeId || edge.target)
        );
      }
      
      return {
        nodes: filteredNodes,
        edges: filteredEdges
      };
    }
    
    /**
     * 计算布局
     * @param {Object} data - 数据对象
     * @returns {Object} 包含布局信息的数据对象
     */
    calculateLayout(data) {
      let layoutData;
      
      switch (this.layoutType) {
        case 'grid':
          layoutData = this.calculateGridLayout(data);
          break;
        case 'circular':
          layoutData = this.calculateCircularLayout(data);
          break;
        case 'force':
        default:
          layoutData = this.calculateForceLayout(data);
          break;
      }
      
      return layoutData;
    }
    
    /**
     * 计算力导向布局
     * @param {Object} data - 数据对象
     * @returns {Object} 布局后的数据
     */
    calculateForceLayout(data) {
      const { linkDistance, chargeStrength, gravity } = this.forceLayoutConfig;
      
      // 重置节点位置
      this.nodePositions.clear();
      
      // 创建节点映射和位置
      const width = this.svg.clientWidth || 800;
      const height = this.svg.clientHeight || 600;
      
      // 初始化节点数据
      const nodes = data.nodes.map(node => ({
        id: node.id,
        label: node.label || node.properties?.name || node.id,
        radius: this.nodeSize / 2,
        fill: node.fill || this.config.defaultNodeFill,
        stroke: node.stroke || this.config.defaultNodeStroke,
        mass: node.mass || 1,
        originalData: node // 保存原始数据
      }));
      
      // 创建边数据
      const edges = data.edges.map(edge => ({
        id: edge.id,
        source: edge.startNodeId || edge.source,
        target: edge.endNodeId || edge.target,
        stroke: edge.stroke || this.config.defaultEdgeStroke,
        strokeWidth: edge.width || this.config.defaultEdgeWidth,
        distance: edge.distance || linkDistance,
        originalData: edge // 保存原始数据
      })).filter(edge => edge.source && edge.target); // 过滤掉无效的边
      
      // 使用D3的力导向模拟
      this._createD3ForceSimulation(nodes, edges, width, height);
      
      return { nodes, edges };
    }
    
    /**
     * 使用D3.js创建力导向模拟
     * @private
     * @param {Array} nodes - 节点数组
     * @param {Array} edges - 边数组
     * @param {number} width - 宽度
     * @param {number} height - 高度
     */
    _createD3ForceSimulation(nodes, edges, width, height) {
      const { chargeStrength, gravity } = this.forceLayoutConfig;
      
      // 停止之前的模拟（如果存在）
      if (this.forceSimulation) {
        this.forceSimulation.stop();
      }
      
      // 创建力导向模拟
      this.forceSimulation = d3.forceSimulation(nodes)
        .force('link', d3.forceLink(edges)
          .id(d => d.id)
          .distance(d => d.distance)
          .strength(0.7)
        )
        .force('charge', d3.forceManyBody()
          .strength(chargeStrength)
          .distanceMin(this.nodeSize)
          .distanceMax(Math.min(width, height) * 2)
        )
        .force('center', d3.forceCenter(width / 2, height / 2)
          .strength(gravity)
        )
        .force('collision', d3.forceCollide()
          .radius(d => d.radius + 5)
          .strength(0.7)
        )
        .alpha(1)
        .alphaDecay(0.0228)
        .alphaTarget(0)
        .velocityDecay(0.4);
      
      // 模拟开始
      this.isSimulating = true;
      this.simulationStep = 0;
      
      // 监听tick事件，更新节点位置
      this.forceSimulation.on('tick', () => {
        // 更新节点位置映射
        nodes.forEach(node => {
          this.nodePositions.set(node.id, { x: node.x, y: node.y });
        });
        
        // 更新显示
        this._updatePositions(nodes, edges);
        
        this.simulationStep++;
        
        // 限制最大步数
        if (this.simulationStep >= this.maxSimulationSteps) {
          this.forceSimulation.stop();
          this.isSimulating = false;
          this._emitEvent('forceSimulationComplete');
        }
      });
      
      // 模拟结束事件
      this.forceSimulation.on('end', () => {
        this.isSimulating = false;
        this._emitEvent('forceSimulationComplete');
      });
    }
    
    /**
     * 应用力到节点
     * @private
     * @param {Array} nodes - 节点数组
     * @param {Array} edges - 边数组
     * @param {number} chargeStrength - 电荷强度
     * @param {number} gravity - 重力强度
     */
    _applyForces(nodes, edges, chargeStrength, gravity) {
      const width = this.svg.clientWidth || 800;
      const height = this.svg.clientHeight || 600;
      const centerX = width / 2;
      const centerY = height / 2;
      
      // 重置速度
      nodes.forEach(node => {
        node.vx = 0;
        node.vy = 0;
      });
      
      // 应用斥力（节点之间的斥力）
      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          const node1 = nodes[i];
          const node2 = nodes[j];
          
          let dx = node2.x - node1.x;
          let dy = node2.y - node1.y;
          const distance = Math.sqrt(dx * dx + dy * dy);
          
          // 避免除零
          if (distance > 0) {
            // 标准化方向
            dx /= distance;
            dy /= distance;
            
            // 计算斥力
            const force = (chargeStrength * node1.mass * node2.mass) / (distance * distance);
            
            // 应用斥力
            node1.vx -= dx * force / node1.mass;
            node1.vy -= dy * force / node1.mass;
            node2.vx += dx * force / node2.mass;
            node2.vy += dy * force / node2.mass;
          }
        }
      }
      
      // 应用引力（边的引力）
      edges.forEach(edge => {
        const source = edge.source;
        const target = edge.target;
        
        let dx = target.x - source.x;
        let dy = target.y - source.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        // 避免除零
        if (distance > 0) {
          // 标准化方向
          dx /= distance;
          dy /= distance;
          
          // 计算引力
          const targetDistance = edge.distance || 100;
          const force = (distance - targetDistance) * 0.1;
          
          // 应用引力
          source.vx += dx * force / source.mass;
          source.vy += dy * force / source.mass;
          target.vx -= dx * force / target.mass;
          target.vy -= dy * force / target.mass;
        }
      });
      
      // 应用中心引力
      nodes.forEach(node => {
        const dx = centerX - node.x;
        const dy = centerY - node.y;
        
        node.vx += dx * gravity;
        node.vy += dy * gravity;
      });
    }
    
    /**
     * 更新元素位置
     * @private
     * @param {Array} nodes - 节点数组
     * @param {Array} edges - 边数组
     */
    _updatePositions(nodes, edges) {
      // 更新节点位置 - 使用D3选择器
      this.d3g.selectAll(`[data-id]`) // 选择所有带data-id属性的节点
        .filter(node => {
          const element = d3.select(node);
          const nodeData = nodes.find(n => n.id === element.attr('data-id'));
          return nodeData; // 只处理当前数据中的节点
        })
        .attr('transform', node => {
          const element = d3.select(node);
          const nodeData = nodes.find(n => n.id === element.attr('data-id'));
          return nodeData ? `translate(${nodeData.x}, ${nodeData.y})` : '';
        });
      
      // 更新边位置 - 使用D3选择器
      this.d3g.selectAll('line.edge')
        .filter(edge => {
          const element = d3.select(edge);
          const edgeData = edges.find(e => e.id === element.attr('data-id'));
          return edgeData; // 只处理当前数据中的边
        })
        .attr('x1', edge => {
          const element = d3.select(edge);
          const edgeData = edges.find(e => e.id === element.attr('data-id'));
          return edgeData && edgeData.source ? (typeof edgeData.source === 'object' ? edgeData.source.x : nodes.find(n => n.id === edgeData.source)?.x || 0) : 0;
        })
        .attr('y1', edge => {
          const element = d3.select(edge);
          const edgeData = edges.find(e => e.id === element.attr('data-id'));
          return edgeData && edgeData.source ? (typeof edgeData.source === 'object' ? edgeData.source.y : nodes.find(n => n.id === edgeData.source)?.y || 0) : 0;
        })
        .attr('x2', edge => {
          const element = d3.select(edge);
          const edgeData = edges.find(e => e.id === element.attr('data-id'));
          return edgeData && edgeData.target ? (typeof edgeData.target === 'object' ? edgeData.target.x : nodes.find(n => n.id === edgeData.target)?.x || 0) : 0;
        })
        .attr('y2', edge => {
          const element = d3.select(edge);
          const edgeData = edges.find(e => e.id === element.attr('data-id'));
          return edgeData && edgeData.target ? (typeof edgeData.target === 'object' ? edgeData.target.y : nodes.find(n => n.id === edgeData.target)?.y || 0) : 0;
        });
    }
    
    /**
     * 计算网格布局
     * @param {Object} data - 数据对象
     * @returns {Object} 布局后的数据
     */
    calculateGridLayout(data) {
      const { spacing, rows: configRows, cols: configCols } = this.gridLayoutConfig;
      const nodeCount = data.nodes.length;
      
      // 计算网格行列数
      let rows, cols;
      if (configRows && configCols) {
        rows = configRows;
        cols = configCols;
      } else if (configRows) {
        rows = configRows;
        cols = Math.ceil(nodeCount / rows);
      } else if (configCols) {
        cols = configCols;
        rows = Math.ceil(nodeCount / cols);
      } else {
        // 自动计算最优行列数
        cols = Math.ceil(Math.sqrt(nodeCount));
        rows = Math.ceil(nodeCount / cols);
      }
      
      // 计算起始位置（居中）
      const width = this.svg.clientWidth || 800;
      const height = this.svg.clientHeight || 600;
      const gridWidth = cols * spacing;
      const gridHeight = rows * spacing;
      const startX = (width - gridWidth) / 2;
      const startY = (height - gridHeight) / 2;
      
      // 重置节点位置
      this.nodePositions.clear();
      
      // 计算节点位置
      const nodes = data.nodes.map((node, index) => {
        const row = Math.floor(index / cols);
        const col = index % cols;
        
        const position = {
          id: node.id,
          label: node.label || node.properties?.name || node.id,
          x: startX + col * spacing,
          y: startY + row * spacing,
          radius: this.nodeSize / 2,
          fill: node.fill || this.config.defaultNodeFill,
          stroke: node.stroke || this.config.defaultNodeStroke
        };
        
        this.nodePositions.set(node.id, position);
        return position;
      });
      
      // 构建边
      const edges = data.edges.map(edge => {
        const sourceId = edge.startNodeId || edge.source;
        const targetId = edge.endNodeId || edge.target;
        const source = this.nodePositions.get(sourceId);
        const target = this.nodePositions.get(targetId);
        
        if (!source || !target) return null;
        
        return {
          id: edge.id,
          source,
          target,
          stroke: edge.stroke || this.config.defaultEdgeStroke,
          strokeWidth: edge.width || this.config.defaultEdgeWidth,
          arrow: true
        };
      }).filter(Boolean);
      
      return { nodes, edges };
    }
    
    /**
     * 计算环形布局
     * @param {Object} data - 数据对象
     * @returns {Object} 布局后的数据
     */
    calculateCircularLayout(data) {
      const { radius: configRadius, startAngle, endAngle } = this.circularLayoutConfig;
      const nodeCount = data.nodes.length;
      
      // 计算半径
      const width = this.svg.clientWidth || 800;
      const height = this.svg.clientHeight || 600;
      const centerX = width / 2;
      const centerY = height / 2;
      
      const radius = configRadius || Math.min(width, height) * 0.3;
      
      // 重置节点位置
      this.nodePositions.clear();
      
      // 计算角度步长
      const angleStep = nodeCount > 1 ? (endAngle - startAngle) / (nodeCount - 1) : 0;
      
      // 计算节点位置
      const nodes = data.nodes.map((node, index) => {
        const angle = startAngle + index * angleStep;
        
        const position = {
          id: node.id,
          label: node.label || node.properties?.name || node.id,
          x: centerX + radius * Math.cos(angle),
          y: centerY + radius * Math.sin(angle),
          radius: this.nodeSize / 2,
          fill: node.fill || this.config.defaultNodeFill,
          stroke: node.stroke || this.config.defaultNodeStroke
        };
        
        this.nodePositions.set(node.id, position);
        return position;
      });
      
      // 构建边
      const edges = data.edges.map(edge => {
        const sourceId = edge.startNodeId || edge.source;
        const targetId = edge.endNodeId || edge.target;
        const source = this.nodePositions.get(sourceId);
        const target = this.nodePositions.get(targetId);
        
        if (!source || !target) return null;
        
        return {
          id: edge.id,
          source,
          target,
          stroke: edge.stroke || this.config.defaultEdgeStroke,
          strokeWidth: edge.width || this.config.defaultEdgeWidth,
          arrow: true
        };
      }).filter(Boolean);
      
      return { nodes, edges };
    }
    
    /**
     * 渲染节点
     * @param {Array} nodes - 节点数组
     */
    renderNodes(nodes) {
      // 使用D3的数据绑定模式
      const nodeSelection = this.d3g.selectAll(`[data-id]`) // 选择所有节点元素
        .data(nodes, d => d.id); // 按ID绑定数据
      
      // 退出阶段 - 移除不再存在的节点
      nodeSelection.exit().remove();
      
      // 进入阶段 - 创建新节点
      const nodeEnter = nodeSelection.enter()
        .append('g') // 创建节点组
        .attr('data-id', d => d.id)
        .attr('transform', d => `translate(${d.x}, ${d.y})`)
        .call(selection => {
          // 为每个新节点添加交互事件
          selection.each((d, i, nodes) => {
            const nodeElement = nodes[i];
            this._setupNodeInteractions(nodeElement, d);
          });
        });
      
      // 为进入的节点添加圆形背景
      nodeEnter.append('circle')
        .attr('r', d => d.radius)
        .attr('fill', d => d.fill)
        .attr('stroke', d => d.stroke)
        .attr('stroke-width', 2);
      
      // 为进入的节点添加文本标签
      nodeEnter.append('text')
        .attr('text-anchor', 'middle')
        .attr('dominant-baseline', 'middle')
        .attr('fill', 'white')
        .attr('font-size', '12px')
        .text(d => {
          // 截断长标签
          const label = d.label || d.id;
          return label.length > 15 ? label.substring(0, 12) + '...' : label;
        });
      
      // 合并阶段 - 更新现有节点的位置和属性
      const nodeUpdate = nodeEnter.merge(nodeSelection)
        .attr('transform', d => `translate(${d.x}, ${d.y})`)
        .select('circle')
        .attr('r', d => d.radius)
        .attr('fill', d => d.fill)
        .attr('stroke', d => d.stroke);
      
      // 更新文本标签
      nodeEnter.merge(nodeSelection)
        .select('text')
        .text(d => {
          const label = d.label || d.id;
          return label.length > 15 ? label.substring(0, 12) + '...' : label;
        });
    }
    
    /**
     * 渲染连线
     * @param {Array} edges - 连线数组
     */
    renderEdges(edges) {
      // 使用D3的数据绑定模式
      const edgeSelection = this.d3g.selectAll('line.edge')
        .data(edges, d => d.id); // 按ID绑定数据
      
      // 退出阶段 - 移除不再存在的连线
      edgeSelection.exit().remove();
      
      // 进入阶段 - 创建新连线
      const edgeEnter = edgeSelection.enter()
        .append('line')
        .attr('class', 'edge')
        .attr('data-id', d => d.id)
        .attr('marker-end', 'url(#arrowhead)')
        .attr('fill', 'none')
        .call(selection => {
          // 为每个新连线添加交互事件
          selection.each((d, i, edges) => {
            const edgeElement = edges[i];
            this._setupEdgeInteractions(edgeElement, d);
          });
        });
      
      // 合并阶段 - 更新连线属性
      const edgeUpdate = edgeEnter.merge(edgeSelection)
        .attr('x1', d => {
          return d.source ? (typeof d.source === 'object' ? d.source.x : this.nodePositions.get(d.source)?.x || 0) : 0;
        })
        .attr('y1', d => {
          return d.source ? (typeof d.source === 'object' ? d.source.y : this.nodePositions.get(d.source)?.y || 0) : 0;
        })
        .attr('x2', d => {
          return d.target ? (typeof d.target === 'object' ? d.target.x : this.nodePositions.get(d.target)?.x || 0) : 0;
        })
        .attr('y2', d => {
          return d.target ? (typeof d.target === 'object' ? d.target.y : this.nodePositions.get(d.target)?.y || 0) : 0;
        })
        .attr('stroke', d => d.stroke || this.config.defaultEdgeStroke)
        .attr('stroke-width', d => d.strokeWidth || this.config.defaultEdgeWidth);
    }
    
    /**
     * 设置节点交互事件
     * @private
     * @param {SVGElement} element - 节点元素
     * @param {Object} nodeData - 节点数据
     */
    _setupNodeInteractions(element, nodeData) {
      element.addEventListener('click', (event) => {
        event.stopPropagation();
        this._emitEvent('nodeClick', { node: nodeData, event });
      });
      
      element.addEventListener('mouseover', (event) => {
        this._emitEvent('nodeMouseOver', { node: nodeData, event });
      });
      
      element.addEventListener('mouseout', (event) => {
        this._emitEvent('nodeMouseOut', { node: nodeData, event });
      });
    }
    
    /**
     * 设置连线交互事件
     * @private
     * @param {SVGElement} element - 连线元素
     * @param {Object} edgeData - 连线数据
     */
    _setupEdgeInteractions(element, edgeData) {
      element.addEventListener('click', (event) => {
        event.stopPropagation();
        this._emitEvent('edgeClick', { edge: edgeData, event });
      });
      
      element.addEventListener('mouseover', (event) => {
        this._emitEvent('edgeMouseOver', { edge: edgeData, event });
      });
      
      element.addEventListener('mouseout', (event) => {
        this._emitEvent('edgeMouseOut', { edge: edgeData, event });
      });
    }
    
    /**
     * 添加箭头标记
     */
    addArrowhead() {
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
        .attr('markerWidth', '10')
        .attr('markerHeight', '7')
        .attr('refX', '9')
        .attr('refY', '3.5')
        .attr('orient', 'auto');
      
      // 添加箭头多边形
      marker.append('polygon')
        .attr('points', '0 0, 10 3.5, 0 7')
        .attr('fill', '#95a5a6');
    }
    
    /**
     * 停止力导向模拟
     */
    stopForceSimulation() {
      this.isSimulating = false;
      
      // 停止D3的力导向模拟（如果存在）
      if (this.forceSimulation) {
        this.forceSimulation.stop();
      }
    }
    
    /**
     * 更改布局类型
     * @param {string} layoutType - 新的布局类型
     */
    setLayoutType(layoutType) {
      if (['force', 'grid', 'circular'].includes(layoutType)) {
        this.layoutType = layoutType;
        this.stopForceSimulation();
        return true;
      }
      return false;
    }
    
    /**
     * 更新配置
     * @param {Object} newConfig - 新的配置
     */
    updateConfig(newConfig) {
      super.updateConfig(newConfig);
      
      // 更新布局类型
      if (newConfig.layoutType !== undefined) {
        this.setLayoutType(newConfig.layoutType);
      }
      
      // 更新节点大小
      if (newConfig.nodeSize !== undefined) {
        this.nodeSize = newConfig.nodeSize;
      }
      
      // 更新力导向布局配置
      if (newConfig.forceLayoutConfig) {
        this.forceLayoutConfig = {
          ...this.forceLayoutConfig,
          ...newConfig.forceLayoutConfig
        };
      }
      
      // 更新网格布局配置
      if (newConfig.gridLayoutConfig) {
        this.gridLayoutConfig = {
          ...this.gridLayoutConfig,
          ...newConfig.gridLayoutConfig
        };
      }
      
      // 更新环形布局配置
      if (newConfig.circularLayoutConfig) {
        this.circularLayoutConfig = {
          ...this.circularLayoutConfig,
          ...newConfig.circularLayoutConfig
        };
      }
    }
    
    /**
     * 初始化事件订阅
     * @private
     */
    _initEventSubscriptions() {
      // 订阅数据变更事件
      this.eventBus.on('dataChanged', () => {
        console.log('NetworkCanvas: Received dataChanged event');
        // 通常由外部管理器负责重新渲染，但这里也可以添加处理
      });
      
      // 订阅选择节点事件
      this.eventBus.on('selectNode', (nodeId) => {
        console.log('NetworkCanvas: Received selectNode event for id:', nodeId);
        this._selectNode(nodeId);
      });
      
      // 订阅清除选择事件
      this.eventBus.on('clearSelection', () => {
        console.log('NetworkCanvas: Received clearSelection event');
        this._clearSelection();
      });
      
      // 订阅布局类型变更事件
      this.eventBus.on('changeLayoutType', (type) => {
        console.log('NetworkCanvas: Received changeLayoutType event:', type);
        this.setLayoutType(type);
      });
      
      // 订阅缩放事件
      this.eventBus.on('zoomToFit', () => {
        console.log('NetworkCanvas: Received zoomToFit event');
        this.fitToContent();
      });
      
      // 订阅重置视图事件
      this.eventBus.on('resetView', () => {
        console.log('NetworkCanvas: Received resetView event');
        this.resetView();
      });
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
        .attr('fill', '#007bff'); // 高亮颜色
    }
    
    /**
     * 清除所有选择
     * @private
     */
    _clearSelection() {
      this.d3g.selectAll('.node circle')
        .attr('fill', d => d.fill || this.config.defaultNodeFill);
    }

    /**
     * 更新节点交互事件以使用D3.js和事件总线
     * @private
     * @param {SVGElement} element - 节点元素
     * @param {Object} nodeData - 节点数据
     */
    _setupNodeInteractions(element, nodeData) {
      const d3Element = d3.select(element);
      
      d3Element.on('click', (event) => {
        event.stopPropagation();
        // 清除之前的高亮
        this.d3g.selectAll('[data-id] circle')
          .attr('fill', d => d.fill || this.config.defaultNodeFill);
          
        // 高亮当前节点
        d3Element.select('circle')
          .attr('fill', '#007bff'); // 高亮颜色
          
        // 使用实例的eventBus发出事件
        this.eventBus.emit('nodeClick', { node: nodeData, canvasType: 'Network Canvas', event });
      });
      
      d3Element.on('mouseover', (event) => {
        this.eventBus.emit('nodeMouseOver', { node: nodeData, event });
      });
      
      d3Element.on('mouseout', (event) => {
        this.eventBus.emit('nodeMouseOut', { node: nodeData, event });
      });
    }

    /**
     * 销毁渲染器
     */
    destroy() {
      this.stopForceSimulation();
      super.destroy();
    }
  }
  
//  /** 关系网画布渲染器
//    * @class NetworkCanvas
//    * @extends BaseRenderer
//    */
//   class NetworkCanvas extends BaseRenderer {
//     /**
//      * 构造函数
//      * @param {HTMLElement|string} container - 容器元素或ID
//      * @param {Object} config - 配置选项
//      */
//     constructor(container, config = {}) {
//       // 合并默认配置
//       const defaultConfig = {
//         nodeRadius: 20,
//         nodePadding: 25,
//         edgeLength: 100,
//         iterations: 100,
//         gravity: 0.1,
//         charge: -300,
//         linkDistance: 100,
//         linkStrength: 0.7,
//         friction: 0.9,
//         layoutType: 'force', // 可选: 'force', 'grid', 'circular'
//         highlightColor: '#007bff'
//       };
      
//       super(container, { ...defaultConfig, ...config });
      
//       // 网络布局相关属性
//       this.nodes = new Map();
//       this.edges = new Map();
//       this.nodePositions = new Map();
//       this.layoutType = this.config.layoutType;
//       this.layoutConfig = {
//         force: {
//           iterations: this.config.iterations,
//           gravity: this.config.gravity,
//           charge: this.config.charge,
//           linkDistance: this.config.linkDistance,
//           linkStrength: this.config.linkStrength,
//           friction: this.config.friction
//         },
//         grid: {
//           padding: this.config.nodePadding
//         },
//         circular: {
//           radius: 200,
//           startAngle: 0
//         }
//       };
//     }
    
//     /**
//      * 渲染网络数据
//      * @param {Object} graphData - 图数据对象
//      * @param {string} [contextNodeId] - 上下文节点ID，用于上下文布局
//      */
//     render(graphData, contextNodeId = null) {
//       if (!graphData || !graphData.nodes) {
//         console.warn('无效的图数据');
//         return;
//       }
      
//       // 清空现有内容
//       this.clear();
      
//       // 初始化数据结构
//       this.nodes.clear();
//       this.edges.clear();
//       this.nodePositions.clear();
      
//       // 构建节点和边的映射
//       graphData.nodes.forEach(node => {
//         this.nodes.set(node.id, node);
//       });
      
//       if (graphData.edges) {
//         graphData.edges.forEach(edge => {
//           this.edges.set(edge.id, edge);
//         });
//       }
      
//       // 根据布局类型计算位置
//       this._calculatePositions(graphData, contextNodeId);
      
//       // 渲染连线
//       this._renderEdges();
      
//       // 渲染节点
//       this._renderNodes();
      
//       // 适应内容大小
//       this.fitToContent();
      
//       this.eventBus.emit('renderComplete', { 
//         nodes: this.nodes.size, 
//         edges: this.edges.size,
//         layoutType: this.layoutType 
//       });
//     }
    
//     /**
//      * 设置布局类型
//      * @param {string} type - 布局类型 ('force', 'grid', 'circular')
//      */
//     setLayoutType(type) {
//       const validTypes = ['force', 'grid', 'circular'];
//       if (validTypes.includes(type)) {
//         this.layoutType = type;
//         this.eventBus.emit('layoutTypeChanged', { layoutType: type });
//       } else {
//         console.warn(`无效的布局类型: ${type}，使用默认布局: force`);
//         this.layoutType = 'force';
//       }
//     }
    
//     /**
//      * 更新布局配置
//      * @param {Object} config - 布局配置
//      */
//     updateLayoutConfig(config) {
//       if (config) {
//         Object.assign(this.layoutConfig[this.layoutType], config);
//       }
//     }
    
//     /**
//      * 计算节点位置
//      * @private
//      * @param {Object} graphData - 图数据
//      * @param {string} contextNodeId - 上下文节点ID
//      */
//     _calculatePositions(graphData, contextNodeId) {
//       const nodes = Array.from(this.nodes.values());
//       const edges = Array.from(this.edges.values());
      
//       // 清空之前的位置
//       this.nodePositions.clear();
      
//       switch (this.layoutType) {
//         case 'force':
//           this._calculateForceLayout(nodes, edges, contextNodeId);
//           break;
//         case 'grid':
//           this._calculateGridLayout(nodes);
//           break;
//         case 'circular':
//           this._calculateCircularLayout(nodes, contextNodeId);
//           break;
//         default:
//           this._calculateForceLayout(nodes, edges, contextNodeId);
//       }
//     }
    
//     /**
//      * 计算力导向布局
//      * @private
//      * @param {Array} nodes - 节点数组
//      * @param {Array} edges - 边数组
//      * @param {string} contextNodeId - 上下文节点ID
//      */
//     _calculateForceLayout(nodes, edges, contextNodeId) {
//       const { iterations, gravity, charge, linkDistance, linkStrength, friction } = this.layoutConfig.force;
      
//       // 创建节点对象
//       const nodeObjects = new Map();
//       nodes.forEach(node => {
//         nodeObjects.set(node.id, {
//           id: node.id,
//           x: Math.random() * 100 - 50, // 初始随机位置
//           y: Math.random() * 100 - 50,
//           vx: 0,
//           vy: 0,
//           fixed: node.id === contextNodeId // 固定上下文节点
//         });
//       });
      
//       // 创建边对象
//       const edgeObjects = edges.map(edge => ({
//         id: edge.id,
//         source: nodeObjects.get(edge.startNodeId),
//         target: nodeObjects.get(edge.endNodeId)
//       }));
      
//       // 执行力导向布局
//       const width = this.svg.clientWidth || 800;
//       const height = this.svg.clientHeight || 600;
//       const centerX = width / 2;
//       const centerY = height / 2;
      
//       for (let i = 0; i < iterations; i++) {
//         // 重置力
//         nodeObjects.forEach(node => {
//           if (!node.fixed) {
//             node.vx *= friction;
//             node.vy *= friction;
//           } else {
//             node.vx = 0;
//             node.vy = 0;
//             node.x = centerX;
//             node.y = centerY;
//           }
//         });
        
//         // 计算斥力
//         nodeObjects.forEach(nodeA => {
//           if (nodeA.fixed) return;
          
//           nodeObjects.forEach(nodeB => {
//             if (nodeA === nodeB || nodeB.fixed) return;
            
//             const dx = nodeB.x - nodeA.x;
//             const dy = nodeB.y - nodeA.y;
//             const distance = Math.sqrt(dx * dx + dy * dy);
            
//             if (distance > 0 && distance < 100) {
//               const force = (charge * 0.1) / distance;
//               nodeA.vx -= dx * force;
//               nodeA.vy -= dy * force;
//             }
//           });
//         });
        
//         // 计算引力（边）
//         edgeObjects.forEach(edge => {
//           if (!edge.source || !edge.target) return;
          
//           const dx = edge.target.x - edge.source.x;
//           const dy = edge.target.y - edge.source.y;
//           const distance = Math.sqrt(dx * dx + dy * dy);
          
//           if (distance > 0) {
//             const force = linkStrength * (distance - linkDistance) / distance;
            
//             if (!edge.source.fixed) {
//               edge.source.vx += dx * force * 0.5;
//               edge.source.vy += dy * force * 0.5;
//             }
            
//             if (!edge.target.fixed) {
//               edge.target.vx -= dx * force * 0.5;
//               edge.target.vy -= dy * force * 0.5;
//             }
//           }
//         });
        
//         // 计算中心引力
//         nodeObjects.forEach(node => {
//           if (node.fixed) return;
          
//           const dx = centerX - node.x;
//           const dy = centerY - node.y;
          
//           node.vx += dx * gravity;
//           node.vy += dy * gravity;
//         });
        
//         // 应用速度更新位置
//         nodeObjects.forEach(node => {
//           if (!node.fixed) {
//             node.x += node.vx;
//             node.y += node.vy;
//           }
//         });
        
//         // 逐步减少迭代步长
//         const step = 1 - i / iterations;
//         const maxStep = step * 10;
        
//         nodeObjects.forEach(node => {
//           if (!node.fixed) {
//             node.vx = Math.max(-maxStep, Math.min(maxStep, node.vx));
//             node.vy = Math.max(-maxStep, Math.min(maxStep, node.vy));
//           }
//         });
//       }
      
//       // 保存最终位置
//       nodeObjects.forEach(node => {
//         this.nodePositions.set(node.id, { x: node.x, y: node.y });
//       });
//     }
    
//     /**
//      * 计算网格布局
//      * @private
//      * @param {Array} nodes - 节点数组
//      */
//     _calculateGridLayout(nodes) {
//       const width = this.svg.clientWidth || 800;
//       const height = this.svg.clientHeight || 600;
//       const padding = this.layoutConfig.grid.padding;
//       const cellSize = this.config.nodeRadius * 2 + padding;
      
//       // 计算网格大小
//       const cols = Math.floor(width / cellSize);
//       const rows = Math.ceil(nodes.length / cols);
      
//       // 居中网格
//       const startX = (width - cols * cellSize) / 2;
//       const startY = (height - rows * cellSize) / 2;
      
//       // 分配位置
//       nodes.forEach((node, index) => {
//         const col = index % cols;
//         const row = Math.floor(index / cols);
        
//         this.nodePositions.set(node.id, {
//           x: startX + col * cellSize + cellSize / 2,
//           y: startY + row * cellSize + cellSize / 2
//         });
//       });
//     }
    
//     /**
//      * 计算环形布局
//      * @private
//      * @param {Array} nodes - 节点数组
//      * @param {string} contextNodeId - 上下文节点ID
//      */
//     _calculateCircularLayout(nodes, contextNodeId) {
//       const width = this.svg.clientWidth || 800;
//       const height = this.svg.clientHeight || 600;
//       const centerX = width / 2;
//       const centerY = height / 2;
//       const { radius, startAngle } = this.layoutConfig.circular;
      
//       // 找到上下文节点的索引
//       let contextIndex = -1;
//       if (contextNodeId) {
//         contextIndex = nodes.findIndex(node => node.id === contextNodeId);
//       }
      
//       // 为上下文节点分配中心位置
//       if (contextIndex !== -1) {
//         this.nodePositions.set(nodes[contextIndex].id, { x: centerX, y: centerY });
//       }
      
//       // 为其他节点分配环形位置
//       const nonContextNodes = contextIndex !== -1 
//         ? nodes.filter((_, i) => i !== contextIndex)
//         : nodes;
      
//       const angleIncrement = (2 * Math.PI) / nonContextNodes.length;
      
//       nonContextNodes.forEach((node, index) => {
//         const angle = startAngle + index * angleIncrement;
//         this.nodePositions.set(node.id, {
//           x: centerX + radius * Math.cos(angle),
//           y: centerY + radius * Math.sin(angle)
//         });
//       });
//     }
    
//     /**
//      * 渲染节点
//      * @private
//      */
//     _renderNodes() {
//       this.nodes.forEach(node => {
//         const pos = this.nodePositions.get(node.id);
//         if (!pos) return;
        
//         // 准备节点数据
//         const nodeData = {
//           id: node.id,
//           x: pos.x,
//           y: pos.y,
//           radius: this.config.nodeRadius,
//           label: this._getNodeLabel(node),
//           properties: node.properties,
//           // 根据节点类型设置样式
//           fill: this._getNodeFillColor(node)
//         };
        
//         // 创建节点元素
//         const nodeElement = this.createNodeElement(nodeData);
        
//         // 添加点击事件
//         nodeElement.addEventListener('click', (event) => {
//           event.stopPropagation();
//           this._onNodeClick(node);
//         });
        
//         // 添加到SVG
//         this.g.appendChild(nodeElement);
//       });
//     }
    
//     /**
//      * 渲染连线
//      * @private
//      */
//     _renderEdges() {
//       this.edges.forEach(edge => {
//         const sourcePos = this.nodePositions.get(edge.startNodeId);
//         const targetPos = this.nodePositions.get(edge.endNodeId);
        
//         if (!sourcePos || !targetPos) return;
        
//         // 准备连线数据
//         const edgeData = {
//           id: edge.id,
//           source: sourcePos,
//           target: targetPos,
//           stroke: this._getEdgeColor(edge),
//           strokeWidth: 2,
//           arrow: true
//         };
        
//         // 创建连线元素
//         const edgeElement = this.createEdgeElement(edgeData);
        
//         // 添加到SVG（放在节点之前）
//         this.g.appendChild(edgeElement);
//       });
      
//       // 创建箭头标记
//       this._createArrowMarker();
//     }
    
//     /**
//      * 创建箭头标记
//      * @private
//      */
//     _createArrowMarker() {
//       // 检查是否已存在箭头标记
//       if (this.svg.querySelector('defs')) return;
      
//       const defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
      
//       const marker = document.createElementNS('http://www.w3.org/2000/svg', 'marker');
//       marker.setAttribute('id', 'arrowhead');
//       marker.setAttribute('viewBox', '0 -5 10 10');
//       marker.setAttribute('refX', 20);
//       marker.setAttribute('refY', 0);
//       marker.setAttribute('markerWidth', 6);
//       marker.setAttribute('markerHeight', 6);
//       marker.setAttribute('orient', 'auto-start-reverse');
      
//       const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
//       path.setAttribute('d', 'M 0,-5 L 10,0 L 0,5');
//       path.setAttribute('fill', '#adb5bd');
      
//       marker.appendChild(path);
//       defs.appendChild(marker);
//       this.svg.insertBefore(defs, this.g);
//     }
    
//     /**
//      * 获取节点标签
//      * @private
//      * @param {Object} node - 节点对象
//      * @returns {string} 节点标签
//      */
//     _getNodeLabel(node) {
//       // 优先使用name属性
//       if (node.properties && node.properties.name) {
//         return node.properties.name;
//       }
      
//       // 其次使用第一个label
//       if (node.labels && node.labels.length > 0) {
//         return node.labels[0];
//       }
      
//       // 最后使用ID
//       return node.id;
//     }
    
//     /**
//      * 获取节点填充颜色
//      * @private
//      * @param {Object} node - 节点对象
//      * @returns {string} 填充颜色
//      */
//     _getNodeFillColor(node) {
//       // 根据标签返回不同颜色
//       if (node.labels && node.labels.length > 0) {
//         const label = node.labels[0];
//         // 使用标签的哈希值生成颜色
//         const hash = this._stringToHash(label);
//         const hue = Math.abs(hash) % 360;
//         return `hsl(${hue}, 70%, 60%)`;
//       }
      
//       return '#6c757d';  // 默认颜色
//     }
    
//     /**
//      * 获取边的颜色
//      * @private
//      * @param {Object} edge - 边对象
//      * @returns {string} 边的颜色
//      */
//     _getEdgeColor(edge) {
//       // 根据关系类型返回不同颜色
//       if (edge.type) {
//         const hash = this._stringToHash(edge.type);
//         const hue = Math.abs(hash) % 360;
//         return `hsl(${hue}, 50%, 50%)`;
//       }
      
//       return '#adb5bd';  // 默认颜色
//     }
    
//     /**
//      * 字符串哈希函数
//      * @private
//      * @param {string} str - 输入字符串
//      * @returns {number} 哈希值
//      */
//     _stringToHash(str) {
//       let hash = 0;
//       if (str.length === 0) return hash;
      
//       for (let i = 0; i < str.length; i++) {
//         const char = str.charCodeAt(i);
//         hash = ((hash << 5) - hash) + char;
//         hash = hash & hash; // Convert to 32bit integer
//       }
      
//       return hash;
//     }
    
//     /**
//      * 节点点击事件处理
//      * @private
//      * @param {Object} node - 被点击的节点
//      */
//     _onNodeClick(node) {
//       // 使用D3.js的方式清除之前的高亮
//       this.d3g.selectAll('.node circle')
//         .attr('fill', (d) => {
//           if (d && d.fill) return d.fill; // 如果有绑定的数据使用绑定的颜色
//           if (d && d.id) {
//             const nodeObj = this.nodes.get(d.id);
//             return nodeObj ? this._getNodeFillColor(nodeObj) : this.config.defaultNodeFill;
//           }
//           return this.config.defaultNodeFill;
//         });
      
//       // 使用D3.js的方式高亮当前节点
//       this.d3g.select(`.node[data-id="${node.id}"] circle`)
//         .attr('fill', this.config.highlightColor || '#007bff'); // 高亮颜色
      
//       // 使用实例的eventBus发出事件
//       this.eventBus.emit('nodeClick', { node, canvasType: 'Network Canvas' });
//     }
    
    
//     /**
//      * 查找节点
//      * @param {string} nodeId - 节点ID
//      * @returns {Object|null} 节点对象
//      */
//     findNode(nodeId) {
//       return this.nodes.get(nodeId) || null;
//     }
    
//     /**
//      * 查找节点位置
//      * @param {string} nodeId - 节点ID
//      * @returns {Object|null} 位置对象
//      */
//     getNodePosition(nodeId) {
//       return this.nodePositions.get(nodeId) || null;
//     }
    
//     /**
//      * 导出当前布局数据
//      * @returns {Object} 布局数据
//      */
//     exportLayout() {
//       const layoutData = {
//         nodePositions: Array.from(this.nodePositions.entries()).map(([id, pos]) => ({
//           id,
//           x: pos.x,
//           y: pos.y
//         })),
//         layoutType: this.layoutType,
//         layoutConfig: this.layoutConfig[this.layoutType]
//       };
      
//       return layoutData;
//     }
    
//     /**
//      * 导入布局数据
//      * @param {Object} layoutData - 布局数据
//      */
//     importLayout(layoutData) {
//       if (!layoutData || !layoutData.nodePositions) return;
      
//       // 恢复布局类型
//       if (layoutData.layoutType) {
//         this.setLayoutType(layoutData.layoutType);
//       }
      
//       // 恢复布局配置
//       if (layoutData.layoutConfig) {
//         this.updateLayoutConfig(layoutData.layoutConfig);
//       }
      
//       // 恢复节点位置
//       layoutData.nodePositions.forEach(({ id, x, y }) => {
//         this.nodePositions.set(id, { x, y });
//       });
      
//       // 重新渲染
//       this.clear();
//       this._renderEdges();
//       this._renderNodes();
//     }
    
//     /**
//      * 重置视图到默认状态
//      * 将缩放比例重置为1，并将平移位置重置为原点
//      */
//     resetView() {
//       // 重置缩放和平移
//       this.currentScale = 1;
//       this.currentTranslate = { x: 0, y: 0 };
      
//       // 更新变换
//       this._updateTransform();
      
//       // 触发事件
//       // 使用事件总线发送缩放事件
//       this.eventBus.emit('zoom', { 
//         scale: this.currentScale, 
//         translate: { ...this.currentTranslate },
//         canvasType: 'Network Canvas' 
//       });
//     }
//   }
  
  export default NetworkCanvas;