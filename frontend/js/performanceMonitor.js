/**
 * 性能监控器 - 用于监控和报告操作性能
 */
window.performanceMonitor = {
    startTime: {},
    endTime: {},
    operations: {}, // 存储操作统计数据
    warnings: [],   // 存储性能警告
    
    /**
     * 开始计时
     * @param {string} operationName - 操作名称
     */
    start: function(operationName) {
        this.startTime[operationName] = performance.now();
    },
    
    /**
     * 结束计时
     * @param {string} operationName - 操作名称
     * @returns {number} 执行时间(毫秒)
     */
    end: function(operationName) {
        if (!this.startTime[operationName]) return 0;
        
        this.endTime[operationName] = performance.now();
        var duration = this.endTime[operationName] - this.startTime[operationName];
        
        // 更新操作统计
        if (!this.operations[operationName]) {
            this.operations[operationName] = {
                count: 0,
                totalTime: 0,
                minTime: Infinity,
                maxTime: 0
            };
        }
        
        var op = this.operations[operationName];
        op.count++;
        op.totalTime += duration;
        op.minTime = Math.min(op.minTime, duration);
        op.maxTime = Math.max(op.maxTime, duration);
        op.avgTime = op.totalTime / op.count;
        
        // 如果操作时间超过100ms，记录警告
        if (duration > 100) {
            var warning = operationName + ' 执行时间过长 (' + duration.toFixed(2) + 'ms)';
            this.warnings.push(warning);
            console.warn('Neo4j Editor: Performance warning - ' + warning);
        }
        
        // 清理不必要的数据
        delete this.startTime[operationName];
        delete this.endTime[operationName];
        
        return duration;
    },
    
    /**
     * 获取性能报告
     * @returns {object} 包含操作统计和警告的性能报告
     */
    getReport: function() {
        return {
            operations: this.operations,
            warnings: this.warnings
        };
    },
    
    /**
     * 重置性能数据
     */
    reset: function() {
        this.startTime = {};
        this.endTime = {};
        this.operations = {};
        this.warnings = [];
    }
};

/**
 * 性能报告工具 - 用于格式化和显示性能报告
 */
