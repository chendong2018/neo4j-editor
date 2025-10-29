/**
 * 右键菜单管理模块
 */

// 如果utils.js中已定义initializeContextMenu，这里不再重复定义
if (typeof window.initializeContextMenu !== 'function') {
    /**
     * 初始化右键菜单
     */
    window.initializeContextMenu = function() {
        // 移除旧的菜单元素（如果存在）
        var existingMenu = document.getElementById('context-menu');
        if (existingMenu) {
            // 移除旧的事件监听器
            if (existingMenu._clickHandler) {
                document.removeEventListener('click', existingMenu._clickHandler);
            }
            existingMenu.remove();
        }
        
        // 创建右键菜单元素
        var menu = document.createElement('div');
        menu.id = 'context-menu';
        menu.innerHTML = `
            <div class="context-menu-item" id="delete-option">删除</div>
        `;
        
        // 设置基本样式
        menu.style.position = 'fixed';
        menu.style.display = 'none';
        menu.style.backgroundColor = '#333';
        menu.style.color = 'white';
        menu.style.border = '1px solid #555';
        menu.style.borderRadius = '4px';
        menu.style.padding = '8px 0';
        menu.style.zIndex = '1000';
        menu.style.minWidth = '120px';
        menu.style.fontSize = '14px';
        menu.style.boxShadow = '0 2px 8px rgba(0,0,0,0.3)';
        menu.style.opacity = '1';
        menu.style.pointerEvents = 'auto';
        
        // 为菜单项添加样式
        var style = document.createElement('style');
        style.textContent = '.context-menu-item {' +
            'padding: 8px 16px;' +
            'cursor: pointer;' +
            'transition: background-color 0.2s;' +
            'user-select: none;' +
        '}' +
        '.context-menu-item:hover {' +
            'background-color: rgba(255,255,255,0.1);' +
        '}' +
        '#context-menu {' +
            'font-family: Arial, sans-serif;' +
        '}';
        
        // 添加到DOM
        document.head.appendChild(style);
        document.body.appendChild(menu);
        
        // 全局点击事件隐藏菜单
        menu._clickHandler = function(event) {
            if (window.getComputedStyle(menu).display !== 'none' && !menu.contains(event.target)) {
                menu.style.display = 'none';
            }
        };
        
        document.addEventListener('click', menu._clickHandler);
        
        // 设置删除选项点击处理
        var deleteOption = document.getElementById('delete-option');
        if (deleteOption) {
            deleteOption.onclick = function() {
                // 兼容dataset属性访问
                var elementId = menu.dataset ? menu.dataset.elementId : menu.getAttribute('data-element-id');
                
                if (elementId) {
                    // 优先使用统一的删除函数
                    if (window.removeElementFromViews) {
                        window.removeElementFromViews(elementId);
                    } else {
                        // 备用删除方式 - 使用传统循环替代forEach
                        var cys = [window.cyTree, window.cyNetwork];
                        for (var i = 0; i < cys.length; i++) {
                            var cy = cys[i];
                            if (cy) {
                                var node = cy.getElementById(elementId);
                                if (node && node.length > 0) {
                                    node.remove();
                                }
                            }
                        }
                    }
                }
                
                // 隐藏菜单
                menu.style.display = 'none';
            };
        }
    }
}

/**
 * 显示自定义右键菜单
 * @param {number} x - X坐标
 * @param {number} y - Y坐标
 * @param {Array|Object} itemsOrOptions - 菜单项数组 [{text, action}] 或选项对象
 * @param {string} elementId - 关联的元素ID（可选）
 */
