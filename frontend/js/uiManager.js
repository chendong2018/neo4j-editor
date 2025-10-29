/**
 * UI管理器模块
 */

/**
 * UI管理器对象
 */
var uiManager = {
    /**
     * 显示提示信息
     * @param {string} message - 提示信息内容
     * @param {string} type - 提示类型 ('success', 'error', 'info', 'warning')
     * @param {number} duration - 显示持续时间（毫秒）
     * @param {boolean} allowMultiple - 是否允许多个toast同时显示
     */
    showToast: function(message, type, duration, allowMultiple) {
        // 添加参数默认值的兼容性处理
        if (type === undefined) type = 'info';
        if (duration === undefined) duration = 3000;
        if (allowMultiple === undefined) allowMultiple = false;
        
        // 如果不允许多个toast，移除旧的toast
        if (!allowMultiple) {
            var oldToast = document.getElementById('toast-message');
            if (oldToast && document.body.contains(oldToast)) {
                document.body.removeChild(oldToast);
            }
        }
        
        // 创建新的toast元素
        var toast = document.createElement('div');
        // 为每个toast生成唯一ID，便于多toast管理
        toast.id = allowMultiple ? 'toast-message-' + Date.now() : 'toast-message';
        toast.className = 'fixed z-50 px-6 py-3 rounded-lg shadow-lg transform transition-all duration-500 ease-in-out font-medium';
        
        // 设置位置和初始状态
        toast.style.bottom = '-100px';
        toast.style.left = '50%';
        toast.style.transform = 'translateX(-50%)';
        toast.style.opacity = '0';
        toast.style.zIndex = '9999';
        toast.style.maxWidth = '80%';
        toast.style.wordBreak = 'break-word';
        toast.style.boxShadow = '0 4px 20px rgba(0, 0, 0, 0.3)';
        toast.style.backdropFilter = 'blur(8px)';
        
        // 根据类型设置样式和图标
        var iconClass = '';
        switch (type) {
            case 'success':
                toast.style.backgroundColor = 'rgba(16, 185, 129, 0.95)'; // Green with opacity
                toast.style.color = 'white';
                iconClass = 'fa-check-circle';
                break;
            case 'error':
                toast.style.backgroundColor = 'rgba(239, 68, 68, 0.95)'; // Red with opacity
                toast.style.color = 'white';
                iconClass = 'fa-exclamation-circle';
                break;
            case 'warning':
                toast.style.backgroundColor = 'rgba(245, 158, 11, 0.95)'; // Yellow with opacity
                toast.style.color = 'white';
                iconClass = 'fa-exclamation-triangle';
                break;
            default: // info
                toast.style.backgroundColor = 'rgba(59, 130, 246, 0.95)'; // Blue with opacity
                toast.style.color = 'white';
                iconClass = 'fa-info-circle';
        }
        
        // 创建内部结构，包含图标和文本
        toast.innerHTML = '<i class="fa ' + iconClass + ' mr-2"></i>' + message;
        
        // 添加到DOM
        document.body.appendChild(toast);
        
        // 显示动画 - 使用CSS动画实现更流畅的效果
        setTimeout(function() {
            toast.style.bottom = '20px';
            toast.style.opacity = '1';
            toast.style.transform = 'translateX(-50%) scale(1)';
            // 添加轻微的缩放动画
            toast.style.transform = 'translateX(-50%) scale(1.05)';
            setTimeout(function() {
                toast.style.transform = 'translateX(-50%) scale(1)';
            }, 150);
        }, 10);
        
        // 自动隐藏
        setTimeout(function() {
            toast.style.bottom = '-100px';
            toast.style.opacity = '0';
            toast.style.transform = 'translateX(-50%) scale(0.9)';
            // 移除元素
            setTimeout(function() {
                if (document.body.contains(toast)) {
                    document.body.removeChild(toast);
                }
            }, 500);
        }, duration);
        
        // 添加点击关闭功能
        toast.addEventListener('click', function() {
            toast.style.bottom = '-100px';
            toast.style.opacity = '0';
            toast.style.transform = 'translateX(-50%) scale(0.9)';
            setTimeout(function() {
                if (document.body.contains(toast)) {
                    document.body.removeChild(toast);
                }
            }, 300);
        });
        
        return toast.id; // 返回toast ID，便于外部控制
    },
    
    /**
     * 更新连接状态UI
     * @param {boolean} isConnected - 是否已连接
     * @param {string} message - 状态消息
     */
    updateConnectionStatus: function(isConnected, message) {
        var statusEl = document.getElementById('connection-status');
        if (statusEl) {
            if (isConnected) {
                statusEl.className = 'bg-green-500 text-white';
                statusEl.textContent = 'Connected';
            } else {
                statusEl.className = 'bg-red-500 text-white';
                statusEl.textContent = 'Not Connected';
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
        var nodeCountEl = document.getElementById('node-count');
        var edgeCountEl = document.getElementById('edge-count');
        
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
        console.log('[DEBUG] Attempting to show modal: ' + modalId);
        var modal = document.getElementById(modalId);
        
        if (!modal) {
            console.error('Modal with ID \'' + modalId + '\' not found');
            return false;
        }
        
        // 保存初始状态信息
        console.log('[DEBUG] Modal found, classes: ' + modal.classList.toString());
        console.log('[DEBUG] Modal current style.display: ' + modal.style.display);
        console.log('[DEBUG] Modal computed style.display: ' + getComputedStyle(modal).display);
        
        // 彻底重置所有可能影响显示的样式
        // 1. 清除所有可能的隐藏类
        var hiddenClasses = ['hidden', 'd-none', 'invisible', 'hide'];
        for (var i = 0; i < hiddenClasses.length; i++) {
            var cls = hiddenClasses[i];
            // 兼容旧浏览器的classList.remove
            if (modal.classList) {
                modal.classList.remove(cls);
            } else {
                // 降级方案
                modal.className = modal.className.replace(new RegExp('\\b' + cls + '\\b', 'g'), '').trim();
            }
        }
        
        // 2. 确保添加所有需要的显示类
        var displayClasses = ['flex', 'modal-active'];
        for (var j = 0; j < displayClasses.length; j++) {
            var cls = displayClasses[j];
            // 兼容旧浏览器的classList.add
            if (modal.classList) {
                modal.classList.add(cls);
            } else {
                // 降级方案
                if (!new RegExp('\\b' + cls + '\\b').test(modal.className)) {
                    modal.className += ' ' + cls;
                }
            }
        }
        
        // 3. 强制设置内联样式（覆盖任何可能的CSS规则）
        modal.style.display = 'flex';
        modal.style.visibility = 'visible';
        modal.style.opacity = '1';
        modal.style.zIndex = '9999';
        modal.style.position = 'fixed';
        modal.style.top = '0';
        modal.style.left = '0';
        modal.style.width = '100vw';
        modal.style.height = '100vh';
        modal.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
        modal.style.alignItems = 'center';
        modal.style.justifyContent = 'center';
        modal.style.margin = '0';
        modal.style.padding = '0';
        modal.style.border = 'none';
        modal.style.outline = 'none';
        modal.style.pointerEvents = 'auto';
        modal.style.transition = 'opacity 0.3s ease';
        
        // 4. 确保模态框内容区域也显示
        const modalContent = modal.querySelector('.modal-content, .modal-body, .modal-dialog');
        if (modalContent) {
            modalContent.style.display = 'block';
            modalContent.style.backgroundColor = 'white';
            modalContent.style.padding = '20px';
            modalContent.style.borderRadius = '8px';
            modalContent.style.boxShadow = '0 4px 20px rgba(0, 0, 0, 0.3)';
            modalContent.style.zIndex = '10000';
            modalContent.style.maxWidth = '500px';
            modalContent.style.width = '90%';
            modalContent.style.maxHeight = '90vh';
            modalContent.style.overflowY = 'auto';
            console.log('[DEBUG] Modal content found and styled');
        }
        
        // 5. 阻止背景滚动
        document.body.style.overflow = 'hidden';
        
        // 6. 强制重排和重绘
        modal.offsetHeight; // 触发重排
        
        // 7. 最后确认模态框状态
        setTimeout(function() {
            console.log('[DEBUG] Modal final computed style.display: ' + getComputedStyle(modal).display);
            console.log('[DEBUG] Modal final computed style.visibility: ' + getComputedStyle(modal).visibility);
            console.log('[DEBUG] Modal ' + modalId + ' should now be visible');
        }, 100);
        
        return true;
    },
    
    /**
     * 隐藏模态框
     * @param {string} modalId - 模态框ID
     */
    hideModal: function(modalId) {
        console.log('[DEBUG] Attempting to hide modal: ' + modalId);
        var modal = document.getElementById(modalId);
        
        if (modal) {
            // 使用直接样式设置而不仅仅依赖CSS类，确保覆盖内联样式
            modal.style.display = 'none';
            modal.style.visibility = 'hidden';
            modal.style.opacity = '0';
            modal.style.pointerEvents = 'none';
            
            // 同时添加隐藏类作为后备 - 兼容旧浏览器
            if (modal.classList) {
                modal.classList.add('hidden');
                modal.classList.remove('flex');
                modal.classList.remove('modal-active');
            } else {
                // 降级方案
                modal.className = modal.className.replace(new RegExp('\\bflex\\b', 'g'), '').trim();
                modal.className = modal.className.replace(new RegExp('\\bmodal-active\\b', 'g'), '').trim();
                if (!new RegExp('\\bhidden\\b').test(modal.className)) {
                    modal.className += ' hidden';
                }
            }
            
            // 恢复背景滚动
            document.body.style.overflow = 'auto';
            
            console.log('[DEBUG] Modal ' + modalId + ' hidden successfully');
        } else {
            console.error('[DEBUG] Modal with ID \'' + modalId + '\' not found for hiding');
        }
    },
    
    /**
     * 初始化模态框关闭按钮
     * @param {string} modalId - 模态框ID
     * @param {string} closeButtonId - 关闭按钮ID
     */
    initModalClose: function(modalId, closeButtonId) {
        var closeButton = document.getElementById(closeButtonId);
        if (closeButton) {
            var self = this;
            closeButton.addEventListener('click', function() {
                self.hideModal(modalId);
            });
        }
        
        // 点击背景关闭模态框
        var modal = document.getElementById(modalId);
        if (modal) {
            var self = this;
            modal.addEventListener('click', function(event) {
                if (event.target === modal) {
                    self.hideModal(modalId);
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
    setButtonLoading: function(buttonId, isLoading, loadingText) {
        // 添加参数默认值的兼容性处理
        if (loadingText === undefined) loadingText = '加载中...';
        var button = document.getElementById(buttonId);
        if (button) {
            if (isLoading) {
                button.disabled = true;
                button.dataset.originalText = button.textContent;
                button.textContent = loadingText;
                // 兼容旧浏览器的classList.add
                if (button.classList) {
                    button.classList.add('opacity-70');
                    button.classList.add('cursor-not-allowed');
                } else {
                    // 降级方案
                    if (!new RegExp('\\bopacity-70\\b').test(button.className)) {
                        button.className += ' opacity-70';
                    }
                    if (!new RegExp('\\bcursor-not-allowed\\b').test(button.className)) {
                        button.className += ' cursor-not-allowed';
                    }
                }
            } else {
                button.disabled = false;
                if (button.dataset.originalText) {
                    button.textContent = button.dataset.originalText;
                    // 兼容旧浏览器，不使用delete
                    button.dataset.originalText = '';
                }
                // 兼容旧浏览器的classList.remove
                if (button.classList) {
                    button.classList.remove('opacity-70');
                    button.classList.remove('cursor-not-allowed');
                } else {
                    // 降级方案
                    button.className = button.className.replace(new RegExp('\\bopacity-70\\b', 'g'), '').trim();
                    button.className = button.className.replace(new RegExp('\\bcursor-not-allowed\\b', 'g'), '').trim();
                }
            }
        }
    },
    
    /**
     * 初始化拖拽调整大小功能
     * @param {string} elementId - 要调整大小的元素ID
     * @param {string} handleId - 拖拽句柄ID
     * @param {string} direction - 拖拽方向 ('horizontal', 'vertical')
     */
    initResizable: function(elementId, handleId, direction) {
        // 添加参数默认值的兼容性处理
        if (direction === undefined) direction = 'horizontal';
        var element = document.getElementById(elementId);
        var handle = document.getElementById(handleId);
        
        if (!element || !handle) return;
        
        let isResizing = false;
        let startX, startY, startWidth, startHeight;
        
        handle.addEventListener('mousedown', function(e) {
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
        
        document.addEventListener('mousemove', function(e) {
            if (!isResizing) return;
            
            if (direction === 'horizontal') {
                const width = startWidth + (e.clientX - startX);
                // 限制最小宽度
                if (width > 200) {
                    element.style.width = width + 'px';
                }
            } else {
                const height = startHeight + (e.clientY - startY);
                // 限制最小高度
                if (height > 100) {
                    element.style.height = height + 'px';
                }
            }
        });
        
        document.addEventListener('mouseup', function() {
            if (!isResizing) return;
            
            isResizing = false;
            document.body.style.cursor = '';
            handle.style.cursor = '';
        });
    },
    
    /**
     * 显示进度指示器
     * @param {string} message - 进度消息
     * @param {number} percentage - 进度百分比 (0-100)
     */
    showProgressIndicator: function(message, percentage) {
        // 添加参数默认值的兼容性处理
        if (message === undefined) message = '处理中...';
        if (percentage === undefined) percentage = 0;
        
        // 获取或创建进度指示器元素
        var progressContainer = document.getElementById('progress-indicator');
        if (!progressContainer) {
            progressContainer = document.createElement('div');
            progressContainer.id = 'progress-indicator';
            progressContainer.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 transition-all duration-300';
            progressContainer.style.opacity = '0';
            progressContainer.style.visibility = 'hidden';
            
            // 内部内容
            progressContainer.innerHTML = `
                <div class="bg-dark-light rounded-lg p-6 max-w-md w-full shadow-2xl">
                    <div id="progress-message" class="text-white text-lg mb-4"></div>
                    <div class="w-full bg-gray-700 rounded-full h-2.5 mb-2">
                        <div id="progress-bar" class="bg-accent h-2.5 rounded-full transition-all duration-300"></div>
                    </div>
                    <div id="progress-percentage" class="text-gray-400 text-sm text-right"></div>
                </div>
            `;
            
            document.body.appendChild(progressContainer);
        }
        
        // 更新内容
        var messageEl = document.getElementById('progress-message');
        var barEl = document.getElementById('progress-bar');
        var percentageEl = document.getElementById('progress-percentage');
        
        if (messageEl) messageEl.textContent = message;
        if (barEl) barEl.style.width = percentage + '%';
        if (percentageEl) percentageEl.textContent = percentage + '%';
        
        // 显示进度指示器
        progressContainer.style.opacity = '1';
        progressContainer.style.visibility = 'visible';
        
        return true;
    },
    
    /**
     * 隐藏进度指示器
     */
    hideProgressIndicator: function() {
        var progressContainer = document.getElementById('progress-indicator');
        if (progressContainer) {
            progressContainer.style.opacity = '0';
            progressContainer.style.visibility = 'hidden';
            
            // 延迟移除，让动画完成
            setTimeout(function() {
                if (document.body.contains(progressContainer)) {
                    document.body.removeChild(progressContainer);
                }
            }, 300);
        }
        
        return true;
    },
    
    /**
     * 初始化所有UI组件
     */
    init: function() {
        console.log('[DEBUG] Initializing UI components');
        
        // 定义所有模态框配置
        const modals = [
            // 注意：使用正确的模态框ID，避免不存在的模态框报错
            { modalId: 'connect-modal', closeButtonId: 'close-connect-modal', cancelButtonId: 'cancel-connect-btn' },
            { modalId: 'add-property-modal', closeButtonId: 'close-add-property-modal', cancelButtonId: 'cancel-add-property-btn' },
            { modalId: 'add-relationship-type-modal', closeButtonId: 'close-add-relationship-type-modal', cancelButtonId: 'cancel-add-relationship-type-btn' },
            { modalId: 'connect-modal', closeButtonId: 'close-connect-modal', cancelButtonId: 'cancel-connect-btn' },
            { modalId: 'add-node-type-modal', closeButtonId: 'close-add-node-type-modal', cancelButtonId: 'cancel-add-node-type-btn' },
            { modalId: 'edit-node-type-modal', closeButtonId: 'close-edit-node-type-modal', cancelButtonId: null }
        ];
        
        // 为所有模态框初始化关闭功能
        for (var i = 0; i < modals.length; i++) {
            var modal = modals[i];
            // 初始化关闭按钮
            this.initModalClose(modal.modalId, modal.closeButtonId);
            
            // 确保初始状态为隐藏
            this.hideModal(modal.modalId);
            
            // 为取消按钮添加事件监听器
            if (modal.cancelButtonId) {
                var cancelBtn = document.getElementById(modal.cancelButtonId);
                if (cancelBtn) {
                    // 先移除可能存在的旧监听器
                    var newCancelBtn = cancelBtn.cloneNode(true);
                    cancelBtn.parentNode.replaceChild(newCancelBtn, cancelBtn);
                    
                    var self = this;
                    (function(currentModal) {
                        newCancelBtn.addEventListener('click', function() {
                            console.log('[DEBUG] Cancel button clicked for ' + currentModal.modalId);
                            self.hideModal(currentModal.modalId);
                        });
                    })(modal);
                }
            }
        }
        
        // 初始化addproperty功能
        this.initAddPropertyFunctionality();
        
        // 初始化侧边栏拖拽调整大小
        this.initResizable('sidebar', 'sidebar-resizer', 'horizontal');
        
        // 初始化右侧面板拖拽调整大小
        this.initResizable('right-panel', 'right-panel-resizer', 'horizontal');
        
        // 绑定工具栏按钮事件
        this.bindToolbarEvents();
    },
    
    /**
     * 初始化添加属性功能
     */
    initAddPropertyFunctionality: function() {
        console.log('[DEBUG] Initializing add property functionality');
        
        // 为确认添加属性按钮绑定事件
        var confirmAddPropertyBtn = document.getElementById('confirm-add-property-btn');
        if (confirmAddPropertyBtn) {
            // 先移除可能存在的旧监听器
            var newConfirmBtn = confirmAddPropertyBtn.cloneNode(true);
            confirmAddPropertyBtn.parentNode.replaceChild(newConfirmBtn, confirmAddPropertyBtn);
            
            var self = this;
            newConfirmBtn.addEventListener('click', function() {
                console.log('[DEBUG] Confirm add property button clicked');
                self.handleAddProperty();
            });
        }
    },
    
    /**
     * 处理添加属性的逻辑
     */
    handleAddProperty: function() {
        console.log('[DEBUG] Handling add property');
        
        // 兼容旧浏览器，不使用可选链操作符
        var propertyName = '';
        var propertyElem = document.getElementById('new-property-name');
        if (propertyElem && propertyElem.value !== undefined) {
            propertyName = propertyElem.value;
        }
        
        var propertyValue = '';
        var valueElem = document.getElementById('new-property-value');
        if (valueElem && valueElem.value !== undefined) {
            propertyValue = valueElem.value;
        }
        
        var propertyType = '';
        var typeElem = document.getElementById('new-property-type');
        if (typeElem && typeElem.value !== undefined) {
            propertyType = typeElem.value;
        }
        
        // 获取当前选中的元素ID
        var selectedElementId = window.selectedElementId;
        var selectedIdElem = document.getElementById('selected-element-id');
        if (!selectedElementId && selectedIdElem && selectedIdElem.value !== undefined) {
            selectedElementId = selectedIdElem.value;
        }
        
        if (!propertyName) {
            this.showToast('属性名不能为空', 'error');
            return;
        }
        
        if (!selectedElementId) {
            this.showToast('请先选择要添加属性的元素', 'error');
            return;
        }
        
        // 尝试调用全局添加属性函数
        if (typeof window.addPropertyToElement === 'function') {
            try {
                // 确保参数顺序正确：elementId, propertyName, propertyValue
                var result = window.addPropertyToElement(selectedElementId, propertyName, propertyValue);
                if (result) {
                    this.showToast('属性添加成功', 'success');
                    this.hideModal('add-property-modal');
                    
                    // 重置表单 - 兼容旧浏览器，不使用可选链操作符
                    var nameElem = document.getElementById('new-property-name');
                    if (nameElem && nameElem.value !== undefined) {
                        nameElem.value = '';
                    }
                    var valueElem = document.getElementById('new-property-value');
                    if (valueElem && valueElem.value !== undefined) {
                        valueElem.value = '';
                    }
                } else {
                    this.showToast('属性添加失败', 'error');
                }
            } catch (error) {
                console.error('Error adding property:', error);
                // 兼容旧浏览器，不使用模板字符串
                this.showToast('添加属性时出错: ' + (error.message || '未知错误'), 'error');
            }
        } else {
            console.warn('Global addPropertyToElement function not found');
            this.showToast('添加属性功能未初始化', 'warning');
        }
    },
    
    /**
     * 绑定工具栏事件
     */
    bindToolbarEvents: function() {
        console.log('[DEBUG] Binding toolbar events');
        
        // 选择模式按钮
        var selectModeBtn = document.getElementById('select-mode-btn');
        if (selectModeBtn && typeof window.setMode === 'function') {
            selectModeBtn.addEventListener('click', function() {
                window.setMode('select');
            });
        }
        
        // 节点模式按钮
        var nodeModeBtn = document.getElementById('node-mode-btn');
        if (nodeModeBtn && typeof window.setMode === 'function') {
            nodeModeBtn.addEventListener('click', function() {
                window.setMode('node');
            });
        }
        
        // 关系模式按钮
        var relationshipModeBtn = document.getElementById('relationship-mode-btn');
        if (relationshipModeBtn && typeof window.setMode === 'function') {
            relationshipModeBtn.addEventListener('click', function() {
                window.setMode('relationship');
            });
        }
        
        // 清除画布按钮
        var clearBtn = document.getElementById('clear-canvas-btn');
        if (clearBtn && typeof window.clearGraphData === 'function') {
            var selfForClear = this;
            clearBtn.addEventListener('click', function() {
                if (confirm('确定要清除所有图数据吗？')) {
                    window.clearGraphData();
                    selfForClear.showToast('画布已清空', 'success');
                }
            });
        }
        
        // 导出图数据按钮
        var exportBtn = document.getElementById('export-data-btn');
        if (exportBtn && typeof window.exportGraphData === 'function') {
            var selfForExport = this;
            exportBtn.addEventListener('click', function() {
                window.exportGraphData();
                selfForExport.showToast('图数据已导出', 'success');
            });
        }
        
        // 连接Neo4j按钮
        var connectBtn = document.getElementById('connect-neo4j-btn');
        if (connectBtn) {
            var selfForConnect = this;
            connectBtn.addEventListener('click', function() {
                selfForConnect.showModal('connect-modal');
            });
        }
        
        // 添加测试按钮事件，确保可以通过UI调用showModal
        // 兼容旧浏览器，不使用querySelector
        var testBtn = null;
        var buttons = document.getElementsByTagName('button');
        for (var i = 0; i < buttons.length; i++) {
            if (buttons[i].getAttribute('onclick') === 'window.forceShowModal()') {
                testBtn = buttons[i];
                break;
            }
        }
        if (testBtn) {
            var self = this;
            testBtn.addEventListener('click', function() {
                console.log('[DEBUG] Test button clicked, showing modal through uiManager');
                self.showModal('add-node-type-modal');
            });
        }
    }
};

// 初始化UI管理器
window.addEventListener('DOMContentLoaded', function() {
    uiManager.init();
});

// 导出核心UI方法到全局
window.uiManager = uiManager;

// 确保全局Toast函数存在
if (typeof window.showToast !== 'function') {
    // 兼容旧浏览器的bind方法处理
    if (Function.prototype.bind) {
        window.showToast = uiManager.showToast.bind(uiManager);
    } else {
        // 降级方案，使用闭包模拟bind
        window.showToast = function(message, type, duration, allowMultiple) {
            return uiManager.showToast.call(uiManager, message, type, duration, allowMultiple);
        };
    }
}

// 导出进度指示器方法到全局
if (typeof window.showProgressIndicator !== 'function') {
    if (Function.prototype.bind) {
        window.showProgressIndicator = uiManager.showProgressIndicator.bind(uiManager);
    } else {
        window.showProgressIndicator = function(message, percentage) {
            return uiManager.showProgressIndicator.call(uiManager, message, percentage);
        };
    }
}

if (typeof window.hideProgressIndicator !== 'function') {
    if (Function.prototype.bind) {
        window.hideProgressIndicator = uiManager.hideProgressIndicator.bind(uiManager);
    } else {
        window.hideProgressIndicator = function() {
            return uiManager.hideProgressIndicator.call(uiManager);
        };
    }
}