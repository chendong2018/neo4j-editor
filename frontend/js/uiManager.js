/**
 * UI管理器模块
 */

/**
 * UI管理器对象
 */
const uiManager = {
    /**
     * 显示提示信息
     * @param {string} message - 提示信息内容
     * @param {string} type - 提示类型 ('success', 'error', 'info')
     * @param {number} duration - 显示持续时间（毫秒）
     */
    showToast: function(message, type = 'info', duration = 3000) {
        // 移除旧的toast
        const oldToast = document.getElementById('toast-message');
        if (oldToast) {
            oldToast.remove();
        }
        
        // 创建新的toast元素
        const toast = document.createElement('div');
        toast.id = 'toast-message';
        toast.className = `fixed z-50 px-6 py-3 rounded-lg shadow-lg transform transition-all duration-500 ease-in-out font-medium`;
        
        // 设置位置和初始状态
        toast.style.bottom = '-100px';
        toast.style.left = '50%';
        toast.style.transform = 'translateX(-50%)';
        toast.style.opacity = '0';
        toast.style.zIndex = '9999';
        
        // 根据类型设置样式
        switch (type) {
            case 'success':
                toast.style.backgroundColor = '#10b981'; // Green
                toast.style.color = 'white';
                break;
            case 'error':
                toast.style.backgroundColor = '#ef4444'; // Red
                toast.style.color = 'white';
                break;
            case 'warning':
                toast.style.backgroundColor = '#f59e0b'; // Yellow
                toast.style.color = 'white';
                break;
            default:
                toast.style.backgroundColor = '#3b82f6'; // Blue
                toast.style.color = 'white';
        }
        
        // 设置提示信息内容
        toast.textContent = message;
        
        // 添加到DOM
        document.body.appendChild(toast);
        
        // 显示动画
        setTimeout(() => {
            toast.style.bottom = '20px';
            toast.style.opacity = '1';
        }, 10);
        
        // 自动隐藏
        setTimeout(() => {
            toast.style.bottom = '-100px';
            toast.style.opacity = '0';
            // 移除元素
            setTimeout(() => {
                if (document.body.contains(toast)) {
                    document.body.removeChild(toast);
                }
            }, 500);
        }, duration);
    },
    
    /**
     * 更新连接状态UI
     * @param {boolean} isConnected - 是否已连接
     * @param {string} message - 状态消息
     */
    updateConnectionStatus: function(isConnected, message) {
        const statusEl = document.getElementById('connection-status');
        if (statusEl) {
            if (isConnected) {
                statusEl.className = 'bg-green-500 text-white';
                statusEl.textContent = '已连接';
            } else {
                statusEl.className = 'bg-red-500 text-white';
                statusEl.textContent = '未连接';
            }
        }
        
        // 如果提供了消息，显示toast
        if (message) {
            this.showToast(message, isConnected ? 'success' : 'error');
        }
    },
    
    /**
     * 更新元素计数器
     * @param {number} nodeCount - 节点数量
     * @param {number} edgeCount - 边数量
     */
    updateElementCounters: function(nodeCount, edgeCount) {
        const nodeCountEl = document.getElementById('node-count');
        const edgeCountEl = document.getElementById('edge-count');
        
        if (nodeCountEl) {
            nodeCountEl.textContent = nodeCount || 0;
        }
        if (edgeCountEl) {
            edgeCountEl.textContent = edgeCount || 0;
        }
    },
    
    /**
     * 显示模态框
     * @param {string} modalId - 模态框ID
     */
    showModal: function(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.classList.remove('hidden');
            modal.classList.add('flex');
            // 阻止背景滚动
            document.body.style.overflow = 'hidden';
        }
    },
    
    /**
     * 隐藏模态框
     * @param {string} modalId - 模态框ID
     */
    hideModal: function(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.classList.add('hidden');
            modal.classList.remove('flex');
            // 恢复背景滚动
            document.body.style.overflow = 'auto';
        }
    },
    
    /**
     * 初始化模态框关闭按钮
     * @param {string} modalId - 模态框ID
     * @param {string} closeButtonId - 关闭按钮ID
     */
    initModalClose: function(modalId, closeButtonId) {
        const closeButton = document.getElementById(closeButtonId);
        if (closeButton) {
            closeButton.addEventListener('click', () => {
                this.hideModal(modalId);
            });
        }
        
        // 点击背景关闭模态框
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.addEventListener('click', (event) => {
                if (event.target === modal) {
                    this.hideModal(modalId);
                }
            });
        }
    },
    
    /**
     * 设置按钮加载状态
     * @param {string} buttonId - 按钮ID
     * @param {boolean} isLoading - 是否加载中
     * @param {string} loadingText - 加载时文本
     */
    setButtonLoading: function(buttonId, isLoading, loadingText = '加载中...') {
        const button = document.getElementById(buttonId);
        if (button) {
            if (isLoading) {
                button.disabled = true;
                button.dataset.originalText = button.textContent;
                button.textContent = loadingText;
                button.classList.add('opacity-70', 'cursor-not-allowed');
            } else {
                button.disabled = false;
                if (button.dataset.originalText) {
                    button.textContent = button.dataset.originalText;
                    delete button.dataset.originalText;
                }
                button.classList.remove('opacity-70', 'cursor-not-allowed');
            }
        }
    },
    
    /**
     * 初始化拖拽调整大小功能
     * @param {string} elementId - 要调整大小的元素ID
     * @param {string} handleId - 拖拽句柄ID
     * @param {string} direction - 拖拽方向 ('horizontal', 'vertical')
     */
    initResizable: function(elementId, handleId, direction = 'horizontal') {
        const element = document.getElementById(elementId);
        const handle = document.getElementById(handleId);
        
        if (!element || !handle) return;
        
        let isResizing = false;
        let startX, startY, startWidth, startHeight;
        
        handle.addEventListener('mousedown', (e) => {
            isResizing = true;
            startX = e.clientX;
            startY = e.clientY;
            startWidth = element.offsetWidth;
            startHeight = element.offsetHeight;
            
            // 添加拖拽样式
            document.body.style.cursor = direction === 'horizontal' ? 'ew-resize' : 'ns-resize';
            handle.style.cursor = direction === 'horizontal' ? 'ew-resize' : 'ns-resize';
            
            // 阻止默认行为
            e.preventDefault();
        });
        
        document.addEventListener('mousemove', (e) => {
            if (!isResizing) return;
            
            if (direction === 'horizontal') {
                const width = startWidth + (e.clientX - startX);
                // 限制最小宽度
                if (width > 200) {
                    element.style.width = `${width}px`;
                }
            } else {
                const height = startHeight + (e.clientY - startY);
                // 限制最小高度
                if (height > 100) {
                    element.style.height = `${height}px`;
                }
            }
        });
        
        document.addEventListener('mouseup', () => {
            if (!isResizing) return;
            
            isResizing = false;
            document.body.style.cursor = '';
            handle.style.cursor = '';
        });
    },
    
    /**
     * 初始化所有UI组件
     */
    init: function() {
        // 初始化模态框关闭功能
        this.initModalClose('add-node-modal', 'close-node-modal');
        this.initModalClose('add-relationship-modal', 'close-relationship-modal');
        this.initModalClose('neo4j-connection-modal', 'close-connection-modal');
        
        // 初始化侧边栏拖拽调整大小
        this.initResizable('sidebar', 'sidebar-resizer', 'horizontal');
        
        // 初始化右侧面板拖拽调整大小
        this.initResizable('right-panel', 'right-panel-resizer', 'horizontal');
        
        // 绑定工具栏按钮事件
        this.bindToolbarEvents();
    },
    
    /**
     * 绑定工具栏事件
     */
    bindToolbarEvents: function() {
        // 选择模式按钮
        const selectModeBtn = document.getElementById('select-mode-btn');
        if (selectModeBtn && typeof window.setMode === 'function') {
            selectModeBtn.addEventListener('click', () => {
                window.setMode('select');
            });
        }
        
        // 节点模式按钮
        const nodeModeBtn = document.getElementById('node-mode-btn');
        if (nodeModeBtn && typeof window.setMode === 'function') {
            nodeModeBtn.addEventListener('click', () => {
                window.setMode('node');
            });
        }
        
        // 关系模式按钮
        const relationshipModeBtn = document.getElementById('relationship-mode-btn');
        if (relationshipModeBtn && typeof window.setMode === 'function') {
            relationshipModeBtn.addEventListener('click', () => {
                window.setMode('relationship');
            });
        }
        
        // 清除画布按钮
        const clearBtn = document.getElementById('clear-canvas-btn');
        if (clearBtn && typeof window.clearGraphData === 'function') {
            clearBtn.addEventListener('click', () => {
                if (confirm('确定要清除所有图数据吗？')) {
                    window.clearGraphData();
                    this.showToast('画布已清空', 'success');
                }
            });
        }
        
        // 导出图数据按钮
        const exportBtn = document.getElementById('export-data-btn');
        if (exportBtn && typeof window.exportGraphData === 'function') {
            exportBtn.addEventListener('click', () => {
                window.exportGraphData();
                this.showToast('图数据已导出', 'success');
            });
        }
        
        // 连接Neo4j按钮
        const connectBtn = document.getElementById('connect-neo4j-btn');
        if (connectBtn) {
            connectBtn.addEventListener('click', () => {
                this.showModal('neo4j-connection-modal');
            });
        }
    }
};

// 初始化UI管理器
window.addEventListener('DOMContentLoaded', () => {
    uiManager.init();
});

// 导出核心UI方法到全局
window.uiManager = uiManager;

// 确保全局Toast函数存在
if (typeof window.showToast !== 'function') {
    window.showToast = uiManager.showToast.bind(uiManager);
}