/**
 * 简化版utils.js - 调试模式
 */
console.log('1. Neo4j Editor: utils.js loading started');

// 安全地定义generateId函数
(function() {
    // 定义一个本地函数
    const _generateId = function(prefix) {
        console.log('_generateId called with:', prefix);
        return prefix + '_' + Date.now() + '_' + Math.floor(Math.random() * 10000);
    };
    
    // 只在全局未定义时设置
    if (typeof window.generateId === 'undefined') {
        window.generateId = _generateId;
    }
})();

// 直接在全局作用域定义函数
function rawShowToast(message, type) {
    console.log('rawShowToast called with:', message, type);
    alert(message); // 简单的备份方案
    return 'toast shown';
}

function rawDebugLog(message) {
    console.log('rawDebugLog called with:', message);
    return 'log written';
}

function rawHandleError(title, error) {
    console.log('rawHandleError called with:', title, error);
    alert(title + ': ' + (error instanceof Error ? error.message : String(error)));
    return 'error handled';
}

// showContextMenu函数已在其他地方定义，不需要在这里重复声明

console.log('2. Local functions defined');

// 直接挂载到window对象
window.showToast = rawShowToast;
window.debugLog = rawDebugLog;
window.handleError = rawHandleError;

console.log('3. Functions mounted to window object');
console.log('3.1 window.showToast type:', typeof window.showToast);
console.log('3.2 window.debugLog type:', typeof window.debugLog);
console.log('3.3 window.handleError type:', typeof window.handleError);

// 测试函数是否可以调用
console.log('4. Testing function calls:');
try {
    console.log('4.1 Calling window.debugLog:', window.debugLog('Test debug log'));
} catch (e) {
    console.error('4.1 Failed to call debugLog:', e);
}

try {
    console.log('4.2 Calling window.showToast:', window.showToast('Test toast'));
} catch (e) {
    console.error('4.2 Failed to call showToast:', e);
}

// 创建utils对象
window.utils = {
    showToast: window.showToast,
    debugLog: window.debugLog,
    handleError: window.handleError,
    generateId: window.generateId || function(prefix) { return prefix + '_' + Date.now(); }
};

// 添加ES模块导出语句，使其可以作为模块导入
export const showToast = rawShowToast;
export const debugLog = rawDebugLog;
export const handleError = rawHandleError;
export const generateId = window.generateId || function(prefix) { return prefix + '_' + Date.now(); };

// 默认导出整个utils对象
export default window.utils;

console.log('5. utils.js loaded completely');
console.log('5.1 window.utils exists:', !!window.utils);
console.log('5.2 window.utils.showToast type:', typeof window.utils.showToast);
console.log('5.3 ES module exports added successfully');