/**
 * Neo4j数据库连接管理模块
 */

// 数据库连接配置
window.dbConfig = null;
// 连接状态
window.isConnected = false;
// Neo4j驱动实例
window.neo4jDriver = null;

/**
 * Connect to Neo4j database
 * @param {Object} config - Database configuration object
 * @returns {Promise<boolean>} Whether connection is successful
 */
window.connectToNeo4j = function(config) {
    // Create a Promise for compatibility with asynchronous operations
    return new Promise(function(resolve, reject) {
        try {
            debugLog('Attempting to connect to Neo4j with config:', config);
            
            // Save configuration (using ES5 object copying method)
            window.dbConfig = {};
            for (var key in config) {
                if (config.hasOwnProperty(key)) {
                    window.dbConfig[key] = config[key];
                }
            }
            
            // 在实际应用中，这里会使用neo4j-driver库来创建连接
            // 这里我们模拟连接过程
            
            // 模拟API调用（使用XMLHttpRequest代替fetch）
            var xhr = new XMLHttpRequest();
            xhr.open('POST', 'http://localhost:5000/api/connect', true);
            xhr.setRequestHeader('Content-Type', 'application/json');
            
            xhr.onload = function() {
                if (xhr.status >= 200 && xhr.status < 300) {
                    var result = JSON.parse(xhr.responseText);
                    
                    if (result.success) {
                        window.isConnected = true;
                        window.showToast('Successfully connected to Neo4j database', 'success');
                        debugLog('Connected to Neo4j database successfully');
                        
                        // 更新UI状态
                        updateConnectionStatusUI(true);
                        
                        resolve(true);
                    } else {
                        var error = new Error(result.error || 'Connection failed, unknown error');
                        reject(error);
                        handleError('Failed to connect to Neo4j database:', error);
                        window.showToast('Connection failed: ' + error.message, 'error');
                        updateConnectionStatusUI(false);
                    }
                } else {
                    var error = new Error('HTTP request failed: ' + xhr.status);
                    reject(error);
                    handleError('Failed to connect to Neo4j database:', error);
                    window.showToast('Connection failed: ' + error.message, 'error');
                    updateConnectionStatusUI(false);
                }
            };
            
            xhr.onerror = function() {
                var error = new Error('Network error');
                reject(error);
                handleError('Failed to connect to Neo4j database:', error);
                window.showToast('Connection failed: ' + error.message, 'error');
                updateConnectionStatusUI(false);
            };
            
            xhr.send(JSON.stringify(config));
        } catch (error) {
            reject(error);
            handleError('Failed to connect to Neo4j database:', error);
            showToast('Connection failed: ' + error.message, 'error');
            updateConnectionStatusUI(false);
        }
    });
}

/**
 * Disconnect from Neo4j database
 */
window.disconnectFromNeo4j = function() {
    try {
        debugLog('Disconnecting from Neo4j database');
        
        // 在实际应用中，这里会关闭驱动实例
        if (neo4jDriver) {
            neo4jDriver.close();
            neo4jDriver = null;
        }
        
        window.isConnected = false;
        window.dbConfig = null;
        
        window.showToast('Disconnected from Neo4j database', 'info');
        updateConnectionStatusUI(false);
        
    } catch (error) {
        handleError('Failed to disconnect:', error);
        window.showToast('Disconnection failed', 'error');
    }
}

/**
 * Execute Cypher query
 * @param {string} query - Cypher query statement
 * @param {Object} params - Query parameters
 * @returns {Promise<Object>} Query result
 */
window.executeCypherQuery = function(query, params) {
    // 为旧浏览器提供默认参数值
    if (params === undefined) {
        params = {};
    }
    
    // Create Promise object for compatibility with asynchronous operations
    var promise = {
        then: function(successCallback) {
            promise._successCallback = successCallback;
            return promise;
        },
        catch: function(errorCallback) {
            promise._errorCallback = errorCallback;
            return promise;
        },
        _resolve: function(value) {
            if (promise._successCallback) {
                promise._successCallback(value);
            }
        },
        _reject: function(error) {
            if (promise._errorCallback) {
                promise._errorCallback(error);
            }
        }
    };
    
    // Simulate asynchronous execution
    setTimeout(function() {
        if (!window.isConnected) {
            var error = new Error('Not connected to Neo4j database');
            promise._reject(error);
            return;
        }
        
        try {
            debugLog('Executing Cypher query:', query);
            
            // 模拟API调用 - 使用XMLHttpRequest
            var xhr = new XMLHttpRequest();
            xhr.open('POST', 'http://localhost:5000/api/execute-query', true);
            xhr.setRequestHeader('Content-Type', 'application/json');
            
            xhr.onreadystatechange = function() {
                if (xhr.readyState === 4) {
                    if (xhr.status === 200) {
                        try {
                            var result = JSON.parse(xhr.responseText);
                            
                            if (result.success) {
                                window.showToast('Query successful, returned ' + result.data.length + ' results', 'success');
                                promise._resolve(result.data);
                            } else {
                                var errorMsg = new Error(result.error || 'Query execution failed');
                                handleError('Cypher query execution failed:', errorMsg);
                                window.showToast('Query failed: ' + errorMsg.message, 'error');
                                promise._reject(errorMsg);
                            }
                        } catch (parseError) {
                            handleError('Failed to parse query results:', parseError);
                            window.showToast('Query failed: ' + parseError.message, 'error');
                            promise._reject(parseError);
                        }
                    } else {
                        var error = new Error('HTTP error: ' + xhr.status);
                        handleError('Cypher查询执行失败:', error);
                        window.showToast('查询失败: ' + error.message, 'error');
                        promise._reject(error);
                    }
                }
            };
            
            xhr.onerror = function() {
                var error = new Error('Network error');
                handleError('Cypher查询执行失败:', error);
                window.showToast('查询失败: ' + error.message, 'error');
                promise._reject(error);
            };
            
            xhr.send(JSON.stringify({ query: query, params: params }));
        } catch (error) {
            handleError('Cypher查询执行失败:', error);
            showToast('查询失败: ' + error.message, 'error');
            promise._reject(error);
        }
    }, 0);
    
    return promise;
}

