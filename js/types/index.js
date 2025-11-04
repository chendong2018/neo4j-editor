/**
 * 类型定义文件
 * 提供整个应用的数据结构和接口类型定义
 * 注意：这是JavaScript中的类型文档，用于提供类型提示和代码提示
 */

/**
 * 节点数据结构
 * @typedef {Object} NodeData
 * @property {string} id - 节点唯一ID
 * @property {string} label - 节点标签
 * @property {string} type - 节点类型
 * @property {Object.<string, any>} [properties] - 其他自定义属性
 */

/**
 * Cytoscape节点对象
 * @typedef {Object} CytoscapeNode
 * @property {string} group - 组名，固定为'nodes'
 * @property {NodeData} data - 节点数据
 * @property {string} [classes] - CSS类名
 * @property {Object} [position] - 节点位置 {x, y}
 */

/**
 * 边数据结构
 * @typedef {Object} EdgeData
 * @property {string} id - 边唯一ID
 * @property {string} source - 源节点ID
 * @property {string} target - 目标节点ID
 * @property {string} label - 边标签（关系类型）
 * @property {Object.<string, any>} [properties] - 其他自定义属性
 */

/**
 * Cytoscape边对象
 * @typedef {Object} CytoscapeEdge
 * @property {string} group - 组名，固定为'edges'
 * @property {EdgeData} data - 边数据
 * @property {string} [classes] - CSS类名
 */

/**
 * 图数据结构
 * @typedef {Object} GraphData
 * @property {CytoscapeNode[]} nodes - 节点数组
 * @property {CytoscapeEdge[]} edges - 边数组
 */

/**
 * 序列化后的图数据
 * @typedef {Object} SerializedGraphData
 * @property {string} version - 数据版本号
 * @property {string} timestamp - 保存时间戳
 * @property {CytoscapeNode[]} nodes - 节点数组
 * @property {CytoscapeEdge[]} edges - 边数组
 */

/**
 * 类型选项
 * @typedef {Object} TypeOption
 * @property {string} value - 类型值
 * @property {string} label - 显示标签
 */

/**
 * 上下文菜单项
 * @typedef {Object} ContextMenuItem
 * @property {string} label - 菜单项标签
 * @property {string} [id] - 菜单项ID
 * @property {Function} [onClick] - 点击事件处理函数
 */

/**
 * 上下文菜单显示选项
 * @typedef {Object} ContextMenuOptions
 * @property {string} [elementId] - 相关联的元素ID
 * @property {number} [x] - 菜单X坐标
 * @property {number} [y] - 菜单Y坐标
 * @property {ContextMenuItem[]} [items] - 自定义菜单项
 */

/**
 * API响应格式
 * @typedef {Object} ApiResponse
 * @property {boolean} success - 是否成功
 * @property {any} [data] - 响应数据
 * @property {string} [error] - 错误信息
 */

/**
 * 验证结果
 * @typedef {Object} ValidationResult
 * @property {boolean} valid - 是否有效
 * @property {string[]} errors - 错误信息数组
 */

/**
 * 工具函数配置项
 * @typedef {Object} UtilsConfig
 * @property {boolean} [debug] - 是否开启调试模式
 * @property {number} [toastDuration] - 提示框显示时长
 */

/**
 * 应用配置项
 * @typedef {Object} AppConfig
 * @property {string} [apiBaseUrl] - API基础URL
 * @property {boolean} [autoSave] - 是否自动保存
 * @property {number} [autoSaveInterval] - 自动保存间隔（毫秒）
 */

/**
 * 暴露类型定义，虽然在JavaScript中不会进行实际的类型检查，但可以提供代码提示
 */
const types = {
    // 类型检查辅助函数
    isNode: function(obj) {
        return obj && obj.group === 'nodes' && obj.data && typeof obj.data.id === 'string';
    },
    
    isEdge: function(obj) {
        return obj && obj.group === 'edges' && obj.data && 
               typeof obj.data.id === 'string' && 
               typeof obj.data.source === 'string' && 
               typeof obj.data.target === 'string';
    },
    
    isGraphData: function(obj) {
        return obj && Array.isArray(obj.nodes) && Array.isArray(obj.edges);
    }
};

module.exports = types;
