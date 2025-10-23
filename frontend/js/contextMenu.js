/**
 * 右键菜单管理模块
 */

/**
 * 显示右键菜单
 * @param {Event} event - 右键点击事件
 */
window.showContextMenu = function(event) {
    event.preventDefault();
    
    // 移除任何现有的右键菜单
    removeContextMenu();
    
    // 创建右键菜单元素
    const menu = document.createElement('div');
    menu.id = 'context-menu';
    menu.className = 'bg-gray-800 text-white rounded shadow-lg py-1 absolute z-50 border border-gray-700';
    
    // 根据点击目标决定显示什么菜单
    let targetElement = event.target;
    let menuItems = [];
    
    // 检查是否点击了Cytoscape元素（节点或边）
    const isCytoscapeElement = targetElement.closest('.cytoscape-container') !== null;
    const cytoscapeInstance = getCytoscapeInstanceFromEvent(event);
    const cyTarget = cytoscapeInstance ? cytoscapeInstance.getElementById(event.target.id) : null;
    
    if (cyTarget) {
        if (cyTarget.isNode()) {
            // 节点菜单
            menuItems = [
                { label: '添加属性', action: () => showAddPropertyModal('node', cyTarget.data()) },
                { label: '删除节点', action: () => confirmAndDeleteElement(cyTarget.data().id) },
                { type: 'separator' },
                { label: '查看详情', action: () => showElementDetails(cyTarget.data()) }
            ];
        } else if (cyTarget.isEdge()) {
            // 边菜单
            menuItems = [
                { label: '添加属性', action: () => showAddPropertyModal('edge', cyTarget.data()) },
                { label: '删除关系', action: () => confirmAndDeleteElement(cyTarget.data().id) },
                { type: 'separator' },
                { label: '查看详情', action: () => showElementDetails(cyTarget.data()) }
            ];
        }
    } else if (isCytoscapeElement) {
        // 画布菜单
        menuItems = [
            { label: '创建节点', action: () => {
                setMode('node');
                removeContextMenu();
            }},
            { label: '清空图', action: () => {
                if (confirm('确定要清除整个图吗？此操作不可撤销。')) {
                    clearGraph();
                    removeContextMenu();
                }
            }},
            { type: 'separator' },
            { label: '导出图', action: () => {
                exportGraphData();
                removeContextMenu();
            }}
        ];
    } else {
        // 默认菜单
        menuItems = [
            { label: '选择模式', action: () => setMode('select') },
            { label: '节点模式', action: () => setMode('node') },
            { label: '关系模式', action: () => setMode('relationship') },
            { type: 'separator' },
            { label: '导出图', action: () => exportGraphData() }
        ];
    }
    
    // 添加菜单项
    menuItems.forEach(item => {
        if (item.type === 'separator') {
            const separator = document.createElement('div');
            separator.className = 'border-t border-gray-700 my-1';
            menu.appendChild(separator);
        } else {
            const menuItem = document.createElement('div');
            menuItem.className = 'px-4 py-2 hover:bg-gray-700 cursor-pointer';
            menuItem.textContent = item.label;
            menuItem.addEventListener('click', () => {
                item.action();
                removeContextMenu();
            });
            menu.appendChild(menuItem);
        }
    });
    
    // 设置菜单位置
    menu.style.left = event.clientX + 'px';
    menu.style.top = event.clientY + 'px';
    
    // 添加到文档
    document.body.appendChild(menu);
    
    // 添加点击外部关闭菜单的事件
    document.addEventListener('click', closeContextMenuOnClickOutside);
};

/**
 * 移除右键菜单
 */
function removeContextMenu() {
    const menu = document.getElementById('context-menu');
    if (menu) {
        document.body.removeChild(menu);
        document.removeEventListener('click', closeContextMenuOnClickOutside);
    }
}

/**
 * 点击外部关闭右键菜单
 * @param {Event} event - 点击事件
 */
