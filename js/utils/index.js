/**
 * Neo4j Editor 工具函数模块
 * 提供各种通用工具函数和辅助方法
 */
(function(neo4jEditor) {
    'use strict';

    // 定义工具函数模块
    const utilsModule = {
        // 模块版本
        version: '1.0.0',
        
        // 初始化状态
        initialized: false,
        
        /**
         * 初始化工具模块
         */
        initialize: function() {
            if (this.initialized) {
                console.warn('Utils module already initialized');
                return this;
            }

            this.initialized = true;
            console.log('Utils module initialized');
            return this;
        },
        
        /**
         * 生成唯一ID
         * @param {string} prefix - ID前缀
         * @returns {string} 唯一ID
         */
        generateId: function(prefix = 'id') {
            return `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        },
        
        /**
         * 深拷贝对象
         * @param {Object} obj - 要拷贝的对象
         * @returns {Object} 拷贝后的对象
         */
        deepClone: function(obj) {
            if (obj === null || typeof obj !== 'object') {
                return obj;
            }
            
            if (obj instanceof Date) {
                return new Date(obj.getTime());
            }
            
            if (obj instanceof Array) {
                return obj.map(item => this.deepClone(item));
            }
            
            if (typeof obj === 'object') {
                const clonedObj = {};
                for (const key in obj) {
                    if (obj.hasOwnProperty(key)) {
                        clonedObj[key] = this.deepClone(obj[key]);
                    }
                }
                return clonedObj;
            }
        },
        
        /**
         * 合并对象
         * @param {Object} target - 目标对象
         * @param {...Object} sources - 源对象
         * @returns {Object} 合并后的对象
         */
        mergeObjects: function(target, ...sources) {
            if (!sources.length) return target;
            const source = sources.shift();

            if (target && typeof target === 'object' && source && typeof source === 'object') {
                for (const key in source) {
                    if (source.hasOwnProperty(key)) {
                        if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
                            if (!target[key]) Object.assign(target, { [key]: {} });
                            this.mergeObjects(target[key], source[key]);
                        } else {
                            Object.assign(target, { [key]: source[key] });
                        }
                    }
                }
            }

            return this.mergeObjects(target, ...sources);
        },
        
        /**
         * 检查对象是否为空
         * @param {Object} obj - 要检查的对象
         * @returns {boolean} 是否为空
         */
        isEmptyObject: function(obj) {
            return Object.keys(obj).length === 0 && obj.constructor === Object;
        },
        
        /**
         * 格式化日期
         * @param {Date} date - 日期对象
         * @param {string} format - 格式
         * @returns {string} 格式化后的日期字符串
         */
        formatDate: function(date, format = 'YYYY-MM-DD HH:mm:ss') {
            const d = new Date(date);
            
            const year = d.getFullYear();
            const month = String(d.getMonth() + 1).padStart(2, '0');
            const day = String(d.getDate()).padStart(2, '0');
            const hours = String(d.getHours()).padStart(2, '0');
            const minutes = String(d.getMinutes()).padStart(2, '0');
            const seconds = String(d.getSeconds()).padStart(2, '0');
            
            return format
                .replace('YYYY', year)
                .replace('MM', month)
                .replace('DD', day)
                .replace('HH', hours)
                .replace('mm', minutes)
                .replace('ss', seconds);
        },
        
        /**
         * 序列化Cytoscape元素
         * @param {Array|Object} elements - Cytoscape元素数组或单个元素
         * @returns {Array} 序列化后的元素数组
         */
        serializeElements: function(elements) {
            if (!elements) return [];
            
            const elementsArray = Array.isArray(elements) ? elements : [elements];
            
            return elementsArray.map(element => {
                const data = element.data();
                const position = element.isNode() ? element.position() : null;
                
                return {
                    group: element.group(),
                    data: { ...data },
                    position: position,
                    selected: element.selected(),
                    selectable: element.selectable(),
                    locked: element.locked(),
                    grabbable: element.grabbable()
                };
            });
        },
        
        /**
         * 反序列化Cytoscape元素
         * @param {Array} serializedElements - 序列化的元素数组
         * @returns {Array} Cytoscape元素数组
         */
        deserializeElements: function(serializedElements) {
            if (!Array.isArray(serializedElements)) return [];
            
            return serializedElements.map(element => {
                const result = {
                    group: element.group,
                    data: { ...element.data },
                    selected: element.selected,
                    selectable: element.selectable,
                    locked: element.locked,
                    grabbable: element.grabbable
                };
                
                if (element.group === 'nodes' && element.position) {
                    result.position = { ...element.position };
                }
                
                return result;
            });
        },
        
        /**
         * 执行安全的事务
         * @param {Function} fn - 要执行的函数
         * @returns {*} 函数执行结果
         */
        safeTransaction: function(fn) {
            try {
                return fn();
            } catch (error) {
                console.error('Error in transaction:', error);
                throw error;
            }
        },
        
        /**
         * 更新节点样式
         * @param {Object} node - Cytoscape节点对象
         */
        updateNodeStyle: function(node) {
            if (!node || !node.isNode()) return;
            
            const labels = node.data('labels') || [];
            const primaryLabel = labels.length > 0 ? labels[0] : 'Node';
            
            // 设置节点标签
            node.style('label', primaryLabel);
            
            // 根据标签设置不同的样式
            // 这里可以根据需要添加更多样式逻辑
        },
        
        /**
         * 显示通知
         * @param {string} message - 通知消息
         * @param {string} type - 通知类型 ('info', 'success', 'warning', 'error')
         * @param {number} duration - 显示时长（毫秒）
         */
        showNotification: function(message, type = 'info', duration = 3000) {
            // 简单的通知实现
            // 实际应用中可以使用更复杂的通知系统
            const notification = document.createElement('div');
            notification.className = `neo4j-notification neo4j-notification-${type}`;
            notification.textContent = message;
            
            notification.style.cssText = `
                position: fixed;
                top: 20px;
                right: 20px;
                padding: 12px 20px;
                border-radius: 4px;
                color: white;
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                z-index: 10001;
                box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
                transition: all 0.3s ease;
                transform: translateX(calc(100% + 20px));
            `;
            
            // 设置背景色
            const backgroundColor = {
                info: '#3498db',
                success: '#2ecc71',
                warning: '#f39c12',
                error: '#e74c3c'
            }[type] || '#3498db';
            
            notification.style.backgroundColor = backgroundColor;
            
            document.body.appendChild(notification);
            
            // 显示通知
            setTimeout(() => {
                notification.style.transform = 'translateX(0)';
            }, 10);
            
            // 自动关闭
            setTimeout(() => {
                notification.style.transform = 'translateX(calc(100% + 20px))';
                setTimeout(() => {
                    if (notification.parentNode) {
                        notification.parentNode.removeChild(notification);
                    }
                }, 300);
            }, duration);
        },
        
        /**
         * 显示确认对话框
         * @param {string} message - 确认消息
         * @param {Function} confirmCallback - 确认回调
         * @param {Function} cancelCallback - 取消回调
         */
        showConfirmDialog: function(message, confirmCallback, cancelCallback) {
            // 使用原生confirm或自定义确认对话框
            if (confirm(message)) {
                if (typeof confirmCallback === 'function') {
                    confirmCallback();
                }
            } else if (typeof cancelCallback === 'function') {
                cancelCallback();
            }
        },
        
        /**
         * 从对象中获取嵌套属性
         * @param {Object} obj - 源对象
         * @param {string} path - 属性路径，如 'a.b.c'
         * @param {*} defaultValue - 默认值
         * @returns {*} 属性值或默认值
         */
        getNestedProperty: function(obj, path, defaultValue = undefined) {
            const keys = path.split('.');
            let result = obj;
            
            for (const key of keys) {
                if (result === null || typeof result !== 'object') {
                    return defaultValue;
                }
                result = result[key];
            }
            
            return result === undefined ? defaultValue : result;
        },
        
        /**
         * 设置对象的嵌套属性
         * @param {Object} obj - 目标对象
         * @param {string} path - 属性路径，如 'a.b.c'
         * @param {*} value - 要设置的值
         * @returns {Object} 修改后的对象
         */
        setNestedProperty: function(obj, path, value) {
            const keys = path.split('.');
            let current = obj;
            
            for (let i = 0; i < keys.length - 1; i++) {
                if (current[keys[i]] === undefined) {
                    current[keys[i]] = {};
                }
                current = current[keys[i]];
            }
            
            current[keys[keys.length - 1]] = value;
            return obj;
        },
        
        /**
         * 节流函数
         * @param {Function} func - 要节流的函数
         * @param {number} limit - 时间限制（毫秒）
         * @returns {Function} 节流后的函数
         */
        throttle: function(func, limit) {
            let inThrottle;
            return function() {
                const args = arguments;
                const context = this;
                if (!inThrottle) {
                    func.apply(context, args);
                    inThrottle = true;
                    setTimeout(() => inThrottle = false, limit);
                }
            };
        },
        
        /**
         * 防抖函数
         * @param {Function} func - 要防抖的函数
         * @param {number} wait - 等待时间（毫秒）
         * @returns {Function} 防抖后的函数
         */
        debounce: function(func, wait) {n            let timeout;
            return function() {
                const args = arguments;
                const context = this;
                clearTimeout(timeout);
                timeout = setTimeout(() => func.apply(context, args), wait);
            };
        },
        
        /**
         * 生成Cypher语句
         * @param {string} type - 操作类型 ('create', 'match', 'update', 'delete')
         * @param {Object} element - 元素数据
         * @returns {string} Cypher语句
         */
        generateCypher: function(type, element) {
            if (!element || !element.data) return '';
            
            const data = element.data;
            let cypher = '';
            
            if (element.group === 'nodes') {
                const labels = data.labels ? ':' + data.labels.join(':') : '';
                const properties = this._formatProperties(data.properties || {});
                
                switch (type) {
                    case 'create':
                        cypher = `CREATE (n${labels} ${properties})`;
                        break;
                    case 'match':
                        cypher = `MATCH (n${labels} ${properties})`;
                        break;
                    case 'update':
                        cypher = `MATCH (n${labels} {id: '${data.id}'}) SET n += ${properties}`;
                        break;
                    case 'delete':
                        cypher = `MATCH (n${labels} {id: '${data.id}'}) DETACH DELETE n`;
                        break;
                }
            } else if (element.group === 'edges') {
                const typeLabel = data.type ? ':' + data.type : '';
                const properties = this._formatProperties(data.properties || {});
                
                switch (type) {
                    case 'create':
                        cypher = `MATCH (a {id: '${data.source}'}), (b {id: '${data.target}'}) CREATE (a)-[r${typeLabel} ${properties}]->(b)`;
                        break;
                    case 'match':
                        cypher = `MATCH (a)-[r${typeLabel} ${properties}]->(b)`;
                        break;
                    case 'update':
                        cypher = `MATCH ()-[r${typeLabel} {id: '${data.id}'}]->() SET r += ${properties}`;
                        break;
                    case 'delete':
                        cypher = `MATCH ()-[r${typeLabel} {id: '${data.id}'}]->() DELETE r`;
                        break;
                }
            }
            
            return cypher;
        },
        
        /**
         * 格式化属性对象为Cypher格式
         * @param {Object} properties - 属性对象
         * @returns {string} 格式化后的属性字符串
         * @private
         */
        _formatProperties: function(properties) {
            if (this.isEmptyObject(properties)) return '{}';
            
            const formatted = Object.entries(properties)
                .map(([key, value]) => {
                    let formattedValue;
                    if (typeof value === 'string') {
                        formattedValue = `'${value.replace(/'/g, "\'")}'`;
                    } else if (value === null || value === undefined) {
                        formattedValue = 'null';
                    } else if (typeof value === 'object') {
                        formattedValue = JSON.stringify(value).replace(/'/g, "\'");
                    } else {
                        formattedValue = value;
                    }
                    return `${key}: ${formattedValue}`;
                })
                .join(', ');
            
            return `{${formatted}}`;
        },
        
        /**
         * 检查浏览器支持
         * @returns {Object} 浏览器支持情况
         */
        checkBrowserSupport: function() {
            const features = {
                fetch: 'fetch' in window,
                promise: 'Promise' in window,
                csp: 'ContentSecurityPolicy' in window,
                websocket: 'WebSocket' in window,
                svg: document.implementation.hasFeature('http://www.w3.org/TR/SVG11/feature#BasicStructure', '1.1'),
                canvas: !!document.createElement('canvas').getContext
            };
            
            return {
                supported: Object.values(features).every(Boolean),
                features
            };
        },
        
        /**
         * 销毁工具模块
         */
        destroy: function() {
            this.initialized = false;
            console.log('Utils module destroyed');
        }
    };
    
    // 导出模块
    if (typeof neo4jEditor !== 'undefined') {
        neo4jEditor.utils = utilsModule;
    }
    
    // 向后兼容性 - 创建全局方法
    if (typeof window !== 'undefined') {
        window.generateId = function(prefix) {
            console.warn('generateId is deprecated. Use neo4jEditor.utils.generateId instead.');
            return utilsModule.generateId(prefix);
        };
        
        window.deepClone = function(obj) {
            console.warn('deepClone is deprecated. Use neo4jEditor.utils.deepClone instead.');
            return utilsModule.deepClone(obj);
        };
        
        window.showNotification = function(message, type, duration) {
            console.warn('showNotification is deprecated. Use neo4jEditor.utils.showNotification instead.');
            return utilsModule.showNotification(message, type, duration);
        };
    }
    
    return utilsModule;
})(window.neo4jEditor || (window.neo4jEditor = {}));