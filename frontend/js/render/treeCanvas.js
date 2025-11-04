/**
 * 层级树画布渲染器
 * 用于呈现节点之间的层级结构关系
 */
class TreeCanvas extends BaseRenderer {
    constructor(containerId) {
        super(containerId);
        this.treeLayout = null;
        this.nodePositions = {};
        
        // 树布局配置
        this.config = {
            nodeRadius: 20,
            horizontalSpacing: 100,
            verticalSpacing: 80,
            defaultNodeColor: '#3498db',
            defaultEdgeColor: '#95a5a6',
            defaultEdgeWidth: 2
        };
    }
    
    /**
     * 渲染层级树
     * @param {Object} data - 图数据对象，包含 nodes 和 edges
     */
    render(data) {
        if (!data || !data.nodes || !Array.isArray(data.nodes)) {
            console.error('无效的输入数据');
            return;
        }
        
        // 保存数据
        this.data = data;
        
        // 清空现有内容
        this.zoomGroup.innerHTML = '';
        this.nodePositions = {};
        
        // 构建树结构并计算布局
        this.calculateTreeLayout();
        
        // 渲染节点和连线
        this.renderEdges();
        this.renderNodes();
        
        // 调整视图以适应内容
        this.fitToContent();
    }
    
    /**
     * 计算树布局
     */
    calculateTreeLayout() {
        // 构建节点映射
        const nodeMap = {};
        this.data.nodes.forEach(node => {
            nodeMap[node.id] = {
                ...node,
                children: [],
                parent: null
            };
        });
        
        // 构建父子关系
        if (this.data.edges && Array.isArray(this.data.edges)) {
            this.data.edges.forEach(edge => {
                const sourceNode = nodeMap[edge.source];
                const targetNode = nodeMap[edge.target];
                
                if (sourceNode && targetNode && !targetNode.parent) {
                    sourceNode.children.push(targetNode);
                    targetNode.parent = sourceNode;
                }
            });
        }
        
        // 找出根节点（没有父节点的节点）
        const rootNodes = Object.values(nodeMap).filter(node => !node.parent);
        
        // 如果没有根节点，使用第一个节点作为根节点
        let rootNode;
        if (rootNodes.length > 0) {
            rootNode = rootNodes[0];
        } else if (this.data.nodes.length > 0) {
            rootNode = nodeMap[this.data.nodes[0].id];
        }
        
        // 计算节点位置
        if (rootNode) {
            // 使用深度优先搜索计算位置
            this.computeNodePositions(rootNode, 0, 0, 0);
        }
    }
    
    /**
     * 递归计算节点位置
     * @param {Object} node - 当前节点
     * @param {number} level - 当前层级
     * @param {number} x - x坐标
     * @param {number} childIndex - 子节点索引
     * @returns {number} - 占用的宽度
     */
    computeNodePositions(node, level, x, childIndex) {
        const y = level * this.config.verticalSpacing + 50;
        
        // 保存节点位置
        this.nodePositions[node.id] = { x, y };
        
        // 如果有子节点，递归计算子节点位置
        if (node.children && node.children.length > 0) {
            let childX = x - (node.children.length - 1) * this.config.horizontalSpacing / 2;
            let maxWidth = 0;
            
            node.children.forEach((child, index) => {
                const width = this.computeNodePositions(child, level + 1, childX, index);
                maxWidth = Math.max(maxWidth, width);
                childX += this.config.horizontalSpacing;
            });
            
            return maxWidth;
        }
        
        return this.config.horizontalSpacing;
    }
    
    /**
     * 渲染节点
     */
    renderNodes() {
        Object.entries(this.nodePositions).forEach(([nodeId, position]) => {
            const node = this.data.nodes.find(n => n.id === nodeId);
            if (node) {
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
     */
    renderEdges() {
        if (!this.data.edges || !Array.isArray(this.data.edges)) return;
        
        this.data.edges.forEach(edge => {
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
     * 更新配置
     * @param {Object} newConfig - 新配置
     */
    updateConfig(newConfig) {
        this.config = { ...this.config, ...newConfig };
        if (this.data) {
            this.render(this.data);
        }
    }
}

// 导出模块
if (typeof module !== 'undefined' && module.exports) {
    module.exports = TreeCanvas;
} else {
    window.TreeCanvas = TreeCanvas;
}
