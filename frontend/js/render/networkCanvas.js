/**
 * 关系网画布渲染器
 * 用于呈现节点之间的网状连接关系
 */
class NetworkCanvas extends BaseRenderer {
    constructor(containerId) {
        super(containerId);
        this.layoutType = 'force'; // 默认使用力导向布局
        this.nodePositions = {};
        this.context = null;
        
        // 网络布局配置
        this.config = {
            nodeRadius: 20,
            defaultNodeColor: '#e74c3c',
            defaultEdgeColor: '#95a5a6',
            defaultEdgeWidth: 2,
            forceLayout: {
                iterations: 100,
                forceStrength: -300,
                linkDistance: 100,
                friction: 0.9
            },
            gridLayout: {
                rows: 5,
                cols: 5,
                spacing: 100
            },
            circularLayout: {
                radius: 200,
                startAngle: 0
            }
        };
    }
    
    /**
     * 渲染关系网络
     * @param {Object} data - 图数据对象，包含 nodes 和 edges
     * @param {Object} context - 上下文标识，用于确定展示哪一部分子图
     */
    render(data, context = null) {
        if (!data || !data.nodes || !Array.isArray(data.nodes)) {
            console.error('无效的输入数据');
            return;
        }
        
        // 保存数据和上下文
        this.data = data;
        this.context = context;
        
        // 清空现有内容
        this.zoomGroup.innerHTML = '';
        this.nodePositions = {};
        
        // 根据上下文过滤数据（如果有）
        const filteredData = this.filterDataByContext();
        
        // 计算节点布局
        this.calculateLayout(filteredData);
        
        // 渲染节点和连线
        this.renderEdges(filteredData);
        this.renderNodes(filteredData);
        
        // 调整视图以适应内容
        this.fitToContent();
    }
    
    /**
     * 根据上下文过滤数据
     * @returns {Object} 过滤后的数据
     */
    filterDataByContext() {
        if (!this.context) {
            return this.data;
        }
        
        // 这里可以根据上下文实现不同的过滤逻辑
        // 例如：只显示与特定节点相关的子图
        const filteredNodes = new Set();
        const filteredEdges = [];
        
        if (this.context.focusNodeId) {
            // 获取焦点节点
            filteredNodes.add(this.context.focusNodeId);
            
            // 获取与焦点节点直接相连的节点和关系
            if (this.data.edges && Array.isArray(this.data.edges)) {
                this.data.edges.forEach(edge => {
                    if (edge.source === this.context.focusNodeId || edge.target === this.context.focusNodeId) {
                        filteredEdges.push(edge);
                        filteredNodes.add(edge.source);
                        filteredNodes.add(edge.target);
                    }
                });
            }
        }
        
        // 过滤节点
        const nodes = this.data.nodes.filter(node => filteredNodes.has(node.id));
        
        return {
            nodes,
            edges: filteredEdges
        };
    }
    
    /**
     * 计算节点布局
     * @param {Object} data - 要布局的数据
     */
    calculateLayout(data) {
        switch (this.layoutType) {
            case 'force':
                this.calculateForceLayout(data);
                break;
            case 'grid':
                this.calculateGridLayout(data);
                break;
            case 'circular':
                this.calculateCircularLayout(data);
                break;
            default:
                this.calculateForceLayout(data);
        }
    }
    
