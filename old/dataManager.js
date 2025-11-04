/**
 * 数据管理器 - 处理图数据的保存、加载、导入和导出
 */
window.dataManager = {
    /**
     * 分批保存大数据
     * @param {object} data - 要保存的图数据
     * @param {function} successCallback - 保存成功回调函数
     * @param {function} errorCallback - 保存失败回调函数
     */
    saveGraphDataInBatches: function(data, successCallback, errorCallback) {
        try {
            // 显示保存进度
            var progressId = 'saveGraphData';
            window.viewManager.showProgressToast(progressId, '保存图数据中...', 0);
            
            // 分批处理大数组
            var batchSize = 1000;
            var nodes = data.nodes || [];
            var relationships = data.relationships || [];
            var totalItems = nodes.length + relationships.length;
            
            // 如果数据量很小，直接保存
            if (nodes.length <= batchSize && relationships.length <= batchSize) {
                localStorage.setItem('graphData', JSON.stringify(data));
                window.viewManager.updateProgressToast(progressId, '保存完成', 100);
                setTimeout(function() {
                      window.viewManager.removeProgressToast(progressId);
                  }, 1000);
                if (successCallback) successCallback();
                return;
            }
            
            // 大数据分批保存
            var processedCount = 0;
            
            // 1. 保存元数据
            localStorage.setItem('graphData:meta', JSON.stringify({
                nodesCount: nodes.length,
                relationshipsCount: relationships.length,
                timestamp: new Date().toISOString()
            }));
            
            // 2. 分批保存节点
            for (var i = 0; i < nodes.length; i += batchSize) {
                var batch = nodes.slice(i, i + batchSize);
                var key = 'graphData:nodes:' + Math.floor(i / batchSize);
                localStorage.setItem(key, JSON.stringify(batch));
                processedCount += batch.length;
                var progress = Math.floor((processedCount / totalItems) * 70); // 70%用于节点和关系保存
                window.viewManager.updateProgressToast(progressId, '保存节点中... ' + processedCount + '/' + totalItems, progress);
            }
            
            // 3. 分批保存关系
            for (var i = 0; i < relationships.length; i += batchSize) {
                var batch = relationships.slice(i, i + batchSize);
                var key = 'graphData:relationships:' + Math.floor(i / batchSize);
                localStorage.setItem(key, JSON.stringify(batch));
                processedCount += batch.length;
                var progress = Math.floor((processedCount / totalItems) * 70); // 70%用于节点和关系保存
                window.viewManager.updateProgressToast(progressId, '保存关系中... ' + processedCount + '/' + totalItems, progress);
            }
            
            // 4. 清除旧的完整数据（如果存在）
            localStorage.removeItem('graphData');
            
            window.viewManager.updateProgressToast(progressId, '保存完成', 100);
            setTimeout(function() {
                window.viewManager.removeProgressToast(progressId);
            }, 1000);
            
            if (successCallback) successCallback();
        } catch (error) {
            console.error('保存数据失败:', error);
            var progressId = 'saveGraphData';
            window.viewManager.updateProgressToast(progressId, '保存失败: ' + error.message, 0, true);
            setTimeout(function() {
                window.viewManager.removeProgressToast(progressId);
            }, 3000);
            if (errorCallback) errorCallback(error);
        }
    },
    
    /**
     * 从本地存储加载图数据
     * @returns {object|null} 加载的图数据或null（如果加载失败）
     */
    loadGraphDataFromStorage: function() {
        try {
            // 显示加载进度
            var progressId = 'loadGraphData';
            window.viewManager.showProgressToast(progressId, '加载图数据中...', 0);
            
            // 检查是否存在元数据（表示使用了分批保存）
            var meta = localStorage.getItem('graphData:meta');
            
            if (meta) {
                var metaData = JSON.parse(meta);
                var nodes = [];
                var relationships = [];
                var totalBatches = Math.ceil(metaData.nodesCount / 1000) + Math.ceil(metaData.relationshipsCount / 1000);
                var processedBatches = 0;
                
                window.viewManager.updateProgressToast(progressId, '加载节点数据...', 10);
                
                // 加载节点数据
                var nodeBatchIndex = 0;
                while (true) {
                    var batchKey = 'graphData:nodes:' + nodeBatchIndex;
                    var batchData = localStorage.getItem(batchKey);
                    if (!batchData) break;
                    var batchItems = JSON.parse(batchData);
                    // 兼容展开运算符
                    for (var j = 0; j < batchItems.length; j++) {
                        nodes.push(batchItems[j]);
                    }
                    nodeBatchIndex++;
                    processedBatches++;
                    var progress = Math.floor((processedBatches / totalBatches) * 80) + 10;
                    window.viewManager.updateProgressToast(progressId, '加载节点数据... ' + nodeBatchIndex + '批', progress);
                }
                
                window.viewManager.updateProgressToast(progressId, '加载关系数据...', 60);
                
                // 加载关系数据
                var relationshipBatchIndex = 0;
                while (true) {
                    var batchKey = 'graphData:relationships:' + relationshipBatchIndex;
                    var batchData = localStorage.getItem(batchKey);
                    if (!batchData) break;
                    var batchItems = JSON.parse(batchData);
                    // 兼容展开运算符
                    for (var j = 0; j < batchItems.length; j++) {
                        relationships.push(batchItems[j]);
                    }
                    relationshipBatchIndex++;
                    processedBatches++;
                    var progress = Math.floor((processedBatches / totalBatches) * 80) + 10;
                    window.viewManager.updateProgressToast(progressId, '加载关系数据... ' + relationshipBatchIndex + '批', progress);
                }
                
                window.viewManager.updateProgressToast(progressId, '加载完成', 100);
                setTimeout(function() {
                    window.viewManager.removeProgressToast(progressId);
                }, 1000);
                
                return {
                    nodes: nodes,
                    relationships: relationships
                };
            } else {
                // 尝试加载完整数据
                var data = localStorage.getItem('graphData');
                window.viewManager.updateProgressToast(progressId, '加载完成', 100);
                setTimeout(function() {
                    window.viewManager.removeProgressToast(progressId);
                }, 1000);
                return data ? JSON.parse(data) : null;
            }
        } catch (error) {
            console.error('加载数据失败:', error);
            var progressId = 'loadGraphData';
            window.viewManager.updateProgressToast(progressId, '加载失败: ' + error.message, 0, true);
            setTimeout(function() {
                window.viewManager.removeProgressToast(progressId);
            }, 3000);
            return null;
        }
    },
    
    /**
     * 导出数据为CSV格式
     * @param {object} data - 图数据对象
     * @param {string} type - 导出类型 ('nodes', 'relationships', 'both')
     */
    exportToCSV: function(data, type) {
        // 为旧浏览器提供默认参数
        if (type === undefined) {
            type = 'both';
        }
        try {
            var nodes = data.nodes || [];
            var relationships = data.relationships || [];
            var csvContent = '';
            
            if (type === 'nodes' || type === 'both') {
                // 导出节点数据
                if (nodes.length > 0) {
                    csvContent += '\n===== 节点数据 =====\n';
                    
                    // 获取所有可能的属性键（使用数组代替Set）
                    var allKeys = [];
                    for (var i = 0; i < nodes.length; i++) {
                        var node = nodes[i];
                        var keys = Object.keys(node);
                        for (var j = 0; j < keys.length; j++) {
                            var key = keys[j];
                            // 检查是否已存在
                            if (allKeys.indexOf(key) === -1) {
                                allKeys.push(key);
                            }
                        }
                    }
                    
                    // 排序
                    var headers = allKeys.sort();
                    
                    // 添加表头
                    csvContent += headers.join(',') + '\n';
                    
                    // 添加数据行
                    for (var i = 0; i < nodes.length; i++) {
                        var node = nodes[i];
                        var row = [];
                        for (var j = 0; j < headers.length; j++) {
                            var key = headers[j];
                            var value = node[key];
                            // 处理特殊字符
                            if (typeof value === 'string' && (value.indexOf(',') !== -1 || value.indexOf('"') !== -1 || value.indexOf('\n') !== -1)) {
                                row.push('"' + value.replace(/"/g, '""') + '"');
                            } else {
                                row.push(value);
                            }
                        }
                        csvContent += row.join(',') + '\n';
                    }
                }
            }
            
            if (type === 'relationships' || type === 'both') {
                // 导出关系数据
                if (relationships.length > 0) {
                    csvContent += '\n===== 关系数据 =====\n';
                    
                    // 获取所有可能的属性键（使用数组代替Set）
                    var allKeys = ['source', 'target', 'type'];
                    for (var i = 0; i < relationships.length; i++) {
                        var rel = relationships[i];
                        var keys = Object.keys(rel);
                        for (var j = 0; j < keys.length; j++) {
                            var key = keys[j];
                            // 检查是否已存在
                            if (allKeys.indexOf(key) === -1) {
                                allKeys.push(key);
                            }
                        }
                    }
                    
                    // 排序
                    var headers = allKeys.sort();
                    
                    // 添加表头
                    csvContent += headers.join(',') + '\n';
                    
                    // 添加数据行
                    for (var i = 0; i < relationships.length; i++) {
                        var rel = relationships[i];
                        var row = [];
                        for (var j = 0; j < headers.length; j++) {
                            var key = headers[j];
                            var value = rel[key];
                            // 处理特殊字符
                            if (typeof value === 'string' && (value.indexOf(',') !== -1 || value.indexOf('"') !== -1 || value.indexOf('\n') !== -1)) {
                                row.push('"' + value.replace(/"/g, '""') + '"');
                            } else {
                                row.push(value);
                            }
                        }
                        csvContent += row.join(',') + '\n';
                    }
                }
            }
            
            // 创建Blob对象
            var blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
            
            // 创建下载链接
            var link = document.createElement('a');
            var url = URL.createObjectURL(blob);
            link.setAttribute('href', url);
            // 兼容日期处理
            var today = new Date();
            var year = today.getFullYear();
            var month = String(today.getMonth() + 1);
            var day = String(today.getDate());
            
            // 使用自定义的padStart函数以兼容旧浏览器
            if (typeof month.padStart !== 'function') {
                month = padStart(month, 2, '0');
                day = padStart(day, 2, '0');
            } else {
                month = month.padStart(2, '0');
                day = day.padStart(2, '0');
            }
            
            var dateString = year + '-' + month + '-' + day;
            // 兼容padStart方法
            function padStart(str, targetLength, padString) {
                targetLength = targetLength >> 0; // 转为整数
                padString = String((typeof padString !== 'undefined' ? padString : ' '));
                if (str.length > targetLength) {
                    return String(str);
                } else {
                    targetLength = targetLength - str.length;
                    if (targetLength > padString.length) {
                    // 兼容ES5，添加repeat方法的自定义实现
                    if (typeof padString.repeat !== 'function') {
                        var repeats = Math.ceil(targetLength / padString.length);
                        var repeated = '';
                        for (var k = 0; k < repeats; k++) {
                            repeated += padString;
                        }
                        padString = repeated;
                    } else {
                        padString = padString.repeat(targetLength / padString.length);
                    }
                }
                    return padString.slice(0, targetLength) + String(str);
                }
            }

            
            link.setAttribute('download', 'neo4j-data-' + dateString + '.csv');
            link.style.visibility = 'hidden';
            
            // 添加到DOM并触发下载
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            
            // 清理URL
            URL.revokeObjectURL(url);
            
            return true;
        } catch (error) {
            console.error('导出CSV失败:', error);
            return false;
        }
    },
    
    /**
     * 生成带索引的Neo4j语句
     * @param {object} data - 图数据对象
     * @returns {string} Neo4j语句
     */
    generateNeo4jStatementsWithIndexes: function(data) {
        try {
            var nodes = data.nodes || [];
            var relationships = data.relationships || [];
            var statements = '';
            
            // 生成创建索引的语句
            statements += '-- 创建节点索引\n';
            statements += 'CREATE INDEX IF NOT EXISTS FOR (n:Node) ON (n.id);\n';
            statements += 'CREATE INDEX IF NOT EXISTS FOR (n:Node) ON (n.label);\n\n';
            
            // 生成创建节点的语句
            statements += '-- 创建节点\n';
            for (var i = 0; i < nodes.length; i++) {
                var node = nodes[i];
                var id = node.id;
                var label = node.label || 'Node';
                
                // 构建属性字符串
                var props = '';
                var keys = Object.keys(node);
                for (var j = 0; j < keys.length; j++) {
                    var key = keys[j];
                    if (key !== 'id' && key !== 'label') {
                        var value = node[key];
                        if (props) props += ', ';
                        
                        // 处理字符串类型
                        if (typeof value === 'string') {
                            props += key + ": '" + value.replace(/'/g, "''") + "'";
                        } else {
                            props += key + ": " + JSON.stringify(value);
                        }
                    }
                }
                
                statements += 'MERGE (n:' + label + ' {id: "' + id + '"}) ON CREATE SET n += {' + props + '};\n';
            }
            
            statements += '\n-- 创建关系\n';
            for (var i = 0; i < relationships.length; i++) {
                var rel = relationships[i];
                var sourceId = rel.source;
                var targetId = rel.target;
                var relType = rel.type || 'RELATED_TO';
                
                // 构建属性字符串
                var props = '';
                var keys = Object.keys(rel);
                for (var j = 0; j < keys.length; j++) {
                    var key = keys[j];
                    if (key !== 'source' && key !== 'target' && key !== 'type') {
                        var value = rel[key];
                        if (props) props += ', ';
                        
                        // 处理字符串类型
                        if (typeof value === 'string') {
                            props += key + ": '" + value.replace(/'/g, "''") + "'";
                        } else {
                            props += key + ": " + JSON.stringify(value);
                        }
                    }
                }
                
                statements += 'MATCH (a {id: "' + sourceId + '"}), (b {id: "' + targetId + '"})\n';
                
                if (props) {
                    statements += 'MERGE (a)-[r:' + relType + ' {' + props + '}]->(b);\n';
                } else {
                    statements += 'MERGE (a)-[r:' + relType + ']->(b);\n';
                }
            }
            
            return statements;
        } catch (error) {
            console.error('生成Neo4j语句失败:', error);
            return '';
        }
    },
    
    /**
     * 导出Neo4j语句
     * @param {object} data - 图数据对象
     */
    exportNeo4jStatements: function(data) {
        try {
            // 生成带索引的Neo4j语句
            var statements = this.generateNeo4jStatementsWithIndexes(data);
            
            if (!statements) {
                throw new Error('无法生成Neo4j语句');
            }
            
            // 创建Blob对象
            var blob = new Blob([statements], { type: 'text/plain;charset=utf-8;' });
            
            // 创建下载链接
            var link = document.createElement('a');
            var url = URL.createObjectURL(blob);
            link.setAttribute('href', url);
            
            // 兼容日期处理
            var today = new Date();
            var year = today.getFullYear();
            var month = String(today.getMonth() + 1);
            var day = String(today.getDate());
            
            // 确保padStart函数可用
            if (typeof padStart !== 'function') {
                function padStart(str, targetLength, padString) {
                    targetLength = targetLength >> 0; // 转为整数
                    padString = String((typeof padString !== 'undefined' ? padString : ' '));
                    if (str.length > targetLength) {
                        return String(str);
                    } else {
                        targetLength = targetLength - str.length;
                        if (targetLength > padString.length) {
                            // 兼容ES5，添加repeat方法的自定义实现
                            if (typeof padString.repeat !== 'function') {
                                var repeats = Math.ceil(targetLength / padString.length);
                                var repeated = '';
                                for (var k = 0; k < repeats; k++) {
                                    repeated += padString;
                                }
                                padString = repeated;
                            } else {
                                padString = padString.repeat(targetLength / padString.length);
                            }
                        }
                        return padString.slice(0, targetLength) + String(str);
                    }
                }
            }
            
            month = padStart(month, 2, '0');
            day = padStart(day, 2, '0');
            var dateString = year + '-' + month + '-' + day;
            
            link.setAttribute('download', 'neo4j-statements-' + dateString + '.cypher');
            link.style.visibility = 'hidden';
            
            // 添加到DOM并触发下载
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            
            // 清理URL
            URL.revokeObjectURL(url);
            
            return true;
        } catch (error) {
            console.error('导出Neo4j语句失败:', error);
            return false;
        }
    },
    
    /**
     * 读取导入文件
     * @param {File} file - 导入的文件对象
     * @param {function} successCallback - 成功回调函数
     * @param {function} errorCallback - 失败回调函数
     */
    readImportFile: function(file, successCallback, errorCallback) {
        if (!file) {
            if (errorCallback) errorCallback(new Error('未选择文件'));
            return;
        }
        
        // 显示导入进度
            var progressId = 'importFile';
            window.viewManager.showProgressToast(progressId, '导入文件中...', 0);
            
            var reader = new FileReader();
        
        reader.onprogress = function(e) {
            if (e.lengthComputable) {
                var progress = Math.floor((e.loaded / e.total) * 60); // 60%用于文件读取
                window.viewManager.updateProgressToast(progressId, '读取文件中... ' + progress + '%', progress);
            }
        };
        
        reader.onload = function(e) {
            try {
                window.viewManager.updateProgressToast(progressId, '解析文件内容...', 70);
                
                var content = e.target.result;
                
                // 根据文件类型解析内容
                if (file.name.indexOf('.json', file.name.length - 5) !== -1) {
                    // JSON格式
                    window.viewManager.updateProgressToast(progressId, '解析JSON数据...', 80);
                    var data = JSON.parse(content);
                    window.viewManager.updateProgressToast(progressId, '导入完成', 100);
                    setTimeout(function() {
                        window.viewManager.removeProgressToast(progressId);
                    }, 1000);
                    if (successCallback) successCallback(data);
                } else if (file.name.indexOf('.csv', file.name.length - 4) !== -1) {
                    // CSV格式
                    window.viewManager.updateProgressToast(progressId, '解析CSV数据...', 80);
                    var data = window.dataManager.parseCSVToGraphData(content);
                    window.viewManager.updateProgressToast(progressId, '导入完成', 100);
                    setTimeout(function() {
                        window.viewManager.removeProgressToast(progressId);
                    }, 1000);
                    if (successCallback) successCallback(data);
                } else {
                    throw new Error('不支持的文件格式，仅支持JSON和CSV格式');
                }
            } catch (error) {
                console.error('读取文件失败:', error);
                window.viewManager.updateProgressToast(progressId, '导入失败: ' + error.message, 0, true);
                setTimeout(function() {
                    window.viewManager.removeProgressToast(progressId);
                }, 3000);
                if (errorCallback) errorCallback(error);
            }
        };
        
        reader.onerror = function() {
            var error = new Error('文件读取错误');
            console.error('文件读取错误:', error);
            window.viewManager.updateProgressToast(progressId, '导入失败: ' + error.message, 0, true);
            setTimeout(function() {
                window.viewManager.removeProgressToast(progressId);
            }, 3000);
            if (errorCallback) errorCallback(error);
        };
        
        // 读取文件内容
        reader.readAsText(file);
    },
    
    /**
     * 解析CSV为图数据
     * @param {string} csvContent - CSV内容
     * @returns {object} 图数据对象
     */
    parseCSVToGraphData: function(csvContent) {
        var nodes = [];
        var relationships = [];
        
        // 按行分割CSV内容
        var lines = csvContent.trim().split('\n');
        
        // 查找数据部分
        var currentSection = null;
        var headers = null;
        
        for (var i = 0; i < lines.length; i++) {
            var line = lines[i].trim();
            
            // 跳过空行
            if (!line) continue;
            
            // 检查是否是数据部分标题
                if (line.indexOf('=====') === 0) {
                if (line.indexOf('节点数据') !== -1) {
                    currentSection = 'nodes';
                    headers = null;
                    // 跳过下一行表头
                    if (i + 1 < lines.length) {
                        headers = this.parseCSVLine(lines[++i]);
                    }
                } else if (line.indexOf('关系数据') !== -1) {
                    currentSection = 'relationships';
                    headers = null;
                    // 跳过下一行表头
                    if (i + 1 < lines.length) {
                        headers = this.parseCSVLine(lines[++i]);
                    }
                }
                continue;
            }
            
            // 解析数据行
            if (headers && currentSection) {
                var values = window.dataManager.parseCSVLine(line);
                
                if (values.length > 0) {
                    var item = {};
                    
                    // 构建对象
                    for (var j = 0; j < headers.length; j++) {
                        if (j < values.length) {
                            item[headers[j]] = values[j];
                        }
                    }
                    
                    // 添加到相应的数组
                    if (currentSection === 'nodes') {
                        nodes.push(item);
                    } else if (currentSection === 'relationships') {
                        relationships.push(item);
                    }
                }
            }
        }
        
        return {
            nodes: nodes,
            relationships: relationships
        };
    },
    
    /**
     * 解析CSV行
     * @param {string} line - CSV行
     * @returns {string[]} 解析后的值数组
     */
    parseCSVLine: function(line) {
        var result = [];
        var current = '';
        var inQuotes = false;
        var quoteChar = '"';
        
        for (var i = 0; i < line.length; i++) {
            var char = line[i];
            
            // 处理引号
            if (char === quoteChar && i < line.length - 1 && line[i + 1] === quoteChar) {
                // 转义引号（两个连续引号表示一个引号）
                current += quoteChar;
                i++; // 跳过下一个引号
            } else if (char === quoteChar) {
                inQuotes = !inQuotes;
            } else if (char === ',' && !inQuotes) {
                // 分隔符
                result.push(current.trim());
                current = '';
            } else {
                current += char;
            }
        }
        
        // 添加最后一个值
        result.push(current.trim());
        
        return result;
    },
    
    /**
     * 清空所有图数据
     */
    clearAllGraphData: function() {
        try {
            // 清除本地存储中的图数据
            localStorage.removeItem('graphData');
            
            // 清除分批存储的数据
            localStorage.removeItem('graphData:meta');
            
            // 清除所有节点批次
              var nodeBatchIndex = 0;
              while (true) {
                  var key = 'graphData:nodes:' + nodeBatchIndex;
                  if (!localStorage.getItem(key)) break;
                  localStorage.removeItem(key);
                  nodeBatchIndex++;
            }
            
            // 清除所有关系批次
            var relationshipBatchIndex = 0;
            while (true) {
                var key = 'graphData:relationships:' + relationshipBatchIndex;
                if (!localStorage.getItem(key)) break;
                localStorage.removeItem(key);
                relationshipBatchIndex++;
            }
            
            return true;
        } catch (error) {
            console.error('清空数据失败:', error);
            return false;
        }
    },
    
    /**
     * 批量处理大数据
     * @param {Array} items - 要处理的项目数组
     * @param {number} batchSize - 每批处理的项目数量
     * @param {function} processItem - 处理单个项目的函数
     * @param {function} onBatchComplete - 每批完成的回调函数
     * @param {function} onComplete - 全部完成的回调函数
     */
    processBatch: function(items, batchSize, processItem, onBatchComplete, onComplete) {
        // 兼容Array.isArray检查
        function isArray(obj) {
            return Object.prototype.toString.call(obj) === '[object Array]';
        }
        
        if (!isArray(items) || items.length === 0) {
            if (onComplete) onComplete();
            return;
        }
        
        var index = 0;
        var total = items.length;
        
        function processNextBatch() {
            // 检查是否所有批次都已处理
            if (index >= total) {
                if (onComplete) onComplete();
                return;
            }
            
            // 提取当前批次
            var batch = items.slice(index, index + batchSize);
            
            // 处理当前批次 - 兼容ES5
            if (typeof batch.forEach !== 'function') {
                for (var i = 0; i < batch.length; i++) {
                    processItem(batch[i], i, batch);
                }
            } else {
                batch.forEach(processItem);
            }
            
            // 更新索引
            index += batchSize;
            
            // 调用批次完成回调
            if (onBatchComplete) {
                onBatchComplete(index, total);
            }
            
            // 继续处理下一批次
            setTimeout(processNextBatch, 10); // 短暂延迟以允许UI更新
        }
        
        // 开始处理
        processNextBatch();
    }
};
