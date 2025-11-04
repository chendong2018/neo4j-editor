/**
 * 交互模式管理模块
 */

// 当前模式
window.currentMode = 'select';
// 源节点（用于关系创建）
window.sourceNode = null;
// 当前选中的关系类型
window.selectedRelationshipType = null;

/**
 * 设置当前交互模式
 * @param {string} mode - 模式名称 ('select', 'node', 'relationship')
 */
window.setMode = function(mode) {
    try {
        console.log('Mode Manager: setMode called with mode:', mode);
        if (!mode) {
            console.error('Mode Manager: Invalid mode parameter');
            return;
        }
        
        // 更新模式
        console.log('Mode Manager: Setting window.currentMode from', window.currentMode || 'undefined', 'to', mode);
        window.currentMode = mode;
        window.lastModeChange = { mode: mode, time: new Date().toISOString() };
        
        // 重置按钮状态
        console.log('Mode Manager: Resetting mode buttons');
        resetModeButtons();
        
        // 设置活动按钮
        console.log('Mode Manager: Setting active button for mode:', mode);
        var buttonMap = {
            'select': 'select-mode-btn',
            'node': 'node-mode-btn',
            'relationship': 'relationship-mode-btn'
        };
        
        var activeBtnId = buttonMap[mode];
        var activeBtn = document.getElementById(activeBtnId);
        if (activeBtn) {
            // 兼容classList操作
            if (activeBtn.className.indexOf('active') === -1) {
                activeBtn.className += ' active';
            }
            if (activeBtn.className.indexOf('bg-accent') === -1) {
                activeBtn.className += ' bg-accent';
            }
        }
        
        // 根据模式设置光标和行为
        console.log('Mode Manager: Setting cursor and behavior for mode:', mode);
        if (mode === 'select') {
            setDefaultCursor();
            window.sourceNode = null;
            reinstallAllTapListeners();
            window.showToast && window.showToast('选择模式已激活');
        } else if (mode === 'node') {
            setCrosshairCursor();
            reinstallAllTapListeners();
            window.showToast && window.showToast('节点创建模式已激活！点击画布任意位置创建节点');
        } else if (mode === 'relationship') {
            setPointerCursor();
            window.sourceNode = null;
            reinstallAllTapListeners();
            window.showToast && window.showToast('关系创建模式已激活 - 点击节点创建关系');
        }
    } catch (error) {
        console.error('Error in setMode:', error);
    }
}

/**
 * 重置所有模式按钮状态
 */
function resetModeButtons() {
    const buttons = [
        'select-mode-btn',
        'node-mode-btn',
        'relationship-mode-btn'
    ];
    
    // 使用传统for循环替代forEach和箭头函数
    for (var i = 0; i < buttons.length; i++) {
        var btnId = buttons[i];
        var btn = document.getElementById(btnId);
        if (btn) {
            // 兼容classList操作
            btn.className = btn.className.replace(/\b(?:bg-accent|active)\b/g, '').trim();
            if (btn.className.indexOf('bg-gray-700') === -1) {
                btn.className += ' bg-gray-700';
            }
        }
    }
}

/**
 * 设置默认光标
 */
function setDefaultCursor() {
    setCursorForAllContainers('default');
    document.body.style.cursor = '';
}

/**
 * 设置十字准星光标
 */
function setCrosshairCursor() {
    setCursorForAllContainers('crosshair');
    document.body.style.cursor = 'crosshair';
}

/**
 * 设置指针光标
 */
function setPointerCursor() {
    setCursorForAllContainers('pointer');
    document.body.style.cursor = 'pointer';
}

/**
 * 为所有容器设置光标
 * @param {string} cursorType - 光标类型
 */