/**
 * Load graph data
 * @param {boolean} append - Whether to append to current graph
 * @returns {Promise<Object>} Loaded graph data
 */
window.loadGraphData = function(append) {
    // 为旧浏览器提供默认参数值
    if (append === undefined) {
        append = false;
    }
    
    // Create Promise object for compatibility with asynchronous operations
    var promise = {
        then: function(successCallback) {
            promise._successCallback = successCallback;
            return promise;
        },
        catch: function(errorCallback) {
            promise._errorCallback = errorCallback;
            return promise;
        },
        _resolve: function(value) {
            if (promise._successCallback) {
                promise._successCallback(value);
            }
        },
        _reject: function(error) {
            if (promise._errorCallback) {
                promise._errorCallback(error);
            }
        }
    };
    
    // Simulate asynchronous execution
    setTimeout(function() {
        if (!window.isConnected) {
            var error = new Error('Not connected to Neo4j database');
            promise._reject(error);
            return;
        }
        
        try {
            // Simple query to get all nodes and relationships (using ES5 string concatenation)
            var query = "" +
                "MATCH (n)\n" +
                "OPTIONAL MATCH (n)-[r]-(m)\n" +
                "RETURN n, collect(r), collect(m)";
            
            // 使用回调方式处理executeCypherQuery的结果
            window.executeCypherQuery(query).then(function(result) {
                try {
                    // Convert query results to Cytoscape compatible format
                    var graphData = convertNeo4jResultToGraphData(result);
                    
                    // Load to graph
                    if (window.loadGraphFromData) {
                        window.loadGraphFromData(graphData, append);
                    }
                    
                    promise._resolve(graphData);
                } catch (convertError) {
                    if (window.handleError) {
                        window.handleError('Failed to load graph data:', convertError);
                    }
                    promise._reject(convertError);
                }
            }).catch(function(error) {
                if (window.handleError) {
                    window.handleError('Failed to load graph data:', error);
                }
                promise._reject(error);
            });
        } catch (error) {
            if (window.handleError) {
                window.handleError('Failed to load graph data:', error);
            }
            promise._reject(error);
        }
    }, 0);
    
    return promise;
}

/**
 * Save graph data to Neo4j
 * @returns {Promise<boolean>} Whether save is successful
 */
window.saveGraphData = function() {
    // Create Promise object for compatibility with asynchronous operations
    var promise = {
        then: function(successCallback) {
            promise._successCallback = successCallback;
            return promise;
        },
        catch: function(errorCallback) {
            promise._errorCallback = errorCallback;
            return promise;
        },
        _resolve: function(value) {
            if (promise._successCallback) {
                promise._successCallback(value);
            }
        },
        _reject: function(error) {
            if (promise._errorCallback) {
                promise._errorCallback(error);
            }
        }
    };
    
    // Simulate asynchronous execution
    setTimeout(function() {
        if (!window.isConnected) {
            var error = new Error('Not connected to Neo4j database');
            promise._reject(error);
            return;
        }
        
        try {
            // Get current graph data (using ES5 compatible method instead of optional chaining)
            var graphData = [];
            if (window.cy && typeof window.cy.elements === 'function' && typeof window.cy.elements().jsons === 'function') {
                graphData = window.cy.elements().jsons();
            }
            
            // 使用XMLHttpRequest代替fetch
            var xhr = new XMLHttpRequest();
            xhr.open('POST', 'http://localhost:5000/api/save-graph', true);
            xhr.setRequestHeader('Content-Type', 'application/json');
            
            xhr.onreadystatechange = function() {
                if (xhr.readyState === 4) {
                    if (xhr.status === 200) {
                        try {
                            var result = JSON.parse(xhr.responseText);
                            
                            if (result.success) {
                                window.showToast('Graph data saved successfully', 'success');
                                promise._resolve(true);
                            } else {
                                var errorMsg = new Error(result.error || 'Save failed');
                                handleError('Failed to save graph data:', errorMsg);
                                window.showToast('Save failed: ' + errorMsg.message, 'error');
                                promise._resolve(false); // 返回false表示保存失败
                            }
                        } catch (parseError) {
                            handleError('Failed to parse save results:', parseError);
                            window.showToast('Save failed: ' + parseError.message, 'error');
                            promise._resolve(false);
                        }
                    } else {
                        var error = new Error('HTTP error: ' + xhr.status);
                        handleError('Failed to save graph data:', error);
                        window.showToast('Save failed: ' + error.message, 'error');
                        promise._resolve(false);
                    }
                }
            };
            
            xhr.onerror = function() {
                var error = new Error('Network error');
                handleError('Failed to save graph data:', error);
                window.showToast('Save failed: ' + error.message, 'error');
                promise._resolve(false);
            };
            
            // 使用ES5兼容的对象字面量
            xhr.send(JSON.stringify({ graphData: graphData }));
        } catch (error) {
            handleError('Failed to save graph data:', error);
            showToast('Save failed: ' + error.message, 'error');
            promise._resolve(false);
        }
    }, 0);
    
    return promise;
}