    /**
     * 计算力导向布局
     * @param {Object} data - 要布局的数据
     */
    calculateForceLayout(data) {
        const nodes = data.nodes;
        const edges = data.edges || [];
        const config = this.config.forceLayout;
        
        // 初始化节点位置
        nodes.forEach((node, index) => {
            // 初始位置在画布中心附近随机分布
            const centerX = this.svgWidth / 2 || 400;
            const centerY = this.svgHeight / 2 || 300;
            const randomOffset = 50;
            
            this.nodePositions[node.id] = {
                x: centerX + (Math.random() - 0.5) * randomOffset,
                y: centerY + (Math.random() - 0.5) * randomOffset,
                vx: 0,
                vy: 0
            };
        });
        
        // 简化的力导向算法
        for (let iter = 0; iter < config.iterations; iter++) {
            // 重置速度
            Object.values(this.nodePositions).forEach(pos => {
                pos.vx *= config.friction;
                pos.vy *= config.friction;
            });
            
            // 计算节点间的斥力
            for (let i = 0; i < nodes.length; i++) {
                for (let j = i + 1; j < nodes.length; j++) {
                    const node1 = nodes[i];
                    const node2 = nodes[j];
                    const pos1 = this.nodePositions[node1.id];
                    const pos2 = this.nodePositions[node2.id];
                    
                    let dx = pos2.x - pos1.x;
                    let dy = pos2.y - pos1.y;
                    let distance = Math.sqrt(dx * dx + dy * dy);
                    
                    if (distance > 0) {
                        // 避免除零错误
                        const force = config.forceStrength / (distance * distance);
                        const fx = force * dx / distance;
                        const fy = force * dy / distance;
                        
                        pos1.vx -= fx;
                        pos1.vy -= fy;
                        pos2.vx += fx;
                        pos2.vy += fy;
                    }
                }
            }
            
            // 计算连线的引力
            edges.forEach(edge => {
                const pos1 = this.nodePositions[edge.source];
                const pos2 = this.nodePositions[edge.target];
                
                if (pos1 && pos2) {
                    let dx = pos2.x - pos1.x;
                    let dy = pos2.y - pos1.y;
                    let distance = Math.sqrt(dx * dx + dy * dy);
                    
                    if (distance > 0) {
                        const force = (config.linkDistance - distance) * 0.1;
                        const fx = force * dx / distance;
                        const fy = force * dy / distance;
                        
                        pos1.vx += fx;
                        pos1.vy += fy;
                        pos2.vx -= fx;
                        pos2.vy -= fy;
                    }
                }
            });
            
            // 更新位置
            Object.entries(this.nodePositions).forEach(([nodeId, pos]) => {
                pos.x += pos.vx;
                pos.y += pos.vy;
                
                // 限制在画布范围内（带边界）
                const margin = 100;
                pos.x = Math.max(margin, Math.min(this.svgWidth - margin || 800 - margin, pos.x));
                pos.y = Math.max(margin, Math.min(this.svgHeight - margin || 600 - margin, pos.y));
            });
        }
        
        // 移除速度属性
        Object.values(this.nodePositions).forEach(pos => {
            delete pos.vx;
            delete pos.vy;
        });
    }
    
    /**
     * 计算网格布局
     * @param {Object} data - 要布局的数据
     */
    calculateGridLayout(data) {
        const nodes = data.nodes;
        const config = this.config.gridLayout;
        
        nodes.forEach((node, index) => {
            const row = Math.floor(index / config.cols);
            const col = index % config.cols;
            
            // 居中放置网格
            const startX = (this.svgWidth - (config.cols - 1) * config.spacing) / 2 || 200;
            const startY = (this.svgHeight - (config.rows - 1) * config.spacing) / 2 || 150;
            
            this.nodePositions[node.id] = {
                x: startX + col * config.spacing,
                y: startY + row * config.spacing
            };
        });
    }
    
    /**
     * 计算环形布局
     * @param {Object} data - 要布局的数据
     */
    calculateCircularLayout(data) {
        const nodes = data.nodes;
        const config = this.config.circularLayout;
        
        // 居中放置环
        const centerX = this.svgWidth / 2 || 400;
        const centerY = this.svgHeight / 2 || 300;
        
        nodes.forEach((node, index) => {
            const angle = config.startAngle + (index / nodes.length) * 2 * Math.PI;
            
            this.nodePositions[node.id] = {
                x: centerX + config.radius * Math.cos(angle),
                y: centerY + config.radius * Math.sin(angle)
            };
        });
    }
    
    /**
     * 渲染节点
     * @param {Object} data - 要渲染的数据
     */
    renderNodes(data) {
        data.nodes.forEach(node => {
            const position = this.nodePositions[node.id];
            if (position) {
                // 扩展节点样式
                const nodeWithStyle = {
                    ...node,
                    color: node.color || this.config.defaultNodeColor
                };
                
                const nodeElement = this.createNodeElement(
                    nodeWithStyle,
                    position.x,
                    position.y
                );
                this.zoomGroup.appendChild(nodeElement);
            }
        });
    }
    