function setCursorForAllContainers(cursorType) {
    const containerIds = ['cy', 'cy-tree', 'cy-network', 'cytoscape-container', 'tree-container', 'network-container'];
    
    containerIds.forEach(id => {
        const container = document.getElementById(id);
        if (container) {
            container.style.cursor = cursorType;
            container.style.userSelect = cursorType === 'default' ? '' : 'none';
            
            // 设置内部canvas元素
            const canvas = container.querySelector('canvas');
            if (canvas) {
                canvas.style.cursor = cursorType;
            }
        }
    });
    
    // 也设置Cytoscape实例的容器光标
    if (window.cy) window.cy.container().style.cursor = cursorType;
    if (window.cyTree) window.cyTree.container().style.cursor = cursorType;
    if (window.cyNetwork) window.cyNetwork.container().style.cursor = cursorType;
}

/**
 * 重新安装所有点击监听器
 */
window.reinstallAllTapListeners = function() {
    console.log('Mode Manager: reinstallAllTapListeners called');
    console.log('Mode Manager: Current window.currentMode:', window.currentMode);
    
    // 为Tree视图重新安装监听器
    console.log('Mode Manager: Reinstalling listener for Tree view');
    reinstallListener(window.cyTree, 'Tree');
    
    // 为Network视图重新安装监听器
    console.log('Mode Manager: Reinstalling listener for Network view');
    reinstallListener(window.cyNetwork, 'Network');
    
    // 为Main视图重新安装监听器（如果存在）
    if (window.cy && window.cy !== window.cyTree && window.cy !== window.cyNetwork) {
        console.log('Mode Manager: Reinstalling listener for Main view');
        reinstallListener(window.cy, 'Main');
    }
}

/**
 * 为特定视图重新安装点击监听器
 * @param {Object} instance - Cytoscape实例
 * @param {string} viewName - 视图名称
 */
function reinstallListener(instance, viewName) {
    console.log('Mode Manager: reinstallListener called for', viewName, 'view');
    if (!instance) {
        console.error('Mode Manager: No instance provided for', viewName, 'view');
        return;
    }
    
    try {
        // 移除现有的监听器
        console.log('Mode Manager: Removing existing tap listeners for', viewName, 'view');
        instance.off('tap');
        instance.off('tapselect');
        instance.off('click');
        console.log('Mode Manager: Removed existing tap listeners for', viewName, 'view');
        
        // 根据当前模式添加相应的监听器
        const currentMode = window.currentMode || 'select';
        console.log('Mode Manager: Current mode for', viewName, 'view:', currentMode);
        
        if (currentMode === 'node') {
            console.log('Mode Manager: Adding node creation tap listener for', viewName, 'view');
            instance.on('tap', function(event) {
                console.log('Mode Manager:', viewName, 'view tap event in node mode');
                const target = event.target;
                console.log('Mode Manager:', viewName, 'view event.target is instance:', target === instance);
                
                // 只有点击背景时才创建节点
                if (target === instance) {
                    console.log('Mode Manager:', viewName, 'view - canvas background tapped, creating node');
                    handleNodeCreationTap(instance, event);
                }
            });
            console.log('Mode Manager: Node creation tap listener successfully added for', viewName, 'view');
        } else if (currentMode === 'relationship') {
            console.log('Mode Manager: Adding relationship creation tap listener for', viewName, 'view');
            instance.on('tap', function(event) {
                const target = event.target;
                // 安全检查：确保target有isNode方法
                if (target && typeof target.isNode === 'function' && target.isNode()) {
                    console.log('Mode Manager:', viewName, 'view - Relationship mode: Node clicked', target.id());
                    handleRelationshipCreationTap(instance, target, event);
                }
            });
        } else if (currentMode === 'select') {
            console.log('Mode Manager: Setting up select mode tap listener for', viewName, 'view');
            // 选择模式只需要默认的选择行为
            // 确保选择状态正确同步
            instance.on('tapselect', function(event) {
                const target = event.target;
                // 安全检查：确保target有相应的方法
                if (target && (typeof target.isNode === 'function' && target.isNode() || typeof target.isEdge === 'function' && target.isEdge())) {
                    console.log('Mode Manager:', viewName, 'view - Selecting element:', target.id());
                    synchronizeSelection(target, instance);
                }
            });
        }
        
    } catch (err) {
        console.error('Mode Manager: Error reinstalling tap listener for', viewName, 'view:', err);
        window.handleError && window.handleError(err, `Error reinstalling tap listener for ${viewName} view`);
    }
}