window.showContextMenu = function(x, y, itemsOrOptions, elementId) {
    // 阻止事件冒泡，避免影响画布右键事件
    if (window.event) {
        window.event.stopPropagation();
        window.event.preventDefault();
    }
    
    // 确保右键菜单存在
    if (!document.getElementById('context-menu')) {
        window.initializeContextMenu();
    }
    
    var menu = document.getElementById('context-menu');
    if (!menu) {
        return;
    }
    
    // 支持不同的参数格式
    var items = itemsOrOptions;
    if (itemsOrOptions && typeof itemsOrOptions === 'object' && !Array.isArray(itemsOrOptions)) {
        // 如果是选项对象格式
        items = itemsOrOptions.items || [];
        if (itemsOrOptions.elementId && !elementId) {
            elementId = itemsOrOptions.elementId;
        }
    }
    
    // 清空现有菜单项
    menu.innerHTML = '';
    
    // 验证菜单项
    if (!Array.isArray(items)) {
        return;
    }
    
    // 添加自定义菜单项
    for (var i = 0; i < items.length; i++) {
        var item = items[i];
        var index = i;
        if (!item || typeof item !== 'object') {
            return;
        }
        
        var menuItem = document.createElement('div');
            menuItem.className = 'context-menu-item';
            menuItem.textContent = item.text || 'Unnamed Item';
            
            // 添加ID以支持测试
            if (item.id) {
                menuItem.id = 'context-menu-item-' + item.id;
            }
        
        // 使用IIFE创建闭包，确保每个菜单项绑定到正确的item
        (function(currentItem) {
            menuItem.onclick = function(event) {
                try {
                    // 阻止事件冒泡
                    if (event.stopPropagation) {
                        event.stopPropagation();
                    } else {
                        event.cancelBubble = true;
                    }
                    
                    // 执行当前菜单项的action函数
                    if (typeof currentItem.action === 'function') {
                        currentItem.action(event);
                    }
                    
                    menu.style.display = 'none';
                } catch (error) {
                    if (window.handleError) {
                        window.handleError(error, 'Error executing context menu action');
                    }
                }
            };
        })(item);
        
        menu.appendChild(menuItem);
    }
    
    // 设置元素ID关联
    if (elementId) {
        if (menu.dataset) {
            menu.dataset.elementId = elementId;
        } else {
            menu.setAttribute('data-element-id', elementId);
        }
    }
    
    // 设置位置并显示
    menu.style.left = Math.max(0, x) + 'px';
    menu.style.top = Math.max(0, y) + 'px';
    menu.style.display = 'block';
    
    // 确保菜单在视口内
    var menuRect = menu.getBoundingClientRect();
    var viewportWidth = window.innerWidth || document.documentElement.clientWidth;
    var viewportHeight = window.innerHeight || document.documentElement.clientHeight;
    
    if (menuRect.right > viewportWidth) {
            menu.style.left = (x - menuRect.width) + 'px';
        }
        if (menuRect.bottom > viewportHeight) {
            menu.style.top = (y - menuRect.height) + 'px';
        }
    
    // 再次确保不会超出视口边界
    var finalRect = menu.getBoundingClientRect();
    if (finalRect.left < 0) menu.style.left = '0px';
    if (finalRect.top < 0) menu.style.top = '0px';
    
    console.log('Context menu displayed successfully');
};

/**
 * 设置元素右键菜单
 */
window.setupElementContextMenu = function() {
    // 为Tree视图设置右键菜单
    if (window.cyTree) {
        window.cyTree.on('cxttap', 'node', function(event) {
            if (event.preventDefault) {
                event.preventDefault();
            } else {
                event.returnValue = false;
            }
            var node = event.target;
            var nodeId = node.data('id');
            var nodeType = node.data('type');
            
            // 显示节点右键菜单
            window.showContextMenu(event.originalEvent.clientX, event.originalEvent.clientY, [
                { text: 'Edit Properties', action: function() { editNodeProperties(nodeId); } },
                { text: 'Add Relationship', action: function() {
                    window.sourceNode = node;
                    window.setMode('relationship');
                    if (typeof window.showToast === 'function') {
                        window.showToast('Source node selected. Click target node to create relationship.');
                    }
                }},
                { text: 'Delete', action: function() { window.removeElementFromViews(nodeId); } }
            ], nodeId);
        });
        
        window.cyTree.on('cxttap', 'edge', function(event) {
            if (event.preventDefault) {
                event.preventDefault();
            } else {
                event.returnValue = false;
            }
            var edge = event.target;
            var edgeId = edge.data('id');
            
            // 显示边右键菜单
            window.showContextMenu(event.originalEvent.clientX, event.originalEvent.clientY, [
                { text: 'Edit Properties', action: function() { editEdgeProperties(edgeId); } },
                { text: 'Delete', action: function() { window.removeElementFromViews(edgeId); } }
            ], edgeId);
        });
    }
    
    // 为Network视图设置右键菜单
    if (window.cyNetwork) {
        window.cyNetwork.on('cxttap', 'node', function(event) {
            if (event.preventDefault) {
                event.preventDefault();
            } else {
                event.returnValue = false;
            }
            var node = event.target;
            var nodeId = node.data('id');
            
            // 显示节点右键菜单
            window.showContextMenu(event.originalEvent.clientX, event.originalEvent.clientY, [
                { text: 'Edit Properties', action: function() { editNodeProperties(nodeId); } },
                { text: 'Add Relationship', action: function() {
                    window.sourceNode = node;
                    window.setMode('relationship');
                    if (typeof window.showToast === 'function') {
                        window.showToast('Source node selected. Click target node to create relationship.');
                    }
                }},
                { text: 'Delete', action: function() { window.removeElementFromViews(nodeId); } }
            ], nodeId);
        });
        
        window.cyNetwork.on('cxttap', 'edge', function(event) {
            if (event.preventDefault) {
                event.preventDefault();
            } else {
                event.returnValue = false;
            }
            var edge = event.target;
            var edgeId = edge.data('id');
            
            // 显示边右键菜单
            window.showContextMenu(event.originalEvent.clientX, event.originalEvent.clientY, [
                { text: 'Edit Properties', action: function() { editEdgeProperties(edgeId); } },
                { text: 'Delete', action: function() { window.removeElementFromViews(edgeId); } }
            ], edgeId);
        });
    }
};

