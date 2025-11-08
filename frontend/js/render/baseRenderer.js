import EventBus from '../common/EventBus.js';

// 获取事件总线实例的辅助函数
const getEventBusInstance = () => EventBus.getInstance();
// 在你的模块顶部
import * as d3 from 'https://cdn.skypack.dev/d3@7';
// import * as d3 from '../../d3.min.js';


/**
 * 基础渲染器类 - 提供SVG渲染的通用功能
 * @class BaseRenderer
 * @param {HTMLElement|string} container - 容器元素或ID
 * @param {Object} config - 配置选项
 */
export default class BaseRenderer {
  /**
   * 构造函数
   * @param {HTMLElement|string} container - 容器元素或ID
   * @param {Object} config - 配置选项
   */
  constructor(container, config = {}) {
    // 支持传入容器ID或DOM元素
    if (typeof container === 'string') {
      container = document.getElementById(container);
    }
    
    if (!container) {
      throw new Error('容器元素必须提供且有效');
    }
    
    this.container = container;
    this.config = { ...BaseRenderer.DEFAULT_CONFIG, ...config };
    
    // 初始化SVG相关属性
    this.svg = null;
    this.g = null;  // 缩放组
    this.zoomBehavior = null;
    
    // 视图状态
    this.currentScale = 1;
    this.currentTranslate = { x: 0, y: 0 };
    
    // 事件处理
    this.eventListeners = new Map();
    
    // 获取事件总线实例
    this.eventBus = getEventBusInstance();
    
    // 初始化
    this._initialize();
  }
  
  /**
   * 默认配置
   */
  static get DEFAULT_CONFIG() {
    return {
      width: '100%',
      height: '100%',
      backgroundColor: '#ffffff',
      enableZoom: true,
      enablePan: true,
      minZoom: 0.1,
      maxZoom: 5,
      zoomSensitivity: 0.2
    };
  }
  
  /**
   * 初始化渲染器
   * @private
   */
  _initialize() {
    // 创建SVG元素
    this._createSVG();
    
    // 设置缩放行为
    if (this.config.enableZoom) {
      this._setupZoomBehavior();
    }
    
    // 初始化事件
    this._initEvents();
    
    // 初始化事件订阅
    this._initEventSubscriptions();
    
    // 监听窗口大小变化
    this._setupResizeListener();
  }
  
  /**
   * 创建SVG元素
   * @private
   */
  _createSVG() {
    // 使用D3清除容器
    d3.select(this.container).selectAll('*').remove();
    
    // 使用D3创建SVG
    this.svg = d3.select(this.container)
      .append('svg')
      .attr('width', this.config.width)
      .attr('height', this.config.height)
      .style('background-color', this.config.backgroundColor)
      .node();
    
    // 使用D3创建缩放组
    this.g = d3.select(this.svg)
      .append('g')
      .node();
    
    // 保存D3选择器引用
    this.d3svg = d3.select(this.svg);
    this.d3g = d3.select(this.g);
  }
  
  /**
   * 设置缩放行为
   * @private
   */
  _setupZoomBehavior() {
    // 使用D3的zoom行为
    this.zoomBehavior = d3.zoom()
      .scaleExtent([this.config.minZoom, this.config.maxZoom])
      .translateExtent([[-Infinity, -Infinity], [Infinity, Infinity]])
      .wheelDelta((event) => {
        // 自定义缩放灵敏度
        return -event.deltaY * this.config.zoomSensitivity * 0.01;
      })
      .on('zoom', (event) => {
        // 更新变换
        const transform = event.transform;
        this.currentScale = transform.k;
        this.currentTranslate = { x: transform.x, y: transform.y };
        
        // 应用变换
        this.d3g.attr('transform', transform);
        
        // 发射事件
        this._emitEvent('zoom', { 
          scale: this.currentScale, 
          translate: { ...this.currentTranslate },
          event: event
        });
      })
      .on('start', (event) => {
        if (event.sourceEvent && event.sourceEvent.type === 'mousedown') {
          this.d3svg.style('cursor', 'grabbing');
          d3.select(this.container).classed('dragging', true);
        }
      })
      .on('end', (event) => {
        if (event.sourceEvent && event.sourceEvent.type === 'mouseup') {
          this.d3svg.style('cursor', 'default');
          d3.select(this.container).classed('dragging', false);
        }
      });
    
    // 应用zoom行为到SVG
    this.d3svg.call(this.zoomBehavior);
    
    // 保存事件监听器引用
    this.eventListeners.set('zoom', this.zoomBehavior);
  }
  
