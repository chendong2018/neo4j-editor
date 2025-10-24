/**
 * 图形编辑器核心功能模块
 */

/**
 * 选择节点并显示其属性
 * @param {Object} node - 要显示属性的节点对象
 */
window.selectNode = function(node) {
    try {
        // 确保节点数据可用
        const nodeData = typeof node.data === 'function' ? node.data() : node;
        if (!nodeData || !nodeData.id) {
            console.error('Neo4j Editor: Invalid node object passed to selectNode');
            return;
        }
        
        // 显示节点属性面板，隐藏关系属性面板
        const nodePropertiesPanel = document.getElementById('node-properties-panel');
        const relationshipPropertiesPanel = document.getElementById('relationship-properties-panel');
        
        if (nodePropertiesPanel) nodePropertiesPanel.classList.remove('hidden');
        if (relationshipPropertiesPanel) relationshipPropertiesPanel.classList.add('hidden');
        
        // 填充节点标签
        const nodeLabel = document.getElementById('node-label');
        if (nodeLabel) {
            nodeLabel.value = nodeData.label || 'Node';
            // 添加标签更改事件
            nodeLabel.onchange = function() {
                // 更新节点标签
                if (window.sharedGraphData && window.sharedGraphData.nodes) {
                    const targetNode = window.sharedGraphData.nodes.find(n => 
                        n && n.data && n.data.id === nodeData.id
                    );
                    if (targetNode && targetNode.data) {
                        targetNode.data.label = this.value;
                        // 同步更新
                        if (typeof window.syncGraphData === 'function') {
                            window.syncGraphData();
                        }
                        // 显示提示
                        if (typeof window.showToast === 'function') {
                            window.showToast('Node label updated');
                        }
                    }
                }
            };

/**
 * 添加新的关系类型
 */
window.addRelationshipType = function() {
    const name = document.getElementById('new-relationship-type-name').value;
    const color = document.getElementById('new-relationship-type-color').value;
    
    if (!name) {
        if (typeof window.showToast === 'function') {
            window.showToast('Name is required');
        }
        return;
    }
    
    // 检查是否已存在
    if (window.relationshipTypeStyles[name]) {
        if (typeof window.showToast === 'function') {
            window.showToast(`Relationship type ${name} already exists`);
        }
        return;
    }
    
    // Add to relationship type styles
    window.relationshipTypeStyles[name] = {
        'line-color': color,
        'target-arrow-color': color
    };
    
    // 保存到localStorage
    if (typeof window.saveRelationshipTypeStyles === 'function') {
        window.saveRelationshipTypeStyles();
    }
    
    // Add to relationship type buttons
    const relationshipTypesContainer = document.querySelectorAll('.panel')[1]?.querySelector('.panel-content');
    if (relationshipTypesContainer) {
        const btn = document.createElement('div');
        btn.className = 'node-type-btn';
        btn.dataset.type = name;
        btn.innerHTML = `
            <i class="fa fa-long-arrow-right node-type-icon"></i>
            <span>${name}</span>
        `;
        
        // Add event listener
        btn.addEventListener('click', function() {
            const type = this.dataset.type;
            selectedRelationshipType = type;
            document.querySelectorAll('.node-type-btn').forEach(b => b.classList.remove('active'));
            this.classList.add('active');
        });
        
        // 添加右键菜单支持编辑和删除
        btn.addEventListener('contextmenu', function(e) {
            e.preventDefault();
            if (typeof window.showContextMenu === 'function') {
                window.showContextMenu(e.clientX, e.clientY, [
                    { text: 'Edit', action: () => window.showEditRelationshipTypeModal(name) },
                    { text: 'Delete', action: () => window.deleteRelationshipType(name) }
                ]);
            }
        });
        
        relationshipTypesContainer.appendChild(btn);
    }
    
    // Close modal
    const modal = document.getElementById('add-relationship-type-modal');
    if (modal) {
        modal.classList.add('hidden');
    }
    
    // Reset form
    const nameInput = document.getElementById('new-relationship-type-name');
    if (nameInput) {
        nameInput.value = '';
    }
    
    // Show toast
    if (typeof window.showToast === 'function') {
        window.showToast(`Relationship type ${name} added`);
    }
};


/**
 * 批量为所有节点创建同级网关系（当从Neo4j加载数据后调用）
 */
window.createAllSiblingRelationships = function() {
    // 按层级分组节点
    const nodesByLevel = {};
    cy.nodes().forEach(node => {
        const level = node.data('level') || 1;
        if (!nodesByLevel[level]) {
            nodesByLevel[level] = [];
        }
        nodesByLevel[level].push(node);
    });
    
    // 为每个层级的节点创建同级关系
    Object.values(nodesByLevel).forEach(nodeGroup => {
        if (nodeGroup.length > 1) {
            // 为每对节点创建双向关系
            for (let i = 0; i < nodeGroup.length; i++) {
                for (let j = i + 1; j < nodeGroup.length; j++) {
                    const node1 = nodeGroup[i];
                    const node2 = nodeGroup[j];
                    
                    // 检查关系是否已存在
                    const existingRelations = node1.connectedEdges().filter(edge => {
                        return edge.data('type') === siblingRelationshipType && 
                               ((edge.source().id() === node1.id() && edge.target().id() === node2.id()) ||
                                (edge.source().id() === node2.id() && edge.target().id() === node1.id()));
                    });
                    
                    // 如果关系不存在，则创建
                    if (existingRelations.length === 0) {
                        const id = `rel_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
                        
                        // 获取关系样式
                        const style = relationshipTypeStyles[siblingRelationshipType] || {
                            'line-color': '#00BCD4',
                            'target-arrow-color': '#00BCD4',
                            'source-arrow-color': '#00BCD4'
                        };
                        
                        cy.add({
                            group: 'edges',
                            data: {
                                id: id,
                                source: node1.id(),
                                target: node2.id(),
                                label: siblingRelationshipType,
                                'line-color': style['line-color'],
                                'target-arrow-color': style['target-arrow-color'],
                                'source-arrow-color': style['source-arrow-color'],
                                'source-arrow-shape': 'triangle',
                                'target-arrow-shape': 'triangle',
                                type: siblingRelationshipType,
                                properties: {}
                            },
                            style: {
                                'line-style': 'dashed',
                                'width': 2.5,
                                'opacity': 0.8
                            }
                        });
                    }
                }
            }
        }
    });
};
        }
        
        // 清除现有属性
        const propertiesContainer = document.getElementById('node-properties-container');
        if (propertiesContainer) {
            propertiesContainer.innerHTML = '';
            
            // 添加显示属性选择器
            const displayPropertyGroup = document.createElement('div');
            displayPropertyGroup.className = 'form-group border-b border-gray-700 pb-4 mb-4';
            
            const displayPropertyLabel = document.createElement('label');
            displayPropertyLabel.className = 'form-label font-bold text-accent';
            displayPropertyLabel.htmlFor = 'node-display-property';
            displayPropertyLabel.textContent = 'Display Property (Node Label)';
            
            const displayPropertySelect = document.createElement('select');
            displayPropertySelect.id = 'node-display-property';
            displayPropertySelect.className = 'form-input';
            displayPropertySelect.dataset.nodeId = nodeData.id;
            
            // 添加默认选项
            const defaultOption = document.createElement('option');
            defaultOption.value = '';
            defaultOption.textContent = 'Use Default Label';
            defaultOption.selected = !nodeData.displayProperty;
            displayPropertySelect.appendChild(defaultOption);
            
            // 获取节点的所有属性并添加为选项
            const properties = nodeData.properties || {};
            for (const key of Object.keys(properties)) {
                const option = document.createElement('option');
                option.value = key;
                option.textContent = key + ': ' + properties[key];
                option.selected = nodeData.displayProperty === key;
                displayPropertySelect.appendChild(option);
            }
            
            // 添加事件监听器
            displayPropertySelect.addEventListener('change', function() {
                const nodeId = this.dataset.nodeId;
                if (window.sharedGraphData && window.sharedGraphData.nodes) {
                    const selectedNode = window.sharedGraphData.nodes.find(n => 
                        n && n.data && n.data.id === nodeId
                    );
                    if (selectedNode && selectedNode.data) {
                        selectedNode.data.displayProperty = this.value || null;
                        // 同步更新
                        if (typeof window.syncGraphData === 'function') {
                            window.syncGraphData();
                        }
                    }
                }
            });
            
            displayPropertyGroup.appendChild(displayPropertyLabel);
            displayPropertyGroup.appendChild(displayPropertySelect);
            propertiesContainer.appendChild(displayPropertyGroup);
            
            // 添加层级(level)属性输入字段
            const levelFormGroup = document.createElement('div');
            levelFormGroup.className = 'form-group border-b border-gray-700 pb-4 mb-4';
            
            const levelLabel = document.createElement('label');
            levelLabel.className = 'form-label font-bold text-accent';
            levelLabel.htmlFor = 'node-level';
            levelLabel.textContent = 'Level (Hierarchy)';
            
            const levelInput = document.createElement('input');
            levelInput.type = 'number';
            levelInput.id = 'node-level';
            levelInput.className = 'form-input';
            levelInput.placeholder = 'Enter level number';
            levelInput.value = nodeData.level || 1;
            levelInput.min = 1;
            
            // 添加层级更改事件
            levelInput.onchange = function() {
                if (window.sharedGraphData && window.sharedGraphData.nodes) {
                    const targetNode = window.sharedGraphData.nodes.find(n => 
                        n && n.data && n.data.id === nodeData.id
                    );
                    if (targetNode && targetNode.data) {
                        targetNode.data.level = parseInt(this.value) || 1;
                        // 同步更新
                        if (typeof window.syncGraphData === 'function') {
                            window.syncGraphData();
                        }
                        // 显示提示
                        if (typeof window.showToast === 'function') {
                            window.showToast(`Node properties updated. Level: ${targetNode.data.level}`);
                        }
                    }
                }
            };
            
            levelFormGroup.appendChild(levelLabel);
            levelFormGroup.appendChild(levelInput);
            propertiesContainer.appendChild(levelFormGroup);
            
            // 添加常规属性
            if (Object.keys(properties).length === 0) {
                // 添加默认属性
                addPropertyInput(propertiesContainer, 'name', '', nodeData.id);
                addPropertyInput(propertiesContainer, 'age', '', nodeData.id);
            } else {
                // 添加现有属性
                for (const [key, value] of Object.entries(properties)) {
                    addPropertyInput(propertiesContainer, key, value, nodeData.id);
                }
            }
            
            // 添加添加新属性按钮
            const addPropertyBtn = document.createElement('button');
            addPropertyBtn.className = 'mt-4 w-full bg-accent hover:bg-blue-600 text-white py-2 px-4 rounded';
            addPropertyBtn.textContent = 'Add Property';
            addPropertyBtn.addEventListener('click', function() {
                addPropertyInput(propertiesContainer, '', '', nodeData.id);
            });
            propertiesContainer.appendChild(addPropertyBtn);
        }
    } catch (error) {
        console.error('Neo4j Editor: Error in selectNode function:', error);
    }
};

// 选择边并显示其属性
window.selectEdge = function(edge) {
    // 显示关系属性面板，隐藏节点属性面板
    const nodePanel = document.getElementById('node-properties-panel');
    const relationshipPanel = document.getElementById('relationship-properties-panel');
    
    if (nodePanel && relationshipPanel) {
        nodePanel.classList.add('hidden');
        relationshipPanel.classList.remove('hidden');
    }
    
    // 填充关系标签
    const relationshipLabel = document.getElementById('relationship-label');
    if (relationshipLabel) {
        relationshipLabel.value = edge.data('label');
    }
    
    // 清空现有属性
    const propertiesContainer = document.getElementById('relationship-properties-container');
    if (propertiesContainer) {
        propertiesContainer.innerHTML = '';
        
        // 添加关系类型信息
        const typeFormGroup = document.createElement('div');
        typeFormGroup.className = 'form-group border-b border-gray-700 pb-4 mb-4';
        
        const typeLabel = document.createElement('label');
        typeLabel.className = 'form-label font-bold text-accent';
        typeLabel.textContent = 'Relationship Type';
        
        const typeValue = document.createElement('div');
        typeValue.className = 'text-gray-300 mt-1';
        typeValue.textContent = edge.data('type') || 'Unknown';
        
        typeFormGroup.appendChild(typeLabel);
        typeFormGroup.appendChild(typeValue);
        propertiesContainer.appendChild(typeFormGroup);
        
        // 添加源节点和目标节点信息
        const sourceTargetFormGroup = document.createElement('div');
        sourceTargetFormGroup.className = 'form-group border-b border-gray-700 pb-4 mb-4';
        
        const sourceLabel = document.createElement('label');
        sourceLabel.className = 'form-label font-bold';
        sourceLabel.textContent = 'Source Node';
        
        const sourceValue = document.createElement('div');
        sourceValue.className = 'text-gray-300 mt-1';
        sourceValue.textContent = edge.source().data('label');
        
        const targetLabel = document.createElement('label');
        targetLabel.className = 'form-label font-bold mt-3 block';
        targetLabel.textContent = 'Target Node';
        
        const targetValue = document.createElement('div');
        targetValue.className = 'text-gray-300 mt-1';
        targetValue.textContent = edge.target().data('label');
        
        sourceTargetFormGroup.appendChild(sourceLabel);
        sourceTargetFormGroup.appendChild(sourceValue);
        sourceTargetFormGroup.appendChild(targetLabel);
        sourceTargetFormGroup.appendChild(targetValue);
        propertiesContainer.appendChild(sourceTargetFormGroup);
        
        // 添加关系属性
        const edgeProperties = edge.data('properties') || {};
        if (Object.keys(edgeProperties).length === 0) {
            // 添加默认属性
            addPropertyInput(propertiesContainer, 'description', '');
            addPropertyInput(propertiesContainer, 'weight', '1.0');
        } else {
            // 添加现有属性
            for (const [key, value] of Object.entries(edgeProperties)) {
                addPropertyInput(propertiesContainer, key, value);
            }
        }
    }
    
    // 存储选中的边ID在应用按钮中
    const applyBtn = document.getElementById('apply-relationship-properties-btn');
    if (applyBtn) {
        applyBtn.dataset.edgeId = edge.id();
    }
};

// 显示编辑节点类型模态框
window.showEditNodeTypeModal = function(type) {
    const modal = document.getElementById('add-node-type-modal');
    const title = modal.querySelector('h3');
    const confirmBtn = document.getElementById('confirm-add-node-type-btn');
    
    // 保存原始函数引用
    const originalConfirmHandler = confirmBtn.onclick;
    
    // 修改模态框标题
    title.textContent = 'Edit Node Type';
    
    // 填充表单数据
    document.getElementById('new-node-type-name').value = type;
    const style = window.nodeTypeStyles[type];
    if (style) {
        document.getElementById('new-node-type-icon').value = style.icon || 'fa-circle';
        document.getElementById('new-node-type-color').value = style['background-color'] || '#2196F3';
    }
    
    // 显示模态框
    modal.classList.remove('hidden');
    
    // 重写确认按钮事件
    confirmBtn.onclick = function() {
        const newName = document.getElementById('new-node-type-name').value;
        const icon = document.getElementById('new-node-type-icon').value;
        const color = document.getElementById('new-node-type-color').value;
        
        if (!newName) {
            window.showToast('Name is required');
            return;
        }
        
        // 更新节点类型样式
        window.nodeTypeStyles[newName] = {
            'background-color': color,
            'icon': icon
        };
        
        // 如果名称改变，删除旧的类型样式
        if (newName !== type) {
            delete window.nodeTypeStyles[type];
        }
        
        // 更新节点类型按钮
        const btn = document.querySelector(`.node-type-btn[data-type="${type}"]`);
        if (btn) {
            btn.dataset.type = newName;
            btn.innerHTML = `
                <i class="fa ${icon} node-type-icon"></i>
                <span>${newName}</span>
            `;
        }
        
        // 更新使用该类型的所有节点
        if (window.cyTree) {
            window.cyTree.nodes().filter(`node[data-type="${type}"]`).forEach(node => {
                updateNodeStyle(node, newName, color, icon);
            });
        }
        
        if (window.cyNetwork) {
            window.cyNetwork.nodes().filter(`node[data-type="${type}"]`).forEach(node => {
                updateNodeStyle(node, newName, color, icon);
            });
        }
        
        // 保存到localStorage
        saveNodeTypeStyles();
        
        // 重置模态框
        modal.classList.add('hidden');
        document.getElementById('new-node-type-name').value = '';
        title.textContent = 'Add Node Type';
        
        // 恢复原始确认按钮事件
        confirmBtn.onclick = originalConfirmHandler;
        
        // 显示提示
        window.showToast(`Node type ${type} updated to ${newName}`);
        
        // 重新着色节点
        if (typeof window.colorNodesByType === 'function') {
            window.colorNodesByType();
        }
    };
};

// 更新节点样式
function updateNodeStyle(node, type, color, icon) {
    node.data('type', type);
    node.data('label', type);
    node.data('background-color', color);
    node.data('icon', icon);
}

// 显示编辑关系类型模态框
window.showEditRelationshipTypeModal = function(type) {
    const modal = document.getElementById('add-relationship-type-modal');
    const title = modal.querySelector('h3');
    const confirmBtn = document.getElementById('confirm-add-relationship-type-btn');
    
    // 保存原始函数引用
    const originalConfirmHandler = confirmBtn.onclick;
    
    // 修改模态框标题
    title.textContent = 'Edit Relationship Type';
    
    // 填充表单数据
    document.getElementById('new-relationship-type-name').value = type;
    const style = window.relationshipTypeStyles[type];
    if (style) {
        document.getElementById('new-relationship-type-color').value = style['line-color'] || '#FF9800';
    }
    
    // 显示模态框
    modal.classList.remove('hidden');
    
    // 重写确认按钮事件
    confirmBtn.onclick = function() {
        const newName = document.getElementById('new-relationship-type-name').value;
        const color = document.getElementById('new-relationship-type-color').value;
        
        if (!newName) {
            window.showToast('Name is required');
            return;
        }
        
        // 更新关系类型样式
        window.relationshipTypeStyles[newName] = {
            'line-color': color,
            'target-arrow-color': color,
            'source-arrow-color': type === window.siblingRelationshipType ? color : undefined
        };
        
        // 如果名称改变，删除旧的类型样式
        if (newName !== type) {
            delete window.relationshipTypeStyles[type];
        }
        
        // 更新关系类型按钮
        const btn = document.querySelector(`.panel:nth-child(2) .node-type-btn[data-type="${type}"]`);
        if (btn) {
            btn.dataset.type = newName;
            btn.querySelector('span').textContent = newName;
        }
        
        // 更新使用该类型的所有关系
        const isSibling = type === window.siblingRelationshipType;
        if (window.cyTree) {
            window.cyTree.edges().filter(`edge[data-type="${type}"]`).forEach(edge => {
                updateEdgeStyle(edge, newName, color, isSibling);
            });
        }
        
        if (window.cyNetwork) {
            window.cyNetwork.edges().filter(`edge[data-type="${type}"]`).forEach(edge => {
                updateEdgeStyle(edge, newName, color, isSibling);
            });
        }
        
        // 保存到localStorage
        saveRelationshipTypeStyles();
        
        // 重置模态框
        modal.classList.add('hidden');
        document.getElementById('new-relationship-type-name').value = '';
        title.textContent = 'Add Relationship Type';
        
        // 恢复原始确认按钮事件
        confirmBtn.onclick = originalConfirmHandler;
        
        // 显示提示
        window.showToast(`Relationship type ${type} updated to ${newName}`);
    };
};

// 更新边样式
function updateEdgeStyle(edge, type, color, isSibling) {
    edge.data('type', type);
    edge.data('label', type);
    edge.data('line-color', color);
    edge.data('target-arrow-color', color);
    if (isSibling) {
        edge.data('source-arrow-color', color);
    }
}

// 保存节点类型样式到localStorage
function saveNodeTypeStyles() {
    try {
        const nodeTypeStyles = JSON.stringify(window.nodeTypeStyles || {});
        localStorage.setItem('neo4jEditorNodeTypes', nodeTypeStyles);
        showToast('节点类型样式已保存', 'success');
    } catch (error) {
        console.error('保存节点类型样式失败:', error);
        showToast('保存失败: ' + error.message, 'error');
    }
}

// 保存关系类型样式到localStorage
function saveRelationshipTypeStyles() {
    try {
        const relationshipTypeStyles = JSON.stringify(window.relationshipTypeStyles || {});
        localStorage.setItem('neo4jEditorRelationshipTypes', relationshipTypeStyles);
        showToast('关系类型样式已保存', 'success');
    } catch (error) {
        console.error('保存关系类型样式失败:', error);
        showToast('保存失败: ' + error.message, 'error');
    }
}

// 辅助函数：调整颜色亮度
function shadeColor(color, percent) {
    let R = parseInt(color.substring(1, 3), 16);
    let G = parseInt(color.substring(3, 5), 16);
    let B = parseInt(color.substring(5, 7), 16);

    R = parseInt(R * (100 + percent) / 100);
    G = parseInt(G * (100 + percent) / 100);
    B = parseInt(B * (100 + percent) / 100);

    R = (R < 255) ? R : 255;
    G = (G < 255) ? G : 255;
    B = (B < 255) ? B : 255;

    R = Math.round(R);
    G = Math.round(G);
    B = Math.round(B);

    const RR = ((R.toString(16).length === 1) ? '0' + R.toString(16) : R.toString(16));
    const GG = ((G.toString(16).length === 1) ? '0' + G.toString(16) : G.toString(16));
    const BB = ((B.toString(16).length === 1) ? '0' + B.toString(16) : B.toString(16));

    return `#${RR}${GG}${BB}`;
}

// 按类型为节点着色
window.colorNodesByType = function() {
    if (!window.cyTree) return;
    
    // 创建颜色比例尺 - 使用更丰富的颜色集
    const nodeTypes = [...new Set(window.cyTree.nodes().map(node => node.data('type')))];
    // 使用更鲜艳、对比度更高的颜色集合
    const customColors = [
        '#2196F3', '#FF5722', '#4CAF50', '#9C27B0', 
        '#F44336', '#00BCD4', '#FFC107', '#795548',
        '#3F51B5', '#009688', '#E91E63', '#607D8B'
    ];
    
    // 确保d3库可用
    if (typeof d3 !== 'undefined') {
        const colorScale = d3.scaleOrdinal(customColors).domain(nodeTypes);
        
        // 为每个节点设置颜色和其他视觉属性
        window.cyTree.nodes().forEach(node => {
            const type = node.data('type');
            // 确保每个节点都有颜色
            const color = colorScale(type);
            node.data('background-color', color);
            node.data('border-color', shadeColor(color, -30)); // 暗化颜色作为边框
            
            // 确保过渡效果正确应用
            node.style('transition-property', 'background-color, border-color, width, height, opacity');
            node.style('transition-duration', '0.2s');
        });
    }
    
    // 使用D3力导向布局优化节点位置
    window.optimizeGraphLayout();
}

// 优化图形布局
window.optimizeGraphLayout = function() {
    console.log('Neo4j Editor: Optimizing graph layout for hierarchical tree and sibling network');
    
    if (!window.cyTree) return;
    
    // 首先使用力导向布局作为基础
    window.cyTree.layout({
        name: 'cose',
        idealEdgeLength: 150,
        nodeOverlap: 10,
        refresh: 10,
        fit: true,
        padding: 40,
        randomize: false,
        componentSpacing: 200,
        nodeRepulsion: 400000,
        edgeElasticity: 100,
        nestingFactor: 1.2,
        gravity: 30,
        numIter: 1000,
        initialTemp: 250,
        coolingFactor: 0.9,
        minTemp: 1.0,
        edgeWeightInfluence: 0.5
    }).run();
    
    // 然后应用层级布局，确保树状结构清晰
    applyHierarchicalLayout();
};

// 应用层级布局，突出显示树状结构
function applyHierarchicalLayout() {
    if (!window.cyTree) return;
    
    // 定义关系类型常量
    const siblingRelationshipType = 'SIBLING_OF';
    const treeRelationshipType = 'CHILD_OF';
    
    // 按层级对节点进行排序
    const nodesByLevel = {};
    let maxLevel = 0;
    
    // 找出所有层级并按层级分组
    window.cyTree.nodes().forEach(node => {
        const level = node.data('level') || 1;
        if (!nodesByLevel[level]) {
            nodesByLevel[level] = [];
        }
        nodesByLevel[level].push(node);
        maxLevel = Math.max(maxLevel, level);
    });
    
    // 根据层级调整位置，创建清晰的层次结构
    const verticalSpacing = 220; // 垂直间距，用于层级之间
    const horizontalSpacing = 180; // 水平间距，用于同层级节点之间
    const containerWidth = window.cyTree.width();
    
    Object.keys(nodesByLevel).forEach(levelStr => {
        const level = parseInt(levelStr);
        const nodesAtLevel = nodesByLevel[level];
        const centerX = containerWidth / 2;
        
        // 计算该层级的Y位置
        const y = level * verticalSpacing;
        
        // 根据节点数量计算偏移量，使同层节点水平分布均匀
        const totalWidth = (nodesAtLevel.length - 1) * horizontalSpacing;
        const startX = centerX - totalWidth / 2;
        
        // 为每个节点分配位置
        nodesAtLevel.forEach((node, index) => {
            // 计算X位置，考虑节点数量的平衡分布
            const x = startX + index * horizontalSpacing;
            
            // 平滑过渡到层级位置
            node.animate({
                position: { x, y }
            }, { 
                duration: 1500,
                easing: 'ease-in-out'
            });
        });
    });
    
    // 调整同级关系的样式，使其更加明显
    window.cyTree.edges(`[type="${siblingRelationshipType}"]`).forEach(edge => {
        edge.style({
            'opacity': 0.8,
            'width': 2.5,
            'curve-style': 'bezier',
            'line-style': 'dashed' // 用虚线区分同级关系
        });
    });
    
    // 调整层级关系的样式，使其更加突出
    window.cyTree.edges(`[type="${treeRelationshipType}"]`).forEach(edge => {
        edge.style({
            'opacity': 1,
            'width': 3.5,
            'line-style': 'solid' // 用实线突出层级关系
        });
    });
    
    // 延迟适应视图，让动画完成
    setTimeout(() => {
        window.cyTree.fit(50); // 添加边距
        // 应用平滑的视觉过渡
        window.cyTree.animate({
            fit: { padding: 50 }
        }, { duration: 800 });
    }, 1100);
}

// 应用节点属性
window.applyNodeProperties = function() {
    const nodeId = document.getElementById('apply-node-properties-btn').dataset.nodeId;
    if (!nodeId) return;
    
    let node = null;
    if (window.cyTree) {
        node = window.cyTree.getElementById(nodeId);
    }
    if (!node && window.cyNetwork) {
        node = window.cyNetwork.getElementById(nodeId);
    }
    if (!node) return;
    
    // 获取标签
    const label = document.getElementById('node-label').value;
    if (!label) {
        window.showToast('Label is required');
        return;
    }
    
    // 获取层级属性
    const level = parseInt(document.getElementById('node-level').value) || 1;
    const oldLevel = node.data('level') || 1;
    
    // 获取常规属性
    const properties = {};
    const propertyInputs = document.querySelectorAll('#node-properties-container .form-input[data-key]');
    propertyInputs.forEach(input => {
        const key = input.dataset.key;
        const value = input.value;
        
        if (key) {
            // 确定值类型
            if (value === '' || value === null || value === undefined) {
                // 跳过空值以保留现有属性
                return;
            } else if (!isNaN(value) && value !== '') {
                properties[key] = parseFloat(value);
            } else if (value.toLowerCase() === 'true' || value.toLowerCase() === 'false') {
                properties[key] = value.toLowerCase() === 'true';
            } else {
                properties[key] = value;
            }
        }
    });
    
    // 更新节点 - 保留未被覆盖的现有属性
    const existingProperties = node.data('properties') || {};
    const updatedData = {
        label: label,
        level: level,
        properties: { ...existingProperties, ...properties }
    };
    
    // 更新两个视图中的节点
    if (window.cyTree) {
        const treeNode = window.cyTree.getElementById(nodeId);
        if (treeNode) {
            treeNode.data(updatedData);
        }
    }
    
    if (window.cyNetwork) {
        const networkNode = window.cyNetwork.getElementById(nodeId);
        if (networkNode) {
            networkNode.data(updatedData);
        }
    }
    
    // 如果层级发生变化，更新同层节点关系
    if (oldLevel !== level) {
        // 移除旧层级的同层关系
        removeSiblingRelationships(nodeId, oldLevel);
        // 添加新层级的同层关系
        createSiblingRelationships(nodeId, level);
    } else {
        // 确保当前层级的同层关系存在
        createSiblingRelationships(nodeId, level);
    }
    
    // 生成Cypher查询
    let cypher = `MATCH (n) WHERE n.id = '${nodeId}' SET n:${label}, n.id = '${nodeId}', n.level = ${level}`;
    
    for (const [key, value] of Object.entries(properties)) {
        if (typeof value === 'string') {
            cypher += `, n.${key} = '${value.replace(/'/g, "\\'")}'`;
        } else {
            cypher += `, n.${key} = ${value}`;
        }
    }
    
    // 更新Cypher预览
    if (typeof window.updateCypherPreview === 'function') {
        window.updateCypherPreview(cypher);
    }
    
    // 显示提示
    window.showToast(`Node properties updated. Level: ${level}`);
};

// 移除节点与特定层级节点的同层关系
function removeSiblingRelationships(nodeId, level) {
    const siblingType = window.siblingRelationshipType || 'SIBLING';
    
    // 从两个视图中移除关系
    if (window.cyTree) {
        const node = window.cyTree.getElementById(nodeId);
        if (node) {
            const siblingEdges = node.connectedEdges().filter(edge => {
                return edge.data('type') === siblingType && 
                       edge.connectedNodes().other(node).data('level') === level;
            });
            siblingEdges.remove();
        }
    }
    
    if (window.cyNetwork) {
        const node = window.cyNetwork.getElementById(nodeId);
        if (node) {
            const siblingEdges = node.connectedEdges().filter(edge => {
                return edge.data('type') === siblingType && 
                       edge.connectedNodes().other(node).data('level') === level;
            });
            siblingEdges.remove();
        }
    }
}

// 创建节点与同层级节点的关系
function createSiblingRelationships(nodeId, level) {
    const siblingType = window.siblingRelationshipType || 'SIBLING';
    let targetCy = window.cyNetwork || window.cyTree;
    
    if (!targetCy) return;
    
    const node = targetCy.getElementById(nodeId);
    if (!node) return;
    
    // 查找同层级的所有节点
    const siblings = targetCy.nodes().filter(node => node.data('level') === level && node.id() !== nodeId);
    
    siblings.forEach(sibling => {
        // 检查关系是否已存在
        const existingEdge = targetCy.edges().filter(edge => {
            return (edge.source().id() === nodeId && edge.target().id() === sibling.id()) ||
                   (edge.source().id() === sibling.id() && edge.target().id() === nodeId);
        });
        
        if (existingEdge.empty()) {
            // 创建双向边
            createRelationship(nodeId, sibling.id(), siblingType, { bidirectional: true });
        }
    });
}

// 应用关系属性
window.applyRelationshipProperties = function() {
    const edgeId = document.getElementById('apply-relationship-properties-btn').dataset.edgeId;
    if (!edgeId) return;
    
    let edge = null;
    if (window.cyTree) {
        edge = window.cyTree.getElementById(edgeId);
    }
    if (!edge && window.cyNetwork) {
        edge = window.cyNetwork.getElementById(edgeId);
    }
    if (!edge) return;
    
    // 获取标签
    const label = document.getElementById('relationship-label').value;
    if (!label) {
        window.showToast('Label is required');
        return;
    }
    
    // 获取属性
    const properties = {};
    const propertyInputs = document.querySelectorAll('#relationship-properties-container .form-input[data-key]');
    propertyInputs.forEach(input => {
        const key = input.dataset.key;
        const value = input.value;
        
        if (key) {
            // 确定值类型
            if (value === '' || value === null || value === undefined) {
                return;
            } else if (!isNaN(value) && value !== '') {
                properties[key] = parseFloat(value);
            } else if (value.toLowerCase() === 'true' || value.toLowerCase() === 'false') {
                properties[key] = value.toLowerCase() === 'true';
            } else {
                properties[key] = value;
            }
        }
    });
    
    // 更新两个视图中的边
    const updatedData = {
        label: label,
        properties: properties
    };
    
    if (window.cyTree) {
        const treeEdge = window.cyTree.getElementById(edgeId);
        if (treeEdge) {
            treeEdge.data(updatedData);
        }
    }
    
    if (window.cyNetwork) {
        const networkEdge = window.cyNetwork.getElementById(edgeId);
        if (networkEdge) {
            networkEdge.data(updatedData);
        }
    }
    
    // 生成Cypher查询
    const sourceId = edge.source().id();
    const targetId = edge.target().id();
    let cypher = `MATCH (a), (b) WHERE a.id = '${sourceId}' AND b.id = '${targetId}' CREATE (a)-[r:${label}]`;
    
    if (Object.keys(properties).length > 0) {
        cypher += ' SET ';
        const props = [];
        for (const [key, value] of Object.entries(properties)) {
            if (typeof value === 'string') {
                props.push(`r.${key} = '${value.replace(/'/g, "\\'")}'`);
            } else {
                props.push(`r.${key} = ${value}`);
            }
        }
        cypher += props.join(', ');
    }
    
    cypher += ' RETURN r';
    
    // 更新Cypher预览
    updateCypherPreview(cypher);
    
    // 显示提示
    window.showToast('Relationship properties updated');
};

// 更新Cypher查询预览
window.updateCypherPreview = function(cypher) {
    // 保存到全局变量
    window.cypherQuery = cypher;
    
    // 更新编辑器内容
    const cypherEditor = document.getElementById('cypher-editor');
    if (cypherEditor) {
        cypherEditor.value = cypher;
    }
};

// 导出核心功能
// 导出函数到全局对象
window.graphEditor = window.graphEditor || {};
window.graphEditor.createNode = window.createNode;
window.graphEditor.createRelationship = window.createRelationship;
window.graphEditor.selectNode = window.selectNode;
window.graphEditor.selectEdge = window.selectEdge;

/**
 * 添加属性输入框
 * @param {HTMLElement} container - 容器元素
 * @param {string} key - 属性键
 * @param {string} value - 属性值
 * @param {string} nodeId - 节点ID
 */
function addPropertyInput(container, key, value, nodeId) {
    try {
        const propertyGroup = document.createElement('div');
        propertyGroup.className = 'property-group flex items-center mb-2';
        
        const keyInput = document.createElement('input');
        keyInput.type = 'text';
        keyInput.className = 'form-input mr-2 flex-1';
        keyInput.placeholder = 'Key';
        keyInput.value = key;
        keyInput.dataset.nodeId = nodeId;
        
        const valueInput = document.createElement('input');
        valueInput.type = 'text';
        valueInput.className = 'form-input mr-2 flex-1';
        valueInput.placeholder = 'Value';
        valueInput.value = value;
        valueInput.dataset.nodeId = nodeId;
        
        const deleteBtn = document.createElement('button');
        deleteBtn.className = 'text-red-500 hover:text-red-700';
        deleteBtn.innerHTML = '<i class="fa fa-trash"></i>';
        deleteBtn.addEventListener('click', function() {
            if (key) {
                // 从节点属性中删除
                if (window.sharedGraphData && window.sharedGraphData.nodes) {
                    const targetNode = window.sharedGraphData.nodes.find(n => 
                        n && n.data && n.data.id === nodeId
                    );
                    if (targetNode && targetNode.data && targetNode.data.properties) {
                        delete targetNode.data.properties[key];
                        // 同步更新
                        if (typeof window.syncGraphData === 'function') {
                            window.syncGraphData();
                        }
                        // 显示提示
                        if (typeof window.showToast === 'function') {
                            window.showToast(`Property ${key} deleted`);
                        }
                    }
                }
            }
            // 从DOM中移除属性组
            container.removeChild(propertyGroup);
        });
        
        // 添加事件监听器来更新属性
        function updateProperty() {
            const newKey = keyInput.value.trim();
            const newValue = valueInput.value.trim();
            
            if (!newKey) {
                if (typeof window.showToast === 'function') {
                    window.showToast('Key is required');
                }
                return;
            }
            
            // 更新节点属性
            if (window.sharedGraphData && window.sharedGraphData.nodes) {
                const targetNode = window.sharedGraphData.nodes.find(n => 
                    n && n.data && n.data.id === nodeId
                );
                if (targetNode && targetNode.data) {
                    // 确保properties对象存在
                    if (!targetNode.data.properties) {
                        targetNode.data.properties = {};
                    }
                    
                    // 如果键已更改，删除旧键
                    if (key && key !== newKey) {
                        delete targetNode.data.properties[key];
                    }
                    
                    // 添加或更新属性
                    targetNode.data.properties[newKey] = newValue;
                    
                    // 更新键引用
                    key = newKey;
                    
                    // 同步更新
                    if (typeof window.syncGraphData === 'function') {
                        window.syncGraphData();
                    }
                    
                    // 显示提示
                    if (typeof window.showToast === 'function') {
                        window.showToast(`Property ${newKey} updated`);
                    }
                }
            }
        }
        
        keyInput.addEventListener('change', updateProperty);
        valueInput.addEventListener('change', updateProperty);
        
        propertyGroup.appendChild(keyInput);
        propertyGroup.appendChild(valueInput);
        propertyGroup.appendChild(deleteBtn);
        container.appendChild(propertyGroup);
    } catch (error) {
        console.error('Neo4j Editor: Error in addPropertyInput function:', error);
    }
}

// 覆盖原有的createNode函数以支持双视图
// 在视图中创建节点
window.createNodeInView = function(type) {
    try {
        // 初始化共享数据结构
        if (!window.sharedGraphData) {
            window.sharedGraphData = { nodes: [], edges: [] };
        }
        
        if (!window.nodeTypeStyles) {
            window.nodeTypeStyles = {};
        }
        
        // 获取节点类型样式
        const style = window.nodeTypeStyles[type] || {};
        const nodeData = {
            id: 'node-' + Math.floor(Math.random() * 1000000),
            type: type,
            label: type,
            level: 1,
            properties: {},
            'background-color': style['background-color'] || '#2196F3',
            'icon': style.icon || 'fa-circle'
        };
        
        // 在两棵图中添加节点
        const node = window.createNodeAtPosition(type, { x: 100, y: 100 });
        
        // 更新布局
        if (typeof window.optimizeGraphLayout === 'function') {
            window.optimizeGraphLayout();
        }
        
        return node;
    } catch (error) {
        console.error('创建节点失败:', error);
        if (typeof window.showToast === 'function') {
            window.showToast('节点创建失败: ' + error.message, 'error');
        }
        return null;
    }
};

// 在指定位置创建节点
window.createNodeAtPosition = function(type, position) {
    try {
        // 生成唯一ID
        const nodeId = 'node-' + Math.floor(Math.random() * 1000000);
        
        // 获取节点类型样式
        const style = window.nodeTypeStyles[type] || {};
        
        // 构建节点数据
        const nodeData = {
            id: nodeId,
            type: type,
            label: type,
            level: 1,
            properties: {},
            'background-color': style['background-color'] || '#2196F3',
            'icon': style.icon || 'fa-circle',
            displayProperty: null
        };
        
        // 确保共享数据结构存在
        if (!window.sharedGraphData) {
            window.sharedGraphData = { nodes: [], edges: [] };
        }
        
        // 添加到共享数据
        window.sharedGraphData.nodes.push({
            data: nodeData
        });
        
        // 添加节点到Cytoscape实例
        if (window.cyTree) {
            window.cyTree.add({
                group: 'nodes',
                data: nodeData,
                position: position || { x: 100, y: 100 }
            });
        }
        
        if (window.cyNetwork) {
            window.cyNetwork.add({
                group: 'nodes',
                data: nodeData,
                position: position || { x: 100, y: 100 }
            });
        }
        
        // 优化布局
        if (typeof window.optimizeGraphLayout === 'function') {
            window.optimizeGraphLayout();
        }
        
        // 显示成功提示
        if (typeof window.showToast === 'function') {
            window.showToast('Node created: ' + type, 'success');
        }
        
        return nodeData;
    } catch (error) {
        console.error('在指定位置创建节点失败:', error);
        if (typeof window.showToast === 'function') {
            window.showToast('节点创建失败: ' + error.message, 'error');
        }
        return null;
    }
};

// 创建节点的核心函数
window.createNode = function(type, position) {
    try {
        // 生成唯一ID
        const nodeId = `node_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        const nodeType = type || window.selectedNodeType || 'default';
        const style = window.nodeTypeStyles[nodeType] || { 'background-color': '#2196F3', 'icon': 'fa-circle' };
        
        // 直接创建节点数据
        const nodeData = {
            id: nodeId,
            label: nodeType,
            type: nodeType,
            level: 1,
            'background-color': style['background-color'],
            icon: style.icon,
            labels: ['tree', 'network'], // 添加到两个视图
            properties: {}
        };
        
        // 创建节点对象
        const newNode = {
            group: 'nodes',
            data: nodeData,
            position: position || { x: 0, y: 0 }
        };
        
        // 添加到共享数据
        window.sharedGraphData = window.sharedGraphData || { nodes: [], edges: [] };
        window.sharedGraphData.nodes.push(newNode);
        
        // 同步到两个视图
        if (typeof window.syncGraphData === 'function') {
            window.syncGraphData();
        }
        
        // 显示提示
        if (typeof window.showToast === 'function') {
            window.showToast(`Node ${nodeData.label} created`);
        }
        
        return { data: () => nodeData }; // 返回一个包含data方法的对象，模拟cytoscape节点
    } catch (error) {
        console.error('Neo4j Editor: Error creating node:', error);
        if (typeof window.showToast === 'function') {
            window.showToast('Failed to create node');
        }
        return null;
    }
};

// 覆盖原有的createRelationship函数以支持双视图
window.createRelationship = function(sourceNode, targetNode, relationshipType) {
    try {
        // 验证参数
        if (!sourceNode || !targetNode || !sourceNode.id || !targetNode.id) {
            throw new Error('Invalid source or target node');
        }
        
        // 获取源节点和目标节点的ID
        const sourceId = typeof sourceNode.id === 'function' ? sourceNode.id() : sourceNode.id;
        const targetId = typeof targetNode.id === 'function' ? targetNode.id() : targetNode.id;
        
        // 检查是否已经存在相同的关系
        const sharedData = window.sharedGraphData || { nodes: [], edges: [] };
        const existingEdge = sharedData.edges.find(edge => 
            edge && edge.data && 
            edge.data.source === sourceId && 
            edge.data.target === targetId
        );
        
        if (existingEdge) {
            if (typeof window.showToast === 'function') {
                window.showToast('Relationship already exists between these nodes');
            }
            return null;
        }
        
        // 生成唯一ID
        const edgeId = `edge_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        const relType = relationshipType || window.selectedRelationshipType || 'RELATES_TO';
        const style = window.relationshipTypeStyles[relType] || { 'line-color': '#00BCD4', 'target-arrow-color': '#00BCD4' };
        
        // 创建关系数据
        const relData = {
            id: edgeId,
            source: sourceId,
            target: targetId,
            label: relType,
            type: relType,
            'line-color': style['line-color'],
            'target-arrow-color': style['target-arrow-color']
        };
        
        // 创建关系对象
        const newEdge = {
            group: 'edges',
            data: relData
        };
        
        // 添加到共享数据
        sharedData.edges.push(newEdge);
        
        // 同步到两个视图
        if (typeof window.syncGraphData === 'function') {
            window.syncGraphData();
        }
        
        // 显示提示
        if (typeof window.showToast === 'function') {
            window.showToast(`Relationship ${relType} created`);
        }
        
        return { data: () => relData }; // 返回一个包含data方法的对象，模拟cytoscape边
    } catch (error) {
        console.error('Neo4j Editor: Error creating relationship:', error);
        if (typeof window.showToast === 'function') {
            window.showToast('Failed to create relationship');
        }
        return null;
    }
};

/**
 * 处理节点创建点击事件
 * @param {Object} instance - Cytoscape实例
 * @param {Object} event - 点击事件
 */
function handleNodeCreationTap(instance, event) {
    try {
        const position = event.position || { x: 0, y: 0 };
        window.createNode(null, position);
    } catch (error) {
        console.error('Neo4j Editor: Error handling node creation tap:', error);
    }
}

/**
 * 处理关系创建点击事件
 * @param {Object} instance - Cytoscape实例
 * @param {Object} target - 目标节点
 * @param {Object} event - 点击事件
 */
function handleRelationshipCreationTap(instance, target, event) {
    try {
        // 如果没有源节点，则设置当前节点为源节点
        if (!window.sourceNode) {
            window.sourceNode = target;
            // 高亮源节点
            if (target && typeof target.addClass === 'function') {
                target.addClass('source-node');
            }
            if (typeof window.showToast === 'function') {
                window.showToast('Source node selected. Click target node to create relationship.');
            }
        } else if (window.sourceNode !== target) {
            // 如果已经有源节点，并且不是同一个节点，则创建关系
            window.createRelationship(window.sourceNode, target, null);
            
            // 重置源节点
            if (window.sourceNode && typeof window.sourceNode.removeClass === 'function') {
                window.sourceNode.removeClass('source-node');
            }
            window.sourceNode = null;
        } else {
            // 如果点击的是同一个节点，则取消选择
            if (window.sourceNode && typeof window.sourceNode.removeClass === 'function') {
                window.sourceNode.removeClass('source-node');
            }
            window.sourceNode = null;
            if (typeof window.showToast === 'function') {
                window.showToast('Selection canceled');
            }
        }
    } catch (error) {
        console.error('Neo4j Editor: Error handling relationship creation tap:', error);
    }
}

/**
 * 显示编辑节点类型模态框
 * @param {string} typeName - 要编辑的节点类型名称
 */
window.showEditNodeTypeModal = function(typeName) {
    const type = window.nodeTypeStyles[typeName];
    if (!type) return;
    
    document.getElementById('edit-node-type-name').value = typeName;
    document.getElementById('edit-node-type-icon').value = type.icon || 'fa-circle';
    document.getElementById('edit-node-type-color').value = type['background-color'] || '#2196F3';
    
    // 保存旧名称，用于更新
    document.getElementById('edit-node-type-modal').dataset.oldName = typeName;
    
    // 显示模态框
    document.getElementById('edit-node-type-modal').classList.remove('hidden');
};

/**
 * 显示编辑关系类型模态框
 * @param {string} typeName - 要编辑的关系类型名称
 */
window.showEditRelationshipTypeModal = function(typeName) {
    const type = window.relationshipTypeStyles[typeName];
    if (!type) return;
    
    document.getElementById('edit-relationship-type-name').value = typeName;
    document.getElementById('edit-relationship-type-color').value = type['line-color'] || '#00BCD4';
    
    // 保存旧名称，用于更新
    document.getElementById('edit-relationship-type-modal').dataset.oldName = typeName;
    
    // 显示模态框
    document.getElementById('edit-relationship-type-modal').classList.remove('hidden');
};

/**
 * 编辑节点类型
 */
window.editNodeType = function() {
    const oldName = document.getElementById('edit-node-type-modal').dataset.oldName;
    const newName = document.getElementById('edit-node-type-name').value;
    const icon = document.getElementById('edit-node-type-icon').value;
    const color = document.getElementById('edit-node-type-color').value;
    
    if (!newName) {
        showToast('Name is required');
        return;
    }
    
    // 检查是否已存在（除了自身）
    if (newName !== oldName && window.nodeTypeStyles[newName]) {
        showToast(`Node type ${newName} already exists`);
        return;
    }
    
    // 更新样式
    if (newName !== oldName) {
        // 如果名称改变，删除旧的添加新的
        delete window.nodeTypeStyles[oldName];
    }
    window.nodeTypeStyles[newName] = {
        'background-color': color,
        'icon': icon
    };
    
    // 保存到localStorage
    window.saveNodeTypeStyles();
    
    // 重新初始化类型按钮
    window.initializeTypeButtons();
    
    // 关闭模态框
    document.getElementById('edit-node-type-modal').classList.add('hidden');
    
    // Show toast
    showToast(`Node type ${oldName} updated to ${newName}`);
};

/**
 * 编辑关系类型
 */
window.editRelationshipType = function() {
    const oldName = document.getElementById('edit-relationship-type-modal').dataset.oldName;
    const newName = document.getElementById('edit-relationship-type-name').value;
    const color = document.getElementById('edit-relationship-type-color').value;
    
    if (!newName) {
        showToast('Name is required');
        return;
    }
    
    // 检查是否已存在（除了自身）
    if (newName !== oldName && window.relationshipTypeStyles[newName]) {
        showToast(`Relationship type ${newName} already exists`);
        return;
    }
    
    // 更新样式
    if (newName !== oldName) {
        // 如果名称改变，删除旧的添加新的
        delete window.relationshipTypeStyles[oldName];
    }
    window.relationshipTypeStyles[newName] = {
        'line-color': color,
        'target-arrow-color': color
    };
    
    // 保存到localStorage
    window.saveRelationshipTypeStyles();
    
    // 重新初始化类型按钮
    window.initializeTypeButtons();
    
    // 关闭模态框
    document.getElementById('edit-relationship-type-modal').classList.add('hidden');
    
    // Show toast
    showToast(`Relationship type ${oldName} updated to ${newName}`);
};

/**
 * 删除关系类型
 * @param {string} name - 要删除的关系类型名称
 */
window.deleteRelationshipType = function(name) {
    if (Object.keys(window.relationshipTypeStyles).length <= 1) {
        showToast('Cannot delete the last relationship type');
        return;
    }
    
    // 不允许删除同层关系类型
    if (name === window.siblingRelationshipType) {
        showToast(`Cannot delete sibling relationship type "${name}"`);
        return;
    }
    
    // 确认删除
    if (!confirm(`Are you sure you want to delete relationship type "${name}"?`)) {
        return;
    }
    
    // 从对象中删除
    delete window.relationshipTypeStyles[name];
    
    // 保存到localStorage
    window.saveRelationshipTypeStyles();
    
    // 重新初始化类型按钮
    window.initializeTypeButtons();
    
    // 显示提示
    showToast(`Relationship type ${name} deleted`);
};

// Delete selected elements
window.deleteElements = function(elements) {
    console.log('Neo4j Editor: deleteElements函数被调用');
    
    // 检查elements参数
    console.log('Neo4j Editor: elements参数类型:', typeof elements);
    console.log('Neo4j Editor: elements是否有length属性:', elements && elements.length !== undefined);
    console.log('Neo4j Editor: elements数量:', elements && elements.length !== undefined ? elements.length : '未知');
    
    if (!elements) {
        console.error('Neo4j Editor: elements参数为空');
        return;
    }
    
    try {
        // 获取元素类型信息
        let hasEdges = false;
        let hasNodes = false;
        let elementCount = 0;
        
        if (elements.length !== undefined) {
            elementCount = elements.length;
            console.log(`Neo4j Editor: 要删除的元素总数: ${elementCount}`);
            
            // 检查是否是单个元素
            if (elementCount === 1) {
                if (elements[0] && elements[0].isEdge && elements[0].isEdge()) {
                    hasEdges = true;
                } else if (elements[0] && elements[0].isNode && elements[0].isNode()) {
                    hasNodes = true;
                }
            }
        } else {
            // 单个元素情况
            if (elements.isEdge && elements.isEdge()) {
                hasEdges = true;
                elementCount = 1;
                console.log(`Neo4j Editor: 单个边元素，ID: ${elements.id ? elements.id() : '未知'}`);
            } else if (elements.isNode && elements.isNode()) {
                hasNodes = true;
                elementCount = 1;
                console.log(`Neo4j Editor: 单个节点元素，ID: ${elements.id ? elements.id() : '未知'}`);
            }
        }
        
        // Generate Cypher query
        let cypher = '';
        console.log('Neo4j Editor: 开始生成Cypher删除查询');
        
        // 检查filter方法是否存在
        if (elements.filter) {
            // Delete relationships first
            const edges = elements.filter('edge');
            if (edges && edges.length > 0) {
                console.log(`Neo4j Editor: 找到 ${edges.length} 条边要删除`);
                const edgeIds = edges.map(edge => `'${edge.id ? edge.id() : 'unknown'}'`).join(',');
                console.log(`Neo4j Editor: 边ID列表: ${edgeIds}`);
                cypher += `MATCH ()-[r]->() WHERE r.id IN [${edgeIds}] DELETE r;\n`;
            }
            
            // Delete nodes
            const nodes = elements.filter('node');
            if (nodes && nodes.length > 0) {
                console.log(`Neo4j Editor: 找到 ${nodes.length} 个节点要删除`);
                const nodeIds = nodes.map(node => `'${node.id ? node.id() : 'unknown'}'`).join(',');
                console.log(`Neo4j Editor: 节点ID列表: ${nodeIds}`);
                cypher += `MATCH (n) WHERE n.id IN [${nodeIds}] DELETE n`;
            }
        } else {
            console.error('Neo4j Editor: elements没有filter方法');
        }
        
        console.log('Neo4j Editor: 生成的Cypher查询:', cypher);
        
        // Update Cypher preview
        if (typeof updateCypherPreview === 'function') {
            updateCypherPreview(cypher);
            console.log('Neo4j Editor: 更新了Cypher预览');
        } else {
            console.error('Neo4j Editor: updateCypherPreview函数不存在');
        }
        
        // Delete elements
        if (elements.remove) {
            elements.remove();
            console.log(`Neo4j Editor: 成功从视图中移除 ${elementCount} 个元素`);
        } else {
            console.error('Neo4j Editor: elements没有remove方法');
        }
        
        // 同步更新两个视图
        if (window.cyTree && window.cyNetwork) {
            console.log('Neo4j Editor: 尝试同步更新双视图');
            try {
                // 遍历所有要删除的元素ID并从两个视图中移除
                if (elements.map && elements.forEach) {
                    const elementIds = elements.map(el => el.id ? el.id() : null).filter(id => id);
                    elementIds.forEach(id => {
                        const treeElement = window.cyTree.getElementById(id);
                        const networkElement = window.cyNetwork.getElementById(id);
                        if (treeElement) treeElement.remove();
                        if (networkElement) networkElement.remove();
                        console.log(`Neo4j Editor: 从双视图中移除元素ID: ${id}`);
                    });
                }
            } catch (syncError) {
                console.error('Neo4j Editor: 同步双视图失败:', syncError);
            }
        }
        
        // Show toast
        if (typeof showToast === 'function') {
            showToast(`Deleted ${elementCount} elements`);
            console.log('Neo4j Editor: 显示删除成功提示');
        } else {
            console.log(`Neo4j Editor: 删除了 ${elementCount} 个元素`);
        }
        
    } catch (error) {
        console.error('Neo4j Editor: deleteElements执行过程中发生错误:', error);
        console.error('Neo4j Editor: 错误详情:', error.stack);
    }
};

// Clear all elements
window.clearAllElements = function() {
    // Generate Cypher query
    const cypher = 'MATCH (n) DETACH DELETE n';
    
    // Update Cypher preview
    updateCypherPreview(cypher);
    
    // Clear elements
    if (typeof cy !== 'undefined') {
        cy.elements().remove();
    }
    
    // 同步清除两个视图
    if (window.cyTree && window.cyNetwork) {
        window.cyTree.elements().remove();
        window.cyNetwork.elements().remove();
    }
    
    // Show toast
    showToast('All elements cleared');
};

/**
 * 清除所有图数据
 */
window.clearGraph = function() {
    if (!confirm('Are you sure you want to clear all graph data?')) {
        return;
    }
    
    // 清空共享数据
    window.sharedGraphData = { nodes: [], edges: [], selectedElement: null };
    
    // 同步到视图
    if (typeof window.syncGraphData === 'function') {
        window.syncGraphData();
    }
    
    // 显示提示
    if (typeof window.showToast === 'function') {
        window.showToast('Graph cleared');
    }
};

/**
 * 导出图数据为JSON文件
 * @param {Object} options - 导出选项
 * @param {string} options.format - 导出格式 ('json' 或 'cytoscape')
 * @param {string} options.filename - 自定义文件名
 * @param {boolean} options.includeProperties - 是否包含节点和边的所有属性
 * @returns {Promise<boolean>} 是否导出成功
 */
window.exportGraphData = async function(options = {}) {
    console.log('exportGraphData called with options:', options);
    
    try {
        // 验证和规范化选项
        const format = options.format || 'json';
        const includeProperties = options.includeProperties !== false; // 默认包含所有属性
        
        let dataToExport;
        let fileExtension = '.json';
        
        // 根据格式获取不同的导出数据
        if (format === 'cytoscape') {
            // 导出Cytoscape原生格式
            if (window.cyNetwork && window.cyNetwork.json) {
                dataToExport = window.cyNetwork.json();
                console.log('Exporting Cytoscape native format data');
            } else if (window.cy && window.cy.json) {
                dataToExport = window.cy.json();
                console.log('Exporting fallback Cytoscape instance data');
            } else {
                throw new Error('没有可用的Cytoscape实例');
            }
        } else {
            // 默认导出共享数据格式
            const sharedData = window.sharedGraphData || { nodes: [], edges: [] };
            
            if (!includeProperties) {
                // 如果不包含所有属性，只导出基本信息
                dataToExport = {
                    nodes: sharedData.nodes.map(node => ({
                        id: node.data?.id,
                        label: node.data?.label,
                        type: node.data?.type
                    })),
                    edges: sharedData.edges.map(edge => ({
                        id: edge.data?.id,
                        source: edge.data?.source,
                        target: edge.data?.target,
                        label: edge.data?.label
                    }))
                };
            } else {
                // 深拷贝以避免修改原始数据
                dataToExport = JSON.parse(JSON.stringify(sharedData));
            }
            console.log(`Exporting shared graph data with ${dataToExport.nodes.length} nodes and ${dataToExport.edges.length} edges`);
        }
        
        // 转换为JSON字符串
        const jsonString = JSON.stringify(dataToExport, null, 2);
        
        // 创建Blob
        const blob = new Blob([jsonString], { type: 'application/json' });
        
        // 生成文件名
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        let filename = options.filename;
        
        if (!filename) {
            filename = format === 'cytoscape' 
                ? `neo4j-graph-cytoscape-${timestamp}${fileExtension}`
                : `neo4j-graph-${timestamp}${fileExtension}`;
        } else if (!filename.endsWith(fileExtension)) {
            filename += fileExtension;
        }
        
        // 创建下载链接
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        
        // 触发下载
        document.body.appendChild(a);
        
        // 使用现代API进行下载（如果支持）
        if (typeof a.click === 'function') {
            a.click();
        } else {
            // 兼容性处理
            const event = new MouseEvent('click');
            a.dispatchEvent(event);
        }
        
        // 清理
        setTimeout(() => {
            if (document.body.contains(a)) {
                document.body.removeChild(a);
            }
            URL.revokeObjectURL(url);
            console.log('Export cleanup completed');
        }, 100);
        
        // 显示成功消息
        if (typeof window.showToast === 'function') {
            window.showToast(`图数据已成功导出为 ${filename}`, 'success');
        }
        
        return true;
    } catch (error) {
        console.error('Neo4j Editor: 导出图数据错误:', error);
        
        // 显示错误消息
        if (typeof window.showToast === 'function') {
            window.showToast(`导出图数据失败: ${error.message || '未知错误'}`, 'error');
        }
        
        return false;
    }
};

/**
 * 为所有同层节点自动创建双向连接
 */
window.createSiblingRelationships = function() {
    console.log('Neo4j Editor: Creating sibling relationships for same-level nodes');
    
    const targetCy = window.cyNetwork || window.cyTree;
    if (!targetCy) {
        console.error('Neo4j Editor: No Cytoscape instance found');
        return;
    }
    
    const siblingType = window.siblingRelationshipType || 'RELATES_TO';
    
    // 按层级分组节点
    const nodesByLevel = {};
    targetCy.nodes().forEach(node => {
        const level = node.data('level') || 1;
        if (!nodesByLevel[level]) {
            nodesByLevel[level] = [];
        }
        nodesByLevel[level].push(node);
    });
    
    // 为每个层级中的节点创建同级关系
    Object.entries(nodesByLevel).forEach(([level, nodes]) => {
        console.log(`Neo4j Editor: Processing level ${level} with ${nodes.length} nodes`);
        
        // 对于每个节点，与同层的其他节点创建双向连接
        for (let i = 0; i < nodes.length; i++) {
            for (let j = i + 1; j < nodes.length; j++) {
                const node1 = nodes[i];
                const node2 = nodes[j];
                
                // 检查是否已经存在这种关系
                const existingEdge = targetCy.edges(`[source="${node1.id()}"][target="${node2.id()}"][type="${siblingType}"]`);
                const existingEdgeReverse = targetCy.edges(`[source="${node2.id()}"][target="${node1.id()}"][type="${siblingType}"]`);
                
                if (existingEdge.length === 0 && existingEdgeReverse.length === 0) {
                    // 创建双向关系
                    const edgeId = `sibling_${node1.id()}_${node2.id()}`;
                    targetCy.add({
                        group: 'edges',
                        data: {
                            id: edgeId,
                            source: node1.id(),
                            target: node2.id(),
                            type: siblingType,
                            label: siblingType,
                            'line-color': '#00BCD4',
                            'target-arrow-color': '#00BCD4',
                            'source-arrow-color': '#00BCD4',
                            'source-arrow-shape': 'triangle',
                            'target-arrow-shape': 'triangle',
                            'curve-style': 'bezier',
                            'width': 2.5,
                            'line-style': 'solid'
                        }
                    });
                    
                    console.log(`Neo4j Editor: Created sibling relationship between ${node1.id()} and ${node2.id()}`);
                }
            }
        }
    });
};


/**
 * 导出图为Cypher查询语句
 * @returns {Promise<boolean>} 是否导出成功
 */
window.exportAsCypher = async function() {
    try {
        const sharedData = window.sharedGraphData || { nodes: [], edges: [] };
        let cypherStatements = [];
        
        // 导出节点
        sharedData.nodes.forEach(node => {
            if (!node.data) return;
            
            const id = node.data.id;
            const label = node.data.label || 'Node';
            const properties = node.data.properties || {};
            
            // 构建属性字符串
            const props = Object.entries(properties)
                .map(([key, value]) => {
                    // 处理字符串值需要加引号
                    if (typeof value === 'string') {
                        return `${key}: "${value.replace(/"/g, '\"')}"`;
                    } else if (value === null || value === undefined) {
                        return `${key}: null`;
                    } else {
                        return `${key}: ${JSON.stringify(value)}`;
                    }
                })
                .join(', ');
            
            const nodeStatement = `CREATE (n:${label} {id: "${id}"${props ? ', ' + props : ''}})`;
            cypherStatements.push(nodeStatement);
        });
        
        // 导出关系
        sharedData.edges.forEach(edge => {
            if (!edge.data) return;
            
            const id = edge.data.id;
            const source = edge.data.source;
            const target = edge.data.target;
            const label = edge.data.label || 'RELATES_TO';
            const properties = edge.data.properties || {};
            
            // 构建属性字符串
            const props = Object.entries(properties)
                .map(([key, value]) => {
                    if (typeof value === 'string') {
                        return `${key}: "${value.replace(/"/g, '\"')}"`;
                    } else if (value === null || value === undefined) {
                        return `${key}: null`;
                    } else {
                        return `${key}: ${JSON.stringify(value)}`;
                    }
                })
                .join(', ');
            
            const edgeStatement = `MATCH (a {id: "${source}"}), (b {id: "${target}"}) CREATE (a)-[r:${label} ${props ? '{ ' + props + ' }' : ''}]->(b)`;
            cypherStatements.push(edgeStatement);
        });
        
        // 合并所有语句
        const cypherContent = cypherStatements.join('\n\n');
        
        // 创建Blob和下载链接
        const blob = new Blob([cypherContent], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `neo4j-graph-cypher-${Date.now()}.cypher`;
        
        // 触发下载
        document.body.appendChild(a);
        a.click();
        
        // 清理
        setTimeout(() => {
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        }, 100);
        
        if (typeof window.showToast === 'function') {
            window.showToast('图已成功导出为Cypher查询语句', 'success');
        }
        
        return true;
    } catch (error) {
        console.error('Neo4j Editor: 导出Cypher查询错误:', error);
        if (typeof window.showToast === 'function') {
            window.showToast(`导出Cypher查询失败: ${error.message}`, 'error');
        }
        return false;
    }
};