/**
 * 处理节点创建点击事件
 * @param {Object} instance - Cytoscape实例
 * @param {Object} event - 事件对象
 */
function handleNodeCreationTap(instance, event) {
    console.log('Mode Manager: handleNodeCreationTap called');
    try {
        const position = event.position || event.cyPosition;
        console.log('Mode Manager: Tap position:', position);
        
        if (!position) {
            console.error('Mode Manager: No position information in event');
            return;
        }
        
        // 优先使用window.selectedNodeType，如果没有则从UI获取当前选中的节点类型
        console.log('Mode Manager: Checking for selectedNodeType');
        let nodeType = window.selectedNodeType;
        if (!nodeType) {
            console.log('Mode Manager: No selectedNodeType, checking UI for active node type button');
            const activeNodeTypeBtn = document.querySelector('.node-type-btn.active');
            nodeType = activeNodeTypeBtn ? activeNodeTypeBtn.getAttribute('data-type') : 'Generic';
            console.log('Mode Manager: Found node type from UI:', nodeType);
        } else {
            console.log('Mode Manager: Using node type from selectedNodeType:', nodeType);
        }
        
        console.log('Mode Manager: Selected node type for creation:', nodeType);
        
        // 创建默认属性对象并应用节点类型的默认属性
        console.log('Mode Manager: Creating default properties');
        const defaultProperties = {};
        
        console.log('Mode Manager: Checking for node type configuration');
        const nodeTypeConfig = window.nodeTypeStyles && window.nodeTypeStyles[nodeType];
        if (nodeTypeConfig && nodeTypeConfig.properties) {
            console.log('Mode Manager: Applying default properties from node type config');
            nodeTypeConfig.properties.forEach(prop => {
                if (prop.key) {
                    // 支持value字段作为默认值
                    defaultProperties[prop.key] = prop.defaultValue !== undefined ? prop.defaultValue : (prop.value !== undefined ? prop.value : '');
                    console.log('Mode Manager: Added property:', prop.key, 'with value:', defaultProperties[prop.key]);
                }
            });
        }
        
        // 创建新节点，确保使用节点类型作为label和type
        console.log('Mode Manager: Generating node ID');
        const newNode = {
            group: 'nodes',
            data: {
                id: generateId('node'),
                label: nodeType,  // 明确使用节点类型作为标签
                type: nodeType,
                properties: defaultProperties, // 使用默认属性
                labels: [nodeType, 'tree', 'network'] // 添加节点类型到labels数组
            },
            position: position
        };
        
        console.log('Mode Manager: Creating new node with data:', newNode.data);
        
        // 添加到所有视图
        console.log('Mode Manager: Adding node to views');
        const success = addNodeToViews(newNode);
        
        if (success) {
            console.log('Mode Manager: Node added successfully');
            debugLog('Created new node: ' + newNode.data.id + ' with type: ' + nodeType);
            window.showToast && window.showToast('Created node of type: ' + nodeType, 'success');
        } else {
            console.error('Mode Manager: Failed to add node to views');
            window.showToast && window.showToast('Failed to add node to views', 'error');
        }
    } catch (error) {
        console.error('Mode Manager: Error in handleNodeCreationTap:', error);
        handleError('Error creating node', error);
    }
}

/**
 * 处理关系创建点击事件
 * @param {Object} instance - Cytoscape实例
 * @param {Object} target - 目标节点
 * @param {Object} event - 事件对象
 */
