/**
 * Neo4j编辑器数据导出管理器模块
 * 负责处理图形数据的导出功能
 */

/**
 * 导出管理器模块
 * @namespace exportManagerModule
 */
const exportManagerModule = {
    initialized: false,
    
    /**
     * 初始化导出管理器
     */
    initialize: function() {
        if (this.initialized) {
            console.warn('导出管理器已经初始化');
            return;
        }
        
        try {
            // 注册事件监听
            this.setupEventListeners();
            
            this.initialized = true;
            console.log('Neo4j Editor: 导出管理器初始化完成');
        } catch (error) {
            console.error('Neo4j Editor: 导出管理器初始化失败:', error);
            if (window.utilsModule && window.utilsModule.handleError) {
                window.utilsModule.handleError(error, '导出管理器初始化');
            }
        }
    },
    
    /**
     * 设置事件监听器
     * @private
     */
    setupEventListeners: function() {
        try {
            // 监听全局事件管理器的保存事件
            if (window.eventManagerModule) {
                window.eventManagerModule.on('graph.save', this.exportGraphData.bind(this));
            }
        } catch (error) {
            console.error('Neo4j Editor: 设置导出事件监听失败:', error);
        }
    },
    
    /**
     * 导出图形数据
     * @param {Object} options - 导出选项
     * @param {string} [options.format='json'] - 导出格式：json, csv, neo4j, png
     * @param {boolean} [options.selectedOnly=false] - 是否只导出选中的元素
     * @param {boolean} [options.download=true] - 是否自动下载文件
     * @returns {Promise} 导出结果Promise
     */
    exportGraphData: function(options = {}) {
        return new Promise((resolve, reject) => {
            try {
                const format = options.format || 'json';
                const selectedOnly = options.selectedOnly || false;
                const download = options.download !== false;
                
                // 获取Cytoscape实例
                const cytoscapeModule = window.cytoscapeModule;
                if (!cytoscapeModule || !cytoscapeModule.getCy) {
                    throw new Error('Cytoscape模块未初始化');
                }
                
                const cy = cytoscapeModule.getCy();
                if (!cy) {
                    throw new Error('未找到Cytoscape实例');
                }
                
                // 获取要导出的元素
                const elements = selectedOnly ? 
                    cy.elements('node:selected, edge:selected') : 
                    cy.elements();
                
                if (elements.length === 0) {
                    throw new Error('没有元素可导出');
                }
                
                let result = null;
                let fileName = null;
                let contentType = null;
                
                switch (format.toLowerCase()) {
                    case 'json':
                        result = this._exportAsJSON(elements);
                        fileName = 'neo4j_graph.json';
                        contentType = 'application/json';
                        break;
                    
                    case 'csv':
                        result = this._exportAsCSV(elements);
                        fileName = 'neo4j_graph.csv';
                        contentType = 'text/csv';
                        break;
                    
                    case 'neo4j':
                        result = this._exportAsCypher(elements);
                        fileName = 'neo4j_graph.cypher';
                        contentType = 'text/plain';
                        break;
                    
                    case 'png':
                        return this._exportAsPNG(cy, options).then(resolve).catch(reject);
                    
                    default:
                        throw new Error(`不支持的导出格式: ${format}`);
                }
                
                // 下载文件
                if (download && result && fileName) {
                    this._downloadFile(result, fileName, contentType);
                }
                
                resolve({ success: true, data: result, format, fileName });
            } catch (error) {
                console.error('Neo4j Editor: 导出图形数据失败:', error);
                if (window.utilsModule && window.utilsModule.handleError) {
                    window.utilsModule.handleError(error, '导出图形数据');
                }
                reject(error);
            }
        });
    },
    
    /**
     * 导出为JSON格式
     * @private
     * @param {Object} elements - Cytoscape元素集合
     * @returns {string} JSON字符串
     */
    _exportAsJSON: function(elements) {
        const data = elements.map(element => {
            const result = {
                group: element.isNode() ? 'nodes' : 'edges',
                data: element.data()
            };
            
            // 添加位置信息（节点）
            if (element.isNode()) {
                result.position = element.position();
            }
            
            // 添加样式信息
            result.data.style = element.style().map(s => {
                return {
                    selector: s.selector,
                    style: s.style
                };
            });
            
            return result;
        });
        
        return JSON.stringify({
            version: '1.0',
            timestamp: new Date().toISOString(),
            elements: data
        }, null, 2);
    },
    
    /**
     * 导出为CSV格式
     * @private
     * @param {Object} elements - Cytoscape元素集合
     * @returns {string} CSV字符串
     */
    _exportAsCSV: function(elements) {
        // 分别导出节点和边
        const nodes = elements.filter('node');
        const edges = elements.filter('edge');
        
        let csv = '# Neo4j Graph Export - ' + new Date().toISOString() + '\n\n';
        
        // 导出节点
        if (nodes.length > 0) {
            csv += '# Nodes\n';
            csv += 'id,type,labels,name,properties\n';
            
            nodes.forEach(node => {
                const data = node.data();
                const props = {};
                
                // 过滤出非系统属性
                for (const key in data) {
                    if (!['id', 'type', 'labels', 'name'].includes(key)) {
                        props[key] = data[key];
                    }
                }
                
                csv += `${data.id},${data.type || 'node'},${JSON.stringify(data.labels || [])},${data.name || ''},${JSON.stringify(props)}\n`;
            });
        }
        
        // 导出边
        if (edges.length > 0) {
            csv += '\n# Edges\n';
            csv += 'id,type,label,source,target,properties\n';
            
            edges.forEach(edge => {
                const data = edge.data();
                const props = {};
                
                // 过滤出非系统属性
                for (const key in data) {
                    if (!['id', 'type', 'label', 'source', 'target'].includes(key)) {
                        props[key] = data[key];
                    }
                }
                
                csv += `${data.id},${data.type || 'relationship'},${data.label || ''},${data.source},${data.target},${JSON.stringify(props)}\n`;
            });
        }
        
        return csv;
    },
    
    /**
     * 导出为Cypher语句
     * @private
     * @param {Object} elements - Cytoscape元素集合
     * @returns {string} Cypher语句字符串
     */
    _exportAsCypher: function(elements) {
        let cypher = '// Neo4j Cypher Export - ' + new Date().toISOString() + '\n\n';
        
        // 先导出节点
        const nodes = elements.filter('node');
        const nodeIdMap = {};
        
        nodes.forEach((node, index) => {
            const data = node.data();
            const varName = `n${index}`;
            nodeIdMap[data.id] = varName;
            
            // 构建标签字符串
            const labels = data.labels ? data.labels.map(l => `:${l}`).join('') : ':Node';
            
            // 构建属性
            const props = [];
            for (const key in data) {
                if (key !== 'id' && key !== 'labels') {
                    const value = typeof data[key] === 'string' ? 
                        `'${data[key].replace(/'/g, "''")}'` : 
                        JSON.stringify(data[key]);
                    props.push(`${key}: ${value}`);
                }
            }
            
            cypher += `CREATE (${varName}${labels} {${props.join(', ')}})\n`;
        });
        
        // 然后导出关系
        if (nodes.length > 0) {
            const edges = elements.filter('edge');
            
            edges.forEach((edge, index) => {
                const data = edge.data();
                const varName = `r${index}`;
                const relType = data.label ? `:${data.label}` : ':RELATES_TO';
                const sourceVar = nodeIdMap[data.source] || 'n0';
                const targetVar = nodeIdMap[data.target] || 'n1';
                
                // 构建属性
                const props = [];
                for (const key in data) {
                    if (!['id', 'source', 'target', 'label'].includes(key)) {
                        const value = typeof data[key] === 'string' ? 
                            `'${data[key].replace(/'/g, "''")}'` : 
                            JSON.stringify(data[key]);
                        props.push(`${key}: ${value}`);
                    }
                }
                
                cypher += `CREATE (${sourceVar})-[${varName}${relType} {${props.join(', ')}}]->(${targetVar})\n`;
            });
        }
        
        return cypher;
    },
    
    /**
     * 导出为PNG图片
     * @private
     * @param {Object} cy - Cytoscape实例
     * @param {Object} options - 导出选项
     * @returns {Promise} Promise对象
     */
    _exportAsPNG: function(cy, options = {}) {
        return new Promise((resolve, reject) => {
            try {
                // 准备导出选项
                const scale = options.scale || 2;
                const maxWidth = options.maxWidth || 4096;
                const maxHeight = options.maxHeight || 4096;
                
                // 获取图像数据URL
                const pngDataUrl = cy.png({
                    output: 'base64',
                    scale: scale,
                    maxWidth: maxWidth,
                    maxHeight: maxHeight,
                    bg: options.backgroundColor || 'white'
                });
                
                const fileName = 'neo4j_graph.png';
                
                // 下载文件
                if (options.download !== false) {
                    const link = document.createElement('a');
                    link.href = pngDataUrl;
                    link.download = fileName;
                    link.click();
                }
                
                resolve({ success: true, data: pngDataUrl, format: 'png', fileName });
            } catch (error) {
                console.error('Neo4j Editor: 导出PNG失败:', error);
                reject(error);
            }
        });
    },
    
    /**
     * 下载文件
     * @private
     * @param {string|Blob} content - 文件内容
     * @param {string} fileName - 文件名
     * @param {string} contentType - 内容类型
     */
    _downloadFile: function(content, fileName, contentType) {
        try {
            let blob;
            
            if (content instanceof Blob) {
                blob = content;
            } else {
                blob = new Blob([content], { type: contentType });
            }
            
            // 创建下载链接
            const link = document.createElement('a');
            const url = URL.createObjectURL(blob);
            
            link.href = url;
            link.download = fileName;
            
            // 触发下载
            document.body.appendChild(link);
            link.click();
            
            // 清理
            setTimeout(() => {
                document.body.removeChild(link);
                URL.revokeObjectURL(url);
            }, 100);
            
            // 显示成功提示
            const utils = window.utilsModule || {};
            if (utils.showToast) {
                utils.showToast(`文件已导出: ${fileName}`, 'success');
            }
        } catch (error) {
            console.error('Neo4j Editor: 下载文件失败:', error);
            if (window.utilsModule && window.utilsModule.handleError) {
                window.utilsModule.handleError(error, '下载文件');
            }
        }
    }
};

// 为了向后兼容，暴露到全局
window.exportManagerModule = exportManagerModule;

// 如果支持模块导出，则导出
if (typeof module !== 'undefined' && typeof module.exports !== 'undefined') {
    module.exports = exportManagerModule;
}

// 向后兼容的全局函数
window.exportGraphData = function(format, selectedOnly) {
    console.warn('exportGraphData 已弃用，请使用 exportManagerModule.exportGraphData()');
    return exportManagerModule.exportGraphData({
        format: format,
        selectedOnly: selectedOnly
    });
};

console.log('Neo4j Editor: 导出管理器模块已加载');
