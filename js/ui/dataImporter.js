/**
 * Neo4j Editor - 数据导入模块
 * 负责处理图表数据的导入功能，支持多种格式
 */
(function(neo4jEditor) {
    'use strict';

    // 确保命名空间存在
    if (typeof neo4jEditor === 'undefined') {
        window.neo4jEditor = {};
    }

    // 初始化状态
    let initialized = false;
    
    // 导入配置
    let importConfig = {
        formats: ['json', 'cypher'],
        defaultFormat: 'json',
        clearExistingData: true,
        validateData: true,
        maxFileSize: 10 * 1024 * 1024, // 10MB
        autoMerge: false
    };

    /**
     * 初始化数据导入模块
     * @param {Object} config - 配置对象
     * @returns {boolean} 初始化是否成功
     */
    function initialize(config = {}) {
        try {
            console.log('Data Importer Module: Initializing...');
            
            // 合并配置
            importConfig = { ...importConfig, ...config };
            
            // 验证配置
            validateConfig();
            
            // 创建文件输入元素（如果需要）
            createFileInputElement();
            
            // 标记为已初始化
            initialized = true;
            
            console.log('Data Importer Module: Initialized successfully');
            
            // 触发初始化完成事件
            if (neo4jEditor.eventManager && typeof neo4jEditor.eventManager.trigger === 'function') {
                neo4jEditor.eventManager.trigger('dataImporter:initialized', {
                    config: importConfig
                });
            }
            
            return true;
        } catch (error) {
            console.error('Data Importer Module: Initialization error:', error);
            return false;
        }
    }

    /**
     * 验证配置
     */
    function validateConfig() {
        // 验证格式配置
        if (!Array.isArray(importConfig.formats)) {
            importConfig.formats = ['json', 'cypher'];
        }
        
        // 确保默认格式存在于格式列表中
        if (!importConfig.formats.includes(importConfig.defaultFormat)) {
            importConfig.defaultFormat = 'json';
        }
        
        // 验证最大文件大小
        if (typeof importConfig.maxFileSize !== 'number' || importConfig.maxFileSize <= 0) {
            importConfig.maxFileSize = 10 * 1024 * 1024; // 10MB
        }
    }

    /**
     * 创建文件输入元素
     */
    function createFileInputElement() {
        try {
            // 检查是否已存在
            if (document.getElementById('neo4j-import-file-input')) {
                return;
            }
            
            // 创建文件输入元素
            const fileInput = document.createElement('input');
            fileInput.id = 'neo4j-import-file-input';
            fileInput.type = 'file';
            fileInput.style.display = 'none';
            fileInput.multiple = false;
            
            // 设置接受的文件类型
            const acceptTypes = [];
            if (importConfig.formats.includes('json')) {
                acceptTypes.push('.json', 'application/json');
            }
            if (importConfig.formats.includes('cypher')) {
                acceptTypes.push('.cypher', '.cql', 'text/plain');
            }
            
            fileInput.accept = acceptTypes.join(',');
            
            // 添加事件监听
            fileInput.addEventListener('change', function(event) {
                const file = event.target.files[0];
                if (file) {
                    handleFileSelection(file);
                    // 重置文件输入，以便可以再次选择同一文件
                    this.value = '';
                }
            });
            
            // 添加到body
            document.body.appendChild(fileInput);
        } catch (error) {
            console.error('Error creating file input element:', error);
        }
    }

    /**
     * 处理文件选择
     * @param {File} file - 选择的文件
     */
    function handleFileSelection(file) {
        try {
            // 验证文件大小
            if (file.size > importConfig.maxFileSize) {
                throw new Error(`文件大小超过限制 (${formatFileSize(importConfig.maxFileSize)})`);
            }
            
            // 确定文件格式
            const fileExtension = file.name.split('.').pop().toLowerCase();
            let format = importConfig.defaultFormat;
            
            if (fileExtension === 'json') {
                format = 'json';
            } else if (['cypher', 'cql'].includes(fileExtension)) {
                format = 'cypher';
            }
            
            // 验证格式是否支持
            if (!importConfig.formats.includes(format)) {
                throw new Error(`不支持的文件格式: ${fileExtension}`);
            }
            
            // 触发文件选择事件
            if (neo4jEditor.eventManager && typeof neo4jEditor.eventManager.trigger === 'function') {
                neo4jEditor.eventManager.trigger('dataImporter:fileSelected', {
                    file: file,
                    format: format
                });
            }
            
            // 读取文件
            const reader = new FileReader();
            
            reader.onload = function(e) {
                try {
                    const fileContent = e.target.result;
                    importDataFromContent(fileContent, format, {
                        fileName: file.name,
                        fileSize: file.size
                    });
                } catch (error) {
                    handleImportError(error);
                }
            };
            
            reader.onerror = function() {
                handleImportError(new Error('读取文件失败'));
            };
            
            // 以文本形式读取文件
            reader.readAsText(file);
        } catch (error) {
            handleImportError(error);
        }
    }

    /**
     * 从内容导入数据
     * @param {string} content - 文件内容
     * @param {string} format - 文件格式
     * @param {Object} meta - 元数据
     * @returns {Promise} 导入结果Promise
     */
    function importDataFromContent(content, format = null, meta = {}) {
        return new Promise((resolve, reject) => {
            try {
                // 如果未指定格式，使用默认格式
                const importFormat = format || importConfig.defaultFormat;
                
                // 验证格式
                if (!importConfig.formats.includes(importFormat)) {
                    throw new Error(`不支持的导入格式: ${importFormat}`);
                }
                
                console.log(`Importing data in ${importFormat} format...`);
                
                // 触发导入开始事件
                if (neo4jEditor.eventManager && typeof neo4jEditor.eventManager.trigger === 'function') {
                    neo4jEditor.eventManager.trigger('dataImporter:importStarted', {
                        format: importFormat,
                        meta: meta
                    });
                }
                
                // 解析数据
                parseContent(content, importFormat).then(parsedData => {
                    // 验证数据（如果需要）
                    if (importConfig.validateData) {
                        validateImportData(parsedData);
                    }
                    
                    // 导入数据到图表
                    importToGraph(parsedData).then(result => {
                        // 触发导入完成事件
                        if (neo4jEditor.eventManager && typeof neo4jEditor.eventManager.trigger === 'function') {
                            neo4jEditor.eventManager.trigger('dataImporter:importCompleted', {
                                format: importFormat,
                                result: result,
                                meta: meta
                            });
                        }
                        
                        resolve(result);
                    }).catch(reject);
                }).catch(reject);
            } catch (error) {
                handleImportError(error);
                reject(error);
            }
        });
    }

    /**
     * 解析文件内容
     * @param {string} content - 文件内容
     * @param {string} format - 文件格式
     * @returns {Promise} 解析结果Promise
     */
    function parseContent(content, format) {
        return new Promise((resolve, reject) => {
            try {
                switch (format.toLowerCase()) {
                    case 'json':
                        parseJSONContent(content).then(resolve).catch(reject);
                        break;
                    case 'cypher':
                        parseCypherContent(content).then(resolve).catch(reject);
                        break;
                    default:
                        reject(new Error(`不支持的解析格式: ${format}`));
                }
            } catch (error) {
                reject(error);
            }
        });
    }

    /**
     * 解析JSON内容
     * @param {string} content - JSON内容
     * @returns {Promise} 解析结果Promise
     */
    function parseJSONContent(content) {
        return new Promise((resolve, reject) => {
            try {
                // 解析JSON
                const jsonData = JSON.parse(content);
                
                // 检查是否是包含版本信息的对象
                if (jsonData.version && jsonData.data) {
                    // 这是我们导出的格式
                    resolve({
                        nodes: jsonData.data.nodes || [],
                        edges: jsonData.data.edges || [],
                        styles: jsonData.styles || [],
                        version: jsonData.version,
                        timestamp: jsonData.timestamp
                    });
                } else if (jsonData.nodes && jsonData.edges) {
                    // 直接是节点和边的格式
                    resolve({
                        nodes: jsonData.nodes,
                        edges: jsonData.edges,
                        styles: jsonData.styles || []
                    });
                } else if (Array.isArray(jsonData)) {
                    // 如果是数组，尝试区分节点和边
                    const nodes = [];
                    const edges = [];
                    
                    jsonData.forEach(element => {
                        if (element.group === 'nodes' || (!element.group && element.data && !element.data.source && !element.data.target)) {
                            nodes.push(element);
                        } else if (element.group === 'edges' || (!element.group && element.data && element.data.source && element.data.target)) {
                            edges.push(element);
                        }
                    });
                    
                    resolve({
                        nodes: nodes,
                        edges: edges
                    });
                } else {
                    // 尝试将对象视为单个节点
                    resolve({
                        nodes: [jsonData],
                        edges: []
                    });
                }
            } catch (error) {
                reject(new Error(`JSON解析错误: ${error.message}`));
            }
        });
    }

    /**
     * 解析Cypher内容
     * @param {string} content - Cypher内容
     * @returns {Promise} 解析结果Promise
     */
    function parseCypherContent(content) {
        return new Promise((resolve, reject) => {
            try {
                // 这是一个简化的Cypher解析器，实际使用时可能需要更复杂的解析
                // 这里我们只提取CREATE语句中的节点和关系信息
                
                const nodes = [];
                const edges = [];
                let nodeIdCounter = 0;
                const nodeIdMap = new Map(); // 用于映射Cypher变量到节点ID
                
                // 移除注释
                const cleanContent = content.replace(/--.*$/gm, '');
                
                // 分割为语句
                const statements = cleanContent.split(';');
                
                statements.forEach(statement => {
                    statement = statement.trim();
                    if (!statement) return;
                    
                    // 处理CREATE语句
                    if (statement.toLowerCase().startsWith('create')) {
                        // 简化的节点提取
                        const nodeRegex = /\(([^)]+)\)/g;
                        let match;
                        
                        while ((match = nodeRegex.exec(statement)) !== null) {
                            const nodeContent = match[1];
                            // 简单解析节点内容，实际可能需要更复杂的解析
                            const node = parseNodeContent(nodeContent, nodeIdCounter++);
                            if (node) {
                                nodes.push(node);
                                // 提取变量名
                                const varMatch = nodeContent.match(/^([a-zA-Z_][a-zA-Z0-9_]*)/);
                                if (varMatch) {
                                    nodeIdMap.set(varMatch[1], node.data.id);
                                }
                            }
                        }
                        
                        // 简化的关系提取
                        const relationshipRegex = /\(\s*([a-zA-Z_][a-zA-Z0-9_]*)\s*\)\s*-\[([^\]]+)\]->\s*\(\s*([a-zA-Z_][a-zA-Z0-9_]*)\s*\)/g;
                        
                        while ((match = relationshipRegex.exec(statement)) !== null) {
                            const sourceVar = match[1];
                            const relationshipContent = match[2];
                            const targetVar = match[3];
                            
                            const sourceId = nodeIdMap.get(sourceVar);
                            const targetId = nodeIdMap.get(targetVar);
                            
                            if (sourceId && targetId) {
                                const edge = parseRelationshipContent(relationshipContent, sourceId, targetId, nodeIdCounter++);
                                if (edge) {
                                    edges.push(edge);
                                }
                            }
                        }
                    }
                });
                
                // 如果没有解析到任何节点和关系，可能是MATCH+CREATE的形式
                if (nodes.length === 0 && edges.length === 0) {
                    // 尝试解析MATCH+CREATE语句
                    parseMatchCreateStatements(cleanContent, nodes, edges, nodeIdCounter, nodeIdMap);
                }
                
                resolve({
                    nodes: nodes,
                    edges: edges,
                    format: 'cypher'
                });
            } catch (error) {
                reject(new Error(`Cypher解析错误: ${error.message}`));
            }
        });
    }

    /**
     * 解析MATCH+CREATE语句
     * @param {string} content - Cypher内容
     * @param {Array} nodes - 节点数组
     * @param {Array} edges - 边数组
     * @param {number} nodeIdCounter - 节点ID计数器
     * @param {Map} nodeIdMap - 节点ID映射
     */
    function parseMatchCreateStatements(content, nodes, edges, nodeIdCounter, nodeIdMap) {
        try {
            const matchCreateRegex = /MATCH\s+\(\s*([a-zA-Z_][a-zA-Z0-9_]*)\s*\{([^}]*)\}\s*\)\s*,\s*\(\s*([a-zA-Z_][a-zA-Z0-9_]*)\s*\{([^}]*)\}\s*\)\s+CREATE\s+\1\s*-\[([^\]]+)\]->\s*\3/g;
            let match;
            
            while ((match = matchCreateRegex.exec(content)) !== null) {
                const sourceVar = match[1];
                const sourcePropsStr = match[2];
                const targetVar = match[3];
                const targetPropsStr = match[4];
                const relContent = match[5];
                
                // 创建源节点
                const sourceId = `node_${nodeIdCounter++}`;
                const sourceNode = {
                    group: 'nodes',
                    data: {
                        id: sourceId,
                        ...parseProperties(sourcePropsStr)
                    }
                };
                nodes.push(sourceNode);
                nodeIdMap.set(sourceVar, sourceId);
                
                // 创建目标节点
                const targetId = `node_${nodeIdCounter++}`;
                const targetNode = {
                    group: 'nodes',
                    data: {
                        id: targetId,
                        ...parseProperties(targetPropsStr)
                    }
                };
                nodes.push(targetNode);
                nodeIdMap.set(targetVar, targetId);
                
                // 创建关系
                const edge = parseRelationshipContent(relContent, sourceId, targetId, nodeIdCounter++);
                if (edge) {
                    edges.push(edge);
                }
            }
        } catch (error) {
            console.warn('Failed to parse MATCH+CREATE statements:', error);
        }
    }

    /**
     * 解析节点内容
     * @param {string} nodeContent - 节点内容
     * @param {number} counter - 计数器
     * @returns {Object} 节点对象
     */
    function parseNodeContent(nodeContent, counter) {
        try {
            // 提取变量名和标签
            const varMatch = nodeContent.match(/^([a-zA-Z_][a-zA-Z0-9_]*)/);
            const labelMatch = nodeContent.match(/:([a-zA-Z_][a-zA-Z0-9_]*)/g);
            const propsMatch = nodeContent.match(/\{([^}]*)\}/);
            
            const node = {
                group: 'nodes',
                data: {
                    id: `node_${counter}`
                }
            };
            
            // 添加标签
            if (labelMatch) {
                node.data.labels = labelMatch.map(label => label.substring(1));
            }
            
            // 添加属性
            if (propsMatch) {
                node.data = { ...node.data, ...parseProperties(propsMatch[1]) };
            }
            
            return node;
        } catch (error) {
            console.warn('Failed to parse node content:', error);
            return null;
        }
    }

    /**
     * 解析关系内容
     * @param {string} relContent - 关系内容
     * @param {string} sourceId - 源节点ID
     * @param {string} targetId - 目标节点ID
     * @param {number} counter - 计数器
     * @returns {Object} 关系对象
     */
    function parseRelationshipContent(relContent, sourceId, targetId, counter) {
        try {
            // 提取变量名、类型和属性
            const varMatch = relContent.match(/^([a-zA-Z_][a-zA-Z0-9_]*)/);
            const typeMatch = relContent.match(/:([a-zA-Z_][a-zA-Z0-9_]*)/);
            const propsMatch = relContent.match(/\{([^}]*)\}/);
            
            const edge = {
                group: 'edges',
                data: {
                    id: `edge_${counter}`,
                    source: sourceId,
                    target: targetId,
                    type: typeMatch ? typeMatch[1] : 'RELATES_TO'
                }
            };
            
            // 添加属性
            if (propsMatch) {
                edge.data = { ...edge.data, ...parseProperties(propsMatch[1]) };
            }
            
            return edge;
        } catch (error) {
            console.warn('Failed to parse relationship content:', error);
            return null;
        }
    }

    /**
     * 解析属性字符串
     * @param {string} propsStr - 属性字符串
     * @returns {Object} 属性对象
     */
    function parseProperties(propsStr) {
        const properties = {};
        
        try {
            // 这是一个简化的属性解析器
            // 分割属性
            const propPairs = propsStr.split(/,\s*/);
            
            propPairs.forEach(pair => {
                pair = pair.trim();
                if (!pair) return;
                
                // 查找第一个冒号
                const colonIndex = pair.indexOf(':');
                if (colonIndex === -1) return;
                
                const key = pair.substring(0, colonIndex).trim();
                const valueStr = pair.substring(colonIndex + 1).trim();
                
                // 尝试解析值
                let value;
                if (valueStr === 'null') {
                    value = null;
                } else if (valueStr === 'true') {
                    value = true;
                } else if (valueStr === 'false') {
                    value = false;
                } else if (valueStr.startsWith('\'') && valueStr.endsWith('\'')) {
                    // 字符串值
                    value = valueStr.substring(1, valueStr.length - 1).replace(/\\'/g, '\'');
                } else if (valueStr.startsWith('"') && valueStr.endsWith('"')) {
                    // 字符串值
                    value = valueStr.substring(1, valueStr.length - 1).replace(/\\"/g, '"');
                } else if (!isNaN(valueStr)) {
                    // 数字值
                    value = parseFloat(valueStr);
                } else if (valueStr.startsWith('[') && valueStr.endsWith(']')) {
                    // 尝试解析数组
                    try {
                        value = JSON.parse(valueStr);
                    } catch {
                        value = valueStr;
                    }
                } else if (valueStr.startsWith('{') && valueStr.endsWith('}')) {
                    // 尝试解析对象
                    try {
                        value = JSON.parse(valueStr);
                    } catch {
                        value = valueStr;
                    }
                } else {
                    // 默认作为字符串
                    value = valueStr;
                }
                
                properties[key] = value;
            });
        } catch (error) {
            console.warn('Failed to parse properties:', error);
        }
        
        return properties;
    }

    /**
     * 验证导入数据
     * @param {Object} data - 导入数据
     */
    function validateImportData(data) {
        if (!data) {
            throw new Error('导入数据为空');
        }
        
        // 验证节点数组
        if (data.nodes && !Array.isArray(data.nodes)) {
            throw new Error('节点数据必须是数组');
        }
        
        // 验证边数组
        if (data.edges && !Array.isArray(data.edges)) {
            throw new Error('边数据必须是数组');
        }
        
        // 验证每个节点
        if (data.nodes) {
            data.nodes.forEach(node => {
                if (!node || !node.data || !node.data.id) {
                    throw new Error('无效的节点数据：缺少ID');
                }
            });
        }
        
        // 验证每个边
        if (data.edges) {
            data.edges.forEach(edge => {
                if (!edge || !edge.data) {
                    throw new Error('无效的边数据');
                }
                if (!edge.data.id) {
                    throw new Error('无效的边数据：缺少ID');
                }
                if (!edge.data.source) {
                    throw new Error(`无效的边数据：ID为${edge.data.id}的边缺少源节点`);
                }
                if (!edge.data.target) {
                    throw new Error(`无效的边数据：ID为${edge.data.id}的边缺少目标节点`);
                }
            });
        }
    }

    /**
     * 导入数据到图表
     * @param {Object} data - 要导入的数据
     * @returns {Promise} 导入结果Promise
     */
    function importToGraph(data) {
        return new Promise((resolve, reject) => {
            try {
                // 准备导入结果
                const importResult = {
                    nodes: data.nodes ? data.nodes.length : 0,
                    edges: data.edges ? data.edges.length : 0,
                    styles: data.styles ? data.styles.length : 0,
                    success: true
                };
                
                // 如果需要，清除现有数据
                if (importConfig.clearExistingData) {
                    clearGraphData();
                }
                
                // 导入节点和边
                let elements = [];
                
                if (data.nodes) {
                    elements = elements.concat(data.nodes);
                }
                
                if (data.edges) {
                    elements = elements.concat(data.edges);
                }
                
                // 导入元素
                if (elements.length > 0) {
                    if (neo4jEditor.dataModel && typeof neo4jEditor.dataModel.addElements === 'function') {
                        neo4jEditor.dataModel.addElements(elements);
                    } else if (neo4jEditor.graphRenderer && typeof neo4jEditor.graphRenderer.addElements === 'function') {
                        neo4jEditor.graphRenderer.addElements(elements);
                    } else {
                        // 尝试直接使用Cytoscape实例
                        const cy = getCytoscapeInstance();
                        if (cy && typeof cy.add === 'function') {
                            cy.add(elements);
                        } else {
                            throw new Error('无法导入数据：没有找到有效的数据模型或图表渲染器');
                        }
                    }
                }
                
                // 导入样式
                if (data.styles && data.styles.length > 0) {
                    if (neo4jEditor.graphRenderer && typeof neo4jEditor.graphRenderer.setStyles === 'function') {
                        neo4jEditor.graphRenderer.setStyles(data.styles);
                    } else {
                        // 尝试直接使用Cytoscape实例
                        const cy = getCytoscapeInstance();
                        if (cy && typeof cy.style === 'function') {
                            cy.style(data.styles).update();
                        }
                    }
                }
                
                // 触发数据更新事件
                if (neo4jEditor.eventManager && typeof neo4jEditor.eventManager.trigger === 'function') {
                    neo4jEditor.eventManager.trigger('graph:dataUpdated', {
                        imported: true,
                        importResult: importResult
                    });
                }
                
                resolve(importResult);
            } catch (error) {
                reject(error);
            }
        });
    }

    /**
     * 清除图表数据
     */
    function clearGraphData() {
        try {
            if (neo4jEditor.dataModel && typeof neo4jEditor.dataModel.clear === 'function') {
                neo4jEditor.dataModel.clear();
            } else if (neo4jEditor.graphRenderer && typeof neo4jEditor.graphRenderer.clear === 'function') {
                neo4jEditor.graphRenderer.clear();
            } else {
                // 尝试直接使用Cytoscape实例
                const cy = getCytoscapeInstance();
                if (cy && typeof cy.remove === 'function') {
                    cy.remove(cy.elements());
                }
            }
        } catch (error) {
            console.warn('Failed to clear graph data:', error);
        }
    }

    /**
     * 处理导入错误
     * @param {Error} error - 错误对象
     */
    function handleImportError(error) {
        console.error('Data import error:', error);
        
        // 触发导入错误事件
        if (neo4jEditor.eventManager && typeof neo4jEditor.eventManager.trigger === 'function') {
            neo4jEditor.eventManager.trigger('dataImporter:importError', {
                error: error.message || '未知错误'
            });
        } else {
            // 如果没有事件管理器，显示一个简单的错误提示
            alert(`导入失败: ${error.message || '未知错误'}`);
        }
    }

    /**
     * 打开文件选择对话框
     * @param {Object} options - 选项
     */
    function openFileDialog(options = {}) {
        try {
            const fileInput = document.getElementById('neo4j-import-file-input');
            
            if (!fileInput) {
                createFileInputElement();
            }
            
            // 更新文件输入属性（如果提供了选项）
            const updatedInput = document.getElementById('neo4j-import-file-input');
            
            if (options.accept) {
                updatedInput.accept = options.accept;
            }
            
            if (options.multiple !== undefined) {
                updatedInput.multiple = options.multiple;
            }
            
            // 触发点击事件
            updatedInput.click();
        } catch (error) {
            console.error('Error opening file dialog:', error);
        }
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
     * 格式化文件大小
     * @param {number} bytes - 字节数
     * @returns {string} 格式化的文件大小
     */
    function formatFileSize(bytes) {
        if (bytes < 1024) {
            return bytes + ' B';
        } else if (bytes < 1048576) {
            return (bytes / 1024).toFixed(2) + ' KB';
        } else {
            return (bytes / 1048576).toFixed(2) + ' MB';
        }
    }

    /**
     * 显示导入对话框
     * @param {Object} options - 对话框选项
     */
    function showImportDialog(options = {}) {
        try {
            // 触发导入对话框显示事件
            if (neo4jEditor.eventManager && typeof neo4jEditor.eventManager.trigger === 'function') {
                neo4jEditor.eventManager.trigger('dataImporter:showDialog', {
                    options: options
                });
            } else {
                // 如果没有事件管理器，直接打开文件对话框
                openFileDialog(options);
            }
        } catch (error) {
            console.error('Error showing import dialog:', error);
        }
    }

    /**
     * 清理资源
     */
    function cleanup() {
        try {
            // 移除文件输入元素
            const fileInput = document.getElementById('neo4j-import-file-input');
            if (fileInput && fileInput.parentNode) {
                fileInput.parentNode.removeChild(fileInput);
            }
            
            // 重置状态
            initialized = false;
            
            console.log('Data Importer Module: Resources cleaned up');
        } catch (error) {
            console.error('Error cleaning up data importer resources:', error);
        }
    }

    /**
     * 数据导入模块
     */
    const dataImporterModule = {
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
         * 导入数据
         * @param {string} content - 文件内容
         * @param {string} format - 文件格式
         * @param {Object} meta - 元数据
         * @returns {Promise} 导入结果Promise
         */
        importData: function(content, format = null, meta = {}) {
            return importDataFromContent(content, format, meta);
        },
        
        /**
         * 打开文件选择对话框
         * @param {Object} options - 选项
         */
        openFileDialog: function(options = {}) {
            openFileDialog(options);
        },
        
        /**
         * 显示导入对话框
         * @param {Object} options - 对话框选项
         */
        showImportDialog: function(options = {}) {
            showImportDialog(options);
        },
        
        /**
         * 设置导入配置
         * @param {Object} config - 配置对象
         */
        setConfig: function(config) {
            importConfig = { ...importConfig, ...config };
            validateConfig();
        },
        
        /**
         * 获取导入配置
         * @returns {Object} 配置对象
         */
        getConfig: function() {
            return { ...importConfig };
        },
        
        /**
         * 清理资源
         */
        cleanup: function() {
            cleanup();
        }
    };
    
    // 导出模块到命名空间
    neo4jEditor.dataImporter = dataImporterModule;
    
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
                console.warn(`警告: 直接调用 ${deprecatedName}() 已弃用，请使用 neo4jEditor.dataImporter.${newFunction.name || 'method'}()`);
            }
            return newFunction.apply(context || null, arguments);
        };
    }
    
    // 注册向后兼容函数
    const backwardCompatibilityMapping = [
        { deprecatedName: 'initializeDataImporter', newFunction: dataImporterModule.initialize, context: dataImporterModule },
        { deprecatedName: 'importData', newFunction: dataImporterModule.importData, context: dataImporterModule },
        { deprecatedName: 'openFileDialog', newFunction: dataImporterModule.openFileDialog, context: dataImporterModule },
        { deprecatedName: 'showImportDialog', newFunction: dataImporterModule.showImportDialog, context: dataImporterModule },
        { deprecatedName: 'setImportConfig', newFunction: dataImporterModule.setConfig, context: dataImporterModule },
        { deprecatedName: 'getImportConfig', newFunction: dataImporterModule.getConfig, context: dataImporterModule },
        { deprecatedName: 'cleanupDataImporter', newFunction: dataImporterModule.cleanup, context: dataImporterModule }
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
    const moduleName = 'ui/dataImporter';
    const moduleRegistrationInfo = {
        name: moduleName,
        version: '1.0.0',
        dependencies: ['core/eventManager', 'core/dataModel', 'views/graphRenderer'],
        module: dataImporterModule
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
                        initialized: dataImporterModule.initialized,
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
                window.appModule.dataImporter = dataImporterModule;
                console.log(`Neo4j Editor: ${moduleName} module registered via final fallback to appModule`);
            }
        }
    } else {
        // 降级方案：直接挂载到全局
        if (typeof window.appModule === 'undefined') {
            window.appModule = {};
        }
        window.appModule.dataImporter = dataImporterModule;
        console.log(`Neo4j Editor: ${moduleName} module registered via fallback to appModule`);
    }
    
    // 多模块系统支持 - 确保兼容性
    // CommonJS 模块支持
    if (typeof module !== 'undefined' && typeof module.exports !== 'undefined') {
        module.exports = dataImporterModule;
    }
    
    // ES 模块支持
    if (typeof exports !== 'undefined' && typeof exports === 'object') {
        Object.defineProperty(exports, '__esModule', { value: true });
        if (typeof module !== 'undefined') module.exports = dataImporterModule;
        exports.default = dataImporterModule;
    }
    
    // AMD 模块支持
    if (typeof define === 'function' && define.amd) {
        define(['core/eventManager', 'core/dataModel', 'views/graphRenderer'], function() {
            return dataImporterModule;
        });
    }
    
    return dataImporterModule;
})(window.neo4jEditor || (window.neo4jEditor = {}));