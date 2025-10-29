/**
 * 视图模式管理器 - 处理视图模式切换和分隔线操作
 */
window.viewModeManager = {
    currentViewMode: 'split', // 默认视图模式为分屏
    divider: null,           // 视图分隔线元素
    dividerDragging: false,  // 分隔线拖拽状态
    
    /**
     * 设置视图标题
     * @param {HTMLElement} container - 容器元素
     * @param {string} title - 标题文本
     */
    setViewTitle: function(container, title) {
        const titleElement = container.querySelector('.view-title');
        if (titleElement) {
            titleElement.textContent = title;
        }
    },
    
    /**
     * 更新视图模式按钮样式
     * @param {string} mode - 当前视图模式
     */
    updateViewModeButtonStyles: function(mode) {
        document.querySelectorAll('.view-mode-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        
        const activeBtn = document.querySelector(`.view-mode-btn[data-mode="${mode}"]`);
        if (activeBtn) {
            activeBtn.classList.add('active');
        }
    },
    
    /**
     * 添加视图分隔线
     * @param {HTMLElement} treeContainer - 树视图容器
     * @param {HTMLElement} graphContainer - 网络图容器
     */
    addViewDivider: function(treeContainer, graphContainer) {
        // 如果分隔线已存在，先移除
        this.removeViewDivider();
        
        const container = document.querySelector('.view-container');
        
        // 创建分隔线元素
        this.divider = document.createElement('div');
        this.divider.className = 'view-divider';
        this.divider.style.position = 'absolute';
        this.divider.style.top = '0';
        this.divider.style.width = '5px';
        this.divider.style.height = '100%';
        this.divider.style.backgroundColor = '#e0e0e0';
        this.divider.style.cursor = 'ew-resize';
        this.divider.style.zIndex = '10';
        this.divider.style.left = '50%';
        this.divider.style.transform = 'translateX(-50%)';
        
        container.appendChild(this.divider);
        
        // 初始化拖拽功能
        this.initDividerDrag(treeContainer, graphContainer);
    },
    
    /**
     * 移除视图分隔线
     */
    removeViewDivider: function() {
        if (this.divider && this.divider.parentNode) {
            this.divider.parentNode.removeChild(this.divider);
            this.divider = null;
        }
    },
    
    /**
     * 初始化分隔线拖拽功能
     * @param {HTMLElement} treeContainer - 树视图容器
     * @param {HTMLElement} graphContainer - 网络图容器
     */
    initDividerDrag: function(treeContainer, graphContainer) {
        if (!this.divider) return;
        
        const container = document.querySelector('.view-container');
        const minWidth = 300; // 最小宽度限制
        
        this.divider.addEventListener('mousedown', (e) => {
            e.preventDefault();
            this.dividerDragging = true;
            document.body.style.cursor = 'ew-resize';
            
            // 添加拖拽样式
            this.divider.classList.add('dragging');
        });
        
        document.addEventListener('mousemove', (e) => {
            if (!this.dividerDragging) return;
            
            const containerRect = container.getBoundingClientRect();
            let newLeft = e.clientX - containerRect.left;
            
            // 计算容器宽度，减去分隔线宽度
            const containerWidth = containerRect.width;
            
            // 限制最小宽度
            if (newLeft < minWidth) newLeft = minWidth;
            if (newLeft > containerWidth - minWidth) newLeft = containerWidth - minWidth;
            
            // 更新分隔线位置
            const percentage = (newLeft / containerWidth) * 100;
            this.divider.style.left = `${percentage}%`;
            
            // 更新容器宽度
            treeContainer.style.width = `${percentage - 1}%`;
            graphContainer.style.width = `${100 - percentage - 1}%`;
        });
        
        document.addEventListener('mouseup', () => {
            if (this.dividerDragging) {
                this.dividerDragging = false;
                document.body.style.cursor = '';
                
                // 移除拖拽样式
                if (this.divider) {
                    this.divider.classList.remove('dragging');
                }
            }
        });
    },
    
    /**
     * 切换视图模式
     * @param {string} mode - 视图模式 ('split', 'tree', 'graph')
     * @param {HTMLElement} treeContainer - 树视图容器
     * @param {HTMLElement} graphContainer - 网络图容器
     */
    switchViewMode: function(mode, treeContainer, graphContainer) {
        // 验证模式
        const validModes = ['split', 'tree', 'graph'];
        if (!validModes.includes(mode)) {
            console.error(`Invalid view mode: ${mode}`);
            return;
        }
        
        // 保存当前模式
        this.currentViewMode = mode;
        
        // 更新按钮样式
        this.updateViewModeButtonStyles(mode);
        
        // 执行视图切换
        this.performViewSwitch(mode, treeContainer, graphContainer);
    },
    
    /**
     * 执行视图切换
     * @param {string} mode - 视图模式
     * @param {HTMLElement} treeContainer - 树视图容器
     * @param {HTMLElement} graphContainer - 网络图容器
     */
    performViewSwitch: function(mode, treeContainer, graphContainer) {
        // 动画过渡效果
        const animateTransition = (treeWidth, graphWidth, showDivider) => {
            // 应用平滑过渡
            treeContainer.style.transition = 'width 0.3s ease';
            graphContainer.style.transition = 'width 0.3s ease';
            
            // 设置宽度
            treeContainer.style.width = `${treeWidth}%`;
            graphContainer.style.width = `${graphWidth}%`;
            
            // 显示或隐藏分隔线
            if (showDivider) {
                this.addViewDivider(treeContainer, graphContainer);
            } else {
                this.removeViewDivider();
            }
            
            // 设置显示状态
            treeContainer.style.display = treeWidth > 0 ? 'flex' : 'none';
            graphContainer.style.display = graphWidth > 0 ? 'flex' : 'none';
            
            // 更新视图标题
            if (mode === 'split') {
                this.setViewTitle(treeContainer, 'Tree View');
                this.setViewTitle(graphContainer, 'Network View');
            } else if (mode === 'tree') {
                this.setViewTitle(treeContainer, 'Tree View');
            } else if (mode === 'graph') {
                this.setViewTitle(graphContainer, 'Network View');
            }
        };
        
        // 根据模式切换视图
        switch (mode) {
            case 'split':
                // 分屏模式 - 左右各占50%
                animateTransition(49, 49, true);
                break;
                
            case 'tree':
                // 仅树视图 - 占100%
                animateTransition(100, 0, false);
                break;
                
            case 'graph':
                // 仅网络图 - 占100%
                animateTransition(0, 100, false);
                break;
        }
    }
};
