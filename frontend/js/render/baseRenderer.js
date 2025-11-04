/**
 * 基础渲染器类
 * 为所有可视化画布提供通用功能
 */
class BaseRenderer {
    constructor(containerId) {
        this.containerId = containerId;
        this.container = document.getElementById(containerId);
        if (!this.container) {
            throw new Error(`容器元素 ${containerId} 不存在`);
        }
        
        this.data = null;
        this.initialized = false;
        this.svg = null;
        this.zoomBehavior = null;
        this.translation = [0, 0];
        this.scale = 1;
        this.svgWidth = 0;
        this.svgHeight = 0;
        
        this.initialize();
    }
    
    /**
     * 初始化基础渲染环境
     */
    initialize() {
        // 清空容器
        this.container.innerHTML = '';
        
        // 创建 SVG 元素
        this.svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        this.svg.setAttribute('width', '100%');
        this.svg.setAttribute('height', '100%');
        this.svg.setAttribute('style', 'display: block;');
        this.container.appendChild(this.svg);
        
        // 创建缩放和平移组
        this.zoomGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
        this.svg.appendChild(this.zoomGroup);
        
        // 设置容器样式
        this.container.style.position = 'relative';
        this.container.style.overflow = 'hidden';
        
        // 初始化缩放行为
        this.initZoomBehavior();
        
        // 初始化事件监听
        this.initEvents();
        
        // 设置大小调整监听
        this.setupResizeObserver();
        
        this.initialized = true;
    }
    
    /**
     * 初始化缩放行为
     */
    initZoomBehavior() {
        // 使用原生方法实现缩放和平移
        let isDragging = false;
        let startX, startY, initialTranslate;
        
        // 鼠标滚轮缩放
        this.svg.addEventListener('wheel', (event) => {
            event.preventDefault();
            
            const rect = this.svg.getBoundingClientRect();
            const mouseX = event.clientX - rect.left;
            const mouseY = event.clientY - rect.top;
            
            // 计算新的缩放级别
            const scaleFactor = event.deltaY > 0 ? 0.9 : 1.1;
            const newScale = Math.max(0.1, Math.min(10, this.scale * scaleFactor));
            
            // 计算缩放后的平移补偿
            const scaleDiff = newScale - this.scale;
            this.translation[0] = mouseX - (mouseX - this.translation[0]) * (newScale / this.scale);
            this.translation[1] = mouseY - (mouseY - this.translation[1]) * (newScale / this.scale);
            
            this.scale = newScale;
            this.updateTransform();
        });
        
        // 鼠标拖拽平移
        this.svg.addEventListener('mousedown', (event) => {
            // 忽略右键点击
            if (event.button === 2) return;
            
            event.preventDefault();
            isDragging = true;
            startX = event.clientX;
            startY = event.clientY;
            initialTranslate = [...this.translation];
            
            this.svg.style.cursor = 'grabbing';
        });
        
        document.addEventListener('mousemove', (event) => {
            if (!isDragging) return;
            
            const dx = event.clientX - startX;
            const dy = event.clientY - startY;
            
            this.translation[0] = initialTranslate[0] + dx;
            this.translation[1] = initialTranslate[1] + dy;
            
            this.updateTransform();
        });
        
        document.addEventListener('mouseup', () => {
            isDragging = false;
            if (this.svg) {
                this.svg.style.cursor = 'default';
            }
        });
        
        // 禁用右键菜单
        this.svg.addEventListener('contextmenu', (event) => {
            event.preventDefault();
        });
    }
    
    /**
     * 更新变换矩阵
     */
    updateTransform() {
        this.zoomGroup.setAttribute('transform', 
            `translate(${this.translation[0]}, ${this.translation[1]}) scale(${this.scale})`);
    }
    
    /**
     * 初始化事件
     */
    initEvents() {
        // 子类可以覆盖此方法来添加特定事件
    }
    
    /**
     * 设置大小调整监听器
     */
    setupResizeObserver() {
        const resizeObserver = new ResizeObserver(() => {
            this.resize();
        });
        resizeObserver.observe(this.container);
    }
    
    /**
     * 处理大小调整
     */
    resize() {
        const rect = this.container.getBoundingClientRect();
        this.svgWidth = rect.width;
        this.svgHeight = rect.height;
        
        // 如果已经有数据，重新渲染
        if (this.data) {
            this.render(this.data);
        }
    }
    
    /**
     * 重置视图
     */
    resetView() {
        this.translation = [0, 0];
        this.scale = 1;
        this.updateTransform();
    }
    
    /**
     * 渲染方法（由子类实现）
     * @param {Object} data - 图数据
     */
    render(data) {
        throw new Error('子类必须实现 render 方法');
    }
    
    /**
     * 销毁渲染器
     */
    destroy() {
        if (this.svg) {
            this.svg.remove();
        }
        this.initialized = false;
    }
    
    /**
     * 创建节点元素
     * @param {Object} node - 节点数据
     * @param {number} x - x 坐标
     * @param {number} y - y 坐标
     * @returns {SVGElement} - 节点元素
     */
    createNodeElement(node, x, y) {
        const nodeGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
        nodeGroup.setAttribute('transform', `translate(${x}, ${y})`);
        nodeGroup.setAttribute('data-node-id', node.id);
        
        // 创建节点圆
        const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
        circle.setAttribute('r', 20);
        circle.setAttribute('fill', node.color || '#666');
        circle.setAttribute('stroke', '#fff');
        circle.setAttribute('stroke-width', 2);
        nodeGroup.appendChild(circle);
        
        // 创建节点标签
        const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        text.setAttribute('text-anchor', 'middle');
        text.setAttribute('dominant-baseline', 'middle');
        text.setAttribute('fill', '#fff');
        text.setAttribute('font-size', '12px');
        text.textContent = node.label || node.id;
        nodeGroup.appendChild(text);
        
        return nodeGroup;
    }
    
    /**
     * 创建连线元素
     * @param {Object} edge - 关系数据
     * @param {number} sourceX - 源节点 x 坐标
     * @param {number} sourceY - 源节点 y 坐标
     * @param {number} targetX - 目标节点 x 坐标
     * @param {number} targetY - 目标节点 y 坐标
     * @returns {SVGElement} - 连线元素
     */
    createEdgeElement(edge, sourceX, sourceY, targetX, targetY) {
        const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
        line.setAttribute('x1', sourceX);
        line.setAttribute('y1', sourceY);
        line.setAttribute('x2', targetX);
        line.setAttribute('y2', targetY);
        line.setAttribute('stroke', edge.color || '#ccc');
        line.setAttribute('stroke-width', edge.width || 2);
        line.setAttribute('data-edge-id', edge.id);
        line.setAttribute('data-source', edge.source);
        line.setAttribute('data-target', edge.target);
        
        return line;
    }
}

// 导出模块
if (typeof module !== 'undefined' && module.exports) {
    module.exports = BaseRenderer;
} else {
    window.BaseRenderer = BaseRenderer;
}
