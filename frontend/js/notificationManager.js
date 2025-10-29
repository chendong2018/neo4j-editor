/**
 * 通知管理器 - 处理Toast通知和进度提示
 */
window.notificationManager = {
    /**
     * 重新排列通知，确保它们不重叠
     */
    repositionToasts: function() {
        var toasts = document.querySelectorAll('.notification');
        var bottomPosition = 20;
        
        for (var i = toasts.length - 1; i >= 0; i--) {
            toasts[i].style.bottom = bottomPosition + 'px';
            bottomPosition += toasts[i].offsetHeight + 10;
        }
    },

    /**
     * 显示进度提示
     * @param {string} message - 进度消息
     * @returns {string} 进度提示ID
     */
    showProgressToast: function(message) {
        var toastId = 'progress-toast-' + Date.now();
        var toast = document.createElement('div');
        toast.id = toastId;
        toast.className = 'fixed bottom-5 right-5 bg-dark text-white px-4 py-3 rounded-lg shadow-lg z-50 transition-all duration-300 transform translate-y-0 opacity-100';
        toast.innerHTML = '<div class="font-medium mb-2">' + message + '</div>' +
            '<div class="w-full bg-gray-700 rounded-full h-2.5">' +
                '<div class="bg-blue-500 h-2.5 rounded-full transition-all duration-300" style="width: 0%"></div>' +
            '</div>' +
            '<div class="text-xs text-gray-300 mt-1">0%</div>';
        
        // 检查位置，避免与其他通知重叠
        var existingToasts = document.querySelectorAll('.notification, [id^="progress-toast-"]');
        if (existingToasts.length > 0) {
            var lastToast = existingToasts[existingToasts.length - 1];
            var rect = lastToast.getBoundingClientRect();
            toast.style.bottom = (rect.bottom + window.scrollY + 10) + 'px';
        }
        
        document.body.appendChild(toast);
        return toastId;
    },

    /**
     * 更新进度提示
     * @param {string} toastId - 进度提示ID
     * @param {number} progress - 进度百分比(0-100)
     */
    updateProgressToast: function(toastId, progress) {
        var toast = document.getElementById(toastId);
        if (toast) {
            var progressBar = toast.querySelector('.bg-blue-500');
            var progressText = toast.querySelector('.text-xs');
            
            if (progressBar) progressBar.style.width = progress + '%';
            if (progressText) progressText.textContent = progress + '%';
        }
    },

    /**
     * 移除进度提示
     * @param {string} toastId - 进度提示ID
     */
    removeProgressToast: function(toastId) {
        var toast = document.getElementById(toastId);
        var self = this; // 保存this引用
        if (toast) {
            toast.style.opacity = '0';
            toast.style.transform = 'translateY(20px)';
            setTimeout(function() {
                if (toast.parentNode) {
                    toast.parentNode.removeChild(toast);
                    // 重新排列通知
                    self.repositionToasts();
                }
            }, 300);
        }
    },

    /**
     * 显示通知消息
     * @param {string} message - 通知消息
     * @param {string} type - 通知类型: success, error, info, warning
     * @returns {string} Toast元素的ID
     */
    showToast: function(message, type) {
        // 为旧浏览器提供默认参数值
        if (type === undefined) {
            type = 'info';
        }
        try {
            var toastId = 'toast-' + Date.now();
            var toast = document.createElement('div');
            
            // 设置不同类型的样式和图标
            let bgColor = 'bg-info';
            let icon = 'fa-info-circle';
            let textColor = 'text-white';
            
            if (type === 'success') {
                bgColor = 'bg-success';
                icon = 'fa-check-circle';
            } else if (type === 'error') {
                bgColor = 'bg-danger';
                icon = 'fa-exclamation-circle';
            } else if (type === 'warning') {
                bgColor = 'bg-warning';
                icon = 'fa-exclamation-triangle';
                textColor = 'text-dark';
            }
            
            // 使用更现代的通知样式，添加动画效果
            toast.className = `notification ${bgColor} ${textColor} px-4 py-3 rounded-lg shadow-lg fixed bottom-5 right-5 z-50 transform transition-all duration-300 ease-out translate-y-0 opacity-100`;
            toast.id = toastId;
            toast.style.boxShadow = '0 4px 20px rgba(0, 0, 0, 0.15)';
            
            toast.innerHTML = `
                <div class="d-flex items-center gap-3">
                    <i class="fa ${icon} text-xl animate-pulse"></i>
                    <span class="flex-1">${message}</span>
                    <button class="ml-2 text-current opacity-70 hover:opacity-100 transition-opacity" 
                            onclick="document.getElementById('${toastId}')?.remove()"
                            aria-label="关闭通知">
                        <i class="fa fa-times"></i>
                    </button>
                </div>
            `;
            
            // 检查是否已有通知，如果有则添加到队列
            const existingToasts = document.querySelectorAll('.notification');
            if (existingToasts.length > 0) {
                const lastToast = existingToasts[existingToasts.length - 1];
                const rect = lastToast.getBoundingClientRect();
                toast.style.bottom = `${rect.bottom + window.scrollY + 10}px`;
            }
            
            document.body.appendChild(toast);
            
            // 自动移除
            setTimeout(() => {
                toast.style.opacity = '0';
                toast.style.transform = 'translateX(100%)';
                setTimeout(() => {
                    if (toast.parentNode) {
                        toast.parentNode.removeChild(toast);
                        // 重新排列剩余通知
                        this.repositionToasts();
                    }
                }, 300);
            }, 4000);
            
            return toastId;
        } catch (error) {
            console.error('Neo4j Editor: Error showing toast:', error);
            // 回退到全局toast函数
            if (typeof window.showToast === 'function' && window.showToast !== this.showToast) {
                window.showToast(message, type);
            } else {
                // 降级显示
                console.log('[' + type.toUpperCase() + '] ' + message);
            }
        }
    }
};
