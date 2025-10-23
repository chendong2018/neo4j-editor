// 工具函数模块 - 使用IIFE避免全局变量污染
(function() {
    // 确保核心函数存在
    if (typeof window.showToast !== 'function') {
        window.showToast = function(message, type = 'info') {
            console.log(`[Toast ${type}]: ${message}`);
        };
    }
    
    if (typeof window.debugLog !== 'function') {
        window.debugLog = function(message) {
            console.log(`[Debug]: ${message}`);
        };
    }
    
    if (typeof window.handleError !== 'function') {
        window.handleError = function(error, message = 'An error occurred') {
            console.error(`${message}:`, error);
            window.showToast(`${message}: ${error.message || String(error)}`, 'error');
        };
    }
    
    // 添加缺失的generateId函数
    if (typeof window.generateId !== 'function') {
        window.generateId = function(prefix = 'element') {
            return prefix + '_' + Date.now() + '_' + Math.floor(Math.random() * 10000);
        };
    }
    
    // 添加右键菜单功能
    if (typeof window.initializeContextMenu !== 'function') {
        window.initializeContextMenu = function() {
            // 移除旧的菜单元素（如果存在）
            const existingMenu = document.getElementById('context-menu');
            if (existingMenu) {
                existingMenu.remove();
            }
            
            // 创建右键菜单元素
            const menu = document.createElement('div');
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
            const style = document.createElement('style');
            style.textContent = `
                .context-menu-item {
                    padding: 8px 16px;
                    cursor: pointer;
                    transition: background-color 0.2s;
                    user-select: none;
                }
                .context-menu-item:hover {
                    background-color: rgba(255,255,255,0.1);
                }
                #context-menu {
                    font-family: Arial, sans-serif;
                }
            `;
            
            // 添加到DOM
            document.head.appendChild(style);
            document.body.appendChild(menu);
            
            // 移除可能存在的旧事件监听器，避免重复绑定
                const cleanUpOldListeners = function() {
                    const menu = document.getElementById('context-menu');
                    if (menu && menu._clickHandler) {
                        document.removeEventListener('click', menu._clickHandler);
                    }
                };
                
                cleanUpOldListeners();
                
                // 全局点击事件隐藏菜单
                const menuEl = document.getElementById('context-menu');
                menuEl._clickHandler = function(event) {
                    if (event.target && window.getComputedStyle(menuEl).display !== 'none' && !menuEl.contains(event.target)) {
                        menuEl.style.display = 'none';
                    }
                };
                
                document.addEventListener('click', menuEl._clickHandler);
                
                // 设置删除选项点击处理
                const deleteOption = document.getElementById('delete-option');
                if (deleteOption) {
                    deleteOption.addEventListener('click', function() {
                        const menu = document.getElementById('context-menu');
                        const elementId = menu.dataset.elementId;
                        
                        if (elementId) {
                            // 检查removeElementFromViews是否存在
                            if (window.removeElementFromViews) {
                                window.removeElementFromViews(elementId);
                            } else {
                                // 尝试直接从Cytoscape实例中删除
                                if (window.cyTree) {
                                    const node = window.cyTree.getElementById(elementId);
                                    if (node && node.length > 0) {
                                        node.remove();
                                    }
                                }
                                if (window.cyNetwork) {
                                    const node = window.cyNetwork.getElementById(elementId);
                                    if (node && node.length > 0) {
                                        node.remove();
                                    }
                                }
                            }
                        }
                        
                        // 隐藏菜单
                        if (menu) {
                            menu.style.display = 'none';
                        }
                    });
                }
        };
    }
    
    // 添加一个全局测试按钮函数，用于调试右键菜单
    // if (typeof window.addContextMenuTestButton !== 'function') {
    //     window.addContextMenuTestButton = function() {
    //         console.log('utils.js: 添加右键菜单测试按钮...');
            
    //         // 移除已存在的测试按钮
    //         const existingButton = document.getElementById('test-context-menu-btn');
    //         if (existingButton) {
    //             existingButton.remove();
    //         }
            
    //         // 创建测试按钮
    //         const button = document.createElement('button');
    //         button.id = 'test-context-menu-btn';
    //         button.textContent = '测试右键菜单';
    //         button.style.cssText = `
    //             position: fixed;
    //             top: 10px;
    //             right: 10px;
    //             z-index: 10000;
    //             background-color: #e74c3c;
    //             color: white;
    //             border: none;
    //             padding: 10px 20px;
    //             border-radius: 4px;
    //             cursor: pointer;
    //             font-size: 14px;
    //             font-weight: bold;
    //         `;
            
    //         button.addEventListener('click', function() {
    //             console.log('utils.js: 测试按钮被点击，尝试显示右键菜单');
    //             const menu = document.getElementById('context-menu');
                
    //             if (!menu) {
    //                 console.log('utils.js: 右键菜单不存在，重新初始化');
    //                 if (typeof window.initializeContextMenu === 'function') {
    //                     window.initializeContextMenu();
    //                 }
    //             }
                
    //             // 显示测试菜单
    //             const testMenu = document.getElementById('context-menu');
    //             if (testMenu) {
    //                 testMenu.dataset.elementId = 'test-element';
    //                 testMenu.style.display = 'block';
    //                 testMenu.style.left = '150px';
    //                 testMenu.style.top = '150px';
    //                 testMenu.style.opacity = '1';
    //                 testMenu.style.pointerEvents = 'auto';
    //                 testMenu.style.backgroundColor = '#2ed573'; // 测试按钮点击时变为绿色
                    
    //                 // 滚动到菜单位置
    //                 window.scrollTo({
    //                     left: parseInt(testMenu.style.left),
    //                     top: parseInt(testMenu.style.top),
    //                     behavior: 'smooth'
    //                 });
                    
    //                 console.log('utils.js: 测试菜单已显示');
    //                 console.log(`utils.js: 测试菜单详细状态 - 显示: ${testMenu.style.display}, 位置: ${testMenu.style.left}, ${testMenu.style.top}, z-index: ${testMenu.style.zIndex}`);
    //                 console.log(`utils.js: 测试菜单项数量: ${testMenu.querySelectorAll('.context-menu-item').length}`);
                    
    //                 // 添加闪烁效果以增强可见性
    //                 let blinkCount = 0;
    //                 const blinkInterval = setInterval(() => {
    //                     if (blinkCount < 3) {
    //                         testMenu.style.boxShadow = blinkCount % 2 === 0 ? 
    //                             '0 0 30px 10px rgba(255, 255, 0, 0.7)' : 
    //                             '0 6px 24px rgba(0,0,0,0.7)';
    //                         blinkCount++;
    //                     } else {
    //                         clearInterval(blinkInterval);
    //                         testMenu.style.boxShadow = '0 6px 24px rgba(0,0,0,0.7)';
    //                     }
    //                 }, 500);
    //             }
    //         });
            
    //         document.body.appendChild(button);
    //         console.log('utils.js: 测试按钮添加完成');
    //     };
    // }
    
    // 添加键盘删除功能
    if (typeof window.setupKeyboardEvents !== 'function') {
        window.setupKeyboardEvents = function() {
            document.addEventListener('keydown', function(e) {
                // Delete或Backspace键删除选中元素
                if ((e.key === 'Delete' || e.key === 'Backspace') && !e.ctrlKey && !e.metaKey) {
                    // 查找当前选中的元素
                    let selectedElement = null;
                    
                    // 检查两个视图中是否有选中的元素
                    if (window.cyTree) {
                        const selected = window.cyTree.nodes(':selected').first();
                        if (selected) {
                            selectedElement = selected;
                        } else {
                            const selectedEdges = window.cyTree.edges(':selected').first();
                            if (selectedEdges) {
                                selectedElement = selectedEdges;
                            }
                        }
                    }
                    
                    // 如果找到了选中的元素，删除它
                    if (selectedElement && selectedElement.id && selectedElement.id()) {
                        const elementId = selectedElement.id();
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
            const setupInstanceMenu = function(cyInstance) {
                if (!cyInstance) return;
                
                // 移除可能存在的旧事件监听器
                cyInstance.off('cxttap');
                
                // 使用Cytoscape的cxttap事件
                cyInstance.on('cxttap', 'node,edge', function(evt) {
                    const target = evt.target;
                    const menu = document.getElementById('context-menu');
                    
                    if (target && menu) {
                        const elementId = target.id();
                        
                        // 选中当前元素
                        cyInstance.elements().unselect();
                        target.select();
                        
                        // 存储元素ID
                        window._selectedElementId = elementId;
                        menu.dataset.elementId = elementId;
                        
                        // 显示菜单
                        menu.style.display = 'block';
                        
                        // 设置位置
                        if (evt.originalEvent) {
                            menu.style.left = evt.originalEvent.pageX + 'px';
                            menu.style.top = evt.originalEvent.pageY + 'px';
                        }
                    }
                    
                    // 只阻止默认右键菜单，不阻止事件冒泡
                    evt.preventDefault();
                });
                
                // 空白处点击隐藏菜单
                cyInstance.on('tap', function(evt) {
                    if (evt.target === cyInstance) {
                        const menu = document.getElementById('context-menu');
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
                cy.zoom({ fit: true, padding: 50 });
            }
        };
    }
    
    // 添加工具对象到全局
    window.utils = {
        showToast: window.showToast,
        debugLog: window.debugLog,
        handleError: window.handleError,
        generateId: window.generateId,
        initializeContextMenu: window.initializeContextMenu,
        setupElementContextMenu: window.setupElementContextMenu,
        reinitializeContextMenu: window.reinitializeContextMenu,
        treeZoomIn: window.treeZoomIn
    };
    
    // 导出模块（如果支持CommonJS）
    if (typeof module !== 'undefined' && typeof module.exports !== 'undefined') {
        module.exports = window.utils;
    }
})();