/**
 * Neo4j Editor - 数据导出模块
 * 负责处理图表数据的导出功能，支持多种格式
 */
(function(neo4jEditor) {
    'use strict';

    // 确保命名空间存在
    if (typeof neo4jEditor === 'undefined') {
        window.neo4jEditor = {};
    }

    // 初始化状态
    let initialized = false;
    
    // 导出配置
    let exportConfig = {
        formats: ['json', 'cypher', 'svg', 'png'],
        defaultFormat: 'json',
        includeStyles: true,
        includeProperties: true,
        prettyPrint: true,
        downloadMethod: 'auto' // 'auto', 'blob', 'dataUrl'
    };

    /**
     * 初始化数据导出模块
     * @param {Object} config - 配置对象
     * @returns {boolean} 初始化是否成功
     */
    function initialize(config = {}) {
        try {
            console.log('Data Exporter Module: Initializing...');
            
            // 合并配置
            exportConfig = { ...exportConfig, ...config };
            
            // 验证配置
            validateConfig();
            
            // 标记为已初始化
            initialized = true;
            
            console.log('Data Exporter Module: Initialized successfully');
            
            // 触发初始化完成事件
            if (neo4jEditor.eventManager && typeof neo4jEditor.eventManager.trigger === 'function') {
                neo4jEditor.eventManager.trigger('dataExporter:initialized', {
                    config: exportConfig
                });
            }
            
            return true;
        } catch (error) {
            console.error('Data Exporter Module: Initialization error:', error);
            return false;
        }
    }

    /**
     * 验证配置
     */
    function validateConfig() {
        // 验证格式配置
        if (!Array.isArray(exportConfig.formats)) {
            exportConfig.formats = ['json', 'cypher', 'svg', 'png'];
        }
        
        // 确保默认格式存在于格式列表中
        if (!exportConfig.formats.includes(exportConfig.defaultFormat)) {
            exportConfig.defaultFormat = 'json';
        }
        
        // 验证下载方法
        const validDownloadMethods = ['auto', 'blob', 'dataUrl'];
        if (!validDownloadMethods.includes(exportConfig.downloadMethod)) {
            exportConfig.downloadMethod = 'auto';
        }
    }

    /**
     * 导出数据
     * @param {string} format - 导出格式
     * @param {Object} options - 导出选项
     * @returns {Promise} 导出结果Promise
     */
    function exportData(format = null, options = {}) {
        return new Promise((resolve, reject) => {
            try {
                // 如果未指定格式，使用默认格式
                const exportFormat = format || exportConfig.defaultFormat;
                
                // 验证格式
                if (!exportConfig.formats.includes(exportFormat)) {
                    throw new Error(`不支持的导出格式: ${exportFormat}`);
                }
                
                // 合并选项
                const exportOptions = { ...exportConfig, ...options };
                
                console.log(`Exporting data in ${exportFormat} format...`);
                
                // 根据格式选择导出方法
                switch (exportFormat.toLowerCase()) {
                    case 'json':
                        exportAsJSON(exportOptions).then(resolve).catch(reject);
                        break;
                    case 'cypher':
                        exportAsCypher(exportOptions).then(resolve).catch(reject);
                        break;
                    case 'svg':
                        exportAsSVG(exportOptions).then(resolve).catch(reject);
                        break;
                    case 'png':
                        exportAsPNG(exportOptions).then(resolve).catch(reject);
                        break;
                    default:
                        reject(new Error(`不支持的导出格式: ${exportFormat}`));
                }
            } catch (error) {
                reject(error);
            }
        });
    }

    /**
     * 以JSON格式导出数据
     * @param {Object} options - 导出选项
     * @returns {Promise} 导出结果Promise
     */
    function exportAsJSON(options = {}) {
        return new Promise((resolve, reject) => {
            try {
                // 获取图表数据
                let graphData = getGraphData(options);
                
                // 构建导出数据对象
                const exportData = {
                    version: '1.0',
                    timestamp: new Date().toISOString(),
                    data: graphData
                };
                
                // 添加样式信息（如果需要）
                if (options.includeStyles) {
                    try {
                        const styles = getGraphStyles();
                        exportData.styles = styles;
                    } catch (e) {
                        console.warn('Failed to include styles:', e);
                    }
                }
                
                // 转换为JSON字符串
                const jsonString = JSON.stringify(exportData, null, options.prettyPrint ? 2 : 0);
                
                // 创建文件名
                const fileName = `neo4j-graph-${getFormattedDate()}.json`;
                
                // 触发导出事件
                if (neo4jEditor.eventManager && typeof neo4jEditor.eventManager.trigger === 'function') {
                    neo4jEditor.eventManager.trigger('dataExporter:jsonExported', {
                        data: jsonString,
                        fileName: fileName,
                        options: options
                    });
                }
                
                resolve({
                    format: 'json',
                    data: jsonString,
                    fileName: fileName,
                    mimeType: 'application/json'
                });
            } catch (error) {
                reject(error);
            }
        });
    }

    /**
     * 以Cypher格式导出数据
     * @param {Object} options - 导出选项
     * @returns {Promise} 导出结果Promise
     */
    function exportAsCypher(options = {}) {
        return new Promise((resolve, reject) => {
            try {
                // 获取图表数据
                const graphData = getGraphData(options);
                
                // 生成Cypher语句
                let cypherStatements = [];
                
                // 为每个节点生成Cypher创建语句
                if (graphData.nodes && graphData.nodes.length > 0) {
                    cypherStatements.push('-- 创建节点');
                    
                    graphData.nodes.forEach(node => {
                        const nodeCypher = generateNodeCypher(node, options);
                        if (nodeCypher) {
                            cypherStatements.push(nodeCypher);
                        }
                    });
                    
                    cypherStatements.push(''); // 添加空行
                }
                
                // 为每个关系生成Cypher创建语句
                if (graphData.edges && graphData.edges.length > 0) {
                    cypherStatements.push('-- 创建关系');
                    
                    graphData.edges.forEach(edge => {
                        const edgeCypher = generateEdgeCypher(edge, options);
                        if (edgeCypher) {
                            cypherStatements.push(edgeCypher);
                        }
                    });
                }
                
                // 合并Cypher语句
                const cypherString = cypherStatements.join('\n');
                
                // 创建文件名
                const fileName = `neo4j-graph-${getFormattedDate()}.cypher`;
                
                // 触发导出事件
                if (neo4jEditor.eventManager && typeof neo4jEditor.eventManager.trigger === 'function') {
                    neo4jEditor.eventManager.trigger('dataExporter:cypherExported', {
                        data: cypherString,
                        fileName: fileName,
                        options: options
                    });
                }
                
                resolve({
                    format: 'cypher',
                    data: cypherString,
                    fileName: fileName,
                    mimeType: 'text/plain'
                });
            } catch (error) {
                reject(error);
            }
        });
    }

    /**
     * 以SVG格式导出数据
     * @param {Object} options - 导出选项
     * @returns {Promise} 导出结果Promise
     */
    function exportAsSVG(options = {}) {
        return new Promise((resolve, reject) => {
            try {
                // 尝试从图表渲染器获取SVG
                if (neo4jEditor.graphRenderer && typeof neo4jEditor.graphRenderer.getSVG === 'function') {
                    neo4jEditor.graphRenderer.getSVG(options).then(svgString => {
                        // 创建文件名
                        const fileName = `neo4j-graph-${getFormattedDate()}.svg`;
                        
                        // 触发导出事件
                        if (neo4jEditor.eventManager && typeof neo4jEditor.eventManager.trigger === 'function') {
                            neo4jEditor.eventManager.trigger('dataExporter:svgExported', {
                                data: svgString,
                                fileName: fileName,
                                options: options
                            });
                        }
                        
                        resolve({
                            format: 'svg',
                            data: svgString,
                            fileName: fileName,
                            mimeType: 'image/svg+xml'
                        });
                    }).catch(reject);
                } else {
                    // 尝试从DOM获取SVG
                    getSVGFromDOM(options).then(resolve).catch(reject);
                }
            } catch (error) {
                reject(error);
            }
        });
    }

    /**
     * 以PNG格式导出数据
     * @param {Object} options - 导出选项
     * @returns {Promise} 导出结果Promise
     */
    function exportAsPNG(options = {}) {
        return new Promise((resolve, reject) => {
            try {
                // 尝试从图表渲染器获取PNG
                if (neo4jEditor.graphRenderer && typeof neo4jEditor.graphRenderer.getPNG === 'function') {
                    neo4jEditor.graphRenderer.getPNG(options).then(dataUrl => {
                        // 创建文件名
                        const fileName = `neo4j-graph-${getFormattedDate()}.png`;
                        
                        // 触发导出事件
                        if (neo4jEditor.eventManager && typeof neo4jEditor.eventManager.trigger === 'function') {
                            neo4jEditor.eventManager.trigger('dataExporter:pngExported', {
                                data: dataUrl,
                                fileName: fileName,
                                options: options
                            });
                        }
                        
                        resolve({
                            format: 'png',
                            data: dataUrl,
                            fileName: fileName,
                            mimeType: 'image/png'
                        });
                    }).catch(reject);
                } else {
                    // 尝试从SVG生成PNG
                    exportAsSVG(options).then(svgResult => {
                        return svgToPNG(svgResult.data, options);
                    }).then(resolve).catch(reject);
                }
            } catch (error) {
                reject(error);
            }
        });
    }

    /**
     * 获取图表数据
     * @param {Object} options - 选项
     * @returns {Object} 图表数据
     */
    function getGraphData(options = {}) {
        // 尝试从数据模型获取数据
        if (neo4jEditor.dataModel && typeof neo4jEditor.dataModel.getGraphData === 'function') {
            return neo4jEditor.dataModel.getGraphData(options);
        }
        
        // 尝试从图表渲染器获取数据
        if (neo4jEditor.graphRenderer && typeof neo4jEditor.graphRenderer.getElements === 'function') {
            const elements = neo4jEditor.graphRenderer.getElements();
            return {
                nodes: elements.filter(el => el.group === 'nodes'),
                edges: elements.filter(el => el.group === 'edges')
            };
        }
        
        // 尝试从DOM中的Cytoscape实例获取数据
        const cy = getCytoscapeInstance();
        if (cy && typeof cy.elements === 'function') {
            return {
                nodes: cy.nodes().jsons(),
                edges: cy.edges().jsons()
            };
        }
        
        throw new Error('无法获取图表数据');
    }

    /**
     * 获取图表样式
     * @returns {Object} 样式数据
     */
    function getGraphStyles() {
        // 尝试从数据模型获取样式
        if (neo4jEditor.dataModel && typeof neo4jEditor.dataModel.getStyles === 'function') {
            return neo4jEditor.dataModel.getStyles();
        }
        
        // 尝试从图表渲染器获取样式
        if (neo4jEditor.graphRenderer && typeof neo4jEditor.graphRenderer.getStyles === 'function') {
            return neo4jEditor.graphRenderer.getStyles();
        }
        
        // 尝试从DOM中的Cytoscape实例获取样式
        const cy = getCytoscapeInstance();
        if (cy && typeof cy.style === 'function') {
            return cy.style().json();
        }
        
        return [];
    }

    /**
     * 生成节点的Cypher语句
     * @param {Object} node - 节点对象
     * @param {Object} options - 选项
     * @returns {string} Cypher语句
     */
    function generateNodeCypher(node, options = {}) {
        try {
            // 获取节点数据
            const data = node.data || node;
            
            // 获取节点ID
            const id = data.id;
            
            // 获取节点标签
            let labels = [];
            if (data.labels && Array.isArray(data.labels)) {
                labels = data.labels;
            } else if (data.label) {
                labels = [data.label];
            } else {
                labels = ['Node'];
            }
            
            // 格式化标签
            const formattedLabels = labels.map(label => `:${label}`).join('');
            
            // 构建属性
            let properties = {};
            
            // 添加ID属性
            properties.id = id;
            
            // 添加其他属性（如果需要）
            if (options.includeProperties) {
                if (data.properties && typeof data.properties === 'object') {
                    properties = { ...properties, ...data.properties };
                } else {
                    // 尝试从data中提取其他属性
                    for (const key in data) {
                        if (key !== 'id' && key !== 'labels' && key !== 'label' && key !== 'group' && key !== 'removed' && key !== 'selected' && key !== 'selectable' && key !== 'locked' && key !== 'grabbable' && key !== 'classes') {
                            properties[key] = data[key];
                        }
                    }
                }
            }
            
            // 格式化属性
            const formattedProperties = Object.keys(properties).map(key => {
                const value = properties[key];
                return `${key}: ${formatCypherValue(value)}`;
            }).join(', ');
            
            // 构建Cypher语句
            return `CREATE (n${formattedLabels} {${formattedProperties}})`;
        } catch (error) {
            console.error('Error generating node Cypher:', error);
            return null;
        }
    }

    /**
     * 生成关系的Cypher语句
     * @param {Object} edge - 关系对象
     * @param {Object} options - 选项
     * @returns {string} Cypher语句
     */
    function generateEdgeCypher(edge, options = {}) {
        try {
            // 获取关系数据
            const data = edge.data || edge;
            
            // 获取关系ID
            const id = data.id;
            
            // 获取源节点和目标节点
            const source = data.source;
            const target = data.target;
            
            if (!source || !target) {
                return null;
            }
            
            // 获取关系类型
            let type = data.type || 'RELATES_TO';
            if (!type.startsWith(':')) {
                type = `:${type}`;
            }
            
            // 构建属性
            let properties = {};
            
            // 添加ID属性
            properties.id = id;
            
            // 添加其他属性（如果需要）
            if (options.includeProperties) {
                if (data.properties && typeof data.properties === 'object') {
                    properties = { ...properties, ...data.properties };
                } else {
                    // 尝试从data中提取其他属性
                    for (const key in data) {
                        if (key !== 'id' && key !== 'source' && key !== 'target' && key !== 'type' && key !== 'group' && key !== 'removed' && key !== 'selected' && key !== 'selectable' && key !== 'locked' && key !== 'grabbable' && key !== 'classes') {
                            properties[key] = data[key];
                        }
                    }
                }
            }
            
            // 格式化属性
            const formattedProperties = Object.keys(properties).map(key => {
                const value = properties[key];
                return `${key}: ${formatCypherValue(value)}`;
            }).join(', ');
            
            // 构建Cypher语句
            return `MATCH (a {id: '${source}'}), (b {id: '${target}'}) CREATE (a)-[r${type} {${formattedProperties}}]->(b)`;
        } catch (error) {
            console.error('Error generating edge Cypher:', error);
            return null;
        }
    }

    /**
     * 格式化Cypher值
     * @param {*} value - 要格式化的值
     * @returns {string} 格式化后的值
     */
    function formatCypherValue(value) {
        if (value === null || value === undefined) {
            return 'null';
        }
        
        switch (typeof value) {
            case 'string':
                // 转义单引号
                return `'${value.replace(/'/g, "\\'")}'`;
            case 'number':
                return value.toString();
            case 'boolean':
                return value.toString().toUpperCase();
            case 'object':
                if (Array.isArray(value)) {
                    // 处理数组
                    const arrayValues = value.map(v => formatCypherValue(v)).join(', ');
                    return `[${arrayValues}]`;
                } else {
                    // 处理对象
                    const objectValues = Object.keys(value).map(key => {
                        return `${key}: ${formatCypherValue(value[key])}`;
                    }).join(', ');
                    return `{${objectValues}}`;
                }
            default:
                return `'${String(value).replace(/'/g, "\\'")}'`;
        }
    }

    /**
     * 从DOM获取SVG
     * @param {Object} options - 选项
     * @returns {Promise} SVG字符串Promise
     */
    function getSVGFromDOM(options = {}) {
        return new Promise((resolve, reject) => {
            try {
                // 查找Cytoscape容器
                const cyContainer = document.querySelector('.cy');
                if (!cyContainer) {
                    throw new Error('未找到Cytoscape容器');
                }
                
                // 创建文件名
                const fileName = `neo4j-graph-${getFormattedDate()}.svg`;
                
                // 尝试获取SVG
                const svgElement = cyContainer.querySelector('svg');
                if (!svgElement) {
                    throw new Error('未找到SVG元素');
                }
                
                // 克隆SVG元素以避免修改原始DOM
                const clonedSvg = svgElement.cloneNode(true);
                
                // 确保设置了适当的命名空间
                clonedSvg.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
                
                // 添加样式（如果需要）
                if (options.includeStyles) {
                    const styleElement = document.createElementNS('http://www.w3.org/2000/svg', 'style');
                    
                    // 尝试获取内联样式
                    const inlineStyles = Array.from(document.styleSheets)
                        .map(sheet => {
                            try {
                                return Array.from(sheet.cssRules || [])
                                    .map(rule => rule.cssText)
                                    .join('\n');
                            } catch (e) {
                                return '';
                            }
                        })
                        .join('\n');
                    
                    styleElement.textContent = inlineStyles;
                    clonedSvg.insertBefore(styleElement, clonedSvg.firstChild);
                }
                
                // 序列化SVG
                const serializer = new XMLSerializer();
                const svgString = serializer.serializeToString(clonedSvg);
                
                resolve({
                    format: 'svg',
                    data: svgString,
                    fileName: fileName,
                    mimeType: 'image/svg+xml'
                });
            } catch (error) {
                reject(error);
            }
        });
    }

    /**
     * 将SVG转换为PNG
     * @param {string} svgString - SVG字符串
     * @param {Object} options - 选项
     * @returns {Promise} PNG数据URL Promise
     */
    function svgToPNG(svgString, options = {}) {
        return new Promise((resolve, reject) => {
            try {
                // 创建Blob
                const blob = new Blob([svgString], { type: 'image/svg+xml' });
                const url = URL.createObjectURL(blob);
                
                // 创建图像
                const img = new Image();
                img.onload = function() {
                    // 创建Canvas
                    const canvas = document.createElement('canvas');
                    const width = options.width || img.width;
                    const height = options.height || img.height;
                    
                    canvas.width = width;
                    canvas.height = height;
                    
                    // 绘制图像
                    const ctx = canvas.getContext('2d');
                    ctx.fillStyle = options.backgroundColor || 'white';
                    ctx.fillRect(0, 0, width, height);
                    ctx.drawImage(img, 0, 0, width, height);
                    
                    // 转换为PNG
                    const pngDataUrl = canvas.toDataURL('image/png');
                    
                    // 清理
                    URL.revokeObjectURL(url);
                    
                    // 创建文件名
                    const fileName = `neo4j-graph-${getFormattedDate()}.png`;
                    
                    resolve({
                        format: 'png',
                        data: pngDataUrl,
                        fileName: fileName,
                        mimeType: 'image/png'
                    });
                };
                
                img.onerror = function() {
                    URL.revokeObjectURL(url);
                    reject(new Error('无法加载SVG图像'));
                };
                
                img.src = url;
            } catch (error) {
                reject(error);
            }
        });
    }

    /**
     * 下载导出的数据
     * @param {Object} exportResult - 导出结果
     * @returns {boolean} 下载是否成功
     */
    function downloadExportedData(exportResult) {
        try {
            if (!exportResult || !exportResult.data || !exportResult.fileName) {
                throw new Error('无效的导出结果');
            }
            
            // 确定下载方法
            let downloadMethod = exportConfig.downloadMethod;
            
            // 根据数据类型和浏览器支持自动选择方法
            if (downloadMethod === 'auto') {
                if (exportResult.format === 'png' && exportResult.data.startsWith('data:')) {
                    downloadMethod = 'dataUrl';
                } else {
                    // 优先使用Blob API
                    downloadMethod = typeof Blob !== 'undefined' && typeof URL !== 'undefined' ? 'blob' : 'dataUrl';
                }
            }
            
            // 使用选择的方法下载
            if (downloadMethod === 'blob') {
                return downloadWithBlob(exportResult);
            } else {
                return downloadWithDataUrl(exportResult);
            }
        } catch (error) {
            console.error('Error downloading exported data:', error);
            return false;
        }
    }

    /**
     * 使用Blob下载数据
     * @param {Object} exportResult - 导出结果
     * @returns {boolean} 下载是否成功
     */
    function downloadWithBlob(exportResult) {
        try {
            // 检查Blob和URL API支持
            if (typeof Blob === 'undefined' || typeof URL === 'undefined') {
                throw new Error('浏览器不支持Blob API');
            }
            
            // 处理不同格式的数据
            let blobData = exportResult.data;
            
            // 如果是数据URL，提取数据
            if (exportResult.data.startsWith('data:')) {
                const commaIndex = exportResult.data.indexOf(',');
                if (commaIndex !== -1) {
                    blobData = atob(exportResult.data.slice(commaIndex + 1));
                }
            }
            
            // 创建Blob
            const blob = new Blob([blobData], { type: exportResult.mimeType || 'application/octet-stream' });
            const url = URL.createObjectURL(blob);
            
            // 创建下载链接
            const link = document.createElement('a');
            link.href = url;
            link.download = exportResult.fileName;
            
            // 触发下载
            document.body.appendChild(link);
            link.click();
            
            // 清理
            setTimeout(() => {
                document.body.removeChild(link);
                URL.revokeObjectURL(url);
            }, 0);
            
            return true;
        } catch (error) {
            console.error('Error downloading with Blob:', error);
            return false;
        }
    }

    /**
     * 使用DataURL下载数据
     * @param {Object} exportResult - 导出结果
     * @returns {boolean} 下载是否成功
     */
    function downloadWithDataUrl(exportResult) {
        try {
            // 创建数据URL（如果不是已经是数据URL）
            let dataUrl = exportResult.data;
            
            if (!exportResult.data.startsWith('data:')) {
                const mimeType = exportResult.mimeType || 'application/octet-stream';
                const encodedData = encodeURIComponent(exportResult.data);
                dataUrl = `data:${mimeType};charset=utf-8,${encodedData}`;
            }
            
            // 创建下载链接
            const link = document.createElement('a');
            link.href = dataUrl;
            link.download = exportResult.fileName;
            
            // 触发下载
            document.body.appendChild(link);
            link.click();
            
            // 清理
            setTimeout(() => {
                document.body.removeChild(link);
            }, 0);
            
            return true;
        } catch (error) {
            console.error('Error downloading with DataURL:', error);
            return false;
        }
    }

    /**
     * 获取格式化的日期字符串
     * @returns {string} 格式化的日期字符串
     */
    function getFormattedDate() {
        const now = new Date();
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const day = String(now.getDate()).padStart(2, '0');
        const hours = String(now.getHours()).padStart(2, '0');
        const minutes = String(now.getMinutes()).padStart(2, '0');
        const seconds = String(now.getSeconds()).padStart(2, '0');
        
        return `${year}${month}${day}-${hours}${minutes}${seconds}`;
    }

    /**
     * 获取Cytoscape实例
     * @returns {Object|null} Cytoscape实例或null
     */
    function getCytoscapeInstance() {
        // 尝试从图表渲染器获取
        if (neo4jEditor.graphRenderer && typeof neo4jEditor.graphRenderer.getCytoscapeInstance === 'function') {
            return neo4jEditor.graphRenderer.getCytoscapeInstance();
        }
        
        // 尝试从全局获取
        if (window.cy) {
            return window.cy;
        }
        
        return null;
    }

    /**
     * 导出并下载数据
     * @param {string} format - 导出格式
     * @param {Object} options - 导出选项
     * @returns {Promise} 导出结果Promise
     */
    function exportAndDownload(format = null, options = {}) {
        return exportData(format, options).then(exportResult => {
            const downloadSuccess = downloadExportedData(exportResult);
            
            if (!downloadSuccess) {
                throw new Error('下载失败');
            }
            
            return exportResult;
        });
    }

    /**
     * 显示导出对话框
     * @param {Object} options - 对话框选项
     */
    function showExportDialog(options = {}) {
        try {
            // 触发导出对话框显示事件
            if (neo4jEditor.eventManager && typeof neo4jEditor.eventManager.trigger === 'function') {
                neo4jEditor.eventManager.trigger('dataExporter:showDialog', {
                    options: options
                });
            } else {
                // 如果没有事件管理器，显示一个简单的提示
                alert('请选择导出格式: JSON, Cypher, SVG 或 PNG');
            }
        } catch (error) {
            console.error('Error showing export dialog:', error);
        }
    }

    /**
     * 清理资源
     */
    function cleanup() {
        try {
            // 重置状态
            initialized = false;
            
            console.log('Data Exporter Module: Resources cleaned up');
        } catch (error) {
            console.error('Error cleaning up data exporter resources:', error);
        }
    }

    /**
     * 数据导出模块
     */
    const dataExporterModule = {
        // 模块版本
        version: '1.0.0',
        
        // 初始化状态
        initialized: initialized,
        
        /**
         * 初始化模块
         * @param {Object} config - 配置对象
         * @returns {boolean} 初始化是否成功
         */
        initialize: function(config = {}) {
            return initialize(config);
        },
        
        /**
         * 导出数据
         * @param {string} format - 导出格式
         * @param {Object} options - 导出选项
         * @returns {Promise} 导出结果Promise
         */
        exportData: function(format = null, options = {}) {
            return exportData(format, options);
        },
        
        /**
         * 导出并下载数据
         * @param {string} format - 导出格式
         * @param {Object} options - 导出选项
         * @returns {Promise} 导出结果Promise
         */
        exportAndDownload: function(format = null, options = {}) {
            return exportAndDownload(format, options);
        },
        
        /**
         * 以JSON格式导出数据
         * @param {Object} options - 导出选项
         * @returns {Promise} 导出结果Promise
         */
        exportAsJSON: function(options = {}) {
            return exportAsJSON(options);
        },
        
        /**
         * 以Cypher格式导出数据
         * @param {Object} options - 导出选项
         * @returns {Promise} 导出结果Promise
         */
        exportAsCypher: function(options = {}) {
            return exportAsCypher(options);
        },
        
        /**
         * 以SVG格式导出数据
         * @param {Object} options - 导出选项
         * @returns {Promise} 导出结果Promise
         */
        exportAsSVG: function(options = {}) {
            return exportAsSVG(options);
        },
        
        /**
         * 以PNG格式导出数据
         * @param {Object} options - 导出选项
         * @returns {Promise} 导出结果Promise
         */
        exportAsPNG: function(options = {}) {
            return exportAsPNG(options);
        },
        
        /**
         * 下载导出的数据
         * @param {Object} exportResult - 导出结果
         * @returns {boolean} 下载是否成功
         */
        downloadExportedData: function(exportResult) {
            return downloadExportedData(exportResult);
        },
        
        /**
         * 显示导出对话框
         * @param {Object} options - 对话框选项
         */
        showExportDialog: function(options = {}) {
            showExportDialog(options);
        },
        
        /**
         * 设置导出配置
         * @param {Object} config - 配置对象
         */
        setConfig: function(config) {
            exportConfig = { ...exportConfig, ...config };
            validateConfig();
        },
        
        /**
         * 获取导出配置
         * @returns {Object} 配置对象
         */
        getConfig: function() {
            return { ...exportConfig };
        },
        
        /**
         * 清理资源
         */
        cleanup: function() {
            cleanup();
        }
    };
    
    // 导出模块到命名空间
    neo4jEditor.dataExporter = dataExporterModule;
    
    // 创建向后兼容函数
    /**
     * 创建向后兼容函数
     * @param {string} deprecatedName - 旧函数名称
     * @param {Function} newFunction - 新函数实现
     * @param {Object} context - 函数执行上下文
     */
    function createBackwardCompatibilityFunction(deprecatedName, newFunction, context) {
        if (typeof deprecatedName !== 'string' || deprecatedName.trim() === '') {
            console.error('createBackwardCompatibilityFunction: 无效的deprecatedName参数');
            return null;
        }
        
        if (typeof newFunction !== 'function') {
            console.error('createBackwardCompatibilityFunction: 无效的newFunction参数');
            return null;
        }
        
        return function() {
            if (typeof console !== 'undefined' && typeof console.warn === 'function') {
                console.warn(`警告: 直接调用 ${deprecatedName}() 已弃用，请使用 neo4jEditor.dataExporter.${newFunction.name || 'method'}()`);
            }
            return newFunction.apply(context || null, arguments);
        };
    }
    
    // 注册向后兼容函数
    const backwardCompatibilityMapping = [
        { deprecatedName: 'initializeDataExporter', newFunction: dataExporterModule.initialize, context: dataExporterModule },
        { deprecatedName: 'exportData', newFunction: dataExporterModule.exportData, context: dataExporterModule },
        { deprecatedName: 'exportAndDownload', newFunction: dataExporterModule.exportAndDownload, context: dataExporterModule },
        { deprecatedName: 'exportAsJSON', newFunction: dataExporterModule.exportAsJSON, context: dataExporterModule },
        { deprecatedName: 'exportAsCypher', newFunction: dataExporterModule.exportAsCypher, context: dataExporterModule },
        { deprecatedName: 'exportAsSVG', newFunction: dataExporterModule.exportAsSVG, context: dataExporterModule },
        { deprecatedName: 'exportAsPNG', newFunction: dataExporterModule.exportAsPNG, context: dataExporterModule },
        { deprecatedName: 'downloadExportedData', newFunction: dataExporterModule.downloadExportedData, context: dataExporterModule },
        { deprecatedName: 'showExportDialog', newFunction: dataExporterModule.showExportDialog, context: dataExporterModule },
        { deprecatedName: 'setExportConfig', newFunction: dataExporterModule.setConfig, context: dataExporterModule },
        { deprecatedName: 'getExportConfig', newFunction: dataExporterModule.getConfig, context: dataExporterModule },
        { deprecatedName: 'cleanupDataExporter', newFunction: dataExporterModule.cleanup, context: dataExporterModule }
    ];
    
    // 注册全局向后兼容函数
    backwardCompatibilityMapping.forEach(funcInfo => {
        try {
            if (typeof window[funcInfo.deprecatedName] === 'undefined') {
                window[funcInfo.deprecatedName] = createBackwardCompatibilityFunction(
                    funcInfo.deprecatedName,
                    funcInfo.newFunction,
                    funcInfo.context
                );
            }
        } catch (error) {
            console.error(`注册向后兼容函数 ${funcInfo.deprecatedName} 失败:`, error);
        }
    });
    
    // 定义模块名称和注册信息
    const moduleName = 'ui/dataExporter';
    const moduleRegistrationInfo = {
        name: moduleName,
        version: '1.0.0',
        dependencies: ['core/eventManager', 'core/dataModel', 'views/graphRenderer'],
        module: dataExporterModule
    };
    
    // 使用统一的模块注册方法
    if (window.neo4jEditor && typeof window.neo4jEditor.registerModule === 'function') {
        try {
            window.neo4jEditor.registerModule(moduleRegistrationInfo);
            console.log(`Neo4j Editor: ${moduleName} module registered successfully`);
        } catch (registrationError) {
            console.error(`Neo4j Editor: Failed to register ${moduleName} module:`, registrationError);
            
            // 降级方案：直接注册到modules对象
            try {
                if (typeof window.neo4jEditor.modules[moduleName] === 'undefined') {
                    window.neo4jEditor.modules[moduleName] = {
                        name: moduleRegistrationInfo.name,
                        version: moduleRegistrationInfo.version,
                        initialized: dataExporterModule.initialized,
                        dependencies: moduleRegistrationInfo.dependencies,
                        module: moduleRegistrationInfo.module
                    };
                    console.log(`Neo4j Editor: ${moduleName} module registered via fallback to modules object`);
                }
            } catch (fallbackError) {
                // 终极降级方案：直接挂载到全局
                if (typeof window.appModule === 'undefined') {
                    window.appModule = {};
                }
                window.appModule.dataExporter = dataExporterModule;
                console.log(`Neo4j Editor: ${moduleName} module registered via final fallback to appModule`);
            }
        }
    } else {
        // 降级方案：直接挂载到全局
        if (typeof window.appModule === 'undefined') {
            window.appModule = {};
        }
        window.appModule.dataExporter = dataExporterModule;
        console.log(`Neo4j Editor: ${moduleName} module registered via fallback to appModule`);
    }
    
    // 多模块系统支持 - 确保兼容性
    // CommonJS 模块支持
    if (typeof module !== 'undefined' && typeof module.exports !== 'undefined') {
        module.exports = dataExporterModule;
    }
    
    // ES 模块支持
    if (typeof exports !== 'undefined' && typeof exports === 'object') {
        Object.defineProperty(exports, '__esModule', { value: true });
        if (typeof module !== 'undefined') module.exports = dataExporterModule;
        exports.default = dataExporterModule;
    }
    
    // AMD 模块支持
    if (typeof define === 'function' && define.amd) {
        define(['core/eventManager', 'core/dataModel', 'views/graphRenderer'], function() {
            return dataExporterModule;
        });
    }
    
    return dataExporterModule;
})(window.neo4jEditor || (window.neo4jEditor = {}));