/**
 * 更新连接状态UI
 * @param {boolean} connected - 是否已连接
 */
function updateConnectionStatusUI(connected) {
    var statusElement = document.getElementById('connection-status');
    var disconnectBtn = document.getElementById('disconnect-btn');
    var connectBtn = document.getElementById('connect-btn');
    var executeQueryBtn = document.getElementById('execute-query-btn');
    var saveGraphBtn = document.getElementById('save-graph-btn');
    
    if (statusElement) {
        if (connected) {
            statusElement.classList.remove('bg-red-500');
            statusElement.classList.add('bg-green-500');
            statusElement.textContent = '已连接';
        } else {
            statusElement.classList.remove('bg-green-500');
            statusElement.classList.add('bg-red-500');
            statusElement.textContent = '未连接';
        }
    }
    
    if (disconnectBtn) {
        disconnectBtn.style.display = connected ? 'block' : 'none';
    }
    
    if (connectBtn) {
        connectBtn.style.display = connected ? 'none' : 'block';
    }
    
    if (executeQueryBtn) {
        executeQueryBtn.disabled = !connected;
    }
    
    if (saveGraphBtn) {
        saveGraphBtn.disabled = !connected;
    }
}

/**
 * 将Neo4j查询结果转换为Cytoscape图数据格式
 * @param {Array} neo4jResult - Neo4j查询结果
 * @returns {Object} Cytoscape图数据
 */