    /**
     * 渲染连线
     * @param {Object} data - 要渲染的数据
     */
    renderEdges(data) {
        if (!data.edges || !Array.isArray(data.edges)) return;
        
        data.edges.forEach(edge => {
            const sourcePos = this.nodePositions[edge.source];
            const targetPos = this.nodePositions[edge.target];
            
            if (sourcePos && targetPos) {
                // 扩展连线样式
                const edgeWithStyle = {
                    ...edge,
                    color: edge.color || this.config.defaultEdgeColor,
                    width: edge.width || this.config.defaultEdgeWidth
                };
                
                // 创建连线
                const edgeElement = this.createEdgeElement(
                    edgeWithStyle,
                    sourcePos.x,
                    sourcePos.y,
                    targetPos.x,
                    targetPos.y
                );
                this.zoomGroup.appendChild(edgeElement);
                
                // 添加箭头
                this.addArrowhead(edgeElement, sourcePos, targetPos, edgeWithStyle.color);
            }
        });
    }
    
    /**
     * 添加箭头
     * @param {SVGElement} line - 连线元素
     * @param {Object} sourcePos - 源点位置
     * @param {Object} targetPos - 目标点位置
     * @param {string} color - 颜色
     */
    addArrowhead(line, sourcePos, targetPos, color) {
        // 计算箭头位置和角度
        const dx = targetPos.x - sourcePos.x;
        const dy = targetPos.y - sourcePos.y;
        const angle = Math.atan2(dy, dx) * 180 / Math.PI;
        
        // 计算箭头起点（离目标节点一定距离）
        const nodeRadius = this.config.nodeRadius + 2;
        const distance = Math.sqrt(dx * dx + dy * dy);
        const arrowX = targetPos.x - (dx / distance) * nodeRadius;
        const arrowY = targetPos.y - (dy / distance) * nodeRadius;
        
        // 创建箭头
        const arrowGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
        arrowGroup.setAttribute('transform', `translate(${arrowX}, ${arrowY}) rotate(${angle})`);
        
        const arrow = document.createElementNS('http://www.w3.org/2000/svg', 'polygon');
        arrow.setAttribute('points', '-8,-4 0,0 -8,4');
        arrow.setAttribute('fill', color);
        
        arrowGroup.appendChild(arrow);
        this.zoomGroup.appendChild(arrowGroup);
        
        // 将箭头与线条关联
        arrowGroup.setAttribute('data-edge-id', line.getAttribute('data-edge-id'));
    }
    
    /**
     * 调整视图以适应内容
     */
    fitToContent() {
        if (Object.keys(this.nodePositions).length === 0) return;
        
        // 计算内容边界
        let minX = Infinity, maxX = -Infinity;
        let minY = Infinity, maxY = -Infinity;
        
        Object.values(this.nodePositions).forEach(pos => {
            minX = Math.min(minX, pos.x);
            maxX = Math.max(maxX, pos.x);
            minY = Math.min(minY, pos.y);
            maxY = Math.max(maxY, pos.y);
        });
        
        // 添加边距
        const padding = 50;
        minX -= padding;
        maxX += padding;
        minY -= padding;
        maxY += padding;
        
        // 计算内容尺寸
        const contentWidth = maxX - minX;
        const contentHeight = maxY - minY;
        
        // 获取容器尺寸
        const containerWidth = this.svgWidth || this.container.clientWidth;
        const containerHeight = this.svgHeight || this.container.clientHeight;
        
        // 计算缩放比例
        const scaleX = containerWidth / contentWidth;
        const scaleY = containerHeight / contentHeight;
        const scale = Math.min(scaleX, scaleY, 1); // 不超过100%
        
        // 计算居中偏移
        const translateX = (containerWidth - contentWidth * scale) / 2 - minX * scale;
        const translateY = (containerHeight - contentHeight * scale) / 2 - minY * scale;
        
        // 设置视图
        this.scale = scale;
        this.translation = [translateX, translateY];
        this.updateTransform();
    }
    
    /**
     * 设置布局类型
     * @param {string} layoutType - 布局类型 ('force', 'grid', 'circular')
     */
    setLayoutType(layoutType) {
        if (['force', 'grid', 'circular'].includes(layoutType)) {
            this.layoutType = layoutType;
            if (this.data) {
                this.render(this.data, this.context);
            }
        }
    }
    
    /**
     * 更新配置
     * @param {Object} newConfig - 新配置
     */
    updateConfig(newConfig) {
        this.config = { ...this.config, ...newConfig };
        if (this.data) {
            this.render(this.data, this.context);
        }
    }
}

// 导出模块
if (typeof module !== 'undefined' && module.exports) {
    module.exports = NetworkCanvas;
} else {
    window.NetworkCanvas = NetworkCanvas;
}
