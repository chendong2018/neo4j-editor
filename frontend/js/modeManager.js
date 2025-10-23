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
    console.log('Neo4j Editor: Setting mode to:', mode);
    
    // 更新模式
    window.currentMode = mode;
    window.lastModeChange = { mode: mode, time: new Date().toISOString() };
    
    // 重置按钮状态
    resetModeButtons();
    
    // 设置活动按钮
    const buttonMap = {
        'select': 'select-mode-btn',
        'node': 'node-mode-btn',
        'relationship': 'relationship-mode-btn'
    };
    
    const activeBtnId = buttonMap[mode];
    const activeBtn = document.getElementById(activeBtnId);
    if (activeBtn) {
        activeBtn.classList.add('active', 'bg-accent');
    }
    
    // 根据模式设置光标和行为
    if (mode === 'select') {
        setDefaultCursor();
        window.sourceNode = null;
        reinstallAllTapListeners();
        // 替换showToast为console.log
        console.log('选择模式已激活');
    } else if (mode === 'node') {
        setCrosshairCursor();
        reinstallAllTapListeners();
        // 替换showToast为console.log
        console.log('节点创建模式已激活！点击画布任意位置创建节点');
    } else if (mode === 'relationship') {
        setPointerCursor();
        window.sourceNode = null;
        reinstallAllTapListeners();
        // 替换showToast为console.log
        console.log('关系创建模式已激活 - 点击节点创建关系');
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
    
    buttons.forEach(btnId => {
        const btn = document.getElementById(btnId);
        if (btn) {
            btn.classList.remove('bg-accent', 'active');
            btn.classList.add('bg-gray-700');
        }
    });
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
    console.log('Neo4j Editor: Reinstalling all tap listeners');
    
    // 为Tree视图重新安装监听器
    reinstallListener(window.cyTree, 'Tree');
    
    // 为Network视图重新安装监听器
    reinstallListener(window.cyNetwork, 'Network');
    
    // 为Main视图重新安装监听器（如果存在）
    if (window.cy && window.cy !== window.cyTree && window.cy !== window.cyNetwork) {
        reinstallListener(window.cy, 'Main');
    }
}

/**
 * 为特定视图重新安装点击监听器
 * @param {Object} instance - Cytoscape实例
 * @param {string} viewName - 视图名称
 */
function reinstallListener(instance, viewName) {
    if (!instance) {
        console.warn(`Neo4j Editor: ${viewName} view instance not available for listener reinstallation`);
        return;
    }
    
    try {
        // 移除现有的监听器
        instance.off('tap');
        instance.off('tapselect');
        instance.off('click');
        
        // 根据当前模式添加相应的监听器
        if (window.currentMode === 'node') {
            instance.on('tap', function(event) {
                const target = event.target;
                // 只有点击背景时才创建节点
                if (target === instance) {
                    handleNodeCreationTap(instance, event);
                }
            });
        } else if (window.currentMode === 'relationship') {
            instance.on('tap', function(event) {
                const target = event.target;
                // 安全检查：确保target有isNode方法
                if (target && typeof target.isNode === 'function' && target.isNode()) {
                    handleRelationshipCreationTap(instance, target, event);
                }
            });
        } else if (window.currentMode === 'select') {
            // 选择模式只需要默认的选择行为
            // 确保选择状态正确同步
            instance.on('tapselect', function(event) {
                const target = event.target;
                // 安全检查：确保target有相应的方法
                if (target && (typeof target.isNode === 'function' && target.isNode() || typeof target.isEdge === 'function' && target.isEdge())) {
                    synchronizeSelection(target, instance);
                }
            });
        }
        
        console.log(`Neo4j Editor: Tap listener reinstalled for ${viewName} view in ${window.currentMode} mode`);
        
    } catch (err) {
        console.error(`Neo4j Editor: Error reinstalling tap listener for ${viewName} view:`, err);
    }
}

/**
 * 处理节点创建点击事件
 * @param {Object} instance - Cytoscape实例
 * @param {Object} event - 事件对象
 */
function handleNodeCreationTap(instance, event) {
    try {
        const position = event.position || event.cyPosition;
        
        // 获取当前选中的节点类型
        const activeNodeTypeBtn = document.querySelector('.node-type-btn.active');
        const nodeType = activeNodeTypeBtn ? activeNodeTypeBtn.getAttribute('data-type') : 'Generic';
        
        // 创建新节点
        const newNode = {
            group: 'nodes',
            data: {
                id: generateId('node'),
                label: nodeType,
                type: nodeType
            },
            position: position
        };
        
        // 添加到所有视图
        const success = addNodeToViews(newNode);
        
        if (success) {
            debugLog(`Created new node: ${newNode.data.id}`);
        } else {
            showToast('Failed to add node to views', 'error');
        }
    } catch (error) {
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
                showToast('Selected source node', 'info');
            }
        } else if (window.sourceNode === nodeId) {
            // 点击同一个节点，取消选择
            window.sourceNode = null;
            if (typeof target.removeClass === 'function') {
                target.removeClass('source-node');
                showToast('Source node selection cleared', 'info');
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
                debugLog(`Created new edge: ${newEdge.data.id} between ${window.sourceNode} and ${nodeId}`);
                showToast(`Created relationship ${relType}`, 'success');
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
        showToast('Failed to create relationship', 'error');
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