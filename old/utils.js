// 工具函数模块 - 使用IIFE避免全局变量污染
(function() {
    // 确保核心函数存在
    if (typeof window.showToast !== 'function') {
        window.showToast = function(message, type) {
            // 为旧浏览器提供默认值
            if (type === undefined) {
                type = 'info';
            }
            
            console.log('[Toast ' + type + ']: ' + message);
            
            // 创建toast元素
            var toast = document.createElement('div');
            toast.className = 'toast ' + type;
            toast.textContent = message;
            
            // 添加到body
            document.body.appendChild(toast);
            
            // 设置自动关闭定时器
            setTimeout(function() {
                // 添加淡出动画
                toast.style.transition = 'opacity 0.3s ease-out';
                toast.style.opacity = '0';
                
                // 完全淡出后移除元素
                setTimeout(function() {
                    if (toast.parentNode) {
                        toast.parentNode.removeChild(toast);
                    }
                }, 300);
            }, 3000); // 3秒后自动关闭
        };
    }
    
    if (typeof window.debugLog !== 'function') {
        window.debugLog = function(message) {
            console.log('[Debug]: ' + message);
        };
    }
    
    if (typeof window.handleError !== 'function') {
        window.handleError = function(error, message) {
            // 为旧浏览器提供默认值
            if (message === undefined) {
                message = 'An error occurred';
            }
            
            console.error(message + ':', error);
            
            // 安全地显示错误消息，优先使用uiManager.showToast
            try {
                var errorMessage = error && error.message ? error.message : String(error);
                if (typeof window.uiManager === 'object' && typeof window.uiManager.showToast === 'function') {
                    window.uiManager.showToast(message + ': ' + errorMessage, 'error');
                } else if (typeof window.showToast === 'function') {
                    // 后备方案
                    window.showToast(message + ': ' + errorMessage, 'error');
                }
            } catch (e) {
                console.error('Failed to show toast:', e);
            }
        };
    }
    
    // 添加缺失的generateId函数
    if (typeof window.generateId !== 'function') {
        window.generateId = function(prefix) {
            // 为旧浏览器提供默认值
            if (prefix === undefined) {
                prefix = 'element';
            }
            
            return prefix + '_' + Date.now() + '_' + Math.floor(Math.random() * 10000);
        };
    }
    
    // 添加右键菜单功能
    if (typeof window.initializeContextMenu !== 'function') {
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
            menu.innerHTML = '\n                <div class="context-menu-item" id="delete-option">Delete</div>\n            ';
            
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
            style.textContent = '\n                .context-menu-item {\n                    padding: 8px 16px;\n                    cursor: pointer;\n                    transition: background-color 0.2s;\n                    user-select: none;\n                }\n                .context-menu-item:hover {\n                    background-color: rgba(255,255,255,0.1);\n                }\n                #context-menu {\n                    font-family: Arial, sans-serif;\n                }\n            ';
            
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
                deleteOption.addEventListener('click', function() {
                    // 兼容dataset属性访问
                    var elementId = menu.dataset ? menu.dataset.elementId : menu.getAttribute('data-element-id');
                    
                    if (elementId) {
                        // 优先使用统一的删除函数
                        if (window.removeElementFromViews) {
                            window.removeElementFromViews(elementId);
                        } else {
                            // 备用删除方式 - 将forEach替换为for循环
                            var cyInstances = [window.cyTree, window.cyNetwork];
                            for (var i = 0; i < cyInstances.length; i++) {
                                var cy = cyInstances[i];
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
                });
            }
        };
    }
                    
    // 添加键盘删除功能
    if (typeof window.setupKeyboardEvents !== 'function') {
        window.setupKeyboardEvents = function() {
            document.addEventListener('keydown', function(e) {
                // Delete或Backspace键删除选中元素
                // 对于旧浏览器，可能需要使用keyCode
                var keyCode = e.keyCode || e.which;
                // 为旧浏览器提供更可靠的键检测
                    var isDelete = (keyCode === 46); // Delete键
                    var isBackspace = (keyCode === 8); // Backspace键
                
                if ((isDelete || isBackspace) && !e.ctrlKey && !e.metaKey) {
                    // 查找当前选中的元素
                    var selectedElement = null;
                    
                    // 检查两个视图中是否有选中的元素
                    if (window.cyTree) {
                        var selected = window.cyTree.nodes(':selected').first();
                        if (selected) {
                            selectedElement = selected;
                        } else {
                            var selectedEdges = window.cyTree.edges(':selected').first();
                            if (selectedEdges) {
                                selectedElement = selectedEdges;
                            }
                        }
                    }
                    
                    // 如果找到了选中的元素，删除它
                    if (selectedElement && selectedElement.id && selectedElement.id()) {
                        var elementId = selectedElement.id();
                        if (window.removeElementFromViews) {
                            window.removeElementFromViews(elementId);
                            window.showToast('元素已删除', 'success');
                        }
                    }
                }
            });
        };
    }
    
    // 设置元素右键菜单功能
    if (typeof window.setupElementContextMenu !== 'function') {
        window.setupElementContextMenu = function() {
            // 为Cytoscape实例设置右键菜单
            var setupInstanceMenu = function(cyInstance) {
                if (!cyInstance) return;
                
                // 移除可能存在的旧事件监听器
                cyInstance.off('cxttap');
                
                // 使用Cytoscape的cxttap事件
                cyInstance.on('cxttap', 'node,edge', function(evt) {
                    var target = evt.target;
                    var menu = document.getElementById('context-menu');
                    
                    if (target && menu) {
                        var elementId = target.id();
                        
                        // 选中当前元素
                        cyInstance.elements().unselect();
                        target.select();
                        
                        // 存储元素ID
                        window._selectedElementId = elementId;
                        // 兼容dataset属性访问
                        if (menu.dataset) {
                            menu.dataset.elementId = elementId;
                        } else {
                            menu.setAttribute('data-element-id', elementId);
                        }
                        
                        // 显示菜单
                        menu.style.display = 'block';
                        
                        // 设置位置
                        if (evt.originalEvent) {
                            menu.style.left = evt.originalEvent.pageX + 'px';
                            menu.style.top = evt.originalEvent.pageY + 'px';
                        }
                    }
                    
                    // 只阻止默认右键菜单，不阻止事件冒泡
                    if (evt.preventDefault) {
                        evt.preventDefault();
                    } else {
                        evt.returnValue = false;
                    }
                });
                
                // 空白处点击隐藏菜单
                cyInstance.on('tap', function(evt) {
                    if (evt.target === cyInstance) {
                        var menu = document.getElementById('context-menu');
                        if (menu) {
                            menu.style.display = 'none';
                        }
                    }
                });
            };
            
            // 为现有的Cytoscape实例设置右键菜单
            setupInstanceMenu(window.cyTree);
            setupInstanceMenu(window.cyNetwork);
            if (window.cyFallback) {
                setupInstanceMenu(window.cyFallback);
            }
        };
    }
    
    // 添加一个全局函数用于手动重新初始化右键菜单
    if (typeof window.reinitializeContextMenu !== 'function') {
        window.reinitializeContextMenu = function() {
            if (typeof window.initializeContextMenu === 'function') {
                window.initializeContextMenu();
            }
            if (typeof window.setupElementContextMenu === 'function') {
                window.setupElementContextMenu();
            }
        };
    }
    
    // 定义全局treeZoomIn函数，确保只定义一次
    if (typeof window.treeZoomIn !== 'function') {
        window.treeZoomIn = function(cy) {
            if (cy) {
                // 使用普通对象而不是简写属性
                cy.zoom({ fit: true, padding: 50 });
            }
        };
    }
    
    // 添加工具对象到全局
    // 确保utils对象存在
    if (!window.utils) {
        window.utils = {};
    }
    
    // 逐个添加方法以确保兼容性
    window.utils.showToast = window.showToast;
    window.utils.debugLog = window.debugLog;
    window.utils.handleError = window.handleError;
    // 逐个添加方法以确保兼容性
    window.utils.initializeContextMenu = window.initializeContextMenu;
    window.utils.setupElementContextMenu = window.setupElementContextMenu;
    window.utils.reinitializeContextMenu = window.reinitializeContextMenu;
    window.utils.treeZoomIn = window.treeZoomIn;
    
    // 导出常用函数到window对象
    window.escapeHtml = function(text) {
        var div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    };
    
    window.unescapeHtml = function(html) {
        var div = document.createElement('div');
        div.innerHTML = html;
        return div.textContent || div.innerText || '';
    };
    
    window.safeJsonParse = function(str, defaultValue) {
        if (defaultValue === undefined) {
            defaultValue = null;
        }
        try {
            return JSON.parse(str);
        } catch (e) {
            console.error('JSON解析错误:', e);
            return defaultValue;
        }
    };
    
    window.safeJsonStringify = function(obj, defaultValue) {
        if (defaultValue === undefined) {
            defaultValue = '';
        }
        try {
            return JSON.stringify(obj);
        } catch (e) {
            console.error('JSON序列化错误:', e);
            return defaultValue;
        }
    };
    
    window.debounce = function(func, wait) {
        var timeout;
        return function() {
            var context = this;
            var args = arguments;
            var later = function() {
                clearTimeout(timeout);
                func.apply(context, args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    };
    
    window.throttle = function(func, limit) {
        var inThrottle;
        return function() {
            var context = this;
            var args = arguments;
            if (!inThrottle) {
                func.apply(context, args);
                inThrottle = true;
                setTimeout(function() {
                    inThrottle = false;
                }, limit);
            }
        };
    };
    
    // 确保utils对象在全局作用域中可用
    if (!window.utils) {
        window.utils = {};
    }
})();