/**
 * Neo4j Editor 视图切换管理器模块
 * 负责处理树状视图和网络视图之间的切换和同步
 */
(function(neo4jEditor) {
    'use strict';

    // 定义视图切换管理器模块
    const viewSwitcherModule = {
        // 模块版本
        version: '1.0.0',
        
        // 初始化状态
        initialized: false,
        
        // 当前激活的视图
        activeView: 'network', // 默认使用网络视图
        
        // 视图配置
        viewConfig: {
            network: {
                containerId: 'network-view',
                layout: 'cose-bilkent',
                style: 'network'
            },
            tree: {
                containerId: 'tree-view',
                layout: 'cose',
                style: 'tree'
            }
        },
        
        // 视图同步设置
        syncSettings: {
            selection: true, // 同步选择状态
            zoom: true,     // 同步缩放
            pan: false,     // 同步平移（通常对树视图不适用）
            layout: false   // 同步布局
        },
        
        /**
         * 初始化视图切换管理器
         * @param {Object} config - 配置选项
         */
        initialize: function(config = {}) {
            if (this.initialized) {
                console.warn('ViewSwitcher already initialized');
                return this;
            }

            // 合并配置
            this.viewConfig = { ...this.viewConfig, ...config.viewConfig };
            this.syncSettings = { ...this.syncSettings, ...config.syncSettings };
            
            // 检查容器
            this._checkViewContainers();
            
            // 设置视图事件监听
            this._setupViewEventListeners();
            
            // 设置切换控制事件
            this._setupSwitchControls();
            
            // 初始化默认视图
            this._initializeDefaultView();
            
            this.initialized = true;
            console.log('ViewSwitcher initialized');
            return this;
        },
        
        /**
         * 检查视图容器
         * @private
         */
        _checkViewContainers: function() {
            const containers = [];
            
            for (const viewType in this.viewConfig) {
                if (this.viewConfig.hasOwnProperty(viewType)) {
                    const containerId = this.viewConfig[viewType].containerId;
                    const container = document.getElementById(containerId);
                    
                    if (!container) {
                        console.warn(`View container for ${viewType} not found: #${containerId}`);
                        // 创建默认容器
                        const defaultContainer = document.createElement('div');
                        defaultContainer.id = containerId;
                        defaultContainer.style.cssText = `
                            width: 100%;
                            height: 600px;
                            border: 1px solid #ddd;
                            display: none;
                        `;
                        document.body.appendChild(defaultContainer);
                        containers.push(defaultContainer);
                    } else {
                        containers.push(container);
                    }
                }
            }
            
            return containers;
        },
        
        /**
         * 设置视图事件监听
         * @private
         */
        _setupViewEventListeners: function() {
            // 确保cytoscapeModule已初始化
            if (!neo4jEditor || !neo4jEditor.cytoscapeModule) {
                console.warn('Cytoscape module not available, cannot setup view event listeners');
                return;
            }
            
            // 为每个视图设置事件监听
            const setupViewSync = (sourceView, targetView) => {
                const sourceCy = neo4jEditor.cytoscapeModule.getCy(sourceView);
                const targetCy = neo4jEditor.cytoscapeModule.getCy(targetView);
                
                if (!sourceCy || !targetCy) return;
                
                // 同步选择
                if (this.syncSettings.selection) {
                    sourceCy.on('select unselect', 'node,edge', (e) => {
                        const elementId = e.target.id();
                        const isSelected = e.target.selected();
                        
                        const targetElement = targetCy.getElementById(elementId);
                        if (targetElement.length > 0 && targetElement.selected() !== isSelected) {
                            // 临时禁用事件，防止循环触发
                            const eventDisabled = targetCy.scratch('_syncEventsDisabled');
                            if (!eventDisabled) {
                                targetCy.scratch('_syncEventsDisabled', true);
                                targetElement.select(isSelected);
                                setTimeout(() => {
                                    targetCy.scratch('_syncEventsDisabled', false);
                                }, 0);
                            }
                        }
                    });
                }
                
                // 同步缩放
                if (this.syncSettings.zoom) {
                    sourceCy.on('zoom', (e) => {
                        const zoom = e.target.zoom();
                        const targetZoom = targetCy.zoom();
                        
                        // 避免循环触发
                        if (Math.abs(zoom - targetZoom) > 0.01) {
                            targetCy.zoom(zoom);
                        }
                    });
                }
            };
            
            // 设置双向同步
            setupViewSync('network', 'tree');
            setupViewSync('tree', 'network');
        },
        
        /**
         * 设置视图切换控制
         * @private
         */
        _setupSwitchControls: function() {
            // 尝试找到现有的切换按钮
            const networkBtn = document.getElementById('switch-to-network');
            const treeBtn = document.getElementById('switch-to-tree');
            
            if (networkBtn) {
                networkBtn.addEventListener('click', () => this.switchToView('network'));
            }
            
            if (treeBtn) {
                treeBtn.addEventListener('click', () => this.switchToView('tree'));
            }
            
            // 如果没有找到按钮，添加键盘快捷键
            document.addEventListener('keydown', (e) => {
                // Ctrl+1 切换到网络视图
                if (e.ctrlKey && e.key === '1') {
                    e.preventDefault();
                    this.switchToView('network');
                }
                // Ctrl+2 切换到树视图
                else if (e.ctrlKey && e.key === '2') {
                    e.preventDefault();
                    this.switchToView('tree');
                }
            });
        },
        
        /**
         * 初始化默认视图
         * @private
         */
        _initializeDefaultView: function() {
            this.switchToView(this.activeView);
        },
        
        /**
         * 切换到指定视图
         * @param {string} viewType - 视图类型 ('network' 或 'tree')
         */
        switchToView: function(viewType) {
            if (viewType !== 'network' && viewType !== 'tree') {
                console.warn('Invalid view type:', viewType);
                return false;
            }
            
            // 如果已经是当前视图，不做任何操作
            if (viewType === this.activeView) {
                return true;
            }
            
            const prevViewType = this.activeView;
            this.activeView = viewType;
            
            // 隐藏所有视图容器
            for (const type in this.viewConfig) {
                if (this.viewConfig.hasOwnProperty(type)) {
                    const container = document.getElementById(this.viewConfig[type].containerId);
                    if (container) {
                        container.style.display = type === viewType ? 'block' : 'none';
                    }
                }
            }
            
            // 应用视图特定的布局
            if (neo4jEditor && neo4jEditor.cytoscapeModule) {
                neo4jEditor.cytoscapeModule.applyLayout(this.viewConfig[viewType].layout, viewType);
            }
            
            // 触发视图切换事件
            this._triggerViewSwitchedEvent(prevViewType, viewType);
            
            console.log(`Switched from ${prevViewType} to ${viewType} view`);
            return true;
        },
        
        /**
         * 切换视图布局
         * @param {string} viewType - 视图类型
         * @param {string} layoutName - 布局名称
         */
        switchLayout: function(viewType, layoutName) {
            if (!this.viewConfig[viewType]) {
                console.warn('Unknown view type:', viewType);
                return false;
            }
            
            this.viewConfig[viewType].layout = layoutName;
            
            // 如果是当前激活的视图，立即应用新布局
            if (viewType === this.activeView && neo4jEditor && neo4jEditor.cytoscapeModule) {
                neo4jEditor.cytoscapeModule.applyLayout(layoutName, viewType);
            }
            
            return true;
        },
        
        /**
         * 分割视图（同时显示两个视图）
         * @param {boolean} split - 是否分割视图
         */
        splitView: function(split) {
            // 显示或隐藏所有视图
            for (const type in this.viewConfig) {
                if (this.viewConfig.hasOwnProperty(type)) {
                    const container = document.getElementById(this.viewConfig[type].containerId);
                    if (container) {
                        container.style.display = split ? 'block' : (type === this.activeView ? 'block' : 'none');
                        
                        // 如果是分割模式，调整容器大小
                        if (split) {
                            container.style.width = '49.5%';
                            container.style.float = type === 'network' ? 'left' : 'right';
                            container.style.height = '600px';
                        } else {
                            container.style.width = '100%';
                            container.style.float = 'none';
                        }
                    }
                }
            }
            
            // 触发分割视图事件
            this._triggerSplitViewEvent(split);
            
            // 如果是分割模式，更新两个视图
            if (split && neo4jEditor && neo4jEditor.cytoscapeModule) {
                // 重新应用布局以适应新的容器大小
                neo4jEditor.cytoscapeModule.applyLayout(this.viewConfig.network.layout, 'network');
                neo4jEditor.cytoscapeModule.applyLayout(this.viewConfig.tree.layout, 'tree');
            }
            
            return true;
        },
        
        /**
         * 获取当前激活的视图
         * @returns {string} 激活的视图类型
         */
        getActiveView: function() {
            return this.activeView;
        },
        
        /**
         * 更新视图同步设置
         * @param {Object} settings - 同步设置对象
         */
        updateSyncSettings: function(settings) {
            this.syncSettings = { ...this.syncSettings, ...settings };
            return this;
        },
        
        /**
         * 同步两个视图的数据
         */
        syncViewData: function() {
            if (!neo4jEditor || !neo4jEditor.cytoscapeModule) {
                console.warn('Cytoscape module not available, cannot sync view data');
                return false;
            }
            
            // 获取两个视图的实例
            const networkCy = neo4jEditor.cytoscapeModule.getCy('network');
            const treeCy = neo4jEditor.cytoscapeModule.getCy('tree');
            
            if (!networkCy || !treeCy) {
                console.warn('Cannot find view instances to sync');
                return false;
            }
            
            // 通常，我们会以网络视图的数据为准，同步到树视图
            const networkElements = networkCy.elements().jsons();
            
            // 清空树视图并添加网络视图的元素
            treeCy.elements().remove();
            treeCy.add(networkElements);
            
            // 应用树状布局
            treeCy.layout({
                name: this.viewConfig.tree.layout,
                rankDir: 'TB',
                animate: true
            }).run();
            
            return true;
        },
        
        /**
         * 触发视图切换事件
         * @param {string} prevView - 前一个视图
         * @param {string} newView - 新视图
         * @private
         */
        _triggerViewSwitchedEvent: function(prevView, newView) {
            // 如果有事件管理器，使用它触发事件
            if (neo4jEditor && neo4jEditor.eventManager) {
                neo4jEditor.eventManager.trigger('view:switched', {
                    prevView: prevView,
                    newView: newView
                });
            } else {
                // 回退到自定义事件
                const event = new CustomEvent('neo4jEditor:view:switched', {
                    detail: { prevView, newView },
                    bubbles: true
                });
                document.dispatchEvent(event);
            }
        },
        
        /**
         * 触发分割视图事件
         * @param {boolean} split - 是否分割
         * @private
         */
        _triggerSplitViewEvent: function(split) {
            // 如果有事件管理器，使用它触发事件
            if (neo4jEditor && neo4jEditor.eventManager) {
                neo4jEditor.eventManager.trigger('view:split', { split: split });
            } else {
                // 回退到自定义事件
                const event = new CustomEvent('neo4jEditor:view:split', {
                    detail: { split },
                    bubbles: true
                });
                document.dispatchEvent(event);
            }
        },
        
        /**
         * 销毁视图切换管理器
         */
        destroy: function() {
            this.initialized = false;
            console.log('ViewSwitcher destroyed');
        }
    };
    
    // 导出模块
    if (typeof neo4jEditor !== 'undefined') {
        neo4jEditor.viewSwitcher = viewSwitcherModule;
    }
    
    // 向后兼容性 - 创建全局方法
    if (typeof window !== 'undefined') {
        window.switchToNetworkView = function() {
            console.warn('switchToNetworkView is deprecated. Use neo4jEditor.viewSwitcher.switchToView("network") instead.');
            return viewSwitcherModule.switchToView('network');
        };
        
        window.switchToTreeView = function() {
            console.warn('switchToTreeView is deprecated. Use neo4jEditor.viewSwitcher.switchToView("tree") instead.');
            return viewSwitcherModule.switchToView('tree');
        };
        
        window.toggleSplitView = function(split) {
            console.warn('toggleSplitView is deprecated. Use neo4jEditor.viewSwitcher.splitView instead.');
            return viewSwitcherModule.splitView(split);
        };
    }
    
    return viewSwitcherModule;
})(window.neo4jEditor || (window.neo4jEditor = {}));