function convertNeo4jResultToGraphData(neo4jResult) {
    var nodes = {}; // 使用普通对象替代Map
    var edges = [];
    
    // 替代forEach循环
    for (var i = 0; i < neo4jResult.length; i++) {
        var record = neo4jResult[i];
        
        // 处理节点
        var node = record.n || record.node;
        if (node) {
            var nodeId = node.id || node._id || generateId('node');
            
            // 提取节点标签（类型）
            var type = 'Generic';
            if (node.labels && node.labels.length > 0) {
                type = node.labels[0];
            } else if (node.type) {
                type = node.type;
            }
            
            // 创建节点对象
            var nodeObj = {
                group: 'nodes',
                data: {
                    id: nodeId,
                    label: (node.properties && node.properties.name) ? node.properties.name : (node.name || type),
                    type: type
                }
            };
            
            // 使用ES5方式合并属性
            var propsToMerge = node.properties || node;
            for (var propKey in propsToMerge) {
                if (propsToMerge.hasOwnProperty(propKey)) {
                    // 避免覆盖已有的id和label属性
                    if (propKey !== 'id' && propKey !== 'label') {
                        nodeObj.data[propKey] = propsToMerge[propKey];
                    }
                }
            }
            
            nodes[nodeId] = nodeObj; // 使用对象属性替代set方法
        }
        
        // 处理关系
        if (record.r || record.relationships || record.collect_r) {
            var relationships = record.r 
                ? [record.r]
                : Array.isArray(record.relationships) 
                    ? record.relationships
                    : Array.isArray(record.collect_r) 
                        ? record.collect_r
                        : [];
            
            // 替代forEach循环
            for (var j = 0; j < relationships.length; j++) {
                var rel = relationships[j];
                if (rel) {
                    // 获取目标节点
                    var targetNode = record.m || record.target;
                    if (!targetNode && Array.isArray(record.collect_m)) {
                        // 替代find方法
                        for (var k = 0; k < record.collect_m.length; k++) {
                            var m = record.collect_m[k];
                            if (m && m.id === rel.end) {
                                targetNode = m;
                                break;
                            }
                        }
                    }
                    
                    if (targetNode) {
                        var targetId = targetNode.id || targetNode._id || generateId('node');
                        
                        // 提取目标节点标签（类型）
                        var targetType = 'Generic';
                        if (targetNode.labels && targetNode.labels.length > 0) {
                            targetType = targetNode.labels[0];
                        } else if (targetNode.type) {
                            targetType = targetNode.type;
                        }
                        
                        // 创建目标节点对象
                        var targetNodeObj = {
                            group: 'nodes',
                            data: {
                                id: targetId,
                                label: (targetNode.properties && targetNode.properties.name) ? targetNode.properties.name : (targetNode.name || targetType),
                                type: targetType
                            }
                        };
                        
                        // 使用ES5方式合并属性
                        var targetPropsToMerge = targetNode.properties || targetNode;
                        for (var targetPropKey in targetPropsToMerge) {
                            if (targetPropsToMerge.hasOwnProperty(targetPropKey)) {
                                // 避免覆盖已有的id和label属性
                                if (targetPropKey !== 'id' && targetPropKey !== 'label') {
                                    targetNodeObj.data[targetPropKey] = targetPropsToMerge[targetPropKey];
                                }
                            }
                        }
                        
                        nodes[targetId] = targetNodeObj; // 使用对象属性替代set方法
                        
                        // 创建关系对象
                        var edgeId = rel.id || rel._id || generateId('edge');
                        var edgeType = rel.type || 'RELATES_TO';
                        
                        var edgeObj = {
                            group: 'edges',
                            data: {
                                id: edgeId,
                                source: (node && node.id) ? node.id : ((node && node._id) ? node._id : generateId('node')),
                                target: targetId,
                                label: edgeType,
                                type: edgeType
                            }
                        };
                        
                        // 使用ES5方式合并属性
                        var relPropsToMerge = rel.properties || {};
                        for (var relPropKey in relPropsToMerge) {
                            if (relPropsToMerge.hasOwnProperty(relPropKey)) {
                                // 避免覆盖已有的id、source、target、label和type属性
                                if (relPropKey !== 'id' && relPropKey !== 'source' && relPropKey !== 'target' && relPropKey !== 'label' && relPropKey !== 'type') {
                                    edgeObj.data[relPropKey] = relPropsToMerge[relPropKey];
                                }
                            }
                        }
                        
                        edges.push(edgeObj);
                    }
                }
            }
        }
    }
    
    // 替代Array.from(nodes.values())
    var nodesArray = [];
    for (var nodeKey in nodes) {
        if (nodes.hasOwnProperty(nodeKey)) {
            nodesArray.push(nodes[nodeKey]);
        }
    }
    
    return {
        nodes: nodesArray,
        edges: edges
    };
}

// 使用utils.js中已定义的generateId函数

/**
 * 获取当前连接状态
 * @returns {boolean} 是否已连接
 */
window.getConnectionStatus = function() {
    return window.isConnected;
}

/**
 * 获取当前数据库配置
 * @returns {Object|null} 数据库配置
 */
window.getDatabaseConfig = function() {
    return window.dbConfig;
}