  /**
   * 更新变换矩阵
   * @private
   */
  _updateTransform() {
    // 使用D3的zoom transform来设置当前状态
    const transform = d3.zoomIdentity
      .translate(this.currentTranslate.x, this.currentTranslate.y)
      .scale(this.currentScale);
    
    this.d3g.attr('transform', transform);
    
    // 更新zoom行为的状态
    if (this.zoomBehavior) {
      this.d3svg.call(this.zoomBehavior.transform, transform);
    }
  }
  
  /**
   * 初始化事件
   * @private
   */
  _initEvents() {
    // 基础事件，子类可以扩展
    this._emitEvent('initialized');
  }
  
  /**
   * 初始化事件订阅
   * @private
   */
  _initEventSubscriptions() {
    // 基础订阅，子类可以覆盖扩展
    // 订阅缩放事件
    this.eventBus.on('zoomToFit', (data) => {
      this.fitToContent(data);
    });
    
    // 订阅重置视图事件
    this.eventBus.on('resetView', (data) => {
      this.resetView(data);
    });
  }
  
  /**
   * 设置大小调整监听器
   * @private
   */
  _setupResizeListener() {
    const handleResize = () => {
      this._emitEvent('resize');
    };
    
    window.addEventListener('resize', handleResize);
    this.eventListeners.set('resize', handleResize);
  }
  
  /**
   * 创建节点元素
   * @param {Object} nodeData - 节点数据
   * @returns {SVGElement} 节点元素
   */
  createNodeElement(nodeData) {
    // 使用D3创建节点组
    const nodeGroup = this.d3g.append('g')
      .attr('class', 'node')
      .attr('data-id', nodeData.id)
      .datum(nodeData); // 绑定数据
    
    // 创建节点背景
    nodeGroup.append('circle')
      .attr('r', nodeData.radius || 20)
      .attr('fill', nodeData.fill || '#6c757d')
      .attr('stroke', nodeData.stroke || '#343a40')
      .attr('stroke-width', nodeData.strokeWidth || 2);
    
    // 创建节点文本
    nodeGroup.append('text')
      .attr('text-anchor', 'middle')
      .attr('dominant-baseline', 'middle')
      .attr('fill', nodeData.textColor || '#ffffff')
      .attr('font-size', nodeData.fontSize || 12)
      .text(() => {
        // 优先显示name属性，然后是label，最后是id
        if (nodeData.properties && nodeData.properties.name) {
          return nodeData.properties.name;
        } else {
          return nodeData.label || nodeData.id;
        }
      });
    
    // 设置位置
    nodeGroup.attr('transform', `translate(${nodeData.x || 0}, ${nodeData.y || 0})`);
    
    return nodeGroup.node(); // 返回原生DOM节点
  }
  
  /**
   * 创建连线元素
   * @param {Object} edgeData - 连线数据
   * @returns {SVGElement} 连线元素
   */
  createEdgeElement(edgeData) {
    // 使用D3创建连线
    const edge = this.d3g.append('line')
      .attr('class', 'edge')
      .attr('data-id', edgeData.id)
      .datum(edgeData) // 绑定数据
      .attr('x1', edgeData.source.x)
      .attr('y1', edgeData.source.y)
      .attr('x2', edgeData.target.x)
      .attr('y2', edgeData.target.y)
      .attr('stroke', edgeData.stroke || '#adb5bd')
      .attr('stroke-width', edgeData.strokeWidth || 2)
      .attr('fill', 'none');
    
    // 如果需要箭头
    if (edgeData.arrow) {
      edge.attr('marker-end', 'url(#arrowhead)');
    }
    
    return edge.node(); // 返回原生DOM节点
  }
  
  /**
   * 适应内容大小
   * @param {Object} options - 适应选项
   */
  fitToContent(options = {}) {
    const { padding = 20 } = options;
    
    // 使用D3选择所有元素
    const allElements = this.d3g.selectAll('*');
    
    if (allElements.empty()) return;
    
    let minX = Infinity, minY = Infinity;
    let maxX = -Infinity, maxY = -Infinity;
    
    // 计算所有元素的边界框
    allElements.each(function() {
      const node = d3.select(this);
      const bbox = this.getBBox();
      const transform = node.attr('transform');
      
      let tx = 0, ty = 0;
      if (transform && transform.startsWith('translate')) {
        const match = transform.match(/translate\(([^)]+)\)/);
        if (match) {
          const [x, y] = match[1].split(',').map(Number);
          tx = x;
          ty = y;
        }
      }
      
      minX = Math.min(minX, tx + bbox.x);
      minY = Math.min(minY, ty + bbox.y);
      maxX = Math.max(maxX, tx + bbox.x + bbox.width);
      maxY = Math.max(maxY, ty + bbox.y + bbox.height);
    });
    
    // 计算容器大小
    const containerWidth = this.svg.clientWidth || 800;
    const containerHeight = this.svg.clientHeight || 600;
    
