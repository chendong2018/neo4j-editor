/**
 * Neo4j Editor - 数据导入/导出管理器模块
 * 负责统一处理图表数据的导入和导出操作
 */
(function(neo4jEditor) {
    'use strict';

    // 确保命名空间存在
    if (typeof neo4jEditor === 'undefined') {
        window.neo4jEditor = {};
    }

    // 初始化状态
    let initialized = false;
    
    // IO配置
    let ioConfig = {
        // 导入配置
        import: {
            // 支持的格式
            supportedFormats: ['json', 'cypher', 'csv'],
            
            // JSON配置
            json: {
                enabled: true,
                schemaValidation: true,
                maxFileSize: 10 * 1024 * 1024, // 10MB
                fileExtensions: ['.json', '.graph.json']
            },
            
            // Cypher配置
            cypher: {
                enabled: true,
                syntaxValidation: true,
                maxFileSize: 5 * 1024 * 1024, // 5MB
                fileExtensions: ['.cypher', '.cql', '.txt']
            },
            
            // CSV配置
            csv: {
                enabled: false, // 初始禁用，需要实现
                delimiter: ',',
                hasHeaders: true,
                maxFileSize: 20 * 1024 * 1024, // 20MB
                fileExtensions: ['.csv']
            },
            
            // 通用导入选项
            options: {
                clearExisting: true, // 导入前是否清除现有数据
                autoLayout: true, // 导入后是否自动应用布局
                validateData: true, // 是否验证数据
                batchSize: 100, // 批处理大小
                showProgress: true // 是否显示进度
            }
        },
        
        // 导出配置
        export: {
            // 支持的格式
            supportedFormats: ['json', 'cypher', 'svg', 'png', 'dot'],
            
            // JSON配置
            json: {
                enabled: true,
                format: 'cytoscape', // 支持 'cytoscape' 和 'neo4j' 格式
                prettyPrint: true,
                includeLayout: true
            },
            
            // Cypher配置
            cypher: {
                enabled: true,
                createSyntax: 'merge', // 'create' 或 'merge'
                includeProperties: true,
                includeIndexes: false,
                splitStatements: true,
                statementDelimiter: ';' // 语句分隔符
            },
            
            // SVG配置
            svg: {
                enabled: true,
                includeStyles: true,
                includeBackground: false,
                viewportFit: true
            },
            
            // PNG配置
            png: {
                enabled: true,
                backgroundColor: '#ffffff',
                scale: 2, // 缩放因子
                viewportFit: true,
                quality: 0.92 // 图片质量 (0-1)
            },
            
            // DOT配置
            dot: {
                enabled: false, // 初始禁用，需要实现
                layout: 'dot', // DOT布局算法
                includeProperties: true,
                nodeLabels: true,
                edgeLabels: true
            },
            
            // 通用导出选项
            options: {
                exportSelectionOnly: false, // 是否只导出选中的元素
                includeMetadata: true, // 是否包含元数据
                showProgress: true, // 是否显示进度
                defaultFileName: 'neo4j-graph', // 默认文件名（不含扩展名）
                downloadAutomatically: true // 是否自动下载文件
            }
        },
        
        // 历史记录配置
        history: {
            enabled: true,
            maxItems: 10, // 最大历史记录数量
            saveToLocalStorage: true // 是否保存到本地存储
        },
        
        // 错误处理配置
        errorHandling: {
            showErrors: true, // 是否显示错误
            throwErrors: false, // 是否抛出错误
            logErrors: true, // 是否记录错误日志
            errorTimeout: 5000 // 错误消息显示时间（毫秒）
        }
    };
    
    // IO历史记录
    let ioHistory = {
        import: [],
        export: []
    };
    
    // 操作状态
    let operationState = {
        isImporting: false,
        isExporting: false,
        currentOperation: null,
        progress: 0,
        errors: []
    };
    
    // 文件输入元素缓存
    let fileInputCache = {};
    
    // 操作队列
    let operationQueue = [];
    
    // 操作结果缓存
    let operationResults = {};

    /**
     * 初始化IO管理器模块
     * @param {Object} config - 配置对象
     * @returns {boolean} 初始化是否成功
     */
    function initialize(config = {}) {
        try {
            console.log('IO Manager Module: Initializing...');
            
            // 合并配置
            ioConfig = deepMerge(ioConfig, config);
            
            // 验证配置
            validateConfig();
            
            // 初始化历史记录
            initializeHistory();
            
            // 注册事件监听器
            registerEventListeners();
            
            // 初始化文件输入元素
            initializeFileInputs();
            
            // 标记为已初始化
            initialized = true;
            
            console.log('IO Manager Module: Initialized successfully');
            
            // 触发初始化完成事件
            if (neo4jEditor.eventManager && typeof neo4jEditor.eventManager.trigger === 'function') {
                neo4jEditor.eventManager.trigger('ioManager:initialized', {
                    config: ioConfig
                });
            }
            
            return true;
        } catch (error) {
            console.error('IO Manager Module: Initialization error:', error);
            handleError('初始化失败: ' + error.message, error);
            return false;
        }
    }

    /**
     * 验证配置
     */
    function validateConfig() {
        // 验证导入配置
        if (!ioConfig.import) {
            ioConfig.import = {
                supportedFormats: ['json', 'cypher', 'csv'],
                json: {
                    enabled: true,
                    schemaValidation: true,
                    maxFileSize: 10 * 1024 * 1024,
                    fileExtensions: ['.json', '.graph.json']
                },
                cypher: {
                    enabled: true,
                    syntaxValidation: true,
                    maxFileSize: 5 * 1024 * 1024,
                    fileExtensions: ['.cypher', '.cql', '.txt']
                },
                csv: {
                    enabled: false,
                    delimiter: ',',
                    hasHeaders: true,
                    maxFileSize: 20 * 1024 * 1024,
                    fileExtensions: ['.csv']
                },
                options: {
                    clearExisting: true,
                    autoLayout: true,
                    validateData: true,
                    batchSize: 100,
                    showProgress: true
                }
            };
        }
        
        // 验证导出配置
        if (!ioConfig.export) {
            ioConfig.export = {
                supportedFormats: ['json', 'cypher', 'svg', 'png', 'dot'],
                json: {
                    enabled: true,
                    format: 'cytoscape',
                    prettyPrint: true,
                    includeLayout: true
                },
                cypher: {
                    enabled: true,
                    createSyntax: 'merge',
                    includeProperties: true,
                    includeIndexes: false,
                    splitStatements: true,
                    statementDelimiter: ';'
                },
                svg: {
                    enabled: true,
                    includeStyles: true,
                    includeBackground: false,
                    viewportFit: true
                },
                png: {
                    enabled: true,
                    backgroundColor: '#ffffff',
                    scale: 2,
                    viewportFit: true,
                    quality: 0.92
                },
                dot: {
                    enabled: false,
                    layout: 'dot',
                    includeProperties: true,
                    nodeLabels: true,
                    edgeLabels: true
                },
                options: {
                    exportSelectionOnly: false,
                    includeMetadata: true,
                    showProgress: true,
                    defaultFileName: 'neo4j-graph',
                    downloadAutomatically: true
                }
            };
        }
        
        // 验证历史记录配置
        if (!ioConfig.history) {
            ioConfig.history = {
                enabled: true,
                maxItems: 10,
                saveToLocalStorage: true
            };
        }
        
        // 验证错误处理配置
        if (!ioConfig.errorHandling) {
            ioConfig.errorHandling = {
                showErrors: true,
                throwErrors: false,
                logErrors: true,
                errorTimeout: 5000
            };
        }
        
        // 确保支持的格式是唯一的
        ioConfig.import.supportedFormats = [...new Set(ioConfig.import.supportedFormats)];
        ioConfig.export.supportedFormats = [...new Set(ioConfig.export.supportedFormats)];
    }

    /**
     * 初始化历史记录
     */
    function initializeHistory() {
        try {
            if (ioConfig.history.enabled && ioConfig.history.saveToLocalStorage && typeof localStorage !== 'undefined') {
                // 从本地存储加载导入历史
                const importHistoryStr = localStorage.getItem('neo4jEditor_importHistory');
                if (importHistoryStr) {
                    try {
                        ioHistory.import = JSON.parse(importHistoryStr);
                        // 确保是数组
                        if (!Array.isArray(ioHistory.import)) {
                            ioHistory.import = [];
                        }
                    } catch (e) {
                        console.warn('IO Manager: Failed to parse import history from localStorage');
                        ioHistory.import = [];
                    }
                }
                
                // 从本地存储加载导出历史
                const exportHistoryStr = localStorage.getItem('neo4jEditor_exportHistory');
                if (exportHistoryStr) {
                    try {
                        ioHistory.export = JSON.parse(exportHistoryStr);
                        // 确保是数组
                        if (!Array.isArray(ioHistory.export)) {
                            ioHistory.export = [];
                        }
                    } catch (e) {
                        console.warn('IO Manager: Failed to parse export history from localStorage');
                        ioHistory.export = [];
                    }
                }
            }
        } catch (error) {
            console.error('IO Manager: Error initializing history:', error);
        }
    }

    /**
     * 保存历史记录到本地存储
     */
    function saveHistory() {
        try {
            if (ioConfig.history.enabled && ioConfig.history.saveToLocalStorage && typeof localStorage !== 'undefined') {
                // 保存导入历史
                localStorage.setItem('neo4jEditor_importHistory', JSON.stringify(ioHistory.import));
                
                // 保存导出历史
                localStorage.setItem('neo4jEditor_exportHistory', JSON.stringify(ioHistory.export));
            }
        } catch (error) {
            console.error('IO Manager: Error saving history to localStorage:', error);
        }
    }

    /**
     * 注册事件监听器
     */
    function registerEventListeners() {
        try {
            if (neo4jEditor.eventManager && typeof neo4jEditor.eventManager.on === 'function') {
                // 注册导入相关事件
                neo4jEditor.eventManager.on('ioManager:importFile', handleImportFileEvent);
                neo4jEditor.eventManager.on('ioManager:importData', handleImportDataEvent);
                neo4jEditor.eventManager.on('ioManager:cancelImport', handleCancelImportEvent);
                
                // 注册导出相关事件
                neo4jEditor.eventManager.on('ioManager:export', handleExportEvent);
                neo4jEditor.eventManager.on('ioManager:cancelExport', handleCancelExportEvent);
                
                // 注册配置相关事件
                neo4jEditor.eventManager.on('ioManager:setConfig', handleSetConfigEvent);
                neo4jEditor.eventManager.on('ioManager:clearHistory', handleClearHistoryEvent);
                
                console.log('IO Manager Module: Event listeners registered');
            } else {
                console.warn('IO Manager Module: Event manager not available, cannot register event listeners');
            }
        } catch (error) {
            console.error('IO Manager Module: Error registering event listeners:', error);
        }
    }

    /**
     * 初始化文件输入元素
     */
    function initializeFileInputs() {
        try {
            // 为每种导入格式创建一个文件输入元素
            ioConfig.import.supportedFormats.forEach(format => {
                const fileInput = document.createElement('input');
                fileInput.type = 'file';
                fileInput.style.display = 'none';
                
                // 设置接受的文件扩展名
                if (ioConfig.import[format] && ioConfig.import[format].fileExtensions) {
                    fileInput.accept = ioConfig.import[format].fileExtensions.join(',');
                }
                
                // 添加事件监听器
                fileInput.addEventListener('change', (event) => {
                    if (event.target.files && event.target.files.length > 0) {
                        handleFileSelected(format, event.target.files);
                    }
                });
                
                // 添加到文档
                document.body.appendChild(fileInput);
                
                // 缓存文件输入元素
                fileInputCache[format] = fileInput;
            });
        } catch (error) {
            console.error('IO Manager: Error initializing file inputs:', error);
        }
    }

    /**
     * 处理文件选择
     * @param {string} format - 文件格式
     * @param {FileList} files - 选择的文件列表
     */
    function handleFileSelected(format, files) {
        try {
            // 验证格式是否支持
            if (!ioConfig.import.supportedFormats.includes(format)) {
                throw new Error(`不支持的导入格式: ${format}`);
            }
            
            // 验证格式是否启用
            if (!ioConfig.import[format] || !ioConfig.import[format].enabled) {
                throw new Error(`导入格式 ${format} 已禁用`);
            }
            
            // 验证文件大小
            const maxFileSize = ioConfig.import[format].maxFileSize;
            for (let i = 0; i < files.length; i++) {
                if (files[i].size > maxFileSize) {
                    throw new Error(`文件 ${files[i].name} 超过最大大小限制 ${(maxFileSize / 1024 / 1024).toFixed(2)}MB`);
                }
            }
            
            // 触发导入开始事件
            if (neo4jEditor.eventManager && typeof neo4jEditor.eventManager.trigger === 'function') {
                neo4jEditor.eventManager.trigger('ioManager:importStarted', { format, files });
            }
            
            // 读取文件内容
            readFilesAndImport(format, files);
        } catch (error) {
            handleError('import', error);
        }
    }
    
    /**
     * 读取文件并导入
     * @param {string} format - 文件格式
     * @param {FileList} files - 文件列表
     */
    function readFilesAndImport(format, files) {
        try {
            const filePromises = [];
            
            for (let i = 0; i < files.length; i++) {
                const file = files[i];
                filePromises.push(readFileContent(file, format));
            }
            
            Promise.all(filePromises)
                .then(fileContents => {
                    return processImportData(format, fileContents, files);
                })
                .then(processedData => {
                    return importToGraph(processedData);
                })
                .then(result => {
                    // 更新历史记录
                    updateImportHistory(format, files);
                    
                    // 触发导入完成事件
                    if (neo4jEditor.eventManager && typeof neo4jEditor.eventManager.trigger === 'function') {
                        neo4jEditor.eventManager.trigger('ioManager:importCompleted', result);
                    }
                    
                    console.log('IO Manager: Import completed successfully');
                })
                .catch(error => {
                    handleError('import', error);
                });
        } catch (error) {
            handleError('import', error);
        }
    }
    
    /**
     * 读取文件内容
     * @param {File} file - 文件对象
     * @param {string} format - 文件格式
     */
    function readFileContent(file, format) {
        return new Promise((resolve, reject) => {
            try {
                const reader = new FileReader();
                
                if (format === 'json' || format === 'cypher' || format === 'csv') {
                    reader.onload = (event) => {
                        resolve({
                            file: file,
                            content: event.target.result,
                            format: format
                        });
                    };
                    reader.onerror = () => reject(new Error(`读取文件 ${file.name} 失败`));
                    reader.readAsText(file, 'UTF-8');
                } else {
                    reject(new Error(`不支持的文件格式: ${format}`));
                }
            } catch (error) {
                reject(error);
            }
        });
    }
    
    /**
     * 处理导入数据
     * @param {string} format - 数据格式
     * @param {Array} fileContents - 文件内容数组
     * @param {FileList} files - 文件对象数组
     */
    function processImportData(format, fileContents, files) {
        try {
            // 根据格式处理数据
            switch (format) {
                case 'json':
                    return processJsonData(fileContents);
                case 'cypher':
                    return processCypherData(fileContents);
                case 'csv':
                    return processCsvData(fileContents);
                default:
                    throw new Error(`不支持的导入格式: ${format}`);
            }
        } catch (error) {
            throw new Error(`处理${format}格式数据时出错: ${error.message}`);
        }
    }
    
    /**
     * 处理JSON数据
     */
    function processJsonData(fileContents) {
        const nodes = [];
        const edges = [];
        
        fileContents.forEach(({ content, file }) => {
            try {
                const data = JSON.parse(content);
                
                // 支持多种JSON格式
                if (data.elements) {
                    // Cytoscape格式
                    if (data.elements.nodes) {
                        nodes.push(...data.elements.nodes);
                    }
                    if (data.elements.edges) {
                        edges.push(...data.elements.edges);
                    }
                } else if (Array.isArray(data.nodes) && Array.isArray(data.edges)) {
                    // 自定义格式
                    nodes.push(...data.nodes);
                    edges.push(...data.edges);
                } else if (Array.isArray(data)) {
                    // 扁平化数组格式
                    data.forEach(item => {
                        if (item.data && item.data.source === undefined) {
                            nodes.push(item);
                        } else if (item.data && item.data.source !== undefined) {
                            edges.push(item);
                        }
                    });
                }
            } catch (error) {
                throw new Error(`解析JSON文件 ${file.name} 时出错: ${error.message}`);
            }
        });
        
        return { nodes, edges, format: 'json' };
    }
    
    /**
     * 处理Cypher查询
     */
    function processCypherData(fileContents) {
        const queries = [];
        
        fileContents.forEach(({ content, file }) => {
            try {
                // 分割多个Cypher语句
                const statements = content.split(/;\s*$/m).filter(Boolean);
                queries.push(...statements);
            } catch (error) {
                throw new Error(`处理Cypher文件 ${file.name} 时出错: ${error.message}`);
            }
        });
        
        return { queries, format: 'cypher' };
    }
    
    /**
     * 处理CSV数据
     */
    function processCsvData(fileContents) {
        // CSV处理逻辑待实现
        return { format: 'csv', rawData: fileContents };
    }
    
    /**
     * 导入数据到图表
     */
    function importToGraph(processedData) {
        try {
            // 清除现有数据（如果配置了）
            if (ioConfig.import.options.clearExisting && neo4jEditor.graphRenderer && 
                typeof neo4jEditor.graphRenderer.clearGraph === 'function') {
                neo4jEditor.graphRenderer.clearGraph();
            }
            
            let result;
            
            // 根据数据格式导入
            if (processedData.format === 'json') {
                // 导入JSON数据（节点和边）
                if (neo4jEditor.graphRenderer && typeof neo4jEditor.graphRenderer.addElements === 'function') {
                    result = neo4jEditor.graphRenderer.addElements({
                        nodes: processedData.nodes,
                        edges: processedData.edges
                    });
                }
            } else if (processedData.format === 'cypher') {
                // 导入Cypher查询
                if (neo4jEditor.graphRenderer && typeof neo4jEditor.graphRenderer.executeCypher === 'function') {
                    // 批量执行Cypher查询
                    result = { executedQueries: processedData.queries.length };
                    processedData.queries.forEach(query => {
                        neo4jEditor.graphRenderer.executeCypher(query);
                    });
                }
            }
            
            // 应用自动布局
            if (ioConfig.import.options.autoLayout && neo4jEditor.layoutManager && 
                typeof neo4jEditor.layoutManager.runLayout === 'function') {
                neo4jEditor.layoutManager.runLayout();
            }
            
            return result || { success: true };
        } catch (error) {
            throw new Error(`导入数据到图表时出错: ${error.message}`);
        }
    }
    
    /**
     * 处理导出事件
     */
    function handleExportEvent(event, data) {
        try {
            const format = data.format || 'json';
            const options = { ...ioConfig.export[format], ...data.options };
            
            // 验证格式是否支持
            if (!ioConfig.export.supportedFormats.includes(format)) {
                throw new Error(`不支持的导出格式: ${format}`);
            }
            
            // 验证格式是否启用
            if (!ioConfig.export[format].enabled) {
                throw new Error(`导出格式 ${format} 已禁用`);
            }
            
            // 触发导出开始事件
            if (neo4jEditor.eventManager && typeof neo4jEditor.eventManager.trigger === 'function') {
                neo4jEditor.eventManager.trigger('ioManager:exportStarted', { format, options });
            }
            
            // 执行导出
            exportData(format, options);
        } catch (error) {
            handleError('export', error);
        }
    }
    
    /**
     * 导出数据
     */
    function exportData(format, options) {
        try {
            let result;
            let fileName = getExportFileName(format, options);
            
            switch (format) {
                case 'json':
                    result = exportAsJson(options);
                    break;
                case 'cypher':
                    result = exportAsCypher(options);
                    break;
                case 'svg':
                    result = exportAsSvg(options);
                    break;
                case 'png':
                    result = exportAsPng(options);
                    break;
                case 'dot':
                    result = exportAsDot(options);
                    break;
                default:
                    throw new Error(`不支持的导出格式: ${format}`);
            }
            
            // 处理导出结果
            if (result) {
                downloadFile(result.content, fileName, result.mimeType);
                
                // 更新历史记录
                updateExportHistory(format, fileName);
                
                // 触发导出完成事件
                if (neo4jEditor.eventManager && typeof neo4jEditor.eventManager.trigger === 'function') {
                    neo4jEditor.eventManager.trigger('ioManager:exportCompleted', { format, fileName });
                }
            }
        } catch (error) {
            handleError('export', error);
        }
    }
    
    /**
     * 导出为JSON
     */
    function exportAsJson(options) {
        try {
            if (!neo4jEditor.graphRenderer || typeof neo4jEditor.graphRenderer.getElements === 'function') {
                throw new Error('Graph renderer is not available');
            }
            
            let elements = neo4jEditor.graphRenderer.getElements();
            
            // 如果只导出选择的元素
            if (ioConfig.export.options.exportSelectionOnly) {
                elements = neo4jEditor.graphRenderer.getSelectedElements() || elements;
            }
            
            let jsonData;
            
            if (options.format === 'cytoscape') {
                // Cytoscape格式
                jsonData = {
                    elements: elements
                };
            } else {
                // 自定义格式
                const nodes = elements.nodes || [];
                const edges = elements.edges || [];
                jsonData = { nodes, edges };
            }
            
            // 添加元数据
            if (ioConfig.export.options.includeMetadata) {
                jsonData.metadata = {
                    timestamp: new Date().toISOString(),
                    version: '1.0',
                    nodeCount: jsonData.elements ? jsonData.elements.nodes?.length : jsonData.nodes?.length,
                    edgeCount: jsonData.elements ? jsonData.elements.edges?.length : jsonData.edges?.length
                };
            }
            
            const content = JSON.stringify(jsonData, null, options.prettyPrint ? 2 : 0);
            
            return {
                content,
                mimeType: 'application/json'
            };
        } catch (error) {
            throw new Error(`导出为JSON时出错: ${error.message}`);
        }
    }
    
    /**
     * 导出为Cypher
     */
    function exportAsCypher(options) {
        try {
            if (!neo4jEditor.graphRenderer || typeof neo4jEditor.graphRenderer.getElements === 'function') {
                throw new Error('Graph renderer is not available');
            }
            
            let elements = neo4jEditor.graphRenderer.getElements();
            
            // 如果只导出选择的元素
            if (ioConfig.export.options.exportSelectionOnly) {
                elements = neo4jEditor.graphRenderer.getSelectedElements() || elements;
            }
            
            const queries = [];
            const nodes = elements.nodes || [];
            const edges = elements.edges || [];
            
            // 生成节点Cypher语句
            nodes.forEach(node => {
                let query = options.createSyntax === 'merge' ? 'MERGE' : 'CREATE';
                let nodeLabel = node.data?.type || 'Node';
                let properties = node.data || {};
                
                query += ` (n:${nodeLabel} {id: '${properties.id}'`;
                
                // 添加其他属性
                if (options.includeProperties) {
                    for (const [key, value] of Object.entries(properties)) {
                        if (key !== 'id' && key !== 'type') {
                            const propValue = typeof value === 'string' ? `'${value}'` : value;
                            query += `, ${key}: ${propValue}`;
                        }
                    }
                }
                
                query += '})';
                if (options.splitStatements) {
                    query += ';';
                }
                
                queries.push(query);
            });
            
            // 生成关系Cypher语句
            edges.forEach(edge => {
                let query = options.createSyntax === 'merge' ? 'MERGE' : 'CREATE';
                let edgeType = edge.data?.type || 'RELATES_TO';
                let properties = edge.data || {};
                
                query += ` (a)-[:${edgeType}`;
                
                // 添加关系属性
                if (options.includeProperties && Object.keys(properties).length > 3) { // id, source, target 是必须的
                    query += ' {';
                    let firstProp = true;
                    
                    for (const [key, value] of Object.entries(properties)) {
                        if (key !== 'id' && key !== 'source' && key !== 'target') {
                            if (!firstProp) query += ', ';
                            const propValue = typeof value === 'string' ? `'${value}'` : value;
                            query += `${key}: ${propValue}`;
                            firstProp = false;
                        }
                    }
                    
                    query += '}';
                }
                
                query += `]->(b) WHERE a.id = '${properties.source}' AND b.id = '${properties.target}'`;
                if (options.splitStatements) {
                    query += ';';
                }
                
                queries.push(query);
            });
            
            return {
                content: queries.join('\n\n'),
                mimeType: 'text/plain'
            };
        } catch (error) {
            throw new Error(`导出为Cypher时出错: ${error.message}`);
        }
    }
    
    /**
     * 导出为SVG
     */
    function exportAsSvg(options) {
        try {
            if (!neo4jEditor.graphRenderer || typeof neo4jEditor.graphRenderer.getSvg === 'function') {
                throw new Error('Graph renderer is not available');
            }
            
            const svgContent = neo4jEditor.graphRenderer.getSvg(options);
            
            return {
                content: svgContent,
                mimeType: 'image/svg+xml'
            };
        } catch (error) {
            throw new Error(`导出为SVG时出错: ${error.message}`);
        }
    }
    
    /**
     * 导出为PNG
     */
    function exportAsPng(options) {
        try {
            if (!neo4jEditor.graphRenderer || typeof neo4jEditor.graphRenderer.getPng === 'function') {
                throw new Error('Graph renderer is not available');
            }
            
            return new Promise((resolve, reject) => {
                neo4jEditor.graphRenderer.getPng(options, (dataUrl) => {
                    try {
                        // 从DataURL提取内容
                        const content = dataUrl.replace(/^data:image\/png;base64,/, '');
                        resolve({
                            content: content,
                            mimeType: 'image/png',
                            isBase64: true
                        });
                    } catch (error) {
                        reject(error);
                    }
                });
            });
        } catch (error) {
            throw new Error(`导出为PNG时出错: ${error.message}`);
        }
    }
    
    /**
     * 导出为DOT
     */
    function exportAsDot(options) {
        try {
            if (!neo4jEditor.graphRenderer || typeof neo4jEditor.graphRenderer.getElements === 'function') {
                throw new Error('Graph renderer is not available');
            }
            
            let elements = neo4jEditor.graphRenderer.getElements();
            
            // 如果只导出选择的元素
            if (ioConfig.export.options.exportSelectionOnly) {
                elements = neo4jEditor.graphRenderer.getSelectedElements() || elements;
            }
            
            let dotContent = 'digraph G {\n';
            
            // 添加节点
            const nodes = elements.nodes || [];
            nodes.forEach(node => {
                const properties = node.data || {};
                let nodeLabel = options.nodeLabels && properties.label ? properties.label : `n${properties.id}`;
                dotContent += `  ${properties.id} [label="${nodeLabel}"];\n`;
            });
            
            // 添加边
            const edges = elements.edges || [];
            edges.forEach(edge => {
                const properties = edge.data || {};
                let edgeLabel = '';
                if (options.edgeLabels && properties.label) {
                    edgeLabel = ` [label="${properties.label}"]`;
                }
                dotContent += `  ${properties.source} -> ${properties.target}${edgeLabel};\n`;
            });
            
            dotContent += '}';
            
            return {
                content: dotContent,
                mimeType: 'text/plain'
            };
        } catch (error) {
            throw new Error(`导出为DOT时出错: ${error.message}`);
        }
    }
    
    /**
     * 获取导出文件名
     */
    function getExportFileName(format, options) {
        const defaultName = ioConfig.export.options.defaultFileName;
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        
        let extension = format;
        if (format === 'cypher') extension = 'cypher';
        
        return `${defaultName}_${timestamp}.${extension}`;
    }
    
    /**
     * 下载文件
     */
    function downloadFile(content, fileName, mimeType, isBase64 = false) {
        try {
            let blob;
            
            if (isBase64) {
                // 处理Base64内容
                const binaryString = atob(content);
                const len = binaryString.length;
                const arrayBuffer = new ArrayBuffer(len);
                const uint8Array = new Uint8Array(arrayBuffer);
                
                for (let i = 0; i < len; i++) {
                    uint8Array[i] = binaryString.charCodeAt(i);
                }
                
                blob = new Blob([arrayBuffer], { type: mimeType });
            } else {
                // 处理文本内容
                blob = new Blob([content], { type: mimeType });
            }
            
            // 创建下载链接
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = fileName;
            document.body.appendChild(link);
            link.click();
            
            // 清理
            setTimeout(() => {
                document.body.removeChild(link);
                URL.revokeObjectURL(url);
            }, 100);
        } catch (error) {
            throw new Error(`下载文件时出错: ${error.message}`);
        }
    }
    
    /**
     * 更新导入历史
     */
    function updateImportHistory(format, files) {
        try {
            if (!ioConfig.history.enabled) return;
            
            const items = Array.from(files).map(file => ({
                format,
                fileName: file.name,
                fileSize: file.size,
                timestamp: new Date().toISOString()
            }));
            
            ioHistory.import.unshift(...items);
            
            // 限制历史记录数量
            if (ioHistory.import.length > ioConfig.history.maxItems) {
                ioHistory.import = ioHistory.import.slice(0, ioConfig.history.maxItems);
            }
            
            // 保存到本地存储
            saveHistory();
        } catch (error) {
            console.error('IO Manager: Error updating import history:', error);
        }
    }
    
    /**
     * 更新导出历史
     */
    function updateExportHistory(format, fileName) {
        try {
            if (!ioConfig.history.enabled) return;
            
            ioHistory.export.unshift({
                format,
                fileName,
                timestamp: new Date().toISOString()
            });
            
            // 限制历史记录数量
            if (ioHistory.export.length > ioConfig.history.maxItems) {
                ioHistory.export = ioHistory.export.slice(0, ioConfig.history.maxItems);
            }
            
            // 保存到本地存储
            saveHistory();
        } catch (error) {
            console.error('IO Manager: Error updating export history:', error);
        }
    }
    
    /**
     * 处理错误
     */
    function handleError(operation, error) {
        const errorMessage = `IO Manager (${operation}): ${error.message}`;
        
        // 记录错误
        if (ioConfig.errorHandling.logErrors) {
            console.error(errorMessage, error);
        }
        
        // 显示错误
        if (ioConfig.errorHandling.showErrors) {
            // 这里可以实现更复杂的错误显示逻辑
            alert(errorMessage);
        }
        
        // 触发错误事件
        if (neo4jEditor.eventManager && typeof neo4jEditor.eventManager.trigger === 'function') {
            neo4jEditor.eventManager.trigger('ioManager:error', { operation, error });
        }
        
        // 是否抛出错误
        if (ioConfig.errorHandling.throwErrors) {
            throw error;
        }
    }
    
    /**
     * 处理导入文件事件
     */
    function handleImportFileEvent(event, data) {
        const format = data.format || 'json';
        
        // 检查是否有缓存的文件输入元素
        if (fileInputCache[format]) {
            // 重置文件输入
            fileInputCache[format].value = '';
            // 触发点击
            fileInputCache[format].click();
        }
    }
    
    /**
     * 处理导入数据事件
     */
    function handleImportDataEvent(event, data) {
        try {
            // 直接导入提供的数据
            const processedData = processImportData(data.format, [{ content: data.content, file: { name: 'data' } }]);
            importToGraph(processedData);
        } catch (error) {
            handleError('import', error);
        }
    }
    
    /**
     * 处理取消导入事件
     */
    function handleCancelImportEvent() {
        // 实现取消导入的逻辑
        console.log('IO Manager: Import canceled');
    }
    
    /**
     * 处理取消导出事件
     */
    function handleCancelExportEvent() {
        // 实现取消导出的逻辑
        console.log('IO Manager: Export canceled');
    }
    
    /**
     * 处理设置配置事件
     */
    function handleSetConfigEvent(event, newConfig) {
        try {
            // 合并新配置
            Object.assign(ioConfig, newConfig);
            // 验证配置
            validateConfig();
            console.log('IO Manager: Configuration updated');
        } catch (error) {
            handleError('config', error);
        }
    }
    
    /**
     * 处理清除历史记录事件
     */
    function handleClearHistoryEvent() {
        try {
            ioHistory.import = [];
            ioHistory.export = [];
            saveHistory();
            console.log('IO Manager: History cleared');
        } catch (error) {
            handleError('history', error);
        }
    }
    
    /**
     * 导出公共API
     */
    return {
        initialize,
        importFile: (format) => handleImportFileEvent(null, { format }),
        importData: (data) => handleImportDataEvent(null, data),
        exportData: (format, options) => handleExportEvent(null, { format, options }),
        setConfig: (config) => handleSetConfigEvent(null, config),
        getHistory: () => ({ ...ioHistory }),
        clearHistory: () => handleClearHistoryEvent()
    };
};