function closeContextMenuOnClickOutside(event) {
    const menu = document.getElementById('context-menu');
    if (menu && !menu.contains(event.target)) {
        removeContextMenu();
    }
}

/**
 * 从事件获取对应的Cytoscape实例
 * @param {Event} event - 事件对象
 * @returns {Object|null} Cytoscape实例或null
 */
function getCytoscapeInstanceFromEvent(event) {
    const container = event.target.closest('#cy-tree, #cy-network, #cytoscape-container');
    
    if (container) {
        if (container.id === 'cy-tree') return window.cyTree;
        if (container.id === 'cy-network') return window.cyNetwork;
        if (container.id === 'cytoscape-container') return window.cy;
    }
    
    return null;
}

/**
 * 为Cytoscape实例设置右键菜单
 * @param {Object} instance - Cytoscape实例
 */
function setupContextMenuForCytoscapeInstance(instance) {
    if (!instance) return;
    
    // 添加右键菜单事件监听器
    instance.on('cxttap', function(event) {
        event.preventDefault();
        
        // 为Cytoscape元素创建自定义事件
        const customEvent = new MouseEvent('contextmenu', {
            clientX: event.originalEvent.clientX,
            clientY: event.originalEvent.clientY,
            bubbles: true,
            cancelable: true
        });
        
        // 标记事件来源，以便showContextMenu知道这是Cytoscape元素
        customEvent.cyTarget = event.target;
        customEvent.cyInstance = instance;
        
        // 触发事件
        document.dispatchEvent(customEvent);
    });
}

/**
 * 为所有Cytoscape实例设置右键菜单
 */
window.setupContextMenuForCytoscapeInstances = function() {
    // 为Tree视图设置右键菜单
    setupContextMenuForCytoscapeInstance(window.cyTree);
    
    // 为Network视图设置右键菜单
    setupContextMenuForCytoscapeInstance(window.cyNetwork);
    
    // 为Main视图设置右键菜单（如果存在）
    if (window.cy && window.cy !== window.cyTree && window.cy !== window.cyNetwork) {
        setupContextMenuForCytoscapeInstance(window.cy);
    }
    
    // 添加全局右键菜单事件监听，防止事件被拦截
    document.addEventListener('contextmenu', function(event) {
        // 检查是否已经被处理
        if (!event.defaultPrevented) {
            showContextMenu(event);
        }
    });
};

/**
 * 确认并删除元素
 * @param {string} elementId - 元素ID
 */
function confirmAndDeleteElement(elementId) {
    if (confirm('确定要删除这个元素吗？')) {
        removeElementFromViews(elementId);
    }
}

/**
 * 显示添加属性模态框
 * @param {string} type - 元素类型 ('node' 或 'edge')
 * @param {Object} elementData - 元素数据
 */
function showAddPropertyModal(type, elementData) {
    const modal = document.getElementById('add-property-modal');
    if (modal) {
        // 设置元素数据到模态框，以便保存时使用
        modal.dataset.elementId = elementData.id;
        modal.dataset.elementType = type;
        
        // 清空输入框
        const propertyKeyInput = document.getElementById('property-key');
        const propertyValueInput = document.getElementById('property-value');
        const propertyTypeSelect = document.getElementById('property-type');
        
        if (propertyKeyInput) propertyKeyInput.value = '';
        if (propertyValueInput) propertyValueInput.value = '';
        if (propertyTypeSelect) propertyTypeSelect.value = 'string';
        
        // 显示模态框
        modal.classList.remove('hidden');
    }
}

/**
 * 显示元素详情
 * @param {Object} elementData - 元素数据
 */
function showElementDetails(elementData) {
    console.log('Element details:', elementData);
    // 这里可以实现显示详细信息的逻辑
    // 例如，更新属性面板或打开详情模态框
}

// 导出模块对象到全局
window.contextMenuModule = {
    showContextMenu: window.showContextMenu,
    setupContextMenuForCytoscapeInstances: window.setupContextMenuForCytoscapeInstances
};