    // 计算内容大小
    const contentWidth = maxX - minX;
    const contentHeight = maxY - minY;
    
    // 计算缩放比例
    const scaleX = (containerWidth - padding * 2) / contentWidth;
    const scaleY = (containerHeight - padding * 2) / contentHeight;
    const scale = Math.min(1, Math.min(scaleX, scaleY));
    
    // 计算新的平移
    const centerX = (minX + maxX) / 2;
    const centerY = (minY + maxY) / 2;
    const translateX = containerWidth / 2 - centerX * scale;
    const translateY = containerHeight / 2 - centerY * scale;
    
    // 应用变换
    this.currentScale = scale;
    this.currentTranslate = { x: translateX, y: translateY };
    
    // 使用D3的zoom transform直接应用变换
    if (this.zoomBehavior) {
      const transform = d3.zoomIdentity
        .translate(translateX, translateY)
        .scale(scale);
      
      this.d3svg.transition()
        .duration(300)
        .call(this.zoomBehavior.transform, transform);
    } else {
      this._updateTransform();
    }
    
    // 通过事件总线发送缩放完成事件
    if (this.eventBus) {
      this.eventBus.emit('zoomToFitComplete', {
        scale: this.currentScale,
        translate: this.currentTranslate,
        canvasType: this.constructor.name
      });
    }
  }
  
  /**
   * 重置视图到初始状态
   * @param {Object} options - 重置选项
   */
  resetView(options = {}) {
    // 重置缩放和平移
    this.currentScale = 1;
    this.currentTranslate = { x: 0, y: 0 };
    this._updateTransform();
    
    // 如果提供了适应内容的选项，则适应内容
    if (options.fitToContent) {
      this.fitToContent(options);
    }
    
    this._emitEvent('viewReset', { options });
  }
  
  /**
   * 更新配置
   * @param {Object} newConfig - 新的配置
   */
  updateConfig(newConfig) {
    this.config = { ...this.config, ...newConfig };
    
    // 更新背景色
    if (newConfig.backgroundColor !== undefined) {
      this.svg.setAttribute('style', `background-color: ${newConfig.backgroundColor};`);
    }
    
    // 更新尺寸
    if (newConfig.width !== undefined) {
      this.svg.setAttribute('width', newConfig.width);
    }
    if (newConfig.height !== undefined) {
      this.svg.setAttribute('height', newConfig.height);
    }
    
    this._emitEvent('configUpdated', this.config);
  }
  
  /**
   * 清空渲染内容
   */
  clear() {
    // 使用D3的selectAll和remove方法清空所有子元素
    this.d3g.selectAll('*').remove();
    this._emitEvent('cleared');
  }
  
  /**
   * 销毁渲染器，清理资源
   */
  destroy() {
    // 清理D3事件监听器
    if (this.zoomBehavior && this.d3svg) {
      // 移除zoom行为
      this.d3svg.on('.zoom', null);
      // 重置transform
      this.d3svg.call(this.zoomBehavior.transform, d3.zoomIdentity);
    }
    
    // 清理其他事件监听器
    this.eventListeners.forEach((listener, type) => {
      if (type === 'zoom') {
        return; // 已经处理过了
      }
      // 对于原生DOM事件
      if (typeof listener === 'function') {
        if (type === 'mousemove' || type === 'mouseup' || type === 'resize') {
          document.removeEventListener(type, listener);
        } else if (this.svg) {
          this.svg.removeEventListener(type, listener);
        }
      }
    });
    
    // 清空引用
    this.eventListeners.clear();
    this.d3svg = null;
    this.d3g = null;
    this.zoomBehavior = null;
    
    // 清空内容
    this.clear();
    
    // 移除SVG
    if (this.container.contains(this.svg)) {
      this.container.removeChild(this.svg);
    }
    
    // 清空其他引用
    this.svg = null;
    this.g = null;
    this.container = null;
    this.config = null;
    this.currentScale = null;
    this.currentTranslate = null;
    
    this._emitEvent('destroyed');
  }
  
  /**
   * 发射事件
   * @private
   * @param {string} eventName - 事件名称
   * @param {*} eventData - 事件数据
   */
  _emitEvent(eventName, eventData) {
    // 同时通过DOM事件和事件总线发射事件，确保兼容性
    const event = new CustomEvent(`renderer:${eventName}`, {
      detail: eventData,
      bubbles: true,
      cancelable: true
    });
    this.container.dispatchEvent(event);
    
    // 通过事件总线发射事件
    if (this.eventBus) {
      this.eventBus.emit(`renderer:${eventName}`, eventData);
    }
  }
  
  /**
   * 渲染方法（由子类实现）
   * @abstract
   * @param {Object} data - 要渲染的数据
   */
  render(data) {
    throw new Error('子类必须实现render方法');
  }
}