function handleRelationshipCreationTap(instance, target, event) {
    try {
        // 安全检查
        if (!target || typeof target.data !== 'function') {
            handleError('Invalid target in handleRelationshipCreationTap');
            return;
        }
        
        const nodeId = target.data('id');
        
        if (!window.sourceNode) {
            // 选择第一个节点作为源节点
            window.sourceNode = nodeId;
            // 高亮显示源节点
            if (typeof target.addClass === 'function') {
                target.addClass('source-node');
                window.showToast('Selected source node', 'info');
            }
        } else if (window.sourceNode === nodeId) {
            // 点击同一个节点，取消选择
            window.sourceNode = null;
            if (typeof target.removeClass === 'function') {
                target.removeClass('source-node');
                window.showToast('Source node selection cleared', 'info');
            }
        } else {
            // 优先从window.selectedRelationshipType获取关系类型
            let relType = window.selectedRelationshipType;
            
            // 如果window.selectedRelationshipType不存在，尝试从UI获取活跃的关系类型按钮
            if (!relType) {
                // 查找所有关系类型按钮中的活跃按钮
                const relTypeBtns = document.querySelectorAll('.node-type-btn');
                for (let btn of relTypeBtns) {
                    if (btn.classList.contains('active')) {
                        relType = btn.dataset.type || btn.getAttribute('data-type');
                        // 如果找到了活跃的关系类型，设置到window.selectedRelationshipType
                        window.selectedRelationshipType = relType;
                        break;
                    }
                }
            }
            
            // 如果仍然没有找到，使用默认值RELATES_TO
            if (!relType) {
                relType = 'RELATES_TO';
            }
            
            // 创建边数据，确保是edges组
            const newEdge = {
                group: 'edges', // 明确指定是边
                data: {
                    id: generateId('edge'),
                    source: window.sourceNode,
                    target: nodeId,
                    label: relType,
                    type: relType,
                    properties: {} // 确保添加空的properties对象
                }
            };
            
            // 添加到所有视图
            const success = addEdgeToViews(newEdge);
            
            if (success) {
                debugLog('Created new edge: ' + newEdge.data.id + ' between ' + window.sourceNode + ' and ' + nodeId);
                window.showToast('Created relationship ' + relType, 'success');
            }
            
            // 清除源节点
            window.sourceNode = null;
            // 清除所有高亮
            if (instance && typeof instance.nodes === 'function' && typeof instance.nodes().removeClass === 'function') {
                instance.nodes().removeClass('source-node');
            }
        }
    } catch (error) {
        handleError('Error creating relationship', error);
        window.sourceNode = null;
        window.showToast('Failed to create relationship', 'error');
    }
}

/**
 * 同步两个视图之间的选择状态
 * @param {Object} selectedElement - 选中的元素
 * @param {Object} sourceInstance - 源实例
 */
function synchronizeSelection(selectedElement, sourceInstance) {
    try {
        // 确保共享数据对象存在
        if (!window.sharedGraphData) window.sharedGraphData = { selectedElement: null };
        window.sharedGraphData.selectedElement = selectedElement.data();
        
        // 根据元素类型更新相应的属性面板
        if (selectedElement.isNode()) {
            updateNodePropertiesPanel(selectedElement.data());
        } else if (selectedElement.isEdge()) {
            updateRelationshipPropertiesPanel(selectedElement.data());
        }
        
        // 同步另一个视图的选择状态
        const otherInstance = sourceInstance === window.cyTree ? window.cyNetwork : window.cyTree;
        if (otherInstance && typeof otherInstance.elements === 'function') {
            // 清除其他实例的选择
            otherInstance.elements().unselect();
            // 选中对应元素
            const correspondingElement = otherInstance.getElementById(selectedElement.id());
            if (correspondingElement) {
                correspondingElement.select();
            }
        }
    } catch (error) {
        handleError('Error synchronizing selection', error);
    }
}

/**
 * 更新节点属性面板
 * @param {Object} nodeData - 节点数据
 */
