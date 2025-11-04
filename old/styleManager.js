/**
 * 样式管理器 - 处理视图相关的CSS样式定义和元素样式更新
 */
window.styleManager = {
    /**
     * 添加视图管理器相关的CSS样式
     */
    addViewManagerCSS: function() {
        // 检查样式是否已存在
        if (document.getElementById('view-manager-css')) {
            return;
        }
        
        // 创建样式元素
        const style = document.createElement('style');
        style.id = 'view-manager-css';
        style.textContent = `
            /* 视图容器样式 */
            .view-container {
                display: flex;
                width: 100%;
                height: 100%;
                position: relative;
                overflow: hidden;
            }
            
            .tree-view-container,
            .graph-view-container {
                flex: 1;
                display: flex;
                flex-direction: column;
                position: relative;
                overflow: hidden;
            }
            
            /* 视图标题样式 */
            .view-title {
                padding: 10px 15px;
                background-color: #f5f5f5;
                border-bottom: 1px solid #ddd;
                font-size: 14px;
                font-weight: bold;
                color: #333;
            }
            
            /* 视图模式按钮样式 */
            .view-mode-buttons {
                position: absolute;
                top: 10px;
                right: 10px;
                z-index: 20;
                display: flex;
                gap: 5px;
            }
            
            .view-mode-btn {
                padding: 6px 12px;
                background-color: #f0f0f0;
                border: 1px solid #ddd;
                border-radius: 4px;
                cursor: pointer;
                font-size: 12px;
                transition: all 0.2s ease;
            }
            
            .view-mode-btn:hover {
                background-color: #e0e0e0;
            }
            
            .view-mode-btn.active {
                background-color: #2196F3;
                color: white;
                border-color: #1976D2;
            }
            
            /* 标签过滤面板样式 */
            .label-filter-panel {
                padding: 10px 15px;
                background-color: #f9f9f9;
                border-bottom: 1px solid #ddd;
            }
            
            .filter-search {
                width: 100%;
                padding: 8px 12px;
                border: 1px solid #ddd;
                border-radius: 4px;
                margin-bottom: 10px;
                font-size: 14px;
            }
            
            .filter-actions {
                display: flex;
                gap: 8px;
                margin-bottom: 10px;
            }
            
            .filter-btn {
                padding: 6px 12px;
                background-color: #f0f0f0;
                border: 1px solid #ddd;
                border-radius: 4px;
                cursor: pointer;
                font-size: 12px;
            }
            
            .filter-btn:hover {
                background-color: #e0e0e0;
            }
            
            .filter-btn.active {
                background-color: #4CAF50;
                color: white;
                border-color: #45a049;
            }
            
            .filter-list {
                max-height: 150px;
                overflow-y: auto;
                border: 1px solid #ddd;
                border-radius: 4px;
                padding: 5px;
                background-color: white;
            }
            
            .filter-item {
                display: flex;
                align-items: center;
                padding: 5px;
                cursor: pointer;
                border-radius: 3px;
            }
            
            .filter-item:hover {
                background-color: #f0f0f0;
            }
            
            .filter-item input[type="checkbox"] {
                margin-right: 8px;
            }
            
            /* 工具按钮样式 */
            .tool-buttons {
                position: absolute;
                top: 10px;
                left: 10px;
                z-index: 20;
                display: flex;
                gap: 5px;
                flex-wrap: wrap;
            }
            
            .tool-btn {
                padding: 8px 12px;
                background-color: white;
                border: 1px solid #ddd;
                border-radius: 4px;
                cursor: pointer;
                font-size: 12px;
                transition: all 0.2s ease;
                display: flex;
                align-items: center;
                gap: 5px;
            }
            
            .tool-btn:hover {
                background-color: #f5f5f5;
                box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
            }
            
            .tool-btn:active {
                box-shadow: inset 0 2px 4px rgba(0, 0, 0, 0.1);
            }
            
            /* 关系类型样式 */
            .relation-types {
                padding: 10px 15px;
                background-color: #f9f9f9;
                border-bottom: 1px solid #ddd;
                display: flex;
                gap: 8px;
                flex-wrap: wrap;
            }
            
            .relation-type-btn {
                padding: 6px 12px;
                background-color: #f0f0f0;
                border: 1px solid #ddd;
                border-radius: 4px;
                cursor: pointer;
                font-size: 12px;
            }
            
            .relation-type-btn:hover {
                background-color: #e0e0e0;
            }
            
            .relation-type-btn.active {
                background-color: #9C27B0;
                color: white;
                border-color: #7B1FA2;
            }
            
            /* 批量编辑面板样式 */
            .batch-editor-panel {
                padding: 15px;
                background-color: white;
                border-bottom: 1px solid #ddd;
            }
            
            .editor-row {
                margin-bottom: 10px;
            }
            
            .editor-label {
                display: block;
                margin-bottom: 5px;
                font-size: 12px;
                font-weight: bold;
                color: #555;
            }
            
            .editor-select {
                width: 100%;
                padding: 8px 12px;
                border: 1px solid #ddd;
                border-radius: 4px;
                font-size: 14px;
            }
            
            /* 节点和边样式 */
            .node-label {
                font-size: 12px;
                font-weight: bold;
            }
            
            .node-detail {
                font-size: 10px;
                fill: #666;
            }
            
            /* 缩放控制样式 */
            .zoom-controls {
                position: absolute;
                bottom: 20px;
                right: 20px;
                z-index: 20;
                display: flex;
                flex-direction: column;
                gap: 5px;
            }
            
            .zoom-btn {
                width: 36px;
                height: 36px;
                background-color: white;
                border: 1px solid #ddd;
                border-radius: 4px;
                cursor: pointer;
                font-size: 16px;
                display: flex;
                align-items: center;
                justify-content: center;
                transition: all 0.2s ease;
            }
            
            .zoom-btn:hover {
                background-color: #f5f5f5;
                box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
            }
            
            /* 分隔线样式 */
            .view-divider {
                position: absolute;
                top: 0;
                width: 5px;
                height: 100%;
                background-color: #e0e0e0;
                cursor: ew-resize;
                z-index: 10;
                transition: all 0.2s ease;
            }
            
            .view-divider:hover {
                background-color: #bdbdbd;
            }
            
            .view-divider.dragging {
                background-color: #9e9e9e;
                box-shadow: 0 0 5px rgba(0, 0, 0, 0.2);
            }
            
            /* 元素计数样式 */
            .element-counts {
                position: absolute;
                bottom: 10px;
                left: 10px;
                z-index: 20;
                background-color: rgba(255, 255, 255, 0.9);
                padding: 5px 10px;
                border-radius: 4px;
                font-size: 12px;
                color: #666;
            }
            
            /* 通用布局类 */
            .position-relative {
                position: relative;
            }
            
            .position-absolute {
                position: absolute;
            }
            
            .position-fixed {
                position: fixed;
            }
            
            .position-static {
                position: static;
            }
            
            /* Flexbox 类 */
            .flex {
                display: flex;
            }
            
            .flex-col {
                flex-direction: column;
            }
            
            .items-center {
                align-items: center;
            }
            
            .justify-center {
                justify-content: center;
            }
            
            .justify-between {
                justify-content: space-between;
            }
            
            .flex-wrap {
                flex-wrap: wrap;
            }
            
            /* 边距和填充 */
            .m-0 {
                margin: 0;
            }
            
            .p-0 {
                padding: 0;
            }
            
            .m-2 {
                margin: 8px;
            }
            
            .p-2 {
                padding: 8px;
            }
            
            .mb-2 {
                margin-bottom: 8px;
            }
            
            .mr-2 {
                margin-right: 8px;
            }
            
            /* 边框圆角 */
            .rounded {
                border-radius: 4px;
            }
            
            .rounded-lg {
                border-radius: 8px;
            }
            
            /* 溢出处理 */
            .overflow-hidden {
                overflow: hidden;
            }
            
            .overflow-auto {
                overflow: auto;
            }
            
            /* Z-index 层级 */
            .z-10 {
                z-index: 10;
            }
            
            .z-20 {
                z-index: 20;
            }
            
            /* 宽度设置 */
            .w-full {
                width: 100%;
            }
            
            .h-full {
                height: 100%;
            }
        `;
        
        // 添加到文档头部
        document.head.appendChild(style);
    },
    
    /**
     * 更新元素样式
     * @param {object} tree - 树视图实例
     * @param {object} cy - 网络图实例
     */
    updateElementStyles: function(tree, cy) {
        try {
            // 如果有树视图，更新树视图样式
            if (tree && typeof tree === 'object') {
                // 为树视图节点添加样式
                if (typeof tree.getNodes === 'function') {
                    try {
                        const treeNodes = tree.getNodes();
                        if (Array.isArray(treeNodes)) {
                            treeNodes.forEach(node => {
                                const nodeDom = node.DOMNode;
                                if (nodeDom) {
                                    // 移除旧样式
                                    nodeDom.className = nodeDom.className.replace(/\bnode-\w+/g, '');
                                    
                                    // 添加节点类型样式
                                    if (node.data) {
                                        if (node.data.relationshipType === 'CHILD_OF') {
                                            nodeDom.classList.add('node-child');
                                        } else if (node.data.relationshipType === 'RELATES_TO') {
                                            nodeDom.classList.add('node-relation');
                                        } else if (node.data.relationshipType === 'SIBLING_OF') {
                                            nodeDom.classList.add('node-sibling');
                                        }
                                    }
                                    
                                    // 添加选中状态样式
                                    if (node.selected) {
                                        nodeDom.classList.add('node-selected');
                                    } else {
                                        nodeDom.classList.remove('node-selected');
                                    }
                                }
                            });
                        }
                    } catch (nodeError) {
                        console.error('Neo4j Editor: Error updating tree nodes styles:', nodeError);
                    }
                }
                
                // 为树视图边添加样式
                if (typeof tree.getEdges === 'function') {
                    try {
                        const treeEdges = tree.getEdges();
                        if (Array.isArray(treeEdges)) {
                            treeEdges.forEach(edge => {
                                const edgeDom = edge.DOMNode;
                                if (edgeDom) {
                                    // 移除旧样式
                                    edgeDom.className = edgeDom.className.replace(/edge-\w+/g, '');
                                    
                                    // 添加边类型样式
                                    if (edge.data) {
                                        if (edge.data.type === 'CHILD_OF') {
                                            edgeDom.classList.add('edge-child');
                                        } else if (edge.data.type === 'RELATES_TO') {
                                            edgeDom.classList.add('edge-relation');
                                        } else if (edge.data.type === 'SIBLING_OF') {
                                            edgeDom.classList.add('edge-sibling');
                                        }
                                    }
                                }
                            });
                        }
                    } catch (edgeError) {
                        console.error('Neo4j Editor: Error updating tree edges styles:', edgeError);
                    }
                }
            }
            
            // 如果有网络图，更新网络图样式
            if (cy && cy.style) {
                // 更新节点样式
                cy.style()
                    .selector('node')
                    .style({
                        'background-color': '#666',
                        'label': 'data(label)',
                        'text-opacity': 1,
                        'text-valign': 'center',
                        'text-halign': 'center',
                        'color': '#fff',
                        'font-size': '12px',
                        'border-width': '1px',
                        'border-color': '#fff',
                        'width': '40px',
                        'height': '40px'
                    })
                    .selector('node.relationship-CHILD_OF')
                    .style({
                        'background-color': '#2196F3'
                    })
                    .selector('node.relationship-RELATES_TO')
                    .style({
                        'background-color': '#4CAF50'
                    })
                    .selector('node.relationship-SIBLING_OF')
                    .style({
                        'background-color': '#FF9800'
                    })
                    .selector('node:selected')
                    .style({
                        'background-color': '#E91E63',
                        'border-width': '2px',
                        'border-color': '#C2185B'
                    })
                    .selector('edge')
                    .style({
                        'width': 2,
                        'line-color': '#ccc',
                        'target-arrow-color': '#ccc',
                        'target-arrow-shape': 'triangle',
                        'curve-style': 'bezier',
                        'label': 'data(type)',
                        'font-size': '10px',
                        'text-opacity': 0.7
                    })
                    .selector('edge[type="CHILD_OF"]')
                    .style({
                        'line-color': '#2196F3',
                        'target-arrow-color': '#2196F3'
                    })
                    .selector('edge[type="RELATES_TO"]')
                    .style({
                        'line-color': '#4CAF50',
                        'target-arrow-color': '#4CAF50'
                    })
                    .selector('edge[type="SIBLING_OF"]')
                    .style({
                        'line-color': '#FF9800',
                        'target-arrow-color': '#FF9800'
                    })
                    .selector('edge:selected')
                    .style({
                        'line-color': '#E91E63',
                        'target-arrow-color': '#E91E63',
                        'width': 3
                    })
                    .update();
            }
        } catch (error) {
            console.error('更新元素样式失败:', error);
        }
    }
};
