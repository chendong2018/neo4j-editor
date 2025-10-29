/**
 * 模块加载验证器 - 检查所有必要的模块是否成功加载
 */

(function() {
    // 定义需要验证的核心模块
    var requiredModules = [
        { name: 'utils', check: function() { return typeof window.utils !== 'undefined'; } },
        { name: 'uiManager', check: function() { return typeof window.uiManager !== 'undefined'; } },
        { name: 'nodeTypeManager', check: function() { return typeof window.nodeTypeManager !== 'undefined'; } },
        { name: 'apiManager.httpRequest', check: function() { return typeof window.httpRequest !== 'undefined'; } }
    ];

    /**
     * 验证模块是否已正确加载
     */
    function verifyModules() {
        console.log('Neo4j Editor: Verifying module loading...');
        var errors = [];
        
        // 检查每个核心模块
        for (var i = 0; i < requiredModules.length; i++) {
            var mod = requiredModules[i];
            try {
                if (!mod.check()) {
                    errors.push('Module or method not found: ' + mod.name);
                }
            } catch (e) {
                console.error('Error checking module ' + mod.name + ':', e);
                errors.push('Error checking: ' + mod.name);
            }
        }
        
        // 报告结果
        if (errors.length > 0) {
            console.error('Neo4j Editor: Module verification failed:', errors);
            
            // 安全地显示错误消息
            try {
                if (typeof window.uiManager === 'object' && typeof window.uiManager.showToast === 'function') {
                    window.uiManager.showToast('Failed to load some modules. Check console for details.', 'error');
                } else if (typeof alert === 'function') {
                    alert('Error: Failed to load core modules. Please refresh the page.');
                }
            } catch (e) {
                console.error('Failed to show error message:', e);
            }
            
            return false;
        } else {
            console.log('Neo4j Editor: All modules verified successfully');
            return true;
        }
    }
    
    /**
     * 延迟执行，确保DOM和所有模块都已加载
     */
    function delayExecution(ms, callback) {
        setTimeout(function() {
            try {
                if (typeof callback === 'function') {
                    callback();
                }
            } catch (e) {
                console.error('Neo4j Editor: Error executing delayed code:', e);
            }
        }, ms);
    }
    
    // 暴露验证函数到全局
    window.verifyModules = verifyModules;
    window.delayExecution = delayExecution;
    
    // 当DOM内容加载完成后进行验证
    try {
        if (typeof document !== 'undefined') {
            if (document.readyState === 'loading') {
                document.addEventListener('DOMContentLoaded', function() {
                    try {
                        verifyModules();
                    } catch (e) {
                        console.error('Error in verifyModules on DOMContentLoaded:', e);
                    }
                });
            } else {
                // 如果DOM已经加载完成，立即验证
                setTimeout(verifyModules, 100); // 稍微延迟，确保其他脚本有机会加载
            }
        }
    } catch (e) {
        console.error('Error setting up module verification:', e);
    }
})();