function updateNodePropertiesPanel(nodeData) {
    try {
        debugLog('Update node properties panel with data:', nodeData);
        
        // 显示节点属性面板，隐藏关系属性面板
        const panel = document.getElementById('node-properties-panel');
        const relPanel = document.getElementById('relationship-properties-panel');
        
        if (panel && relPanel) {
            panel.classList.remove('hidden');
            relPanel.classList.add('hidden');
            
            // 设置面板标题
            const panelHeader = panel.querySelector('.panel-header span') || panel.querySelector('.panel-title');
            if (panelHeader) {
                panelHeader.textContent = 'Node Properties';
            }
            
            // 设置节点标签
            const nodeLabelInput = document.getElementById('node-label');
            if (nodeLabelInput && nodeData.label) {
                nodeLabelInput.value = nodeData.label;
            }
            
            // 更新属性输入字段
            // 这里可以根据节点的实际属性动态生成或更新输入字段
        }
    } catch (error) {
        handleError('Error updating node properties panel', error);
    }
}

/**
 * 更新关系属性面板
 * @param {Object} edgeData - 关系数据
 */
function updateRelationshipPropertiesPanel(edgeData) {
    try {
        debugLog('Update relationship properties panel with data:', edgeData);
        
        // 显示关系属性面板，隐藏节点属性面板
        const panel = document.getElementById('node-properties-panel');
        const relPanel = document.getElementById('relationship-properties-panel');
        
        if (panel && relPanel) {
            panel.classList.add('hidden');
            relPanel.classList.remove('hidden');
            
            // 设置面板标题
            const panelHeader = relPanel.querySelector('.panel-header span') || relPanel.querySelector('.panel-title');
            if (panelHeader) {
                panelHeader.textContent = 'Relationship Properties';
            }
            
            // 设置关系标签
            const relLabelInput = document.getElementById('relationship-label');
            if (relLabelInput && edgeData.label) {
                relLabelInput.value = edgeData.label;
            }
            
            // 确保边数据包含properties对象
            if (!edgeData.properties) {
                edgeData.properties = {};
            }
        }
    } catch (error) {
        handleError('Error updating relationship properties panel', error);
    }
}

/**
 * 将节点添加到所有视图
 * @param {Object} nodeData - 节点数据
 * @returns {boolean} 添加是否成功
 */
function addNodeToViews(nodeData) {
    console.log('Mode Manager: addNodeToViews called with node data:', nodeData.data);
    try {
        // 检查必要的实例是否存在
        console.log('Mode Manager: Checking available Cytoscape instances');
        console.log('Mode Manager: window.cy exists:', !!window.cy);
        console.log('Mode Manager: window.cyTree exists:', !!window.cyTree);
        console.log('Mode Manager: window.cyNetwork exists:', !!window.cyNetwork);
        
        if (!window.cy && !window.cyTree && !window.cyNetwork) {
            console.error('Mode Manager: No valid Cytoscape instances found');
            return false;
        }
        
        // 添加到各个视图
        let addedToAtLeastOneView = false;
        
        if (window.cy) {
            try {
                console.log('Mode Manager: Attempting to add node to window.cy');
                window.cy.add(nodeData);
                console.log('Mode Manager: Node successfully added to window.cy');
                addedToAtLeastOneView = true;
            } catch (error) {
                console.error('Mode Manager: Error adding node to main view:', error);
            }
        }
        
        if (window.cyTree && window.cyTree !== window.cy) {
            try {
                console.log('Mode Manager: Attempting to add node to window.cyTree');
                window.cyTree.add(nodeData);
                console.log('Mode Manager: Node successfully added to window.cyTree');
                addedToAtLeastOneView = true;
            } catch (error) {
                console.error('Mode Manager: Error adding node to tree view:', error);
            }
        }
        
        if (window.cyNetwork && window.cyNetwork !== window.cy && window.cyNetwork !== window.cyTree) {
            try {
                console.log('Mode Manager: Attempting to add node to window.cyNetwork');
                window.cyNetwork.add(nodeData);
                console.log('Mode Manager: Node successfully added to window.cyNetwork');
                addedToAtLeastOneView = true;
            } catch (error) {
                console.error('Mode Manager: Error adding node to network view:', error);
            }
        }
        
        console.log('Mode Manager: addNodeToViews result - added to at least one view:', addedToAtLeastOneView);
        return addedToAtLeastOneView;
    } catch (error) {
        console.error('Mode Manager: Error in addNodeToViews:', error);
        return false;
    }
}