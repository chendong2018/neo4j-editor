/**
 * Neo4j编辑器数据导入管理器模块
 * 负责处理图形数据的导入功能
 */

/**
 * 导入管理器模块
 * @namespace importManagerModule
 */
const importManagerModule = {
    initialized: false,
    
    /**
     * 初始化导入管理器
     */
    initialize: function() {
        if (this.initialized) {
            console.warn('导入管理器已经初始化');
            return;
        }
        
        try {
            // 设置文件选择器
            this._setupFileInput();
            
            this.initialized = true;
            console.log('Neo4j Editor: 导入管理器初始化完成');
        } catch (error) {
            console.error('Neo4j Editor: 导入管理器初始化失败:', error);
            if (window.utilsModule && window.utilsModule.handleError) {
                window.utilsModule.handleError(error, '导入管理器初始化');
            }
        }
    },
    
    /**
     * 设置文件输入元素
     * @private
     */
    _setupFileInput: function() {
        try {
            // 检查是否已有文件输入元素
            this._fileInput = document.getElementById('neo4j-import-input');
            
            if (!this._fileInput) {
                // 创建隐藏的文件输入元素
                this._fileInput = document.createElement('input');
                this._fileInput.type = 'file';
                this._fileInput.id = 'neo4j-import-input';
                this._fileInput.style.display = 'none';
                this._fileInput.accept = '.json,.csv,.cypher,.txt,.zip';
                
                // 添加事件监听
                this._fileInput.addEventListener('change', this._handleFileSelect.bind(this));
                
                document.body.appendChild(this._fileInput);
            }
        } catch (error) {
            console.error('Neo4j Editor: 设置文件输入失败:', error);
        }
    },
    
    /**
     * 处理文件选择
     * @private
     * @param {Event} event - 文件选择事件
     */
    _handleFileSelect: function(event) {
        try {
            const file = event.target.files[0];
            if (!file) {
                return;
            }
            
            console.log('Neo4j Editor: 选择文件:', file.name);
            
            // 确定文件类型
            const fileExtension = file.name.split('.').pop().toLowerCase();
            
            switch (fileExtension) {
                case 'json':
                    this._importJSONFile(file);
                    break;
                case 'csv':
                    this._importCSVFile(file);
                    break;
                case 'cypher':
                case 'txt':
                    this._importCypherFile(file);
                    break;
                case 'zip':
                    // 可以扩展支持压缩文件导入
                    console.warn('Neo4j Editor: ZIP文件导入暂未实现');
                    break;
                default:
                    console.error('Neo4j Editor: 不支持的文件格式:', fileExtension);
                    if (window.utilsModule && window.utilsModule.showToast) {
                        window.utilsModule.showToast(`不支持的文件格式: ${fileExtension}`, 'error');
                    }
            }
            
            // 清空文件输入，允许重复选择同一个文件
            event.target.value = '';
        } catch (error) {
            console.error('Neo4j Editor: 处理文件选择失败:', error);
            if (window.utilsModule && window.utilsModule.handleError) {
                window.utilsModule.handleError(error, '处理文件选择');
            }
        }
    },
    
    /**
     * 打开文件选择对话框
     */
    openFileDialog: function() {
        try {
            if (!this._fileInput) {
                this._setupFileInput();
            }
            
            this._fileInput.click();
        } catch (error) {
            console.error('Neo4j Editor: 打开文件对话框失败:', error);
            if (window.utilsModule && window.utilsModule.handleError) {
                window.utilsModule.handleError(error, '打开文件对话框');
            }
        }
    },
    
    /**
     * 导入JSON文件
     * @private
     * @param {File} file - JSON文件对象
     */
    _importJSONFile: function(file) {
        const reader = new FileReader();
        
        reader.onload = (event) => {
            try {
                const content = event.target.result;
                const data = JSON.parse(content);
                
                this.importGraphData(data);
            } catch (error) {
                console.error('Neo4j Editor: 解析JSON文件失败:', error);
                if (window.utilsModule && window.utilsModule.showToast) {
                    window.utilsModule.showToast('解析JSON文件失败: ' + error.message, 'error');
                }
            }
        };
        
        reader.onerror = (error) => {
            console.error('Neo4j Editor: 读取JSON文件失败:', error);
            if (window.utilsModule && window.utilsModule.showToast) {
                window.utilsModule.showToast('读取JSON文件失败', 'error');
            }
        };
        
        reader.readAsText(file);
    },
    
    /**
     * 导入CSV文件
     * @private
     * @param {File} file - CSV文件对象
     */
    _importCSVFile: function(file) {
        const reader = new FileReader();
        
        reader.onload = (event) => {
            try {
                const content = event.target.result;
                const elements = this._parseCSV(content);
                
                this.importGraphData({ elements: elements });
            } catch (error) {
                console.error('Neo4j Editor: 解析CSV文件失败:', error);
                if (window.utilsModule && window.utilsModule.showToast) {
                    window.utilsModule.showToast('解析CSV文件失败: ' + error.message, 'error');
                }
            }
        };
        
        reader.onerror = (error) => {
            console.error('Neo4j Editor: 读取CSV文件失败:', error);
            if (window.utilsModule && window.utilsModule.showToast) {
                window.utilsModule.showToast('读取CSV文件失败', 'error');
            }
        };
        
        reader.readAsText(file);
    },
    
    /**
     * 导入Cypher文件
     * @private
     * @param {File} file - Cypher文件对象
     */
    _importCypherFile: function(file) {
        const reader = new FileReader();
        
        reader.onload = (event) => {
            try {
                const content = event.target.result;
                
                // 解析Cypher语句并转换为图形数据
                // 这是一个简化的实现，完整实现需要更复杂的Cypher解析器
                console.warn('Neo4j Editor: Cypher导入功能暂未完全实现');
                
                if (window.utilsModule && window.utilsModule.showToast) {
                    window.utilsModule.showToast('Cypher导入功能开发中...', 'info');
                }
            } catch (error) {
                console.error('Neo4j Editor: 解析Cypher文件失败:', error);
                if (window.utilsModule && window.utilsModule.showToast) {
                    window.utilsModule.showToast('解析Cypher文件失败: ' + error.message, 'error');
                }
            }
        };
        
        reader.onerror = (error) => {
            console.error('Neo4j Editor: 读取Cypher文件失败:', error);
            if (window.utilsModule && window.utilsModule.showToast) {
                window.utilsModule.showToast('读取Cypher文件失败', 'error');
            }
        };
        
        reader.readAsText(file);
    },
    
    /**
     * 解析CSV内容
     * @private
     * @param {string} csv - CSV字符串
     * @returns {Array} 元素数组
     */
    _parseCSV: function(csv) {
        const lines = csv.split('\n');
        const elements = [];
        let isProcessingNodes = false;
        let isProcessingEdges = false;
        let headers = [];
        
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i].trim();
            
            // 跳过注释和空行
            if (line.startsWith('#') || line === '') {
                // 检查是否切换到节点或边部分
                if (line.includes('# Nodes')) {
                    isProcessingNodes = true;
                    isProcessingEdges = false;
                    headers = [];
                } else if (line.includes('# Edges')) {
                    isProcessingNodes = false;
                    isProcessingEdges = true;
                    headers = [];
                }
                continue;
            }
            
            // 解析标题行
            if (headers.length === 0) {
                headers = line.split(',').map(h => h.trim());
                continue;
            }
            
            // 解析数据行
            const values = this._parseCSVLine(line);
            const element = {};
            
            for (let j = 0; j < headers.length; j++) {
                let value = values[j] || '';
                
                // 尝试解析JSON字符串
                if (value.startsWith('{') || value.startsWith('[')) {
                    try {
                        value = JSON.parse(value);
                    } catch (e) {
                        // 保留原始字符串
                    }
                }
                
                element[headers[j]] = value;
            }
            
            // 创建Cytoscape元素
            if (isProcessingNodes) {
                elements.push({
                    group: 'nodes',
                    data: element
                });
            } else if (isProcessingEdges) {
                elements.push({
                    group: 'edges',
                    data: element
                });
            }
        }
        
        return elements;
    },
    
    /**
     * 解析CSV行
     * @private
     * @param {string} line - CSV行字符串
     * @returns {Array} 值数组
     */
    _parseCSVLine: function(line) {
        // 简单的CSV解析，处理引号
        const values = [];
        let current = '';
        let inQuotes = false;
        
        for (let i = 0; i < line.length; i++) {
            const char = line[i];
            
            if (char === '"') {
                inQuotes = !inQuotes;
            } else if (char === ',' && !inQuotes) {
                values.push(current.trim());
                current = '';
            } else {
                current += char;
            }
        }
        
        values.push(current.trim());
        return values;
    },
    
    /**
     * 导入图形数据
     * @param {Object} data - 图形数据对象
     * @param {Object} options - 导入选项
     * @param {boolean} [options.clearCurrent=true] - 是否清除当前图形
     * @param {boolean} [options.centerView=true] - 是否居中视图
     * @returns {Promise} 导入结果Promise
     */
    importGraphData: function(data, options = {}) {
        return new Promise((resolve, reject) => {
            try {
                const clearCurrent = options.clearCurrent !== false;
                const centerView = options.centerView !== false;
                
                // 获取Cytoscape实例
                const cytoscapeModule = window.cytoscapeModule;
                if (!cytoscapeModule || !cytoscapeModule.getCy) {
                    throw new Error('Cytoscape模块未初始化');
                }
                
                const cy = cytoscapeModule.getCy();
                if (!cy) {
                    throw new Error('未找到Cytoscape实例');
                }
                
                // 准备要导入的元素
                let elementsToImport = [];
                
                if (Array.isArray(data)) {
                    elementsToImport = data;
                } else if (data.elements && Array.isArray(data.elements)) {
                    elementsToImport = data.elements;
                } else {
                    throw new Error('无效的图形数据格式');
                }
                
                if (elementsToImport.length === 0) {
                    throw new Error('没有元素可导入');
                }
                
                // 验证并处理元素
                const processedElements = this._processImportElements(elementsToImport);
                
                // 清除当前图形（如果需要）
                if (clearCurrent) {
                    cy.elements().remove();
                }
                
                // 添加新元素
                cy.add(processedElements);
                
                // 居中视图
                if (centerView) {
                    cy.fit();
                    cy.center();
                }
                
                // 显示成功提示
                const utils = window.utilsModule || {};
                if (utils.showToast) {
                    utils.showToast(`成功导入 ${processedElements.length} 个元素`, 'success');
                }
                
                console.log('Neo4j Editor: 图形数据导入成功', processedElements);
                resolve({ success: true, importedCount: processedElements.length });
            } catch (error) {
                console.error('Neo4j Editor: 导入图形数据失败:', error);
                if (window.utilsModule && window.utilsModule.handleError) {
                    window.utilsModule.handleError(error, '导入图形数据');
                }
                reject(error);
            }
        });
    },
    
    /**
     * 处理导入元素
     * @private
     * @param {Array} elements - 原始元素数组
     * @returns {Array} 处理后的元素数组
     */
    _processImportElements: function(elements) {
        const processed = [];
        const idMap = {};
        
        // 生成唯一ID
        const generateUniqueId = () => {
            const utils = window.utilsModule || {};
            if (utils.generateUniqueId) {
                return utils.generateUniqueId('import');
            }
            return `import_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        };
        
        // 处理节点
        elements.forEach(element => {
            if (element.group === 'nodes' || element.data && element.data._type === 'node') {
                const newElement = JSON.parse(JSON.stringify(element));
                const oldId = newElement.data.id;
                
                // 生成新ID
                const newId = generateUniqueId();
                newElement.data.id = newId;
                
                // 保存ID映射
                if (oldId) {
                    idMap[oldId] = newId;
                }
                
                processed.push(newElement);
            }
        });
        
        // 处理边
        elements.forEach(element => {
            if (element.group === 'edges' || element.data && element.data._type === 'edge') {
                const newElement = JSON.parse(JSON.stringify(element));
                
                // 更新源目标ID
                if (newElement.data.source && idMap[newElement.data.source]) {
                    newElement.data.source = idMap[newElement.data.source];
                }
                if (newElement.data.target && idMap[newElement.data.target]) {
                    newElement.data.target = idMap[newElement.data.target];
                }
                
                // 生成新ID
                newElement.data.id = generateUniqueId();
                
                processed.push(newElement);
            }
        });
        
        return processed;
    },
    
    /**
     * 从URL导入数据
     * @param {string} url - 数据URL
     * @param {Object} options - 导入选项
     * @returns {Promise} 导入结果Promise
     */
    importFromUrl: function(url, options = {}) {
        return new Promise((resolve, reject) => {
            fetch(url)
                .then(response => {
                    if (!response.ok) {
                        throw new Error(`HTTP error! status: ${response.status}`);
                    }
                    return response.json();
                })
                .then(data => {
                    return this.importGraphData(data, options);
                })
                .then(resolve)
                .catch(error => {
                    console.error('Neo4j Editor: 从URL导入数据失败:', error);
                    reject(error);
                });
        });
    }
};

// 为了向后兼容，暴露到全局
window.importManagerModule = importManagerModule;

// 如果支持模块导出，则导出
if (typeof module !== 'undefined' && typeof module.exports !== 'undefined') {
    module.exports = importManagerModule;
}

// 向后兼容的全局函数
window.importGraphData = function(data, clearCurrent) {
    console.warn('importGraphData 已弃用，请使用 importManagerModule.importGraphData()');
    return importManagerModule.importGraphData(data, {
        clearCurrent: clearCurrent
    });
};

console.log('Neo4j Editor: 导入管理器模块已加载');
