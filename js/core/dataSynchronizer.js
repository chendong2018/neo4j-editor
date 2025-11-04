/**
 * Neo4j Editor - 数据同步器模块
 * 负责处理图表数据的同步和一致性维护
 */
(function(neo4jEditor) {
    'use strict';

    // 确保命名空间存在
    if (typeof neo4jEditor === 'undefined') {
        window.neo4jEditor = {};
    }

    // 初始化状态
    let initialized = false;
    
    // 同步配置
    let syncConfig = {
        // 数据源配置
        dataSources: {
            // 默认数据源
            'local': {
                name: 'local',
                type: 'local',
                enabled: true,
                autoSync: true,
                syncInterval: 500 // 毫秒
            },
            // 远程数据源示例
            'remote': {
                name: 'remote',
                type: 'remote',
                enabled: false,
                url: '',
                method: 'POST',
                headers: {},
                autoSync: false,
                syncInterval: 30000, // 30秒
                batchSize: 100
            }
        },
        
        // 同步策略
        syncStrategies: {
            // 自动同步配置
            autoSync: {
                enabled: true,
                triggerEvents: [
                    'graph:elementsAdded',
                    'graph:elementsRemoved',
                    'graph:elementsUpdated',
                    'graph:dataUpdated'
                ],
                debounceTime: 300 // 毫秒
            },
            
            // 冲突解决策略
            conflictResolution: {
                strategy: 'latest', // latest, local, remote
                showConflictDialog: false
            },
            
            // 批量同步配置
            batchSync: {
                enabled: true,
                maxBatchSize: 100,
                flushInterval: 2000 // 毫秒
            }
        },
        
        // 数据版本控制
        versioning: {
            enabled: true,
            useTimestamp: true,
            useChecksum: false
        },
        
        // 离线支持
        offlineSupport: {
            enabled: true,
            storeChanges: true,
            maxStoredChanges: 1000
        }
    };
    
    // 数据变更队列
    let changeQueue = [];
    
    // 当前同步状态
    let syncState = {
        isSyncing: false,
        lastSyncTime: null,
        pendingChanges: 0,
        syncErrors: 0,
        activeDataSource: 'local'
    };
    
    // 数据存储
    let dataStore = {
        nodes: {},
        edges: {},
        version: 0,
        lastUpdated: null
    };
    
    // 变更定时器
    let syncTimer = null;
    let batchTimer = null;

    /**
     * 初始化数据同步器模块
     * @param {Object} config - 配置对象
     * @returns {boolean} 初始化是否成功
     */
    function initialize(config = {}) {
        try {
            console.log('Data Synchronizer Module: Initializing...');
            
            // 合并配置
            syncConfig = deepMerge(syncConfig, config);
            
            // 验证配置
            validateConfig();
            
            // 初始化数据存储
            initializeDataStore();
            
            // 注册事件监听器
            registerEventListeners();
            
            // 启动自动同步（如果启用）
            if (syncConfig.syncStrategies.autoSync.enabled) {
                startAutoSync();
            }
            
            // 初始化离线存储（如果启用）
            if (syncConfig.offlineSupport.enabled) {
                initializeOfflineSupport();
            }
            
            // 标记为已初始化
            initialized = true;
            
            console.log('Data Synchronizer Module: Initialized successfully');
            
            // 触发初始化完成事件
            if (neo4jEditor.eventManager && typeof neo4jEditor.eventManager.trigger === 'function') {
                neo4jEditor.eventManager.trigger('dataSynchronizer:initialized', {
                    config: syncConfig
                });
            }
            
            return true;
        } catch (error) {
            console.error('Data Synchronizer Module: Initialization error:', error);
            return false;
        }
    }

    /**
     * 验证配置
     */
    function validateConfig() {
        // 验证数据源
        if (!syncConfig.dataSources || typeof syncConfig.dataSources !== 'object') {
            syncConfig.dataSources = {
                'local': {
                    name: 'local',
                    type: 'local',
                    enabled: true,
                    autoSync: true,
                    syncInterval: 500
                }
            };
        }
        
        // 验证至少有一个启用的数据源
        const enabledDataSources = Object.values(syncConfig.dataSources).filter(source => source.enabled);
        if (enabledDataSources.length === 0) {
            // 默认启用本地数据源
            if (syncConfig.dataSources['local']) {
                syncConfig.dataSources['local'].enabled = true;
            }
        }
        
        // 验证同步策略
        if (!syncConfig.syncStrategies) {
            syncConfig.syncStrategies = {
                autoSync: {
                    enabled: true,
                    triggerEvents: [
                        'graph:elementsAdded',
                        'graph:elementsRemoved',
                        'graph:elementsUpdated',
                        'graph:dataUpdated'
                    ],
                    debounceTime: 300
                },
                conflictResolution: {
                    strategy: 'latest',
                    showConflictDialog: false
                },
                batchSync: {
                    enabled: true,
                    maxBatchSize: 100,
                    flushInterval: 2000
                }
            };
        }
        
        // 验证冲突解决策略
        const validStrategies = ['latest', 'local', 'remote'];
        if (!validStrategies.includes(syncConfig.syncStrategies.conflictResolution.strategy)) {
            syncConfig.syncStrategies.conflictResolution.strategy = 'latest';
        }
        
        // 验证版本控制
        if (!syncConfig.versioning) {
            syncConfig.versioning = {
                enabled: true,
                useTimestamp: true,
                useChecksum: false
            };
        }
        
        // 验证离线支持
        if (!syncConfig.offlineSupport) {
            syncConfig.offlineSupport = {
                enabled: true,
                storeChanges: true,
                maxStoredChanges: 1000
            };
        }
    }

    /**
     * 初始化数据存储
     */
    function initializeDataStore() {
        try {
            // 从本地存储加载数据（如果启用）
            if (syncConfig.offlineSupport.enabled) {
                loadDataFromStorage();
            }
            
            // 如果有图表渲染器或数据模型，同步其数据
            syncFromGraph();
        } catch (error) {
            console.error('Data Synchronizer: Error initializing data store:', error);
        }
    }

    /**
     * 注册事件监听器
     */
    function registerEventListeners() {
        try {
            if (neo4jEditor.eventManager && typeof neo4jEditor.eventManager.on === 'function') {
                // 注册自动同步触发事件
                syncConfig.syncStrategies.autoSync.triggerEvents.forEach(eventName => {
                    neo4jEditor.eventManager.on(eventName, debounce(onDataChangeEvent, syncConfig.syncStrategies.autoSync.debounceTime));
                });
                
                // 注册同步相关事件
                neo4jEditor.eventManager.on('dataSynchronizer:syncNow', syncNow);
                neo4jEditor.eventManager.on('dataSynchronizer:setConfig', onSetConfigEvent);
                neo4jEditor.eventManager.on('dataSynchronizer:switchDataSource', onSwitchDataSourceEvent);
                
                console.log('Data Synchronizer Module: Event listeners registered');
            } else {
                console.warn('Data Synchronizer Module: Event manager not available, cannot register event listeners');
            }
        } catch (error) {
            console.error('Data Synchronizer Module: Error registering event listeners:', error);
        }
    }

    /**
     * 处理数据变更事件
     */
    function onDataChangeEvent(event) {
        try {
            // 检查是否应该处理此事件
            if (!shouldProcessChangeEvent(event)) {
                return;
            }
            
            // 创建变更记录
            const changeRecord = createChangeRecord(event);
            
            // 添加到变更队列
            addToChangeQueue(changeRecord);
            
            // 如果启用了批量同步，检查是否需要触发
            if (syncConfig.syncStrategies.batchSync.enabled) {
                checkBatchSync();
            } else {
                // 立即同步（去抖动）
                debouncedSync();
            }
        } catch (error) {
            console.error('Data Synchronizer: Error processing change event:', error);
        }
    }

    /**
     * 检查是否应该处理变更事件
     * @param {Object} event - 事件对象
     * @returns {boolean} 是否应该处理
     */
    function shouldProcessChangeEvent(event) {
        // 检查是否正在同步过程中（避免循环触发）
        if (syncState.isSyncing) {
            return false;
        }
        
        // 可以添加更多条件来过滤事件
        return true;
    }

    /**
     * 创建变更记录
     * @param {Object} event - 事件对象
     * @returns {Object} 变更记录
     */
    function createChangeRecord(event) {
        const timestamp = Date.now();
        const record = {
            id: `change_${timestamp}_${Math.random().toString(36).substr(2, 9)}`,
            type: event.type || 'unknown',
            timestamp: timestamp,
            data: event.data || {},
            metadata: {
                source: 'local',
                version: dataStore.version
            }
        };
        
        // 生成数据版本信息
        if (syncConfig.versioning.enabled) {
            record.version = generateVersionInfo();
        }
        
        return record;
    }

    /**
     * 添加到变更队列
     * @param {Object} changeRecord - 变更记录
     */
    function addToChangeQueue(changeRecord) {
        // 添加到队列
        changeQueue.push(changeRecord);
        syncState.pendingChanges++;
        
        // 如果队列太大，移除旧的记录
        if (syncConfig.offlineSupport.enabled && changeQueue.length > syncConfig.offlineSupport.maxStoredChanges) {
            changeQueue = changeQueue.slice(-syncConfig.offlineSupport.maxStoredChanges);
        }
        
        // 如果启用了离线支持，存储变更
        if (syncConfig.offlineSupport.enabled && syncConfig.offlineSupport.storeChanges) {
            storeChanges();
        }
    }

    /**
     * 检查批量同步
     */
    function checkBatchSync() {
        // 检查队列大小是否达到阈值
        if (changeQueue.length >= syncConfig.syncStrategies.batchSync.maxBatchSize) {
            // 立即执行批量同步
            executeBatchSync();
        } else {
            // 设置定时器
            if (!batchTimer) {
                batchTimer = setTimeout(() => {
                    executeBatchSync();
                    batchTimer = null;
                }, syncConfig.syncStrategies.batchSync.flushInterval);
            }
        }
    }

    /**
     * 执行批量同步
     */
    function executeBatchSync() {
        if (changeQueue.length === 0) {
            return;
        }
        
        // 获取当前队列的快照并清空队列
        const batch = [...changeQueue];
        changeQueue = [];
        syncState.pendingChanges = 0;
        
        // 执行同步
        syncBatch(batch).catch(error => {
            console.error('Data Synchronizer: Error in batch sync:', error);
            
            // 如果同步失败，将变更放回队列
            changeQueue = [...batch, ...changeQueue];
            syncState.pendingChanges = changeQueue.length;
        });
    }

    /**
     * 立即同步
     */
    function syncNow() {
        if (syncState.isSyncing) {
            return;
        }
        
        // 如果有批量定时器，清除它
        if (batchTimer) {
            clearTimeout(batchTimer);
            batchTimer = null;
        }
        
        // 如果有变更，执行同步
        if (changeQueue.length > 0) {
            executeBatchSync();
        } else {
            // 否则执行完整同步
            syncFullGraph();
        }
    }

    /**
     * 同步批次
     * @param {Array} batch - 变更批次
     * @returns {Promise} 同步结果Promise
     */
    function syncBatch(batch) {
        return new Promise((resolve, reject) => {
            try {
                // 设置同步状态
                syncState.isSyncing = true;
                
                // 获取活动的数据源
                const dataSource = getActiveDataSource();
                
                // 根据数据源类型执行同步
                switch (dataSource.type) {
                    case 'local':
                        syncToLocalStorage(batch).then(resolve).catch(reject);
                        break;
                    case 'remote':
                        syncToRemote(dataSource, batch).then(resolve).catch(reject);
                        break;
                    default:
                        reject(new Error(`Unsupported data source type: ${dataSource.type}`));
                }
            } catch (error) {
                syncState.isSyncing = false;
                syncState.syncErrors++;
                reject(error);
            }
        }).finally(() => {
            // 无论成功失败，都更新状态
            syncState.isSyncing = false;
            syncState.lastSyncTime = Date.now();
            
            // 更新数据版本
            updateDataVersion();
            
            // 触发布局完成事件
            if (neo4jEditor.eventManager && typeof neo4jEditor.eventManager.trigger === 'function') {
                neo4jEditor.eventManager.trigger('dataSynchronizer:syncCompleted', {
                    batchSize: batch.length,
                    success: true,
                    timestamp: Date.now()
                });
            }
        });
    }

    /**
     * 同步到本地存储
     * @param {Array} batch - 变更批次
     * @returns {Promise} 同步结果Promise
     */
    function syncToLocalStorage(batch) {
        return new Promise((resolve) => {
            try {
                // 处理每个变更
                batch.forEach(changeRecord => {
                    processChangeRecord(changeRecord);
                });
                
                // 保存更新后的数据
                saveDataToStorage();
                
                resolve({ success: true, changes: batch.length });
            } catch (error) {
                console.error('Data Synchronizer: Error syncing to local storage:', error);
                resolve({ success: false, error: error.message, changes: 0 });
            }
        });
    }

    /**
     * 同步到远程数据源
     * @param {Object} dataSource - 数据源配置
     * @param {Array} batch - 变更批次
     * @returns {Promise} 同步结果Promise
     */
    function syncToRemote(dataSource, batch) {
        return new Promise((resolve, reject) => {
            // 检查是否支持fetch API
            if (!window.fetch) {
                reject(new Error('Fetch API not supported'));
                return;
            }
            
            // 准备请求数据
            const requestData = {
                batch: batch,
                version: dataStore.version,
                timestamp: Date.now()
            };
            
            // 准备请求选项
            const requestOptions = {
                method: dataSource.method || 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    ...dataSource.headers
                },
                body: JSON.stringify(requestData)
            };
            
            // 发送请求
            fetch(dataSource.url, requestOptions)
                .then(response => {
                    if (!response.ok) {
                        throw new Error(`HTTP error! status: ${response.status}`);
                    }
                    return response.json();
                })
                .then(data => {
                    // 处理响应数据
                    if (data.success) {
                        // 更新本地数据版本
                        if (data.version) {
                            dataStore.version = data.version;
                        }
                        
                        // 保存数据
                        saveDataToStorage();
                        
                        // 如果服务器返回了新数据，同步到本地图表
                        if (data.data) {
                            syncToGraph(data.data);
                        }
                        
                        resolve({ success: true, serverResponse: data });
                    } else {
                        throw new Error(data.error || 'Sync failed');
                    }
                })
                .catch(error => {
                    console.error('Data Synchronizer: Error syncing to remote:', error);
                    reject(error);
                });
        });
    }

    /**
     * 处理变更记录
     * @param {Object} changeRecord - 变更记录
     */
    function processChangeRecord(changeRecord) {
        // 根据变更类型处理
        switch (changeRecord.type) {
            case 'graph:elementsAdded':
                processElementsAdded(changeRecord.data);
                break;
            case 'graph:elementsRemoved':
                processElementsRemoved(changeRecord.data);
                break;
            case 'graph:elementsUpdated':
                processElementsUpdated(changeRecord.data);
                break;
            case 'graph:dataUpdated':
                processDataUpdated(changeRecord.data);
                break;
            default:
                console.warn(`Data Synchronizer: Unknown change type: ${changeRecord.type}`);
        }
    }

    /**
     * 处理元素添加
     * @param {Object} data - 元素数据
     */
    function processElementsAdded(data) {
        if (!data || !data.elements) {
            return;
        }
        
        // 处理每个元素
        data.elements.forEach(element => {
            if (element.group === 'nodes') {
                // 添加节点
                dataStore.nodes[element.data.id] = element;
            } else if (element.group === 'edges') {
                // 添加边
                dataStore.edges[element.data.id] = element;
            }
        });
    }

    /**
     * 处理元素移除
     * @param {Object} data - 元素数据
     */
    function processElementsRemoved(data) {
        if (!data || !data.elements) {
            return;
        }
        
        // 处理每个元素
        data.elements.forEach(element => {
            if (element.group === 'nodes') {
                // 移除节点
                delete dataStore.nodes[element.data.id];
                
                // 同时移除与此节点相关的所有边
                for (const edgeId in dataStore.edges) {
                    const edge = dataStore.edges[edgeId];
                    if (edge.data.source === element.data.id || edge.data.target === element.data.id) {
                        delete dataStore.edges[edgeId];
                    }
                }
            } else if (element.group === 'edges') {
                // 移除边
                delete dataStore.edges[element.data.id];
            }
        });
    }

    /**
     * 处理元素更新
     * @param {Object} data - 元素数据
     */
    function processElementsUpdated(data) {
        if (!data || !data.elements) {
            return;
        }
        
        // 处理每个元素
        data.elements.forEach(element => {
            if (element.group === 'nodes' && dataStore.nodes[element.data.id]) {
                // 更新节点
                dataStore.nodes[element.data.id] = element;
            } else if (element.group === 'edges' && dataStore.edges[element.data.id]) {
                // 更新边
                dataStore.edges[element.data.id] = element;
            }
        });
    }

    /**
     * 处理数据更新
     * @param {Object} data - 数据
     */
    function processDataUpdated(data) {
        if (!data || !data.nodes || !data.edges) {
            return;
        }
        
        // 重置数据存储
        dataStore.nodes = {};
        dataStore.edges = {};
        
        // 添加所有节点
        data.nodes.forEach(node => {
            dataStore.nodes[node.data.id] = node;
        });
        
        // 添加所有边
        data.edges.forEach(edge => {
            dataStore.edges[edge.data.id] = edge;
        });
    }

    /**
     * 同步从图表到数据存储
     */
    function syncFromGraph() {
        try {
            let elements = [];
            
            // 尝试从数据模型获取元素
            if (neo4jEditor.dataModel && typeof neo4jEditor.dataModel.getElements === 'function') {
                elements = neo4jEditor.dataModel.getElements();
            }
            // 尝试从图表渲染器获取元素
            else if (neo4jEditor.graphRenderer && typeof neo4jEditor.graphRenderer.getElements === 'function') {
                elements = neo4jEditor.graphRenderer.getElements();
            }
            // 尝试直接从Cytoscape实例获取
            else {
                const cy = getCytoscapeInstance();
                if (cy) {
                    elements = cy.elements().jsons();
                }
            }
            
            // 如果获取到元素，更新数据存储
            if (elements && elements.length > 0) {
                // 重置数据存储
                dataStore.nodes = {};
                dataStore.edges = {};
                
                // 分类元素
                elements.forEach(element => {
                    if (element.group === 'nodes') {
                        dataStore.nodes[element.data.id] = element;
                    } else if (element.group === 'edges') {
                        dataStore.edges[element.data.id] = element;
                    }
                });
                
                // 更新数据版本
                updateDataVersion();
                
                // 保存到存储
                saveDataToStorage();
            }
        } catch (error) {
            console.error('Data Synchronizer: Error syncing from graph:', error);
        }
    }

    /**
     * 同步从数据存储到图表
     * @param {Object} data - 要同步的数据（可选）
     */
    function syncToGraph(data = null) {
        try {
            // 准备要同步的元素
            let elements = [];
            
            if (data && data.nodes && data.edges) {
                // 使用提供的数据
                elements = [...data.nodes, ...data.edges];
            } else {
                // 使用数据存储中的数据
                const nodes = Object.values(dataStore.nodes);
                const edges = Object.values(dataStore.edges);
                elements = [...nodes, ...edges];
            }
            
            // 如果没有元素，直接返回
            if (elements.length === 0) {
                return;
            }
            
            // 设置同步状态标志，避免触发额外的同步
            syncState.isSyncing = true;
            
            // 尝试更新数据模型
            if (neo4jEditor.dataModel && typeof neo4jEditor.dataModel.setElements === 'function') {
                neo4jEditor.dataModel.setElements(elements);
            }
            // 尝试更新图表渲染器
            else if (neo4jEditor.graphRenderer && typeof neo4jEditor.graphRenderer.setElements === 'function') {
                neo4jEditor.graphRenderer.setElements(elements);
            }
            // 尝试直接更新Cytoscape实例
            else {
                const cy = getCytoscapeInstance();
                if (cy) {
                    // 清除现有元素
                    cy.remove(cy.elements());
                    // 添加新元素
                    cy.add(elements);
                }
            }
            
            // 延迟清除同步状态标志，确保事件传播完成
            setTimeout(() => {
                syncState.isSyncing = false;
            }, 100);
        } catch (error) {
            syncState.isSyncing = false;
            console.error('Data Synchronizer: Error syncing to graph:', error);
        }
    }

    /**
     * 执行完整图表同步
     */
    function syncFullGraph() {
        try {
            // 设置同步状态
            syncState.isSyncing = true;
            
            // 从图表获取当前数据
            syncFromGraph();
            
            // 获取活动的数据源
            const dataSource = getActiveDataSource();
            
            // 根据数据源类型执行同步
            switch (dataSource.type) {
                case 'local':
                    // 对于本地数据源，只需保存
                    saveDataToStorage();
                    break;
                case 'remote':
                    // 对于远程数据源，发送完整数据
                    const fullSyncData = {
                        nodes: Object.values(dataStore.nodes),
                        edges: Object.values(dataStore.edges),
                        version: dataStore.version,
                        timestamp: Date.now()
                    };
                    
                    // 准备请求选项
                    const requestOptions = {
                        method: dataSource.method || 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            ...dataSource.headers
                        },
                        body: JSON.stringify(fullSyncData)
                    };
                    
                    // 发送请求
                    fetch(dataSource.url + '/sync-full', requestOptions)
                        .then(response => response.json())
                        .then(data => {
                            if (data.success) {
                                // 更新本地数据版本
                                if (data.version) {
                                    dataStore.version = data.version;
                                }
                            }
                        })
                        .catch(error => {
                            console.error('Data Synchronizer: Error in full sync:', error);
                        })
                        .finally(() => {
                            syncState.isSyncing = false;
                            syncState.lastSyncTime = Date.now();
                        });
                    break;
            }
        } catch (error) {
            syncState.isSyncing = false;
            console.error('Data Synchronizer: Error in full graph sync:', error);
        }
    }

    /**
     * 获取活动的数据源
     * @returns {Object} 数据源配置
     */
    function getActiveDataSource() {
        // 获取指定的活动数据源
        if (syncConfig.dataSources[syncState.activeDataSource] && 
            syncConfig.dataSources[syncState.activeDataSource].enabled) {
            return syncConfig.dataSources[syncState.activeDataSource];
        }
        
        // 如果没有找到活动数据源，返回第一个启用的数据源
        for (const sourceName in syncConfig.dataSources) {
            if (syncConfig.dataSources[sourceName].enabled) {
                syncState.activeDataSource = sourceName;
                return syncConfig.dataSources[sourceName];
            }
        }
        
        // 如果没有启用的数据源，返回本地数据源
        return syncConfig.dataSources['local'] || {
            name: 'local',
            type: 'local',
            enabled: true
        };
    }

    /**
     * 切换数据源
     * @param {string} dataSourceName - 数据源名称
     * @returns {boolean} 是否切换成功
     */
    function switchDataSource(dataSourceName) {
        try {
            // 检查数据源是否存在且启用
            if (syncConfig.dataSources[dataSourceName] && syncConfig.dataSources[dataSourceName].enabled) {
                // 更新活动数据源
                syncState.activeDataSource = dataSourceName;
                
                // 触发数据源切换事件
                if (neo4jEditor.eventManager && typeof neo4jEditor.eventManager.trigger === 'function') {
                    neo4jEditor.eventManager.trigger('dataSynchronizer:dataSourceSwitched', {
                        dataSourceName: dataSourceName,
                        dataSource: syncConfig.dataSources[dataSourceName]
                    });
                }
                
                return true;
            }
            
            return false;
        } catch (error) {
            console.error('Data Synchronizer: Error switching data source:', error);
            return false;
        }
    }

    /**
     * 处理切换数据源事件
     */
    function onSwitchDataSourceEvent(event) {
        if (event && event.dataSourceName) {
            switchDataSource(event.dataSourceName);
        }
    }

    /**
     * 处理设置配置事件
     */
    function onSetConfigEvent(event) {
        if (event && event.config) {
            setConfig(event.config);
        }
    }

    /**
     * 设置配置
     * @param {Object} config - 配置对象
     */
    function setConfig(config) {
        try {
            // 合并配置
            syncConfig = deepMerge(syncConfig, config);
            
            // 验证配置
            validateConfig();
            
            console.log('Data Synchronizer: Configuration updated');
            
            // 触发配置更新事件
            if (neo4jEditor.eventManager && typeof neo4jEditor.eventManager.trigger === 'function') {
                neo4jEditor.eventManager.trigger('dataSynchronizer:configUpdated', {
                    config: syncConfig
                });
            }
            
            // 如果自动同步设置改变，相应地启动或停止
            if (syncConfig.syncStrategies.autoSync.enabled) {
                startAutoSync();
            } else {
                stopAutoSync();
            }
            
        } catch (error) {
            console.error('Data Synchronizer: Error setting configuration:', error);
        }
    }

    /**
     * 获取配置
     * @returns {Object} 配置对象
     */
    function getConfig() {
        return { ...syncConfig };
    }

    /**
     * 获取同步状态
     * @returns {Object} 同步状态
     */
    function getSyncState() {
        return { ...syncState };
    }

    /**
     * 生成版本信息
     * @returns {Object} 版本信息
     */
    function generateVersionInfo() {
        const versionInfo = {
            timestamp: Date.now()
        };
        
        if (syncConfig.versioning.useChecksum) {
            versionInfo.checksum = calculateChecksum();
        }
        
        return versionInfo;
    }

    /**
     * 计算数据校验和
     * @returns {string} 校验和
     */
    function calculateChecksum() {
        try {
            // 简化的校验和计算（实际使用中可能需要更复杂的算法）
            const dataString = JSON.stringify({
                nodes: dataStore.nodes,
                edges: dataStore.edges,
                version: dataStore.version
            });
            
            // 简单的哈希算法
            let hash = 0;
            for (let i = 0; i < dataString.length; i++) {
                const char = dataString.charCodeAt(i);
                hash = ((hash << 5) - hash) + char;
                hash = hash & hash;
            }
            
            return Math.abs(hash).toString(16);
        } catch (error) {
            console.error('Data Synchronizer: Error calculating checksum:', error);
            return '';
        }
    }

    /**
     * 更新数据版本
     */
    function updateDataVersion() {
        dataStore.version++;
        dataStore.lastUpdated = Date.now();
    }

    /**
     * 启动自动同步
     */
    function startAutoSync() {
        // 已经在事件监听器中设置了去抖动的自动同步
        console.log('Data Synchronizer: Auto-sync started');
    }

    /**
     * 停止自动同步
     */
    function stopAutoSync() {
        // 清除定时器
        if (syncTimer) {
            clearTimeout(syncTimer);
            syncTimer = null;
        }
        
        if (batchTimer) {
            clearTimeout(batchTimer);
            batchTimer = null;
        }
        
        console.log('Data Synchronizer: Auto-sync stopped');
    }

    /**
     * 初始化离线支持
     */
    function initializeOfflineSupport() {
        try {
            // 检查浏览器是否支持localStorage
            if (!window.localStorage) {
                console.warn('Data Synchronizer: localStorage not supported, offline support disabled');
                syncConfig.offlineSupport.enabled = false;
                return;
            }
            
            // 加载存储的数据
            loadDataFromStorage();
            
            // 加载存储的变更
            loadChangesFromStorage();
            
        } catch (error) {
            console.error('Data Synchronizer: Error initializing offline support:', error);
        }
    }

    /**
     * 保存数据到本地存储
     */
    function saveDataToStorage() {
        if (!syncConfig.offlineSupport.enabled || !window.localStorage) {
            return;
        }
        
        try {
            // 准备要保存的数据
            const dataToSave = {
                nodes: dataStore.nodes,
                edges: dataStore.edges,
                version: dataStore.version,
                lastUpdated: dataStore.lastUpdated
            };
            
            // 保存到localStorage
            localStorage.setItem('neo4jEditor_data', JSON.stringify(dataToSave));
        } catch (error) {
            console.error('Data Synchronizer: Error saving data to storage:', error);
        }
    }

    /**
     * 从本地存储加载数据
     */
    function loadDataFromStorage() {
        if (!syncConfig.offlineSupport.enabled || !window.localStorage) {
            return;
        }
        
        try {
            // 从localStorage加载数据
            const savedData = localStorage.getItem('neo4jEditor_data');
            
            if (savedData) {
                const parsedData = JSON.parse(savedData);
                
                // 更新数据存储
                if (parsedData.nodes) dataStore.nodes = parsedData.nodes;
                if (parsedData.edges) dataStore.edges = parsedData.edges;
                if (parsedData.version) dataStore.version = parsedData.version;
                if (parsedData.lastUpdated) dataStore.lastUpdated = parsedData.lastUpdated;
            }
        } catch (error) {
            console.error('Data Synchronizer: Error loading data from storage:', error);
        }
    }

    /**
     * 保存变更到本地存储
     */
    function storeChanges() {
        if (!syncConfig.offlineSupport.enabled || !window.localStorage) {
            return;
        }
        
        try {
            // 保存到localStorage
            localStorage.setItem('neo4jEditor_changes', JSON.stringify(changeQueue));
        } catch (error) {
            console.error('Data Synchronizer: Error storing changes:', error);
        }
    }

    /**
     * 从本地存储加载变更
     */
    function loadChangesFromStorage() {
        if (!syncConfig.offlineSupport.enabled || !window.localStorage) {
            return;
        }
        
        try {
            // 从localStorage加载变更
            const savedChanges = localStorage.getItem('neo4jEditor_changes');
            
            if (savedChanges) {
                const parsedChanges = JSON.parse(savedChanges);
                if (Array.isArray(parsedChanges)) {
                    changeQueue = parsedChanges;
                    syncState.pendingChanges = changeQueue.length;
                }
            }
        } catch (error) {
            console.error('Data Synchronizer: Error loading changes from storage:', error);
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
     * 去抖动的同步函数
     */
    const debouncedSync = debounce(syncNow, 300);

    /**
     * 清理资源
     */
    function cleanup() {
        try {
            // 停止自动同步
            stopAutoSync();
            
            // 移除事件监听器
            if (neo4jEditor.eventManager && typeof neo4jEditor.eventManager.off === 'function') {
                syncConfig.syncStrategies.autoSync.triggerEvents.forEach(eventName => {
                    neo4jEditor.eventManager.off(eventName, onDataChangeEvent);
                });
                
                neo4jEditor.eventManager.off('dataSynchronizer:syncNow', syncNow);
                neo4jEditor.eventManager.off('dataSynchronizer:setConfig', onSetConfigEvent);
                neo4jEditor.eventManager.off('dataSynchronizer:switchDataSource', onSwitchDataSourceEvent);
            }
            
            // 保存数据（最后一次同步）
            if (syncConfig.offlineSupport.enabled) {
                saveDataToStorage();
                storeChanges();
            }
            
            // 重置状态
            initialized = false;
            changeQueue = [];
            syncState = {
                isSyncing: false,
                lastSyncTime: null,
                pendingChanges: 0,
                syncErrors: 0,
                activeDataSource: 'local'
            };
            
            console.log('Data Synchronizer Module: Resources cleaned up');
        } catch (error) {
            console.error('Data Synchronizer Module: Error cleaning up resources:', error);
        }
    }

    /**
     * 深度合并对象
     * @param {Object} target - 目标对象
     * @param {Object} source - 源对象
     * @returns {Object} 合并后的对象
     */
    function deepMerge(target, source) {
        const output = { ...target };
        
        if (typeof target === 'object' && typeof source === 'object') {
            Object.keys(source).forEach(key => {
                if (typeof source[key] === 'object' && key in target) {
                    output[key] = deepMerge(target[key], source[key]);
                } else {
                    output[key] = source[key];
                }
            });
        }
        
        return output;
    }

    /**
     * 防抖函数
     * @param {Function} func - 要执行的函数
     * @param {number} wait - 等待时间（毫秒）
     * @returns {Function} 防抖后的函数
     */
    function debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }

    /**
     * 数据同步器模块
     */
    const dataSynchronizerModule = {
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
         * 立即执行同步
         */
        syncNow: function() {
            syncNow();
        },
        
        /**
         * 切换数据源
         * @param {string} dataSourceName - 数据源名称
         * @returns {boolean} 是否切换成功
         */
        switchDataSource: function(dataSourceName) {
            return switchDataSource(dataSourceName);
        },
        
        /**
         * 获取当前活动的数据源
         * @returns {Object} 数据源配置
         */
        getActiveDataSource: function() {
            return getActiveDataSource();
        },
        
        /**
         * 从图表同步到数据存储
         */
        syncFromGraph: function() {
            syncFromGraph();
        },
        
        /**
         * 从数据存储同步到图表
         * @param {Object} data - 要同步的数据（可选）
         */
        syncToGraph: function(data = null) {
            syncToGraph(data);
        },
        
        /**
         * 设置配置
         * @param {Object} config - 配置对象
         */
        setConfig: function(config) {
            setConfig(config);
        },
        
        /**
         * 获取配置
         * @returns {Object} 配置对象
         */
        getConfig: function() {
            return getConfig();
        },
        
        /**
         * 获取同步状态
         * @returns {Object} 同步状态
         */
        getSyncState: function() {
            return getSyncState();
        },
        
        /**
         * 清理资源
         */
        cleanup: function() {
            cleanup();
        }
    };
    
    // 导出模块到命名空间
    neo4jEditor.dataSynchronizer = dataSynchronizerModule;
    
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
                console.warn(`警告: 直接调用 ${deprecatedName}() 已弃用，请使用 neo4jEditor.dataSynchronizer.${newFunction.name || 'method'}()`);
            }
            return newFunction.apply(context || null, arguments);
        };
    }
    
    // 注册向后兼容函数
    const backwardCompatibilityMapping = [
        { deprecatedName: 'initializeDataSynchronizer', newFunction: dataSynchronizerModule.initialize, context: dataSynchronizerModule },
        { deprecatedName: 'syncDataNow', newFunction: dataSynchronizerModule.syncNow, context: dataSynchronizerModule },
        { deprecatedName: 'switchSyncDataSource', newFunction: dataSynchronizerModule.switchDataSource, context: dataSynchronizerModule },
        { deprecatedName: 'getActiveSyncDataSource', newFunction: dataSynchronizerModule.getActiveDataSource, context: dataSynchronizerModule },
        { deprecatedName: 'syncGraphToStore', newFunction: dataSynchronizerModule.syncFromGraph, context: dataSynchronizerModule },
        { deprecatedName: 'syncStoreToGraph', newFunction: dataSynchronizerModule.syncToGraph, context: dataSynchronizerModule },
        { deprecatedName: 'setSyncConfig', newFunction: dataSynchronizerModule.setConfig, context: dataSynchronizerModule },
        { deprecatedName: 'getSyncConfig', newFunction: dataSynchronizerModule.getConfig, context: dataSynchronizerModule },
        { deprecatedName: 'getSyncStatus', newFunction: dataSynchronizerModule.getSyncState, context: dataSynchronizerModule },
        { deprecatedName: 'cleanupDataSynchronizer', newFunction: dataSynchronizerModule.cleanup, context: dataSynchronizerModule }
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
    const moduleName = 'core/dataSynchronizer';
    const moduleRegistrationInfo = {
        name: moduleName,
        version: '1.0.0',
        dependencies: ['core/eventManager', 'core/dataModel', 'views/graphRenderer'],
        module: dataSynchronizerModule
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
                        initialized: dataSynchronizerModule.initialized,
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
                window.appModule.dataSynchronizer = dataSynchronizerModule;
                console.log(`Neo4j Editor: ${moduleName} module registered via final fallback to appModule`);
            }
        }
    } else {
        // 降级方案：直接挂载到全局
        if (typeof window.appModule === 'undefined') {
            window.appModule = {};
        }
        window.appModule.dataSynchronizer = dataSynchronizerModule;
        console.log(`Neo4j Editor: ${moduleName} module registered via fallback to appModule`);
    }
    
    // 多模块系统支持 - 确保兼容性
    // CommonJS 模块支持
    if (typeof module !== 'undefined' && typeof module.exports !== 'undefined') {
        module.exports = dataSynchronizerModule;
    }
    
    // ES 模块支持
    if (typeof exports !== 'undefined' && typeof exports === 'object') {
        Object.defineProperty(exports, '__esModule', { value: true });
        if (typeof module !== 'undefined') module.exports = dataSynchronizerModule;
        exports.default = dataSynchronizerModule;
    }
    
    // AMD 模块支持
    if (typeof define === 'function' && define.amd) {
        define(['core/eventManager', 'core/dataModel', 'views/graphRenderer'], function() {
            return dataSynchronizerModule;
        });
    }
    
    return dataSynchronizerModule;
})(window.neo4jEditor || (window.neo4jEditor = {}));