// 导出模块对象到全局
window.neo4jConnection = {
    // 替代getter函数
    isConnected: window.isConnected,
    dbConfig: window.dbConfig,
    // 完整函数引用，不使用简写形式
    connectToNeo4j: window.connectToNeo4j,
    disconnectFromNeo4j: window.disconnectFromNeo4j,
    executeCypherQuery: window.executeCypherQuery,
    loadGraphData: window.loadGraphData,
    saveGraphData: window.saveGraphData,
    getConnectionStatus: window.getConnectionStatus,
    getDatabaseConfig: window.getDatabaseConfig,
    
    // 添加节点唯一性检查功能
    checkNodeCodesUniqueness: function(nodes) {
        // 创建Promise对象来兼容异步操作
        var promise = {
            then: function(successCallback) {
                promise._successCallback = successCallback;
                return promise;
            },
            catch: function(errorCallback) {
                promise._errorCallback = errorCallback;
                return promise;
            },
            _resolve: function(value) {
                if (promise._successCallback) {
                    promise._successCallback(value);
                }
            },
            _reject: function(error) {
                if (promise._errorCallback) {
                    promise._errorCallback(error);
                }
            }
        };
        
        // 模拟异步执行
        setTimeout(function() {
            try {
                // 收集所有非空code - 使用ES5的for循环代替map
                var codes = [];
                for (var i = 0; i < nodes.length; i++) {
                    var node = nodes[i];
                    if (node && node.data && node.data.code) {
                        codes.push(node.data.code);
                    }
                }
                
                // 检查本地唯一性 - 使用普通对象代替Set
                var uniqueCodes = {};
                var hasDuplicates = false;
                var duplicateCodes = [];
                var codeCounts = {};
                
                // 使用ES5的for循环代替forEach
                for (var j = 0; j < codes.length; j++) {
                    var code = codes[j];
                    codeCounts[code] = (codeCounts[code] || 0) + 1;
                    
                    // 检查是否重复
                    if (codeCounts[code] > 1) {
                        // 检查是否已经在duplicateCodes中
                        var isAlreadyAdded = false;
                        for (var k = 0; k < duplicateCodes.length; k++) {
                            if (duplicateCodes[k] === code) {
                                isAlreadyAdded = true;
                                break;
                            }
                        }
                        
                        if (!isAlreadyAdded) {
                            duplicateCodes.push(code);
                        }
                    }
                }
                
                if (duplicateCodes.length > 0) {
                    promise._resolve({ success: false, duplicateCodes: duplicateCodes });
                } else {
                    // 这里可以添加数据库层面的唯一性检查
                    promise._resolve({ success: true, duplicateCodes: [] });
                }
            } catch (error) {
                console.error('Failed to check node codes uniqueness:', error);
                promise._resolve({ success: false, duplicateCodes: [], error: error.message });
            }
        }, 0);
        
        return promise;
    },
    
    // 根据标签过滤条件加载图数据
    loadGraphByLabelFilters: function(activeFilters) {
        // 为旧浏览器提供默认参数值
        if (activeFilters === undefined) {
            activeFilters = [];
        }
        
        // 创建Promise对象来兼容异步操作
        var promise = {
            then: function(successCallback) {
                promise._successCallback = successCallback;
                return promise;
            },
            catch: function(errorCallback) {
                promise._errorCallback = errorCallback;
                return promise;
            },
            _resolve: function(value) {
                if (promise._successCallback) {
                    promise._successCallback(value);
                }
            },
            _reject: function(error) {
                if (promise._errorCallback) {
                    promise._errorCallback(error);
                }
            }
        };
        
        // 模拟异步执行
        setTimeout(function() {
            try {
                if (!window.isConnected) {
                    var error = new Error('未连接到Neo4j数据库');
                    promise._reject(error);
                    return;
                }
                
                var query;
                var params = {};
                
                if (activeFilters && activeFilters.length > 0) {
                    // 构建带过滤条件的查询 - 使用ES5的for循环代替map
                    var labelConditions = [];
                    for (var i = 0; i < activeFilters.length; i++) {
                        var filter = activeFilters[i];
                        params['label' + i] = filter;
                        labelConditions.push('n:' + filter);
                    }
                    
                    // 使用ES5字符串连接代替模板字符串
                    query = "" +
                        "MATCH (n)\n" +
                        "WHERE " + labelConditions.join(' OR ') + "\n" +
                        "OPTIONAL MATCH (n)-[r]->(m)\n" +
                        "OPTIONAL MATCH (m)<-[r2]-(n)\n" +
                        "RETURN n, r, m, r2";
                } else {
                    // 加载所有节点和关系
                    query = "" +
                        "MATCH (n)\n" +
                        "OPTIONAL MATCH (n)-[r]->(m)\n" +
                        "RETURN n, r, m";
                }
                
                // 执行查询
                window.executeCypherQuery(query, params).then(function(result) {
                    // 将查询结果转换为Cytoscape可用的格式
                    var graphData = convertNeo4jResultToGraphData(result);
                    
                    // 加载到图中
                    if (typeof window.loadGraphFromData === 'function') {
                        window.loadGraphFromData(graphData);
                    }
                    
                    // 解析完结果后调用resolve
                    promise._resolve(graphData);
                }).catch(function(error) {
                    // 处理错误
                    console.error('Failed to load graph by label filters:', error);
                    promise._reject(error);
                });
            } catch (error) {
                console.error('Error in loadGraphByLabelFilters:', error);
                promise._reject(error);
            }
        }, 0);
        
        return promise;
    },
    
    // 增强的保存图数据方法，支持关系类型和节点唯一性
    enhancedSaveGraphData: function() {
        var that = this; // 保存this上下文
        
        // 创建Promise对象
        var promise = {
            then: function(successCallback) {
                promise._successCallback = successCallback;
                return promise;
            },
            catch: function(errorCallback) {
                promise._errorCallback = errorCallback;
                return promise;
            },
            _resolve: function(value) {
                if (promise._successCallback) {
                    promise._successCallback(value);
                }
            },
            _reject: function(error) {
                if (promise._errorCallback) {
                    promise._errorCallback(error);
                }
            }
        };
        
        setTimeout(function() {
            try {
                if (!window.isConnected) {
                    var error = new Error('未连接到Neo4j数据库');
                    promise._resolve(false); // 按照原函数返回false
                    return;
                }
                
                // 获取当前图数据 - 替代可选链操作符
                var graphData = [];
                if (window.cy && window.cy.elements && typeof window.cy.elements === 'function') {
                    var elements = window.cy.elements();
                    if (elements && elements.jsons && typeof elements.jsons === 'function') {
                        graphData = elements.jsons() || [];
                    }
                }
                
                // 替代filter函数
                var nodes = [];
                var edges = [];
                for (var i = 0; i < graphData.length; i++) {
                    var el = graphData[i];
                    if (el.group === 'nodes') {
                        nodes.push(el);
                    } else if (el.group === 'edges') {
                        edges.push(el);
                    }
                }
                
                // 检查节点code唯一性
                that.checkNodeCodesUniqueness(nodes).then(function(uniqueCodeCheck) {
                    if (!uniqueCodeCheck.success) {
                        var errorMsg = '节点code重复: ' + uniqueCodeCheck.duplicateCodes.join(', ');
                        handleError('增强版保存图数据失败:', new Error(errorMsg));
                        window.showToast('保存失败: ' + errorMsg, 'error');
                        promise._resolve(false);
                        return;
                    }
                    
                    // 使用XMLHttpRequest替代fetch
                    var xhr = new XMLHttpRequest();
                    xhr.open('POST', 'http://localhost:5000/api/save-graph-enhanced');
                    xhr.setRequestHeader('Content-Type', 'application/json');
                    
                    xhr.onload = function() {
                        if (xhr.status === 200) {
                            try {
                                var result = JSON.parse(xhr.responseText);
                                if (result.success) {
                                    window.showToast('图数据保存成功: ' + result.savedNodes + '个节点, ' + result.savedEdges + '条关系', 'success');
                                    promise._resolve(true);
                                } else {
                                    var saveError = new Error(result.error || '保存失败');
                                    handleError('增强版保存图数据失败:', saveError);
                                    window.showToast('保存失败: ' + saveError.message, 'error');
                                    promise._resolve(false);
                                }
                            } catch (parseError) {
                                handleError('增强版保存图数据失败:', parseError);
                                window.showToast('保存失败: 解析响应失败', 'error');
                                promise._resolve(false);
                            }
                        } else {
                            var networkError = new Error('网络请求失败: ' + xhr.status);
                            handleError('增强版保存图数据失败:', networkError);
                            window.showToast('保存失败: ' + networkError.message, 'error');
                            promise._resolve(false);
                        }
                    };
                    
                    xhr.onerror = function() {
                        var networkError = new Error('网络请求失败');
                        handleError('增强版保存图数据失败:', networkError);
                        window.showToast('保存失败: ' + networkError.message, 'error');
                        promise._resolve(false);
                    };
                    
                    xhr.send(JSON.stringify({ nodes: nodes, edges: edges }));
                }).catch(function(error) {
                    handleError('增强版保存图数据失败:', error);
                    window.showToast('保存失败: ' + error.message, 'error');
                    promise._resolve(false);
                });
            } catch (error) {
                handleError('增强版保存图数据失败:', error);
                window.showToast('保存失败: ' + error.message, 'error');
                promise._resolve(false);
            }
        }, 0);
        
        return promise;
    },
    
    // 保存当前图表到Neo4j数据库
    saveGraphToNeo4j: function() {
        var that = this;
        
        // 创建Promise对象
        var promise = {
            then: function(successCallback) {
                promise._successCallback = successCallback;
                return promise;
            },
            catch: function(errorCallback) {
                promise._errorCallback = errorCallback;
                return promise;
            },
            _resolve: function(value) {
                if (promise._successCallback) {
                    promise._successCallback(value);
                }
            },
            _reject: function(error) {
                if (promise._errorCallback) {
                    promise._errorCallback(error);
                }
            }
        };
        
        setTimeout(function() {
            try {
                // 检查是否已连接
                if (!window.isConnected) {
                    var error = new Error('未连接到Neo4j数据库');
                    promise._reject(error);
                    return;
                }
                
                // 获取当前图数据 - 替代可选链操作符
                var graphData = [];
                if (window.cy && window.cy.elements && typeof window.cy.elements === 'function') {
                    var elements = window.cy.elements();
                    if (elements && elements.jsons && typeof elements.jsons === 'function') {
                        graphData = elements.jsons() || [];
                    }
                }
                
                // 替代filter函数
                var nodes = [];
                for (var i = 0; i < graphData.length; i++) {
                    var el = graphData[i];
                    if (el.group === 'nodes') {
                        nodes.push(el);
                    }
                }
                
                // 检查节点code唯一性
                that.checkNodeCodesUniqueness(nodes).then(function(uniquenessResult) {
                    if (!uniquenessResult.success) {
                        var errorMsg = '节点唯一性检查失败: 发现重复节点code: ' + uniquenessResult.duplicateCodes.join(', ');
                        promise._reject(new Error(errorMsg));
                        return;
                    }
                    
                    // 使用增强的保存功能
                    that.enhancedSaveGraphData().then(function() {
                        // 更新标签配置
                        if (typeof window.configureNeo4jLabels === 'function') {
                            window.configureNeo4jLabels();
                        }
                        
                        // 通知视图管理器标签已更新
                        if (window.viewManager && typeof window.viewManager.onNeo4jLabelsUpdated === 'function') {
                            window.viewManager.onNeo4jLabelsUpdated();
                        }
                        
                        promise._resolve();
                    }).catch(function(error) {
                        console.error('保存图表到Neo4j失败:', error);
                        promise._reject(error);
                    });
                }).catch(function(error) {
                    console.error('保存图表到Neo4j失败:', error);
                    promise._reject(error);
                });
            } catch (error) {
                console.error('保存图表到Neo4j失败:', error);
                promise._reject(error);
            }
        }, 0);
        
        return promise;
    },
    
    // 从Neo4j数据库加载图表数据
    loadGraphFromNeo4j: function(labelFilters) {
        // 提供默认参数值
        if (labelFilters === undefined) {
            labelFilters = [];
        }
        
        var that = this;
        
        // 创建Promise对象
        var promise = {
            then: function(successCallback) {
                promise._successCallback = successCallback;
                return promise;
            },
            catch: function(errorCallback) {
                promise._errorCallback = errorCallback;
                return promise;
            },
            _resolve: function(value) {
                if (promise._successCallback) {
                    promise._successCallback(value);
                }
            },
            _reject: function(error) {
                if (promise._errorCallback) {
                    promise._errorCallback(error);
                }
            }
        };
        
        setTimeout(function() {
            try {
                // 检查是否已连接
                if (!window.isConnected) {
                    var error = new Error('未连接到Neo4j数据库');
                    promise._reject(error);
                    return;
                }
                
                // 加载数据函数
                var loadData = function() {
                    if (labelFilters && labelFilters.length > 0) {
                        // 使用带标签过滤的加载
                        return that.loadGraphByLabelFilters(labelFilters);
                    } else {
                        // 加载所有数据
                        return that.loadGraphData();
                    }
                };
                
                loadData().then(function(graphData) {
                    // 确保返回的数据是有效的
                    if (!graphData || !Array.isArray(graphData.nodes) || !Array.isArray(graphData.edges)) {
                        promise._reject(new Error('从数据库加载的图表数据格式无效'));
                        return;
                    }
                    
                    // 加载到共享图表数据
                    if (typeof window.loadGraphFromData === 'function') {
                        window.loadGraphFromData(graphData);
                    } else {
                        // 如果window.loadGraphFromData不存在，直接更新sharedGraphData
                        window.sharedGraphData = {
                            nodes: graphData.nodes,
                            edges: graphData.edges,
                            neo4jLabels: graphData.neo4jLabels || [],
                            activeLabelFilters: labelFilters || [],
                            deletedEdges: [],
                            nodeTemplates: {}
                        };
                    }
                    
                    // 继续执行后续操作
                    promise._resolve(graphData);
                }).catch(function(error) {
                    promise._reject(error);
                });
            } catch (error) {
                promise._reject(error);
            }
        }, 0);
        
        return promise;
    },
    
    // 将图表数据导出为Neo4j Cypher语句
    exportGraphAsNeo4jStatement: function() {
        try {
            debugLog('开始导出图表数据为Neo4j语句');
            
            // 获取当前图数据 - 替代可选链操作符
            var graphData = [];
            if (window.cy && window.cy.elements && typeof window.cy.elements === 'function') {
                var elements = window.cy.elements();
                if (elements && elements.jsons && typeof elements.jsons === 'function') {
                    graphData = elements.jsons() || [];
                }
            }
            
            // 替代filter函数
            var nodes = [];
            var edges = [];
            for (var i = 0; i < graphData.length; i++) {
                var el = graphData[i];
                if (el.group === 'nodes') {
                    nodes.push(el);
                } else if (el.group === 'edges') {
                    edges.push(el);
                }
            }
            
            var cypherStatements = [];
            
            // 生成节点创建语句 - 替代forEach
            for (var j = 0; j < nodes.length; j++) {
                var node = nodes[j];
                
                // 准备节点属性 - 替代对象展开运算符
                var properties = {};
                for (var key in node.data) {
                    if (node.data.hasOwnProperty(key)) {
                        properties[key] = node.data[key];
                    }
                }
                delete properties.id; // 删除id属性，Neo4j会自动分配
                delete properties.label; // 删除label属性，使用Neo4j标签
                
                // 准备Neo4j标签
                var labels = [];
                if (node.data.label) {
                    labels.push(node.data.label);
                }
                // 添加视图相关标签 - 替代数组展开和filter
                if (node.data.tags && Array.isArray(node.data.tags)) {
                    for (var k = 0; k < node.data.tags.length; k++) {
                        var tag = node.data.tags[k];
                        if (tag !== 'tree' && tag !== 'network') {
                            labels.push(tag);
                        }
                    }
                }
                
                // 格式化属性 - 替代Object.entries和map
                var formattedPropsArray = [];
                for (var propKey in properties) {
                    if (properties.hasOwnProperty(propKey)) {
                        var value = properties[propKey];
                        // 过滤无效值
                        if (value !== undefined && value !== null && value !== '') {
                            var formattedValue;
                            if (typeof value === 'string') {
                                // 转义单引号
                                formattedValue = "'" + value.replace(/'/g, "''") + "'";
                            } else if (typeof value === 'object' && value !== null) {
                                formattedValue = "'" + JSON.stringify(value).replace(/'/g, "''") + "'";
                            } else {
                                formattedValue = value;
                            }
                            formattedPropsArray.push(propKey + ': ' + formattedValue);
                        }
                    }
                }
                var formattedProps = formattedPropsArray.join(', ');
                
                // 构建节点创建语句 - 替代模板字符串
                var labelsStr = labels.length > 0 ? ':' + labels.join(':') : '';
                cypherStatements.push('CREATE (n' + labelsStr + ' { ' + formattedProps + ' })');
            }
            
            // 生成关系创建语句
            if (edges.length > 0) {
                // 添加注释分隔
                cypherStatements.push('');
                cypherStatements.push('// 创建关系');
                
                // 替代forEach
                for (var l = 0; l < edges.length; l++) {
                    var edge = edges[l];
                    
                    // 获取源节点和目标节点信息
                    var sourceId = edge.data.source;
                    var targetId = edge.data.target;
                    var relationshipType = edge.data.relationship || 'RELATES_TO';
                    
                    // 准备关系属性 - 替代对象展开运算符
                    var edgeProperties = {};
                    for (var edgeKey in edge.data) {
                        if (edge.data.hasOwnProperty(edgeKey)) {
                            edgeProperties[edgeKey] = edge.data[edgeKey];
                        }
                    }
                    delete edgeProperties.id;
                    delete edgeProperties.source;
                    delete edgeProperties.target;
                    delete edgeProperties.relationship;
                    delete edgeProperties.sourceHandle;
                    delete edgeProperties.targetHandle;
                    
                    // 格式化属性 - 替代Object.entries和map
                    var edgeFormattedPropsArray = [];
                    for (var edgePropKey in edgeProperties) {
                        if (edgeProperties.hasOwnProperty(edgePropKey)) {
                            var edgeValue = edgeProperties[edgePropKey];
                            // 过滤无效值
                            if (edgeValue !== undefined && edgeValue !== null && edgeValue !== '') {
                                var edgeFormattedValue;
                                if (typeof edgeValue === 'string') {
                                    edgeFormattedValue = "'" + edgeValue.replace(/'/g, "''") + "'";
                                } else if (typeof edgeValue === 'object' && edgeValue !== null) {
                                    edgeFormattedValue = "'" + JSON.stringify(edgeValue).replace(/'/g, "''") + "'";
                                } else {
                                    edgeFormattedValue = edgeValue;
                                }
                                edgeFormattedPropsArray.push(edgePropKey + ': ' + edgeFormattedValue);
                            }
                        }
                    }
                    var edgeFormattedProps = edgeFormattedPropsArray.join(', ');
                    
                    // 构建关系创建语句
                    var propsStr = edgeFormattedProps ? ' { ' + edgeFormattedProps + ' }' : '';
                    
                    // 替代find方法和可选链操作符
                    function findNodeById(nodesArray, id) {
                        for (var m = 0; m < nodesArray.length; m++) {
                            if (nodesArray[m].data.id === id) {
                                return nodesArray[m];
                            }
                        }
                        return null;
                    }
                    
                    var sourceNode = findNodeById(nodes, sourceId);
                    var sourceCode = sourceNode && sourceNode.data && sourceNode.data.code ? sourceNode.data.code : 'node' + sourceId;
                    
                    var targetNode = findNodeById(nodes, targetId);
                    var targetCode = targetNode && targetNode.data && targetNode.data.code ? targetNode.data.code : 'node' + targetId;
                    
                    // 使用字符串连接替代模板字符串
                    var relationshipStatement = 'MATCH (a), (b) WHERE a.code = ' +
                        "'" + sourceCode + "'" +
                        ' AND b.code = ' +
                        "'" + targetCode + "'" +
                        ' CREATE (a)-[r:' + relationshipType + propsStr + ']->(b)';
                    
                    cypherStatements.push(relationshipStatement);
                }
            }
            
            // 添加返回语句
            cypherStatements.push('');
            cypherStatements.push('RETURN count(*) AS createdCount');
            
            var fullStatement = cypherStatements.join('\n');
            
            debugLog('导出Neo4j语句成功，共生成', cypherStatements.length, '条语句');
            
            return {
                success: true,
                statement: fullStatement,
                nodeCount: nodes.length,
                edgeCount: edges.length
            };
        } catch (error) {
            console.error('导出Neo4j语句失败:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }
};

// 创建全局函数别名，以便其他模块使用
window.saveGraphToNeo4j = window.neo4jConnection.saveGraphToNeo4j;
window.loadGraphFromNeo4j = window.neo4jConnection.loadGraphFromNeo4j;
window.exportGraphAsNeo4jStatement = window.neo4jConnection.exportGraphAsNeo4jStatement;

// 暴露为ES模块（如果支持）
// 确保neo4jConnection对象在全局作用域中可用
// 不使用模块系统导出，因为我们在浏览器中直接使用全局对象
window.neo4jConnection = window.neo4jConnection || {};