window.performanceReportUtils = {
    /**
     * 格式化性能报告
     * @param {object} report - 性能报告对象
     * @returns {string} 格式化后的报告文本
     */
    formatPerformanceReport: function(report) {
        var text = '=== Neo4j编辑器性能报告 ===\n\n';
        
        // 操作统计
        text += '【操作性能统计】\n';
        var operations = report.operations;
        var operationKeys = Object.keys(operations);
        for (var i = 0; i < operationKeys.length; i++) {
            var operation = operationKeys[i];
            var op = operations[operation];
            text += '- ' + operation + ':';
            text += '\n  - 执行次数: ' + op.count;
            text += '\n  - 平均时间: ' + op.avgTime.toFixed(2) + 'ms';
              text += '\n  - 最短时间: ' + op.minTime + 'ms';
              text += '\n  - 最长时间: ' + op.maxTime.toFixed(2) + 'ms';
              text += '\n  - 总时间: ' + op.totalTime.toFixed(2) + 'ms\n';
          }
        
        if (Object.keys(operations).length === 0) {
            text += '- 暂无性能数据\n';
        }
        
        // 性能警告
        text += '\n【性能警告】\n';
        var warnings = report.warnings;
        if (warnings.length > 0) {
            for (var i = 0; i < warnings.length; i++) {
                var warning = warnings[i];
                text += '- [' + (i + 1) + '] ' + warning + '\n';
            }
        } else {
            text += '- 无性能警告\n';
        }
        
        // 总结信息
        text += '\n【总结】\n';
        var totalOperations = 0;
        var opKeys = Object.keys(operations);
        for (var i = 0; i < opKeys.length; i++) {
            totalOperations += operations[opKeys[i]].count;
        }
        text += '- 总操作次数: ' + totalOperations + '\n';
        text += '- 报告生成时间: ' + new Date().toLocaleString() + '\n';
        
        return text;
    },
    
    /**
     * 创建性能报告模态框
     * @param {string} reportText - 格式化后的报告文本
     * @returns {HTMLElement} 模态框元素
     */
    createPerformanceReportModal: function(reportText) {
        // 创建模态框容器
        var modal = document.createElement('div');
        modal.className = 'modal fade in';
        modal.style.display = 'none';
        modal.style.position = 'fixed';
        modal.style.top = '0';
        modal.style.left = '0';
        modal.style.width = '100%';
        modal.style.height = '100%';
        modal.style.backgroundColor = 'rgba(0,0,0,0.5)';
        modal.style.zIndex = '1000';
        
        // 创建模态框内容
        var modalContent = document.createElement('div');
        modalContent.className = 'modal-dialog';
        modalContent.style.width = '80%';
        modalContent.style.maxWidth = '800px';
        modalContent.style.margin = '50px auto';
        modalContent.style.backgroundColor = 'white';
        modalContent.style.borderRadius = '5px';
        modalContent.style.boxShadow = '0 5px 15px rgba(0,0,0,0.3)';
        
        // 创建模态框头部
        var modalHeader = document.createElement('div');
        modalHeader.className = 'modal-header';
        modalHeader.style.padding = '15px';
        modalHeader.style.borderBottom = '1px solid #ddd';
        
        var modalTitle = document.createElement('h4');
        modalTitle.className = 'modal-title';
        modalTitle.textContent = '性能报告';
        modalTitle.style.margin = '0';
        
        var closeBtn = document.createElement('button');
        closeBtn.type = 'button';
        closeBtn.className = 'close';
        closeBtn.innerHTML = '&times;';
        closeBtn.style.border = 'none';
        closeBtn.style.background = 'none';
        closeBtn.style.fontSize = '20px';
        closeBtn.style.cursor = 'pointer';
        closeBtn.addEventListener('click', function() {
            document.body.removeChild(modal);
        });
        
        modalHeader.appendChild(modalTitle);
        modalHeader.appendChild(closeBtn);
        
        // 创建模态框主体
        const modalBody = document.createElement('div');
        modalBody.className = 'modal-body';
        modalBody.style.padding = '20px';
        modalBody.style.maxHeight = '60vh';
        modalBody.style.overflow = 'auto';
        
        const reportPre = document.createElement('pre');
        reportPre.textContent = reportText;
        reportPre.style.whiteSpace = 'pre-wrap';
        reportPre.style.wordWrap = 'break-word';
        
        modalBody.appendChild(reportPre);
        
        // 创建模态框底部
        var modalFooter = document.createElement('div');
        modalFooter.className = 'modal-footer';
        modalFooter.style.padding = '15px';
        modalFooter.style.borderTop = '1px solid #ddd';
        modalFooter.style.textAlign = 'right';
        
        var resetBtn = document.createElement('button');
        resetBtn.type = 'button';
        resetBtn.className = 'btn btn-default';
        resetBtn.textContent = '重置数据';
        resetBtn.addEventListener('click', function() {
            window.performanceMonitor.reset();
            if (window.notificationManager) {
                window.notificationManager.showToast('性能数据已重置', 'info');
            }
            document.body.removeChild(modal);
        });
        
        var closeFooterBtn = document.createElement('button');
        closeFooterBtn.type = 'button';
        closeFooterBtn.className = 'btn btn-primary';
        closeFooterBtn.textContent = '关闭';
        closeFooterBtn.addEventListener('click', function() {
            document.body.removeChild(modal);
        });
        
        modalFooter.appendChild(resetBtn);
        modalFooter.appendChild(closeFooterBtn);
        
        // 组合模态框
        modalContent.appendChild(modalHeader);
        modalContent.appendChild(modalBody);
        modalContent.appendChild(modalFooter);
        modal.appendChild(modalContent);
        
        // 添加背景点击关闭功能
        modal.addEventListener('click', function(e) {
            if (e.target === modal) {
                document.body.removeChild(modal);
            }
        });
        
        return modal;
    }
};