/**
 * 编辑节点属性
 * @param {string} nodeId - 节点ID
 */
function editNodeProperties(nodeId) {
    // 查找节点数据
    var node = window.findElementInSharedData(nodeId);
    if (!node) return;
    
    // 显示节点属性面板
    if (typeof window.selectNode === 'function') {
        window.selectNode(node);
    }
    
    // 显示节点属性编辑区域
    var nodePropertiesPanel = document.getElementById('node-properties-panel');
    if (nodePropertiesPanel) {
        // 移除hidden类
        if (nodePropertiesPanel.classList) {
            nodePropertiesPanel.classList.remove('hidden');
        } else {
            nodePropertiesPanel.className = nodePropertiesPanel.className.replace(/\bhidden\b/g, '');
        }
        
        // 确保应用按钮存在并设置节点ID
        var applyBtn = document.getElementById('apply-node-properties-btn');
        if (applyBtn) {
            if (applyBtn.dataset) {
                applyBtn.dataset.nodeId = nodeId;
            } else {
                applyBtn.setAttribute('data-node-id', nodeId);
            }
        }
        
        // 显示当前属性并添加动态属性编辑
        renderNodeProperties(nodeId, node.data.properties || {});
    }
    
    if (typeof window.showToast === 'function') {
        window.showToast('编辑节点属性: ' + (node.data.label || 'Node'));
    }
}

/**
 * 渲染节点属性编辑界面
 * @param {string} nodeId - 节点ID
 * @param {Object} properties - 节点属性
 */
function renderNodeProperties(nodeId, properties) {
    var propertiesContainer = document.getElementById('node-properties-container');
    if (!propertiesContainer) return;
    
    // 清空现有内容
    propertiesContainer.innerHTML = '';
    
    // 添加现有属性
    if (properties && typeof properties === 'object') {
        for (var key in properties) {
            if (properties.hasOwnProperty(key)) {
                var value = properties[key];
                addPropertyInput(propertiesContainer, key, value, nodeId);
            }
        }
    }
    
    // 添加添加新属性按钮
    var addNewBtn = document.createElement('button');
    addNewBtn.className = 'btn btn-secondary mt-2';
    addNewBtn.textContent = '添加新属性';
    addNewBtn.onclick = function() {
        addPropertyInput(propertiesContainer, '', '', nodeId);
    };
    propertiesContainer.appendChild(addNewBtn);
}

/**
 * 编辑边属性
 * @param {string} edgeId - 边ID
 */
function editEdgeProperties(edgeId) {
    // 查找边数据
    var edge = window.findElementInSharedData(edgeId);
    if (!edge) return;
    
    // 这里可以实现边属性编辑逻辑
    if (typeof window.showToast === 'function') {
        window.showToast('Edit properties for relationship ' + (edge.data.label || 'Relationship'));
    }
    // 可以打开一个模态框来编辑属性
}