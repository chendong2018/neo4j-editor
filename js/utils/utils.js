/**
 * Neo4j Editor - 工具函数库
 * 提供通用的工具函数供其他模块使用
 */

// 安全创建全局命名空间
window.neo4jEditor = window.neo4jEditor || {};

// 工具函数模块
const utilsModule = {
    // 初始化状态
    initialized: true,
    
    /**
     * 生成唯一ID
     * @param {string} prefix - ID前缀
     * @returns {string} 唯一ID
     */
    generateId: function(prefix = 'id') {
        try {
            if (typeof prefix !== 'string') {
                console.error('Neo4j Editor: Invalid prefix parameter');
                prefix = 'id';
            }
            return `${prefix}-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
        } catch (error) {
            console.error('Neo4j Editor: Error in generateId:', error);
            return `id-${Date.now()}`;
        }
    },

    /**
     * 生成唯一ID（兼容旧方法）
     * @param {string} prefix - ID前缀
     * @returns {string} 唯一ID
     */
    generateUniqueId: function(prefix) {
        try {
            const safePrefix = prefix && typeof prefix === 'string' ? prefix : 'id';
            return safePrefix + '_' + Date.now() + '_' + Math.random().toString(36).substring(2, 9);
        } catch (error) {
            console.error('Neo4j Editor: Error in generateUniqueId:', error);
            return `id_${Date.now()}`;
        }
    },

    /**
     * 深拷贝对象
     * @param {*} obj - 要拷贝的对象
     * @returns {*} 拷贝后的对象
     */
    deepClone: function(obj) {
        try {
            if (obj === null || typeof obj !== 'object') return obj;
            if (obj instanceof Date) return new Date(obj.getTime());
            if (obj instanceof Array) {
                var cloneArr = [];
                for (var i = 0; i < obj.length; i++) {
                    cloneArr[i] = this.deepClone(obj[i]);
                }
                return cloneArr;
            }
            if (typeof obj === 'object') {
                var cloneObj = {};
                for (var key in obj) {
                    if (Object.prototype.hasOwnProperty.call(obj, key)) {
                        cloneObj[key] = this.deepClone(obj[key]);
                    }
                }
                return cloneObj;
            }
        } catch (error) {
            console.error('Neo4j Editor: Error in deepClone:', error);
            return obj;
        }
    },

    /**
     * 防抖函数
     * @param {Function} func - 要执行的函数
     * @param {number} wait - 等待时间（毫秒）
     * @returns {Function} 防抖后的函数
     */
    debounce: function(func, wait) {
        try {
            if (typeof func !== 'function') {
                console.error('Neo4j Editor: Invalid function parameter in debounce');
                return null;
            }
            if (typeof wait !== 'number' || wait < 0) {
                wait = 300; // 默认300毫秒
            }
            
            let timeout;
            return function() {
                const context = this;
                const args = arguments;
                clearTimeout(timeout);
                timeout = setTimeout(() => func.apply(context, args), wait);
            };
        } catch (error) {
            console.error('Neo4j Editor: Error in debounce:', error);
            return func;
        }
    },

    /**
     * 显示提示消息
     * @param {string} message - 要显示的消息
     * @param {string} type - 消息类型 ('success', 'error', 'default')
     */
    showToast: function(message, type = 'default') {
        try {
            // 移除现有的toast
            var existingToast = document.getElementById('neo4j-toast');
            if (existingToast) {
                existingToast.remove();
            }
            
            // 创建新的toast元素
            var toast = document.createElement('div');
            toast.id = 'neo4j-toast';
            toast.textContent = message || '操作完成';
            
            // 设置样式
            toast.style.position = 'fixed';
            toast.style.bottom = '20px';
            toast.style.right = '20px';
            toast.style.padding = '12px 20px';
            toast.style.borderRadius = '4px';
            toast.style.color = '#fff';
            toast.style.fontWeight = 'bold';
            toast.style.zIndex = '9999';
            toast.style.opacity = '0';
            toast.style.transition = 'opacity 0.3s ease';
            
            // 根据类型设置背景颜色
            if (type === 'error') {
                toast.style.backgroundColor = '#e53935';
            } else if (type === 'success') {
                toast.style.backgroundColor = '#43a047';
            } else {
                toast.style.backgroundColor = '#2196f3';
            }
            
            // 添加到文档
            document.body.appendChild(toast);
            
            // 显示toast
            setTimeout(function() {
                toast.style.opacity = '1';
            }, 10);
            
            // 3秒后隐藏
            setTimeout(function() {
                toast.style.opacity = '0';
                setTimeout(function() {
                    if (document.body.contains(toast)) {
                        document.body.removeChild(toast);
                    }
                }, 300);
            }, 3000);
        } catch (e) {
            console.error('Failed to show toast:', e);
        }
    },

    /**
     * 节流函数
     * @param {Function} func - 要执行的函数
     * @param {number} limit - 限制时间（毫秒）
     * @returns {Function} 节流后的函数
     */
    throttle: function(func, limit) {
        try {
            if (typeof func !== 'function') {
                console.error('Neo4j Editor: Invalid function parameter in throttle');
                return null;
            }
            if (typeof limit !== 'number' || limit < 0) {
                limit = 300; // 默认300毫秒
            }
            
            let inThrottle;
            return function() {
                const context = this;
                const args = arguments;
                if (!inThrottle) {
                    func.apply(context, args);
                    inThrottle = true;
                    setTimeout(() => inThrottle = false, limit);
                }
            };
        } catch (error) {
            console.error('Neo4j Editor: Error in throttle:', error);
            return func;
        }
    },
    
    /**
     * 获取默认节点属性
     * @returns {Object} 默认节点属性
     */
    getDefaultNodeProperties: function() {
        try {
            return {
                id: this.generateId('node'),
                label: 'Node',
                x: 0,
                y: 0,
                width: 80,
                height: 40,
                color: '#4CAF50',
                borderColor: '#388E3C',
                fontSize: 14,
                fontWeight: 'normal',
                fontColor: '#FFFFFF'
            };
        } catch (error) {
            console.error('Neo4j Editor: Error in getDefaultNodeProperties:', error);
            return {
                id: `node-${Date.now()}`,
                label: 'Node',
                x: 0,
                y: 0
            };
        }
    },
    
    /**
     * 获取默认边属性
     * @returns {Object} 默认边属性
     */
    getDefaultEdgeProperties: function() {
        try {
            return {
                id: this.generateId('edge'),
                source: '',
                target: '',
                label: '',
                lineStyle: 'solid',
                lineWidth: 2,
                color: '#666666',
                arrowColor: '#666666',
                fontSize: 12,
                fontColor: '#333333'
            };
        } catch (error) {
            console.error('Neo4j Editor: Error in getDefaultEdgeProperties:', error);
            return {
                id: `edge-${Date.now()}`,
                source: '',
                target: ''
            };
        }
    },
    
    /**
     * 验证图数据格式
     * @param {Object} graphData - 图数据
     * @returns {boolean} 数据是否有效
     */
    validateGraphData: function(graphData) {
        try {
            if (!graphData || typeof graphData !== 'object') {
                return false;
            }
            
            // 检查节点数组
            if (!Array.isArray(graphData.nodes)) {
                return false;
            }
            
            // 检查边数组
            if (!Array.isArray(graphData.edges)) {
                return false;
            }
            
            // 检查每个节点是否有必需的ID属性
            for (let i = 0; i < graphData.nodes.length; i++) {
                const node = graphData.nodes[i];
                if (!node || typeof node !== 'object' || !node.id) {
                    return false;
                }
            }
            
            // 检查每个边是否有必需的source和target属性
            for (let i = 0; i < graphData.edges.length; i++) {
                const edge = graphData.edges[i];
                if (!edge || typeof edge !== 'object' || !edge.source || !edge.target || !edge.id) {
                    return false;
                }
            }
            
            return true;
        } catch (error) {
            console.error('Neo4j Editor: Error in validateGraphData:', error);
            return false;
        }
    },
    
    /**
     * 根据ID查找节点
     * @param {Array} nodes - 节点数组
     * @param {string} id - 节点ID
     * @returns {Object|null} 找到的节点或null
     */
    findNodeById: function(nodes, id) {
        try {
            if (!Array.isArray(nodes) || !id || typeof id !== 'string') {
                return null;
            }
            
            return nodes.find(node => node && node.id === id) || null;
        } catch (error) {
            console.error('Neo4j Editor: Error in findNodeById:', error);
            return null;
        }
    },
    
    /**
     * 根据ID查找边
     * @param {Array} edges - 边数组
     * @param {string} id - 边ID
     * @returns {Object|null} 找到的边或null
     */
    findEdgeById: function(edges, id) {
        try {
            if (!Array.isArray(edges) || !id || typeof id !== 'string') {
                return null;
            }
            
            return edges.find(edge => edge && edge.id === id) || null;
        } catch (error) {
            console.error('Neo4j Editor: Error in findEdgeById:', error);
            return null;
        }
    },
    
    /**
     * 格式化时间戳
     * @param {number} timestamp - 时间戳
     * @param {string} format - 格式
     * @returns {string} 格式化后的时间字符串
     */
    formatTimestamp: function(timestamp, format = 'YYYY-MM-DD HH:mm:ss') {
        try {
            if (typeof timestamp !== 'number' || isNaN(timestamp)) {
                return '';
            }
            
            const date = new Date(timestamp);
            const year = date.getFullYear();
            const month = String(date.getMonth() + 1).padStart(2, '0');
            const day = String(date.getDate()).padStart(2, '0');
            const hours = String(date.getHours()).padStart(2, '0');
            const minutes = String(date.getMinutes()).padStart(2, '0');
            const seconds = String(date.getSeconds()).padStart(2, '0');
            
            return format
                .replace('YYYY', year)
                .replace('MM', month)
                .replace('DD', day)
                .replace('HH', hours)
                .replace('mm', minutes)
                .replace('ss', seconds);
        } catch (error) {
            console.error('Neo4j Editor: Error in formatTimestamp:', error);
            return '';
        }
    },
    
    /**
     * 从节点标签中提取Neo4j样式标签
     * @param {string} label - 节点标签
     * @returns {Array} Neo4j样式标签数组
     */
    extractNeo4jLabel: function(label) {
        try {
            if (!label || typeof label !== 'string') {
                return [];
            }
            
            // 尝试从类似 ':Label' 或 'Label' 的格式中提取标签
            if (label.startsWith(':')) {
                return [label.substring(1)];
            }
            return [label];
        } catch (error) {
            console.error('Neo4j Editor: Error in extractNeo4jLabel:', error);
            return [];
        }
    },
    
    /**
     * 验证节点代码
     * @param {string} code - 节点代码
     * @returns {boolean} 代码是否有效
     */
    isValidNodeCode: function(code) {
        try {
            if (!code || typeof code !== 'string') {
                return false;
            }
            
            // 简单验证：代码长度大于0且不包含无效字符
            return code.length > 0 && /^[a-zA-Z0-9_:]+$/.test(code);
        } catch (error) {
            console.error('Neo4j Editor: Error in isValidNodeCode:', error);
            return false;
        }
    },
    
    /**
     * 从数组中移除元素
     * @param {Array} arr - 源数组
     * @param {*} element - 要移除的元素
     * @returns {Array} 移除后的数组
     */
    removeFromArray: function(arr, element) {
        try {
            if (!Array.isArray(arr)) {
                return [];
            }
            return arr.filter(item => item !== element);
        } catch (error) {
            console.error('Neo4j Editor: Error in removeFromArray:', error);
            return arr || [];
        }
    },
    
    /**
     * 检查数组是否包含元素
     * @param {Array} arr - 要检查的数组
     * @param {*} element - 要查找的元素
     * @returns {boolean} 是否包含元素
     */
    arrayHasElement: function(arr, element) {
        try {
            if (!Array.isArray(arr)) {
                return false;
            }
            return arr.includes(element);
        } catch (error) {
            console.error('Neo4j Editor: Error in arrayHasElement:', error);
            return false;
        }
    },
    
    /**
     * 显示提示框
     * @param {string} message - 提示信息
     * @param {string} type - 提示类型 (success, error, warning, info)
     * @returns {string} 提示框ID
     */
    showToast: function(message, type) {
        try {
            if (!message || typeof message !== 'string') {
                console.error('Neo4j Editor: Invalid toast message');
                return null;
            }
            
            const toastId = 'toast-' + Date.now();
            const toast = document.createElement('div');
            toast.id = toastId;
            toast.className = `neo4j-toast position-fixed top-3 right-3 px-4 py-3 rounded-md shadow-lg z-50 transition-all duration-300 transform translate-x-full opacity-0 ${
                type === 'success' ? 'bg-green-600' : 
                type === 'error' ? 'bg-red-600' : 
                type === 'warning' ? 'bg-yellow-600' : 'bg-blue-600'
            } text-white`;
            toast.textContent = message;
            
            if (document && document.body) {
                document.body.appendChild(toast);
                
                // 重新定位提示框 - 添加安全检查
                if (window.viewManager && typeof window.viewManager.repositionToasts === 'function') {
                    window.viewManager.repositionToasts();
                }
                
                // 显示动画
                setTimeout(() => {
                    if (toast) {
                        toast.classList.remove('translate-x-full', 'opacity-0');
                        toast.classList.add('translate-x-0', 'opacity-100');
                    }
                }, 10);
                
                // 自动关闭
                setTimeout(() => {
                    if (toast) {
                        toast.classList.add('translate-x-full', 'opacity-0');
                        setTimeout(() => {
                            if (toast && toast.parentNode) {
                                toast.parentNode.removeChild(toast);
                                // 重新定位提示框 - 添加安全检查
                                if (window.viewManager && typeof window.viewManager.repositionToasts === 'function') {
                                    window.viewManager.repositionToasts();
                                }
                            }
                        }, 300);
                    }
                }, 3000);
            }
            
            return toastId;
        } catch (error) {
            console.error('Neo4j Editor: Error showing toast:', error);
            return null;
        }
    },
    
    /**
     * 从数组中移除元素（兼容函数）
     * @param {Array} arr - 源数组
     * @param {*} element - 要移除的元素
     * @returns {Array} 移除后的数组
     */
    arrayRemoveElement: function(arr, element) {
        return this.removeFromArray(arr, element);
    },
    
    /**
     * 检查数组是否包含元素（兼容函数）
     * @param {Array} arr - 要检查的数组
     * @param {*} element - 要查找的元素
     * @returns {boolean} 是否包含元素
     */
    arrayContainsElement: function(arr, element) {
        return this.arrayHasElement(arr, element);
    }
};

// 导出到全局命名空间
window.utils = utilsModule;

// 定义向后兼容函数映射数组
const utilsBackwardCompatibilityMapping = [
    { deprecatedName: 'generateUniqueId', newFunction: utilsModule.generateUniqueId, context: utilsModule },
    { deprecatedName: 'deepClone', newFunction: utilsModule.deepClone, context: utilsModule },
    { deprecatedName: 'debounce', newFunction: utilsModule.debounce, context: utilsModule },
    { deprecatedName: 'throttle', newFunction: utilsModule.throttle, context: utilsModule },
    { deprecatedName: 'getDefaultNodeProperties', newFunction: utilsModule.getDefaultNodeProperties, context: utilsModule },
    { deprecatedName: 'getDefaultEdgeProperties', newFunction: utilsModule.getDefaultEdgeProperties, context: utilsModule },
    { deprecatedName: 'validateGraphData', newFunction: utilsModule.validateGraphData, context: utilsModule },
    { deprecatedName: 'findNodeById', newFunction: utilsModule.findNodeById, context: utilsModule },
    { deprecatedName: 'findEdgeById', newFunction: utilsModule.findEdgeById, context: utilsModule },
    { deprecatedName: 'formatTimestamp', newFunction: utilsModule.formatTimestamp, context: utilsModule },
    { deprecatedName: 'extractNeo4jLabel', newFunction: utilsModule.extractNeo4jLabel, context: utilsModule },
    { deprecatedName: 'isValidNodeCode', newFunction: utilsModule.isValidNodeCode, context: utilsModule }
];

// 注册向后兼容函数到全局window对象
if (window.neo4jEditor && typeof window.neo4jEditor.createBackwardCompatibilityFunction === 'function') {
    utilsBackwardCompatibilityMapping.forEach(funcInfo => {
        try {
            // 确保函数名称有效
            if (!funcInfo.deprecatedName || typeof funcInfo.newFunction !== 'function') {
                console.error(`注册向后兼容函数失败: 无效的函数信息`, funcInfo);
                return;
            }
            
            if (typeof window[funcInfo.deprecatedName] === 'undefined') {
                window[funcInfo.deprecatedName] = window.neo4jEditor.createBackwardCompatibilityFunction(
                    funcInfo.deprecatedName,
                    funcInfo.newFunction,
                    funcInfo.context
                );
            }
        } catch (error) {
            console.error(`注册向后兼容函数 ${funcInfo.deprecatedName || '未知函数'} 失败:`, error);
        }
    });
} else if (typeof createBackwardCompatibilityFunction === 'function') {
    // 备用方案：使用本地的createBackwardCompatibilityFunction函数
    utilsBackwardCompatibilityMapping.forEach(funcInfo => {
        try {
            // 确保函数名称有效
            if (!funcInfo.deprecatedName || typeof funcInfo.newFunction !== 'function') {
                console.error(`注册向后兼容函数失败: 无效的函数信息`, funcInfo);
                return;
            }
            
            if (typeof window[funcInfo.deprecatedName] === 'undefined') {
                window[funcInfo.deprecatedName] = createBackwardCompatibilityFunction(
                    funcInfo.deprecatedName,
                    funcInfo.newFunction,
                    funcInfo.context
                );
            }
        } catch (error) {
            console.error(`注册向后兼容函数 ${funcInfo.deprecatedName || '未知函数'} 失败:`, error);
        }
    });
}

// 同时也挂载到neo4jEditor下保持兼容性
window.neo4jEditor.utils = window.utils;

// 定义模块名称和注册信息
const utilsModuleName = 'utils/utils';
const utilsModuleRegistrationInfo = {
    name: utilsModuleName,
    version: '1.1.0',
    dependencies: [],
    module: utilsModule
};

// 使用统一的模块注册方法
if (window.neo4jEditor && typeof window.neo4jEditor.registerModule === 'function') {
    try {
        window.neo4jEditor.registerModule(utilsModuleRegistrationInfo);
        console.log(`Neo4j Editor: ${utilsModuleName} module registered successfully`);
    } catch (registrationError) {
        console.error(`Neo4j Editor: Failed to register ${utilsModuleName} module:`, registrationError);
        
        // 降级方案：直接注册到modules对象
        try {
            if (typeof window.neo4jEditor.modules === 'undefined') {
                window.neo4jEditor.modules = {};
            }
            window.neo4jEditor.modules[utilsModuleName] = {
                name: utilsModuleRegistrationInfo.name,
                version: utilsModuleRegistrationInfo.version,
                initialized: utilsModule.initialized,
                dependencies: utilsModuleRegistrationInfo.dependencies,
                module: utilsModuleRegistrationInfo.module
            };
            console.log(`Neo4j Editor: ${utilsModuleName} module registered via fallback to modules object`);
        } catch (fallbackError) {
            // 终极降级方案：直接挂载到全局
            if (typeof window.appModule === 'undefined') {
                window.appModule = {};
            }
            window.appModule.utils = utilsModule;
            console.log(`Neo4j Editor: ${utilsModuleName} module registered via final fallback to appModule`);
        }
    }
} else {
    // 降级方案：直接挂载到全局
    if (typeof window.appModule === 'undefined') {
        window.appModule = {};
    }
    window.appModule.utils = utilsModule;
    console.log(`Neo4j Editor: ${utilsModuleName} module registered via fallback to appModule`);
}

// 支持CommonJS和ES模块导出
if (typeof module !== 'undefined' && typeof module.exports !== 'undefined') {
    module.exports = utilsModule;
}

// 支持ES模块导出
if (typeof exports !== 'undefined' && typeof exports === 'object') {
    Object.defineProperty(exports, '__esModule', { value: true });
    if (typeof module !== 'undefined') module.exports = utilsModule;
    exports.default = utilsModule;
}

// AMD模块支持
if (typeof define === 'function' && define.amd) {
    define([], function() {
        return utilsModule;
    });
}